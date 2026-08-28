package security

import (
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// ErrInvalidToken covers every reason a token was rejected. The cause is
// deliberately not exposed to callers so responses cannot be used as an oracle.
var ErrInvalidToken = errors.New("invalid or expired token")

// Claims is the payload carried by an access token.
type Claims struct {
	UserID uint   `json:"uid"`
	Email  string `json:"email"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

// TokenIssuer signs and verifies access tokens with a fixed secret and TTL.
//
// There is no fallback secret: the previous implementation defaulted to a
// hardcoded key when JWT_SECRET was unset, which meant tokens could be forged
// by anyone who read the source. Construction now requires a real secret.
type TokenIssuer struct {
	secret []byte
	ttl    time.Duration
}

// NewTokenIssuer builds an issuer. It fails when the secret is missing or too
// short to be meaningful.
func NewTokenIssuer(secret string, ttl time.Duration) (*TokenIssuer, error) {
	if len(secret) < 32 {
		return nil, fmt.Errorf("jwt secret must be at least 32 characters")
	}
	if ttl <= 0 {
		ttl = 24 * time.Hour
	}
	return &TokenIssuer{secret: []byte(secret), ttl: ttl}, nil
}

// Issue returns a signed token for the given identity, plus its expiry.
func (t *TokenIssuer) Issue(userID uint, email, role string) (string, time.Time, error) {
	now := time.Now().UTC()
	expiresAt := now.Add(t.ttl)

	claims := Claims{
		UserID: userID,
		Email:  email,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   fmt.Sprint(userID),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			Issuer:    "hotel-reservation-api",
		},
	}

	signed, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(t.secret)
	if err != nil {
		return "", time.Time{}, fmt.Errorf("sign token: %w", err)
	}
	return signed, expiresAt, nil
}

// Parse validates a token and returns its claims.
func (t *TokenIssuer) Parse(raw string) (*Claims, error) {
	claims := &Claims{}

	token, err := jwt.ParseWithClaims(raw, claims, func(token *jwt.Token) (any, error) {
		// Pinning the algorithm prevents an attacker from presenting a token
		// signed with "none" or with an asymmetric key of their choosing.
		if token.Method.Alg() != jwt.SigningMethodHS256.Alg() {
			return nil, fmt.Errorf("unexpected signing method %q", token.Method.Alg())
		}
		return t.secret, nil
	}, jwt.WithIssuer("hotel-reservation-api"), jwt.WithExpirationRequired())

	if err != nil || !token.Valid {
		return nil, ErrInvalidToken
	}
	if claims.UserID == 0 {
		return nil, ErrInvalidToken
	}
	return claims, nil
}

// TTL exposes the configured token lifetime.
func (t *TokenIssuer) TTL() time.Duration { return t.ttl }
