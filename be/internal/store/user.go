package store

import (
	"context"
	"errors"
	"strings"

	"gorm.io/gorm"

	"hotel-backend/internal/models"
)

// UserStore reads and writes accounts.
type UserStore struct {
	db *gorm.DB
}

// NormaliseEmail lowercases and trims an address so lookups and the unique
// index agree regardless of how the user typed it.
func NormaliseEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

// LoadUserForAuth fetches the account behind a token, with its role preloaded.
//
// This satisfies middleware.UserLoader. The boolean separates "no such account"
// from a database failure so the caller can answer 401 versus 500 correctly.
func (s *UserStore) LoadUserForAuth(ctx context.Context, id uint) (*models.User, bool, error) {
	var user models.User
	err := s.db.WithContext(ctx).Preload("Role").First(&user, id).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, false, nil
	}
	if err != nil {
		return nil, false, translate(err, "load user for auth")
	}
	return &user, true, nil
}

// FindByID returns one account with its role.
func (s *UserStore) FindByID(ctx context.Context, id uint) (*models.User, error) {
	var user models.User
	if err := s.db.WithContext(ctx).Preload("Role").First(&user, id).Error; err != nil {
		return nil, translate(err, "find user by id")
	}
	return &user, nil
}

// FindByEmail returns the account for an address, matching case-insensitively.
func (s *UserStore) FindByEmail(ctx context.Context, email string) (*models.User, error) {
	var user models.User
	err := s.db.WithContext(ctx).
		Preload("Role").
		Where("email = ?", NormaliseEmail(email)).
		First(&user).Error
	if err != nil {
		return nil, translate(err, "find user by email")
	}
	return &user, nil
}

// EmailExists reports whether an address is already registered.
func (s *UserStore) EmailExists(ctx context.Context, email string) (bool, error) {
	var count int64
	err := s.db.WithContext(ctx).
		Model(&models.User{}).
		Where("email = ?", NormaliseEmail(email)).
		Count(&count).Error
	if err != nil {
		return false, translate(err, "count users by email")
	}
	return count > 0, nil
}

// Create inserts a new account and reloads it with its role attached.
//
// The unique index on email is the authority on duplicates: checking first and
// inserting second would still race, so a constraint violation is translated
// into ErrDuplicateEmail here.
func (s *UserStore) Create(ctx context.Context, user *models.User) error {
	user.Email = NormaliseEmail(user.Email)

	if err := s.db.WithContext(ctx).Create(user).Error; err != nil {
		if isUniqueViolation(err) {
			return ErrDuplicateEmail
		}
		return translate(err, "create user")
	}

	// Populate the association so callers can serialise the role immediately.
	if err := s.db.WithContext(ctx).Preload("Role").First(user, user.ID).Error; err != nil {
		return translate(err, "reload created user")
	}
	return nil
}

// List returns accounts newest first.
func (s *UserStore) List(ctx context.Context, page Pagination) ([]models.User, int64, error) {
	var (
		users []models.User
		total int64
	)

	if err := s.db.WithContext(ctx).Model(&models.User{}).Count(&total).Error; err != nil {
		return nil, 0, translate(err, "count users")
	}

	query := s.db.WithContext(ctx).Preload("Role").Order("created_at DESC, id DESC")
	if err := page.apply(query).Find(&users).Error; err != nil {
		return nil, 0, translate(err, "list users")
	}
	return users, total, nil
}

// CountBookingsByUser returns how many non-cancelled bookings each listed user
// holds, keyed by user id. Used by the admin dashboard to avoid an N+1 query.
func (s *UserStore) CountBookingsByUser(ctx context.Context, userIDs []uint) (map[uint]int, error) {
	out := make(map[uint]int, len(userIDs))
	if len(userIDs) == 0 {
		return out, nil
	}

	var rows []struct {
		UserID uint
		Total  int
	}

	err := s.db.WithContext(ctx).
		Model(&models.Booking{}).
		Select("bookings.user_id AS user_id, COUNT(*) AS total").
		Joins("JOIN booking_statuses ON booking_statuses.id = bookings.status_id").
		Where("bookings.user_id IN ?", userIDs).
		Where("booking_statuses.name <> ?", models.StatusCanceled).
		Group("bookings.user_id").
		Scan(&rows).Error
	if err != nil {
		return nil, translate(err, "count bookings by user")
	}

	for _, row := range rows {
		out[row.UserID] = row.Total
	}
	return out, nil
}
