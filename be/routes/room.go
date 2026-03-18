package routes

import (
	"encoding/json"
	"net/http"

	"hotel-backend/middleware"
	"hotel-backend/models"

	"gorm.io/gorm"
)

func RoomRoutes(mux *http.ServeMux, db *gorm.DB) {

	mux.Handle("/api/rooms", middleware.JWTAuth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		switch r.Method {

		case "GET":
			var rooms []models.Room
			db.Find(&rooms)
			json.NewEncoder(w).Encode(rooms)

		case "POST":
			var room models.Room

			err := json.NewDecoder(r.Body).Decode(&room)
			if err != nil {
				http.Error(w, "Invalid body", 400)
				return
			}

			if err := db.Create(&room).Error; err != nil {
				http.Error(w, "Create failed", 500)
				return
			}

			w.WriteHeader(201)
			json.NewEncoder(w).Encode(room)

		default:
			http.Error(w, "Method not allowed", 405)
		}
	})))
}
