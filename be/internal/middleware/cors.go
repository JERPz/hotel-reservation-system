package middleware

import (
	"net/http"
	"strconv"
	"strings"
	"time"
)

// CORSOptions configures cross-origin access.
type CORSOptions struct {
	// AllowedOrigins is an explicit allow-list. "*" permits any origin and is
	// rejected by config validation in production.
	AllowedOrigins []string

	// AllowAnyOriginInDev reflects the request origin back when the allow-list
	// is empty. This keeps local development frictionless (Vite may run on a
	// different port than expected) without weakening deployed environments.
	AllowAnyOriginInDev bool

	MaxAge time.Duration
}

// CORS answers preflight requests and adds the response headers a browser needs
// to expose the API to a different origin.
func CORS(opts CORSOptions) Middleware {
	allowed := make(map[string]struct{}, len(opts.AllowedOrigins))
	wildcard := false
	for _, origin := range opts.AllowedOrigins {
		if origin == "*" {
			wildcard = true
			continue
		}
		allowed[strings.ToLower(origin)] = struct{}{}
	}

	maxAge := opts.MaxAge
	if maxAge <= 0 {
		maxAge = 10 * time.Minute
	}
	maxAgeHeader := strconv.Itoa(int(maxAge.Seconds()))

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")

			// Responses differ by origin, so caches must key on it.
			w.Header().Add("Vary", "Origin")

			if allow := resolveOrigin(origin, allowed, wildcard, opts.AllowAnyOriginInDev); allow != "" {
				w.Header().Set("Access-Control-Allow-Origin", allow)

				// Credentials cannot be combined with a wildcard origin. Since we
				// authenticate with a bearer token rather than cookies, we only
				// advertise credentials for a concrete origin.
				if allow != "*" {
					w.Header().Set("Access-Control-Allow-Credentials", "true")
				}
			}

			if r.Method == http.MethodOptions && r.Header.Get("Access-Control-Request-Method") != "" {
				w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS")
				w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Request-Id")
				w.Header().Set("Access-Control-Max-Age", maxAgeHeader)
				w.Header().Add("Vary", "Access-Control-Request-Method")
				w.Header().Add("Vary", "Access-Control-Request-Headers")
				w.WriteHeader(http.StatusNoContent)
				return
			}

			w.Header().Set("Access-Control-Expose-Headers", "X-Request-Id")
			next.ServeHTTP(w, r)
		})
	}
}

func resolveOrigin(origin string, allowed map[string]struct{}, wildcard, allowAnyInDev bool) string {
	if origin == "" {
		return ""
	}
	if wildcard {
		return "*"
	}
	if _, ok := allowed[strings.ToLower(origin)]; ok {
		return origin
	}
	if len(allowed) == 0 && allowAnyInDev {
		return origin
	}
	return ""
}
