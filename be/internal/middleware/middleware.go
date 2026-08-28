// Package middleware holds the cross-cutting HTTP layers. Each one is a plain
// func(http.Handler) http.Handler so they compose in any order via Chain.
package middleware

import "net/http"

// Middleware decorates a handler.
type Middleware func(http.Handler) http.Handler

// Chain composes middleware so that the first argument is the outermost layer.
//
// Chain(A, B, C)(h) serves A -> B -> C -> h.
func Chain(middlewares ...Middleware) Middleware {
	return func(next http.Handler) http.Handler {
		for i := len(middlewares) - 1; i >= 0; i-- {
			next = middlewares[i](next)
		}
		return next
	}
}

// statusRecorder captures the status code and response size so the logger can
// report them after the handler has run.
type statusRecorder struct {
	http.ResponseWriter
	status int
	bytes  int
}

func (r *statusRecorder) WriteHeader(status int) {
	if r.status == 0 {
		r.status = status
		r.ResponseWriter.WriteHeader(status)
	}
}

func (r *statusRecorder) Write(b []byte) (int, error) {
	// A handler that writes without calling WriteHeader implies 200.
	if r.status == 0 {
		r.status = http.StatusOK
	}
	n, err := r.ResponseWriter.Write(b)
	r.bytes += n
	return n, err
}

// Status returns the observed status, defaulting to 200 for handlers that wrote
// nothing at all.
func (r *statusRecorder) Status() int {
	if r.status == 0 {
		return http.StatusOK
	}
	return r.status
}
