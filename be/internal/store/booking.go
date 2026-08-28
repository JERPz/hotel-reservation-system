package store

import (
	"context"
	"fmt"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"hotel-backend/internal/models"
)

// BookingStore reads and writes reservations.
type BookingStore struct {
	db *gorm.DB
}

// CreateBookingParams describes a reservation request that has already been
// validated and priced by the service layer.
type CreateBookingParams struct {
	Reference string
	UserID    uint
	TypeID    uint
	RoomCount int
	StatusID  uint
	CheckIn   time.Time
	CheckOut  time.Time
	Nights    int

	// PricePerNight is captured from the room type at booking time.
	PricePerNight float64
}

// CreateForType reserves RoomCount rooms of a type for the given stay.
//
// Correctness under concurrency is the whole point of this method. Availability
// is re-checked inside a transaction that first takes row locks on every room of
// the type, in ascending id order:
//
//   - Locking makes two simultaneous requests for the last room serialise, so
//     the second sees the first's committed booking and fails cleanly instead of
//     overselling. Checking availability before the transaction, as the old
//     browser-side logic did, can never close this window.
//   - A consistent lock order (ascending id) means overlapping requests cannot
//     deadlock by grabbing the same rooms in opposite orders.
//
// It returns ErrRoomsUnavailable when fewer than RoomCount rooms are free.
func (s *BookingStore) CreateForType(ctx context.Context, params CreateBookingParams) ([]models.Booking, error) {
	var created []models.Booking

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Take the locks first. Selecting only ids keeps the locked set explicit
		// and avoids pulling row data we do not need.
		var lockedIDs []uint
		if err := tx.Model(&models.Room{}).
			Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("type_id = ?", params.TypeID).
			Order("id").
			Pluck("id", &lockedIDs).Error; err != nil {
			return translate(err, "lock rooms for booking")
		}
		if len(lockedIDs) < params.RoomCount {
			return ErrRoomsUnavailable
		}

		// Re-check availability now that the rooms are locked.
		var freeRooms []models.Room
		if err := tx.
			Where("id IN ?", lockedIDs).
			Where("NOT EXISTS (?)", conflictingBookingsSubquery(
				tx.Session(&gorm.Session{NewDB: true}), params.CheckIn, params.CheckOut,
			)).
			Order("number").
			Limit(params.RoomCount).
			Find(&freeRooms).Error; err != nil {
			return translate(err, "select available rooms for booking")
		}
		if len(freeRooms) < params.RoomCount {
			return ErrRoomsUnavailable
		}

		bookings := make([]models.Booking, 0, len(freeRooms))
		for _, room := range freeRooms {
			bookings = append(bookings, models.Booking{
				Reference:  params.Reference,
				UserID:     params.UserID,
				RoomID:     room.ID,
				StatusID:   params.StatusID,
				CheckIn:    params.CheckIn,
				CheckOut:   params.CheckOut,
				Nights:     params.Nights,
				TotalPrice: params.PricePerNight * float64(params.Nights),
			})
		}

		if err := tx.Create(&bookings).Error; err != nil {
			return translate(err, "insert bookings")
		}

		ids := make([]uint, 0, len(bookings))
		for _, booking := range bookings {
			ids = append(ids, booking.ID)
		}

		if err := tx.
			Preload("User.Role").
			Preload("Room.Type").
			Preload("Status").
			Where("id IN ?", ids).
			Order("id").
			Find(&created).Error; err != nil {
			return translate(err, "reload created bookings")
		}
		return nil
	})

	if err != nil {
		return nil, err
	}
	return created, nil
}

// BookingFilter narrows a booking listing.
type BookingFilter struct {
	// UserID restricts results to one guest. Zero means every guest.
	UserID uint
	// StatusName restricts results to one status. Empty means every status.
	StatusName string
	// From and To restrict results to stays overlapping the window.
	From time.Time
	To   time.Time
}

// List returns bookings matching the filter, newest first, with the associated
// user, room, room type and status preloaded.
func (s *BookingStore) List(ctx context.Context, filter BookingFilter, page Pagination) ([]models.Booking, int64, error) {
	base := s.db.WithContext(ctx).Model(&models.Booking{})

	if filter.UserID != 0 {
		base = base.Where("bookings.user_id = ?", filter.UserID)
	}
	if filter.StatusName != "" {
		base = base.Where(
			"bookings.status_id IN (SELECT id FROM booking_statuses WHERE name = ?)",
			filter.StatusName,
		)
	}
	if !filter.From.IsZero() {
		base = base.Where("bookings.check_out > ?", filter.From)
	}
	if !filter.To.IsZero() {
		base = base.Where("bookings.check_in < ?", filter.To)
	}

	var total int64
	if err := base.Count(&total).Error; err != nil {
		return nil, 0, translate(err, "count bookings")
	}

	var bookings []models.Booking
	query := base.
		Preload("User.Role").
		Preload("Room.Type").
		Preload("Status").
		Order("bookings.created_at DESC, bookings.id DESC")

	if err := page.apply(query).Find(&bookings).Error; err != nil {
		return nil, 0, translate(err, "list bookings")
	}
	return bookings, total, nil
}

// FindByID returns one booking with its associations.
func (s *BookingStore) FindByID(ctx context.Context, id uint) (*models.Booking, error) {
	var booking models.Booking
	err := s.db.WithContext(ctx).
		Preload("User.Role").
		Preload("Room.Type").
		Preload("Status").
		First(&booking, id).Error
	if err != nil {
		return nil, translate(err, "find booking")
	}
	return &booking, nil
}

// FindByReference returns every booking sharing a group reference.
func (s *BookingStore) FindByReference(ctx context.Context, reference string) ([]models.Booking, error) {
	var bookings []models.Booking
	err := s.db.WithContext(ctx).
		Preload("User.Role").
		Preload("Room.Type").
		Preload("Status").
		Where("reference = ?", reference).
		Order("id").
		Find(&bookings).Error
	if err != nil {
		return nil, translate(err, "find bookings by reference")
	}
	return bookings, nil
}

// UpdateStatus moves one booking to a new status and returns the fresh row.
func (s *BookingStore) UpdateStatus(ctx context.Context, id, statusID uint) (*models.Booking, error) {
	result := s.db.WithContext(ctx).
		Model(&models.Booking{}).
		Where("id = ?", id).
		Update("status_id", statusID)

	if result.Error != nil {
		return nil, translate(result.Error, "update booking status")
	}
	if result.RowsAffected == 0 {
		return nil, ErrNotFound
	}
	return s.FindByID(ctx, id)
}

// UpdateStatusByReference moves every booking in a group to a new status and
// returns the number of rows changed. Used to cancel a multi-room reservation as
// one unit.
func (s *BookingStore) UpdateStatusByReference(ctx context.Context, reference string, statusID uint) (int64, error) {
	result := s.db.WithContext(ctx).
		Model(&models.Booking{}).
		Where("reference = ?", reference).
		Update("status_id", statusID)

	if result.Error != nil {
		return 0, translate(result.Error, "update bookings by reference")
	}
	if result.RowsAffected == 0 {
		return 0, ErrNotFound
	}
	return result.RowsAffected, nil
}

// Stats is the aggregate view the admin dashboard renders.
type Stats struct {
	TotalBookings     int     `json:"total_bookings"`
	PendingBookings   int     `json:"pending_bookings"`
	ConfirmedBookings int     `json:"confirmed_bookings"`
	CanceledBookings  int     `json:"canceled_bookings"`
	Revenue           float64 `json:"revenue"`
	RoomNightsSold    int     `json:"room_nights_sold"`
}

// Stats computes booking totals and revenue in a single grouped query.
//
// Revenue sums the total_price captured on each booking, so it reflects the
// price and length of stay that was actually agreed. The old dashboard summed
// the room type's current nightly price once per booking, which ignored both the
// number of nights and any later price change.
func (s *BookingStore) Stats(ctx context.Context) (Stats, error) {
	var rows []struct {
		Name    string
		Total   int
		Nights  int
		Revenue float64
	}

	err := s.db.WithContext(ctx).
		Model(&models.Booking{}).
		Select(`booking_statuses.name AS name,
		        COUNT(*) AS total,
		        COALESCE(SUM(bookings.nights), 0) AS nights,
		        COALESCE(SUM(bookings.total_price), 0) AS revenue`).
		Joins("JOIN booking_statuses ON booking_statuses.id = bookings.status_id").
		Group("booking_statuses.name").
		Scan(&rows).Error
	if err != nil {
		return Stats{}, translate(err, "compute booking stats")
	}

	var stats Stats
	for _, row := range rows {
		stats.TotalBookings += row.Total

		switch row.Name {
		case models.StatusPending:
			stats.PendingBookings = row.Total
		case models.StatusConfirmed:
			stats.ConfirmedBookings = row.Total
		case models.StatusCanceled:
			stats.CanceledBookings = row.Total
		}

		// Cancelled stays earn nothing and occupy nothing.
		if row.Name != models.StatusCanceled {
			stats.Revenue += row.Revenue
			stats.RoomNightsSold += row.Nights
		}
	}
	return stats, nil
}

// ReferenceExists reports whether a group reference is already in use.
func (s *BookingStore) ReferenceExists(ctx context.Context, reference string) (bool, error) {
	var count int64
	err := s.db.WithContext(ctx).
		Model(&models.Booking{}).
		Where("reference = ?", reference).
		Count(&count).Error
	if err != nil {
		return false, translate(err, fmt.Sprintf("check reference %q", reference))
	}
	return count > 0, nil
}
