package routes

import (
	"encoding/json"
	"hotel-backend/config"
	"hotel-backend/models"
	"net/http"
)

// GetRooms GET /rooms
func GetRooms(w http.ResponseWriter, r *http.Request) {
	var rooms []models.Room
	config.DB.Preload("RoomType").Find(&rooms)
	json.NewEncoder(w).Encode(rooms)
}

// CreateRoom POST /rooms/create
func CreateRoom(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid method", 405)
		return
	}

	var input models.Room
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid input", 400)
		return
	}

	config.DB.Create(&input)
	json.NewEncoder(w).Encode(input)
}
