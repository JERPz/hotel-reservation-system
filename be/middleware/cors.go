package middleware

import (
	"net/http"
	"os"
	"strings"
)

func CORS(next http.Handler) http.Handler {
	allowedOrigin := os.Getenv("CORS_ORIGIN")
	appEnv := strings.ToLower(strings.TrimSpace(os.Getenv("APP_ENV")))
	allowedOrigins := make(map[string]struct{})
	for _, o := range strings.Split(allowedOrigin, ",") {
		o = strings.TrimSpace(o)
		if o == "" {
			continue
		}
		allowedOrigins[o] = struct{}{}
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" {
			w.Header().Add("Vary", "Origin")
		}

		allowThisOrigin := ""
		if len(allowedOrigins) > 0 {
			if _, ok := allowedOrigins["*"]; ok {
				allowThisOrigin = "*"
			} else if _, ok := allowedOrigins[origin]; ok {
				allowThisOrigin = origin
			}
		} else if appEnv != "production" && origin != "" {
			allowThisOrigin = origin
		}

		if allowThisOrigin != "" {
			w.Header().Set("Access-Control-Allow-Origin", allowThisOrigin)
		}
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}
