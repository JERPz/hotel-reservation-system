// Package httpx contains the shared HTTP concerns: a typed error that maps
// cleanly onto status codes, and helpers for reading and writing JSON.
//
// Handlers return errors instead of writing responses directly, which keeps the
// success path readable and guarantees every failure is rendered in the same
// envelope.
package httpx

import (
	"errors"
	"fmt"
	"net/http"
)

// Error is an API failure with an HTTP status and a stable machine-readable code.
//
// Message is safe to show a user. Internal wraps the underlying cause for logs
// and is never serialised.
type Error struct {
	Status   int               `json:"-"`
	Code     string            `json:"code"`
	Message  string            `json:"message"`
	Fields   map[string]string `json:"fields,omitempty"`
	Internal error             `json:"-"`
}

func (e *Error) Error() string {
	if e.Internal != nil {
		return fmt.Sprintf("%s: %s: %v", e.Code, e.Message, e.Internal)
	}
	return fmt.Sprintf("%s: %s", e.Code, e.Message)
}

// Unwrap exposes the wrapped cause to errors.Is / errors.As.
func (e *Error) Unwrap() error { return e.Internal }

// WithInternal attaches a cause for logging without changing the client-facing
// message.
func (e *Error) WithInternal(err error) *Error {
	clone := *e
	clone.Internal = err
	return &clone
}

// WithField records a per-field validation message.
func (e *Error) WithField(name, message string) *Error {
	clone := *e
	clone.Fields = make(map[string]string, len(e.Fields)+1)
	for k, v := range e.Fields {
		clone.Fields[k] = v
	}
	clone.Fields[name] = message
	return &clone
}

// Constructors for the failures this API actually produces.

func BadRequest(message string) *Error {
	return &Error{Status: http.StatusBadRequest, Code: "bad_request", Message: message}
}

func Unauthorized(message string) *Error {
	return &Error{Status: http.StatusUnauthorized, Code: "unauthorized", Message: message}
}

func Forbidden(message string) *Error {
	return &Error{Status: http.StatusForbidden, Code: "forbidden", Message: message}
}

func NotFound(message string) *Error {
	return &Error{Status: http.StatusNotFound, Code: "not_found", Message: message}
}

func Conflict(message string) *Error {
	return &Error{Status: http.StatusConflict, Code: "conflict", Message: message}
}

func UnprocessableEntity(message string) *Error {
	return &Error{Status: http.StatusUnprocessableEntity, Code: "unprocessable_entity", Message: message}
}

func Internal(err error) *Error {
	return &Error{
		Status: http.StatusInternalServerError,
		Code:   "internal_error",
		// Deliberately generic: internal details go to the log, not the client.
		Message:  "An unexpected error occurred. Please try again.",
		Internal: err,
	}
}

// AsError converts any error into an *Error, defaulting to a 500.
func AsError(err error) *Error {
	var apiErr *Error
	if errors.As(err, &apiErr) {
		return apiErr
	}
	return Internal(err)
}
