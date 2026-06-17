package ota

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
)

// PushToElectro sends an OTA push to the Electro server or directly to all devices of a type
func PushToElectro(deviceType, version, downloadURL string) error {
	electroURL := os.Getenv("ELECTRO_URL")
	if electroURL == "" {
		return fmt.Errorf("ELECTRO_URL not set")
	}

	payload := map[string]string{
		"version": version,
		"url":     downloadURL,
	}
	body, _ := json.Marshal(payload)

	// POST to Electro broadcast endpoint: /robot/broadcast/ota?deviceType=robot
	url := fmt.Sprintf("%s/robot/ota/broadcast?deviceType=%s", electroURL, deviceType)
	resp, err := http.Post(url, "application/json", bytes.NewReader(body))
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("electro returned %d", resp.StatusCode)
	}
	return nil
}
