# JobLop — one image for the whole monorepo. docker-compose runs it as several containers (api, worker,
# employer, admin) with different commands/ports, plus a separate Postgres and Caddy. This keeps a NAS
# light (build once, run many). Design-for-real; nothing here is wired to production or a launch gate.
FROM node:20-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.33.2 --activate
WORKDIR /app

# Install deps against the lockfile (node_modules is .dockerignored, so this is a clean install).
COPY . .
RUN pnpm install --frozen-lockfile

# Generate the Prisma client and build every workspace (Next apps + API + packages).
RUN pnpm --filter @rwos/database exec prisma generate
RUN pnpm -r --if-present build

ENV NODE_ENV=production
# Default port; each service overrides PORT in docker-compose.
ENV PORT=4000
# No CMD — docker-compose supplies the per-service command.
