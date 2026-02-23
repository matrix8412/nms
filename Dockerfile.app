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

COPY --from=build /app /app

CMD ["corepack", "pnpm", "--filter", "@nms/api", "start"]
