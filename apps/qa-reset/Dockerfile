FROM node:20.20.2-bookworm-slim AS builder
WORKDIR /workspace
RUN apt-get update \
    && apt-get install --yes --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.33.2 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig*.json ./
COPY apps/qa-reset/package.json apps/qa-reset/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/service-auth/package.json packages/service-auth/package.json
RUN pnpm install --frozen-lockfile
COPY apps/qa-reset apps/qa-reset
COPY packages/config packages/config
COPY packages/database packages/database
COPY packages/service-auth packages/service-auth
RUN pnpm --filter @rwos/database prisma:generate && pnpm --filter @rwos/qa-reset... build

FROM node:20.20.2-bookworm-slim AS runtime
ARG RWOS_GIT_SHA=a31fa96f52247bb684032c6a8d3d379c098c2603
ARG RWOS_BUILD_TIMESTAMP=unknown
ARG RWOS_SOURCE_REPOSITORY=unknown
ARG RWOS_IMAGE_VERSION=unknown
LABEL org.opencontainers.image.title="resident-workforce-os-qa-reset" \
      org.opencontainers.image.revision="$RWOS_GIT_SHA" \
      org.opencontainers.image.created="$RWOS_BUILD_TIMESTAMP" \
      org.opencontainers.image.source="$RWOS_SOURCE_REPOSITORY" \
      org.opencontainers.image.version="$RWOS_IMAGE_VERSION"
ENV NODE_ENV=production PORT=8080 COREPACK_HOME=/opt/corepack
WORKDIR /workspace
RUN apt-get update \
    && apt-get install --yes --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.33.2 --activate && chmod -R a+rX "$COREPACK_HOME"
COPY --from=builder --chown=node:node /workspace /workspace
USER node
EXPOSE 8080
STOPSIGNAL SIGTERM
CMD ["pnpm", "--filter", "@rwos/qa-reset", "start"]
