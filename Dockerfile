FROM oven/bun:1.3.2-alpine AS base
WORKDIR /app

RUN addgroup -S app && adduser -S app -G app -u 1001

FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

FROM base AS builder
ENV NODE_ENV=development
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .

FROM base AS runner
ENV NODE_ENV=production
USER app

COPY --from=deps --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app .

EXPOSE 3000

CMD ["bun", "start"]

