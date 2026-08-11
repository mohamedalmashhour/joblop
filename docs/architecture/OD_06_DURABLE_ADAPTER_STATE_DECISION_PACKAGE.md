# OD-06 Durable Adapter State Decision Package

Status: **APPROVED FOR LOCAL IMPLEMENTATION — EXTERNAL APPLICATION AND VALIDATION BLOCKED**

Committed implementation checkpoint: `69686c527f41cc4b1138a8ddc84c6c9ef60f0d47`

The Release and Product Owner authorized local implementation at this checkpoint. Code, schema,
non-applied migrations, fake/local providers and tests are permitted. External PostgreSQL, Redis,
providers, GCP, deployment and B5.7 remain blocked pending external-stage approvals.

## Decision scope

OD-06 governs two separate consistency needs:

1. Durable offer-delivery simulation idempotency and attempt history.
2. Distributed fixed-window rate limiting for candidate-source and offer-delivery adapters.

The current offer-delivery adapter stores tenant-scoped idempotency records in process memory. The
current candidate and delivery limiters also use process-local maps. Those implementations are
safe only at one replica and lose state on restart. The existing authentication limiter already
demonstrates the repository's intended Redis pattern: one atomic server-side script, fixed TTL,
fail-closed readiness and no memory fallback in an external environment.

No real communication provider is in scope. Durable state records only deterministic synthetic
delivery outcomes.

## Backend options

### Option A — Redis for idempotency and rate limiting

| Area                  | Assessment                                                                                        |
| --------------------- | ------------------------------------------------------------------------------------------------- |
| Atomicity             | Lua can atomically claim an idempotency key, compare a request digest and increment rate buckets  |
| Multi-replica support | Strong while every replica uses the same exact Redis namespace                                    |
| Durability            | Depends on Redis persistence, eviction, failover and provider configuration                       |
| Unknown outcomes      | A connection loss after script execution requires a read-back; missing/evicted state is ambiguous |
| Retention             | Native TTL is simple, but a 30-day idempotency record competes with cache capacity                |
| Auditability          | Weaker than relational lifecycle history                                                          |
| Cleanup               | TTL plus exact staging namespace cleanup                                                          |
| Operational cost      | One backend and one connection model                                                              |

This is the smallest topology but does not provide sufficiently reviewable durable lifecycle state
unless Redis persistence, no-eviction policy, backup and recovery behavior are explicitly
approved. Those properties are not established by the repository.

### Option B — PostgreSQL for idempotency and rate limiting

| Area                  | Assessment                                                                   |
| --------------------- | ---------------------------------------------------------------------------- |
| Atomicity             | Unique constraints, row locks and transactions provide strong idempotency    |
| Multi-replica support | Strong through one shared database                                           |
| Durability            | Strong and auditable                                                         |
| Unknown outcomes      | Scoped read-back by idempotency key can reconcile commit ambiguity           |
| Rate limiting         | Possible, but creates hot rows/time buckets and avoidable transactional load |
| Retention             | Exact terminal-state and hold-aware deletion                                 |
| Cleanup               | Bounded relational cleanup with affected-row verification                    |
| Operational cost      | One backend, but adapter traffic competes with relational workloads          |

PostgreSQL is appropriate for durable idempotency, but using it for short-lived counters is not
aligned with the existing atomic Redis limiter architecture.

### Option C — PostgreSQL idempotency plus Redis rate limiting

| Area                  | Assessment                                                                                          |
| --------------------- | --------------------------------------------------------------------------------------------------- |
| Atomicity             | PostgreSQL transaction/unique constraint for delivery; Redis Lua for both counters                  |
| Multi-replica support | Strong when all replicas share the exact approved database and Redis namespaces                     |
| Durability            | Relational delivery history survives restart; rate counters intentionally expire                    |
| Unknown outcomes      | Delivery is reconciled from PostgreSQL; limiter failure is a generic fail-closed denial             |
| Retention             | Long-lived records use reviewed relational retention; counters retain only the 60-second window     |
| Auditability          | Strong delivery lifecycle evidence and bounded aggregate limiter evidence                           |
| Cleanup               | Exact database deletion procedure plus Redis TTL/scoped staging reset                               |
| Operational cost      | Two dependencies and two readiness checks, but each backend performs its appropriate responsibility |

### Option D — Dedicated adapter-state service

A separate internal service could own PostgreSQL idempotency and Redis limiting for both adapters.
It would centralize policy but add another Cloud Run service, identity, audience, IAM grant,
availability dependency and deployment artifact. No such service contract exists in the current
repository, so this is not the smallest compatible Phase 1 design.

## Recommendation

Use **Option C: PostgreSQL for durable offer-delivery idempotency and Redis for distributed
candidate/delivery rate limiting**.

Repository reasons:

- offer-delivery needs a durable request digest, response, attempts, retry eligibility and unknown
  outcome reconciliation;
- candidate search is read-only and needs no durable request record;
- both adapters need short-lived multi-replica counters;
- the repository already contains relational persistence patterns and an atomic Redis limiter
  pattern;
- separating durable records from expiring counters avoids treating cache retention as durable
  evidence;
- a new adapter-state service would expand B5.7 identities and infrastructure unnecessarily.

This recommendation selects backend roles, not providers or resources. PostgreSQL and Redis
targets remain external decisions.

## Ownership model

| Concern                             | Required owner                                            |
| ----------------------------------- | --------------------------------------------------------- |
| Delivery idempotency semantics      | Offer-delivery Integration Owner                          |
| Candidate/delivery threshold policy | Candidate and Offer-delivery Integration Owners           |
| PostgreSQL schema and migration     | Database Owner plus independent Database Reviewer/Witness |
| Redis topology, persistence and SLO | Infrastructure Owner                                      |
| Key derivation, authentication      | Security Owner                                            |
| Retention, deletion and legal hold  | Privacy/Retention Owner                                   |
| Evidence and release binding        | Release Owner                                             |
| Outage/readiness operational policy | Monitoring/Operations Owner and named secondary on-call   |

No adapter process owns policy merely because it executes it. Production and staging namespaces,
secrets and resources remain Infrastructure/Security-controlled.

## Idempotency-key scope

The external key remains the existing exact format:

```text
worker-offer:<worker-offer-uuid>:terms:<terms-version-uuid>
```

The durable uniqueness scope is:

```text
environment
| adapter contract version
| approved release SHA
| synthetic manifest checksum
| tenant organization UUID
| logical caller alias
| operation
| idempotency key
```

The record also stores a SHA-256 request digest over the exact normalized fields:

```text
operation
| organizationId
| workerOfferId
| workerIdentityId
```

Rules:

- same scope and same request digest returns the stored response;
- same scope and different request digest returns generic `409`;
- tenant, manifest, release, operation or logical caller changes cannot access or collide with
  another record;
- caller scope uses the stable logical alias `api`, not a rotating raw service-account address;
- raw credentials, headers and identity tokens are never stored;
- raw idempotency keys may be stored only if the Database/Security Owners approve that operational
  need; otherwise store a keyed digest plus separately indexed offer/terms UUIDs.

## Proposed durable records

No schema is applied here. A later reviewed migration would likely introduce:

### `SyntheticDeliveryIdempotency`

- UUID primary key;
- environment and adapter contract version;
- exact release SHA and manifest checksum;
- tenant organization UUID;
- logical caller alias;
- operation;
- idempotency-key digest;
- normalized request digest;
- worker offer, terms-version and Worker Identity UUIDs;
- current synthetic status, provider-reference hash or null, retryable flag;
- attempt count and next-attempt time;
- lifecycle status: `claimed`, `completed`, `retry_pending`, `failed_terminal`, `unknown`,
  `blocked`, `expired`;
- first/last request timestamps, terminal timestamp and retention deadline;
- bounded failure category, never raw exception detail;
- optimistic version.

Required uniqueness:

```text
(environment, contractVersion, releaseSha, manifestChecksum,
 tenantId, callerAlias, operation, idempotencyKeyDigest)
```

### `SyntheticDeliveryAttempt`

- UUID primary key;
- restrict-delete FK to idempotency record;
- attempt number unique within the record;
- eligibility and execution timestamps;
- deterministic simulation scenario;
- response status, retryable flag and provider-reference hash;
- safe result category and created timestamp.

No recipient destination, email, phone, device token, message, payload, credential or raw identity
is permitted.

## Concurrency behavior

### Offer delivery

1. Validate dual authentication, exact audience/caller/operation/tenant/release and manifest.
2. Consume the distributed rate limit.
3. Begin a database transaction.
4. Atomically insert or select the idempotency row under its unique scope.
5. Lock the row before attempt evaluation.
6. Reject request-digest conflict.
7. If terminal, return the existing response without another attempt.
8. If retry is not yet eligible, return the existing response.
9. If eligible, append exactly one attempt, update response/lifecycle and commit.
10. Return only after durable state is committed.

Concurrent same-key requests produce one claimed/updated record and one eligible attempt.
Concurrent different tenants cannot share a unique scope or row lock.

All authenticated requests, including duplicate replays, are proposed to consume rate-limit
capacity to prevent replay-based load bypass. Integration and Security Owners must approve this
choice.

### Adapter rate limiting

One Redis Lua operation consumes both:

- tenant bucket: default 30 requests per 60 seconds;
- authenticated logical service bucket: default 60 requests per 60 seconds.

Both counters increment even when one denies. The initial expiry is preserved, increments do not
extend the window, and an unsafe/missing TTL is a dependency failure. Limits remain the existing
bounded configuration; changing them is a separate owner decision.

Redis keys use a versioned staging namespace and HMAC-derived tenant/caller components. They
contain no raw tenant UUID, caller identity or personal information. The rate-limit HMAC secret is
separate from authentication, idempotency and database credentials.

## Tenant isolation

- Authenticated tenant header must equal the body organization.
- Tenant must be in the exact configured Tenant A/B allowlist.
- The synthetic manifest record must match organization, offer and Worker Identity.
- PostgreSQL statements include exact environment, manifest, tenant and idempotency scope.
- Redis tenant keys are derived only after the same authorization checks.
- Unknown and cross-tenant records return generic concealed responses.
- Cleanup and evidence queries require the same exact tenant/manifest scope.
- No list, prefix search or fallback can reveal another tenant's record.

## Outage and unknown-outcome behavior

| Failure                                          | Required behavior                                                                            |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| Redis unavailable or malformed response          | `/ready` fails; mutations/search fail generic `503`; no memory fallback                      |
| PostgreSQL unavailable before claim              | Delivery fails generic `503`; no simulated result is produced                                |
| Database transaction rolls back                  | No attempt/result is claimed; same-key retry may proceed after health recovery               |
| Connection lost during commit                    | Return unavailable/unknown; do not create another attempt automatically                      |
| Read-back finds terminal record                  | Return recorded response idempotently                                                        |
| Read-back finds `unknown`/`blocked`              | Fail closed pending reviewed reconciliation                                                  |
| Read-back is unavailable                         | Fail closed; do not infer success or retry                                                   |
| Redis recovers                                   | New windows may proceed; lost counters are recorded as an external-validation gap            |
| Database and Redis disagree about request timing | Idempotency remains authoritative for duplicate suppression; limiter never grants a mutation |

Because delivery is synthetic and has no provider egress, an unknown database outcome cannot have
sent a real communication. It still remains blocked to prove the consistency contract.

Readiness is dependency-aware: offer delivery requires both PostgreSQL and Redis; candidate source
requires Redis. Liveness remains process-only.

## Retention proposal

- Redis rate-limit keys: fixed 60-second TTL plus a small implementation safety margin only if
  approved; no long-lived counter history.
- Terminal delivery idempotency and attempt records: **30 days after the latest attempt or terminal
  response**, matching the existing local proposal.
- `unknown`, `blocked`, incident-held or legal-held records: no automatic deletion.
- Aggregate audit/evidence: 30 days unless Privacy/Retention Owner approves another period.
- The 30-day policy remains proposed, not approved.

## Cleanup requirements

### Redis

- Prefer natural TTL.
- Manual reset is staging-only and requires exact environment, project/cluster, release and
  namespace confirmation.
- Reset only the approved adapter namespace; prohibit wildcard, global flush and production.
- Record aggregate removed-key count without keys.

### PostgreSQL

1. Select only terminal, past-retention records for the exact environment, release, manifest and
   tenant.
2. Exclude `unknown`, `blocked`, active incident and legal-hold records.
3. Produce a dry-run count before deletion.
4. Require Privacy/Retention and Integration approval for the deletion batch.
5. Delete attempt rows then idempotency rows in bounded exact-ID batches.
6. Verify affected-row counts and absence.
7. Record aggregate cleanup evidence.
8. Stop on mismatch or ambiguous outcome; never broaden the query or auto-retry.

Cleanup never mutates WorkerOffer, WorkerIdentity, Assignment or other API database records.

## Proposed implementation scope

Expected future files, subject to approval:

- `apps/offer-delivery/src/store.ts` — replace concrete memory coupling with a repository contract;
- new offer-delivery PostgreSQL repository and transaction tests;
- `apps/offer-delivery/src/rateLimit.ts` — distributed store abstraction;
- `apps/candidate-source/src/rateLimit.ts` — distributed store abstraction;
- shared adapter Redis atomic-store code only if review proves sharing safer than duplication;
- offer/candidate configuration, readiness and lifecycle tests;
- `packages/database/prisma/schema.prisma` and one reviewed migration for delivery state only;
- migration checksum registry;
- package manifests/lockfile only if an approved dependency is required;
- synthetic adapter runbooks, compatibility review and external evidence matrix.

No implementation may begin until the backend, schema, owners, retention and external target
decisions below are approved.

## Validation plan

Local/provider-free:

- repository contract tests with deterministic in-memory fakes;
- same-key concurrent request simulation proving one attempt;
- same-key/different-body conflict;
- cross-tenant/cross-release/cross-manifest denial;
- replay before and after retry eligibility;
- transaction rollback and commit-ambiguity state-machine tests;
- Redis Lua/static policy tests for dual bucket consumption and TTL;
- dependency outage/readiness and no-memory-fallback tests;
- cleanup dry-run, hold, bounds and affected-count tests;
- privacy-safe log tests and zero-provider-egress test;
- lint, typecheck, complete tests, production build, secret/public-bundle/boundary scans;
- Prisma validation/generation and migration-integrity checks if schema work is later approved.

Separately authorized external evidence:

- disposable PostgreSQL concurrency, restart and commit-ambiguity exercise;
- two or more adapter replicas sharing exact Redis and database targets;
- Redis restart/outage/recovery and TTL evidence;
- exact release/image/target identity evidence;
- witnessed retention cleanup.

No local fake result may be reported as real distributed validation.

## Rollback and stop conditions

Stop before or during future implementation when:

- an owner approval is missing, expired or not bound to the exact checkpoint/scope;
- backend provider, project, cluster, database, Redis or namespace is unknown or mutable;
- schema ownership or migration overlaps unrelated work;
- a real destination/provider dependency appears;
- tenant, manifest, release or idempotency scope is ambiguous;
- counters could fail open or fall back to memory;
- a transaction/Redis result is unknown;
- cleanup would require wildcard, broad delete or production-like access;
- retention, legal hold or evidence deletion is unresolved;
- credentials, raw identities, idempotency keys or recipient data would enter logs.

Rollback means reverting only isolated approved code/migration changes before external execution.
During a later database/Redis exercise, rollback means stop traffic, preserve evidence, reconcile
read-only and revoke temporary access. It never means automatic replay, broad deletion, production
access or unrehearsed restore.

## Formal approval form

General approval is invalid. Every approval requires a real person, exact scope, checkpoint, UTC
date and expiration.

| Approval                              | Named approver | Exact approved scope | Checkpoint SHA | Approval date/time (UTC) | Expiration (UTC) | Decision/reference |
| ------------------------------------- | -------------- | -------------------- | -------------- | ------------------------ | ---------------- | ------------------ |
| Offer-delivery Integration Owner      | **MISSING**    | **MISSING**          | `a31fa96…`     | **MISSING**              | **MISSING**      | **MISSING**        |
| Candidate-source Integration Owner    | **MISSING**    | **MISSING**          | `a31fa96…`     | **MISSING**              | **MISSING**      | **MISSING**        |
| Infrastructure Owner                  | **MISSING**    | **MISSING**          | `a31fa96…`     | **MISSING**              | **MISSING**      | **MISSING**        |
| Database Owner                        | **MISSING**    | **MISSING**          | `a31fa96…`     | **MISSING**              | **MISSING**      | **MISSING**        |
| Independent Database Reviewer/Witness | **MISSING**    | **MISSING**          | `a31fa96…`     | **MISSING**              | **MISSING**      | **MISSING**        |
| Security Owner                        | **MISSING**    | **MISSING**          | `a31fa96…`     | **MISSING**              | **MISSING**      | **MISSING**        |
| Privacy/Retention Owner               | **MISSING**    | **MISSING**          | `a31fa96…`     | **MISSING**              | **MISSING**      | **MISSING**        |
| Monitoring/Operations Owner           | **MISSING**    | **MISSING**          | `a31fa96…`     | **MISSING**              | **MISSING**      | **MISSING**        |
| Secondary On-Call                     | **MISSING**    | **MISSING**          | `a31fa96…`     | **MISSING**              | **MISSING**      | **MISSING**        |
| Release Owner                         | **MISSING**    | **MISSING**          | `a31fa96…`     | **MISSING**              | **MISSING**      | **MISSING**        |

Approval of this package authorizes only the exact later implementation scope explicitly recorded
by the approvers. It does not authorize B5.7, GCP, billing, resource creation, database/Redis
access, staging, production, deployment or spending.

## Unresolved owner decisions

1. Approve split PostgreSQL/Redis architecture or select another option.
2. Name both Integration Owners and the independent Database Reviewer/Witness.
3. Approve the proposed relational models and whether they use the platform database or a
   separately isolated adapter database.
4. Approve exact Redis ownership, persistence, eviction, failover and recovery policy.
5. Approve all authenticated replays consuming rate-limit capacity.
6. Approve HMAC key ownership, rotation and namespace versioning for adapter counters.
7. Approve raw idempotency-key storage versus keyed digest only.
8. Approve the 30-day retention, legal-hold behavior and cleanup operator.
9. Approve handling and retention of `unknown`/`blocked` records.
10. Approve readiness dependencies and outage SLOs.
11. Supply exact disposable PostgreSQL/Redis targets for later external validation.

OD-06 implementation, B5.7, database implementation, External Validation Phase 1 and production
activity remain **BLOCKED**.
