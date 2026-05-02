# NMS System Monorepo

Production-oriented Network Management System for inventory, management, and monitoring of network devices.

## Stack

- Monorepo: `pnpm` + Turborepo
- Backend API: Next.js App Router + TypeScript + Prisma + PostgreSQL/TimescaleDB
- Frontend: Angular standalone + Angular Material
- Auth: custom DB-backed sessions + CSRF + Redis rate limiting + audit logging
- Jobs: BullMQ + Redis (`device-sync`, `device-commands`) with separate worker/scheduler apps
- Integrations: Zabbix API wrapper + configurable item mapping

## Repository Layout

- `apps/api` Next.js REST API
- `apps/web` Angular frontend
- `apps/worker` BullMQ worker process
- `apps/scheduler` cron enqueue process (default every 30 min)
- `packages/shared` shared DTO/types/zod schemas/queue constants
- `packages/db` Prisma schema + migrations + DB client
- `packages/eslint-config` shared lint config package

## Prerequisites

- Node.js 24+
- Docker + Docker Compose
- Corepack enabled (`corepack enable`)

## Quick Start

1. Copy environment file.
```bash
cp .env.example .env
```

2. Start infrastructure.
```bash
docker compose up --build -d
```

3. Install dependencies.
```bash
corepack pnpm install
```

4. Generate Prisma client and run migration.
```bash
corepack pnpm db:generate
corepack pnpm db:migrate
```

5. Start all apps in dev mode.
```bash
corepack pnpm dev
```

Services:
- API: `http://localhost:3000`
- Frontend: `http://localhost:4200`
- Mailhog UI: `http://localhost:8025`

## Running Specific Apps

```bash
corepack pnpm --filter @nms/api dev
corepack pnpm --filter @nms/web dev
corepack pnpm --filter @nms/worker dev
corepack pnpm --filter @nms/scheduler dev
```

## Migrations

- Prisma schema: `packages/db/prisma/schema.prisma`
- Initial migration: `packages/db/prisma/migrations/202602190001_init/migration.sql`

Commands:
```bash
corepack pnpm --filter @nms/db run prisma:migrate
corepack pnpm db:migrate
```

## Tests

Run all:
```bash
corepack pnpm test
```

Run by app:
```bash
corepack pnpm --filter @nms/api test
corepack pnpm --filter @nms/web test
corepack pnpm --filter @nms/web test:e2e
```

## Branching and Commits

- Branches: `main` (production), `dev` (staging), `feature/*`, `fix/*`
- Conventional commits: `feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`

See:
- `docs/SETUP.md`
- `docs/DEPLOY.md`
