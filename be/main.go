package main

import (
	"log"
	"net/http"
	"os"

	"hotel-backend/config"
	"hotel-backend/middleware"
	"hotel-backend/routes"

	"github.com/joho/godotenv"
)

func main() {
	if envs, err := godotenv.Read(); err == nil {
		for k, v := range envs {
			if _, exists := os.LookupEnv(k); !exists {
				_ = os.Setenv(k, v)
			}
		}
	} else {
		log.Println("No .env file found, using env vars")
	}

	log.Println("SEED env:", os.Getenv("SEED"), "APP_ENV env:", os.Getenv("APP_ENV"), "PORT:", os.Getenv("PORT"))

	validateEnv()
	db := config.ConnectDB()
	if db == nil {
		log.Fatal("DB failed to connect")
	}

	if os.Getenv("APP_ENV") == "development" || os.Getenv("SEED") == "1" {
		log.Println("Seeding mode enabled")
		config.SeedDatabase(db)
	}

	mux := http.NewServeMux()
	routes.RegisterHTTPHandlers(mux)

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("API is running"))
	})

	handler := middleware.Chain(
		middleware.CORS,
		middleware.Logger,
		middleware.Recover,
	)(mux)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("Server running on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, handler))
}

func validateEnv() {
	required := []string{"DATABASE_URL", "JWT_SECRET"}
	for _, key := range required {
		if os.Getenv(key) == "" {
			log.Fatalf("Missing required env: %s", key)
		}
	}
}
