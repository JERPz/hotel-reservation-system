package database

import (
	"fmt"
	"log/slog"

	"gorm.io/gorm"
)

// This file handles the one thing AutoMigrate cannot: changing the shape of a
// table that already holds rows.
//
// AutoMigrate is additive, but "additive" is not the same as "always safe".
// Postgres rejects ADD COLUMN ... NOT NULL without a DEFAULT on a populated
// table, because every existing row would violate the constraint immediately.
// The booking model gained three such columns (reference, nights, total_price)
// and narrowed check_in/check_out from a timestamp to a date, so a database
// created by the previous version needs its existing rows filled in first.
//
// Each step is guarded by an information_schema check, so the whole function is
// idempotent and a no-op on both a fresh database and an already-migrated one.

// prepareExistingSchema readies a database created by the previous version.
//
// It must run before AutoMigrate. Everything happens in one transaction: DDL is
// transactional in Postgres, so a failure part-way leaves the schema untouched
// rather than half-converted.
func prepareExistingSchema(db *gorm.DB) error {
	exists, err := hasTable(db, "bookings")
	if err != nil {
		return err
	}
	if !exists {
		// Fresh database. AutoMigrate will create everything correctly.
		return nil
	}

	return db.Transaction(func(tx *gorm.DB) error {
		// Validate first. The backfills below derive values by joining through
		// room_id, so running them against dangling references would compute and
		// persist wrong numbers, and the columns would then already exist and
		// never be recomputed.
		if err := rejectUnrepairableRows(tx); err != nil {
			return err
		}
		if err := fillNullsBeforeTightening(tx); err != nil {
			return err
		}
		if err := narrowStayColumnsToDate(tx); err != nil {
			return err
		}
		if err := backfillReference(tx); err != nil {
			return err
		}
		if err := backfillNights(tx); err != nil {
			return err
		}
		if err := backfillTotalPrice(tx); err != nil {
			return err
		}

		// AutoMigrate is unreliable about tightening nullability on columns that
		// already exist: it silently left bookings.check_in and the foreign keys
		// nullable while reporting success. Applying the constraints here keeps
		// the live schema matching what the models declare.
		return enforceNotNull(tx)
	})
}

// fillNullsBeforeTightening gives a value to every column that this version
// marks NOT NULL but the previous one left nullable.
//
// AutoMigrate issues ALTER COLUMN ... SET NOT NULL for each of these, and
// Postgres refuses if a single row holds NULL. The previous models declared bare
// Go strings and uints, so the columns were created nullable even though the
// application always wrote a zero value into them.
func fillNullsBeforeTightening(tx *gorm.DB) error {
	// Empty string is the value the application would have written anyway.
	textDefaults := []struct{ table, column string }{
		{"users", "first_name"},
		{"users", "last_name"},
		{"users", "password_hash"},
	}
	for _, target := range textDefaults {
		if err := fillNulls(tx, target.table, target.column, "''"); err != nil {
			return err
		}
	}

	// An account with no role becomes a standard user rather than an admin.
	if err := fillNullsFromLookup(tx, "users", "role_id", "roles", "user"); err != nil {
		return err
	}

	// A booking with no status is treated as awaiting confirmation.
	if err := fillNullsFromLookup(tx, "bookings", "status_id", "booking_statuses", "pending"); err != nil {
		return err
	}
	return nil
}

// fillNulls replaces NULLs in a column with a literal SQL expression.
func fillNulls(tx *gorm.DB, table, column, valueExpr string) error {
	present, err := hasColumn(tx, table, column)
	if err != nil {
		return err
	}
	if !present {
		return nil
	}

	// Table, column and expression are compile-time constants, not input.
	statement := fmt.Sprintf(`UPDATE %s SET %s = %s WHERE %s IS NULL`, table, column, valueExpr, column)
	result := tx.Exec(statement)
	if result.Error != nil {
		return fmt.Errorf("fill nulls in %s.%s: %w", table, column, result.Error)
	}
	if result.RowsAffected > 0 {
		slog.Info("migration: filled null values",
			slog.String("column", table+"."+column),
			slog.Int64("rows", result.RowsAffected),
		)
	}
	return nil
}

// fillNullsFromLookup points a NULL foreign key at a reference row chosen by
// name, so seeded primary keys are never assumed.
func fillNullsFromLookup(tx *gorm.DB, table, column, lookupTable, lookupName string) error {
	present, err := hasColumn(tx, table, column)
	if err != nil {
		return err
	}
	if !present {
		return nil
	}

	statement := fmt.Sprintf(
		`UPDATE %s SET %s = (SELECT id FROM %s WHERE name = ? ORDER BY id LIMIT 1) WHERE %s IS NULL`,
		table, column, lookupTable, column,
	)
	result := tx.Exec(statement, lookupName)
	if result.Error != nil {
		return fmt.Errorf("fill nulls in %s.%s: %w", table, column, result.Error)
	}
	if result.RowsAffected > 0 {
		slog.Info("migration: filled null foreign keys",
			slog.String("column", table+"."+column),
			slog.String("defaulted_to", lookupName),
			slog.Int64("rows", result.RowsAffected),
		)
	}
	return nil
}

// rejectUnrepairableRows fails the migration when data is missing or dangling in
// a way this code cannot fix.
//
// A booking with no guest, no room or no dates cannot be repaired, and guessing
// would corrupt availability or ownership. Deleting rows silently would be worse.
// So the migration stops, names the problem and hands over a query to inspect it,
// leaving the schema untouched.
//
// The checks run before AutoMigrate so these surface as readable errors rather
// than as a bare SQLSTATE from a failed ALTER TABLE.
func rejectUnrepairableRows(tx *gorm.DB) error {
	if err := rejectNulls(tx); err != nil {
		return err
	}
	return rejectDanglingReferences(tx)
}

// rejectNulls reports columns that this version requires but which still hold
// NULL after the automatic backfills.
func rejectNulls(tx *gorm.DB) error {
	required := []struct{ table, column string }{
		{"bookings", "user_id"},
		{"bookings", "room_id"},
		{"bookings", "check_in"},
		{"bookings", "check_out"},
		{"rooms", "type_id"},
	}

	for _, target := range required {
		present, err := hasColumn(tx, target.table, target.column)
		if err != nil {
			return err
		}
		if !present {
			continue
		}

		var nulls int64
		statement := fmt.Sprintf(`SELECT COUNT(*) FROM %s WHERE %s IS NULL`, target.table, target.column)
		if err := tx.Raw(statement).Scan(&nulls).Error; err != nil {
			return fmt.Errorf("count nulls in %s.%s: %w", target.table, target.column, err)
		}
		if nulls > 0 {
			return fmt.Errorf(
				"%s.%s holds NULL in %d row(s) but is required from this version onwards; "+
					"repair or remove those rows and redeploy "+
					"-- SELECT * FROM %s WHERE %s IS NULL",
				target.table, target.column, nulls, target.table, target.column,
			)
		}
	}
	return nil
}

// rejectDanglingReferences reports rows whose foreign key points at something
// that no longer exists.
//
// This version declares foreign key constraints that the previous schema may not
// have enforced, and Postgres refuses to add a constraint that existing rows
// already violate.
func rejectDanglingReferences(tx *gorm.DB) error {
	references := []struct {
		table, column, parent string
	}{
		{"bookings", "user_id", "users"},
		{"bookings", "room_id", "rooms"},
		{"bookings", "status_id", "booking_statuses"},
		{"rooms", "type_id", "room_types"},
		{"users", "role_id", "roles"},
	}

	for _, ref := range references {
		present, err := hasColumn(tx, ref.table, ref.column)
		if err != nil {
			return err
		}
		if !present {
			continue
		}

		// Soft-deleted parents still occupy a row, so they satisfy the
		// constraint and are deliberately not treated as dangling.
		condition := fmt.Sprintf(
			`%s IS NOT NULL AND NOT EXISTS (SELECT 1 FROM %s WHERE %s.id = %s.%s)`,
			ref.column, ref.parent, ref.parent, ref.table, ref.column,
		)

		var dangling int64
		statement := fmt.Sprintf(`SELECT COUNT(*) FROM %s WHERE %s`, ref.table, condition)
		if err := tx.Raw(statement).Scan(&dangling).Error; err != nil {
			return fmt.Errorf("count dangling %s.%s: %w", ref.table, ref.column, err)
		}
		if dangling > 0 {
			return fmt.Errorf(
				"%s.%s references a missing %s row in %d case(s); a foreign key cannot be added "+
					"until those rows are repaired or removed "+
					"-- SELECT * FROM %s WHERE %s",
				ref.table, ref.column, ref.parent, dangling, ref.table, condition,
			)
		}
	}
	return nil
}

// narrowStayColumnsToDate converts check_in and check_out from timestamptz to
// date.
//
// An explicit USING clause is required: Postgres will not silently discard the
// time component, and GORM's generated ALTER does not provide one.
func narrowStayColumnsToDate(tx *gorm.DB) error {
	for _, column := range []string{"check_in", "check_out"} {
		dataType, err := columnDataType(tx, "bookings", column)
		if err != nil {
			return err
		}
		if dataType == "" || dataType == "date" {
			continue
		}

		// Column names here are compile-time constants, not input.
		statement := fmt.Sprintf(
			`ALTER TABLE bookings ALTER COLUMN %s TYPE date USING (%s::date)`, column, column,
		)
		if err := tx.Exec(statement).Error; err != nil {
			return fmt.Errorf("convert bookings.%s to date: %w", column, err)
		}
		slog.Info("migration: converted column to date", slog.String("column", "bookings."+column))
	}
	return nil
}

// backfillReference adds the group reference and assigns one to existing rows.
//
// Legacy rows carry no grouping information, but the old code created one row
// per room in a single loop, so rooms booked together share a guest, a date
// range and a creation timestamp to the second. Grouping on those reconstructs
// the original reservations well enough for them to display and cancel as a
// unit. Anything it gets wrong only affects presentation, never money or
// availability.
func backfillReference(tx *gorm.DB) error {
	present, err := hasColumn(tx, "bookings", "reference")
	if err != nil {
		return err
	}
	if present {
		return nil
	}

	if err := tx.Exec(`ALTER TABLE bookings ADD COLUMN reference varchar(16)`).Error; err != nil {
		return fmt.Errorf("add bookings.reference: %w", err)
	}

	if err := tx.Exec(`
		WITH grouped AS (
			SELECT id,
			       DENSE_RANK() OVER (
			           ORDER BY user_id, check_in, check_out, date_trunc('second', created_at)
			       ) AS group_number
			FROM bookings
			WHERE reference IS NULL
		)
		UPDATE bookings
		SET reference = 'LGCY' || LPAD(grouped.group_number::text, 8, '0')
		FROM grouped
		WHERE bookings.id = grouped.id
	`).Error; err != nil {
		return fmt.Errorf("backfill bookings.reference: %w", err)
	}

	if err := tx.Exec(`ALTER TABLE bookings ALTER COLUMN reference SET NOT NULL`).Error; err != nil {
		return fmt.Errorf("enforce bookings.reference not null: %w", err)
	}

	slog.Info("migration: backfilled bookings.reference")
	return nil
}

// backfillNights derives the length of each existing stay from its dates.
func backfillNights(tx *gorm.DB) error {
	present, err := hasColumn(tx, "bookings", "nights")
	if err != nil {
		return err
	}
	if present {
		return nil
	}

	if err := tx.Exec(`ALTER TABLE bookings ADD COLUMN nights bigint`).Error; err != nil {
		return fmt.Errorf("add bookings.nights: %w", err)
	}

	// A stay is at least one night, which also covers legacy rows whose
	// check-out was stored on or before check-in.
	if err := tx.Exec(`
		UPDATE bookings
		SET nights = GREATEST(check_out::date - check_in::date, 1)
		WHERE nights IS NULL
	`).Error; err != nil {
		return fmt.Errorf("backfill bookings.nights: %w", err)
	}

	if err := tx.Exec(`ALTER TABLE bookings ALTER COLUMN nights SET NOT NULL`).Error; err != nil {
		return fmt.Errorf("enforce bookings.nights not null: %w", err)
	}

	slog.Info("migration: backfilled bookings.nights")
	return nil
}

// backfillTotalPrice reconstructs each existing booking's total from the room
// type's current nightly price.
//
// This is the best available approximation: the old schema never recorded what a
// booking actually cost, so a price changed since then cannot be recovered. From
// now on the total is captured at booking time and never recomputed.
func backfillTotalPrice(tx *gorm.DB) error {
	present, err := hasColumn(tx, "bookings", "total_price")
	if err != nil {
		return err
	}
	if present {
		return nil
	}

	if err := tx.Exec(`ALTER TABLE bookings ADD COLUMN total_price numeric`).Error; err != nil {
		return fmt.Errorf("add bookings.total_price: %w", err)
	}

	if err := tx.Exec(`
		UPDATE bookings
		SET total_price = COALESCE(room_types.price, 0)
		                  * GREATEST(bookings.check_out::date - bookings.check_in::date, 1)
		FROM rooms
		LEFT JOIN room_types ON room_types.id = rooms.type_id
		WHERE rooms.id = bookings.room_id
		  AND bookings.total_price IS NULL
	`).Error; err != nil {
		return fmt.Errorf("backfill bookings.total_price: %w", err)
	}

	// Any row whose room or room type no longer exists is priced at zero rather
	// than left NULL, so the NOT NULL constraint can be applied.
	if err := tx.Exec(`UPDATE bookings SET total_price = 0 WHERE total_price IS NULL`).Error; err != nil {
		return fmt.Errorf("default orphaned bookings.total_price: %w", err)
	}

	if err := tx.Exec(`ALTER TABLE bookings ALTER COLUMN total_price SET NOT NULL`).Error; err != nil {
		return fmt.Errorf("enforce bookings.total_price not null: %w", err)
	}

	slog.Info("migration: backfilled bookings.total_price")
	return nil
}

// enforceNotNull applies NOT NULL to every column the models declare as such.
//
// By this point the backfills above have guaranteed a value in each one, so these
// statements cannot fail on data. Columns that are already NOT NULL are skipped,
// which keeps the pass cheap on every subsequent boot.
func enforceNotNull(tx *gorm.DB) error {
	columns := []struct{ table, column string }{
		{"bookings", "reference"},
		{"bookings", "nights"},
		{"bookings", "total_price"},
		{"bookings", "check_in"},
		{"bookings", "check_out"},
		{"bookings", "user_id"},
		{"bookings", "room_id"},
		{"bookings", "status_id"},
		{"rooms", "type_id"},
		{"users", "role_id"},
		{"users", "first_name"},
		{"users", "password_hash"},
	}

	for _, target := range columns {
		nullable, err := columnIsNullable(tx, target.table, target.column)
		if err != nil {
			return err
		}
		if !nullable {
			continue
		}

		statement := fmt.Sprintf(`ALTER TABLE %s ALTER COLUMN %s SET NOT NULL`, target.table, target.column)
		if err := tx.Exec(statement).Error; err != nil {
			return fmt.Errorf("enforce %s.%s not null: %w", target.table, target.column, err)
		}
		slog.Info("migration: enforced not null", slog.String("column", target.table+"."+target.column))
	}
	return nil
}

// columnIsNullable reports whether a column currently accepts NULL. A missing
// column reports false so callers skip it.
func columnIsNullable(db *gorm.DB, table, column string) (bool, error) {
	var nullable []string
	err := db.Raw(`
		SELECT is_nullable FROM information_schema.columns
		WHERE table_schema = current_schema() AND table_name = ? AND column_name = ?
	`, table, column).Scan(&nullable).Error
	if err != nil {
		return false, fmt.Errorf("read nullability of %s.%s: %w", table, column, err)
	}
	if len(nullable) == 0 {
		return false, nil
	}
	return nullable[0] == "YES", nil
}

// hasTable reports whether a table exists in the current schema.
func hasTable(db *gorm.DB, table string) (bool, error) {
	var count int64
	err := db.Raw(`
		SELECT COUNT(*) FROM information_schema.tables
		WHERE table_schema = current_schema() AND table_name = ?
	`, table).Scan(&count).Error
	if err != nil {
		return false, fmt.Errorf("check table %q: %w", table, err)
	}
	return count > 0, nil
}

// hasColumn reports whether a column exists.
func hasColumn(db *gorm.DB, table, column string) (bool, error) {
	var count int64
	err := db.Raw(`
		SELECT COUNT(*) FROM information_schema.columns
		WHERE table_schema = current_schema() AND table_name = ? AND column_name = ?
	`, table, column).Scan(&count).Error
	if err != nil {
		return false, fmt.Errorf("check column %s.%s: %w", table, column, err)
	}
	return count > 0, nil
}

// columnDataType returns a column's SQL type, or "" when the column is absent.
func columnDataType(db *gorm.DB, table, column string) (string, error) {
	var dataType []string
	err := db.Raw(`
		SELECT data_type FROM information_schema.columns
		WHERE table_schema = current_schema() AND table_name = ? AND column_name = ?
	`, table, column).Scan(&dataType).Error
	if err != nil {
		return "", fmt.Errorf("read type of %s.%s: %w", table, column, err)
	}
	if len(dataType) == 0 {
		return "", nil
	}
	return dataType[0], nil
}
