FROM node:22-bookworm-slim AS base

WORKDIR /app

ENV PNPM_HOME="/pnpm"
ENV PATH="${PNPM_HOME}:${PATH}"
ENV NEXT_TELEMETRY_DISABLED=1

RUN corepack enable

FROM base AS build

ARG DATABASE_URL=postgresql://nms:nms@localhost:5432/nms?schema=public
ENV DATABASE_URL="${DATABASE_URL}"

COPY . .

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @nms/shared build
RUN pnpm db:generate
RUN pnpm --filter @nms/db build
RUN pnpm --filter @nms/api build
RUN pnpm --filter @nms/worker build
RUN pnpm --filter @nms/scheduler build

FROM base AS runtime

ENV NODE_ENV=production

# Install iputils-ping for ICMP monitoring (worker needs the `ping` command)
RUN apt-get update && apt-get install -y --no-install-recommends iputils-ping \
    && rm -rf /var/lib/apt/lists/*

# Copy workspace structure (package.json files, lockfile, configs)
COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/turbo.json /app/tsconfig.base.json /app/
COPY --from=build /app/.npmrc* /app/

# Copy built packages
COPY --from=build /app/packages /app/packages

# Copy built apps
COPY --from=build /app/apps/api /app/apps/api
COPY --from=build /app/apps/worker /app/apps/worker
COPY --from=build /app/apps/scheduler /app/apps/scheduler

# Copy node_modules (workspace root + all packages)
COPY --from=build /app/node_modules /app/node_modules

# Copy scripts (needed for db:migrate)
COPY --from=build /app/scripts /app/scripts

EXPOSE 3000

CMD ["corepack", "pnpm", "--filter", "@nms/api", "start"]
