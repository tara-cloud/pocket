package handlers

import (
	"fmt"
	"os"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/tara-cloud/pocket/backend/internal/db"
	otapkg "github.com/tara-cloud/pocket/backend/internal/ota"
)

func ListOTA(c *fiber.Ctx) error {
	var releases []db.OTARelease
	db.DB.Preload("Artifact").Order("created_at desc").Find(&releases)
	return c.JSON(releases)
}

func GetOTA(c *fiber.Ctx) error {
	var r db.OTARelease
	if err := db.DB.Preload("Artifact").First(&r, c.Params("id")).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "not found"})
	}
	return c.JSON(r)
}

func CreateOTA(c *fiber.Ctx) error {
	var body struct {
		ArtifactID   uint   `json:"artifactId"`
		DeviceType   string `json:"deviceType"`
		Version      string `json:"version"`
		ReleaseNotes string `json:"releaseNotes"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	// Validate artifact exists
	var a db.Artifact
	if err := db.DB.First(&a, body.ArtifactID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "artifact not found"})
	}

	rel := db.OTARelease{
		ArtifactID:   body.ArtifactID,
		DeviceType:   body.DeviceType,
		Version:      body.Version,
		ReleaseNotes: body.ReleaseNotes,
	}
	db.DB.Create(&rel)
	return c.Status(201).JSON(rel)
}

func PushOTA(c *fiber.Ctx) error {
	var rel db.OTARelease
	if err := db.DB.Preload("Artifact").First(&rel, c.Params("id")).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "not found"})
	}

	// Build public download URL
	pocketURL := os.Getenv("POCKET_URL")
	if pocketURL == "" {
		pocketURL = fmt.Sprintf("http://%s:%s",
			getHostname(),
			os.Getenv("PORT"),
		)
	}

	// Reconstruct download path from artifact
	var repo db.Repository
	db.DB.First(&repo, rel.Artifact.RepositoryID)

	dlURL := fmt.Sprintf("%s/files/%s/%s/%s/%s",
		pocketURL, repo.Name,
		rel.Artifact.Name, rel.Version,
		rel.Artifact.FileName,
	)

	if err := otapkg.PushToElectro(rel.DeviceType, rel.Version, dlURL); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	now := time.Now()
	db.DB.Model(&rel).Update("pushed_at", &now)
	rel.PushedAt = &now
	return c.JSON(rel)
}

func getHostname() string {
	h, _ := os.Hostname()
	return h
}
