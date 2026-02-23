# Deployment Guide

## Environments

- `main` branch: production
- `dev` branch: staging

Each environment should have isolated:
- PostgreSQL/TimescaleDB database
- Redis instance
- SMTP provider or transactional email adapter
- Zabbix credentials

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
- `REDIS_URL`
- `ENCRYPTION_KEY`
- `EMAIL_FROM`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `ZABBIX_URL`
- `ZABBIX_USER`
- `ZABBIX_PASS`
- `SYNC_CRON` (default every 30 minutes)

## Deployment Steps

1. Install dependencies:
```bash
corepack pnpm install --frozen-lockfile
```

2. Build:
```bash
corepack pnpm build
```

3. Run DB migrations (before API startup):
```bash
corepack pnpm db:migrate
```

4. Start services in order:
1. API
2. Worker
3. Scheduler
4. Frontend

## Zero-Downtime Notes

- Run migrations in a maintenance window if schema changes are non-backward-compatible.
- Keep worker and API versions aligned with DB schema version.
- Ensure queue retry/backoff settings remain consistent across releases.

## Security Notes

- Keep all secrets in runtime secret manager (never commit secrets).
- Rotate SMTP and Zabbix credentials periodically.
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
- `DEPLOY_ENV_FILE_PATH` (absolute path to server `.env`, e.g. `/opt/nms-system/shared/.env`)
- `SERVICE_API` (systemd service, e.g. `nms-api.service`)
- `SERVICE_WORKER` (systemd service, e.g. `nms-worker.service`)
- `SERVICE_SCHEDULER` (systemd service, e.g. `nms-scheduler.service`)
- `SERVICE_WEB` (optional, e.g. `nginx.service` if web is served by Nginx)
- `HEALTHCHECK_URL` (optional, e.g. `https://nms.example.com/api/health`)
- `RELEASES_TO_KEEP` (optional, default `5`)

### Server Prerequisites

On target server:
- Node.js 22+ installed
- Corepack available and enabled
- `pnpm` available through Corepack
- `sudo systemctl restart ...` allowed for deploy user (prefer NOPASSWD for listed services only)
- existing environment file at `DEPLOY_ENV_FILE_PATH`

Release layout created by CD:
- `${DEPLOY_PATH}/releases/<release_id>` - immutable release directory
- `${DEPLOY_PATH}/current` - symlink to active release

Remote deployment logic is implemented in:
- `scripts/deploy/remote-release.sh`
