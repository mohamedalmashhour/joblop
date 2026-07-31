# GCP Cloud Run Compatibility Review

Status: **BLOCKED — LOCAL, READ-ONLY REVIEW**

Committed implementation reviewed: `69686c527f41cc4b1138a8ddc84c6c9ef60f0d47`

This review uses repository evidence only. It does not authorize Google Cloud access, project
creation, billing, API enablement, infrastructure, credentials, database mutation, external
validation, deployment or spending. The worktree contained pre-existing user-owned changes; this
review did not alter them.

## Executive conclusion

Creating a GCP project is **still premature**. Milestone A added local packaging definitions,
production start commands and safe probes for the API, employer, admin and worker web applications.
Their local production builds and unpackaged start commands pass. Container execution remains
unverified because no Docker/Podman runtime is installed. B1 provides a locally built
distributed-limiter service and API contract, but real Redis/two-replica validation remains
external. B2 provides a synthetic-only candidate-source service and B3 provides a zero-provider
offer-delivery simulator. B4 now provides an in-memory-only QA reset policy service; real database
reset behavior remains blocked.

| Proposed service         | Classification         | Cloud Run conclusion                                                                                                                                    |
| ------------------------ | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API                      | Configuration required | Local build/start/probes and container definition exist; managed dependencies and container execution remain                                            |
| Employer web             | Configuration required | Local build/start/probes and container definition exist; container execution and runtime configuration remain                                           |
| Admin web                | Configuration required | Local build/start/probes and container definition exist; container execution and runtime configuration remain                                           |
| Worker web/Expo entry    | Configuration required | Static export has a minimal server, probes and container definition; container execution remains                                                        |
| Candidate-source adapter | Configuration required | Local synthetic-only service, client compatibility, probes and container definition exist; container execution and immutable staging identifiers remain |
| Offer-delivery adapter   | Configuration required | Local zero-provider simulation, probes and container definition exist; persistent idempotency, IAM and immutable staging identifiers remain             |
| QA reset service         | Configuration required | Local in-memory policy service, allowlists, receipts, probes and container definition exist; real database repository/lock behavior remains blocked     |

## Evidence baseline

- Workspace: pnpm `10.33.2`, Node `>=20.20.2 <21`; CI uses Node `20.20.2`.
- API: Fastify 5, TypeScript build, production start through the pinned `tsx` runtime.
- Employer/admin: Next `15.5.22`.
- Worker: Expo `57.0.8`, React Native Web export.
- Auth limiter: Node HTTP service with an atomic Redis Lua adapter and controlled in-memory tests.
- Candidate source: staging-only Node HTTP service with deterministic Tenant A/B manifests,
  application authentication and replica-local rate limiting.
- Offer delivery: staging-only Node HTTP simulation with deterministic outcomes, local idempotency
  and injected-clock retries; it has no provider dependency.
- Database: Prisma Client `7.9.1`, Prisma PostgreSQL adapter and `pg` `8.16.3`.
- Eight multi-stage Dockerfiles, a root `.dockerignore` and a local build matrix now exist. No Cloud
  Build, Docker Compose or Skaffold definition exists.
- CI installs with a frozen pnpm lockfile and runs repository validation, but does not
  build or publish containers and does not start PostgreSQL.

## 1. Per-service runtime inventory

### API

Classification: **Configuration required**

| Property            | Repository evidence                                                                                                                                                                                                                                                                                                                                      |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build               | `pnpm --filter @rwos/api build` (`tsc -p tsconfig.json`) after workspace dependency preparation and Prisma client generation                                                                                                                                                                                                                             |
| Start               | `pnpm --filter @rwos/api start` (`node --import tsx src/server.ts`)                                                                                                                                                                                                                                                                                      |
| Port                | `PORT`, then `API_PORT`, then default `4100`; Fastify binds `0.0.0.0`                                                                                                                                                                                                                                                                                    |
| Cloud Run port gap  | Resolved locally; runtime-provided `PORT` is preferred                                                                                                                                                                                                                                                                                                   |
| Liveness            | `GET /health`; process-only, non-cacheable                                                                                                                                                                                                                                                                                                               |
| Readiness           | `GET /ready`; checks PostgreSQL and the remote auth limiter                                                                                                                                                                                                                                                                                              |
| Runtime variables   | `NODE_ENV`, `RWOS_ENV`, `API_PORT`, `INTERNAL_API_ORIGIN`, `DATABASE_URL`, `AUTH_RATE_LIMITER_ORIGIN`, `AUTH_RATE_LIMITER_TOKEN`, `AUTH_RATE_LIMITER_KEY_SECRET`; optional paired `CANDIDATE_SOURCE_ORIGIN`/`CANDIDATE_SOURCE_TOKEN` and `OFFER_DELIVERY_ORIGIN`/`OFFER_DELIVERY_TOKEN`; `ASSIGNMENT_HANDOFF_ENABLED` must remain disabled in production |
| Database            | Required when `RWOS_ENV=production`; Prisma opens PostgreSQL connections                                                                                                                                                                                                                                                                                 |
| Redis               | No direct Redis client. Production requires an HTTPS remote rate-limiter service; Redis is an implementation dependency of that missing service, not this API                                                                                                                                                                                            |
| Integrations        | Remote limiter mandatory in production; candidate source and offer delivery optional but needed for their validation gates                                                                                                                                                                                                                               |
| Filesystem          | No application runtime write found; logging writes to stdout/stderr. Build/test utilities use files, not API runtime                                                                                                                                                                                                                                     |
| Background work     | No queue/cron/worker loop. Graceful `SIGTERM`/`SIGINT` shutdown exists with a 10-second deadline                                                                                                                                                                                                                                                         |
| Streaming/WebSocket | None found                                                                                                                                                                                                                                                                                                                                               |
| Proposed size       | 1 vCPU, 512 MiB initially; measure Prisma/Next-independent API memory under validation load                                                                                                                                                                                                                                                              |
| Scale to zero       | Technically safe for request handling; expect cold starts and new database pools. Maximum instances must be bounded against Cloud SQL connections                                                                                                                                                                                                        |

The current API can run as a request-driven Cloud Run service after container/configuration work.
Its production configuration intentionally fails closed without PostgreSQL and the remote limiter.

### Employer web

Classification: **Configuration required**

| Property            | Repository evidence                                                                                        |
| ------------------- | ---------------------------------------------------------------------------------------------------------- |
| Build               | `pnpm --filter @rwos/employer build` (`next build`)                                                        |
| Start               | `pnpm --filter @rwos/employer start` using `next start`                                                    |
| Port                | Runtime `PORT`, default 8080; binds `0.0.0.0`                                                              |
| Liveness/readiness  | `/health` is process-only; `/ready` validates required production configuration without external requests  |
| Runtime variables   | `RWOS_ENV`, `INTERNAL_API_ORIGIN`; `NODE_ENV` influences cookie security through shared session boundaries |
| Database/Redis      | No direct dependency                                                                                       |
| Integrations        | Server middleware and BFF routes call the API over HTTPS                                                   |
| Filesystem          | No runtime writes found; Next build output must be included in the image                                   |
| Background work     | None                                                                                                       |
| Streaming/WebSocket | None found                                                                                                 |
| Proposed size       | 1 vCPU, 512 MiB initially                                                                                  |
| Scale to zero       | Safe for request-driven use, subject to normal Next cold-start latency                                     |

Employer middleware forwards the application session token to the API as a standard bearer token.
It does not obtain or attach a Google-signed Cloud Run identity token.

### Admin web

Classification: **Configuration required**

| Property            | Repository evidence                                                                                                                                      |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build               | `pnpm --filter @rwos/admin build` (`next build`)                                                                                                         |
| Start               | `pnpm --filter @rwos/admin start` using `next start`                                                                                                     |
| Port                | Runtime `PORT`, default 8080; binds `0.0.0.0`                                                                                                            |
| Liveness/readiness  | `/health` is process-only; `/ready` validates required production configuration without external requests                                                |
| Runtime variables   | `RWOS_ENV`, `INTERNAL_API_ORIGIN`, `NODE_ENV`; `ASSIGNMENT_HANDOFF_ENABLED` is referenced by a route and must remain disabled under the release boundary |
| Database/Redis      | No direct dependency                                                                                                                                     |
| Integrations        | Middleware and BFF routes call the API over HTTPS                                                                                                        |
| Filesystem          | No runtime writes found                                                                                                                                  |
| Background work     | None                                                                                                                                                     |
| Streaming/WebSocket | None found                                                                                                                                               |
| Proposed size       | 1 vCPU, 512 MiB initially                                                                                                                                |
| Scale to zero       | Safe for request-driven use, subject to Next cold-start latency                                                                                          |

Admin service-to-API calls use the user’s standard bearer session token, not Cloud Run IAM.

### Worker web / Expo entry

Classification: **Configuration required**

| Property            | Repository evidence                                                                                              |
| ------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Build               | `pnpm --filter @rwos/mobile build`; Expo exports web assets to `apps/mobile/dist`                                |
| Start               | `pnpm --filter @rwos/mobile start` using the minimal Node static server                                          |
| Port/probes         | Runtime `PORT`, default 8080; `/health` is process-only and `/ready` checks local `dist/index.html`              |
| Runtime variables   | Build-time public variables `EXPO_PUBLIC_RWOS_ENV` and `EXPO_PUBLIC_RWOS_API_ORIGIN`                             |
| Database/Redis      | No direct dependency                                                                                             |
| Integrations        | Browser/native fetches API directly; native tokens use Expo Secure Store                                         |
| Filesystem          | Static output only; no server runtime assumption                                                                 |
| Background work     | None; deep-link subscription is client-side                                                                      |
| Streaming/WebSocket | None found                                                                                                       |
| Proposed size       | Static hosting is preferable. If Cloud Run is required, a small static server can use 0.5–1 vCPU and 256–512 MiB |
| Scale to zero       | Safe for static serving, with cold-start latency; CDN/static hosting is simpler                                  |

Production UI correctly selects `ProductionApp`, disables fixture preview and exposes secure
calendar/offer behavior. A non-root multi-stage container now serves the static export. Public
`EXPO_PUBLIC_*` values are compiled into the bundle and must never contain secrets.

### Candidate-source adapter

Classification: **Configuration required**

B2 provides a staging-only Node HTTP service with authenticated tenant-scoped search/evaluate,
process-only `/health`, configuration/manifest `/ready`, a non-root container and deterministic
synthetic Tenant A/B records. It has no database, Redis, writable filesystem or background process.

In-process rate limits require a one-replica maximum until distributed enforcement is approved.
Immutable staging identifiers, IAM and container execution remain external requirements.

### Offer-delivery adapter

Classification: **Configuration required**

B3 adds a staging-only Node HTTP simulator with authenticated `POST
/v1/worker-offers/deliver`, process-only `/health`, configuration/manifest `/ready`, a stable scoped
idempotency key and bounded `sent`/`delivered`/`failed` responses. It contains no destination
resolver, provider integration, callback or background worker. Retries use an injected/request-time
clock and never sleep.

The local in-memory idempotency store and rate limits make one replica the safe maximum. Scale to
zero is process-safe but loses local attempt history. Durable/distributed idempotency,
multi-replica limits, immutable staging identifiers, IAM and container execution remain external
requirements.

### QA reset service

Classification: **Code-level deployment composition required; real database behavior blocked**

B4 adds a staging-only Node HTTP policy service with dry-run, prepare and cleanup endpoints,
manifest/release/authority checks, exact Test Employer Organization A/B scope, operation receipts,
safe audit controls, probes and a non-root container. Browser and native runners perform dry-run and
pass the resulting checksum/receipt while retaining their existing body shapes.

The package now contains a PostgreSQL transaction repository, transaction-scoped advisory locking,
manifest-owned record controls, a fixed 24-entity mutator, Prisma SQL policy enforcement and the
unapplied QA-reset control migration. Local fake-adapter and repository tests cover ownership,
rollback, replay and unknown-commit behavior. A separately authorized disposable PostgreSQL test is
still required before claiming real database behavior.

The packaged entry point deliberately has no implicit memory or credential-bearing fallback. It
starts fail closed because no deployment composition root currently constructs and injects the
PostgreSQL and identity-verifier ports. Consequently, configuration alone cannot make `/ready` or
reset mutations available. That composition root, least-privilege staging identity, migration
application, immutable staging identifiers and external database evidence remain blocked work.

## 2. Service-to-service authentication

| Path                         | Existing mechanism                                 | Cloud Run IAM identity token                                                |
| ---------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------- |
| Employer/admin to API        | User session in `Authorization: Bearer`            | Not implemented                                                             |
| Worker browser/native to API | User session in `Authorization: Bearer`            | Not implemented and generally unsuitable for a public browser/native client |
| API to limiter               | Static bearer token plus HMAC-derived privacy keys | Not implemented                                                             |
| API to candidate source      | Static bearer token                                | Not implemented                                                             |
| API to offer delivery        | Static bearer token                                | Not implemented                                                             |
| E2E runner to QA reset       | Static bearer reset token                          | Not implemented                                                             |

Classification: **Code change required** if any receiving Cloud Run service is configured to require
Google IAM authentication.

The HTTP clients do not call the metadata server or Google auth libraries, do not set an audience
and do not mint Google-signed identity tokens. A static bearer token alone will not satisfy Cloud
Run IAM ingress. Options requiring human security approval are:

1. Keep selected services reachable by HTTPS and enforce the existing application bearer boundary,
   with restrictive ingress/network controls where possible; or
2. Add workload identity-token acquisition and attach both a Google identity token and a separate
   application credential/tenant boundary.

The public worker client must continue using application authentication. Cloud Run IAM credentials
must never be embedded in browser or Expo builds.

## 3. PostgreSQL compatibility

### Repository-supported version

Recommended staging baseline: **PostgreSQL 16**, pending database-owner approval and an actual
migration/concurrency run.

Evidence:

- Prisma datasource is `postgresql`; repository versions are Prisma `7.9.1`,
  `@prisma/adapter-pg` `7.9.0` and `pg` `8.16.3`.
- Migrations use UUID defaults through `gen_random_uuid()`, JSONB, enums, partial/unique indexes,
  triggers/functions and ordinary foreign keys.
- Runtime repositories use transactions, row locks (`FOR UPDATE`), advisory transaction locks and
  serializable retry behavior.
- No third-party PostgreSQL extension is explicitly created by migrations.
- No repository documentation pins another PostgreSQL major.

PostgreSQL 16 is a conservative managed baseline for these features and avoids making the newest
locally installed client the unverified server target. PostgreSQL 17 may also be compatible, but
the repository has no required real-database evidence for either major.

### Currently tested version

**Unknown.** The local command-line tools report PostgreSQL `17.9`, but that proves only the local
client/tool installation. It does not prove a server was running or that migrations and concurrency
tests passed on PostgreSQL 17. CI does not provision PostgreSQL. Database-dependent suites skip
without `RWOS_TEST_DATABASE_URL`.

### Production version

**Unknown.** This review did not access production and does not infer its version.

### Shared-core sufficiency

Classification: **Configuration required / external validation required**

A single-zone shared-core instance is likely sufficient for functional Phase 1 validation with
small synthetic tenants, but it is not yet proven. The expensive repository exercises are:

- migrations against a newly created disposable database;
- two-client worker-offer capacity contention;
- repeated concurrent assignment capacity and schedule-conflict transactions;
- API readiness and normal browser/native E2E;
- backup/PITR rehearsal, which is operationally heavier than normal request traffic.

These tests do not imply large storage, but row locks, serializable retries, Prisma/pg connection
pools and multiple Cloud Run instances can expose CPU and connection limits. Before approval:

- cap API maximum instances;
- define the effective pg pool size per instance;
- reserve administrative connections;
- monitor CPU, memory, active connections, locks and storage;
- run the concurrency suites separately;
- permit a temporary supported size increase if shared-core throttling invalidates evidence.

Twenty-five GiB is ample for the described synthetic dataset, artifacts excluded. This is a
validation estimate, not production capacity evidence.

## 4. Container readiness

The four Milestone A applications have repository-owned container definitions. Definitions passed
static policy tests, but actual image build/start remains unverified because neither Docker nor
Podman is installed locally.

| Service             | Container status                     | Proposed build context | Proposed image name                                                                  |
| ------------------- | ------------------------------------ | ---------------------- | ------------------------------------------------------------------------------------ |
| API                 | Definition added; runtime unverified | Repository root        | `northamerica-northeast2-docker.pkg.dev/<project-id>/rwos-stg-ca-tor-containers/api` |
| Employer            | Definition added; runtime unverified | Repository root        | `.../employer`                                                                       |
| Admin               | Definition added; runtime unverified | Repository root        | `.../admin`                                                                          |
| Worker static entry | Definition added; runtime unverified | Repository root        | `.../worker`                                                                         |
| Candidate source    | Definition added; runtime unverified | Repository root        | `.../candidate-source`                                                               |
| Offer delivery      | Definition added; runtime unverified | Repository root        | `.../offer-delivery`                                                                 |
| QA reset            | Definition added; runtime unverified | Repository root        | `.../qa-reset`                                                                       |

Repository-root context is required for existing workspace packages and the pnpm lockfile. Proposed
containers should use Node 20 Linux images, Corepack/pnpm `10.33.2`, frozen-lockfile installation,
non-root runtime users, multi-stage builds and production-only runtime contents. Prisma generation
must occur in the build stage. Cloud Run is normally `linux/amd64`; multi-architecture images are
optional only if a second runtime requires them.

Image tags can include full release SHA, but tags are mutable. Exact release binding requires:

1. checkout of the exact full SHA;
2. frozen lockfile;
3. recorded builder identity and build inputs;
4. image publication;
5. deployment by immutable `sha256:` digest;
6. evidence linking commit, digest and Cloud Run revision.

## 5. Proposed private CIDRs

Classification: **Human approval and external conflict check required**

Planning-only proposal:

- Cloud Run Direct VPC egress subnet: `10.62.0.0/24`
- Private services access allocation for Cloud SQL: `10.63.0.0/24`
- Reserved future staging expansion: `10.62.16.0/20` is deliberately not part of the initial
  allocation

The two proposed active ranges do not overlap each other. They are not approved or reserved and
cannot be called globally non-overlapping until the infrastructure owner compares them with every
organization, VPN, peering, production and provider network.

## 6. Cloud Build versus existing CI/local build

Recommendation: **extend the existing GitHub CI to build reproducibly, then publish through a
separately authorized workload-identity path**. Do not use developer-local publication as release
evidence. Cloud Build is a suitable alternative if the owner wants GCP-native provenance.

| Concern            | Existing CI build/publish extension                                               | Cloud Build                                                                  |
| ------------------ | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Permissions        | GitHub OIDC/workload identity plus narrow Artifact Registry writer; no stored key | Build submitter, Cloud Build service agent and Artifact Registry permissions |
| Reproducibility    | Strong fit with existing Node/pnpm/frozen-lockfile workflow                       | Strong if source SHA, substitutions and build config are committed           |
| SHA binding        | Native checkout SHA, attestation and digest record                                | Build source/revision metadata and digest record                             |
| Provenance         | Requires configured artifact attestations/SBOM                                    | GCP-native build metadata; provenance settings still require review          |
| Vulnerability scan | Registry/scanner integration must be authorized                                   | Same registry scanning decision; Cloud Build alone is not a security pass    |
| Cost               | Existing CI minutes plus registry/storage                                         | Cloud Build minutes, logs, registry/storage                                  |
| Compatibility      | Highest with current CI; no container steps exist yet                             | Requires new Cloud Build config and GCP API/IAM                              |

Cloud Build is not presently compatible “as configured” because no build file exists. Either option
requires container definitions and human approval of builder identity, scanning, retention and
publication. Local builds are acceptable for developer feedback only, not release provenance.

## 7. Required changes before Cloud Run staging

### Code change required

- Replace the QA reset in-memory boundary with a separately authorized, reviewed database
  repository and lock before any real reset exercise.
- Add Cloud Run IAM identity-token acquisition if IAM-protected service-to-service ingress is
  selected.
- Validate the existing Redis-backed limiter against an authorized disposable Redis target.
- Add durable QA reset control records, transaction enforcement and least-privilege database
  procedures only after database-owner and independent-witness authorization.

### Configuration/build required

- Execute and review all four container builds, probes and graceful stops on an approved local/CI
  container runtime.
- Add adapter liveness/readiness endpoints when those services are implemented.
- Configure exact HTTPS origins and non-secret Secret Manager references.
- Configure Cloud SQL TLS/private connectivity and bounded connection pools.
- Configure immutable image digest/SHA evidence.
- Decide ingress for API and internal services.
- Preserve production mutation-denial and fixture-disable environment settings.
- Define artifact/log retention, scanning and monitoring.

### External information required

- Real GCP project/folder/account and network inventory.
- Cloud SQL supported PostgreSQL/tier choices and immutable cluster ID.
- Production PostgreSQL version and production network identifier, obtained only under separate
  authorization.
- Candidate source and delivery provider behavior/destination design.
- Test identities, Tenant A/B immutable IDs and approved reset manifests.
- Saved pricing-calculator result.

### Human approval required

- Infrastructure/network architecture and CIDRs.
- Billing and calculator estimate.
- Database version, sizing, temporary `CREATEDB`, mutation test and restore rehearsal.
- Security decision on IAM tokens versus application bearer boundaries.
- QA reset implementation and operator.
- Integration owners for candidate/delivery behavior.
- Monitoring owner, secondary on-call and privacy/legal retention decisions.

## 8. Classification matrix

| Finding                                                       | Classification                                         |
| ------------------------------------------------------------- | ------------------------------------------------------ |
| Fastify API process, host binding and health/readiness routes | Compatible now                                         |
| API production dependencies                                   | Configuration required                                 |
| Employer/admin Next builds                                    | Compatible now                                         |
| Employer/admin production servers and probes                  | Compatible now; container runtime validation pending   |
| Worker production fixture gate and API bearer transport       | Compatible now                                         |
| Worker Cloud Run serving                                      | Compatible now; container runtime validation pending   |
| Candidate/delivery outbound HTTP contracts                    | Compatible now                                         |
| Candidate-source deployable service                           | Configuration required; container runtime pending      |
| Offer-delivery deployable service                             | Configuration required; container runtime pending      |
| Distributed limiter HTTP client                               | Compatible now                                         |
| Redis limiter implementation                                  | Compatible locally; real Redis validation required     |
| Google IAM identity tokens                                    | Code change required                                   |
| Standard application bearer tokens                            | Compatible now                                         |
| PostgreSQL 16 migration/runtime hypothesis                    | External validation required                           |
| Production PostgreSQL version                                 | External information required                          |
| Shared-core sizing                                            | External validation and human approval required        |
| QA reset client contract                                      | Compatible now                                         |
| QA reset local policy service                                 | Compatible locally; real database repository blocked   |
| Proposed CIDRs                                                | Human approval and external conflict check required    |
| Container publication and deployment                          | Blocked until definitions, approvals and project exist |

## Final gate decision

External Validation Phase 1 remains **BLOCKED**.

### B2 local compatibility update

The synthetic candidate-source adapter now has a production start command, non-root multi-stage
container definition, `PORT`/`0.0.0.0` binding, process-only `/health`, configuration/manifest-aware
`/ready`, graceful shutdown and OCI release metadata. It needs no database, Redis or writable
filesystem.

Application-level bearer authentication plus explicit service, tenant and operation headers are
implemented. Cloud Run IAM identity-token verification remains B5 work. Rate limiting is
in-process, so the staging service must remain at one replica until approved distributed
enforcement and real multi-replica evidence exist. Container execution remains unverified because
the approved local runtime is unavailable.

Do not create the GCP project yet. First complete and review the deployable-service decisions,
container strategy, IAM authentication choice, limiter implementation, QA reset implementation,
database version/sizing decision, network conflict check and named-owner approvals. Project
creation would otherwise produce paid-capable infrastructure before the release has a complete,
deployable staging service set.
