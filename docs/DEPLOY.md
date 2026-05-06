# Deployment Guide

## Environments

- `main` branch: production
- `dev` branch: staging

Each environment should have isolated:
- PostgreSQL/TimescaleDB database
- Redis instance
- SMTP provider or transactional email adapter

## Required Processes

Deploy these services:
1. API (`apps/api`)
2. Frontend (`apps/web`) static host or Node host
3. Worker (`apps/worker`)
4. Scheduler (`apps/scheduler`)

## Environment Variables

Mandatory:
- `NODE_ENV`
- `APP_URL`
- `COMPANY_EMAIL_DOMAIN`
- `DATABASE_URL`
- `DATABASE_URL_DOCKER` (for container networking, default points to `postgres` service)
- `REDIS_URL`
- `REDIS_URL_DOCKER` (for container networking, default points to `redis` service)
- `ENCRYPTION_KEY`
- `EMAIL_FROM`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_HOST_DOCKER` (default `mailhog`)
- `SMTP_PORT_DOCKER` (default `1025`)
- `SMTP_USER`
- `SMTP_PASS`
- `SYNC_CRON` (default every 5 minutes)

## Deployment Steps

CD deployment is fully automated via GitHub Actions:
1. Build and test in CI.
2. Upload immutable release archive to server.
3. Build Docker images on server (`Dockerfile.app`, `Dockerfile.web`).
4. Start infra containers (`postgres`, `redis`, `mailhog`).
5. Run DB migrations in container (`migrate` service).
6. Start app containers (`api`, `worker`, `scheduler`, `web`).

Compose stack file:
- `docker-compose.deploy.yml`

## Zero-Downtime Notes

- Run migrations in a maintenance window if schema changes are non-backward-compatible.
- Keep worker and API versions aligned with DB schema version.
- Ensure queue retry/backoff settings remain consistent across releases.

## Security Notes

- Keep all secrets in runtime secret manager (never commit secrets).
- Enable HTTPS in staging and production.
- Ensure secure cookies by setting `NODE_ENV=production`.

## Observability

- Collect API/worker/scheduler logs centrally.
- Monitor queue depth and failure rates.
- Alert on repeated auth failures and rate-limit spikes.

## GitHub Actions CD

Workflow:
- `.github/workflows/cd.yml`

Triggers:
- push to `dev` -> deploy to GitHub Environment `staging`
- push to `main` -> deploy to GitHub Environment `production`
- manual `workflow_dispatch` with selectable target environment

### Required GitHub Environment Secrets

Configure these in both `staging` and `production` environments:
- `SSH_HOST` (target server hostname/IP)
- `SSH_PORT` (usually `22`, optional if default)
- `SSH_USER` (deploy user)
- `SSH_PRIVATE_KEY` (private key for `SSH_USER`)
- `SSH_KNOWN_HOSTS` (optional but recommended; if omitted, workflow uses `ssh-keyscan`)
- `DEPLOY_PATH` (e.g. `/opt/nms-system`)
- `DEPLOY_ENV_FILE_CONTENT` (full `.env` file content, multi-line secret)
- `COMPOSE_PROJECT_NAME` (optional, default `nms`)
- `HEALTHCHECK_URL` (optional, e.g. `https://nms.example.com/api/health`)
- `RELEASES_TO_KEEP` (optional, default `5`)
- `AUTO_RESET_DB_ON_P3009` (optional, default auto `true` for staging/dev, `false` for production; destructive reset of `public` schema only for failed initial migration recovery)

### Server Prerequisites

On target server:
- Docker Engine installed
- Docker Compose plugin installed (`docker compose`)
- deploy user allowed to run Docker commands (docker group) or passwordless `sudo docker`

Release layout created by CD:
- `${DEPLOY_PATH}/releases/<release_id>` - immutable release directory
- `${DEPLOY_PATH}/current` - symlink to active release

Remote deployment logic is implemented in:
- `scripts/deploy/remote-release.sh`
