package middleware

import (
	"crypto/sha256"
	"fmt"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/tara-cloud/pocket/backend/internal/db"
)

func Auth(c *fiber.Ctx) error {
	token := c.Get("X-Pocket-Token")
	if token == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "missing X-Pocket-Token"})
	}

	// Master key from env (for creating API keys)
	if master := os.Getenv("POCKET_MASTER_KEY"); master != "" && token == master {
		return c.Next()
	}

	// Check hashed key in DB
	hash := fmt.Sprintf("%x", sha256.Sum256([]byte(token)))
	var key db.APIKey
	if err := db.DB.Where("key_hash = ?", hash).First(&key).Error; err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid token"})
	}
	return c.Next()
}
