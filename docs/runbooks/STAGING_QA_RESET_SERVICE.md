# Staging QA Reset Service

Status: **LOCAL IMPLEMENTATION AND DISPOSABLE-DATABASE VALIDATION COMPLETE — EXTERNAL READINESS UNCLAIMED**

Release binding: `69686c527f41cc4b1138a8ddc84c6c9ef60f0d47`

External Validation Phase 1 remains **BLOCKED**. The local package contains the deterministic
workflow, expanded synthetic manifest, exact mutation plan, fixed 24-entity relational mutator,
guarded Prisma execution port, durable PostgreSQL inspection and mutation repository, and runtime
HTTP/service composition. It contains no configured external database URL, provider client or
external infrastructure binding and cannot reset a shared, staging or production database.

## Endpoint contract

| Method | Path                   | Behavior                                                           |
| ------ | ---------------------- | ------------------------------------------------------------------ |
| GET    | `/health`              | Process liveness only                                              |
| GET    | `/ready`               | Configuration plus durable PostgreSQL ownership readiness          |
| POST   | `/v1/qa-reset/dry-run` | Inspect PostgreSQL and return an exact zero-mutation plan checksum |
| POST   | `/v1/qa-reset/prepare` | Transactionally create exact approved synthetic records            |
| POST   | `/v1/qa-reset/cleanup` | Transactionally remove exact approved synthetic records            |

No legacy destructive `/v1/reset` alias is exposed. The browser and native runners retain their
existing body shapes but now call dry-run before prepare/cleanup and carry the resulting checksum
and receipt.

Every POST requires a distinct reset bearer credential and exact service, operator, operation,
project, cluster, database, authority, namespace, release, manifest, checksum and
operation-specific approval headers. Approval references are bound into the manifest checksum and
expire when that manifest expires; an expired manifest invalidates every bound approval. Prepare
and cleanup require their existing exact browser or native confirmation phrase.

## Deterministic manifest and blast radius

The non-secret manifest binds:

- version, exact release SHA and SHA-256 manifest checksum;
- immutable staging project, cluster, database and reset authority;
- exactly **Test Employer Organization A** and **Test Employer Organization B** (internally scoped
  by the security/data-isolation tenant identifiers `tenantA` and `tenantB`);
- namespace `rwos:qa-reset:staging:v1`;
- synthetic users, memberships, Worker Identities, job requests and calendar profiles, dispatch
  reviews and candidates, worker offers and no-provider delivery attempts, assignments, attendance
  boundaries, draft timesheet boundaries, and internal audit evidence;
- stable opaque IDs, dependency order and reverse cleanup order;
- per-entity count bounds, approval references and creation/expiry times.

Both named organizations are fictional employer organizations containing synthetic data only. They
are not apartment tenants, residents or real companies. In this runbook, `tenant` is retained only
for the internal security and data-isolation concept.

Every manifest relationship is checked against its owning organization. The test suite exercises
**70 denial cases**: live cross-organization reference swaps across relationship-bearing fixtures,
plus fixed-template tampering attempts against the self-contained retained audit evidence. The five
outbound-reference-free entity types remain roots or shared catalogue records. Cross-organization
references are denied for users and identities, memberships, test locations and departments,
staffing requests and calendar profiles, dispatch reviews and candidates, offers, delivery
attempts and responses, assignments, attendance, timesheets, internal control records and all
supported parent/child links. The platform continues to exclude payroll and worker payments,
employer invoicing, taxes, real notifications, automated AI employment decisions and real location
tracking.

The deterministic boundary fixtures intentionally stop short of excluded execution:

- delivery attempts use `synthetic_no_provider` and resolve no real destination;
- calendar profiles contain no address or special-instruction data;
- attendance records contain no check-in, check-out or location evidence;
- timesheets remain `draft` with no actual-time, payable-minute or billable-minute calculation;
- audit records contain only synthetic fixture identifiers and bounded state evidence.

Configuration rejects missing, wildcard, placeholder, mutable, ambiguous and production-like
identifiers. It permits exactly two tenants, 24 compiled entity types and ten records per entity
per tenant. No request can supply a table, predicate, entity type, namespace expansion or arbitrary
query.

## Dry-run, prepare and cleanup

In durable composition, dry-run performs guarded, parameterized PostgreSQL reads of manifest
ownership and owned-record lifecycle state. It requires exactly one checksum-matching current
manifest, rejects prepared or verified records owned by another manifest in the namespace,
calculates exact record IDs/counts, makes zero changes and returns a state-bound plan checksum.
The synchronous in-memory adapter remains only for non-durable tests.

Readiness awaits the same durable inspection and fails closed when inspection is unavailable, the owned
namespace contains a foreign record, either tenant is partially prepared or the local control
context has blocked automatic operations after an unknown outcome.

Prepare requires the recorded dry-run checksum, acquires the manifest/cluster lock, creates missing
records in dependency order and verifies the exact final state. A fully prepared state returns an
idempotent receipt.

Cleanup requires a cleanup dry-run checksum plus the preparation receipt and acquires the same
lock. It deletes deletable manifest records in reverse dependency order and verifies their absence,
preserves the approved shared access-role reference, and exactly verifies the immutable,
self-contained audit actor/event retained as reset evidence. A previously completed cleanup
returns its deterministic receipt.

An interrupted, partial or unknown prepare/cleanup marks the local authority blocked. No automatic
retry is permitted. Recovery requires human review, a new approval reference and a freshly
reconciled service/control context.

## Durable PostgreSQL implementation

B4 retains an in-memory adapter for unit tests, but durable runtime composition now requires a
genuine `PostgresQaResetRepository`. Authenticated dry-run/readiness use its guarded inspection
contract; authenticated prepare/cleanup construct a durable request only after authorization and
execute the fixed relational mutator through the guarded Prisma port.

The PostgreSQL design uses one transaction per mutation using a transaction-scoped
advisory lock derived from immutable cluster ID plus manifest checksum. Repository statements must
address only manifest-owned primary keys with exact tenant and namespace predicates, verify
affected-row counts after every dependency step, and abort on any mismatch. No `TRUNCATE`, broad
`DELETE`, dynamic table name, arbitrary predicate or automatic partial retry is permitted.
Transactional rollback and advisory-lock exclusion are verified against a disposable local
PostgreSQL cluster as described below. External behavior remains unverified.

The local exact-mutation plan now maps every supported manifest entity to one fixed repository
table. It emits deterministic preparation order and reverse cleanup order, fails closed when the
policy is incomplete or an ownership mode is incompatible, and treats the pre-existing
`ORGANIZATION_OWNER` access-role definition as a verify/preserve reference rather than a mutable
fixture. The durable repository validates this plan before entering its transaction boundary.
This plan does not connect to or mutate a database.

The plan also validates every relational dependency by record ID, expected entity type and
preparation position. The schema cycle between `WorkerOffer.currentTermsVersionId` and
`WorkerOfferTermsVersion.workerOfferId` is represented explicitly as a transaction-local
two-phase operation: insert the offer without its optional current-terms pointer, insert the terms
record, then bind the offer pointer before final verification. Missing, wrong-type or late
dependencies fail closed.

Durable requests also carry a compiled-mutation-plan checksum. That checksum binds the manifest
checksum, operation, exact organization scope, ordered entity/table/action steps and record
identities. The repository recomputes it before opening a transaction, and the idempotency digest
binds both this compiled checksum and the state-observing dry-run checksum. A well-formed but
unrelated 64-character checksum is therefore denied.

Shared work-group, role-definition and access-role catalogue records have manifest-wide lifecycle
even though the ownership ledger requires an internal tenant ID. A partial, single-organization
cleanup excludes these `syn:shared:*` records; only a full two-organization cleanup may remove
manifest-owned shared catalogue fixtures. Readiness independently requires the shared set to be
either wholly absent or wholly present, preventing a partially prepared shared catalogue from
appearing healthy.

The Prisma raw-SQL port is deny-by-default. Every statement requires a recognized
`qa-reset:*` policy tag, may contain only one statement, must use an approved statement class and
may touch only the fixed table associated with that tag and entity type. Untagged, unknown-tag,
unsupported-entity, wrong-table, multi-statement and DDL input is rejected before reaching Prisma.
Statement tags also constrain SQL class and shape: fixed control tags cannot be reused for another
operation class, every `UPDATE`/`DELETE` requires a parameterized `WHERE`, entity cleanup requires
the primary-key predicate `id = $1`, and inserts require explicit columns including `id` plus
parameterized `VALUES`. Broad mutations and default-value inserts fail closed.
Placeholder validation is exact: indexes start at `$1`, are contiguous through the highest index,
and the highest index must equal the supplied parameter count. Missing, skipped, zero-indexed or
unused parameters are rejected before Prisma is invoked.
Table validation is set-exact rather than subset-only. Each tagged query must touch its required
fixed table, cannot add another table and cannot substitute a tableless expression. The
transaction advisory-lock tag is the sole intentionally tableless statement.
Entity cleanup predicates are restricted to an exact conjunction beginning with `id = $1`;
`OR`, `USING`, expressions, reordered placeholders and unbounded suffixes are denied.

## Local completion boundary

The deterministic local QA-reset contract, fixed relational mutator, durable runtime composition,
local migration rehearsal and local PostgreSQL transaction evidence are complete. The complete
app suite passes **89 tests across 12 files**, including all nine loopback HTTP tests. The
environment-gated PostgreSQL lifecycle test also passes **1/1** against a fresh disposable database
with all 11 migrations. Staging
configuration, external migration application, external PostgreSQL evidence and launch approval
remain outside local completion.

Owner correction, 2026-07-29: the independent database witness is deferred and required for external staging
validation, not ordinary local development. Local schema preparation, migration tests and an
isolated disposable local PostgreSQL database containing synthetic data are authorized. This
workspace includes PostgreSQL server binaries, which were used to create an isolated disposable
localhost cluster under `/tmp`. All 11 repository migrations applied successfully. The resulting
database contained all five QA-reset control tables and 30 associated constraints. A synthetic
transaction insert followed by rollback left zero rows, and a second connection was denied
(`pg_try_advisory_xact_lock = false`) while the first transaction held the QA-reset advisory lock.
The cluster was stopped and its temporary directory removed after validation.

Re-run the complete disposable-database proof with:

```sh
npm run qa-reset:postgres:validate
```

The command fails when required PostgreSQL binaries are absent, uses a unique `/tmp` cluster and
localhost port, applies migrations, checks migration/constraint counts, proves rollback and lock
exclusion, and removes the cluster through an exit trap.

## Retention and logging

Local dry-run and audit controls are pruned after the proposed 30-day period. External staging
retention, soft deletion, legal holds and recovery evidence still require privacy/legal, QA and
database-owner approval.

Logs contain only safe operation/scope/count/release/manifest/correlation/status information. They
exclude credentials, tokens, raw headers, complete payloads, record IDs and personal data.

## Required runtime environment names

- `PORT`, `RWOS_ENV`
- `QA_RESET_AUTH_MODE`, `QA_RESET_AUDIENCE`
- `QA_RESET_BROWSER_E2E_APP_CREDENTIAL`, `QA_RESET_BROWSER_E2E_SERVICE_ACCOUNT`,
  `QA_RESET_BROWSER_E2E_OPERATOR_IDENTITY`
- `QA_RESET_IOS_E2E_APP_CREDENTIAL`, `QA_RESET_IOS_E2E_SERVICE_ACCOUNT`,
  `QA_RESET_IOS_E2E_OPERATOR_IDENTITY`
- `QA_RESET_ANDROID_E2E_APP_CREDENTIAL`, `QA_RESET_ANDROID_E2E_SERVICE_ACCOUNT`,
  `QA_RESET_ANDROID_E2E_OPERATOR_IDENTITY`
- `QA_RESET_MANUAL_QA_APP_CREDENTIAL`, `QA_RESET_MANUAL_QA_SERVICE_ACCOUNT`,
  `QA_RESET_MANUAL_QA_OPERATOR_IDENTITY`
- `QA_RESET_MONITORING_APP_CREDENTIAL`, `QA_RESET_MONITORING_SERVICE_ACCOUNT`
- `QA_RESET_RELEASE_SHA`
- `QA_RESET_PROJECT_ID`, `QA_RESET_CLUSTER_ID`, `QA_RESET_DATABASE_ID`
- `QA_RESET_AUTHORITY_ID`
- `QA_RESET_TENANT_A_ID`, `QA_RESET_TENANT_B_ID`
- `QA_RESET_NAMESPACE`
- `QA_RESET_MANIFEST_ID`, `QA_RESET_MANIFEST_CHECKSUM`
- `QA_RESET_MANIFEST_CREATED_AT`, `QA_RESET_MANIFEST_EXPIRES_AT`
- `QA_RESET_DRY_RUN_APPROVAL_REFERENCE`
- `QA_RESET_PREPARE_APPROVAL_REFERENCE`
- `QA_RESET_CLEANUP_APPROVAL_REFERENCE`
- `QA_RESET_MAXIMUM_RECORDS_PER_ENTITY`

Values and secret-manager references are deliberately absent.

Reset mutations require two independent headers. `Authorization` is reserved for the verified
Google identity token, while `x-rwos-app-authorization` carries the server-side application
credential. Browser, iOS, Android and manual-QA runners have distinct identities. Browser can use
the browser reset shape, iOS and Android can use only the native shape, and manual QA is limited to
browser-shaped dry runs. Monitoring can call only authenticated `GET /v1/qa-reset/status`; it
cannot invoke a reset. The public `/health` and `/ready` routes remain safe platform probes, with
readiness failing until an identity verifier is injected.

Application credentials are runner/server secrets. They must never be placed in browser
JavaScript, Expo public configuration, native application bundles or client-visible environment
variables.

Suggested eventual staging shape: 0.5–1 vCPU, 512 MiB, concurrency 1, timeout 120 seconds and
min/max `0/1`. This is not authorization to create or run it against a database. Nothing in this
runbook claims external staging or production readiness.
