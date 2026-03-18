package routes

import (
	"encoding/json"
	"hotel-backend/config"
	"hotel-backend/models"
	"net/http"
)

func GetRoles(w http.ResponseWriter, r *http.Request) {
	var roles []models.Role
	config.DB.Find(&roles)
	json.NewEncoder(w).Encode(roles)
}
