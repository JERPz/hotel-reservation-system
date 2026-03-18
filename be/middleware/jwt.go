package middleware

import (
	"net/http"
	"strings"

	"hotel-backend/utils"
)

func JWTAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		auth := r.Header.Get("Authorization")
		if auth == "" {
			http.Error(w, "Missing token", 401)
			return
		}

		tokenString := strings.Replace(auth, "Bearer ", "", 1)

		_, err := utils.ParseJWT(tokenString)
		if err != nil {
			http.Error(w, "Invalid token", 401)
			return
		}

		next.ServeHTTP(w, r)
	})
}
