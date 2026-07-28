# Staging Validation

Run this only against an authorized non-production target whose database name explicitly contains
`staging`, `stage`, `validation`, or `test`.

Required configuration is supplied by the approved secret manager:

- `RWOS_ENV=production`
- `NODE_ENV=production`
- `RWOS_STAGING_VALIDATION_CONFIRMATION=authorized-staging-validation`
- `RWOS_RELEASE_SHA` as the full lowercase 40-character release commit
- `DATABASE_URL`
- `INTERNAL_API_ORIGIN`
- `AUTH_RATE_LIMITER_ORIGIN`, `AUTH_RATE_LIMITER_TOKEN`, `AUTH_RATE_LIMITER_KEY_SECRET`
- `CANDIDATE_SOURCE_ORIGIN`, `CANDIDATE_SOURCE_TOKEN`
- `OFFER_DELIVERY_ORIGIN`, `OFFER_DELIVERY_TOKEN`
- `SECRET_MANAGER_PROVIDER`
- `MONITORING_HEALTHCHECK_URL`
- `PAGING_HEALTHCHECK_URL`

Execute:

```sh
pnpm validate:staging
RWOS_TEST_DATABASE_URL="<approved-staging-admin-database-url>" \
RWOS_TEST_DATABASE_CLUSTER_ID="<immutable-approved-staging-cluster-id>" \
RWOS_PRODUCTION_DATABASE_CLUSTER_ID="<immutable-production-cluster-id>" \
RWOS_RELEASE_SHA="<full-release-commit-sha>" \
RWOS_TEST_DATABASE_CONFIRMATION=disposable-test-target \
pnpm test:postgres:required
```

The first command checks repository boundaries, migration integrity, HTTPS dependency health,
database connectivity, and applied migration state. It rejects localhost, an unlabeled database,
missing staging authorization, missing providers, insecure URLs, and shared limiter credentials.
The staging database URL must use `sslmode=require`, `verify-ca`, or `verify-full`. A passing result
emits the non-secret release SHA. The command performs no schema or business-data mutations.

The PostgreSQL concurrency command is intentionally separate because it creates test records. It
creates a uniquely named database, applies all migrations, runs the real concurrency suites, and
drops only that generated database afterward. The database role therefore requires temporary
`CREATEDB` authority on the approved validation server. It rejects an unlabeled database, a missing
confirmation, a target equal to `DATABASE_URL`, and matching approved staging/production cluster
identifiers. The identifiers must come from the database owner/provider inventory, not URL parsing.
The admin database URL must identify a separate, explicitly staging/test-labelled database on that
server and preserve any required TLS parameters.
