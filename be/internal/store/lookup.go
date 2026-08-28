package store

import (
	"context"

	"gorm.io/gorm"

	"hotel-backend/internal/models"
)

// LookupStore reads the small reference tables: roles and booking statuses.
//
// These are resolved by name rather than by id everywhere in the application.
// Seeded primary keys are an implementation detail, and trusting a client-sent
// role id is how the previous version allowed self-service admin registration.
type LookupStore struct {
	db *gorm.DB
}

// RoleByName returns a role, or ErrNotFound.
func (s *LookupStore) RoleByName(ctx context.Context, name string) (*models.Role, error) {
	var role models.Role
	if err := s.db.WithContext(ctx).Where("name = ?", name).First(&role).Error; err != nil {
		return nil, translate(err, "find role by name")
	}
	return &role, nil
}

// ListRoles returns every role.
func (s *LookupStore) ListRoles(ctx context.Context) ([]models.Role, error) {
	var roles []models.Role
	if err := s.db.WithContext(ctx).Order("id").Find(&roles).Error; err != nil {
		return nil, translate(err, "list roles")
	}
	return roles, nil
}

// StatusByName returns a booking status, or ErrNotFound.
func (s *LookupStore) StatusByName(ctx context.Context, name string) (*models.BookingStatus, error) {
	var status models.BookingStatus
	if err := s.db.WithContext(ctx).Where("name = ?", name).First(&status).Error; err != nil {
		return nil, translate(err, "find booking status by name")
	}
	return &status, nil
}

// ListStatuses returns every booking status.
func (s *LookupStore) ListStatuses(ctx context.Context) ([]models.BookingStatus, error) {
	var statuses []models.BookingStatus
	if err := s.db.WithContext(ctx).Order("id").Find(&statuses).Error; err != nil {
		return nil, translate(err, "list booking statuses")
	}
	return statuses, nil
}
