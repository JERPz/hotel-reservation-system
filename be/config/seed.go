package config

import (
	"log"

	"hotel-backend/models"
	"hotel-backend/utils" // นำเข้า utils เพื่อใช้ HashPassword

	"gorm.io/gorm"
)

func SeedDatabase(db *gorm.DB) {
	log.Println("Seeding database...")

	// 1. Roles
	roleNames := []string{"admin", "user"}
	roleMap := make(map[string]uint)
	for _, name := range roleNames {
		role := models.Role{Name: name}
		if err := db.Where(models.Role{Name: name}).FirstOrCreate(&role).Error; err != nil {
			log.Printf("❌ Role [%s] error: %v", name, err)
		}
		roleMap[name] = role.ID
	}

	adminPw, _ := utils.HashPassword("admin123")
	userPw, _ := utils.HashPassword("user123")

	users := []models.User{
		{
			FirstName:    "Admin",
			LastName:     "User",
			Email:        "admin@example.com",
			Phone:        "0812345678",
			PasswordHash: adminPw,
			RoleID:       roleMap["admin"],
		},
		{
			FirstName:    "John",
			LastName:     "Doe",
			Email:        "user@example.com",
			Phone:        "0898765432",
			PasswordHash: userPw,
			RoleID:       roleMap["user"],
		},
	}

	for _, u := range users {
		userData := u
		result := db.Where(models.User{Email: userData.Email}).FirstOrCreate(&userData)
		if result.Error != nil {
			log.Printf("❌ User [%s] error: %v", userData.Email, result.Error)
		} else if result.RowsAffected > 0 {
			log.Printf("✅ Inserted user: %s", userData.Email)
		}
	}

	// 3. RoomTypes & Rooms
	roomTypesData := []models.RoomType{
		{Name: "Single", Description: "Single bed, basic room", Price: 1000},
		{Name: "Double", Description: "Double bed, comfortable", Price: 1800},
		{Name: "Suite", Description: "Luxury suite", Price: 3500},
	}

	for i := range roomTypesData {
		rt := &roomTypesData[i]
		db.Where(models.RoomType{Name: rt.Name}).FirstOrCreate(rt)

		for j := 1; j <= 10; j++ {
			roomNum := uint((i+1)*100 + j)
			room := models.Room{
				Number: roomNum,
				TypeID: rt.ID,
			}
			db.Where(models.Room{Number: roomNum}).FirstOrCreate(&room)
		}
	}

	// 4. Booking Status
	statuses := []string{"pending", "confirmed", "canceled"}
	for _, s := range statuses {
		status := models.BookingStatus{Name: s}
		db.Where(models.BookingStatus{Name: s}).FirstOrCreate(&status)
	}

	log.Println("Database seeding completed ✅")
}
