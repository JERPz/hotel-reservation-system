package api

import (
	"regexp"
	"strings"
	"time"

	"hotel-backend/internal/httpx"
	"hotel-backend/internal/models"
	"hotel-backend/internal/service"
	"hotel-backend/internal/store"
)

// The types in this file are the public API contract. They are deliberately
// separate from the models so a column rename cannot silently break clients, and
// so nothing that is not meant to be public (password hashes, soft-delete
// timestamps) can leak by accident.
//
// Every field is snake_case. The previous API mixed Go's default PascalCase with
// a handful of hand-written snake_case tags, which forced the frontend to probe
// several spellings of the same field.

// listResponse is the envelope for every collection endpoint.
type listResponse[T any] struct {
	Items  []T   `json:"items"`
	Total  int64 `json:"total"`
	Limit  int   `json:"limit"`
	Offset int   `json:"offset"`
}

func newListResponse[T any](items []T, total int64, page store.Pagination) listResponse[T] {
	// A nil slice marshals to null; an empty slice marshals to [], which is what
	// clients iterating the result expect.
	if items == nil {
		items = []T{}
	}
	return listResponse[T]{Items: items, Total: total, Limit: page.Limit, Offset: page.Offset}
}

// userResponse is an account as seen over the wire. There is no password field.
type userResponse struct {
	ID        uint      `json:"id"`
	FirstName string    `json:"first_name"`
	LastName  string    `json:"last_name"`
	FullName  string    `json:"full_name"`
	Email     string    `json:"email"`
	Phone     string    `json:"phone"`
	Role      string    `json:"role"`
	IsAdmin   bool      `json:"is_admin"`
	CreatedAt time.Time `json:"created_at"`
}

func newUserResponse(user *models.User) *userResponse {
	if user == nil {
		return nil
	}

	role := ""
	if user.Role != nil {
		role = user.Role.Name
	}

	return &userResponse{
		ID:        user.ID,
		FirstName: user.FirstName,
		LastName:  user.LastName,
		FullName:  user.FullName(),
		Email:     user.Email,
		Phone:     user.Phone,
		Role:      role,
		IsAdmin:   user.IsAdmin(),
		CreatedAt: user.CreatedAt,
	}
}

// adminUserResponse adds the booking count shown on the admin dashboard.
type adminUserResponse struct {
	userResponse
	BookingCount int `json:"booking_count"`
}

// sessionResponse is returned by register and login.
type sessionResponse struct {
	Token     string        `json:"token"`
	ExpiresAt time.Time     `json:"expires_at"`
	User      *userResponse `json:"user"`
}

func newSessionResponse(session *service.Session) sessionResponse {
	return sessionResponse{
		Token:     session.Token,
		ExpiresAt: session.ExpiresAt,
		User:      newUserResponse(session.User),
	}
}

// roomTypeResponse is a bookable category.
type roomTypeResponse struct {
	ID          uint    `json:"id"`
	Name        string  `json:"name"`
	Slug        string  `json:"slug"`
	Description string  `json:"description"`
	Price       float64 `json:"price"`
	Capacity    int     `json:"capacity"`
	RoomCount   int     `json:"room_count"`
}

func newRoomTypeResponse(roomType *models.RoomType, roomCount int) *roomTypeResponse {
	if roomType == nil {
		return nil
	}
	return &roomTypeResponse{
		ID:          roomType.ID,
		Name:        roomType.Name,
		Slug:        slugify(roomType.Name),
		Description: roomType.Description,
		Price:       roomType.Price,
		Capacity:    roomType.Capacity,
		RoomCount:   roomCount,
	}
}

func newRoomTypeWithCountResponse(roomType *store.RoomTypeWithCount) *roomTypeResponse {
	if roomType == nil {
		return nil
	}
	return newRoomTypeResponse(&roomType.RoomType, roomType.RoomCount)
}

// roomResponse is a single bookable unit.
type roomResponse struct {
	ID     uint              `json:"id"`
	Number uint              `json:"number"`
	TypeID uint              `json:"type_id"`
	Type   *roomTypeResponse `json:"type,omitempty"`
}

func newRoomResponse(room *models.Room) *roomResponse {
	if room == nil {
		return nil
	}

	out := &roomResponse{ID: room.ID, Number: room.Number, TypeID: room.TypeID}
	if room.Type != nil {
		// Room counts are a property of the type listing, not of a single room.
		out.Type = newRoomTypeResponse(room.Type, 0)
	}
	return out
}

func newRoomResponses(rooms []models.Room) []roomResponse {
	out := make([]roomResponse, 0, len(rooms))
	for i := range rooms {
		if room := newRoomResponse(&rooms[i]); room != nil {
			out = append(out, *room)
		}
	}
	return out
}

// bookingResponse is one reserved room.
//
// CanCancel is computed on the server so the cancel rules live in exactly one
// place; the UI only has to render the flag.
type bookingResponse struct {
	ID         uint          `json:"id"`
	Reference  string        `json:"reference"`
	StatusID   uint          `json:"status_id"`
	Status     string        `json:"status"`
	CheckIn    string        `json:"check_in"`
	CheckOut   string        `json:"check_out"`
	Nights     int           `json:"nights"`
	TotalPrice float64       `json:"total_price"`
	Room       *roomResponse `json:"room,omitempty"`
	Guest      *userResponse `json:"guest,omitempty"`
	CanCancel  bool          `json:"can_cancel"`
	CreatedAt  time.Time     `json:"created_at"`
}

func newBookingResponse(booking *models.Booking, actor *models.User) *bookingResponse {
	if booking == nil {
		return nil
	}

	status := ""
	if booking.Status != nil {
		status = booking.Status.Name
	}

	out := &bookingResponse{
		ID:         booking.ID,
		Reference:  booking.Reference,
		StatusID:   booking.StatusID,
		Status:     status,
		CheckIn:    httpx.FormatDate(booking.CheckIn),
		CheckOut:   httpx.FormatDate(booking.CheckOut),
		Nights:     booking.Nights,
		TotalPrice: booking.TotalPrice,
		Room:       newRoomResponse(booking.Room),
		CanCancel:  canCancel(actor, booking, status),
		CreatedAt:  booking.CreatedAt,
	}

	// The guest block is only meaningful to staff reviewing other people's
	// bookings, so it is omitted when a guest reads their own.
	if actor != nil && actor.IsAdmin() {
		out.Guest = newUserResponse(booking.User)
	}
	return out
}

func newBookingResponses(bookings []models.Booking, actor *models.User) []bookingResponse {
	out := make([]bookingResponse, 0, len(bookings))
	for i := range bookings {
		if booking := newBookingResponse(&bookings[i], actor); booking != nil {
			out = append(out, *booking)
		}
	}
	return out
}

// canCancel mirrors the service authorisation rules for the cancel action.
func canCancel(actor *models.User, booking *models.Booking, status string) bool {
	if actor == nil || status == models.StatusCanceled {
		return false
	}
	if actor.IsAdmin() {
		return true
	}
	return booking.UserID == actor.ID && booking.CheckIn.After(httpx.Today())
}

// availabilityResponse answers "what is free for these dates".
type availabilityResponse struct {
	RoomType       *roomTypeResponse `json:"room_type"`
	CheckIn        string            `json:"check_in"`
	CheckOut       string            `json:"check_out"`
	Nights         int               `json:"nights"`
	PricePerNight  float64           `json:"price_per_night"`
	TotalRooms     int               `json:"total_rooms"`
	AvailableCount int               `json:"available_count"`
	AvailableRooms []roomResponse    `json:"available_rooms"`
	// MaxRooms is the largest room_count the create endpoint will accept for
	// this request, so the UI can bound its selector without duplicating policy.
	MaxRooms int `json:"max_rooms"`
}

func newAvailabilityResponse(availability *service.Availability) availabilityResponse {
	maxRooms := availability.AvailableCount()
	if maxRooms > service.MaxRoomsPerBooking {
		maxRooms = service.MaxRoomsPerBooking
	}

	return availabilityResponse{
		RoomType:       newRoomTypeWithCountResponse(availability.RoomType),
		CheckIn:        httpx.FormatDate(availability.Stay.CheckIn),
		CheckOut:       httpx.FormatDate(availability.Stay.CheckOut),
		Nights:         availability.Stay.Nights,
		PricePerNight:  availability.RoomType.Price,
		TotalRooms:     availability.TotalRooms,
		AvailableCount: availability.AvailableCount(),
		AvailableRooms: newRoomResponses(availability.AvailableRooms),
		MaxRooms:       maxRooms,
	}
}

// calendarDayResponse is one day of the availability calendar.
type calendarDayResponse struct {
	Date           string `json:"date"`
	AvailableCount int    `json:"available_count"`
	SoldOut        bool   `json:"sold_out"`
	InPast         bool   `json:"in_past"`
}

// calendarResponse is a month of availability.
type calendarResponse struct {
	RoomType   *roomTypeResponse     `json:"room_type"`
	Month      string                `json:"month"`
	TotalRooms int                   `json:"total_rooms"`
	Days       []calendarDayResponse `json:"days"`
}

func newCalendarResponse(calendar *service.Calendar) calendarResponse {
	today := httpx.Today()

	days := make([]calendarDayResponse, 0, len(calendar.Days))
	for _, day := range calendar.Days {
		days = append(days, calendarDayResponse{
			Date:           httpx.FormatDate(day.Date),
			AvailableCount: day.AvailableCount,
			SoldOut:        day.AvailableCount <= 0,
			InPast:         day.Date.Before(today),
		})
	}

	return calendarResponse{
		RoomType:   newRoomTypeWithCountResponse(calendar.RoomType),
		Month:      calendar.Month.Format(httpx.MonthLayout),
		TotalRooms: calendar.TotalRooms,
		Days:       days,
	}
}

// bookingStatusResponse is a lifecycle state.
type bookingStatusResponse struct {
	ID   uint   `json:"id"`
	Name string `json:"name"`
}

// roleResponse is a permission group.
type roleResponse struct {
	ID   uint   `json:"id"`
	Name string `json:"name"`
}

// slugRegexp matches every run of characters that is not a letter or digit.
var slugRegexp = regexp.MustCompile(`[^a-z0-9]+`)

// slugify derives a stable lowercase key from a display name.
//
// The frontend picks illustrative images per room type. It previously did that by
// substring-matching the display name, which broke as soon as a name was renamed
// or translated. A slug gives it a stable key to switch on.
func slugify(value string) string {
	return strings.Trim(slugRegexp.ReplaceAllString(strings.ToLower(strings.TrimSpace(value)), "-"), "-")
}
