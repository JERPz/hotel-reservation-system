package store

import (
	"context"

	"gorm.io/gorm"

	"hotel-backend/internal/models"
)

// RoomTypeStore reads and writes room categories.
type RoomTypeStore struct {
	db *gorm.DB
}

// RoomTypeWithCount pairs a type with how many rooms belong to it.
//
// The old admin dashboard read a RoomsCount field that the API never sent, so it
// always displayed zero. The count is now computed here in one grouped query
// instead of being fabricated client-side.
type RoomTypeWithCount struct {
	models.RoomType
	RoomCount int
}

// List returns every room type together with its room count.
func (s *RoomTypeStore) List(ctx context.Context) ([]RoomTypeWithCount, error) {
	var types []models.RoomType
	if err := s.db.WithContext(ctx).Order("price, id").Find(&types).Error; err != nil {
		return nil, translate(err, "list room types")
	}
	if len(types) == 0 {
		return []RoomTypeWithCount{}, nil
	}

	counts, err := s.countRooms(ctx)
	if err != nil {
		return nil, err
	}

	out := make([]RoomTypeWithCount, 0, len(types))
	for _, roomType := range types {
		out = append(out, RoomTypeWithCount{
			RoomType:  roomType,
			RoomCount: counts[roomType.ID],
		})
	}
	return out, nil
}

// FindByID returns one room type with its room count.
func (s *RoomTypeStore) FindByID(ctx context.Context, id uint) (*RoomTypeWithCount, error) {
	var roomType models.RoomType
	if err := s.db.WithContext(ctx).First(&roomType, id).Error; err != nil {
		return nil, translate(err, "find room type")
	}

	var count int64
	if err := s.db.WithContext(ctx).
		Model(&models.Room{}).
		Where("type_id = ?", id).
		Count(&count).Error; err != nil {
		return nil, translate(err, "count rooms for type")
	}

	return &RoomTypeWithCount{RoomType: roomType, RoomCount: int(count)}, nil
}

// Exists reports whether a room type id is valid.
func (s *RoomTypeStore) Exists(ctx context.Context, id uint) (bool, error) {
	var count int64
	if err := s.db.WithContext(ctx).
		Model(&models.RoomType{}).
		Where("id = ?", id).
		Count(&count).Error; err != nil {
		return false, translate(err, "check room type exists")
	}
	return count > 0, nil
}

// Create inserts a room type.
func (s *RoomTypeStore) Create(ctx context.Context, roomType *models.RoomType) error {
	if err := s.db.WithContext(ctx).Create(roomType).Error; err != nil {
		if isUniqueViolation(err) {
			return ErrDuplicateRoomType
		}
		return translate(err, "create room type")
	}
	return nil
}

// countRooms returns room totals keyed by type id.
func (s *RoomTypeStore) countRooms(ctx context.Context) (map[uint]int, error) {
	var rows []struct {
		TypeID uint
		Total  int
	}

	err := s.db.WithContext(ctx).
		Model(&models.Room{}).
		Select("type_id, COUNT(*) AS total").
		Group("type_id").
		Scan(&rows).Error
	if err != nil {
		return nil, translate(err, "count rooms by type")
	}

	out := make(map[uint]int, len(rows))
	for _, row := range rows {
		out[row.TypeID] = row.Total
	}
	return out, nil
}
