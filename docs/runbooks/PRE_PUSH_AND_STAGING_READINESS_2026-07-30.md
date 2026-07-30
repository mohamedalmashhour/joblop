# Pre-Push and Controlled Staging Readiness

Status: **OWNER REVIEW REQUIRED — NO PUSH OR DEPLOYMENT AUTHORIZED**

Validated local checkpoint:
`4c8c14abd06a830f8a94c13dcbc148f837580cd6`

This review prepares a private GitHub push and an isolated staging deployment. It does not
authorize a push, cloud access, resource creation, billing, migration execution, Stripe
connection, or deployment. Production remains excluded.

## 1. Repository pre-push audit

The reviewed tracked tree contains:

- no real `.env` or `.env.local` file;
- no credential, private-key, database-dump, generated-PDF, `output/`, or `tmp/` artifact;
- no match for the reviewed private-key, live Stripe key, Google API key, GitHub token, AWS access
  key, named-owner, personal-email, or local-volume patterns;
- committed `.env.example` files containing names and empty/example-safe configuration only;
- committed Prisma migration SQL, which is source code and not a database dump.

The repository secret scanner passed at the checkpoint. This is a bounded source review, not a
claim that GitHub or a cloud provider has independently scanned the repository.

The following preserved working-tree paths are **excluded from the proposed push** pending owner
review:

- `docs/security/DEPENDENCY_ADVISORY_REVIEW_2026-07-27.md`;
- `HANDOFF_TO_CODEX_2026-07-30.md`;
- `PHASE_1_OWNER_APPROVAL_PACK.md`;
- `docs/approvals/`;
- `docs/architecture/B5_EXTERNAL_VALIDATION_OWNER_DECISION_REGISTER.md`;
- `docs/architecture/HUMAN_OWNER_APPROVAL_FORM.md`;
- `docs/architecture/OD_06_DURABLE_ADAPTER_STATE_DECISION_PACKAGE.md`;
- `docs/architecture/OWNER_DECISION_REGISTER.md`;
- `output/`;
- `tmp/`.

`.gitignore` protects `node_modules/`, `dist/`, `.next/`, `.expo/`, coverage, Turbo output, logs,
TypeScript build metadata, `.env`, `.env.*`, `*.local`, and `test-results/`. It intentionally
allows only `.env.example` and `.env.*.example`. Before any push, rerun:

```sh
git status --short
git diff --cached --name-status
pnpm scan:secrets
```

Do not use `git add -A`.

## 2. Proposed private GitHub target

| Item               | Proposal                                                  |
| ------------------ | --------------------------------------------------------- |
| Repository         | `drmmashhour-ux/resident-workforce-os`                    |
| Visibility         | Private                                                   |
| Remote             | `git@github.com:drmmashhour-ux/resident-workforce-os.git` |
| Release branch     | `main`                                                    |
| Release checkpoint | `4c8c14abd06a830f8a94c13dcbc148f837580cd6`                |

Read-only preflight and the separately authorized push command:

```sh
git remote -v
git branch --show-current
git status --short
git rev-parse HEAD
git push --set-upstream origin main
```

The final command must not run until the owner approves the private target, exact SHA, and
excluded working-tree paths.

## 3. Staging architecture

Region: `northamerica-northeast2` (Toronto). Project ID and budget remain unresolved owner inputs.

1. A private GitHub repository supplies the reviewed SHA.
2. Artifact Registry stores eight immutable images built from that SHA: API, Employer, Admin,
   Worker web, authentication limiter, synthetic candidate source, synthetic offer delivery, and
   QA reset.
3. Cloud Run hosts those eight images by digest under separate service identities.
4. Employer, Admin, and Worker call the HTTPS API origin; production builds must contain no
   localhost origin.
5. Cloud SQL for PostgreSQL uses private networking. A singleton migration job applies migrations
   before application traffic is promoted.
6. Memorystore for Redis supplies shared atomic authentication limiting through private egress.
7. Secret Manager supplies runtime secrets by resource reference and workload identity. No
   downloaded service-account keys are permitted.
8. Candidate and offer services remain synthetic staging adapters.
9. QA reset is staging-only, allowlisted to Test Employer Organization A/B, and uses a disposable
   validation database for destructive concurrency checks.
10. Cloud Logging, Monitoring, an evidence bucket, alerts, and a witnessed restore target retain
    external validation evidence.
11. Stripe remains disconnected during the first infrastructure deployment. The existing payment
    orchestration uses its fake provider. A later, separately approved revision may connect Stripe
    test mode after merchant, PCI, webhook, reconciliation, and secret-injection review.

### Deployment sequence

1. Approve the exact SHA, private repository, GCP project ID, named owners, and spending ceiling.
2. Create the dedicated staging project and attach only the approved billing account.
3. Configure budget alerts and enable only the reviewed APIs.
4. Create workload identities, Artifact Registry, Secret Manager references, evidence/log storage,
   and monitoring.
5. Create the private VPC, Cloud SQL staging instance/database, Redis, and isolated disposable
   database authority.
6. Build all images from the exact SHA with OCI provenance; publish by digest.
7. Run migration validation, backup marker, isolated restore rehearsal, and singleton
   `prisma migrate deploy`.
8. Deploy auth limiter and API with traffic disabled or restricted; verify `/health` and `/ready`.
9. Deploy synthetic adapters and QA reset; verify identity, replay, and cross-organization denials.
10. Deploy Employer, Admin, and Worker artifacts built with the reviewed HTTPS origins.
11. Run staging validation, PostgreSQL-required tests, authenticated browser/native smoke tests,
    accessibility review, monitoring drills, and cleanup verification.
12. Promote staging traffic only after the release owner reviews the evidence. Do not promote to
    production.

## 4. Environment variable names

Values belong in approved runtime configuration or Secret Manager, never source control.

### Shared release/runtime

- `PORT`
- `NODE_ENV`
- `RWOS_ENV`
- `RWOS_RELEASE_SHA`
- `INTERNAL_API_ORIGIN`

### API

- `DATABASE_URL`
- `API_PORT`
- `AUTH_RATE_LIMITER_ORIGIN`
- `AUTH_RATE_LIMITER_TOKEN`
- `AUTH_RATE_LIMITER_KEY_SECRET`
- `AUTH_RATE_LIMITER_KEY_ID`
- `AUTH_RATE_LIMITER_NAMESPACE`
- `CANDIDATE_SOURCE_ORIGIN`
- `CANDIDATE_SOURCE_TOKEN`
- `OFFER_DELIVERY_ORIGIN`
- `OFFER_DELIVERY_TOKEN`
- `ASSIGNMENT_HANDOFF_ENABLED`

`SESSION_SECRET` is present in an example file but is not consumed by the current runtime and must
not be provisioned as a false requirement.

### Employer

- `PORT`
- `NODE_ENV`
- `RWOS_ENV`
- `INTERNAL_API_ORIGIN`

### Admin

- `PORT`
- `NODE_ENV`
- `RWOS_ENV`
- `NEXT_PUBLIC_RWOS_ENV`
- `INTERNAL_API_ORIGIN`
- `ASSIGNMENT_HANDOFF_ENABLED`

### Worker web

- `PORT`
- `NODE_ENV`
- `EXPO_PUBLIC_RWOS_ENV`
- `EXPO_PUBLIC_RWOS_API_ORIGIN`

Worker public variables are embedded at build time and must contain only public HTTPS origins.

### Authentication limiter / Redis

- `AUTH_LIMITER_REDIS_URL`
- `AUTH_LIMITER_SERVICE_TOKEN`
- `AUTH_LIMITER_RELEASE_SHA`
- `AUTH_LIMITER_AUTH_MODE`
- `AUTH_LIMITER_AUDIENCE`
- `AUTH_LIMITER_API_SERVICE_ACCOUNT`
- `AUTH_LIMITER_NAMESPACE`
- `AUTH_LIMITER_CURRENT_KEY_ID`
- `AUTH_LIMITER_PREVIOUS_KEY_ID`
- `AUTH_LIMITER_PREVIOUS_KEY_ACCEPT_UNTIL`
- `AUTH_LIMITER_RESET_ENABLED`
- `AUTH_LIMITER_RESET_TOKEN`
- `AUTH_LIMITER_PROJECT_ID`
- `AUTH_LIMITER_CLUSTER_ID`

### Synthetic candidate source

- `CANDIDATE_ADAPTER_RELEASE_SHA`
- `CANDIDATE_ADAPTER_SERVICE_TOKEN`
- `CANDIDATE_ADAPTER_AUTH_MODE`
- `CANDIDATE_ADAPTER_AUDIENCE`
- `CANDIDATE_ADAPTER_API_SERVICE_ACCOUNT`
- `CANDIDATE_ADAPTER_TENANT_A_ID`
- `CANDIDATE_ADAPTER_TENANT_A_WORK_GROUP_ID`
- `CANDIDATE_ADAPTER_TENANT_A_ROLE_DEFINITION_ID`
- `CANDIDATE_ADAPTER_TENANT_B_ID`
- `CANDIDATE_ADAPTER_TENANT_B_WORK_GROUP_ID`
- `CANDIDATE_ADAPTER_TENANT_B_ROLE_DEFINITION_ID`
- `CANDIDATE_ADAPTER_ALLOWED_TIMEZONES`
- `CANDIDATE_ADAPTER_TENANT_LIMIT_PER_MINUTE`
- `CANDIDATE_ADAPTER_SERVICE_LIMIT_PER_MINUTE`

### Synthetic offer delivery

- `OFFER_DELIVERY_ADAPTER_RELEASE_SHA`
- `OFFER_DELIVERY_ADAPTER_SERVICE_TOKEN`
- `OFFER_DELIVERY_ADAPTER_AUTH_MODE`
- `OFFER_DELIVERY_ADAPTER_AUDIENCE`
- `OFFER_DELIVERY_ADAPTER_API_SERVICE_ACCOUNT`
- `OFFER_DELIVERY_ADAPTER_TENANT_A_ID`
- `OFFER_DELIVERY_ADAPTER_TENANT_B_ID`
- `OFFER_DELIVERY_ADAPTER_TENANT_LIMIT_PER_MINUTE`
- `OFFER_DELIVERY_ADAPTER_SERVICE_LIMIT_PER_MINUTE`

### QA reset and PostgreSQL validation

- `QA_RESET_RELEASE_SHA`
- `QA_RESET_PERSISTENCE_MODE`
- `QA_RESET_AUTH_MODE`
- `QA_RESET_AUDIENCE`
- `QA_RESET_PROJECT_ID`
- `QA_RESET_CLUSTER_ID`
- `QA_RESET_DATABASE_ID`
- `QA_RESET_AUTHORITY_ID`
- `QA_RESET_TENANT_A_ID`
- `QA_RESET_TENANT_B_ID`
- `QA_RESET_NAMESPACE`
- `QA_RESET_MANIFEST_ID`
- `QA_RESET_MANIFEST_CHECKSUM`
- `QA_RESET_MANIFEST_CREATED_AT`
- `QA_RESET_MANIFEST_EXPIRES_AT`
- `QA_RESET_DRY_RUN_APPROVAL_REFERENCE`
- `QA_RESET_PREPARE_APPROVAL_REFERENCE`
- `QA_RESET_CLEANUP_APPROVAL_REFERENCE`
- `QA_RESET_MAXIMUM_RECORDS_PER_ENTITY`
- the distinct browser, iOS, Android, manual-QA, and monitoring credential, service-account, and
  operator-identity variables defined in `.env.example`
- `RWOS_TEST_DATABASE_URL`
- `RWOS_TEST_DATABASE_CONFIRMATION`
- `RWOS_TEST_DATABASE_CLUSTER_ID`
- `RWOS_PRODUCTION_DATABASE_CLUSTER_ID`
- `RWOS_POSTGRES_TEST_MODE`

### Staging evidence and monitoring

- `RWOS_STAGING_VALIDATION_CONFIRMATION`
- `RWOS_STAGING_DATABASE_CLUSTER_ID`
- `SECRET_MANAGER_PROVIDER`
- `MONITORING_HEALTHCHECK_URL`
- `PAGING_HEALTHCHECK_URL`
- `RWOS_EVIDENCE_GATE`
- `RWOS_EVIDENCE_PATH`

### Stripe test mode

No Stripe environment-variable contract or SDK exists at this checkpoint. Do not invent names or
inject keys into the current services. The Stripe implementation change must first define:

- server-side secret-key reference;
- publishable-key delivery boundary, if a hosted client component requires it;
- webhook signing-secret reference;
- Connect/merchant account identity model, if applicable;
- test-mode webhook endpoint and event allowlist;
- reconciliation source and idempotency contract.

Only names approved in that reviewed implementation may be added to Secret Manager.

## 5. Production origin boundary

The production Employer and Admin builds use `RWOS_ENV=production`; Admin also embeds
`NEXT_PUBLIC_RWOS_ENV=production`. Worker embeds its reviewed public API origin at build time.
Runtime/staging validators reject localhost and require HTTPS for external origins. The public
bundle scan must pass after final origin injection. Required checks:

```sh
pnpm validate:env
pnpm validate:staging
pnpm scan:public-bundles
```

No passing local build can prove the final cloud revision uses the intended origin; inspect the
deployed revision configuration and public bundles after deployment.

## 6. Health, migration, rollback, and first administrator

Every container exposes `/health` and `/ready`. Liveness proves process health; readiness verifies
the service's required configuration or dependency boundary. API and authentication-limiter
readiness must fail closed if PostgreSQL or Redis is unavailable.

Migration order:

1. bind evidence to the exact release SHA and migration checksums;
2. verify backup/PITR and restore to an isolated target;
3. validate Prisma schema and migration integrity;
4. apply all migrations once through a singleton migration job;
5. run `prisma migrate deploy` again and prove it is a no-op;
6. verify the previous application against the expanded schema;
7. deploy restricted/canary services and verify readiness before traffic promotion.

Rollback:

- application defect with compatible schema: route staging traffic to the prior image digest;
- failed transactional migration: keep the prior application and prepare a reviewed forward fix;
- partial/nontransactional migration: freeze writes and restore only to a distinct approved target;
- privacy/tenant concern: freeze affected paths, preserve evidence, and begin security review.

Never automatically down-migrate, edit `_prisma_migrations`, or overwrite a database.

No safe first-platform-admin bootstrap command is implemented at this checkpoint. Do not seed an
administrator through source code, a default password, or an unaudited database edit. Staging
requires a reviewed one-time bootstrap procedure specifying the named administrator, identity
verification, least-privilege role, expiry/rotation, audit record, and second-person confirmation.

## 7. External test and launch gates

The local suite currently reports 13 intentional skips:

- 9 HR/money conformance cases gated on approved external financial policy/evidence;
- 2 PostgreSQL assignment-concurrency cases;
- 1 PostgreSQL worker-offer-capacity case;
- 1 QA-reset PostgreSQL lifecycle case.

The four PostgreSQL cases must run through `pnpm test:postgres:required` against the approved
disposable staging validation target. The nine HR/money cases need their documented legal,
accounting, provider, and evidence prerequisites; they must not be mislabeled as PostgreSQL tests.

Remaining staging gates include immutable topology and identities, Cloud SQL TLS/migration state,
Redis multi-replica/outage recovery, backup/PITR, browser and native E2E, monitoring/paging,
accessibility signoff, privacy/legal review, current dependency audit, invoice legal/tax approval,
payment merchant/PCI/Stripe approval, and Contract Kit C3.

## 8. Staging smoke-test checklist

- [ ] Health/readiness: every service returns the expected liveness and readiness status.
- [ ] Sign-up: production-mode Employer/Admin registration fails closed and shows the approved
      provisioning path.
- [ ] Sign-in: authorized Employer, Admin, and Worker sessions succeed; invalid and cross-role
      credentials fail without account enumeration.
- [ ] Employer request: create draft, edit, submit, handle stale version, and confirm organization B
      cannot read or mutate organization A.
- [ ] Admin approval: review request, candidate evidence, dispatch decision, and verify every
      unauthorized/cross-organization path is denied.
- [ ] Worker assignment: deliver a synthetic offer, accept/decline idempotently, prevent capacity
      races, and expose only worker-owned records.
- [ ] Attendance: punch in/out through the approved handoff, reject duplicates and unauthorized
      assignment/location claims, and avoid real location tracking.
- [ ] Timesheet: generate after punch-out, review/correct/lock, enforce immutable boundaries, and
      deny cross-organization access.
- [ ] Invoice: calculate from an approved locked timesheet, issue immutable synthetic invoice/PDF,
      create corrections through credits, and keep legal issuer/tax gates closed unless approved.
- [ ] Payment: exercise the fake provider's success, decline, timeout, duplicate, delayed and
      contradictory event paths.
- [ ] Stripe test payment: run only after the separate Stripe implementation and approvals; use
      Stripe test mode, synthetic test instruments, signed webhook verification, reconciliation,
      refund, and no Québec card surcharge.
- [ ] Cleanup: remove only manifest-owned synthetic records and prove unrelated tenant records
      remain unchanged.

## 9. Owner approval form

All fields require explicit values. Blank means **not authorized**.

### Private GitHub push

- Approved repository: `drmmashhour-ux/resident-workforce-os`
- Required visibility: Private
- Approved branch: `main`
- Approved SHA: `4c8c14abd06a830f8a94c13dcbc148f837580cd6`
- Excluded working-tree paths reviewed: Yes / No
- Owner name and UTC approval time:

### GCP staging provisioning

- Exact staging project ID:
- Authorized region: `northamerica-northeast2`
- Billing account owner:
- Infrastructure owner:
- Security/IAM reviewer:
- Staging-only authorization: Yes / No

### Maximum monthly staging budget

- Currency:
- Maximum monthly amount:
- Warning thresholds:
- Named cost reviewer:
- Explicit permission to incur staging cost: Yes / No

### Stripe test-mode connection

- Legal merchant/marketplace owner:
- Stripe test account owner:
- Finance/legal approval reference:
- PCI/security reviewer:
- Webhook/reconciliation owner:
- Test mode only; live mode prohibited: Yes / No

### External PostgreSQL validation

- Exact staging cluster ID:
- Exact production cluster ID for inequality check:
- Disposable admin database approved: Yes / No
- Temporary `CREATEDB` authority approved: Yes / No
- Database operator:
- Independent reviewer/witness:
- Cleanup and evidence retention approved: Yes / No

Approval of one section does not authorize any other section, production, live payments, or
deployment beyond isolated staging.
