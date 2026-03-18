package models

import "gorm.io/gorm"

type Room struct {
	gorm.Model
	Number   uint `gorm:"unique;not null"`
	TypeID   uint
	Type     RoomType
	Bookings []Booking `gorm:"foreignKey:RoomID;references:ID"`
}
