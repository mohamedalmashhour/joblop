FROM node:20.20.2-bookworm-slim AS builder
WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@10.33.2 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig*.json eslint.config.mjs ./
COPY apps/worker/package.json apps/worker/package.json
COPY packages/auth/package.json packages/auth/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile
COPY apps/worker apps/worker
COPY packages/auth packages/auth
COPY packages/config packages/config
COPY packages/shared packages/shared
ARG RWOS_PUBLIC_DEPLOYMENT_TIER=production
RUN RWOS_ENV=production NEXT_PUBLIC_RWOS_DEPLOYMENT_TIER=$RWOS_PUBLIC_DEPLOYMENT_TIER INTERNAL_API_ORIGIN=https://api.invalid pnpm --filter @rwos/worker build

FROM node:20.20.2-bookworm-slim AS runtime
ARG RWOS_GIT_SHA=unknown
ARG RWOS_BUILD_TIMESTAMP=unknown
ARG RWOS_SOURCE_REPOSITORY=unknown
ARG RWOS_IMAGE_VERSION=unknown
LABEL org.opencontainers.image.title="resident-workforce-os-worker" \
      org.opencontainers.image.revision="$RWOS_GIT_SHA" \
      org.opencontainers.image.created="$RWOS_BUILD_TIMESTAMP" \
      org.opencontainers.image.source="$RWOS_SOURCE_REPOSITORY" \
      org.opencontainers.image.version="$RWOS_IMAGE_VERSION"
ENV NODE_ENV=production PORT=8080 COREPACK_HOME=/opt/corepack
WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@10.33.2 --activate && chmod -R a+rX "$COREPACK_HOME"
COPY --from=builder --chown=node:node /workspace /workspace
USER node
EXPOSE 8080
STOPSIGNAL SIGTERM
CMD ["pnpm", "--filter", "@rwos/worker", "start"]
