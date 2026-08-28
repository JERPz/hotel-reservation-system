package middleware

import (
	"context"
	"net/http"
	"strings"

	"hotel-backend/internal/httpx"
	"hotel-backend/internal/models"
	"hotel-backend/internal/security"
)

// UserLoader fetches the account a token refers to.
//
// The boolean distinguishes "no such user" from a real failure, so a deleted
// account yields 401 while a database outage yields 500.
type UserLoader interface {
	LoadUserForAuth(ctx context.Context, id uint) (user *models.User, found bool, err error)
}

// Authenticator builds the auth middlewares. It resolves the bearer token to a
// freshly loaded user on every request, which means revoked or demoted accounts
// lose access immediately rather than when their token expires.
type Authenticator struct {
	tokens *security.TokenIssuer
	users  UserLoader
}

// NewAuthenticator wires the token issuer to the user store.
func NewAuthenticator(tokens *security.TokenIssuer, users UserLoader) *Authenticator {
	return &Authenticator{tokens: tokens, users: users}
}

// RequireAuth rejects requests without a valid bearer token.
func (a *Authenticator) RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user, err := a.authenticate(r)
		if err != nil {
			httpx.WriteError(w, r, err)
			return
		}
		next.ServeHTTP(w, r.WithContext(httpx.WithCurrentUser(r.Context(), user)))
	})
}

// RequireAdmin rejects requests that are not made by an administrator.
func (a *Authenticator) RequireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user, err := a.authenticate(r)
		if err != nil {
			httpx.WriteError(w, r, err)
			return
		}
		if !user.IsAdmin() {
			httpx.WriteError(w, r, httpx.Forbidden("This action requires an administrator account."))
			return
		}
		next.ServeHTTP(w, r.WithContext(httpx.WithCurrentUser(r.Context(), user)))
	})
}

// OptionalAuth attaches the user when a valid token is present but never blocks
// the request. Used for endpoints that return richer data to signed-in callers.
func (a *Authenticator) OptionalAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if user, err := a.authenticate(r); err == nil {
			r = r.WithContext(httpx.WithCurrentUser(r.Context(), user))
		}
		next.ServeHTTP(w, r)
	})
}

// authenticate extracts and validates the bearer token, then loads the user.
func (a *Authenticator) authenticate(r *http.Request) (*models.User, error) {
	raw, err := bearerToken(r)
	if err != nil {
		return nil, err
	}

	claims, err := a.tokens.Parse(raw)
	if err != nil {
		return nil, httpx.Unauthorized("Your session is invalid or has expired. Please sign in again.")
	}

	user, found, err := a.users.LoadUserForAuth(r.Context(), claims.UserID)
	if err != nil {
		return nil, httpx.Internal(err)
	}
	if !found {
		return nil, httpx.Unauthorized("Your session is no longer valid. Please sign in again.")
	}
	return user, nil
}

// bearerToken pulls the credential out of the Authorization header.
//
// The scheme is matched case-insensitively per RFC 7235 and the value must be a
// single non-empty token.
func bearerToken(r *http.Request) (string, error) {
	header := strings.TrimSpace(r.Header.Get("Authorization"))
	if header == "" {
		return "", httpx.Unauthorized("Authentication is required.")
	}

	scheme, credentials, found := strings.Cut(header, " ")
	if !found || !strings.EqualFold(scheme, "bearer") {
		return "", httpx.Unauthorized("Authorization header must use the Bearer scheme.")
	}

	credentials = strings.TrimSpace(credentials)
	if credentials == "" || strings.Contains(credentials, " ") {
		return "", httpx.Unauthorized("Malformed bearer token.")
	}
	return credentials, nil
}
