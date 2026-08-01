FROM node:20.20.2-bookworm-slim AS builder
WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@10.33.2 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig*.json ./
COPY apps/offer-delivery/package.json apps/offer-delivery/package.json
COPY packages/service-auth/package.json packages/service-auth/package.json
RUN pnpm install --frozen-lockfile
COPY apps/offer-delivery apps/offer-delivery
COPY packages/service-auth packages/service-auth
RUN pnpm --filter @rwos/offer-delivery... build

FROM node:20.20.2-bookworm-slim AS runtime
ARG RWOS_GIT_SHA=a31fa96f52247bb684032c6a8d3d379c098c2603
ARG RWOS_BUILD_TIMESTAMP=unknown
ARG RWOS_SOURCE_REPOSITORY=unknown
ARG RWOS_IMAGE_VERSION=unknown
LABEL org.opencontainers.image.title="resident-workforce-os-offer-delivery" \
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
CMD ["pnpm", "--filter", "@rwos/offer-delivery", "start"]
