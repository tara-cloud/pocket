package storage

import (
	"crypto/sha256"
	"fmt"
	"io"
	"os"
	"path/filepath"
)

var Root string

func Init(root string) error {
	Root = root
	return os.MkdirAll(root, 0755)
}

// Save writes reader to <root>/<repo>/<name>/<version>/<filename> and returns (path, sha256, size, err)
func Save(repo, name, version, filename string, r io.Reader) (string, string, int64, error) {
	dir := filepath.Join(Root, repo, name, version)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", "", 0, err
	}

	dst := filepath.Join(dir, filename)
	f, err := os.Create(dst)
	if err != nil {
		return "", "", 0, err
	}
	defer f.Close()

	h := sha256.New()
	n, err := io.Copy(io.MultiWriter(f, h), r)
	if err != nil {
		os.Remove(dst)
		return "", "", 0, err
	}

	rel, _ := filepath.Rel(Root, dst)
	return rel, fmt.Sprintf("%x", h.Sum(nil)), n, nil
}

func AbsPath(rel string) string {
	return filepath.Join(Root, rel)
}

func Delete(rel string) error {
	return os.Remove(AbsPath(rel))
}
