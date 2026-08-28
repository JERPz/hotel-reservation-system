// Command hotel-backend serves the hotel reservation API.
//
// main does one job: build the dependency graph from configuration, start the
// server, and shut it down cleanly. All behaviour lives in internal/.
package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"hotel-backend/internal/api"
	"hotel-backend/internal/config"
	"hotel-backend/internal/database"
	"hotel-backend/internal/middleware"
	"hotel-backend/internal/security"
	"hotel-backend/internal/service"
	"hotel-backend/internal/store"
)

func main() {
	// run returns an error instead of calling log.Fatal from deep inside the
	// call stack, so deferred cleanup (closing the database) always executes.
	if err := run(); err != nil {
		slog.Error("fatal", slog.String("error", err.Error()))
		os.Exit(1)
	}
}

func run() error {
	cfg, err := config.Load()
	if err != nil {
		// The logger is not configured yet, so report plainly.
		return err
	}

	configureLogging(cfg)
	slog.Info("starting hotel reservation api",
		slog.String("env", string(cfg.Env)),
		slog.String("port", cfg.Port),
	)

	db, err := database.Connect(database.Options{DSN: cfg.DatabaseURL, LogSQL: cfg.LogSQL})
	if err != nil {
		return err
	}
	defer func() {
		if err := database.Close(db); err != nil {
			slog.Warn("closing database failed", slog.String("error", err.Error()))
		}
	}()

	if err := database.Migrate(db); err != nil {
		return err
	}

	if cfg.Seed {
		if err := database.Seed(db, database.SeedOptions{DemoPassword: cfg.SeedDemoPassword}); err != nil {
			return err
		}
	}

	// Compose the layers: store -> service -> api.
	tokens, err := security.NewTokenIssuer(cfg.JWTSecret, cfg.JWTTTL)
	if err != nil {
		return err
	}

	stores := store.New(db)
	guard := middleware.NewAuthenticator(tokens, stores.Users)

	server := api.NewServer(api.Options{
		Auth:     service.NewAuthService(stores.Users, stores.Lookups, tokens),
		Bookings: service.NewBookingService(stores.Bookings, stores.Rooms, stores.RoomTypes, stores.Lookups),
		Catalog:  service.NewCatalogService(stores.Rooms, stores.RoomTypes, stores.Lookups, stores.Users),
		Guard:    guard,
		Store:    stores,
	})

	// Outermost first: a panic inside CORS or the logger should still be caught,
	// and every log line should carry the request id.
	handler := middleware.Chain(
		middleware.RequestID,
		middleware.Recover,
		middleware.Logger,
		middleware.CORS(middleware.CORSOptions{
			AllowedOrigins:      cfg.CORSOrigins,
			AllowAnyOriginInDev: !cfg.IsProduction(),
		}),
	)(server.Routes())

	httpServer := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      handler,
		ReadTimeout:  cfg.ReadTimeout,
		WriteTimeout: cfg.WriteTimeout,
		IdleTimeout:  60 * time.Second,
		// Bound the header read so a slow-loris client cannot hold a connection
		// open indefinitely.
		ReadHeaderTimeout: 10 * time.Second,
	}

	return serve(httpServer, cfg.ShutdownTimeout)
}

// serve runs the server until a termination signal arrives, then drains it.
func serve(httpServer *http.Server, shutdownTimeout time.Duration) error {
	// Cancelled on SIGINT or SIGTERM.
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	errs := make(chan error, 1)
	go func() {
		slog.Info("listening", slog.String("addr", httpServer.Addr))
		if err := httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errs <- fmt.Errorf("listen: %w", err)
			return
		}
		errs <- nil
	}()

	select {
	case err := <-errs:
		return err

	case <-ctx.Done():
		slog.Info("shutdown signal received, draining connections")

		// Give in-flight requests a bounded window to finish before forcing the
		// listener closed.
		shutdownCtx, cancel := context.WithTimeout(context.Background(), shutdownTimeout)
		defer cancel()

		if err := httpServer.Shutdown(shutdownCtx); err != nil {
			return fmt.Errorf("graceful shutdown failed: %w", err)
		}
		slog.Info("shutdown complete")
		return nil
	}
}

// configureLogging installs the global structured logger: human-readable text
// while developing, JSON in production where logs are ingested by a collector.
func configureLogging(cfg config.Config) {
	level := slog.LevelDebug
	if cfg.IsProduction() {
		level = slog.LevelInfo
	}

	opts := &slog.HandlerOptions{Level: level}

	var handler slog.Handler
	if cfg.IsProduction() {
		handler = slog.NewJSONHandler(os.Stdout, opts)
	} else {
		handler = slog.NewTextHandler(os.Stdout, opts)
	}

	slog.SetDefault(slog.New(handler))
}
