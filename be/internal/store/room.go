package store

import (
	"context"
	"time"

	"gorm.io/gorm"

	"hotel-backend/internal/models"
)

// RoomStore reads and writes individual rooms, and answers availability
// questions about them.
//
// Availability is defined on the half-open interval [check_in, check_out): a
// guest leaving on the 5th frees the room for someone arriving on the 5th. Two
// stays therefore conflict when
//
//	existing.check_in < requested.check_out AND existing.check_out > requested.check_in
//
// The previous implementation compared only equal check-in dates, and did so in
// the browser, so a room booked from the 1st to the 10th still looked free on
// the 5th.
type RoomStore struct {
	db *gorm.DB
}

// List returns every room with its type.
func (s *RoomStore) List(ctx context.Context) ([]models.Room, error) {
	var rooms []models.Room
	if err := s.db.WithContext(ctx).Preload("Type").Order("number").Find(&rooms).Error; err != nil {
		return nil, translate(err, "list rooms")
	}
	return rooms, nil
}

// ListByType returns the rooms belonging to one type.
func (s *RoomStore) ListByType(ctx context.Context, typeID uint) ([]models.Room, error) {
	var rooms []models.Room
	err := s.db.WithContext(ctx).
		Preload("Type").
		Where("type_id = ?", typeID).
		Order("number").
		Find(&rooms).Error
	if err != nil {
		return nil, translate(err, "list rooms by type")
	}
	return rooms, nil
}

// CountByType returns how many rooms exist for a type.
func (s *RoomStore) CountByType(ctx context.Context, typeID uint) (int, error) {
	var count int64
	err := s.db.WithContext(ctx).
		Model(&models.Room{}).
		Where("type_id = ?", typeID).
		Count(&count).Error
	if err != nil {
		return 0, translate(err, "count rooms by type")
	}
	return int(count), nil
}

// Create inserts a room.
func (s *RoomStore) Create(ctx context.Context, room *models.Room) error {
	if err := s.db.WithContext(ctx).Create(room).Error; err != nil {
		if isUniqueViolation(err) {
			return ErrDuplicateRoom
		}
		return translate(err, "create room")
	}
	if err := s.db.WithContext(ctx).Preload("Type").First(room, room.ID).Error; err != nil {
		return translate(err, "reload created room")
	}
	return nil
}

// AvailableByType returns the rooms of a type that are free for the whole stay,
// ordered by room number.
func (s *RoomStore) AvailableByType(ctx context.Context, typeID uint, checkIn, checkOut time.Time) ([]models.Room, error) {
	var rooms []models.Room

	err := s.db.WithContext(ctx).
		Preload("Type").
		Where("type_id = ?", typeID).
		Where("NOT EXISTS (?)", conflictingBookingsSubquery(s.db, checkIn, checkOut)).
		Order("number").
		Find(&rooms).Error
	if err != nil {
		return nil, translate(err, "list available rooms")
	}
	return rooms, nil
}

// DayAvailability is the free room count for a single calendar day.
type DayAvailability struct {
	Date           time.Time
	AvailableCount int
}

// AvailabilityCalendar returns, for every day in [from, to], how many rooms of
// the type are free that night.
//
// A day is occupied when an active booking covers it, i.e. check_in <= day <
// check_out. The whole month is computed in one round trip with generate_series
// rather than a query per day.
func (s *RoomStore) AvailabilityCalendar(ctx context.Context, typeID uint, from, to time.Time) ([]DayAvailability, error) {
	const query = `
		WITH calendar AS (
			SELECT generate_series(?::date, ?::date, interval '1 day')::date AS day
		),
		type_rooms AS (
			SELECT id FROM rooms
			WHERE deleted_at IS NULL AND type_id = ?
		)
		SELECT
			calendar.day AS date,
			(SELECT COUNT(*) FROM type_rooms) - COALESCE((
				SELECT COUNT(DISTINCT bookings.room_id)
				FROM bookings
				JOIN booking_statuses ON booking_statuses.id = bookings.status_id
				WHERE bookings.deleted_at IS NULL
				  AND booking_statuses.name <> ?
				  AND bookings.room_id IN (SELECT id FROM type_rooms)
				  AND bookings.check_in <= calendar.day
				  AND bookings.check_out > calendar.day
			), 0) AS available_count
		FROM calendar
		ORDER BY calendar.day
	`

	var rows []DayAvailability
	err := s.db.WithContext(ctx).Raw(query,
		from.Format("2006-01-02"),
		to.Format("2006-01-02"),
		typeID,
		models.StatusCanceled,
	).Scan(&rows).Error
	if err != nil {
		return nil, translate(err, "build availability calendar")
	}
	return rows, nil
}

// conflictingBookingsSubquery builds the correlated NOT EXISTS body that matches
// active bookings overlapping [checkIn, checkOut) for the outer room row.
//
// Cancelled bookings are excluded by status name, so a cancelled stay releases
// its room immediately.
func conflictingBookingsSubquery(db *gorm.DB, checkIn, checkOut time.Time) *gorm.DB {
	return db.
		Table("bookings").
		Select("1").
		Joins("JOIN booking_statuses ON booking_statuses.id = bookings.status_id").
		Where("bookings.room_id = rooms.id").
		Where("bookings.deleted_at IS NULL").
		Where("booking_statuses.name <> ?", models.StatusCanceled).
		Where("bookings.check_in < ?", checkOut).
		Where("bookings.check_out > ?", checkIn)
}
