# Local Setup

## 1. Prerequisites

- Node.js 22+
- Docker Desktop / Docker Engine with Compose plugin
- Corepack enabled

```bash
corepack enable
```

## 2. Environment

Create `.env` from the template:

```bash
cp .env.example .env
```

Required values:
- `DATABASE_URL`
- `REDIS_URL`
- `ENCRYPTION_KEY`
- SMTP values (`SMTP_HOST`, `SMTP_PORT`, `EMAIL_FROM`)
- Zabbix values (`ZABBIX_URL`, `ZABBIX_USER`, `ZABBIX_PASS`)

## 3. Start Local Infrastructure

```bash
docker compose up -d
docker compose ps
```

Services:
- Postgres/TimescaleDB `localhost:5432`
- Redis `localhost:6379`
- Mailhog SMTP `localhost:1025`, UI `localhost:8025`

## 4. Install Dependencies

```bash
corepack pnpm install
```

## 5. Database Setup

```bash
corepack pnpm --filter @nms/db prisma generate
corepack pnpm --filter @nms/db prisma migrate deploy
```

## 6. Run Applications

All apps:
```bash
corepack pnpm dev
```

Or each process:
```bash
corepack pnpm --filter @nms/api dev
corepack pnpm --filter @nms/web dev
corepack pnpm --filter @nms/worker dev
corepack pnpm --filter @nms/scheduler dev
```

## 7. Verification Checklist

- API health: `GET http://localhost:3000/api/health`
- Frontend loads at `http://localhost:4200`
- Mailhog receives verification/reset emails
- Redis queue receives jobs from `POST /api/zabbix/sync`

## 8. Common Commands

Lint:
```bash
corepack pnpm lint
```

Test:
```bash
corepack pnpm test
```

Build:
```bash
corepack pnpm build
```
