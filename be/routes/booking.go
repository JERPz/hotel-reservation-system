package routes

import (
	"encoding/json"
	"hotel-backend/config"
	"hotel-backend/models"
	"net/http"
	"time"
)

// GetBookings GET /bookings
func GetBookings(w http.ResponseWriter, r *http.Request) {
	var bookings []models.Booking
	config.DB.Preload("User").Preload("Room").Preload("Status").Find(&bookings)
	json.NewEncoder(w).Encode(bookings)
}

// CreateBooking POST /bookings/create
func CreateBooking(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid method", 405)
		return
	}

	var input struct {
		UserID   uint
		RoomID   uint
		StatusID uint
		CheckIn  string
		CheckOut string
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid input", 400)
		return
	}

	checkIn, _ := time.Parse(time.RFC3339, input.CheckIn)
	checkOut, _ := time.Parse(time.RFC3339, input.CheckOut)

	booking := models.Booking{
		UserID:   input.UserID,
		RoomID:   input.RoomID,
		StatusID: input.StatusID,
		CheckIn:  checkIn,
		CheckOut: checkOut,
	}

	config.DB.Create(&booking)
	json.NewEncoder(w).Encode(booking)
}

// UpdateBooking POST /bookings/update
func UpdateBooking(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid method", 405)
		return
	}

	var input struct {
		ID       uint
		StatusID uint
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid input", 400)
		return
	}

	var booking models.Booking
	if err := config.DB.First(&booking, input.ID).Error; err != nil {
		http.Error(w, "Booking not found", 404)
		return
	}

	booking.StatusID = input.StatusID
	config.DB.Save(&booking)
	json.NewEncoder(w).Encode(booking)
}
