FROM node:20.20.2-bookworm-slim AS builder
WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@10.33.2 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig*.json ./
COPY apps/mobile/package.json apps/mobile/package.json
COPY packages/design-system/package.json packages/design-system/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/validation/package.json packages/validation/package.json
RUN pnpm install --frozen-lockfile
COPY apps/mobile apps/mobile
COPY packages/design-system packages/design-system
COPY packages/shared packages/shared
COPY packages/ui packages/ui
COPY packages/validation packages/validation
ARG EXPO_PUBLIC_RWOS_API_ORIGIN=https://api.invalid
ARG RWOS_PUBLIC_DEPLOYMENT_TIER=production
RUN EXPO_PUBLIC_RWOS_ENV=production EXPO_PUBLIC_RWOS_DEPLOYMENT_TIER=$RWOS_PUBLIC_DEPLOYMENT_TIER EXPO_PUBLIC_RWOS_API_ORIGIN=$EXPO_PUBLIC_RWOS_API_ORIGIN pnpm --filter @rwos/mobile build

FROM node:20.20.2-bookworm-slim AS runtime
ARG RWOS_GIT_SHA=unknown
ARG RWOS_BUILD_TIMESTAMP=unknown
ARG RWOS_SOURCE_REPOSITORY=unknown
ARG RWOS_IMAGE_VERSION=unknown
LABEL org.opencontainers.image.title="resident-workforce-os-worker-web" \
      org.opencontainers.image.revision="$RWOS_GIT_SHA" \
      org.opencontainers.image.created="$RWOS_BUILD_TIMESTAMP" \
      org.opencontainers.image.source="$RWOS_SOURCE_REPOSITORY" \
      org.opencontainers.image.version="$RWOS_IMAGE_VERSION"
ENV NODE_ENV=production PORT=8080
WORKDIR /app
COPY --from=builder --chown=node:node /workspace/apps/mobile/dist ./dist
COPY --from=builder --chown=node:node /workspace/apps/mobile/server.mjs ./server.mjs
USER node
EXPOSE 8080
STOPSIGNAL SIGTERM
CMD ["node", "server.mjs"]
