# Milestone B Adapter, Limiter and QA Reset Contract

Status: **B1–B4 IMPLEMENTED LOCALLY — EXTERNAL VALIDATION BLOCKED**

Committed implementation baseline: `69686c527f41cc4b1138a8ddc84c6c9ef60f0d47`

External Validation Phase 1: **BLOCKED**

This document defines contracts for Milestones B1–B6. B1 is implemented locally without real Redis
evidence. B2 is implemented locally with deterministic synthetic-only data and replica-local rate
limits. B3 is implemented locally with zero-provider simulated delivery, bounded idempotency and
injected-clock retries. B4 implements only an abstract/in-memory locked reset workflow; real
database behavior remains prohibited and unverified. B5–B6 remain subject to their approvals. Nothing here authorizes Google Cloud
access, infrastructure, credentials, secret handling, external validation, database mutation,
deployment, spending or production access.

## Contract notation

- **Fact** means behavior already implemented or required by repository code/tests.
- **Proposal** means the recommended Phase 1 design; it requires the listed approval before
  implementation.
- **Decision required** means the repository does not contain sufficient authority to choose.
- Identifiers are opaque examples of field shape, not real tenants, endpoints, credentials or
  approvals.
- Every service is staging-only, Canadian-region scoped and bound to the exact approved release
  SHA.

## 1. Candidate-source staging adapter

### Purpose and prohibited uses

**Fact:** The API already has an outbound candidate-source client. Its purpose is to return a
bounded, tenant-scoped synthetic candidate summary for dispatch review.

**Proposal:** The staging adapter is a deterministic source of synthetic Candidate records for the
two approved validation tenants. It may support search and re-evaluation only.

It must not:

- contact, enroll, rank or notify a real worker;
- query production or a real HR/ATS/workforce system;
- use real names, contact details, addresses, compensation, banking, tax, health, resident,
  investigation or free-form internal-note data;
- create offers, assignments, attendance, timesheets, payments or notifications;
- infer qualification, suitability or availability beyond the approved synthetic manifest;
- accept an organization not on the immutable staging allowlist.

### Endpoints

| Method | Path                      | Contract                                                                            |
| ------ | ------------------------- | ----------------------------------------------------------------------------------- |
| `GET`  | `/health`                 | Process liveness only; no dependency mutation                                       |
| `GET`  | `/ready`                  | Verify loaded manifest, release binding, allowlist and authentication configuration |
| `POST` | `/v1/candidates/search`   | Return one deterministic bounded candidate page                                     |
| `POST` | `/v1/candidates/evaluate` | Return the deterministic current evaluation for one source reference                |

All state-changing methods other than an separately approved synthetic reset endpoint are
prohibited. Milestone B2 must not add reset behavior.

### Request contracts

`POST /v1/candidates/search`:

```json
{
  "dispatchReviewId": "uuid",
  "organizationId": "uuid",
  "workGroupId": "uuid",
  "roleDefinitionId": "uuid",
  "startAt": "RFC3339 timestamp",
  "endAt": "RFC3339 timestamp",
  "timezone": "IANA timezone",
  "requestedAt": "RFC3339 timestamp"
}
```

`POST /v1/candidates/evaluate`:

```json
{
  "dispatchReviewId": "uuid",
  "organizationId": "uuid",
  "workGroupId": "uuid",
  "roleDefinitionId": "uuid",
  "candidateSourceReference": "opaque string, 1-200 characters",
  "startAt": "RFC3339 timestamp",
  "endAt": "RFC3339 timestamp",
  "timezone": "IANA timezone"
}
```

Unknown fields, malformed UUIDs, invalid timestamps, invalid time ranges, unapproved timezones and
oversized bodies fail closed.

### Response contracts

Search returns:

```json
{
  "candidates": [
    {
      "organizationId": "uuid",
      "workerIdentityId": "uuid",
      "candidateSourceReference": "opaque string",
      "approvedDisplayName": "synthetic display label",
      "candidateSourceType": "internal_worker_profile",
      "workGroupMatch": "match",
      "roleDefinitionMatch": "match",
      "qualificationSummaryState": "meets_requirements",
      "verificationSummaryState": "meets_requirements",
      "availabilityState": "available",
      "scheduleConflictState": "conflict_free",
      "serviceAreaState": "inside_service_area",
      "travelSuitabilityState": "suitable",
      "transportConstraintState": "available",
      "recommendationState": "recommended",
      "sourceFreshnessAt": "RFC3339 timestamp",
      "evaluationVersion": 1
    }
  ]
}
```

Evaluate returns `{ "candidate": <same-candidate-shape> }`.

**Fact:** The current client enforces:

- exact organization match;
- active persisted Worker Identity UUID validation occurs downstream;
- source reference length at most 200;
- approved display-name length at most 160;
- allowlisted enum values;
- positive evaluation version;
- no duplicate source references or Worker Identity IDs;
- maximum 100 candidates;
- default freshness no older than 15 minutes and not in the future.

Milestone B2 must reuse the exact current enum allowlists from
`packages/auth/src/productionIntegrations.ts`; it must not create new evaluation states.

Exact allowlists:

- `candidateSourceType`: `internal_worker_profile`, `invited_worker`, `staffing_partner`,
  `enterprise_employee_pool`, `external_integration`;
- work-group and role-definition match: `match`, `partial_match`, `no_match`, `not_evaluated`;
- qualification/verification summary: `meets_requirements`, `partially_meets`,
  `missing_required`, `verification_pending`, `expired`, `not_evaluated`;
- availability: `available`, `partially_available`, `unavailable`, `not_evaluated`,
  `source_unavailable`;
- schedule conflict: `conflict_free`, `conflict_detected`, `not_evaluated`,
  `source_unavailable`;
- service area: `inside_service_area`, `outside_service_area`, `not_evaluated`,
  `source_unavailable`;
- travel: `suitable`, `unsuitable`, `unknown`, `not_evaluated`, `source_unavailable`;
- transport: `available`, `unavailable`, `unknown`, `not_evaluated`, `source_unavailable`;
- recommendation: `not_evaluated`, `recommended`, `not_recommended`, `alternative`,
  `unavailable`.

### Pagination and ordering

**Fact:** The current API client sends no page size/cursor and accepts only one `candidates` array.

**Proposal:** Phase 1 supports exactly one page with at most 100 candidates. The adapter orders
records by `candidateSourceReference` ascending using bytewise comparison. The same manifest and
request produce the same ordering. No `nextCursor` is returned.

Adding multi-page behavior requires a versioned client and contract change. The pagination cursor
format and maximum cross-page result count are **owner decisions** if pagination becomes necessary.

### Isolation, authentication and replay

- Require the combined service authentication design in section 5.
- Authorize the caller for the exact approved adapter audience and application scope.
- Compare `organizationId` with the immutable tenant allowlist before reading a manifest.
- Partition manifest lookup and audit records by organization.
- Never accept tenant scope from authentication alone or request body alone; both must agree.
- Search/evaluate are read-only and replay-safe.
- Accept an optional request correlation ID only if syntactically bounded; otherwise generate one.
- Do not cache an authorization result across tenants.

### Rate limiting, timeout and retry

**B2 decision implemented:** The owner approved 30 requests per minute per tenant and 60 requests
per minute per authenticated calling service. Values are validated and bounded. B2 enforcement is
in-process only; multi-replica distributed enforcement remains an external staging requirement.

**Fact:** The current HTTP boundary defaults to 3000 ms, clamps configuration to 100–10000 ms and
maps failures to generic integration unavailability. Changing it requires a client contract review.

**Proposal:** The API performs no automatic retry for search/evaluate in B2. A caller may repeat the
read-only request with the same correlation context. The adapter must be deterministic across
replays.

### Error taxonomy

Return generic JSON without raw exceptions or record contents:

| Status | Code                               | Meaning                                           |
| -----: | ---------------------------------- | ------------------------------------------------- |
|    400 | `RWOS_CANDIDATE_REQUEST_INVALID`   | Malformed or unsupported request                  |
|    401 | `RWOS_CANDIDATE_AUTH_REQUIRED`     | Missing/invalid service authentication            |
|    403 | `RWOS_CANDIDATE_ACCESS_DENIED`     | Authenticated but scope/tenant denied             |
|    404 | `RWOS_CANDIDATE_UNAVAILABLE`       | Source reference absent or deliberately concealed |
|    409 | `RWOS_CANDIDATE_MANIFEST_MISMATCH` | Approved manifest/release binding conflict        |
|    429 | `RWOS_CANDIDATE_RATE_LIMITED`      | Approved adapter limit exceeded                   |
|    503 | `RWOS_CANDIDATE_UNAVAILABLE`       | Manifest/dependency/readiness unavailable         |

The existing API client collapses non-success behavior into generic integration failure; it does not
depend on detailed adapter error bodies.

### Audit, health, retention and cleanup

Audit safe fields only: UTC time, service identity, organization ID, operation, correlation ID,
release SHA, manifest version, safe result count/status and latency. Never log request credentials,
raw headers, names, source payloads or candidate details.

- `/health`: `200` when the process can serve HTTP.
- `/ready`: `200` only when authentication configuration, approved release SHA, immutable tenant
  allowlist and signed/approved synthetic manifest are loaded; otherwise `503`.
- Synthetic manifests and safe audits use the approved 30-day proposal, pending privacy/legal
  approval.
- Cleanup removes only the adapter’s approved synthetic manifest/runtime audit artifacts after the
  evidence hold decision.
- No cleanup call may delete API database records.

## 2. Offer-delivery staging adapter

### Purpose and prohibited delivery

The adapter simulates delivery outcomes for approved synthetic offers. It must not call email, SMS,
push, telephone, chat, webhook or any other real delivery provider. It must not resolve a real
address, device, telephone number or account.

Supported operation:

| Method | Path                        | Contract                                  |
| ------ | --------------------------- | ----------------------------------------- |
| `GET`  | `/health`                   | Process liveness                          |
| `GET`  | `/ready`                    | Manifest/authentication/release readiness |
| `POST` | `/v1/worker-offers/deliver` | Deterministic simulated delivery          |

Request:

```json
{
  "organizationId": "uuid",
  "workerOfferId": "uuid",
  "workerIdentityId": "uuid"
}
```

Required header: `idempotency-key`.

Response:

```json
{
  "status": "sent | delivered | failed",
  "providerReference": "opaque synthetic reference or null",
  "retryable": false
}
```

### Non-real recipient enforcement

- The approved manifest maps opaque Worker Identity IDs to simulation scenarios, never destinations.
- Every record carries a non-secret `synthetic=true` invariant in the adapter’s internal manifest.
- Unknown Worker Identity or offer IDs fail without fallback.
- No provider SDK, SMTP library, phone API, notification API or production integration dependency
  is permitted in B3.
- Network egress is denied except required platform control paths; the service needs no outbound
  business integration.

### Deterministic simulation

Approved manifest states:

- `sent`;
- `delivered`;
- `failed_retryable`;
- `failed_permanent`;
- `timeout_simulation`;
- `malformed_response_simulation` only in a test harness, never normal service output.

**Fact:** The API accepts only `sent`, `delivered` or `failed`; retryability is meaningful only for
`failed`.

The outcome is selected by the approved synthetic manifest, not request-controlled free text. The
same offer, terms version and manifest version produce the same terminal response.

### Idempotency and duplicate suppression

**Fact:** The API reuses `worker-offer:<offer-id>:terms:<terms-id>` across retries.

- Validate the key against the exact versioned format and body’s offer ID.
- Atomically claim/store `(tenant, idempotency key)` before producing an outcome.
- Store request-body digest, outcome, provider reference, first/last attempt time and attempt count.
- Same key and same body returns the stored response without a second simulated delivery.
- Same key with a different body returns `409`.
- Concurrent requests return exactly one stored outcome.
- B3 implements a proposed 30-day local retention period. Privacy/legal approval remains required
  before external staging.

### Isolation, authentication and retry simulation

- Use combined IAM and application authorization from section 5.
- Derive tenant from the approved offer manifest and require authenticated tenant scope to agree.
- Never allow one tenant to probe another tenant’s offer or idempotency record.
- Retryable failure returns `failed`, `retryable=true`.
- Permanent failure returns `failed`, `retryable=false`.
- Timeout simulation delays only within the approved test timeout and must not consume unbounded
  instances.
- B3 implements the owner-approved simulation policy of three total attempts with retry eligibility
  after one second and five seconds. Time is injected in tests; no background worker waits or sends.

### Error and audit contract

Generic statuses mirror candidate conventions: invalid `400`, unauthenticated `401`, denied `403`,
concealed unknown `404`, idempotency conflict `409`, rate limited `429`, unavailable `503`.

Audit: UTC time, service identity, tenant, offer ID, hashed/opaque idempotency reference, simulation
scenario ID, result, retryable flag, duplicate flag, correlation ID, release SHA and latency. Do not
log tokens, headers, recipient data, message content or raw errors.

### Tests, health, retention and cleanup

B3 must assert:

- all deterministic states;
- unknown/non-synthetic recipient denial;
- tenant mismatch and enumeration-safe denial;
- duplicate replay and concurrent duplicate suppression;
- same-key/different-body conflict;
- timeout, malformed internal scenario and service outage behavior;
- zero outbound delivery calls/dependencies;
- safe logs;
- `/health` process-only and `/ready` manifest/auth/release dependent.

Retention of idempotency and audit records is unresolved pending privacy/legal and integration owner
approval. Cleanup may remove only approved staging simulation/idempotency records after evidence
retention; it cannot mutate offers in the API database.

## 3. Distributed authentication limiter

### Protected operations and fixed policy

**Fact:** Protected operations are `register` and `sign_in`. Production registration is disabled,
but attempts still pass through the limiter boundary before any future authorized registration
behavior.

**Fact:** The API sends this policy:

```json
{
  "accountMaxAttempts": 5,
  "networkMaxAttempts": 30,
  "windowSeconds": 60
}
```

These are existing repository thresholds, not new B0 decisions. B1 must reject unsupported policy
values rather than accept caller-controlled thresholds. Threshold changes require a security-owner
decision and coordinated API/service tests.

### Request and response

`POST /v1/auth-rate-limit/consume`:

```json
{
  "action": "register | sign_in",
  "accountKey": "rwos:authrl:v1:<action>:account:<64 lowercase hex>",
  "networkKey": "rwos:authrl:v1:<action>:network:<64 lowercase hex>",
  "policy": {
    "accountMaxAttempts": 5,
    "networkMaxAttempts": 30,
    "windowSeconds": 60
  }
}
```

Response body contains only:

```json
{ "allowed": true, "retryAfterSeconds": 60 }
```

`retryAfterSeconds` is finite. The API clamps it to 1–3600 seconds.

### Privacy and key policy

**Fact:** The API normalizes email and source IP, then computes HMAC-SHA-256 with action/type domain
separation. Raw email and IP never leave the API for the limiter.

Exact Redis keys are the validated `accountKey` and `networkKey` supplied by the API. Do not prefix
them with tenant or store raw personal data.

**Decision required:** Pre-authentication requests do not have an authoritative tenant. B1 must not
invent tenant scope. If a future authenticated operation is protected, its tenant-key design
requires a versioned contract and security/privacy approval.

The HMAC secret:

- is distinct from the service bearer credential and every session/database credential;
- is read only by the API, not Redis;
- uses a versioned namespace;
- never appears in logs/evidence;
- on rotation creates a new key namespace and intentionally resets active buckets.

Rotation overlap versus immediate cutover is a **security-owner decision**.

### Atomic Redis behavior

Use one Redis Lua script or equivalent atomic server-side operation:

1. validate both keys and fixed policy before invocation;
2. read/increment account and network counters atomically;
3. initialize each missing key with TTL 60 seconds;
4. preserve the initial window expiry; increments do not extend it;
5. deny if either post-increment count exceeds its maximum;
6. return the greater remaining TTL as retry-after;
7. ensure both counters are consumed even when one bucket denies, preventing key-rotation bypass;
8. never return counter keys or counts to clients.

Clock source is Redis/server TTL, not caller timestamps. A missing/negative TTL is treated as
service failure, not permission.

### Failure behavior and concurrency

**Fact:** Any timeout, connection failure, non-success or malformed response fails `register` and
`sign_in` closed with generic `503 RWOS_AUTH_UNAVAILABLE`. There is no production memory fallback.

The current client timeout defaults to 300 ms and is bounded to 100–5000 ms. Changing it requires a
security/operations decision.

At least two API replicas and two limiter-service replicas must share one Redis instance during
external validation. Tests prove exact account/network thresholds, restart persistence, account/IP
rotation resistance, atomic concurrency and readiness recovery.

### Authentication, health and reset

- Combined service authentication is recommended.
- `/health` is process liveness and must not be used as dependency readiness.
- `/ready` performs a bounded Redis atomic probe in a dedicated non-personal readiness namespace,
  cleans it with TTL and returns `503` on failure.
- Compatibility result: B1 updates the API dependency check from `GET /health` to `GET /ready`.
  `/health` remains process-only and `/ready` remains Redis-dependent.

Safe staging reset:

- disabled unless exact staging project/cluster identity, release SHA and reset authority match;
- accepts only a versioned synthetic namespace prefix;
- uses scan/delete only within that exact prefix;
- never accepts wildcard/global flush commands;
- production reset is permanently rejected;
- requires separate QA/security approval.

### Audit and privacy

Do not audit raw request keys, HMAC digests, email, IP, token, counters per person or request body.
Audit aggregate operation, allow/deny, latency, service/release identity, dependency status and safe
correlation ID. Authentication denials remain non-enumerating.

## 4. QA reset service

### Enforcement and maximum blast radius

The service exists only to prepare and clean deterministic synthetic state for the approved Tenant
A and Tenant B. Its maximum blast radius is those two immutable tenant IDs plus explicitly listed
adapter/limiter synthetic namespaces in the approved manifest.

It must reject:

- production project, cluster, database, hostname or immutable authority ID;
- missing/mutable/placeholder provider identifiers;
- any tenant outside the exact immutable allowlist;
- wildcard, empty, duplicate or request-supplied expansion of scope;
- release SHA other than the exact approved 40-character SHA;
- unapproved operator/service identity;
- database identity mismatch or application database used as an admin target;
- missing approval/confirmation;
- concurrent or unresolved prior reset.

### Endpoint and request variants

`POST /v1/reset` supports `dry-run`, `prepare` and `cleanup`.

Browser contract facts:

```json
{
  "action": "prepare | cleanup",
  "tenantIds": ["tenant-a", "tenant-b"],
  "releaseSha": "40-character SHA",
  "confirmation": "authorized-staging-browser-e2e"
}
```

Native contract facts:

```json
{
  "action": "prepare | cleanup",
  "authorityId": "immutable provider-qualified authority",
  "tenantId": "approved worker tenant",
  "releaseSha": "40-character SHA",
  "confirmation": "authorized-staging-native-e2e"
}
```

**Proposal:** Normalize both existing request shapes into one internal approved reset plan. A
future versioned endpoint may unify them, but B4 must remain compatible with current runners.

### Authentication and authorization

- Require Cloud Run IAM identity plus a distinct application reset credential.
- Bind IAM audience to the QA reset service.
- Map each approved caller to browser or native scope; browser may request exactly A+B, native
  exactly its approved tenant.
- Require an immutable external approval-record reference in service configuration, not a
  request-controlled expansion field.
- The runtime service identity receives only the minimum reset procedure privileges, never database
  owner, schema migration or production access.
- A separate database reviewer/witness must approve database mutation authority before execution.

### Manifest and deterministic behavior

The signed/versioned reset manifest contains:

- exact release SHA and schema/migration checksum;
- staging project, database-cluster and database identifiers;
- reset authority ID;
- Tenant A/B IDs;
- permitted synthetic users, memberships, Worker Identities, requests, dispatches, offers and
  assignments;
- candidate/delivery synthetic record references;
- limiter synthetic namespace;
- creation dependency order and cleanup reverse order;
- expected counts, immutable safe references and evidence fields;
- manifest hash/version, approval reference and expiry.

`dry-run` performs all identity, approval, manifest, schema and scope checks and returns a bounded
plan/count summary without mutation.

`prepare`:

1. validates all boundaries again;
2. obtains the reset lock;
3. reconciles current state;
4. creates or updates only manifest-owned synthetic records in dependency order;
5. never deletes unknown records;
6. verifies exact expected safe counts/state;
7. records evidence and releases the lock.

`cleanup`:

1. validates all boundaries again;
2. obtains the reset lock;
3. deletes only manifest-owned records in reverse dependency order;
4. removes adapter/limiter synthetic state through scoped service contracts;
5. never deletes audit/evidence records before retention approval;
6. proves no unexpected manifest-owned state remains;
7. records evidence and releases the lock.

### Locking, idempotency and recovery

- Use a database advisory lock or dedicated reset-control record scoped to immutable cluster plus
  manifest. Schema choice requires database-owner approval; no schema change is authorized here.
- One reset plan may run at a time.
- Idempotency key is derived from action, manifest hash, release SHA and run ID; no user data.
- Repeating a completed action returns the recorded safe outcome.
- Partial/unknown outcome marks the authority blocked. No automatic rerun.
- Recovery is reconcile-and-resume or approved cleanup from the manifest; never broad rollback,
  database restore or production action.
- Backup/PITR is not a routine reset rollback. Any restore requires its separate rehearsal and
  authorization.

### Audit, evidence and retention

Audit/evidence contains UTC start/end, caller service identity, approval reference, authority,
cluster/database IDs, tenant IDs, action, dry-run flag, release SHA, manifest hash, safe before/after
counts, correlation/run ID, result and exception category. Never include credentials, emails,
passwords, tokens, personal data or database URLs.

Retention follows the proposed 30-day evidence policy only after privacy/legal approval. Reset
control records must last at least through the evidence/replay window; the exact duration is a
privacy/legal, QA and database-owner decision.

## 5. Service-to-service authentication decision

| Design                             | Strengths                                                                            | Limitations                                                                                                      |
| ---------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Existing application bearer tokens | Already supported; simple rotation boundary                                          | Static credential theft/replay; no platform workload identity; current tokens do not independently prove service |
| Cloud Run IAM identity tokens      | Short-lived, audience-bound workload identity; platform auditability                 | Current clients cannot mint/attach them; IAM alone does not enforce tenant, manifest or operation scope          |
| IAM plus application authorization | Workload identity plus explicit tenant/operation/release scope; strongest separation | Requires client/server code, IAM, token rotation and dual-layer tests                                            |

### Recommendation

Use **Cloud Run IAM identity tokens plus application-level authorization** for API-to-limiter,
API-to-candidate, API-to-delivery and E2E-runner-to-reset calls.

- IAM authenticates the approved calling workload and audience.
- Application authorization enforces tenant, operation, release, manifest and idempotency scope.
- Worker/browser sessions remain application bearer sessions; Cloud Run credentials must never be
  embedded in public clients.
- Static application credentials remain distinct per service and are stored only by the approved
  secret manager. Whether to retain a static bearer token alongside signed application claims is a
  security-owner decision.

Required future changes:

- workload identity-token provider abstraction in server-side HTTP clients;
- per-service audience configuration and validation;
- `Authorization: Bearer <Google identity token>` transport;
- separate application authorization header or signed bounded claims;
- server verification of issuer, audience, subject/service account, release and scope;
- IAM invoker bindings scoped per service;
- replay bounds, token expiry and clock-skew tests;
- local fake identity verifier for tests without Google access;
- generic error mapping and safe audit fields;
- Secret Manager reference configuration without values.

## 6. Threat model

| Service           | Assets/trust boundaries                                                                | Likely misuse                                                                                                             | Required mitigation                                                                                                                           | Remaining approval                       |
| ----------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Candidate adapter | Synthetic manifest, tenant IDs, Worker Identity references; API-to-adapter boundary    | Cross-tenant search, real-data connection, replay, oversized enumeration, log leakage                                     | Dual auth, immutable allowlist, one bounded page, deterministic order, no provider egress, strict schemas, safe audit                         | Integration, security, privacy           |
| Delivery adapter  | Offer/Worker Identity references, idempotency records; API-to-adapter boundary         | Accidental real delivery, duplicate delivery, forged tenant, replay, recipient leakage                                    | No delivery SDK/egress, synthetic manifest, atomic idempotency, combined auth, generic errors, no destination fields                          | Integration, security, privacy           |
| Limiter           | Availability, HMAC-derived keys, Redis counters; API/service/Redis boundaries          | Fail-open, counter races, key leakage, credential replay, flush abuse, cross-environment Redis                            | Atomic Lua, fail closed, TLS/private Redis, combined auth, strict key regex, TTL, no key logs, scoped reset                                   | Security, operations                     |
| QA reset          | Synthetic database state and reset authority; runner/reset/database/service boundaries | Excessive deletion, production-target confusion, concurrent resets, forged SHA/tenant, credential theft, evidence leakage | Immutable project/cluster/tenant allowlist, dual auth, dry-run, manifest, least privilege, lock, idempotency, blocked recovery, safe evidence | QA, database reviewer, security, privacy |

Common threats:

- **Credential misuse:** distinct service credentials, short-lived IAM tokens, audience binding,
  rotation, no shared secrets and no secret logs.
- **Replay:** short-lived IAM tokens plus operation-specific idempotency and release/manifest
  binding.
- **Production confusion:** independent immutable project/cluster IDs, explicit staging label,
  denial of mutable aliases and permanent production rejection.
- **Privacy leakage:** synthetic-only inputs, bounded fields, no raw key/header/body logging and
  privacy-reviewed evidence.
- **Compromised service:** least-privilege service identity, restrictive ingress/egress, isolated
  data stores and small maximum blast radius.

## 7. Future implementation plan

### B1 — distributed limiter

- Expected files: new isolated service package/app, API limiter client/config tests, workspace build
  configuration, runbook and later packaging files.
- Tests: fixed policy rejection, HMAC-key validation, atomic account/network counters, TTL, exact
  concurrency, fail-closed API behavior, readiness, privacy logs, reset namespace and two-replica
  evidence contract.
- Stop conditions: Redis/client behavior requires schema/business changes; thresholds or rotation
  policy lack approval; local runtime/dependency cannot be tested safely.
- Approval: security owner for policy/auth/rotation/reset; operations owner for readiness/timeout.
- External information: approved Redis version/topology and later immutable service/cluster IDs.
- Security review: mandatory before merge and external exercise.
- Completion: local service/tests/package green; real two-replica validation remains external.

### B2 — candidate-source adapter

- Expected files: new service app/package, synthetic manifest schema/fixtures, contract tests,
  client compatibility tests and packaging.
- Tests: schemas, all existing enum states, freshness, one-page cap/order, duplicate/cross-tenant
  denial, unknown/revoked/inactive Worker Identity scenarios, auth, rate limit and no real egress.
- Stop conditions: real provider/data access becomes necessary; pagination or new ranking states are
  requested; tenant/test manifest is not approved.
- Approval: integration, security, QA and privacy owners.
- External information: approved Tenant A/B and Worker Identity safe references.
- Security review: mandatory tenant-isolation and privacy review.
- Completion: deterministic synthetic-only service passes local contract tests; no external claim.

### B3 — offer-delivery adapter

- Expected files: new service app/package, simulation manifest/idempotency repository, tests and
  packaging.
- Tests: all outcomes, zero real delivery, duplicate/concurrent replay, tenant denial, timeout,
  retryable/permanent failure, malformed response harness, safe audit and cleanup.
- Stop conditions: any real recipient/provider is required; idempotency retention or retry policy is
  unapproved.
- Approval: integration, security, QA and privacy owners.
- External information: approved synthetic offer/Worker Identity references and retention.
- Security review: mandatory egress, idempotency and logging review.
- Completion: deterministic simulation with no delivery dependency passes locally.

### B4 — QA reset service

- Expected files: new isolated service, reset policy/manifest types, database reset repository,
  browser/native compatibility tests, evidence schema and packaging. Database schema/migrations are
  excluded unless separately authorized.
- Tests: production rejection, immutable IDs, exact allowlists, dry-run, prepare/cleanup,
  idempotency, concurrency lock, partial failure, least privilege, safe audit and blast-radius
  assertions.
- Stop conditions: separate database reviewer is missing; schema change is required; production
  access or broad deletion is requested; approved test manifest/tenants are absent.
- Approval: QA owner, database owner plus separate reviewer/witness, security and privacy/legal.
- External information: project/cluster/database/authority/tenant immutable IDs and approval record.
- Security review: mandatory before any mutation-capable build.
- Completion: local policy and repository tests prove bounded behavior; real database mutation
  remains separately authorized.

### B5 — service authentication

- Expected files: shared server-only identity-token abstraction, each service verifier/config,
  clients, fake local verifier, tests and IAM planning documentation.
- Tests: issuer/audience/subject/scope, expiry/skew, replay, tenant mismatch, static credential
  separation, generic denial and no public-client credential inclusion.
- Stop conditions: provider-specific implementation requires GCP access; named service identities
  or IAM topology lack approval.
- Approval: security and infrastructure owners.
- External information: approved audiences, service-account resource names and IAM bindings.
- Security review: mandatory cryptographic/configuration review.
- Completion: provider-independent local contract passes; GCP IAM evidence remains external.

### B6 — packaging and local tests

- Expected files: Dockerfiles, build matrix, `.dockerignore` additions, container validators and
  packaging runbook for B1–B5 services.
- Tests: frozen build, non-root runtime, `PORT`, health/readiness, shutdown, OCI labels, no secrets,
  no external target and local container probes.
- Stop conditions: no approved container runtime; build requires credentials/external system; base
  image/runtime choice conflicts with approved architecture.
- Approval: security/release review of image contents and provenance.
- External information: none for static/local work; publication requires separate registry approval.
- Security review: image content, dependency/SCA, user/permissions and egress.
- Completion: actual local/CI image build/start/probe/stop passes. Static checks alone are
  insufficient.

## 8. Unresolved owner decisions

1. Candidate-adapter thresholds are resolved for B2: 30 requests/minute per tenant and 60
   requests/minute per authenticated calling service.
2. Candidate pagination cursor/page policy if more than the existing one-page/100-record contract
   is needed.
3. Candidate client timeout change, if any.
4. Delivery-adapter thresholds are resolved for B3: 30 requests/minute per tenant and 60 per
   authenticated service.
5. Delivery local retention is proposed at 30 days; privacy/legal approval remains unresolved.
6. Delivery simulation retries are resolved for B3: three total attempts at initial, +1 second and
   +5 seconds.
7. Limiter HMAC rotation is resolved for B1: current plus previous key identifiers are accepted for
   at most 65 seconds (the 60-second limiter window plus the existing maximum 5-second API timeout).
8. Limiter client timeout change, if any.
9. Limiter readiness compatibility is resolved for B1: the API uses `/ready`.
10. Whether an authenticated future limiter policy needs tenant scope.
11. QA reset control-record retention.
12. QA reset locking implementation if it would require a schema change.
13. Combined-auth application credential format and whether a static token remains in addition to
    signed scoped claims.
14. Clock-skew tolerance for IAM/application claims.
15. Exact evidence retention and soft-delete decision.

Named approvals still required: infrastructure owner execution approval, security owner, QA owner,
integration owners for candidate/delivery/limiter, database owner, separate database
reviewer/witness, privacy/legal owner, monitoring owner and secondary on-call. Provisional planning
roles are not implementation approval.

## Final decision

- B1 is implemented locally using the owner-approved fixed policy, bounded 65-second HMAC overlap,
  `/ready` dependency check and exact staging-only reset namespace. Real disposable-Redis and
  two-replica runtime evidence remain separately authorized external validation.
- B2 is implemented locally with generated fictional Tenant A/B manifests. Immutable staging
  tenant/work-group/role identifiers, distributed multi-replica rate limiting, container execution
  and external evidence remain blocked.
- B3 is implemented locally with generated fictional Tenant A/B scenarios. Immutable staging
  tenant/offer/Worker Identity references, persistent/distributed idempotency, container execution
  and privacy-approved retention remain external blockers.
- B4 is implemented locally against in-memory boundaries only. Real database mutation remains
  blocked on a separate database reviewer/witness, immutable staging identities, reviewed manifest,
  transactional/advisory-lock evidence and explicit external authorization.
- B5 requires the infrastructure/security IAM design approval.
- B6 follows each service and requires an actual approved container runtime.

No contract here makes External Validation Phase 1 ready. Milestone A container execution remains
unverified.
