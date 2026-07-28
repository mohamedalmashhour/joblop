# Database Backup, Restore, and Migration Runbook

Status: local safety tooling is implemented. Production backup/PITR configuration, credentials,
provider evidence, named operators, and deployment authorization remain external launch gates.

## Non-negotiable stop conditions

Stop before any database change when any item is missing:

1. named release owner, database owner, reviewer, and incident decision owner;
2. immutable application commit/image and reviewed migration checksum manifest;
3. explicit target environment, hostname fingerprint, database name, and migration credential;
4. completed provider backup/PITR marker and a recent successful isolated restore drill;
5. approved RPO, RTO, lock budget, migration-duration budget, and rollback decision deadline;
6. healthy readiness, error/latency monitoring, storage, replication, and connection capacity;
7. proof that the prior application is compatible with the expanded schema;
8. confirmation that production mutation kill switches remain enabled.

Never paste a database URL, credential, worker/employer information, query result, or record contents
into an evidence file.

## Local artifact preflight

Run each command separately and stop at the first failure:

```sh
pnpm validate:migrations
```

Expected: `MIGRATION_INTEGRITY_VALIDATION_PASS`. This proves committed migration names, provider
lock, checksums, and absence of unreviewed DROP/TRUNCATE statements. It does not prove the SQL is
safe at production scale.

```sh
pnpm --filter @rwos/database prisma:validate
```

```sh
pnpm --filter @rwos/database prisma:generate
```

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Manually review every pending SQL file for table rewrites, blocking indexes, constraint validation,
backfills, nontransactional statements, and data preconditions. Populated-schema changes must use
an expand/backfill/validate/contract sequence across compatible releases.

## Logical restore rehearsal

This command is intentionally destructive only to the target database. It refuses to run unless the
target database name contains `rehearsal` or `restore_test`, differs from the source, uses
PostgreSQL, matches an independently supplied `host/account/database` identity, contains the
`rwos_restore_rehearsal_guard` disposable-target sentinel, and receives the exact confirmation
phrase.

```sh
RWOS_REHEARSAL_SOURCE_DATABASE_URL='<secret source URL>' \
RWOS_REHEARSAL_TARGET_DATABASE_URL='<secret disposable target URL>' \
RWOS_REHEARSAL_SOURCE_CLUSTER_ID='<immutable source cluster ID>' \
RWOS_REHEARSAL_TARGET_CLUSTER_ID='<immutable disposable restore cluster ID>' \
RWOS_REHEARSAL_TARGET_IDENTITY='<target-host>/<target-account>/<target-database>' \
RWOS_RELEASE_SHA='<full lowercase 40-character release commit>' \
RWOS_REHEARSAL_CONFIRM='restore-to-disposable-database' \
pnpm db:restore:rehearse
```

The source and target cluster IDs must come independently from the database provider inventory and
must differ. They must be stable provider-qualified identities with at least three segments; mutable
labels such as `current`, `latest`, `unknown`, `placeholder`, or `tbd` are rejected. Remote database
URLs must require TLS using `sslmode=require`, `verify-ca`, or
`verify-full`. The command creates a temporary custom-format `pg_dump`, restores it with `pg_restore --clean
--if-exists` into the disposable target, checks Prisma migration status, verifies completed
migration rows, emits the release SHA and a SHA-256 evidence record, and removes the temporary dump.

Stop if the target identity is unexpected, the target contains data that must be retained, the dump
or restore fails, migrations are pending/failed, or any invariant check differs. Never modify the
guard to point at production.

## Staging migration rehearsal

1. Restore a recent protected production-like backup into a new isolated database.
2. Record a non-secret run ID, full lowercase 40-character release commit, migration
   names/checksums, UTC start, and baseline safe counts/invariants.
3. Run exactly one `prisma migrate deploy` job using a separate migration credential.
4. Record duration, lock waits, replication/storage effects, and `_prisma_migrations` status.
5. Run deploy again and prove it is a no-op.
6. Test the previous application against the expanded schema, then the new application.
7. Verify `/health`, `/ready`, authenticated read-only employer/admin paths, expected denials, and
   every production mutation kill switch.
8. Perform an isolated restore/PITR drill and record achieved RPO/RTO.

A disposable empty-schema migration is useful but does not replace the production-like rehearsal.

## Production execution

Production migration requires explicit deployment and database-owner approval.

1. Create and verify the provider-native backup/PITR marker. Record only the opaque job ID, UTC
   timestamp, encryption/retention state, and target fingerprint.
2. Restore that recovery point into an isolated database and complete verification before DDL.
3. Capture baseline readiness, migration history, schema fingerprint, safe invariant counts,
   storage, replication, pool, latency, and errors.
4. Run one singleton migration job. API replicas must never migrate independently at startup.
5. Stop immediately on timeout, unexpected lock, failed migration, readiness loss, invariant
   mismatch, or alert threshold. Do not edit `_prisma_migrations`, run `migrate resolve`, or retry
   blindly.
6. Verify migration status and the previous application before promoting a new application canary.
7. Promote gradually only after read-only canaries and the agreed observation window pass.

## Recovery decision tree

- Application defect with backward-compatible schema: route traffic to the previous immutable image
  and leave the additive schema in place.
- Transactional migration failure with no committed change: keep the previous application, inspect
  migration state, and create a reviewed forward fix.
- Partial/nontransactional migration with no later writes: freeze traffic and consider restoring
  into a new database, validating it, then performing an approved cutover.
- New-schema writes exist: do not automatically down-migrate or overwrite production. Freeze
  affected mutations and choose a forward repair or PITR plus governed reconciliation.
- Suspected tenant/privacy corruption: begin a security/privacy incident, preserve evidence, and do
  not perform destructive recovery without the incident and database owners.

Restore always goes to a new isolated database first. Repointing production, selecting a PITR
timestamp, reconciling writes, deleting a database/backup, or using `migrate resolve` requires
explicit human authorization.

## Evidence template

- status: planned / attempted / passed / failed / blocked / waived;
- run ID, environment label, commit/image digest;
- operator, reviewer, decision owner;
- UTC start/end and measured duration;
- migration names and SHA-256 values;
- opaque backup/PITR and restore job IDs;
- source/target fingerprints without credentials;
- measured RPO/RTO, lock time, replication/storage impact;
- migration status, schema/invariant verification, canary results;
- final decision, exceptions, corrective owner, and due date.

Provider screenshots or a “backup enabled” setting are insufficient. Launch evidence requires a
witnessed isolated restore/PITR drill and measured recovery results.
