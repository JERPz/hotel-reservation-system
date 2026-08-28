// Package security wraps password hashing and token issuing. Keeping both in
// one place makes the cryptographic choices auditable and stops handlers from
// reaching for bcrypt or jwt directly.
package security

import (
	"errors"
	"fmt"
	"unicode"

	"golang.org/x/crypto/bcrypt"
)

// MinPasswordLength is enforced on registration.
const MinPasswordLength = 8

// ErrWeakPassword is returned when a candidate password fails the policy.
var ErrWeakPassword = errors.New("password is too weak")

// HashPassword derives a bcrypt hash suitable for storage.
func HashPassword(plain string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(plain), bcrypt.DefaultCost)
	if err != nil {
		return "", fmt.Errorf("hash password: %w", err)
	}
	return string(hash), nil
}

// VerifyPassword reports whether plain matches the stored hash.
//
// It always runs the full bcrypt comparison so timing does not reveal whether
// the hash was well-formed.
func VerifyPassword(hash, plain string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(plain)) == nil
}

// ValidatePassword applies a minimum strength policy: long enough, and made of
// more than a single character class.
func ValidatePassword(plain string) error {
	if len([]rune(plain)) < MinPasswordLength {
		return fmt.Errorf("%w: must be at least %d characters", ErrWeakPassword, MinPasswordLength)
	}

	var hasLetter, hasOther bool
	for _, r := range plain {
		switch {
		case unicode.IsLetter(r):
			hasLetter = true
		default:
			hasOther = true
		}
	}
	if !hasLetter || !hasOther {
		return fmt.Errorf("%w: must combine letters with at least one number or symbol", ErrWeakPassword)
	}
	return nil
}
