# Production Database Diagnostic

Status: local read-only diagnostic tooling is implemented. Real production evidence remains
external and must be supplied by the database and deployment owners.

The command fails closed unless it receives an authorized production-only PostgreSQL target,
approved immutable cluster identity, full release SHA, explicit read-only confirmation, and an
owner-approved development-baseline JSON file:

```sh
RWOS_PRODUCTION_DATABASE_URL='<secret read-only production URL>' \
RWOS_PRODUCTION_DATABASE_CLUSTER_ID='<provider/account/immutable-cluster-id>' \
RWOS_PRODUCTION_BASELINE_PATH='<approved baseline JSON path>' \
RWOS_RELEASE_SHA='<full lowercase 40-character release SHA>' \
RWOS_PRODUCTION_DATABASE_READ_ONLY=confirmed \
RWOS_PRODUCTION_DIAGNOSTIC_CONFIRMATION=authorized-read-only-production-diagnostic \
pnpm diagnose:production-db
```

The target must be remote PostgreSQL, must not be labelled staging/test/rehearsal, and must require
`sslmode=require`, `verify-ca`, or `verify-full`. The tool begins a read-only transaction, verifies
that PostgreSQL reports the transaction as read-only, inventories columns and ID types, foreign-key
pairs and their source/target types, migration state, and schema objects, then compares every class
to the approved baseline. Drift, unknown/missing objects, incompatible foreign-key types,
incomplete/rolled-back migrations, missing authority, or missing inputs fail the command.

Successful output contains only the full release SHA, provider-qualified cluster ID, database name,
TLS mode, non-secret counts, and a SHA-256 inventory fingerprint. It never prints the database URL,
credentials, table contents, worker/employer records, or query errors.

The approved baseline must be reviewed and supplied by the database owner. A locally generated
baseline, local PostgreSQL run, policy test, or mocked inventory is not production evidence.
