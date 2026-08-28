package api

import (
	"net/http"

	"hotel-backend/internal/httpx"
	"hotel-backend/internal/service"
	"hotel-backend/internal/store"
)

// createBookingRequest is the reservation body.
//
// user_id is absent by design. It used to be accepted here, which meant any
// caller could book rooms in another guest's name; the guest is now always taken
// from the authenticated session.
type createBookingRequest struct {
	TypeID    uint   `json:"type_id"`
	RoomCount int    `json:"room_count"`
	CheckIn   string `json:"check_in"`
	CheckOut  string `json:"check_out"`
}

// handleCreateBooking reserves rooms for the signed-in guest.
//
// POST /api/bookings
func (s *Server) handleCreateBooking(w http.ResponseWriter, r *http.Request) error {
	user, err := httpx.MustCurrentUser(r.Context())
	if err != nil {
		return err
	}

	var body createBookingRequest
	if err := httpx.DecodeJSON(w, r, &body); err != nil {
		return err
	}

	if body.TypeID == 0 {
		return httpx.UnprocessableEntity("A room type is required.").
			WithField("type_id", "is required")
	}

	checkIn, err := httpx.ParseDate(body.CheckIn, "check_in")
	if err != nil {
		return err
	}
	checkOut, err := httpx.ParseDate(body.CheckOut, "check_out")
	if err != nil {
		return err
	}

	bookings, err := s.bookings.Create(r.Context(), service.CreateBookingInput{
		UserID:    user.ID,
		TypeID:    body.TypeID,
		RoomCount: body.RoomCount,
		CheckIn:   checkIn,
		CheckOut:  checkOut,
	})
	if err != nil {
		return err
	}

	// A multi-room request produces several rows sharing one reference; the
	// reference is surfaced so the client can treat them as one reservation.
	response := struct {
		Reference  string            `json:"reference"`
		Bookings   []bookingResponse `json:"bookings"`
		TotalPrice float64           `json:"total_price"`
	}{
		Reference: bookings[0].Reference,
		Bookings:  newBookingResponses(bookings, user),
	}
	for _, booking := range bookings {
		response.TotalPrice += booking.TotalPrice
	}

	return httpx.JSON(w, http.StatusCreated, response)
}

// handleMyBookings lists the signed-in guest's reservations.
//
// The old UI fetched every booking in the system and filtered by user id in the
// browser, which exposed other guests' data to anyone who opened devtools. The
// filter now runs in SQL under the caller's identity.
//
// GET /api/bookings/me
func (s *Server) handleMyBookings(w http.ResponseWriter, r *http.Request) error {
	user, err := httpx.MustCurrentUser(r.Context())
	if err != nil {
		return err
	}

	page := paginationFrom(r)
	bookings, total, err := s.bookings.ListForUser(r.Context(), user.ID, page)
	if err != nil {
		return err
	}

	return httpx.JSON(w, http.StatusOK,
		newListResponse(newBookingResponses(bookings, user), total, page))
}

// handleListBookings lists every reservation. Staff only.
//
// GET /api/bookings?status=pending
func (s *Server) handleListBookings(w http.ResponseWriter, r *http.Request) error {
	user, err := httpx.MustCurrentUser(r.Context())
	if err != nil {
		return err
	}

	page := paginationFrom(r)
	status := r.URL.Query().Get("status")

	bookings, total, err := s.bookings.ListAll(r.Context(), status, page)
	if err != nil {
		return err
	}

	return httpx.JSON(w, http.StatusOK,
		newListResponse(newBookingResponses(bookings, user), total, page))
}

// handleGetBooking returns one reservation, if the caller may see it.
//
// GET /api/bookings/{id}
func (s *Server) handleGetBooking(w http.ResponseWriter, r *http.Request) error {
	user, err := httpx.MustCurrentUser(r.Context())
	if err != nil {
		return err
	}

	id, err := httpx.PathID(r, "id")
	if err != nil {
		return err
	}

	booking, err := s.bookings.Get(r.Context(), user, id)
	if err != nil {
		return err
	}

	return httpx.JSON(w, http.StatusOK, newBookingResponse(booking, user))
}

// updateStatusRequest is the status-change body.
type updateStatusRequest struct {
	Status string `json:"status"`
}

// handleUpdateBookingStatus confirms or cancels a reservation.
//
// Authorisation lives in the service: staff may confirm or cancel, a guest may
// only cancel their own booking and only before check-in.
//
// PATCH /api/bookings/{id}/status
func (s *Server) handleUpdateBookingStatus(w http.ResponseWriter, r *http.Request) error {
	user, err := httpx.MustCurrentUser(r.Context())
	if err != nil {
		return err
	}

	id, err := httpx.PathID(r, "id")
	if err != nil {
		return err
	}

	var body updateStatusRequest
	if err := httpx.DecodeJSON(w, r, &body); err != nil {
		return err
	}
	if body.Status == "" {
		return httpx.UnprocessableEntity("A target status is required.").
			WithField("status", "is required")
	}

	booking, err := s.bookings.UpdateStatus(r.Context(), user, id, body.Status)
	if err != nil {
		return err
	}

	return httpx.JSON(w, http.StatusOK, newBookingResponse(booking, user))
}

// handleCancelReservation cancels every room booked under one reference.
//
// POST /api/bookings/reference/{reference}/cancel
func (s *Server) handleCancelReservation(w http.ResponseWriter, r *http.Request) error {
	user, err := httpx.MustCurrentUser(r.Context())
	if err != nil {
		return err
	}

	reference := r.PathValue("reference")
	if reference == "" {
		return httpx.BadRequest("A booking reference is required.")
	}

	bookings, err := s.bookings.CancelReference(r.Context(), user, reference)
	if err != nil {
		return err
	}

	return httpx.JSON(w, http.StatusOK, struct {
		Reference string            `json:"reference"`
		Bookings  []bookingResponse `json:"bookings"`
	}{
		Reference: reference,
		Bookings:  newBookingResponses(bookings, user),
	})
}

// handleBookingStats returns the admin dashboard aggregates.
//
// GET /api/bookings/stats
func (s *Server) handleBookingStats(w http.ResponseWriter, r *http.Request) error {
	stats, err := s.bookings.Stats(r.Context())
	if err != nil {
		return err
	}
	return httpx.JSON(w, http.StatusOK, stats)
}

// paginationFrom reads and clamps the limit/offset query parameters.
func paginationFrom(r *http.Request) store.Pagination {
	return store.Pagination{
		Limit:  httpx.QueryInt(r, "limit", 100, 1, 200),
		Offset: httpx.QueryInt(r, "offset", 0, 0, 1_000_000),
	}
}
