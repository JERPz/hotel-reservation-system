package routes

import (
	"encoding/json"
	"hotel-backend/config"
	"hotel-backend/models"
	"hotel-backend/utils"
	"net/http"
)

// RegisterUser POST /users/register
func RegisterUser(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid method", 405)
		return
	}

	var input struct {
		FirstName string
		LastName  string
		Email     string
		Phone     string
		Password  string
		RoleID    uint
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid input", 400)
		return
	}

	hash, err := utils.HashPassword(input.Password)
	if err != nil {
		http.Error(w, "Failed to hash password", 500)
		return
	}

	user := models.User{
		FirstName:    input.FirstName,
		LastName:     input.LastName,
		Email:        input.Email,
		Phone:        input.Phone,
		PasswordHash: hash,
		RoleID:       input.RoleID,
	}

	if err := config.DB.Create(&user).Error; err != nil {
		http.Error(w, "Failed to create user", 500)
		return
	}

	json.NewEncoder(w).Encode(user)
}

// LoginUser POST /users/login
func LoginUser(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
		return
	}

	var input struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}

	var user models.User
	if err := config.DB.Preload("Role").Where("email = ?", input.Email).First(&user).Error; err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	if !utils.CheckPassword(user.PasswordHash, input.Password) {
		http.Error(w, "Invalid password", http.StatusUnauthorized)
		return
	}

	token, err := utils.GenerateJWT(user.ID, user.Role.Name)
	if err != nil {
		http.Error(w, "Failed to generate token", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"token": token,
		"user":  user,
	})
}

// GetUsers GET /users (admin)
func GetUsers(w http.ResponseWriter, r *http.Request) {
	var users []models.User
	if err := config.DB.Preload("Role").Find(&users).Error; err != nil {
		http.Error(w, "Failed to fetch users", 500)
		return
	}
	json.NewEncoder(w).Encode(users)
}
