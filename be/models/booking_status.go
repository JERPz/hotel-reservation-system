package models

import "gorm.io/gorm"

type BookingStatus struct {
	gorm.Model
	Name     string    `gorm:"unique;not null"`
	Bookings []Booking `gorm:"foreignKey:StatusID;references:ID"`
}
