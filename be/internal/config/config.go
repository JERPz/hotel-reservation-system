// Package config loads and validates all runtime configuration from the
// environment. Nothing else in the application reads os.Getenv directly, so the
// full set of knobs the service supports is visible in one place.
package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

// Environment describes which deployment the process is running in.
type Environment string

const (
	EnvDevelopment Environment = "development"
	EnvProduction  Environment = "production"
)

// IsProduction reports whether the process runs with production hardening.
type Config struct {
	Env  Environment
	Port string

	DatabaseURL string
	LogSQL      bool

	JWTSecret string
	JWTTTL    time.Duration

	CORSOrigins []string

	// Seed runs the idempotent database seeder on boot.
	Seed bool
	// SeedDemoPassword is the password given to the seeded demo accounts. When
	// empty, the seeder creates reference data (rooms, roles, statuses) but no
	// login accounts.
	SeedDemoPassword string

	ReadTimeout     time.Duration
	WriteTimeout    time.Duration
	ShutdownTimeout time.Duration
}

// IsProduction reports whether production rules apply (strict CORS, no
// permissive fallbacks).
func (c Config) IsProduction() bool {
	return c.Env == EnvProduction
}

// Load reads an optional .env file and then resolves configuration from the
// environment. Real environment variables always win over .env entries so
// deployed configuration cannot be shadowed by a stray file.
//
// It returns an error rather than exiting so the caller controls process
// lifetime.
func Load() (Config, error) {
	loadDotEnvWithoutOverride()

	cfg := Config{
		Env:             parseEnvironment(getenv("APP_ENV", string(EnvDevelopment))),
		Port:            getenv("PORT", "8080"),
		DatabaseURL:     firstNonEmpty(os.Getenv("DATABASE_URL"), os.Getenv("DIRECT_URL")),
		LogSQL:          parseBool(os.Getenv("LOG_SQL"), false),
		JWTSecret:       os.Getenv("JWT_SECRET"),
		JWTTTL:          parseDuration(os.Getenv("JWT_TTL"), 24*time.Hour),
		CORSOrigins:     parseList(os.Getenv("CORS_ORIGIN")),
		Seed:            parseBool(os.Getenv("SEED"), false),
		ReadTimeout:     parseDuration(os.Getenv("READ_TIMEOUT"), 15*time.Second),
		WriteTimeout:    parseDuration(os.Getenv("WRITE_TIMEOUT"), 30*time.Second),
		ShutdownTimeout: parseDuration(os.Getenv("SHUTDOWN_TIMEOUT"), 10*time.Second),
	}

	// Seeding is convenient by default while developing, but must be opt-in
	// anywhere else.
	if !cfg.IsProduction() && os.Getenv("SEED") == "" {
		cfg.Seed = true
	}

	// Demo accounts are a development affordance. In production they are only
	// created if an explicit password is supplied.
	cfg.SeedDemoPassword = os.Getenv("SEED_DEMO_PASSWORD")
	if cfg.SeedDemoPassword == "" && !cfg.IsProduction() {
		cfg.SeedDemoPassword = "demo1234"
	}

	if err := cfg.validate(); err != nil {
		return Config{}, err
	}
	return cfg, nil
}

func (c Config) validate() error {
	var missing []string

	if c.DatabaseURL == "" {
		missing = append(missing, "DATABASE_URL (or DIRECT_URL)")
	}
	if c.JWTSecret == "" {
		missing = append(missing, "JWT_SECRET")
	}
	if len(missing) > 0 {
		return fmt.Errorf("missing required environment: %s", strings.Join(missing, ", "))
	}

	// A short secret defeats the point of signing. Enforce a floor rather than
	// silently falling back to a hardcoded key, which is what the previous
	// implementation did.
	if len(c.JWTSecret) < 32 {
		return fmt.Errorf("JWT_SECRET must be at least 32 characters (got %d)", len(c.JWTSecret))
	}
	if c.IsProduction() && len(c.CORSOrigins) == 0 {
		return fmt.Errorf("CORS_ORIGIN must list allowed origins when APP_ENV=production")
	}
	if c.IsProduction() && containsWildcard(c.CORSOrigins) {
		return fmt.Errorf(`CORS_ORIGIN cannot be "*" when APP_ENV=production`)
	}
	return nil
}

func loadDotEnvWithoutOverride() {
	values, err := godotenv.Read()
	if err != nil {
		return
	}
	for key, value := range values {
		if _, exists := os.LookupEnv(key); !exists {
			_ = os.Setenv(key, value)
		}
	}
}

func parseEnvironment(raw string) Environment {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "production", "prod":
		return EnvProduction
	default:
		return EnvDevelopment
	}
}

func getenv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok && strings.TrimSpace(value) != "" {
		return value
	}
	return fallback
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}

func parseBool(raw string, fallback bool) bool {
	if strings.TrimSpace(raw) == "" {
		return fallback
	}
	parsed, err := strconv.ParseBool(strings.TrimSpace(raw))
	if err != nil {
		return fallback
	}
	return parsed
}

func parseDuration(raw string, fallback time.Duration) time.Duration {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return fallback
	}
	if parsed, err := time.ParseDuration(raw); err == nil && parsed > 0 {
		return parsed
	}
	// Bare numbers are treated as seconds for convenience.
	if seconds, err := strconv.Atoi(raw); err == nil && seconds > 0 {
		return time.Duration(seconds) * time.Second
	}
	return fallback
}

func parseList(raw string) []string {
	var out []string
	for _, part := range strings.Split(raw, ",") {
		if trimmed := strings.TrimSpace(part); trimmed != "" {
			out = append(out, trimmed)
		}
	}
	return out
}

func containsWildcard(values []string) bool {
	for _, value := range values {
		if value == "*" {
			return true
		}
	}
	return false
}
