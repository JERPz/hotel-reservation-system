// Package database owns the GORM connection and schema migration. The handle is
// returned to the caller instead of being stored in a package-level variable,
// so every layer receives its dependency explicitly and can be tested against a
// different database.
package database

import (
	"fmt"
	"log/slog"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"hotel-backend/internal/models"
)

// Options configures the connection.
type Options struct {
	DSN    string
	LogSQL bool

	MaxOpenConns    int
	MaxIdleConns    int
	ConnMaxLifetime time.Duration
}

// Connect opens a pooled Postgres connection and verifies it with a ping.
func Connect(opts Options) (*gorm.DB, error) {
	logLevel := logger.Warn
	if opts.LogSQL {
		logLevel = logger.Info
	}

	db, err := gorm.Open(postgres.Open(opts.DSN), &gorm.Config{
		Logger: logger.Default.LogMode(logLevel),
		// Timestamps are generated in UTC so date comparisons are stable no
		// matter where the process runs.
		NowFunc: func() time.Time { return time.Now().UTC() },
	})
	if err != nil {
		return nil, fmt.Errorf("open database: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("access sql handle: %w", err)
	}

	sqlDB.SetMaxOpenConns(orDefaultInt(opts.MaxOpenConns, 20))
	sqlDB.SetMaxIdleConns(orDefaultInt(opts.MaxIdleConns, 5))
	sqlDB.SetConnMaxLifetime(orDefaultDuration(opts.ConnMaxLifetime, time.Hour))

	if err := sqlDB.Ping(); err != nil {
		return nil, fmt.Errorf("ping database: %w", err)
	}

	slog.Info("database connected")
	return db, nil
}

// Migrate brings the schema up to date.
//
// AutoMigrate creates missing tables, columns and indexes and never drops
// anything, but it cannot add a NOT NULL column to a table that already holds
// rows: Postgres rejects that outright because the existing rows would violate
// the constraint. prepareBookingsTable fills those columns in first, so this is
// safe to run on every boot against both a fresh and an existing database.
func Migrate(db *gorm.DB) error {
	if err := prepareExistingSchema(db); err != nil {
		return fmt.Errorf("prepare existing schema: %w", err)
	}

	if err := db.AutoMigrate(models.AllModels()...); err != nil {
		return fmt.Errorf("automigrate: %w", err)
	}

	// A room cannot be double-booked, but "no overlapping active booking" is a
	// range constraint that plain unique indexes cannot express. This composite
	// index is what makes the overlap lookup in the store layer cheap; the
	// correctness guarantee itself comes from locking the room rows inside the
	// booking transaction.
	if err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_bookings_room_dates
		ON bookings (room_id, check_in, check_out)
		WHERE deleted_at IS NULL
	`).Error; err != nil {
		return fmt.Errorf("create booking range index: %w", err)
	}

	slog.Info("database migrated")
	return nil
}

// Close releases the underlying connection pool.
func Close(db *gorm.DB) error {
	sqlDB, err := db.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}

func orDefaultInt(value, fallback int) int {
	if value > 0 {
		return value
	}
	return fallback
}

func orDefaultDuration(value, fallback time.Duration) time.Duration {
	if value > 0 {
		return value
	}
	return fallback
}
