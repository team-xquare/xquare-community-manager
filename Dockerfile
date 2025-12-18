FROM oven/bun:1.3.2-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -S app && adduser -S app -G app -u 1001

FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

FROM base AS production
COPY --from=deps --chown=app:app /app/node_modules ./node_modules
COPY --chown=app:app . .

USER app
CMD ["bun", "start"]
