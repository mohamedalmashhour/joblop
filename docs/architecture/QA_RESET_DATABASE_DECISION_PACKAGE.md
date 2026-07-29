# QA-Reset Database Decision Package

Status: **LOCAL IMPLEMENTATION VALIDATED — EXTERNAL APPLICATION, VALIDATION AND READINESS BLOCKED**

Committed implementation checkpoint: `69686c527f41cc4b1138a8ddc84c6c9ef60f0d47`

The Release and Product Owner authorized local implementation at this checkpoint. Schema and
migration files may be prepared and validated locally without applying them to an external
database. External database access, migration application, staging mutation, deployment and B5.7
remain blocked until the external-stage approvals below are complete.

## Repository evidence and constraints

The current QA-reset service has:

- a fixed relational mutator covering all 24 approved manifest entity types;
- durable asynchronous PostgreSQL inspection plus transactional prepare/cleanup;
- transaction-scoped advisory locking and persistent reset-control state;
- an approved manifest containing environment, project, cluster, database, authority, tenant,
  namespace, release, approval, lifecycle-time and record information;
- deterministic dry-run checksums and prepare/cleanup receipts;
- fail-closed behavior after partial or unknown outcomes;
- 70 denial cases spanning live cross-organization reference swaps and fixed-template tampering
  against retained audit evidence.

The current Prisma schema and non-applied migration now contain QA-reset manifest, tenant,
ownership, control-run and lifecycle-event models. Existing operational primary keys are
PostgreSQL UUIDs, while the local B4 manifest uses
readable internal synthetic record keys such as `syn:tenant-a:assignment:01`. Human-facing
evidence calls the two fictional, synthetic-data-only fixtures **Test Employer Organization A**
and **Test Employer Organization B**. Here, `tenant` refers only to the internal security and
data-isolation concept. A database implementation
must therefore use approved UUID target IDs in the signed manifest and retain the readable key
only as a non-authoritative manifest reference. It must not attempt to insert the local readable
key into UUID primary-key columns.

The generic `AuditEvent` model requires a UUID entity ID and actor reference. It can receive a
high-level QA-reset event later, but it does not replace reset-specific ownership, idempotency and
recovery records.

### Application-payload contract — resolved locally

The earlier persistence/control implementation proved ownership, locking, receipts and recovery
but did not contain enough approved data to create truthful application rows. The approved
expanded manifest now provides:

- exact deterministic manifest-owned Test Employer Organization A/B organization, test-location,
  department, work-group and role IDs;
- synthetic User identity, verification, membership and access-role state;
- Job Request title, type, schedule, timezone, creator and approved lifecycle path;
- Dispatch lifecycle state and capacity inputs;
- Worker Offer expiry, terms version, response and governed acceptance state;
- Assignment schedule, terms, creator and validation/capacity timestamps;
- ownership for supporting User Identity, membership-role, offer-terms and offer-response records.

Directly inventing additional values or inserting later workflow states would still bypass
existing service rules. The typed payload/reference contract, fixed mutation-plan mapping, guarded
SQL execution and durable repository composition are implemented locally. No external operational
database is configured or authorized.

### Owner-approved local fixture contract — 2026-07-29

The Release and Product Owner approved local implementation of the recommended self-contained
fixture contract at checkpoint `69686c527f41cc4b1138a8ddc84c6c9ef60f0d47`:

- Test Employer Organization A and Test Employer Organization B fixtures are staging-only and must
  never load in production. They are not apartment tenants, residents or real companies.
- Their deterministic graphs include supported staffing-calendar, candidate/dispatch, synthetic
  delivery-attempt, assignment, attendance, draft-timesheet and internal-audit paths. Every
  organization-owned reference must resolve to a record owned by the same organization.
- Delivery uses no provider or real destination, attendance stores no real location evidence, and
  draft timesheets contain no payroll, payment, invoicing or tax calculation.
- All fixture IDs are deterministic UUIDs and every supporting fixture record is manifest-owned.
- Synthetic login identifiers use the reserved `.invalid` domain and contain no real personal
  information.
- Synthetic identities are active and verified only inside the isolated fixture contract, with
  the minimum test roles required for the approved journey.
- Dates use `America/Toronto` and a deterministic future weekday schedule.
- Offer terms are non-economic; compensation and every money-related field remain null.
- The fixture follows the existing governed dependency chain through an assignment-ready state.
- Synthetic Residence, Department, Work Group and Role records are owned by the manifest rather
  than borrowed from an unknown external catalogue.
- Cleanup removes only exact manifest-owned records in reverse dependency order.
- Control evidence retention is 30 days; application fixture rows are cleaned immediately after
  the approved journey.

This authorization permits local manifest, schema, migration rehearsal, fixed-mutator, fake
executor and isolated disposable PostgreSQL tests. It does not authorize an external database connection, migration application,
staging execution, deployment, production access, real credentials/data or launch.

The fixed local mutation plan and relational mutator cover every one of the 24 manifest entity
types with an explicit table mapping,
deterministic dependency order, reverse cleanup order and deny-by-default ownership policy.
Approved references are verified and preserved; manifest-owned records are prepared and cleaned
by exact identity. The plan is validated before the durable transaction contract can proceed and
does not itself contain connection or migration execution authority.

All relational references are checked for existence, expected entity type and dependency order.
The required `WorkerOffer`/current `WorkerOfferTermsVersion` schema cycle is handled only through
an explicit two-phase bind inside the transaction; it does not weaken foreign-key
enforcement or authorize a deferred cross-transaction repair.

The compiled plan has its own SHA-256 checksum over the manifest checksum, operation,
organization scope and ordered exact mutation steps. Durable request validation recomputes this
value, and idempotency identity includes both the compiled-plan checksum and dry-run checksum.
Neither checksum is accepted based on format alone.

Shared catalogue rows are never treated as Organization A application data merely because the
ownership ledger carries Organization A's internal tenant ID. Single-organization cleanup
preserves all `syn:shared:*` rows; their cleanup is available only to the full two-organization
scope. Shared readiness is all-or-none.

The local Prisma executor no longer treats generic `SELECT`/`INSERT`/`UPDATE`/`DELETE` syntax as
sufficient authority. It requires an approved QA-reset policy tag and verifies the fixed table
associated with that tag or entity type. It rejects wrong-table, unknown-tag, multi-statement and
DDL input before invoking the database client.
Policy tags are bound to statement classes and bounded parameterized shapes. Broad updates/deletes,
cleanup without `id = $1`, and inserts without an explicit parameterized ID are denied before
Prisma execution.
SQL placeholders and bound parameters must also match exactly: one-based contiguous indexes, no
gaps, no missing values and no unused values.
Tagged statements must touch exactly their expected table set. Empty/tableless substitutions are
denied except for the transaction advisory-lock function call.
Cleanup predicates are exact conjunctions beginning with `id = $1`; `OR`, `USING`, expression
predicates and placeholder reordering are denied.

Owner correction, 2026-07-29: independent-witness approval is deferred to external staging
validation. It is not required for continued local coding, schema preparation, migration tests or
execution against an isolated disposable local PostgreSQL database containing synthetic data.
External/shared databases, GCP, staging, production migrations and deployment remain blocked.

Local disposable PostgreSQL evidence, 2026-07-29:

- all 11 repository migrations applied successfully to a localhost-only temporary cluster;
- all five QA-reset control tables resolved and 30 table constraints were present;
- a synthetic manifest insert rolled back atomically and left zero rows;
- a concurrent connection received `false` from `pg_try_advisory_xact_lock` while the first
  transaction held the same derived lock;
- the disposable server was stopped and its `/tmp` data directory removed after validation.

Local application evidence:

- 24/24 entity types have deterministic positive fixtures and fixed prepare behavior; cleanup
  exactly deletes all deletable fixtures, preserves the approved shared role reference and
  verifies the immutable retained audit evidence;
- 70 denial cases cover live cross-organization reference swaps plus fixed-template retained-audit
  tampering; the outbound-reference-free types remain roots or shared catalogue definitions;
- durable readiness and dry-run use guarded manifest/owned-record reads and fail closed for
  missing, foreign, partial, blocked or unavailable state;
- durable prepare/cleanup derive caller identity digests only after authorization, bind dry-run
  and mutation-plan checksums, and execute through the transaction repository;
- 89 QA-reset tests across 12 files pass locally, including nine HTTP contract tests; the
  environment-gated 24-entity PostgreSQL lifecycle test also passes 1/1 on a fresh disposable
  database with all 11 migrations.

These results establish local correctness only. They do not claim external staging, shared
database, production migration, deployment or launch readiness. Nour Al Mashhour’s independent
witness review remains a future gate for external staging validation.

## Implemented local ownership schema

The following logical schema is implemented in Prisma and the repository migrations. It has been
applied only to the isolated disposable local PostgreSQL cluster described above, never to an
external database.

### `QaResetManifestOwnership`

One immutable ownership envelope for an approved manifest.

| Field                      | Proposed type/rule                                             |
| -------------------------- | -------------------------------------------------------------- |
| `id`                       | UUID primary key                                               |
| `manifestReference`        | Bounded unique external manifest reference                     |
| `manifestChecksum`         | Unique lowercase SHA-256, fixed 64 characters                  |
| `namespace`                | Exact `rwos:qa-reset:staging:v1`; unique with checksum         |
| `environment`              | Enum; only `staging` permitted                                 |
| `projectId`                | Immutable provider-qualified ID                                |
| `clusterId`                | Immutable provider-qualified ID                                |
| `databaseId`               | Immutable provider-qualified ID                                |
| `authorityId`              | Immutable reset-authority ID                                   |
| `releaseSha`               | Exact lowercase 40-character checkpoint SHA                    |
| `status`                   | `draft`, `approved`, `active`, `expired`, `revoked`, `retired` |
| `createdAt`                | Database UTC timestamp                                         |
| `approvedAt`               | Nullable database UTC timestamp                                |
| `expiresAt`                | Required UTC timestamp                                         |
| `retentionUntil`           | Required UTC timestamp                                         |
| `approvalReference`        | Immutable external approval-record reference                   |
| `retentionOwnerReference`  | Immutable privacy/retention approval reference                 |
| `createdByCallerAlias`     | Bounded non-secret alias                                       |
| `createdByPrincipalDigest` | SHA-256/HMAC digest; never raw service-account email           |
| `version`                  | Optimistic concurrency integer                                 |

Updates after `approved` are limited to lifecycle transitions, expiry, revocation and retention
metadata. Manifest checksum, namespace, targets, tenants, release and record ownership are
immutable.

### `QaResetManifestTenant`

| Field         | Proposed type/rule                               |
| ------------- | ------------------------------------------------ |
| `id`          | UUID primary key                                 |
| `manifestId`  | Restrict-delete FK to manifest ownership         |
| `tenantId`    | UUID FK only after tenant authority is confirmed |
| `tenantAlias` | `tenant-a` or `tenant-b`; non-personal           |
| `createdAt`   | Database UTC timestamp                           |

Unique constraints: `(manifestId, tenantId)` and `(manifestId, tenantAlias)`. Exactly two tenants
are enforced by the service plus migration/rehearsal checks; a request cannot add a tenant.

### `QaResetOwnedRecord`

| Field               | Proposed type/rule                                         |
| ------------------- | ---------------------------------------------------------- |
| `id`                | UUID primary key                                           |
| `manifestId`        | Restrict-delete FK to manifest ownership                   |
| `tenantId`          | Approved tenant UUID                                       |
| `namespace`         | Copied immutable namespace for defensive predicates        |
| `entityType`        | Compiled enum of the 24 approved B4 entity types           |
| `manifestRecordKey` | Bounded readable manifest reference; not an operational PK |
| `targetRecordId`    | Approved UUID of the operational record                    |
| `lifecycleStatus`   | `declared`, `prepared`, `verified`, `cleaned`, `blocked`   |
| `preparedAt`        | Nullable database UTC timestamp                            |
| `verifiedAt`        | Nullable database UTC timestamp                            |
| `cleanedAt`         | Nullable database UTC timestamp                            |
| `createdAt`         | Database UTC timestamp                                     |
| `updatedAt`         | Database UTC timestamp                                     |

Unique constraints: `(manifestId, entityType, targetRecordId)` and
`(manifestId, manifestRecordKey)`. Every prepare/cleanup statement predicates on manifest,
namespace, tenant, entity type and exact UUID. No dynamic table name, wildcard, request-provided
predicate or broad delete is allowed.

### `QaResetControlRun`

Persistent idempotency and recovery state for one operation.

| Field                    | Proposed type/rule                                                                     |
| ------------------------ | -------------------------------------------------------------------------------------- |
| `id`                     | UUID primary key                                                                       |
| `manifestId`             | Restrict-delete FK                                                                     |
| `operation`              | `dry_run`, `prepare`, `cleanup`                                                        |
| `scope`                  | `browser`, `ios`, `android`, `manual_qa`                                               |
| `idempotencyDigest`      | Unique SHA-256 digest of operation, manifest, release, tenants and approved run ID     |
| `planChecksum`           | Fixed lowercase SHA-256                                                                |
| `preparationReceipt`     | Nullable fixed lowercase SHA-256                                                       |
| `resultReceipt`          | Nullable fixed lowercase SHA-256                                                       |
| `callerAlias`            | Approved non-secret alias                                                              |
| `callerPrincipalDigest`  | SHA-256/HMAC digest, not a raw identity                                                |
| `approvalReference`      | Exact operation-specific approval                                                      |
| `correlationId`          | Bounded non-secret correlation ID                                                      |
| `status`                 | `planned`, `running`, `succeeded`, `failed`, `unknown`, `blocked`, `cleanup_completed` |
| `failureCategory`        | Nullable bounded enum; no exception detail                                             |
| `expectedRecordCount`    | Non-negative bounded integer                                                           |
| `observedRecordCount`    | Nullable non-negative bounded integer                                                  |
| `startedAt`              | Nullable database UTC timestamp                                                        |
| `completedAt`            | Nullable database UTC timestamp                                                        |
| `retentionUntil`         | Required database UTC timestamp                                                        |
| `version`                | Optimistic concurrency integer                                                         |
| `createdAt`, `updatedAt` | Database UTC timestamps                                                                |

One unique control run exists for an idempotency digest. A second request returns the recorded
terminal receipt, resumes only an explicitly recoverable `planned` run, or fails closed for
`unknown`/`blocked`.

### `QaResetControlEvent`

Append-only lifecycle evidence linked to a control run.

| Field                   | Proposed type/rule                      |
| ----------------------- | --------------------------------------- |
| `id`                    | UUID primary key                        |
| `controlRunId`          | Restrict-delete FK                      |
| `sequence`              | Monotonic integer unique within the run |
| `eventType`             | Bounded lifecycle enum                  |
| `priorStatus`           | Nullable lifecycle status               |
| `newStatus`             | Lifecycle status                        |
| `callerAlias`           | Non-secret alias                        |
| `callerPrincipalDigest` | SHA-256/HMAC digest                     |
| `safeCount`             | Nullable bounded aggregate              |
| `reasonCategory`        | Nullable bounded category               |
| `createdAt`             | Database UTC timestamp                  |

Events exclude tokens, credentials, raw headers, emails, database URLs, record payloads and raw
service-account identities.

## Locking alternatives

| Design                          | Concurrency exclusion                                                | Recovery/idempotency                                       | Auditability                         | Primary weakness                                                     |
| ------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------ | -------------------------------------------------------------------- |
| Advisory locks only             | Strong while the transaction/session is alive                        | No durable ownership or prior-result record                | Database logs only                   | Cannot explain or recover a prior request after disconnect/restart   |
| Persistent control records only | Requires exact row locks, unique constraints and careful transitions | Durable lifecycle and receipt                              | Strong                               | A missing/incorrect row-lock path can permit concurrent work         |
| Both together                   | Transaction-scoped exclusion plus row/unique-constraint enforcement  | Durable lifecycle, ownership, receipt and recovery context | Strongest application-level evidence | More schema and transition complexity; requires disciplined ordering |

Repository evidence shows no conflict with using both. The in-memory design already separates
`ResetLock` from `ResetControlStore`, which maps naturally to an advisory-lock implementation plus
persistent control records.

## Recommended mechanism

Use **both transaction-scoped PostgreSQL advisory locks and persistent reset-control records**.

1. Derive a stable advisory-lock key from the exact cluster ID plus manifest checksum. The
   derivation is fixed and tested; request input never supplies SQL or a lock integer directly.
2. Start one database transaction and acquire `pg_advisory_xact_lock`.
3. Read the immutable manifest and control run using exact IDs; lock the control row.
4. Revalidate environment, project, cluster, database, authority, release, expiry, tenants,
   namespace, caller alias/digest, operation approval and checksum.
5. Reject `unknown`, `blocked`, expired, revoked or mismatched state.
6. Apply only exact manifest-owned UUID operations in compiled dependency order.
7. Verify every affected-row count and the final manifest-owned state.
8. Update ownership rows, append lifecycle evidence and write the terminal receipt in the same
   transaction.
9. Commit. The transaction-scoped advisory lock releases automatically.

The persistent unique idempotency digest is a second concurrency defense and the source of prior
results. Advisory locks are never treated as evidence or durable state.

### Failure and recovery behavior

- Validation, count or ownership mismatch: roll back and transition the control authority to
  `blocked` through a separately reviewed recovery record.
- Database error before commit: transaction rolls back; no partial application state is claimed.
- Connection loss during commit: result is `unknown` to the caller. Do not retry mutation. Reconnect
  read-only and reconcile the control receipt plus exact owned records.
- Terminal `succeeded`/`cleanup_completed`: return the existing receipt idempotently.
- `planned` with no owned changes: a same-digest retry may proceed after review.
- `running`, `unknown` or `blocked`: no automatic retry.
- Unexpected record in the namespace: readiness and every mutation fail closed.
- Recovery never performs broad rollback or restore. A restore remains a separate Backup/PITR
  authorization.

## Exact locally prepared schema and migration impact

The locally prepared, non-applied implementation contains:

1. Five new Prisma models corresponding to the tables above.
2. Manifest, operation, lifecycle and entity-type enums.
3. Restrict-delete foreign keys among manifest, tenant, owned-record, control-run and event tables.
4. Unique constraints for manifest checksum/reference, ownership keys, tenant membership,
   idempotency digest and event sequence.
5. Indexes on manifest status/expiry, namespace/tenant/entity, run status/retention and event time.
6. Check constraints, added through reviewed SQL where Prisma cannot express them, for SHA lengths,
   non-negative counts, lifecycle timestamps and staging-only environment.
7. No modification to existing operational models in the first migration.
8. No cascade from a QA table into operational user, organization, request, offer or assignment
   records.
9. A later repository implementation changing approved manifest target IDs from readable strings
   to UUIDs while preserving separate readable manifest keys.
10. Migration checksum registration and a rehearsal against a separately authorized disposable
    database before any staging use.

No extension to operational models was made. The migrations were rehearsed only against the
isolated disposable local database and remain unapplied to any external database.

## Retention and deletion proposal

- Synthetic operational records: clean immediately after the approved validation journey.
- Dry-run plans, control runs and lifecycle events: retain for **30 days after the later of**
  terminal completion or manifest expiry.
- `unknown`, `blocked`, active legal-hold or unresolved incident records: never auto-delete.
- Approval records and external evidence: follow the separately approved privacy/legal evidence
  policy; this proposal does not shorten a legal or incident hold.

Deletion is a scheduled, manifest-scoped maintenance action:

1. Select only terminal records whose `retentionUntil` is in the past and have no hold.
2. Produce a dry-run count grouped by manifest and lifecycle status.
3. Require privacy/retention-owner approval for the deletion batch.
4. Delete control events, control runs, owned-record tombstones, tenant rows and retired manifest
   ownership in dependency order using exact IDs and bounded batches.
5. Preserve unrelated generic audit records according to their own approved policy.
6. Record aggregate deletion evidence without identifiers or personal data.
7. Stop on any count mismatch; never broaden predicates or retry an unknown outcome automatically.

The 30-day proposal remains unresolved until the Privacy/Retention Owner approves it.

## External approval boundary

Ordinary local implementation and isolated disposable-database testing do not require an
independent witness form. Before external staging validation, the release evidence must identify
the exact scope, checkpoint, approval time and expiration for the external database, security,
privacy/retention and release authorities. Nour Al Mashhour’s independent database witness review
is deferred to that external-validation phase. No local result in this package substitutes for
that future review or authorizes GCP, a shared database, staging, production, deployment, spending
or B5.7.

## External-validation acceptance criteria

- Approved schema and migration exactly match the signed decision.
- No schema change overlaps unrelated work.
- Exact manifest and UUID ownership are validated before every statement.
- Advisory lock and persistent idempotency are both active.
- Two concurrent same-manifest operations produce one mutation and one recorded result.
- Cross-manifest, cross-tenant, cross-namespace and cross-release requests fail closed.
- Prepare and cleanup are atomic and verify exact affected-row counts.
- Repeated terminal requests return the same receipt.
- Commit ambiguity produces `unknown`/blocked behavior and no automatic mutation retry.
- Foreign records in the namespace block readiness and mutation.
- Cleanup preserves unrelated and generic audit records.
- Logs/evidence contain no credentials, raw identities, personal data or payloads.
- Prisma validation/generation, migration integrity, lint, typecheck and all local tests pass.
- Disposable-PostgreSQL transaction/concurrency evidence exists before staging approval.
- Named database owner and independent witness sign the evidence for the exact release.

## Rollback and stop conditions

Stop before or during external validation when:

- any named approval is missing, expired or broader than its recorded scope;
- the checkpoint, schema, migration checksum, project, cluster, database or manifest differs;
- the target is production-like, mutable, unknown or contains non-synthetic data;
- an ownership predicate or affected-row count is ambiguous;
- a migration would alter existing operational ownership without separate approval;
- a lock cannot be acquired or durable state disagrees with application state;
- retention, legal-hold or audit requirements are unresolved;
- a credential, raw identity or personal record would enter logs/evidence;
- a transaction result is unknown.

Rollback during local implementation means revert only the isolated code/migration under
explicit authority. Rollback during a future database exercise means abort the transaction,
preserve evidence and reconcile read-only. It never means broad delete, automatic retry, production
access or an unrehearsed restore.

## Remaining external choices

1. Exact external staging project, cluster, database and execution window.
2. Completed independent witness review for that external-validation scope.
3. External retention approval, legal-hold behavior and deletion operator.
4. Whether one generic `AuditEvent` is also written per terminal reset run.
5. Whether `unknown` records require indefinite retention or a separately approved maximum.

B5.7, External Validation Phase 1, external migration application and all external work remain
**BLOCKED**. Runtime database wiring is implemented locally but is not externally configured or
validated.
