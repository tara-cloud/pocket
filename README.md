# Pocket

Self-hosted artifact registry and OTA firmware manager for the Tara ecosystem.

## Features
- **Repository management** — generic, firmware, library, npm repo types
- **Artifact storage** — versioned uploads with SHA256 checksum, download tracking
- **OTA releases** — link firmware artifacts to device types, push via Electro MQTT
- **API key auth** — `X-Pocket-Token` header; master key + per-client keys

## Quick Start

```bash
# Create a repo
curl -H "X-Pocket-Token: $MASTER_KEY" -H "Content-Type: application/json" \
  -d '{"name":"tara-firmware","repoType":"firmware"}' \
  http://localhost:30600/api/repos

# Upload firmware
curl -H "X-Pocket-Token: $MASTER_KEY" \
  -F file=@firmware.bin -F version=1.0.0 \
  http://localhost:30600/api/repos/tara-firmware/artifacts

# Download
curl http://localhost:30600/files/tara-firmware/tara-robot/1.0.0/firmware.bin -O

# Push OTA to all robots
curl -H "X-Pocket-Token: $MASTER_KEY" -X POST \
  http://localhost:30600/api/ota/1/push
```

## Stack
- **Backend**: Go 1.22 + Fiber + GORM + PostgreSQL 16
- **Frontend**: Next.js 15
- **Deploy**: Helm chart → k3s, NodePort 30600
