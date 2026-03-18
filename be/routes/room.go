package routes

import (
	"encoding/json"
	"net/http"

	"hotel-backend/config"
	"hotel-backend/models"
)

// GetRooms GET /rooms
func GetRooms(w http.ResponseWriter, r *http.Request) {
	var rooms []models.Room
	// Preload RoomType ด้วยถ้ามี
	config.DB.Preload("RoomType").Find(&rooms)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(rooms)
}

// CreateRoom POST /rooms/create
func CreateRoom(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	var room models.Room
	if err := json.NewDecoder(r.Body).Decode(&room); err != nil {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}

	if err := config.DB.Create(&room).Error; err != nil {
		http.Error(w, "Create failed", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(room)
}
