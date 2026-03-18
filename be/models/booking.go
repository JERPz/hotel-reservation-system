package models

import (
	"time"

	"gorm.io/gorm"
)

type Booking struct {
	gorm.Model
	UserID   uint
	User     User
	RoomID   uint
	Room     Room
	CheckIn  time.Time
	CheckOut time.Time
	StatusID uint
	Status   BookingStatus
}
