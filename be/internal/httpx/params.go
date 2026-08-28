package httpx

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"
)

// DateLayout is the wire format for all calendar dates in this API. Bookings are
// day-granular, so dates are exchanged as plain YYYY-MM-DD rather than
// timestamps, which removes an entire class of timezone bugs.
const DateLayout = "2006-01-02"

// MonthLayout is the wire format for a calendar month.
const MonthLayout = "2006-01"

// PathID reads a {name} path segment as a positive database id.
func PathID(r *http.Request, name string) (uint, error) {
	raw := strings.TrimSpace(r.PathValue(name))
	if raw == "" {
		return 0, BadRequest(fmt.Sprintf("Missing %s in path.", name))
	}

	value, err := strconv.ParseUint(raw, 10, 64)
	if err != nil || value == 0 {
		return 0, BadRequest(fmt.Sprintf("%s must be a positive integer.", name))
	}
	return uint(value), nil
}

// QueryID reads a required positive id from the query string.
func QueryID(r *http.Request, name string) (uint, error) {
	raw := strings.TrimSpace(r.URL.Query().Get(name))
	if raw == "" {
		return 0, BadRequest(fmt.Sprintf("Query parameter %q is required.", name))
	}

	value, err := strconv.ParseUint(raw, 10, 64)
	if err != nil || value == 0 {
		return 0, BadRequest(fmt.Sprintf("Query parameter %q must be a positive integer.", name))
	}
	return uint(value), nil
}

// QueryDate reads a required YYYY-MM-DD query parameter as a UTC midnight time.
func QueryDate(r *http.Request, name string) (time.Time, error) {
	raw := strings.TrimSpace(r.URL.Query().Get(name))
	if raw == "" {
		return time.Time{}, BadRequest(fmt.Sprintf("Query parameter %q is required.", name))
	}
	return ParseDate(raw, name)
}

// QueryMonth reads an optional YYYY-MM query parameter, returning the first day
// of that month. When absent it falls back to the current month.
func QueryMonth(r *http.Request, name string) (time.Time, error) {
	raw := strings.TrimSpace(r.URL.Query().Get(name))
	if raw == "" {
		now := time.Now().UTC()
		return time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC), nil
	}

	parsed, err := time.ParseInLocation(MonthLayout, raw, time.UTC)
	if err != nil {
		return time.Time{}, BadRequest(fmt.Sprintf("Query parameter %q must be formatted as YYYY-MM.", name)).
			WithField(name, "expected YYYY-MM")
	}
	return parsed, nil
}

// QueryInt reads an optional integer query parameter, clamped to [min, max].
func QueryInt(r *http.Request, name string, fallback, min, max int) int {
	raw := strings.TrimSpace(r.URL.Query().Get(name))
	if raw == "" {
		return fallback
	}

	value, err := strconv.Atoi(raw)
	if err != nil {
		return fallback
	}
	if value < min {
		return min
	}
	if value > max {
		return max
	}
	return value
}

// ParseDate parses a YYYY-MM-DD string into UTC midnight.
//
// It also accepts a full RFC3339 timestamp and truncates it to the day, so
// clients that send an ISO datetime are not rejected outright.
func ParseDate(raw, field string) (time.Time, error) {
	raw = strings.TrimSpace(raw)

	if parsed, err := time.ParseInLocation(DateLayout, raw, time.UTC); err == nil {
		return parsed, nil
	}
	if parsed, err := time.Parse(time.RFC3339, raw); err == nil {
		return TruncateToDay(parsed), nil
	}

	return time.Time{}, BadRequest(fmt.Sprintf("Field %q must be a date formatted as YYYY-MM-DD.", field)).
		WithField(field, "expected YYYY-MM-DD")
}

// TruncateToDay drops the time component, normalising to UTC midnight.
func TruncateToDay(t time.Time) time.Time {
	utc := t.UTC()
	return time.Date(utc.Year(), utc.Month(), utc.Day(), 0, 0, 0, 0, time.UTC)
}

// FormatDate renders a time as YYYY-MM-DD.
func FormatDate(t time.Time) string {
	return t.UTC().Format(DateLayout)
}

// Today returns the current UTC date at midnight.
func Today() time.Time {
	return TruncateToDay(time.Now())
}
