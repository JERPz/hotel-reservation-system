// Package api is the HTTP layer: it decodes requests, delegates to services and
// encodes DTOs. It contains no business rules and no SQL.
package api

import (
	"net/http"
	"sort"
	"strings"
	"time"

	"hotel-backend/internal/httpx"
	"hotel-backend/internal/middleware"
	"hotel-backend/internal/service"
	"hotel-backend/internal/store"
)

// Server holds the dependencies every handler needs.
type Server struct {
	auth     *service.AuthService
	bookings *service.BookingService
	catalog  *service.CatalogService
	guard    *middleware.Authenticator
	store    *store.Store
	started  time.Time
}

// Options are the constructor arguments for Server.
type Options struct {
	Auth     *service.AuthService
	Bookings *service.BookingService
	Catalog  *service.CatalogService
	Guard    *middleware.Authenticator
	Store    *store.Store
}

// NewServer builds the API.
func NewServer(opts Options) *Server {
	return &Server{
		auth:     opts.Auth,
		bookings: opts.Bookings,
		catalog:  opts.Catalog,
		guard:    opts.Guard,
		store:    opts.Store,
		started:  time.Now(),
	}
}

// access is who may reach a route.
type access int

const (
	// public is reachable by anyone, signed in or not.
	public access = iota
	// authed requires a valid token.
	authed
	// admin requires a token belonging to an administrator.
	admin
)

// route is one entry in the routing table.
type route struct {
	method  string
	path    string
	access  access
	handler httpx.Handler
}

// routes is the complete API surface, with its access level stated inline.
//
// Expressing routing as data makes the security posture reviewable at a glance.
// The previous router registered every handler bare, which is why the JWT
// middleware present in the codebase protected nothing at all: there was no
// single place where the intended access level was visible or checked.
func (s *Server) routes() []route {
	return []route{
		// Service health.
		{http.MethodGet, "/api/health", public, s.handleHealth},

		// Authentication.
		{http.MethodPost, "/api/auth/register", public, s.handleRegister},
		{http.MethodPost, "/api/auth/login", public, s.handleLogin},
		{http.MethodGet, "/api/auth/me", authed, s.handleCurrentUser},

		// Public catalogue. Guests must be able to browse rooms, prices and
		// availability before they create an account.
		{http.MethodGet, "/api/room-types", public, s.handleListRoomTypes},
		{http.MethodGet, "/api/room-types/{id}", public, s.handleGetRoomType},
		{http.MethodGet, "/api/rooms", public, s.handleListRooms},
		{http.MethodGet, "/api/availability", public, s.handleAvailability},
		{http.MethodGet, "/api/availability/calendar", public, s.handleAvailabilityCalendar},
		{http.MethodGet, "/api/booking-statuses", public, s.handleListBookingStatuses},

		// A guest's own reservations.
		{http.MethodPost, "/api/bookings", authed, s.handleCreateBooking},
		{http.MethodGet, "/api/bookings/me", authed, s.handleMyBookings},
		{http.MethodGet, "/api/bookings/{id}", authed, s.handleGetBooking},
		{http.MethodPatch, "/api/bookings/{id}/status", authed, s.handleUpdateBookingStatus},
		{http.MethodPost, "/api/bookings/reference/{reference}/cancel", authed, s.handleCancelReservation},

		// Staff operations.
		{http.MethodGet, "/api/bookings", admin, s.handleListBookings},
		{http.MethodGet, "/api/bookings/stats", admin, s.handleBookingStats},
		{http.MethodGet, "/api/users", admin, s.handleListUsers},
		{http.MethodGet, "/api/roles", admin, s.handleListRoles},
		{http.MethodPost, "/api/room-types", admin, s.handleCreateRoomType},
		{http.MethodPost, "/api/rooms", admin, s.handleCreateRoom},
	}
}

// Routes returns the fully wired handler.
func (s *Server) Routes() http.Handler {
	mux := http.NewServeMux()

	// methodsByPath records which verbs each path supports so the fallback can
	// answer 405 with a correct Allow header.
	methodsByPath := make(map[string][]string)

	for _, rt := range s.routes() {
		mux.Handle(rt.method+" "+rt.path, s.protect(rt.access, rt.handler))
		methodsByPath[rt.path] = append(methodsByPath[rt.path], rt.method)
	}

	// A catch-all is needed to render unknown routes in the JSON error envelope
	// rather than net/http's plain-text 404. But a catch-all also shadows the
	// mux's own 405 handling, because "/" matches any path whose method did not
	// match. This second, method-agnostic mux is consulted to tell the two cases
	// apart.
	probe := http.NewServeMux()
	for path, methods := range methodsByPath {
		sort.Strings(methods)
		probe.Handle(path, allowedMethods(methods))
	}

	mux.Handle("/", httpx.Wrap(s.fallback(probe)))
	return mux
}

// protect applies the access level for a route.
func (s *Server) protect(level access, handler httpx.Handler) http.Handler {
	wrapped := httpx.Wrap(handler)

	switch level {
	case admin:
		return s.guard.RequireAdmin(wrapped)
	case authed:
		return s.guard.RequireAuth(wrapped)
	default:
		return wrapped
	}
}

// allowedMethods is a marker handler carrying the verbs a path supports. It is
// only ever used for lookup, never to serve a request.
type allowedMethods []string

func (allowedMethods) ServeHTTP(http.ResponseWriter, *http.Request) {}

// fallback renders 405 when the path exists but the method does not, and 404
// otherwise.
func (s *Server) fallback(probe *http.ServeMux) httpx.Handler {
	return func(w http.ResponseWriter, r *http.Request) error {
		handler, pattern := probe.Handler(r)
		if pattern == "" {
			return httpx.NotFound("That endpoint does not exist.")
		}

		methods, ok := handler.(allowedMethods)
		if !ok {
			return httpx.NotFound("That endpoint does not exist.")
		}

		allow := strings.Join(methods, ", ")
		w.Header().Set("Allow", allow)

		return &httpx.Error{
			Status:  http.StatusMethodNotAllowed,
			Code:    "method_not_allowed",
			Message: "That method is not supported for this endpoint. Allowed: " + allow + ".",
		}
	}
}

// handleHealth reports process and database health.
//
// GET /api/health
func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) error {
	status, database := "ok", "ok"

	if err := s.store.Ping(); err != nil {
		status, database = "degraded", "unreachable"
	}

	code := http.StatusOK
	if status != "ok" {
		code = http.StatusServiceUnavailable
	}

	return httpx.JSON(w, code, struct {
		Status   string `json:"status"`
		Database string `json:"database"`
		Uptime   string `json:"uptime"`
		Time     string `json:"time"`
	}{
		Status:   status,
		Database: database,
		Uptime:   time.Since(s.started).Round(time.Second).String(),
		Time:     time.Now().UTC().Format(time.RFC3339),
	})
}
