package service

import (
	"context"
	"errors"
	"fmt"
	"net/mail"
	"strings"
	"time"

	"hotel-backend/internal/httpx"
	"hotel-backend/internal/models"
	"hotel-backend/internal/security"
	"hotel-backend/internal/store"
)

// AuthService handles registration and sign-in.
type AuthService struct {
	users   *store.UserStore
	lookups *store.LookupStore
	tokens  *security.TokenIssuer
}

// NewAuthService wires the dependencies.
func NewAuthService(users *store.UserStore, lookups *store.LookupStore, tokens *security.TokenIssuer) *AuthService {
	return &AuthService{users: users, lookups: lookups, tokens: tokens}
}

// RegisterInput is a sign-up request.
//
// Note the absence of a role field. Registration always creates a standard user;
// the previous API accepted role_id from the request body, which let anyone grant
// themselves administrator access by posting {"role_id": 1}.
type RegisterInput struct {
	FirstName string
	LastName  string
	Email     string
	Phone     string
	Password  string
}

// Session is the result of a successful register or login.
type Session struct {
	Token     string
	ExpiresAt time.Time
	User      *models.User
}

// Register creates a standard user account and returns a signed session.
func (s *AuthService) Register(ctx context.Context, input RegisterInput) (*Session, error) {
	input.FirstName = strings.TrimSpace(input.FirstName)
	input.LastName = strings.TrimSpace(input.LastName)
	input.Email = store.NormaliseEmail(input.Email)
	input.Phone = strings.TrimSpace(input.Phone)

	if err := validateRegistration(input); err != nil {
		return nil, err
	}

	hash, err := security.HashPassword(input.Password)
	if err != nil {
		return nil, httpx.Internal(err)
	}

	// Resolve the role by name so seeded ids are never assumed.
	role, err := s.lookups.RoleByName(ctx, models.RoleUser)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, httpx.Internal(fmt.Errorf("role %q is missing; run the seeder", models.RoleUser))
		}
		return nil, httpx.Internal(err)
	}

	user := &models.User{
		FirstName:    input.FirstName,
		LastName:     input.LastName,
		Email:        input.Email,
		Phone:        input.Phone,
		PasswordHash: hash,
		RoleID:       role.ID,
	}

	if err := s.users.Create(ctx, user); err != nil {
		if errors.Is(err, store.ErrDuplicateEmail) {
			return nil, httpx.Conflict("An account with that email address already exists.").
				WithField("email", "already registered")
		}
		return nil, httpx.Internal(err)
	}

	return s.issue(user)
}

// LoginInput is a sign-in request.
type LoginInput struct {
	Email    string
	Password string
}

// Login verifies credentials and returns a signed session.
func (s *AuthService) Login(ctx context.Context, input LoginInput) (*Session, error) {
	email := store.NormaliseEmail(input.Email)
	if email == "" || input.Password == "" {
		return nil, httpx.BadRequest("Email and password are required.")
	}

	user, err := s.users.FindByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			// Deliberately identical to the wrong-password response so the
			// endpoint cannot be used to enumerate registered addresses.
			return nil, invalidCredentials()
		}
		return nil, httpx.Internal(err)
	}

	if !security.VerifyPassword(user.PasswordHash, input.Password) {
		return nil, invalidCredentials()
	}

	return s.issue(user)
}

// issue mints a token for an authenticated user.
func (s *AuthService) issue(user *models.User) (*Session, error) {
	roleName := models.RoleUser
	if user.Role != nil {
		roleName = user.Role.Name
	}

	token, expiresAt, err := s.tokens.Issue(user.ID, user.Email, roleName)
	if err != nil {
		return nil, httpx.Internal(err)
	}

	return &Session{Token: token, ExpiresAt: expiresAt, User: user}, nil
}

func invalidCredentials() error {
	return httpx.Unauthorized("Email or password is incorrect.")
}

// validateRegistration checks the shape of a sign-up request, reporting every
// bad field at once rather than failing on the first one.
func validateRegistration(input RegisterInput) error {
	problem := httpx.UnprocessableEntity("Some of the details provided are not valid.")
	invalid := false

	if input.FirstName == "" {
		problem = problem.WithField("first_name", "is required")
		invalid = true
	}
	if len(input.FirstName) > 80 || len(input.LastName) > 80 {
		problem = problem.WithField("first_name", "must be 80 characters or fewer")
		invalid = true
	}
	if input.Email == "" {
		problem = problem.WithField("email", "is required")
		invalid = true
	} else if _, err := mail.ParseAddress(input.Email); err != nil {
		problem = problem.WithField("email", "must be a valid email address")
		invalid = true
	}
	if input.Phone != "" && !validPhone(input.Phone) {
		problem = problem.WithField("phone", "must be 8 to 20 digits, optionally starting with +")
		invalid = true
	}
	if err := security.ValidatePassword(input.Password); err != nil {
		problem = problem.WithField("password", strings.TrimPrefix(err.Error(), security.ErrWeakPassword.Error()+": "))
		invalid = true
	}

	if invalid {
		return problem
	}
	return nil
}

// validPhone accepts an optional leading + followed by 8 to 20 digits, ignoring
// spaces and dashes that people naturally type.
func validPhone(phone string) bool {
	cleaned := strings.NewReplacer(" ", "", "-", "", "(", "", ")", "").Replace(phone)
	cleaned = strings.TrimPrefix(cleaned, "+")

	if len(cleaned) < 8 || len(cleaned) > 20 {
		return false
	}
	for _, r := range cleaned {
		if r < '0' || r > '9' {
			return false
		}
	}
	return true
}
