package service

import (
	"context"
	"errors"
	"strings"

	"hotel-backend/internal/httpx"
	"hotel-backend/internal/models"
	"hotel-backend/internal/store"
)

// CatalogService exposes the hotel inventory: room types, rooms and the small
// reference tables.
type CatalogService struct {
	rooms     *store.RoomStore
	roomTypes *store.RoomTypeStore
	lookups   *store.LookupStore
	users     *store.UserStore
}

// NewCatalogService wires the dependencies.
func NewCatalogService(
	rooms *store.RoomStore,
	roomTypes *store.RoomTypeStore,
	lookups *store.LookupStore,
	users *store.UserStore,
) *CatalogService {
	return &CatalogService{rooms: rooms, roomTypes: roomTypes, lookups: lookups, users: users}
}

// ListRoomTypes returns the bookable categories with their room counts.
func (s *CatalogService) ListRoomTypes(ctx context.Context) ([]store.RoomTypeWithCount, error) {
	types, err := s.roomTypes.List(ctx)
	if err != nil {
		return nil, httpx.Internal(err)
	}
	return types, nil
}

// GetRoomType returns one category.
func (s *CatalogService) GetRoomType(ctx context.Context, id uint) (*store.RoomTypeWithCount, error) {
	roomType, err := s.roomTypes.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, httpx.NotFound("That room type does not exist.")
		}
		return nil, httpx.Internal(err)
	}
	return roomType, nil
}

// CreateRoomTypeInput describes a new category.
type CreateRoomTypeInput struct {
	Name        string
	Description string
	Price       float64
	Capacity    int
}

// CreateRoomType adds a category.
func (s *CatalogService) CreateRoomType(ctx context.Context, input CreateRoomTypeInput) (*models.RoomType, error) {
	input.Name = strings.TrimSpace(input.Name)
	input.Description = strings.TrimSpace(input.Description)

	problem := httpx.UnprocessableEntity("Some of the details provided are not valid.")
	invalid := false

	if input.Name == "" {
		problem = problem.WithField("name", "is required")
		invalid = true
	}
	if len(input.Name) > 80 {
		problem = problem.WithField("name", "must be 80 characters or fewer")
		invalid = true
	}
	if input.Price <= 0 {
		problem = problem.WithField("price", "must be greater than zero")
		invalid = true
	}
	if input.Capacity < 1 || input.Capacity > 20 {
		problem = problem.WithField("capacity", "must be between 1 and 20")
		invalid = true
	}
	if invalid {
		return nil, problem
	}

	roomType := &models.RoomType{
		Name:        input.Name,
		Description: input.Description,
		Price:       input.Price,
		Capacity:    input.Capacity,
	}

	if err := s.roomTypes.Create(ctx, roomType); err != nil {
		if errors.Is(err, store.ErrDuplicateRoomType) {
			return nil, httpx.Conflict("A room type with that name already exists.").
				WithField("name", "already in use")
		}
		return nil, httpx.Internal(err)
	}
	return roomType, nil
}

// ListRooms returns every room.
func (s *CatalogService) ListRooms(ctx context.Context, typeID uint) ([]models.Room, error) {
	var (
		rooms []models.Room
		err   error
	)

	if typeID != 0 {
		rooms, err = s.rooms.ListByType(ctx, typeID)
	} else {
		rooms, err = s.rooms.List(ctx)
	}
	if err != nil {
		return nil, httpx.Internal(err)
	}
	return rooms, nil
}

// CreateRoomInput describes a new room.
type CreateRoomInput struct {
	Number uint
	TypeID uint
}

// CreateRoom adds a room to a category.
func (s *CatalogService) CreateRoom(ctx context.Context, input CreateRoomInput) (*models.Room, error) {
	problem := httpx.UnprocessableEntity("Some of the details provided are not valid.")
	invalid := false

	if input.Number == 0 {
		problem = problem.WithField("number", "is required and must be positive")
		invalid = true
	}
	if input.TypeID == 0 {
		problem = problem.WithField("type_id", "is required")
		invalid = true
	}
	if invalid {
		return nil, problem
	}

	exists, err := s.roomTypes.Exists(ctx, input.TypeID)
	if err != nil {
		return nil, httpx.Internal(err)
	}
	if !exists {
		return nil, httpx.UnprocessableEntity("That room type does not exist.").
			WithField("type_id", "unknown room type")
	}

	room := &models.Room{Number: input.Number, TypeID: input.TypeID}
	if err := s.rooms.Create(ctx, room); err != nil {
		if errors.Is(err, store.ErrDuplicateRoom) {
			return nil, httpx.Conflict("A room with that number already exists.").
				WithField("number", "already in use")
		}
		return nil, httpx.Internal(err)
	}
	return room, nil
}

// ListBookingStatuses returns the booking lifecycle states.
func (s *CatalogService) ListBookingStatuses(ctx context.Context) ([]models.BookingStatus, error) {
	statuses, err := s.lookups.ListStatuses(ctx)
	if err != nil {
		return nil, httpx.Internal(err)
	}
	return statuses, nil
}

// ListRoles returns the available roles.
func (s *CatalogService) ListRoles(ctx context.Context) ([]models.Role, error) {
	roles, err := s.lookups.ListRoles(ctx)
	if err != nil {
		return nil, httpx.Internal(err)
	}
	return roles, nil
}

// UserWithBookingCount pairs an account with how many live bookings it holds.
type UserWithBookingCount struct {
	User         models.User
	BookingCount int
}

// ListUsers returns accounts with their booking counts, for the admin view.
func (s *CatalogService) ListUsers(ctx context.Context, page store.Pagination) ([]UserWithBookingCount, int64, error) {
	users, total, err := s.users.List(ctx, page)
	if err != nil {
		return nil, 0, httpx.Internal(err)
	}

	ids := make([]uint, 0, len(users))
	for _, user := range users {
		ids = append(ids, user.ID)
	}

	// One grouped query instead of a count per user.
	counts, err := s.users.CountBookingsByUser(ctx, ids)
	if err != nil {
		return nil, 0, httpx.Internal(err)
	}

	out := make([]UserWithBookingCount, 0, len(users))
	for _, user := range users {
		out = append(out, UserWithBookingCount{User: user, BookingCount: counts[user.ID]})
	}
	return out, total, nil
}
