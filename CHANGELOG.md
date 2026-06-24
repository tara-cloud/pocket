# Changelog

## [1.1.6] — 2026-06-25

### Fixed

- `docker` and `helm-upgrade` jobs were being skipped because `needs.release.outputs.already_exists` is an empty string (not `'false'`) when the output is never explicitly set. Changed condition from `== 'false'` to `!= 'true'` so an empty/unset value passes correctly.

## [1.1.5] — 2026-06-24

### Fixed

- Merged `deploy.yml` into `release.yml` as a single workflow triggered on push to `main`; `deploy.yml` is deleted. Previously, `deploy.yml` (`release: published` trigger) never fired because GitHub blocks workflow-to-workflow triggers when the same `GITHUB_TOKEN` creates the release.
- `docker` and `helm-upgrade` jobs now depend on the `release` job via `needs`, run only when the tag is new, and checkout the exact release tag from the `release` job's output.

## [1.1.4] — 2026-06-24

### Fixed

- Deploy workflow now explicitly checks out the release tag (`github.event.release.tag_name`) in both the `docker` and `helm-upgrade` jobs, so builds always use the correct source and Helm chart version
- Tag extraction now reads from `github.event.release.tag_name` instead of `GITHUB_REF_NAME` for reliability
- Image cleanup splits into separate `docker rmi` calls per tag and adds `docker image prune -f` to remove dangling layers

## [1.1.3] — 2026-06-24

### Added

- CI workflow: type-check and Next.js build on every PR and non-main push; required status check blocks merges
- Release workflow: automatically creates a GitHub release (with changelog body) on every merge to `main`
- Deploy workflow: on published release, builds and pushes Docker image to Docker Hub, removes local image, then runs `helm upgrade --install` against the k3s cluster

### Fixed

- Release workflow `permissions.contents: write` — required for `softprops/action-gh-release` to create tags and releases via the GitHub API

## [1.0.0] — 2026-06-17

### Added

- Go Fiber backend: repository CRUD, versioned artifact upload/download, SHA256 checksum verification
- OTA release management: create release from artifact, push to Electro devices via MQTT
- API key authentication (`X-Pocket-Token`), master key from env
- Next.js 15 frontend: repository grid, artifact table with download links, OTA releases dashboard, API key management
- Helm chart for k3s deployment on NodePort 30600
- Registered in tara-app-registry catalog
