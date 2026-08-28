package api

import (
	"net/http"

	"hotel-backend/internal/httpx"
	"hotel-backend/internal/service"
)

// registerRequest is the sign-up body.
//
// There is intentionally no role field: DecodeJSON rejects unknown fields, so a
// client attempting to send role_id now gets a 400 instead of an admin account.
type registerRequest struct {
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Email     string `json:"email"`
	Phone     string `json:"phone"`
	Password  string `json:"password"`
}

// handleRegister creates an account and signs the caller in.
//
// POST /api/auth/register
func (s *Server) handleRegister(w http.ResponseWriter, r *http.Request) error {
	var body registerRequest
	if err := httpx.DecodeJSON(w, r, &body); err != nil {
		return err
	}

	session, err := s.auth.Register(r.Context(), service.RegisterInput{
		FirstName: body.FirstName,
		LastName:  body.LastName,
		Email:     body.Email,
		Phone:     body.Phone,
		Password:  body.Password,
	})
	if err != nil {
		return err
	}

	return httpx.JSON(w, http.StatusCreated, newSessionResponse(session))
}

// loginRequest is the sign-in body.
type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// handleLogin exchanges credentials for a token.
//
// POST /api/auth/login
func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) error {
	var body loginRequest
	if err := httpx.DecodeJSON(w, r, &body); err != nil {
		return err
	}

	session, err := s.auth.Login(r.Context(), service.LoginInput{
		Email:    body.Email,
		Password: body.Password,
	})
	if err != nil {
		return err
	}

	return httpx.JSON(w, http.StatusOK, newSessionResponse(session))
}

// handleCurrentUser returns the signed-in account.
//
// The frontend calls this on boot to revalidate a token held in localStorage,
// which is how a stale or revoked session gets cleared instead of leaving the UI
// in a half-authenticated state.
//
// GET /api/auth/me
func (s *Server) handleCurrentUser(w http.ResponseWriter, r *http.Request) error {
	user, err := httpx.MustCurrentUser(r.Context())
	if err != nil {
		return err
	}
	return httpx.JSON(w, http.StatusOK, newUserResponse(user))
}
