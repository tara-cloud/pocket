package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/tara-cloud/pocket/backend/internal/db"
)

func ListRepos(c *fiber.Ctx) error {
	var repos []db.Repository
	if err := db.DB.Order("created_at desc").Find(&repos).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	// Attach artifact counts
	type RepoWithCount struct {
		db.Repository
		ArtifactCount int64 `json:"artifactCount"`
		LatestVersion string `json:"latestVersion"`
	}
	result := make([]RepoWithCount, len(repos))
	for i, r := range repos {
		var count int64
		db.DB.Model(&db.Artifact{}).Where("repository_id = ?", r.ID).Count(&count)
		var latest db.Artifact
		db.DB.Where("repository_id = ?", r.ID).Order("created_at desc").First(&latest)
		result[i] = RepoWithCount{Repository: r, ArtifactCount: count, LatestVersion: latest.Version}
	}
	return c.JSON(result)
}

func CreateRepo(c *fiber.Ctx) error {
	var body struct {
		Name        string `json:"name"`
		Description string `json:"description"`
		RepoType    string `json:"repoType"`
		IsPublic    bool   `json:"isPublic"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	if body.RepoType == "" {
		body.RepoType = "generic"
	}
	repo := db.Repository{
		Name: body.Name, Description: body.Description,
		RepoType: body.RepoType, IsPublic: body.IsPublic,
	}
	if err := db.DB.Create(&repo).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(201).JSON(repo)
}

func GetRepo(c *fiber.Ctx) error {
	name := c.Params("name")
	var repo db.Repository
	if err := db.DB.Where("name = ?", name).First(&repo).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "not found"})
	}
	var count int64
	db.DB.Model(&db.Artifact{}).Where("repository_id = ?", repo.ID).Count(&count)
	return c.JSON(fiber.Map{"repo": repo, "artifactCount": count})
}

func DeleteRepo(c *fiber.Ctx) error {
	name := c.Params("name")
	if err := db.DB.Where("name = ?", name).Delete(&db.Repository{}).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"ok": true})
}
