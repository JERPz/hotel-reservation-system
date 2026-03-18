package utils

import (
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// ดึง Secret Key จาก Env
func getJWTKey() []byte {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "default_secret_key"
	}
	return []byte(secret)
}

type Claims struct {
	UserID uint   `json:"user_id"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

// GenerateJWT generates a token for the user
func GenerateJWT(userID uint, role string) (string, error) {
	expirationTime := time.Now().Add(24 * time.Hour)

	claims := &Claims{
		UserID: userID,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	return token.SignedString(getJWTKey())
}

// ParseJWT check token and return claims
func ParseJWT(tokenStr string) (*Claims, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (interface{}, error) {
		return getJWTKey(), nil
	})

	if err != nil || !token.Valid {
		return nil, err
	}
	return claims, nil
}
