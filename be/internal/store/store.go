// Package store is the data access layer. It owns every SQL query and is the
// only package that touches gorm, so the service layer can be reasoned about
// without knowing how persistence works.
//
// Stores return ErrNotFound for missing rows and wrapped errors for everything
// else; they never produce HTTP concerns.
package store

import (
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5/pgconn"
	"gorm.io/gorm"
)

// ErrNotFound means the requested row does not exist.
var ErrNotFound = errors.New("record not found")

// ErrRoomsUnavailable means the requested rooms were taken for the given dates.
// It is raised inside the booking transaction after re-checking availability.
var ErrRoomsUnavailable = errors.New("rooms are not available for the selected dates")

// ErrDuplicateEmail means the email address is already registered.
var ErrDuplicateEmail = errors.New("email address is already registered")

// ErrDuplicateRoomType means a room type with that name already exists.
var ErrDuplicateRoomType = errors.New("room type name is already in use")

// ErrDuplicateRoom means a room with that number already exists.
var ErrDuplicateRoom = errors.New("room number is already in use")

// pgUniqueViolation is the SQLSTATE Postgres raises for a unique constraint.
const pgUniqueViolation = "23505"

// isUniqueViolation reports whether err is a unique constraint violation.
//
// Insert-then-handle is the only race-free way to enforce uniqueness, so the
// constraint error is treated as an expected outcome rather than a fault.
func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == pgUniqueViolation
}

// Store aggregates the per-entity stores behind one value so wiring stays short.
type Store struct {
	db *gorm.DB

	Users     *UserStore
	Rooms     *RoomStore
	RoomTypes *RoomTypeStore
	Bookings  *BookingStore
	Lookups   *LookupStore
}

// New builds the store set around a database handle.
func New(db *gorm.DB) *Store {
	return &Store{
		db:        db,
		Users:     &UserStore{db: db},
		Rooms:     &RoomStore{db: db},
		RoomTypes: &RoomTypeStore{db: db},
		Bookings:  &BookingStore{db: db},
		Lookups:   &LookupStore{db: db},
	}
}

// DB exposes the raw handle for health checks.
func (s *Store) DB() *gorm.DB { return s.db }

// Ping verifies the connection is usable.
func (s *Store) Ping() error {
	sqlDB, err := s.db.DB()
	if err != nil {
		return err
	}
	return sqlDB.Ping()
}

// translate converts gorm's not-found sentinel into ours and wraps everything
// else with context.
func translate(err error, operation string) error {
	if err == nil {
		return nil
	}
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return ErrNotFound
	}
	return fmt.Errorf("%s: %w", operation, err)
}

// Pagination is a validated limit/offset window.
type Pagination struct {
	Limit  int
	Offset int
}

// DefaultPagination returns a sane window when the caller supplies none.
func DefaultPagination() Pagination {
	return Pagination{Limit: 100, Offset: 0}
}

// normalise clamps the window so a client cannot request an unbounded scan.
func (p Pagination) normalise() Pagination {
	if p.Limit <= 0 {
		p.Limit = 100
	}
	if p.Limit > 200 {
		p.Limit = 200
	}
	if p.Offset < 0 {
		p.Offset = 0
	}
	return p
}

// apply adds the window to a query.
func (p Pagination) apply(query *gorm.DB) *gorm.DB {
	window := p.normalise()
	return query.Limit(window.Limit).Offset(window.Offset)
}
