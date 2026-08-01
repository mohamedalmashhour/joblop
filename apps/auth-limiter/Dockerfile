FROM node:20.20.2-bookworm-slim AS builder
WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@10.33.2 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig*.json ./
COPY apps/auth-limiter/package.json apps/auth-limiter/package.json
COPY packages/service-auth/package.json packages/service-auth/package.json
RUN pnpm install --frozen-lockfile
COPY apps/auth-limiter apps/auth-limiter
COPY packages/service-auth packages/service-auth
RUN pnpm --filter @rwos/auth-limiter... build

FROM node:20.20.2-bookworm-slim AS runtime
ARG RWOS_GIT_SHA=unknown
ARG RWOS_BUILD_TIMESTAMP=unknown
ARG RWOS_SOURCE_REPOSITORY=unknown
ARG RWOS_IMAGE_VERSION=unknown
LABEL org.opencontainers.image.title="resident-workforce-os-auth-limiter" \
      org.opencontainers.image.revision="$RWOS_GIT_SHA" \
      org.opencontainers.image.created="$RWOS_BUILD_TIMESTAMP" \
      org.opencontainers.image.source="$RWOS_SOURCE_REPOSITORY" \
      org.opencontainers.image.version="$RWOS_IMAGE_VERSION"
ENV NODE_ENV=production PORT=8080 COREPACK_HOME=/opt/corepack RWOS_IMAGE_RELEASE_SHA=$RWOS_GIT_SHA
WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@10.33.2 --activate && chmod -R a+rX "$COREPACK_HOME"
COPY --from=builder --chown=node:node /workspace /workspace
USER node
EXPOSE 8080
STOPSIGNAL SIGTERM
CMD ["pnpm", "--filter", "@rwos/auth-limiter", "start"]
