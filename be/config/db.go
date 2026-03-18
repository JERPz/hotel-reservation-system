package config

import (
	"hotel-backend/models"
	"log"
	"os"
	"strings"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func ConnectDB() *gorm.DB {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = os.Getenv("DIRECT_URL")
	}
	if dsn == "" {
		log.Fatal("DATABASE_URL or DIRECT_URL must be set")
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("[error] failed to initialize database, got error %v", err)
	}

	DB = db

	// Auto migrate
	if err := db.AutoMigrate(
		&models.Role{},
		&models.User{},
		&models.RoomType{},
		&models.Room{},
		&models.BookingStatus{},
		&models.Booking{},
	); err != nil {
		if strings.Contains(err.Error(), "already exists") {
			log.Println("AutoMigrate partial: table already exists, continuing")
		} else {
			log.Fatalf("AutoMigrate failed: %v", err)
		}
	}

	log.Println("✅ Connected to Supabase Pooler DB!")
	return db
}
