package database

import (
	"fmt"
	"log/slog"

	"gorm.io/gorm"

	"hotel-backend/internal/models"
	"hotel-backend/internal/security"
)

// SeedOptions controls the demo accounts created by the seeder.
type SeedOptions struct {
	// DemoPassword is used for both seeded logins. When empty the seeder still
	// creates the reference data (roles, statuses, rooms) but skips the demo
	// accounts, which is what you want outside development.
	DemoPassword string
}

// Seed populates reference data and, optionally, demo accounts.
//
// Every step is an upsert keyed on the natural unique column, so running the
// seeder repeatedly converges on the same state instead of accumulating rows or
// failing on conflicts.
func Seed(db *gorm.DB, opts SeedOptions) error {
	return db.Transaction(func(tx *gorm.DB) error {
		roles, err := seedRoles(tx)
		if err != nil {
			return err
		}
		if err := seedStatuses(tx); err != nil {
			return err
		}
		if err := seedRoomsAndTypes(tx); err != nil {
			return err
		}
		if opts.DemoPassword != "" {
			if err := seedDemoUsers(tx, roles, opts.DemoPassword); err != nil {
				return err
			}
		}
		slog.Info("database seeded")
		return nil
	})
}

// seedRoles ensures every role exists and returns a name to ID map so callers
// never hardcode role primary keys.
func seedRoles(tx *gorm.DB) (map[string]uint, error) {
	names := []string{models.RoleAdmin, models.RoleUser}
	out := make(map[string]uint, len(names))

	for _, name := range names {
		role := models.Role{Name: name}
		if err := tx.Where(models.Role{Name: name}).FirstOrCreate(&role).Error; err != nil {
			return nil, fmt.Errorf("seed role %q: %w", name, err)
		}
		out[name] = role.ID
	}
	return out, nil
}

func seedStatuses(tx *gorm.DB) error {
	for _, name := range []string{models.StatusPending, models.StatusConfirmed, models.StatusCanceled} {
		status := models.BookingStatus{Name: name}
		if err := tx.Where(models.BookingStatus{Name: name}).FirstOrCreate(&status).Error; err != nil {
			return fmt.Errorf("seed status %q: %w", name, err)
		}
	}
	return nil
}

func seedRoomsAndTypes(tx *gorm.DB) error {
	type typeSpec struct {
		name        string
		description string
		price       float64
		capacity    int
		floor       int
		rooms       int
	}

	specs := []typeSpec{
		{name: "Single", description: "Single bed, bright and compact with a work desk.", price: 1000, capacity: 1, floor: 1, rooms: 10},
		{name: "Double", description: "Double bed with a lounge chair and city view.", price: 1800, capacity: 2, floor: 2, rooms: 10},
		{name: "Suite", description: "Separate living area, king bed and panoramic windows.", price: 3500, capacity: 4, floor: 3, rooms: 10},
	}

	for _, spec := range specs {
		roomType := models.RoomType{
			Name:        spec.name,
			Description: spec.description,
			Price:       spec.price,
			Capacity:    spec.capacity,
		}
		// Look up by name, then apply the current description/price so edits to
		// the seed data propagate on the next run.
		if err := tx.Where(models.RoomType{Name: spec.name}).
			Assign(models.RoomType{
				Description: spec.description,
				Price:       spec.price,
				Capacity:    spec.capacity,
			}).
			FirstOrCreate(&roomType).Error; err != nil {
			return fmt.Errorf("seed room type %q: %w", spec.name, err)
		}

		for i := 1; i <= spec.rooms; i++ {
			number := uint(spec.floor*100 + i)
			room := models.Room{Number: number, TypeID: roomType.ID}
			if err := tx.Where(models.Room{Number: number}).
				Assign(models.Room{TypeID: roomType.ID}).
				FirstOrCreate(&room).Error; err != nil {
				return fmt.Errorf("seed room %d: %w", number, err)
			}
		}
	}
	return nil
}

// seedDemoUsers creates the two development logins. Passwords are only set when
// the row is first created, so a locally changed password is not reset on every
// boot.
func seedDemoUsers(tx *gorm.DB, roles map[string]uint, password string) error {
	hash, err := security.HashPassword(password)
	if err != nil {
		return fmt.Errorf("hash demo password: %w", err)
	}

	demo := []models.User{
		{FirstName: "Admin", LastName: "User", Email: "admin@example.com", Phone: "0812345678", PasswordHash: hash, RoleID: roles[models.RoleAdmin]},
		{FirstName: "John", LastName: "Doe", Email: "user@example.com", Phone: "0898765432", PasswordHash: hash, RoleID: roles[models.RoleUser]},
	}

	for _, user := range demo {
		candidate := user
		if err := tx.Where(models.User{Email: candidate.Email}).FirstOrCreate(&candidate).Error; err != nil {
			return fmt.Errorf("seed user %q: %w", candidate.Email, err)
		}
	}
	return nil
}
