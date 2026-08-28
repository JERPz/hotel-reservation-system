package middleware

import (
	"crypto/rand"
	"encoding/hex"
	"log/slog"
	"net/http"
	"runtime/debug"
	"time"

	"hotel-backend/internal/httpx"
)

// RequestID attaches a correlation id to every request, reusing an inbound
// X-Request-Id when the caller supplied one.
func RequestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := r.Header.Get("X-Request-Id")
		if id == "" || len(id) > 64 {
			id = newRequestID()
		}

		w.Header().Set("X-Request-Id", id)
		next.ServeHTTP(w, r.WithContext(httpx.WithRequestID(r.Context(), id)))
	})
}

func newRequestID() string {
	buf := make([]byte, 8)
	if _, err := rand.Read(buf); err != nil {
		// A degraded id is still better than failing the request.
		return "unknown"
	}
	return hex.EncodeToString(buf)
}

// Logger records one structured line per request once it completes.
func Logger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		recorder := &statusRecorder{ResponseWriter: w}

		next.ServeHTTP(recorder, r)

		slog.Info("request",
			slog.String("method", r.Method),
			slog.String("path", r.URL.Path),
			slog.Int("status", recorder.Status()),
			slog.Int("bytes", recorder.bytes),
			slog.Duration("duration", time.Since(start).Round(time.Microsecond)),
			slog.String("request_id", httpx.RequestIDFromContext(r.Context())),
		)
	})
}

// Recover converts a panic into a 500 so one bad request cannot take down the
// process, and logs the stack for diagnosis.
func Recover(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			recovered := recover()
			if recovered == nil {
				return
			}

			// A dropped connection surfaces as a panic with this sentinel; it is
			// not an application fault and there is no client left to answer.
			if recovered == http.ErrAbortHandler {
				panic(recovered)
			}

			slog.Error("panic recovered",
				slog.Any("panic", recovered),
				slog.String("method", r.Method),
				slog.String("path", r.URL.Path),
				slog.String("request_id", httpx.RequestIDFromContext(r.Context())),
				slog.String("stack", string(debug.Stack())),
			)

			httpx.WriteError(w, r, httpx.Internal(nil))
		}()

		next.ServeHTTP(w, r)
	})
}
