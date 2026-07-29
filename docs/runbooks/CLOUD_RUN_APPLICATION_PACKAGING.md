# Cloud Run Application Packaging

Status: **LOCAL PACKAGING ONLY — EXTERNAL VALIDATION BLOCKED**

This runbook covers the existing API, employer web, admin web and worker Expo web export plus the
local B1 authentication limiter, B2 synthetic candidate-source adapter and B3 synthetic
offer-delivery adapter and B4 in-memory QA reset policy service. It does not authorize Google Cloud
access, infrastructure, credentials, external validation, deployment or spending.

## Build matrix

`container-build-matrix.json` is the local source of truth. Every image uses the repository root as
its build context so pnpm workspace packages and the frozen lockfile resolve consistently.

| Image            | Dockerfile                         | Start command                                |                 Port | Liveness  | Readiness                                          |
| ---------------- | ---------------------------------- | -------------------------------------------- | -------------------: | --------- | -------------------------------------------------- |
| API              | `apps/api/Dockerfile`              | `pnpm --filter @rwos/api start`              | `PORT`, default 8080 | `/health` | `/ready` checks configured database and limiter    |
| Employer         | `apps/employer/Dockerfile`         | `pnpm --filter @rwos/employer start`         | `PORT`, default 8080 | `/health` | `/ready` checks required configuration only        |
| Admin            | `apps/admin/Dockerfile`            | `pnpm --filter @rwos/admin start`            | `PORT`, default 8080 | `/health` | `/ready` checks required configuration only        |
| Worker web       | `apps/mobile/Dockerfile`           | `pnpm --filter @rwos/mobile start`           | `PORT`, default 8080 | `/health` | `/ready` checks the exported entry file            |
| Auth limiter     | `apps/auth-limiter/Dockerfile`     | `pnpm --filter @rwos/auth-limiter start`     | `PORT`, default 8080 | `/health` | `/ready` performs a bounded atomic Redis probe     |
| Candidate source | `apps/candidate-source/Dockerfile` | `pnpm --filter @rwos/candidate-source start` | `PORT`, default 8080 | `/health` | `/ready` validates release, tenants and manifest   |
| Offer delivery   | `apps/offer-delivery/Dockerfile`   | `pnpm --filter @rwos/offer-delivery start`   | `PORT`, default 8080 | `/health` | `/ready` validates release, tenants and manifest   |
| QA reset         | `apps/qa-reset/Dockerfile`         | `pnpm --filter @rwos/qa-reset start`         | `PORT`, default 8080 | `/health` | `/ready` validates authority, release and manifest |

Employer/admin readiness intentionally does not call the API. API availability must be monitored
separately; making web readiness transitively call it would unnecessarily remove otherwise healthy
web instances. Worker readiness performs a local, non-destructive file check.

## Runtime configuration names

Values must come from an authorized runtime/secret manager. Do not store values in images or files.

### API

- `PORT`
- `NODE_ENV`
- `RWOS_ENV`
- `INTERNAL_API_ORIGIN`
- `DATABASE_URL`
- `AUTH_RATE_LIMITER_ORIGIN`
- `AUTH_RATE_LIMITER_TOKEN`
- `AUTH_RATE_LIMITER_KEY_SECRET`
- `ASSIGNMENT_HANDOFF_ENABLED`
- Optional paired `CANDIDATE_SOURCE_ORIGIN` and `CANDIDATE_SOURCE_TOKEN`
- Optional paired `OFFER_DELIVERY_ORIGIN` and `OFFER_DELIVERY_TOKEN`

`SESSION_SECRET` is not listed as required because current runtime code does not consume it.

### Employer and admin

- `PORT`
- `NODE_ENV`
- `RWOS_ENV`
- `INTERNAL_API_ORIGIN`
- Admin boundary: `ASSIGNMENT_HANDOFF_ENABLED=disabled`

### Worker web

Build-time public configuration:

- `EXPO_PUBLIC_RWOS_ENV`
- `EXPO_PUBLIC_RWOS_API_ORIGIN`

Runtime:

- `PORT`
- `NODE_ENV`

Public Expo variables are embedded in static assets and must never contain credentials or secrets.
A worker image must be rebuilt when its public API origin changes.

### Authentication limiter

- `PORT`
- `RWOS_ENV`
- `AUTH_LIMITER_REDIS_URL`
- `AUTH_LIMITER_SERVICE_TOKEN`
- `AUTH_LIMITER_RELEASE_SHA`
- `AUTH_LIMITER_AUTH_MODE`
- `AUTH_LIMITER_AUDIENCE`
- `AUTH_LIMITER_API_SERVICE_ACCOUNT`
- `AUTH_LIMITER_NAMESPACE`
- `AUTH_LIMITER_CURRENT_KEY_ID`
- Optional paired `AUTH_LIMITER_PREVIOUS_KEY_ID` and
  `AUTH_LIMITER_PREVIOUS_KEY_ACCEPT_UNTIL`
- Staging reset only: `AUTH_LIMITER_RESET_ENABLED`, `AUTH_LIMITER_RESET_TOKEN`,
  `AUTH_LIMITER_PROJECT_ID`, `AUTH_LIMITER_CLUSTER_ID`

### Synthetic candidate source

- `PORT`
- `RWOS_ENV`
- `CANDIDATE_ADAPTER_RELEASE_SHA`
- `CANDIDATE_ADAPTER_SERVICE_TOKEN`
- Tenant A/B organization, work-group and role-definition ID variables
- `CANDIDATE_ADAPTER_ALLOWED_TIMEZONES`
- `CANDIDATE_ADAPTER_TENANT_LIMIT_PER_MINUTE`
- `CANDIDATE_ADAPTER_SERVICE_LIMIT_PER_MINUTE`

### Synthetic offer delivery

- `PORT`
- `RWOS_ENV`
- `OFFER_DELIVERY_ADAPTER_RELEASE_SHA`
- `OFFER_DELIVERY_ADAPTER_SERVICE_TOKEN`
- Tenant A/B organization ID variables
- `OFFER_DELIVERY_ADAPTER_TENANT_LIMIT_PER_MINUTE`
- `OFFER_DELIVERY_ADAPTER_SERVICE_LIMIT_PER_MINUTE`

### In-memory QA reset policy service

- `PORT`, `RWOS_ENV`, browser/native QA-reset service tokens
- Distinct browser/native service and operator identity variables
- Release, project, cluster, database and authority variables
- Tenant A/B, namespace, manifest ID/checksum and manifest time variables
- Dry-run, prepare and cleanup approval-reference variables
- `QA_RESET_MAXIMUM_RECORDS_PER_ENTITY`

## Initial Cloud Run sizing

| Service          |      CPU |  Memory | Concurrency |     Timeout | Min/max | Scale to zero                                                  |
| ---------------- | -------: | ------: | ----------: | ----------: | ------- | -------------------------------------------------------------- |
| API              |   1 vCPU | 512 MiB |          20 |  60 seconds | 0/4     | Safe for request processing; bound database pools              |
| Employer         |   1 vCPU | 512 MiB |          40 |  60 seconds | 0/2     | Safe; cold-start latency expected                              |
| Admin            |   1 vCPU | 512 MiB |          40 |  60 seconds | 0/2     | Safe; cold-start latency expected                              |
| Worker web       | 0.5 vCPU | 256 MiB |          80 |  30 seconds | 0/2     | Safe; static hosting remains a simpler alternative             |
| Auth limiter     | 0.5 vCPU | 256 MiB |          80 |   5 seconds | 0/2     | Safe only with shared Redis; readiness fails closed            |
| Candidate source |   1 vCPU | 256 MiB |          40 |  10 seconds | 0/1     | Safe; one replica only until distributed limiting is validated |
| Offer delivery   |   1 vCPU | 256 MiB |          40 |  10 seconds | 0/1     | Safe only as local simulation; persistent idempotency required |
| QA reset         |   1 vCPU | 512 MiB |           1 | 120 seconds | 0/1     | Local policy only; no real database authorization              |

These are staging starting points, not production capacity claims.

## Immutable image metadata

All Dockerfiles accept:

- `RWOS_GIT_SHA`
- `RWOS_BUILD_TIMESTAMP`
- `RWOS_SOURCE_REPOSITORY`
- `RWOS_IMAGE_VERSION`

They populate OCI revision, creation, source and version labels. Builds must supply the exact
40-character release SHA and deploy by digest; a tag alone is mutable.

## Local validation

Static packaging and application tests:

```sh
pnpm validate:containers:static
```

Runtime validation requires a local Docker daemon and may require access to the configured
container/package registries if layers are not cached:

```sh
RWOS_CONTAINER_GIT_SHA='<exact-40-character-sha>' \
RWOS_CONTAINER_BUILD_TIMESTAMP='<RFC3339-UTC-time>' \
RWOS_CONTAINER_SOURCE_REPOSITORY='<repository-reference>' \
RWOS_CONTAINER_IMAGE_VERSION='<immutable-version-label>' \
pnpm validate:containers:runtime
```

The runtime validator builds all eight images, publishes nothing, exposes containers only on
loopback, probes liveness/readiness, stops them with `SIGTERM` and removes only its own named
containers. The API is started without a database/limiter and the limiter without Redis; both must
report liveness `200` and readiness `503`. This proves fail-closed packaging without contacting a
real dependency.

If Docker is unavailable, the script exits with `CONTAINER_RUNTIME_UNAVAILABLE`; static validation
does not substitute for image execution.
