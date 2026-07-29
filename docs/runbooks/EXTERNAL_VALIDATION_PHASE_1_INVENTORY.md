# External Validation Phase 1 Inventory

Status: **BLOCKED PENDING OWNER-SUPPLIED STAGING AUTHORITY**

Release under validation:
`69686c527f41cc4b1138a8ddc84c6c9ef60f0d47`.

This inventory prepares an isolated staging validation run. It does not authorize production
access, deployment, migration, provider provisioning, secret creation, or use of a real environment
file. Secret values must be injected by the approved secret manager and must never be added to this
document, source control, command history, screenshots, or evidence records.

## 1. Named authorization required before provisioning or access

| Decision or owner            | Required record                                                                                      | Status  |
| ---------------------------- | ---------------------------------------------------------------------------------------------------- | ------- |
| Release owner                | Approves the exact release SHA above for staging validation                                          | Missing |
| Staging infrastructure owner | Authorizes the isolated provider project/account and service access                                  | Missing |
| Database owner               | Approves the staging cluster, disposable PostgreSQL target, TLS policy and temporary `CREATEDB` role | Missing |
| Security owner               | Approves secret-manager namespace, service credentials and evidence handling                         | Missing |
| QA owner                     | Approves isolated tenants, reset authority, test identities and cleanup procedure                    | Missing |
| Integration owners           | Approve candidate-source, offer-delivery and distributed-limiter staging endpoints                   | Missing |
| Monitoring owner             | Approves health-check and paging test destinations                                                   | Missing |

No provider action may begin until the relevant named owner and approval record are supplied.

## 2. Isolated provider inventory

Record identifiers only; do not record credentials.

| Component                          | Required non-secret inventory                                       | Isolation/acceptance requirement                                     | Status  |
| ---------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------- | ------- |
| Provider project/account           | Provider, account/project ID, region, owner                         | Dedicated non-production boundary                                    | Missing |
| Secret manager                     | Provider and staging namespace ID                                   | Access limited to approved staging principals                        | Missing |
| PostgreSQL staging cluster         | Provider/account/immutable cluster ID, hostname fingerprint, region | Remote, TLS, explicitly staging-labelled, not production             | Missing |
| Disposable PostgreSQL admin target | Immutable cluster ID and staging/test database name                 | Separate from application DB; temporary `CREATEDB`; cleanup approved | Missing |
| API                                | Immutable build/release ID and HTTPS origin                         | Exact SHA; production-mode configuration; mutations remain disabled  | Missing |
| Employer web                       | Immutable build/release ID and HTTPS origin                         | Exact SHA; isolated tenant only                                      | Missing |
| Admin web                          | Immutable build/release ID and HTTPS origin                         | Exact SHA; isolated tenant only                                      | Missing |
| Worker entry/API                   | Immutable build/release ID and HTTPS origin                         | Exact SHA; fixture paths unavailable                                 | Missing |
| Distributed limiter                | Immutable service ID, HTTPS origin, replica IDs                     | Atomic shared backend; at least two replicas                         | Missing |
| Candidate source                   | Immutable staging service/account ID and HTTPS origin               | Test records only                                                    | Missing |
| Offer delivery                     | Immutable staging service/account ID and HTTPS origin               | Test delivery records only; no real notifications                    | Missing |
| QA reset service                   | Immutable authority ID and HTTPS origin                             | Can affect only the two isolated staging tenants                     | Missing |
| Monitoring                         | Dashboard/rule IDs and HTTPS health-check URL                       | Staging-only alert routing                                           | Missing |
| Paging                             | Destination ID and HTTPS test URL                                   | Approved test destination; no production escalation                  | Missing |
| Artifact store                     | Provider/bucket/project ID and retention policy                     | Non-secret, privacy-reviewed test artifacts only                     | Missing |

The production database is not accessed in Phase 1. The database owner must provide only the
non-secret immutable production cluster identifier needed to prove that staging and production are
different.

## 3. Secret-manager references

The secret owner must create or identify references for these values. Supply references and access
authorization, not secret values, in the run record.

### Staging services

- `DATABASE_URL`
- `AUTH_RATE_LIMITER_TOKEN`
- `AUTH_RATE_LIMITER_KEY_SECRET` (must differ from the limiter token and all other secrets)
- `CANDIDATE_SOURCE_TOKEN`
- `OFFER_DELIVERY_TOKEN`

### Browser QA identities

- `RWOS_E2E_EMPLOYER_EMAIL` / `RWOS_E2E_EMPLOYER_PASSWORD`
- `RWOS_E2E_ADMIN_EMAIL` / `RWOS_E2E_ADMIN_PASSWORD`
- `RWOS_E2E_WORKER_EMAIL` / `RWOS_E2E_WORKER_PASSWORD`
- `RWOS_E2E_REVOKED_EMAIL` / `RWOS_E2E_REVOKED_PASSWORD`
- `RWOS_E2E_RESET_TOKEN`

### Native QA identities

- `RWOS_NATIVE_WORKER_EMAIL` / `RWOS_NATIVE_WORKER_PASSWORD`
- `RWOS_NATIVE_RESET_TOKEN`

## 4. Test identity and data inventory

| Identity/data                   | Required state                                                        | Status  |
| ------------------------------- | --------------------------------------------------------------------- | ------- |
| Tenant A                        | Active isolated staging organization with employer/admin memberships  | Missing |
| Tenant B                        | Distinct active isolated staging organization for cross-tenant denial | Missing |
| Employer account                | Active, unexpired Tenant A membership and approved role               | Missing |
| Administrator account           | Active, unexpired admin authorization                                 | Missing |
| Worker account                  | Active WorkerIdentity owned by the authenticated user                 | Missing |
| Revoked account                 | Revoked role assignment or membership; generic denial expected        | Missing |
| Expired account                 | Expired membership; generic denial expected                           | Missing |
| Inactive account/org            | Inactive membership or organization; generic denial expected          | Missing |
| Unknown-role account            | Role not in the authorization allowlist; fail closed                  | Missing |
| Missing-worker-identity account | Authenticated account without an active owned WorkerIdentity          | Missing |
| Candidate-source records        | Safe synthetic staging references bound to Tenant A                   | Missing |
| Delivery records                | Safe staging-only provider references; no real recipient              | Missing |
| Reset dataset                   | Deterministic initial state and cleanup manifest for both tenants     | Missing |

## 5. Non-secret environment inventory

The owner must confirm these exact values or references before execution:

- `RWOS_ENV=production`
- `NODE_ENV=production`
- `RWOS_STAGING_VALIDATION_CONFIRMATION=authorized-staging-validation`
- `RWOS_RELEASE_SHA=69686c527f41cc4b1138a8ddc84c6c9ef60f0d47`
- `RWOS_STAGING_DATABASE_CLUSTER_ID=<provider/account/immutable-staging-cluster-id>`
- `RWOS_PRODUCTION_DATABASE_CLUSTER_ID=<provider/account/immutable-production-cluster-id>`
- `INTERNAL_API_ORIGIN=<remote HTTPS staging origin>`
- `AUTH_RATE_LIMITER_ORIGIN=<remote HTTPS staging origin>`
- `CANDIDATE_SOURCE_ORIGIN=<remote HTTPS staging origin>`
- `OFFER_DELIVERY_ORIGIN=<remote HTTPS staging origin>`
- `SECRET_MANAGER_PROVIDER=<approved provider/namespace reference>`
- `MONITORING_HEALTHCHECK_URL=<remote HTTPS staging test URL>`
- `PAGING_HEALTHCHECK_URL=<remote HTTPS staging test URL>`

The database URL must use PostgreSQL, name an explicit staging/test database, reject localhost, and
include `sslmode=require`, `verify-ca`, or `verify-full`.

## 6. Execution sequence after authorization

1. The infrastructure and security owners provide the approved non-secret inventory and
   secret-manager references.
2. An authorized operator injects secrets into an ephemeral process environment. Do not create or
   edit `.env`.
3. Run:

   ```sh
   pnpm validate:staging
   ```

4. After the database owner separately approves the disposable target and temporary `CREATEDB`
   authority, run:

   ```sh
   RWOS_TEST_DATABASE_URL='<injected approved staging admin URL>' \
   RWOS_TEST_DATABASE_CLUSTER_ID='<immutable staging cluster ID>' \
   RWOS_PRODUCTION_DATABASE_CLUSTER_ID='<immutable production cluster ID>' \
   RWOS_RELEASE_SHA='69686c527f41cc4b1138a8ddc84c6c9ef60f0d47' \
   RWOS_TEST_DATABASE_CONFIRMATION=disposable-test-target \
   pnpm test:postgres:required
   ```

5. After QA approves the isolated tenants, accounts and reset service, run:

   ```sh
   pnpm test:e2e:browser
   ```

6. Retain redacted command results, UTC timestamps, immutable provider IDs, release SHA, health
   results, migration status, browser versions, traces/screenshots, record IDs and cleanup result.

## 7. Phase 1 evidence acceptance

The Phase 1 evidence package must contain:

- exact release SHA and immutable build IDs;
- provider project/account, region and immutable service/cluster IDs;
- named authorization records and UTC execution window;
- redacted secret-manager reference list;
- TLS mode and staging/production cluster-separation proof;
- health-check results for API, candidate source, offer delivery, limiter, monitoring and paging;
- complete Prisma migration-state result;
- disposable PostgreSQL run and cleanup result;
- browser runner/browser versions, fixture-free results, traces/screenshots and cleanup evidence;
- safe tenant/test-record identifiers only;
- operator, reviewer and QA owner;
- failures, exceptions, corrective owner and due date.

Credentials, tokens, URLs containing credentials, personal information, production records and raw
database query results are prohibited from the evidence package.

## Stop condition

Phase 1 is stopped before provider access because the named approvals, staging provider inventory,
secret-manager references, isolated database targets, service endpoints, QA identities and reset
authority have not been supplied. Local validation cannot substitute for those external inputs.
