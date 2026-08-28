package api

import (
	"net/http"

	"hotel-backend/internal/httpx"
	"hotel-backend/internal/service"
	"hotel-backend/internal/store"
)

// handleListRoomTypes returns the bookable categories.
//
// GET /api/room-types
func (s *Server) handleListRoomTypes(w http.ResponseWriter, r *http.Request) error {
	types, err := s.catalog.ListRoomTypes(r.Context())
	if err != nil {
		return err
	}

	items := make([]roomTypeResponse, 0, len(types))
	for i := range types {
		if response := newRoomTypeWithCountResponse(&types[i]); response != nil {
			items = append(items, *response)
		}
	}

	return httpx.JSON(w, http.StatusOK,
		newListResponse(items, int64(len(items)), store.Pagination{Limit: len(items)}))
}

// handleGetRoomType returns one category.
//
// GET /api/room-types/{id}
func (s *Server) handleGetRoomType(w http.ResponseWriter, r *http.Request) error {
	id, err := httpx.PathID(r, "id")
	if err != nil {
		return err
	}

	roomType, err := s.catalog.GetRoomType(r.Context(), id)
	if err != nil {
		return err
	}

	return httpx.JSON(w, http.StatusOK, newRoomTypeWithCountResponse(roomType))
}

// createRoomTypeRequest is the new-category body.
type createRoomTypeRequest struct {
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Price       float64 `json:"price"`
	Capacity    int     `json:"capacity"`
}

// handleCreateRoomType adds a category. Staff only.
//
// POST /api/room-types
func (s *Server) handleCreateRoomType(w http.ResponseWriter, r *http.Request) error {
	var body createRoomTypeRequest
	if err := httpx.DecodeJSON(w, r, &body); err != nil {
		return err
	}

	if body.Capacity == 0 {
		body.Capacity = 2
	}

	roomType, err := s.catalog.CreateRoomType(r.Context(), service.CreateRoomTypeInput{
		Name:        body.Name,
		Description: body.Description,
		Price:       body.Price,
		Capacity:    body.Capacity,
	})
	if err != nil {
		return err
	}

	return httpx.JSON(w, http.StatusCreated, newRoomTypeResponse(roomType, 0))
}

// handleListRooms returns rooms, optionally narrowed to one type.
//
// GET /api/rooms?type_id=1
func (s *Server) handleListRooms(w http.ResponseWriter, r *http.Request) error {
	// type_id is optional here, so a parse failure is ignored rather than fatal.
	typeID := uint(httpx.QueryInt(r, "type_id", 0, 0, 1_000_000))

	rooms, err := s.catalog.ListRooms(r.Context(), typeID)
	if err != nil {
		return err
	}

	items := newRoomResponses(rooms)
	return httpx.JSON(w, http.StatusOK,
		newListResponse(items, int64(len(items)), store.Pagination{Limit: len(items)}))
}

// createRoomRequest is the new-room body.
type createRoomRequest struct {
	Number uint `json:"number"`
	TypeID uint `json:"type_id"`
}

// handleCreateRoom adds a room. Staff only.
//
// POST /api/rooms
func (s *Server) handleCreateRoom(w http.ResponseWriter, r *http.Request) error {
	var body createRoomRequest
	if err := httpx.DecodeJSON(w, r, &body); err != nil {
		return err
	}

	room, err := s.catalog.CreateRoom(r.Context(), service.CreateRoomInput{
		Number: body.Number,
		TypeID: body.TypeID,
	})
	if err != nil {
		return err
	}

	return httpx.JSON(w, http.StatusCreated, newRoomResponse(room))
}

// handleAvailability reports which rooms are free for a stay.
//
// GET /api/availability?type_id=1&check_in=2026-09-01&check_out=2026-09-03
func (s *Server) handleAvailability(w http.ResponseWriter, r *http.Request) error {
	typeID, err := httpx.QueryID(r, "type_id")
	if err != nil {
		return err
	}
	checkIn, err := httpx.QueryDate(r, "check_in")
	if err != nil {
		return err
	}
	checkOut, err := httpx.QueryDate(r, "check_out")
	if err != nil {
		return err
	}

	availability, err := s.bookings.CheckAvailability(r.Context(), typeID, checkIn, checkOut)
	if err != nil {
		return err
	}

	return httpx.JSON(w, http.StatusOK, newAvailabilityResponse(availability))
}

// handleAvailabilityCalendar reports per-day availability for a month.
//
// GET /api/availability/calendar?type_id=1&month=2026-09
func (s *Server) handleAvailabilityCalendar(w http.ResponseWriter, r *http.Request) error {
	typeID, err := httpx.QueryID(r, "type_id")
	if err != nil {
		return err
	}
	month, err := httpx.QueryMonth(r, "month")
	if err != nil {
		return err
	}

	calendar, err := s.bookings.MonthCalendar(r.Context(), typeID, month)
	if err != nil {
		return err
	}

	return httpx.JSON(w, http.StatusOK, newCalendarResponse(calendar))
}

// handleListBookingStatuses returns the lifecycle states.
//
// GET /api/booking-statuses
func (s *Server) handleListBookingStatuses(w http.ResponseWriter, r *http.Request) error {
	statuses, err := s.catalog.ListBookingStatuses(r.Context())
	if err != nil {
		return err
	}

	items := make([]bookingStatusResponse, 0, len(statuses))
	for _, status := range statuses {
		items = append(items, bookingStatusResponse{ID: status.ID, Name: status.Name})
	}

	return httpx.JSON(w, http.StatusOK,
		newListResponse(items, int64(len(items)), store.Pagination{Limit: len(items)}))
}

// handleListRoles returns the permission groups. Staff only.
//
// GET /api/roles
func (s *Server) handleListRoles(w http.ResponseWriter, r *http.Request) error {
	roles, err := s.catalog.ListRoles(r.Context())
	if err != nil {
		return err
	}

	items := make([]roleResponse, 0, len(roles))
	for _, role := range roles {
		items = append(items, roleResponse{ID: role.ID, Name: role.Name})
	}

	return httpx.JSON(w, http.StatusOK,
		newListResponse(items, int64(len(items)), store.Pagination{Limit: len(items)}))
}

// handleListUsers returns accounts. Staff only.
//
// This endpoint was previously unauthenticated and returned the full User model,
// including every bcrypt password hash.
//
// GET /api/users
func (s *Server) handleListUsers(w http.ResponseWriter, r *http.Request) error {
	page := paginationFrom(r)

	users, total, err := s.catalog.ListUsers(r.Context(), page)
	if err != nil {
		return err
	}

	items := make([]adminUserResponse, 0, len(users))
	for i := range users {
		response := newUserResponse(&users[i].User)
		if response == nil {
			continue
		}
		items = append(items, adminUserResponse{
			userResponse: *response,
			BookingCount: users[i].BookingCount,
		})
	}

	return httpx.JSON(w, http.StatusOK, newListResponse(items, total, page))
}
