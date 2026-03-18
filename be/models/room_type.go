package models

import "gorm.io/gorm"

type RoomType struct {
	gorm.Model
	Name        string  `gorm:"unique;not null"`
	Price       float64 `gorm:"not null"`
	Description string  `gorm:"type:text"`
	Rooms       []Room  `gorm:"foreignKey:TypeID;references:ID"`
}
