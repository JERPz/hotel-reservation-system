package routes

import (
	"encoding/json"
	"hotel-backend/config"
	"hotel-backend/models"
	"net/http"
)

func GetBookingStatus(w http.ResponseWriter, r *http.Request) {
	var status []models.BookingStatus
	config.DB.Find(&status)
	json.NewEncoder(w).Encode(status)
}
