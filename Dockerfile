# syntax=docker/dockerfile:1.7
FROM oven/bun:1.3.2-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -S app && adduser -S app -G app -u 1001

FROM base AS deps
COPY package.json bun.lock ./
RUN --mount=type=cache,target=/root/.bun \
    bun install --frozen-lockfile --production

FROM base AS production
COPY --from=deps --chown=app:app /app/node_modules ./node_modules
COPY --chown=app:app package.json bun.lock ./
COPY --chown=app:app core ./core
COPY --chown=app:app commands ./commands
COPY --chown=app:app events ./events
COPY --chown=app:app scripts ./scripts
COPY --chown=app:app index.js ./

USER app
CMD ["bun", "start"]
