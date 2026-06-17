package handlers

import (
	"mime"
	"path/filepath"

	"github.com/gofiber/fiber/v2"
	"github.com/tara-cloud/pocket/backend/internal/db"
	"github.com/tara-cloud/pocket/backend/internal/storage"
)

func ListArtifacts(c *fiber.Ctx) error {
	repoName := c.Params("name")
	var repo db.Repository
	if err := db.DB.Where("name = ?", repoName).First(&repo).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "repo not found"})
	}

	query := db.DB.Where("repository_id = ?", repo.ID).Order("created_at desc")
	if v := c.Query("version"); v != "" {
		query = query.Where("version = ?", v)
	}
	if q := c.Query("q"); q != "" {
		query = query.Where("name ILIKE ?", "%"+q+"%")
	}

	var artifacts []db.Artifact
	query.Find(&artifacts)
	return c.JSON(artifacts)
}

func UploadArtifact(c *fiber.Ctx) error {
	repoName := c.Params("name")
	var repo db.Repository
	if err := db.DB.Where("name = ?", repoName).First(&repo).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "repo not found"})
	}

	file, err := c.FormFile("file")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "file required"})
	}

	name    := c.FormValue("name",    file.Filename)
	version := c.FormValue("version", "latest")

	// Check if this version already exists
	var existing db.Artifact
	if db.DB.Where("repository_id = ? AND name = ? AND version = ?", repo.ID, name, version).First(&existing).Error == nil {
		return c.Status(409).JSON(fiber.Map{"error": "artifact version already exists"})
	}

	src, err := file.Open()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	defer src.Close()

	ct := mime.TypeByExtension(filepath.Ext(file.Filename))
	if ct == "" {
		ct = "application/octet-stream"
	}

	relPath, checksum, size, err := storage.Save(repoName, name, version, file.Filename, src)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	artifact := db.Artifact{
		RepositoryID: repo.ID,
		Name:         name,
		Version:      version,
		FileName:     file.Filename,
		FilePath:     relPath,
		Size:         size,
		ContentType:  ct,
		Checksum:     checksum,
	}
	db.DB.Create(&artifact)
	return c.Status(201).JSON(artifact)
}

func GetArtifact(c *fiber.Ctx) error {
	id := c.Params("id")
	var a db.Artifact
	if err := db.DB.First(&a, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "not found"})
	}
	return c.JSON(a)
}

func DeleteArtifact(c *fiber.Ctx) error {
	id := c.Params("id")
	var a db.Artifact
	if err := db.DB.First(&a, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "not found"})
	}
	storage.Delete(a.FilePath)
	db.DB.Delete(&a)
	return c.JSON(fiber.Map{"ok": true})
}

func DownloadFile(c *fiber.Ctx) error {
	repo    := c.Params("repo")
	name    := c.Params("name")
	version := c.Params("version")
	fname   := c.Params("filename")

	var repoDoc db.Repository
	if err := db.DB.Where("name = ?", repo).First(&repoDoc).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "repo not found"})
	}
	var a db.Artifact
	if err := db.DB.Where("repository_id = ? AND name = ? AND version = ? AND file_name = ?",
		repoDoc.ID, name, version, fname).First(&a).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "artifact not found"})
	}

	// Increment download count
	db.DB.Model(&a).UpdateColumn("download_count", a.DownloadCount+1)

	abs := storage.AbsPath(a.FilePath)
	c.Set("Content-Disposition", `attachment; filename="`+fname+`"`)
	c.Set("X-Checksum-SHA256", a.Checksum)
	return c.SendFile(abs)
}
