package db

import (
	"time"

	"gorm.io/datatypes"
)

type Repository struct {
	ID          uint       `gorm:"primaryKey"     json:"id"`
	Name        string     `gorm:"uniqueIndex;not null" json:"name"`
	Description string     `json:"description"`
	RepoType    string     `gorm:"default:generic" json:"repoType"` // generic|firmware|library|npm
	IsPublic    bool       `gorm:"default:true"   json:"isPublic"`
	CreatedAt   time.Time  `json:"createdAt"`
	Artifacts   []Artifact `gorm:"foreignKey:RepositoryID" json:"artifacts,omitempty"`
}

type Artifact struct {
	ID            uint           `gorm:"primaryKey"  json:"id"`
	RepositoryID  uint           `gorm:"not null;index" json:"repositoryId"`
	Name          string         `gorm:"not null"    json:"name"`
	Version       string         `gorm:"not null"    json:"version"`
	FileName      string         `json:"fileName"`
	FilePath      string         `json:"filePath"`
	Size          int64          `json:"size"`
	ContentType   string         `json:"contentType"`
	Checksum      string         `json:"checksum"`
	DownloadCount int            `json:"downloadCount"`
	Metadata      datatypes.JSON `json:"metadata"`
	CreatedAt     time.Time      `json:"createdAt"`
}

type OTARelease struct {
	ID           uint       `gorm:"primaryKey" json:"id"`
	ArtifactID   uint       `gorm:"not null"   json:"artifactId"`
	Artifact     Artifact   `gorm:"foreignKey:ArtifactID" json:"artifact,omitempty"`
	DeviceType   string     `json:"deviceType"`
	Version      string     `json:"version"`
	ReleaseNotes string     `json:"releaseNotes"`
	PushedAt     *time.Time `json:"pushedAt"`
	CreatedAt    time.Time  `json:"createdAt"`
}

type APIKey struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Name      string    `json:"name"`
	KeyHash   string    `gorm:"uniqueIndex" json:"-"`
	CreatedAt time.Time `json:"createdAt"`
}
