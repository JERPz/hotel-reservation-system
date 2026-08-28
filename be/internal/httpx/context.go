package httpx

import (
	"context"

	"hotel-backend/internal/models"
)

// contextKey is unexported so no other package can collide with these keys.
type contextKey int

const (
	requestIDKey contextKey = iota
	currentUserKey
)

// WithRequestID stores a correlation id on the context.
func WithRequestID(ctx context.Context, id string) context.Context {
	return context.WithValue(ctx, requestIDKey, id)
}

// RequestIDFromContext returns the correlation id, or "" when unset.
func RequestIDFromContext(ctx context.Context) string {
	id, _ := ctx.Value(requestIDKey).(string)
	return id
}

// WithCurrentUser stores the authenticated user on the context.
//
// The user is loaded from the database by the auth middleware rather than being
// reconstructed from token claims, so a role change or a deleted account takes
// effect immediately instead of lingering until the token expires.
func WithCurrentUser(ctx context.Context, user *models.User) context.Context {
	return context.WithValue(ctx, currentUserKey, user)
}

// CurrentUser returns the authenticated user, if any.
func CurrentUser(ctx context.Context) (*models.User, bool) {
	user, ok := ctx.Value(currentUserKey).(*models.User)
	return user, ok && user != nil
}

// MustCurrentUser returns the authenticated user or an Unauthorized error.
//
// Handlers mounted behind RequireAuth can rely on this succeeding; the error
// path exists so a routing mistake surfaces as a 401 rather than a nil panic.
func MustCurrentUser(ctx context.Context) (*models.User, error) {
	user, ok := CurrentUser(ctx)
	if !ok {
		return nil, Unauthorized("Authentication is required.")
	}
	return user, nil
}
