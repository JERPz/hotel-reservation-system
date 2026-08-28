// Package models holds the persistence layer entities. These types describe the
// database schema only; the shapes sent over HTTP live in the api package as
// explicit DTOs so that storage changes cannot silently alter the public API.
package models

import (
	"time"

	"gorm.io/gorm"
)

// Base carries the columns every table shares. It replaces gorm.Model so the
// JSON representation stays under our control instead of leaking Go field names.
type Base struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// Role names that the application depends on. Roles are resolved by name rather
// than by primary key, because IDs depend on seed ordering and must never be
// trusted from client input.
const (
	RoleAdmin = "admin"
	RoleUser  = "user"
)

// Role groups users by permission level.
type Role struct {
	Base
	Name  string `gorm:"unique;size:32;not null" json:"name"`
	Users []User `gorm:"foreignKey:RoleID" json:"-"`
}

// User is an account that can sign in and hold bookings.
type User struct {
	Base
	FirstName string `gorm:"size:80;not null" json:"first_name"`
	LastName  string `gorm:"size:80" json:"last_name"`
	Email     string `gorm:"unique;size:255;not null" json:"email"`
	Phone     string `gorm:"size:32" json:"phone"`

	// PasswordHash is never serialised. The previous model had no json tag
	// here, which exposed every bcrypt hash through GET /api/users.
	PasswordHash string `gorm:"size:255;not null" json:"-"`

	RoleID uint  `gorm:"index;not null" json:"role_id"`
	Role   *Role `gorm:"foreignKey:RoleID" json:"role,omitempty"`

	Bookings []Booking `gorm:"foreignKey:UserID" json:"-"`
}

// FullName renders a display name, tolerating partially filled profiles.
func (u User) FullName() string {
	switch {
	case u.FirstName != "" && u.LastName != "":
		return u.FirstName + " " + u.LastName
	case u.FirstName != "":
		return u.FirstName
	case u.LastName != "":
		return u.LastName
	default:
		return u.Email
	}
}

// IsAdmin reports whether the loaded role grants administrative access.
func (u User) IsAdmin() bool {
	return u.Role != nil && u.Role.Name == RoleAdmin
}

// RoomType is a category of room sharing a nightly price and description.
type RoomType struct {
	Base
	Name        string  `gorm:"unique;size:80;not null" json:"name"`
	Price       float64 `gorm:"not null" json:"price"`
	Description string  `gorm:"type:text" json:"description"`
	Capacity    int     `gorm:"not null;default:2" json:"capacity"`

	Rooms []Room `gorm:"foreignKey:TypeID" json:"-"`
}

// Room is a single bookable unit belonging to a RoomType.
type Room struct {
	Base
	Number uint `gorm:"unique;not null" json:"number"`

	TypeID uint      `gorm:"index;not null" json:"type_id"`
	Type   *RoomType `gorm:"foreignKey:TypeID" json:"type,omitempty"`

	Bookings []Booking `gorm:"foreignKey:RoomID" json:"-"`
}

// Booking status names. Status rows are looked up by name for the same reason
// roles are: seeded IDs are an implementation detail.
const (
	StatusPending   = "pending"
	StatusConfirmed = "confirmed"
	StatusCanceled  = "canceled"
)

// BookingStatus is the lifecycle state of a booking.
type BookingStatus struct {
	Base
	Name     string    `gorm:"unique;size:32;not null" json:"name"`
	Bookings []Booking `gorm:"foreignKey:StatusID" json:"-"`
}

// Booking reserves one room for a half-open date range [CheckIn, CheckOut).
//
// A guest booking several rooms at once produces one Booking row per room, all
// sharing a Reference. That keeps the availability query simple (one row per
// room per stay) while still allowing the UI to present and cancel the group as
// a single reservation.
type Booking struct {
	Base

	// Reference groups the rows created by a single booking request.
	Reference string `gorm:"index;size:16;not null" json:"reference"`

	UserID uint  `gorm:"index;not null" json:"user_id"`
	User   *User `gorm:"foreignKey:UserID" json:"user,omitempty"`

	RoomID uint  `gorm:"index;not null" json:"room_id"`
	Room   *Room `gorm:"foreignKey:RoomID" json:"room,omitempty"`

	StatusID uint           `gorm:"index;not null" json:"status_id"`
	Status   *BookingStatus `gorm:"foreignKey:StatusID" json:"status,omitempty"`

	CheckIn  time.Time `gorm:"type:date;not null;index" json:"check_in"`
	CheckOut time.Time `gorm:"type:date;not null;index" json:"check_out"`

	// Nights and TotalPrice are captured at booking time so historical revenue
	// is not rewritten when a room type's price changes later.
	Nights     int     `gorm:"not null" json:"nights"`
	TotalPrice float64 `gorm:"not null" json:"total_price"`
}

// AllModels lists every entity in migration order (parents before children).
func AllModels() []any {
	return []any{
		&Role{},
		&User{},
		&RoomType{},
		&Room{},
		&BookingStatus{},
		&Booking{},
	}
}
