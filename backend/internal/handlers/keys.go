package handlers

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"

	"github.com/gofiber/fiber/v2"
	"github.com/tara-cloud/pocket/backend/internal/db"
)

func CreateKey(c *fiber.Ctx) error {
	var body struct {
		Name string `json:"name"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	raw := make([]byte, 32)
	rand.Read(raw)
	token := "pkt_" + hex.EncodeToString(raw)
	hash  := fmt.Sprintf("%x", sha256.Sum256([]byte(token)))

	key := db.APIKey{Name: body.Name, KeyHash: hash}
	db.DB.Create(&key)

	return c.Status(201).JSON(fiber.Map{
		"id":    key.ID,
		"name":  key.Name,
		"token": token, // shown only once
	})
}

func ListKeys(c *fiber.Ctx) error {
	var keys []db.APIKey
	db.DB.Order("created_at desc").Find(&keys)
	return c.JSON(keys)
}

func DeleteKey(c *fiber.Ctx) error {
	db.DB.Delete(&db.APIKey{}, c.Params("id"))
	return c.JSON(fiber.Map{"ok": true})
}
