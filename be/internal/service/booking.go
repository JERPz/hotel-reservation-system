package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"hotel-backend/internal/httpx"
	"hotel-backend/internal/models"
	"hotel-backend/internal/store"
)

// Booking policy limits.
const (
	// MaxNights caps the length of a single stay.
	MaxNights = 30
	// MaxRoomsPerBooking caps how many rooms one request may reserve.
	MaxRoomsPerBooking = 5
	// MaxBookingHorizonDays limits how far ahead a stay can start.
	MaxBookingHorizonDays = 365
)

// BookingService owns availability and the booking lifecycle.
type BookingService struct {
	bookings  *store.BookingStore
	rooms     *store.RoomStore
	roomTypes *store.RoomTypeStore
	lookups   *store.LookupStore
}

// NewBookingService wires the dependencies.
func NewBookingService(
	bookings *store.BookingStore,
	rooms *store.RoomStore,
	roomTypes *store.RoomTypeStore,
	lookups *store.LookupStore,
) *BookingService {
	return &BookingService{bookings: bookings, rooms: rooms, roomTypes: roomTypes, lookups: lookups}
}

// Stay is a validated date range for a reservation.
type Stay struct {
	CheckIn  time.Time
	CheckOut time.Time
	Nights   int
}

// NewStay validates a date range and computes its length.
//
// Dates are half-open: a stay from the 3rd to the 5th occupies the nights of the
// 3rd and 4th, and the room is free again on the 5th.
func NewStay(checkIn, checkOut time.Time) (Stay, error) {
	checkIn = httpx.TruncateToDay(checkIn)
	checkOut = httpx.TruncateToDay(checkOut)
	today := httpx.Today()

	if checkIn.Before(today) {
		return Stay{}, httpx.UnprocessableEntity("Check-in cannot be in the past.").
			WithField("check_in", "must be today or later")
	}
	if !checkOut.After(checkIn) {
		return Stay{}, httpx.UnprocessableEntity("Check-out must be after check-in.").
			WithField("check_out", "must be at least one night after check-in")
	}

	nights := int(checkOut.Sub(checkIn).Hours() / 24)
	if nights > MaxNights {
		return Stay{}, httpx.UnprocessableEntity(fmt.Sprintf("A stay cannot exceed %d nights.", MaxNights)).
			WithField("check_out", fmt.Sprintf("maximum %d nights", MaxNights))
	}
	if checkIn.After(today.AddDate(0, 0, MaxBookingHorizonDays)) {
		return Stay{}, httpx.UnprocessableEntity("Check-in is too far in the future.").
			WithField("check_in", fmt.Sprintf("must be within %d days", MaxBookingHorizonDays))
	}

	return Stay{CheckIn: checkIn, CheckOut: checkOut, Nights: nights}, nil
}

// Availability answers "what is free for this stay".
type Availability struct {
	RoomType       *store.RoomTypeWithCount
	Stay           Stay
	AvailableRooms []models.Room
	TotalRooms     int
}

// AvailableCount is how many rooms are free.
func (a Availability) AvailableCount() int { return len(a.AvailableRooms) }

// TotalFor prices the stay for the given number of rooms.
func (a Availability) TotalFor(roomCount int) float64 {
	if a.RoomType == nil {
		return 0
	}
	return a.RoomType.Price * float64(a.Stay.Nights) * float64(roomCount)
}

// CheckAvailability reports which rooms of a type are free for a stay.
//
// This runs on the server against the database. The old client-side version
// could only see the bookings it had already downloaded, and compared check-in
// dates for equality rather than testing for overlap.
func (s *BookingService) CheckAvailability(ctx context.Context, typeID uint, checkIn, checkOut time.Time) (*Availability, error) {
	stay, err := NewStay(checkIn, checkOut)
	if err != nil {
		return nil, err
	}

	roomType, err := s.roomTypes.FindByID(ctx, typeID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, httpx.NotFound("That room type does not exist.")
		}
		return nil, httpx.Internal(err)
	}

	available, err := s.rooms.AvailableByType(ctx, typeID, stay.CheckIn, stay.CheckOut)
	if err != nil {
		return nil, httpx.Internal(err)
	}

	return &Availability{
		RoomType:       roomType,
		Stay:           stay,
		AvailableRooms: available,
		TotalRooms:     roomType.RoomCount,
	}, nil
}

// Calendar is a month of per-day availability for one room type.
type Calendar struct {
	RoomType   *store.RoomTypeWithCount
	Month      time.Time
	TotalRooms int
	Days       []store.DayAvailability
}

// MonthCalendar returns per-day availability for the month containing month.
func (s *BookingService) MonthCalendar(ctx context.Context, typeID uint, month time.Time) (*Calendar, error) {
	roomType, err := s.roomTypes.FindByID(ctx, typeID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, httpx.NotFound("That room type does not exist.")
		}
		return nil, httpx.Internal(err)
	}

	start := time.Date(month.Year(), month.Month(), 1, 0, 0, 0, 0, time.UTC)
	// Day 0 of the following month is the last day of this one.
	end := start.AddDate(0, 1, -1)

	days, err := s.rooms.AvailabilityCalendar(ctx, typeID, start, end)
	if err != nil {
		return nil, httpx.Internal(err)
	}

	return &Calendar{
		RoomType:   roomType,
		Month:      start,
		TotalRooms: roomType.RoomCount,
		Days:       days,
	}, nil
}

// CreateBookingInput is a reservation request.
//
// UserID is supplied by the handler from the authenticated session, never from
// the request body. The old endpoint took user_id from JSON, so any caller could
// create bookings in someone else's name.
type CreateBookingInput struct {
	UserID    uint
	TypeID    uint
	RoomCount int
	CheckIn   time.Time
	CheckOut  time.Time
}

// Create reserves rooms for a guest.
//
// Availability is validated twice on purpose: once here to give a clear, early
// error, and again inside the store transaction under row locks, which is what
// actually makes overselling impossible.
func (s *BookingService) Create(ctx context.Context, input CreateBookingInput) ([]models.Booking, error) {
	if input.RoomCount < 1 {
		input.RoomCount = 1
	}
	if input.RoomCount > MaxRoomsPerBooking {
		return nil, httpx.UnprocessableEntity(
			fmt.Sprintf("You can reserve at most %d rooms in one booking.", MaxRoomsPerBooking),
		).WithField("room_count", fmt.Sprintf("maximum %d", MaxRoomsPerBooking))
	}

	availability, err := s.CheckAvailability(ctx, input.TypeID, input.CheckIn, input.CheckOut)
	if err != nil {
		return nil, err
	}
	if availability.AvailableCount() < input.RoomCount {
		return nil, httpx.Conflict(fmt.Sprintf(
			"Only %d %s of this type are available for those dates.",
			availability.AvailableCount(),
			pluralise(availability.AvailableCount(), "room", "rooms"),
		))
	}

	pending, err := s.lookups.StatusByName(ctx, models.StatusPending)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, httpx.Internal(fmt.Errorf("booking status %q is missing; run the seeder", models.StatusPending))
		}
		return nil, httpx.Internal(err)
	}

	reference, err := newReference()
	if err != nil {
		return nil, httpx.Internal(err)
	}

	bookings, err := s.bookings.CreateForType(ctx, store.CreateBookingParams{
		Reference:     reference,
		UserID:        input.UserID,
		TypeID:        input.TypeID,
		RoomCount:     input.RoomCount,
		StatusID:      pending.ID,
		CheckIn:       availability.Stay.CheckIn,
		CheckOut:      availability.Stay.CheckOut,
		Nights:        availability.Stay.Nights,
		PricePerNight: availability.RoomType.Price,
	})
	if err != nil {
		if errors.Is(err, store.ErrRoomsUnavailable) {
			// Lost the race against a concurrent booking.
			return nil, httpx.Conflict("Those rooms were just taken. Please pick different dates.")
		}
		return nil, httpx.Internal(err)
	}
	return bookings, nil
}

// ListForUser returns one guest's bookings.
func (s *BookingService) ListForUser(ctx context.Context, userID uint, page store.Pagination) ([]models.Booking, int64, error) {
	bookings, total, err := s.bookings.List(ctx, store.BookingFilter{UserID: userID}, page)
	if err != nil {
		return nil, 0, httpx.Internal(err)
	}
	return bookings, total, nil
}

// ListAll returns every booking, optionally filtered by status.
func (s *BookingService) ListAll(ctx context.Context, statusName string, page store.Pagination) ([]models.Booking, int64, error) {
	if statusName != "" && !isKnownStatus(statusName) {
		return nil, 0, httpx.BadRequest(fmt.Sprintf(
			"Unknown status %q. Expected one of pending, confirmed, canceled.", statusName,
		))
	}

	bookings, total, err := s.bookings.List(ctx, store.BookingFilter{StatusName: statusName}, page)
	if err != nil {
		return nil, 0, httpx.Internal(err)
	}
	return bookings, total, nil
}

// Get returns one booking, enforcing that the caller is allowed to see it.
func (s *BookingService) Get(ctx context.Context, actor *models.User, bookingID uint) (*models.Booking, error) {
	booking, err := s.bookings.FindByID(ctx, bookingID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, httpx.NotFound("That booking does not exist.")
		}
		return nil, httpx.Internal(err)
	}

	if !canView(actor, booking) {
		// Answering 404 rather than 403 avoids confirming that the booking exists
		// to someone who has no right to know.
		return nil, httpx.NotFound("That booking does not exist.")
	}
	return booking, nil
}

// Stats returns the aggregate dashboard figures.
func (s *BookingService) Stats(ctx context.Context) (store.Stats, error) {
	stats, err := s.bookings.Stats(ctx)
	if err != nil {
		return store.Stats{}, httpx.Internal(err)
	}
	return stats, nil
}

// UpdateStatus moves a booking to a new status, enforcing the transition rules.
//
// Administrators may confirm or cancel. A guest may only cancel their own
// booking, and only before the stay begins. Nothing can be changed once a
// booking is cancelled. The old endpoint had no auth at all, so any caller could
// set any booking to any status.
func (s *BookingService) UpdateStatus(ctx context.Context, actor *models.User, bookingID uint, targetStatus string) (*models.Booking, error) {
	booking, err := s.bookings.FindByID(ctx, bookingID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, httpx.NotFound("That booking does not exist.")
		}
		return nil, httpx.Internal(err)
	}

	if err := s.authoriseTransition(actor, booking, targetStatus); err != nil {
		return nil, err
	}

	status, err := s.lookups.StatusByName(ctx, targetStatus)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, httpx.BadRequest(fmt.Sprintf("Unknown status %q.", targetStatus))
		}
		return nil, httpx.Internal(err)
	}

	updated, err := s.bookings.UpdateStatus(ctx, bookingID, status.ID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, httpx.NotFound("That booking does not exist.")
		}
		return nil, httpx.Internal(err)
	}
	return updated, nil
}

// CancelReference cancels every room in a multi-room reservation at once.
func (s *BookingService) CancelReference(ctx context.Context, actor *models.User, reference string) ([]models.Booking, error) {
	bookings, err := s.bookings.FindByReference(ctx, reference)
	if err != nil {
		return nil, httpx.Internal(err)
	}
	if len(bookings) == 0 {
		return nil, httpx.NotFound("That reservation does not exist.")
	}

	// Every row in a group belongs to the same guest and stay, so checking the
	// first is sufficient to authorise the whole group.
	if err := s.authoriseTransition(actor, &bookings[0], models.StatusCanceled); err != nil {
		return nil, err
	}

	canceled, err := s.lookups.StatusByName(ctx, models.StatusCanceled)
	if err != nil {
		return nil, httpx.Internal(err)
	}
	if _, err := s.bookings.UpdateStatusByReference(ctx, reference, canceled.ID); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, httpx.NotFound("That reservation does not exist.")
		}
		return nil, httpx.Internal(err)
	}

	return s.bookings.FindByReference(ctx, reference)
}

// authoriseTransition applies the ownership and lifecycle rules for a status
// change.
func (s *BookingService) authoriseTransition(actor *models.User, booking *models.Booking, target string) error {
	if actor == nil {
		return httpx.Unauthorized("Authentication is required.")
	}
	if !isKnownStatus(target) {
		return httpx.BadRequest(fmt.Sprintf(
			"Unknown status %q. Expected one of pending, confirmed, canceled.", target,
		))
	}

	current := models.StatusPending
	if booking.Status != nil {
		current = booking.Status.Name
	}

	if current == models.StatusCanceled {
		return httpx.Conflict("This booking has already been cancelled.")
	}
	if current == target {
		return httpx.Conflict(fmt.Sprintf("This booking is already %s.", target))
	}

	if actor.IsAdmin() {
		// Administrators may confirm a pending booking or cancel any live one.
		if target == models.StatusPending {
			return httpx.Conflict("A booking cannot be moved back to pending.")
		}
		return nil
	}

	// From here on the actor is a guest.
	if booking.UserID != actor.ID {
		return httpx.NotFound("That booking does not exist.")
	}
	if target != models.StatusCanceled {
		return httpx.Forbidden("Only staff can confirm a booking.")
	}
	if !booking.CheckIn.After(httpx.Today()) {
		return httpx.Conflict("A booking can no longer be cancelled on or after the check-in date.")
	}
	return nil
}

// canView reports whether actor may read a booking.
func canView(actor *models.User, booking *models.Booking) bool {
	if actor == nil {
		return false
	}
	return actor.IsAdmin() || booking.UserID == actor.ID
}

func isKnownStatus(name string) bool {
	switch name {
	case models.StatusPending, models.StatusConfirmed, models.StatusCanceled:
		return true
	default:
		return false
	}
}

func pluralise(count int, singular, plural string) string {
	if count == 1 {
		return singular
	}
	return plural
}
