# Staging Validation

Run this only against an authorized non-production target whose database name explicitly contains
`staging`, `stage`, `validation`, or `test`.

Required configuration is supplied by the approved secret manager:

- `RWOS_ENV=production`
- `NODE_ENV=production`
- `RWOS_STAGING_VALIDATION_CONFIRMATION=authorized-staging-validation`
- `RWOS_RELEASE_SHA` as the full lowercase 40-character release commit
- `RWOS_STAGING_DATABASE_CLUSTER_ID`, `RWOS_PRODUCTION_DATABASE_CLUSTER_ID`
- `DATABASE_URL`
- `INTERNAL_API_ORIGIN`
- `AUTH_RATE_LIMITER_ORIGIN`, `AUTH_RATE_LIMITER_TOKEN`, `AUTH_RATE_LIMITER_KEY_SECRET`,
  `AUTH_RATE_LIMITER_KEY_ID`, `AUTH_RATE_LIMITER_NAMESPACE`
- `CANDIDATE_SOURCE_ORIGIN`, `CANDIDATE_SOURCE_TOKEN`
- `OFFER_DELIVERY_ORIGIN`, `OFFER_DELIVERY_TOKEN`
- `AUTH_LIMITER_AUTH_MODE`, `AUTH_LIMITER_AUDIENCE`, `AUTH_LIMITER_API_SERVICE_ACCOUNT`
- `CANDIDATE_ADAPTER_AUTH_MODE`, `CANDIDATE_ADAPTER_AUDIENCE`,
  `CANDIDATE_ADAPTER_API_SERVICE_ACCOUNT`
- `OFFER_DELIVERY_ADAPTER_AUTH_MODE`, `OFFER_DELIVERY_ADAPTER_AUDIENCE`,
  `OFFER_DELIVERY_ADAPTER_API_SERVICE_ACCOUNT`
- `SECRET_MANAGER_PROVIDER`
- `MONITORING_HEALTHCHECK_URL`
- `PAGING_HEALTHCHECK_URL`

Execute:

```sh
RWOS_RELEASE_SHA="<full-release-commit-sha>" \
RWOS_STAGING_DATABASE_CLUSTER_ID="<immutable-approved-staging-cluster-id>" \
RWOS_PRODUCTION_DATABASE_CLUSTER_ID="<immutable-production-cluster-id>" \
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
Receiver readiness rejects `legacy-app-only` and a missing injected verifier in staging.
The staging database URL must use `sslmode=require`, `verify-ca`, or `verify-full`. A passing result
emits the non-secret release SHA, provider-qualified staging/production cluster IDs, and TLS mode.
Cluster IDs must contain at least three stable provider-inventory segments; mutable labels such as
`current`, `latest`, `unknown`, `placeholder`, or `tbd` are rejected. The command performs no schema
or business-data mutations.

The PostgreSQL concurrency command is intentionally separate because it creates test records. It
creates a uniquely named database, applies all migrations, runs the real concurrency suites, and
drops only that generated database afterward. The database role therefore requires temporary
`CREATEDB` authority on the approved validation server. It rejects an unlabeled database, a missing
confirmation, a target equal to `DATABASE_URL`, and matching approved staging/production cluster
identifiers. The identifiers must come from the database owner/provider inventory, not URL parsing.
The admin database URL must identify a separate, explicitly staging/test-labelled database on that
server and preserve any required TLS parameters.
