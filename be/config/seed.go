package config

import (
	"log"

	"hotel-backend/models"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// SeedDatabase inserts default data: roles, users, room types, rooms, booking statuses
func SeedDatabase(db *gorm.DB) {
	log.Println("Seeding database...")

	// Roles
	roles := []models.Role{
		{Name: "admin"},
		{Name: "user"},
	}
	for _, r := range roles {
		db.FirstOrCreate(&r, models.Role{Name: r.Name})
	}

	// Admin User
	adminPassword := hashPassword("admin123")
	admin := models.User{
		FirstName:    "Admin",
		LastName:     "User",
		Email:        "admin@example.com",
		Phone:        "0812345678",
		PasswordHash: adminPassword,
		RoleID:       1, // admin
	}
	db.FirstOrCreate(&admin, models.User{Email: admin.Email})

	// Sample normal user
	userPassword := hashPassword("user123")
	user := models.User{
		FirstName:    "John",
		LastName:     "Doe",
		Email:        "user@example.com",
		Phone:        "0898765432",
		PasswordHash: userPassword,
		RoleID:       2, // user
	}
	db.FirstOrCreate(&user, models.User{Email: user.Email})

	// RoomTypes
	roomTypes := []models.RoomType{
		{Name: "Single", Description: "Single bed, basic room", Price: 1000},
		{Name: "Double", Description: "Double bed, comfortable", Price: 1800},
		{Name: "Suite", Description: "Luxury suite", Price: 3500},
	}
	for _, rt := range roomTypes {
		db.FirstOrCreate(&rt, models.RoomType{Name: rt.Name})
	}

	// Rooms: 10 per type (Assume i have 3 types, and have 10 room per type)
	for i, rt := range roomTypes {
		for j := 1; j <= 10; j++ {
			room := models.Room{
				Number: uint(i*10 + j),
				TypeID: rt.ID,
			}
			db.FirstOrCreate(&room, models.Room{Number: room.Number})
		}
	}

	// Booking Status
	statuses := []models.BookingStatus{
		{Name: "pending"},
		{Name: "confirmed"},
		{Name: "canceled"},
	}
	for _, s := range statuses {
		db.FirstOrCreate(&s, models.BookingStatus{Name: s.Name})
	}

	log.Println("Database seeding completed ✅")
}

// hashPassword hashes a plain password using bcrypt
func hashPassword(password string) string {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 12)
	if err != nil {
		log.Fatalf("Failed to hash password: %v", err)
	}
	return string(bytes)
}
