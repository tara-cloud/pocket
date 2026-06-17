package main

import (
	"log"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/joho/godotenv"

	"github.com/tara-cloud/pocket/backend/internal/db"
	"github.com/tara-cloud/pocket/backend/internal/handlers"
	"github.com/tara-cloud/pocket/backend/internal/middleware"
	"github.com/tara-cloud/pocket/backend/internal/storage"
)

func main() {
	godotenv.Load()

	if err := db.Connect(); err != nil {
		log.Fatalf("DB: %v", err)
	}
	log.Println("Database connected")

	storageRoot := os.Getenv("STORAGE_PATH")
	if storageRoot == "" {
		storageRoot = "/data/artifacts"
	}
	if err := storage.Init(storageRoot); err != nil {
		log.Fatalf("Storage: %v", err)
	}
	log.Printf("Storage root: %s", storageRoot)

	app := fiber.New(fiber.Config{
		BodyLimit:  500 * 1024 * 1024, // 500 MB max upload
	})
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{AllowOrigins: "*"}))

	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok", "service": "pocket"})
	})

	// ── Public download ───────────────────────────────────────────────────────
	app.Get("/files/:repo/:name/:version/:filename", handlers.DownloadFile)

	// ── Repos ─────────────────────────────────────────────────────────────────
	api := app.Group("/api")
	api.Get("/repos", handlers.ListRepos)
	api.Get("/repos/:name", handlers.GetRepo)
	api.Post("/repos", middleware.Auth, handlers.CreateRepo)
	api.Delete("/repos/:name", middleware.Auth, handlers.DeleteRepo)

	// ── Artifacts ─────────────────────────────────────────────────────────────
	api.Get("/repos/:name/artifacts", handlers.ListArtifacts)
	api.Get("/repos/:name/artifacts/:id", handlers.GetArtifact)
	api.Post("/repos/:name/artifacts", middleware.Auth, handlers.UploadArtifact)
	api.Delete("/repos/:name/artifacts/:id", middleware.Auth, handlers.DeleteArtifact)

	// ── OTA ───────────────────────────────────────────────────────────────────
	api.Get("/ota", handlers.ListOTA)
	api.Get("/ota/:id", handlers.GetOTA)
	api.Post("/ota", middleware.Auth, handlers.CreateOTA)
	api.Post("/ota/:id/push", middleware.Auth, handlers.PushOTA)

	// ── API Keys ──────────────────────────────────────────────────────────────
	api.Get("/keys", middleware.Auth, handlers.ListKeys)
	api.Post("/keys", middleware.Auth, handlers.CreateKey)
	api.Delete("/keys/:id", middleware.Auth, handlers.DeleteKey)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("Pocket backend on :%s", port)
	log.Fatal(app.Listen(":" + port))
}
