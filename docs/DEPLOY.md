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
corepack pnpm --filter @nms/db prisma migrate deploy
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
