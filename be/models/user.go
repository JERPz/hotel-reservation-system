package models

import "gorm.io/gorm"

type User struct {
	gorm.Model
	FirstName    string
	LastName     string
	Email        string `gorm:"unique;not null"`
	Phone        string
	PasswordHash string
	RoleID       uint
	Role         Role
	Bookings     []Booking `gorm:"foreignKey:UserID;references:ID"`
}
