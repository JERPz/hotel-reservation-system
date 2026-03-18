package routes

import (
	"encoding/json"
	"hotel-backend/config"
	"hotel-backend/models"
	"net/http"
)

// GetRoomTypes GET /room-types
func GetRoomTypes(w http.ResponseWriter, r *http.Request) {
	var types []models.RoomType
	config.DB.Find(&types)
	json.NewEncoder(w).Encode(types)
}

// CreateRoomType POST /room-types/create
func CreateRoomType(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid method", 405)
		return
	}

	var input models.RoomType
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid input", 400)
		return
	}

	config.DB.Create(&input)
	json.NewEncoder(w).Encode(input)
}
