package httpx

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
)

// maxBodyBytes caps request bodies so a malicious client cannot exhaust memory
// by streaming an unbounded payload into the JSON decoder.
const maxBodyBytes = 1 << 20 // 1 MiB

// Handler is a handler that can fail. Wrap turns it into a http.HandlerFunc.
type Handler func(http.ResponseWriter, *http.Request) error

// Wrap adapts a Handler, rendering any returned error through the standard
// envelope and logging 5xx causes.
func Wrap(h Handler) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if err := h(w, r); err != nil {
			WriteError(w, r, err)
		}
	}
}

// JSON writes v as a JSON response with the given status.
func JSON(w http.ResponseWriter, status int, v any) error {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("X-Content-Type-Options", "nosniff")

	if v == nil || status == http.StatusNoContent {
		w.WriteHeader(status)
		return nil
	}

	// Encode first so a marshalling failure does not leave a half-written body
	// after the status line has already been committed.
	body, err := json.Marshal(v)
	if err != nil {
		return Internal(fmt.Errorf("encode response: %w", err))
	}

	w.WriteHeader(status)
	if _, err := w.Write(body); err != nil {
		// The client hung up. Nothing left to do but note it.
		return nil
	}
	return nil
}

// NoContent writes a bare 204.
func NoContent(w http.ResponseWriter) error {
	w.WriteHeader(http.StatusNoContent)
	return nil
}

// errorEnvelope is the single shape every failure is rendered in.
type errorEnvelope struct {
	Error *Error `json:"error"`
}

// WriteError renders err and logs it. Server faults are logged at error level
// with their cause; client faults are logged at debug level.
func WriteError(w http.ResponseWriter, r *http.Request, err error) {
	apiErr := AsError(err)

	attrs := []any{
		slog.String("method", r.Method),
		slog.String("path", r.URL.Path),
		slog.Int("status", apiErr.Status),
		slog.String("code", apiErr.Code),
	}
	if id := RequestIDFromContext(r.Context()); id != "" {
		attrs = append(attrs, slog.String("request_id", id))
	}

	if apiErr.Status >= http.StatusInternalServerError {
		if apiErr.Internal != nil {
			attrs = append(attrs, slog.String("cause", apiErr.Internal.Error()))
		}
		slog.Error("request failed", attrs...)
	} else {
		slog.Debug("request rejected", attrs...)
	}

	_ = JSON(w, apiErr.Status, errorEnvelope{Error: apiErr})
}

// DecodeJSON reads a JSON request body into dst.
//
// It rejects the wrong content type, oversized bodies, unknown fields and
// trailing data, and converts decoder errors into readable 400s instead of
// leaking Go type names.
func DecodeJSON(w http.ResponseWriter, r *http.Request, dst any) error {
	if contentType := r.Header.Get("Content-Type"); contentType != "" {
		if mediaType := strings.TrimSpace(strings.Split(contentType, ";")[0]); mediaType != "application/json" {
			return &Error{
				Status:  http.StatusUnsupportedMediaType,
				Code:    "unsupported_media_type",
				Message: "Content-Type must be application/json.",
			}
		}
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxBodyBytes)

	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()

	if err := decoder.Decode(dst); err != nil {
		return decodeError(err)
	}

	// Exactly one JSON value is expected.
	if err := decoder.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		return BadRequest("Request body must contain a single JSON object.")
	}
	return nil
}

func decodeError(err error) *Error {
	var syntaxErr *json.SyntaxError
	var typeErr *json.UnmarshalTypeError
	var maxBytesErr *http.MaxBytesError

	switch {
	case errors.As(err, &syntaxErr):
		return BadRequest(fmt.Sprintf("Request body contains malformed JSON at position %d.", syntaxErr.Offset))

	case errors.As(err, &typeErr):
		if typeErr.Field != "" {
			return BadRequest(fmt.Sprintf("Field %q has the wrong type.", typeErr.Field)).
				WithField(typeErr.Field, fmt.Sprintf("expected %s", typeErr.Type.String()))
		}
		return BadRequest("Request body contains a value of the wrong type.")

	case errors.Is(err, io.EOF):
		return BadRequest("Request body must not be empty.")

	case errors.Is(err, io.ErrUnexpectedEOF):
		return BadRequest("Request body contains truncated JSON.")

	case errors.As(err, &maxBytesErr):
		return &Error{
			Status:  http.StatusRequestEntityTooLarge,
			Code:    "payload_too_large",
			Message: "Request body is too large.",
		}

	case strings.HasPrefix(err.Error(), "json: unknown field "):
		field := strings.Trim(strings.TrimPrefix(err.Error(), "json: unknown field "), `"`)
		return BadRequest(fmt.Sprintf("Unknown field %q in request body.", field))

	default:
		return BadRequest("Request body could not be parsed.")
	}
}
