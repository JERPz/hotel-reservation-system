// Package service holds the business rules: what a valid booking is, who may
// change one, and how a stay is priced. Handlers stay thin because every
// decision lives here, and the store layer stays dumb because it only runs
// queries.
//
// Services return *httpx.Error for outcomes the caller should see (validation
// failures, permission problems, conflicts) and wrapped errors for genuine
// faults. This application only ever speaks HTTP, so a second parallel error
// taxonomy would add indirection without adding clarity.
package service

import (
	"crypto/rand"
	"strings"
)

// referenceAlphabet omits characters that are easy to confuse when a guest reads
// a booking reference aloud or types it back in: 0/O, 1/I/L, and similar.
const referenceAlphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"

// referenceLength is the length of a generated booking reference.
const referenceLength = 8

// newReference returns a random, human-friendly booking reference.
//
// Rejection sampling keeps the distribution uniform: taking a raw byte modulo
// the alphabet size would bias the first few characters.
func newReference() (string, error) {
	var builder strings.Builder
	builder.Grow(referenceLength)

	// The largest multiple of the alphabet size that fits in a byte. Values at or
	// above this are discarded rather than folded in.
	const limit = 256 - (256 % len(referenceAlphabet))

	buf := make([]byte, referenceLength)
	for builder.Len() < referenceLength {
		if _, err := rand.Read(buf); err != nil {
			return "", err
		}
		for _, b := range buf {
			if int(b) >= limit {
				continue
			}
			builder.WriteByte(referenceAlphabet[int(b)%len(referenceAlphabet)])
			if builder.Len() == referenceLength {
				break
			}
		}
	}
	return builder.String(), nil
}
