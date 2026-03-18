package models

import "gorm.io/gorm"

type Room struct {
	gorm.Model
	Number   uint      `gorm:"unique;not null" json:"number"`
	TypeID   uint      `json:"type_id"`
	Type     RoomType  `gorm:"foreignKey:TypeID" json:"type"`
	Bookings []Booking `gorm:"foreignKey:RoomID;references:ID" json:"bookings"`
}
