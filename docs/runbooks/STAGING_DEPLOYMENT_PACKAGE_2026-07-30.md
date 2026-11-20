# Staging Deployment Package

Base checkpoint: `097665c3fb320c836298d62ae74431bb489844a8`

Status: **PACKAGE COMPLETE — DEPLOYMENT NOT AUTHORIZED**

This package prepares an exact, fail-closed staging sequence. It does not authorize GCP access,
resource creation, Stripe access, credentials, DNS, deployment, spending or real data. The platform
remains `LOCAL READY` until the external evidence listed below exists.

## 1. Authenticated workflow gap analysis

| Surface | Locally verified | Required staging evidence |
| --- | --- | --- |
| Employer | Sign-in boundary, organization selection, requests/calendar, read-only durable invoice and payment BFFs, denial and isolation tests | Real staging session; Organization A request → locked timesheet → invoice/PDF/delivery → fake or Stripe-test collection; Organization B denial |
| Admin | Sign-in boundary, request/dispatch lifecycle, durable finance reads, first-admin bootstrap controls | One-time bootstrap ceremony; role matrix; approve/reject/issue credit note; invoice delivery; payment authorize/capture/void/refund; audit review |
| Worker web/mobile | Authenticated offer/calendar contracts, secure session storage, acceptance/assignment/attendance/timesheet state machines | Staging worker session, signed production web build, physical iOS/Android evidence, offer acceptance through attendance and timesheet review |

Browser checks without authenticated staging identities do not prove these journeys. Registration is
intentionally closed in production-mode builds, and no local password or owner credential may be
reused to manufacture evidence.

### Authentication UX and recovery

- Employer self-registration is the only public registration path. It remains fail-closed unless
  `EMPLOYER_SELF_REGISTRATION_ENABLED=enabled` and approved `TERMS_VERSION` and
  `PRIVACY_NOTICE_VERSION` references are configured.
- Worker self-registration is not exposed. Platform Admin self-registration is closed; the first
  administrator uses the one-time bootstrap and later access is governed.
- Employer registration requires email confirmation, password confirmation and Terms/Privacy
  acceptance. Sign-in uses one email and one password field, a visibility control, generic failures
  and an accessible loading/status state.
- Password reset uses a hashed, expiring, single-use token, generic request responses, approved
  password hashing, transactional consumption, session revocation and secret-free audit events.
- Email verification retains hashed codes, expiry, attempt limits, replay protection and resend
  rate limits. Local delivery uses only the no-op/fake sender.
- Staging must prove delivery of verification and reset messages through the approved test provider,
  exact redirect origins, token expiry/replay, rate limits, session revocation and keyboard/focus
  behavior. No real address may be used.

## 2. Financial and document capability disposition

| Capability | Backend disposition | UI disposition | External or policy gate |
| --- | --- | --- | --- |
| Invoice list/detail/audit/PDF/delivery/credit-note routes | Durable authenticated routes implemented | Employer/Admin durable reads; mutations not exposed as fake success | D2/D3/D4/D6/D7/D9 plus authenticated staging evidence |
| Bilingual invoice and issued credit-note PDF | Implemented and locally tested | Download journey requires authenticated staging record | Legal issuer/tax configuration approval |
| Credit-note create/approve/reject/issue/PDF | Implemented with version and eligible-balance checks | Governed Admin mutation UI remains disabled | D2 role matrix and D7/D9 evidence |
| Payment method/attempt/status/audit/reconciliation | Durable authenticated routes implemented | Durable reads; write controls remain governed | D2/D4/D5 and provider test account |
| Authorize/capture/void/refund/local webhook | Implemented with local fake provider, idempotency, replay and concurrency controls | No fake success controls | Stripe test connection and approved role matrix |
| Stripe adapter | Test-mode foundation, default disabled | No live or test account connected | Stripe test account, secret references and webhook URL |
| Documents | Authenticated local upload foundation and denial tests | Governed/unavailable outside local/test | Approved staging object storage, malware, retention and download policy |

Read-only UI integration is not evidence that a governed write journey is complete.

## 3. Deterministic synthetic staging fixtures

The machine-readable blueprint is
`docs/evidence/STAGING_SYNTHETIC_FIXTURE_BLUEPRINT_2026-07-30.json`.

The existing QA-reset manifest creates Test Employer Organization A/B through a **draft timesheet**.
It does not currently seed locked timesheets, invoices, credit notes, uploaded documents, payment
methods or attempts. Those records must be created through authenticated staging APIs after their
policy/provider gates pass. This prevents direct database fixtures from bypassing lifecycle,
authorization, idempotency and audit controls.

All identifiers, issuer details, recipient aliases, GST/QST identifiers, emails and documents must
remain synthetic. Cross-organization denial is mandatory for every created record.

## 4. Environment-variable contract

Values belong only in approved Secret Manager references or deployment configuration. Never put
values in this repository, command transcripts or evidence.

| Service | Variable names and validation |
| --- | --- |
| All release services | `RWOS_ENV` (`staging` for staging-only adapters; API/web runtime mode as documented), `NODE_ENV=production`, `PORT`, `RWOS_RELEASE_SHA` (full 40-character SHA where supported) |
| API | `DATABASE_URL` (PostgreSQL, staging-labelled database, TLS), `SESSION_SECRET` (secret reference), `INTERNAL_API_ORIGIN` (HTTPS), `PASSWORD_RESET_PUBLIC_ORIGIN` (approved Employer HTTPS origin), `AUTH_RATE_LIMITER_ORIGIN` (HTTPS), `AUTH_RATE_LIMITER_TOKEN` (≥32 chars), `AUTH_RATE_LIMITER_KEY_SECRET` (≥32 chars and distinct), `AUTH_RATE_LIMITER_KEY_ID`, `AUTH_RATE_LIMITER_NAMESPACE=rwos:authrl:staging:v1`, `CANDIDATE_SOURCE_ORIGIN`, `CANDIDATE_SOURCE_TOKEN`, `OFFER_DELIVERY_ORIGIN`, `OFFER_DELIVERY_TOKEN`, optional approved test `BREVO_API_KEY` and `EMAIL_FROM` secret references |
| Stripe test | `STRIPE_TEST_MODE_ENABLED=enabled`, `STRIPE_TEST_SECRET_KEY` (`sk_test_` prefix), `STRIPE_TEST_WEBHOOK_SECRET` (`whsec_` prefix), `STRIPE_TEST_ACCOUNT_REFERENCE`, `STRIPE_ACSS_DEBIT_ENABLED` (`disabled` unless separately approved) |
| Employer/Admin | `NODE_ENV=production`, `RWOS_ENV=production`, `INTERNAL_API_ORIGIN` (HTTPS; never localhost); Employer additionally uses `EMPLOYER_SELF_REGISTRATION_ENABLED`, `TERMS_VERSION` and `PRIVACY_NOTICE_VERSION` and remains closed until all approvals exist |
| Auth limiter | `AUTH_LIMITER_REDIS_URL` (`redis:` or `rediss:`), `AUTH_LIMITER_SERVICE_TOKEN`, `AUTH_LIMITER_HMAC_SECRET`, `AUTH_LIMITER_NAMESPACE`, `AUTH_LIMITER_CURRENT_KEY_ID`; previous-key variables only during bounded rotation |
| Candidate adapter | `CANDIDATE_ADAPTER_RELEASE_SHA`, `CANDIDATE_ADAPTER_SERVICE_TOKEN`, Tenant A/B IDs, work-group/role IDs, allowed timezones and service/tenant limits |
| Offer adapter | `OFFER_DELIVERY_ADAPTER_RELEASE_SHA`, `OFFER_DELIVERY_ADAPTER_SERVICE_TOKEN`, Tenant A/B IDs and service/tenant limits |
| QA reset | `QA_RESET_RELEASE_SHA`, target identity fields, manifest timestamps/checksum/ID, Tenant A/B IDs, role/work-group IDs, approval references, caller identities, `QA_RESET_PERSISTENCE_MODE=postgres`, `QA_RESET_NAMESPACE=rwos:qa-reset:staging:v1` |
| Staging validation | `RWOS_STAGING_VALIDATION_CONFIRMATION=authorized-staging-validation`, staging/production cluster IDs, `SECRET_MANAGER_PROVIDER`, `MONITORING_HEALTHCHECK_URL`, `PAGING_HEALTHCHECK_URL`, service auth modes/audiences/service accounts |

`LOCAL_PAYMENT_ENABLED` and `DOCUMENT_LOCAL_UPLOAD_ENABLED` must remain disabled in staging.
No service-account JSON key or `GOOGLE_APPLICATION_CREDENTIALS` is permitted.

## 5. Reproducible deployment sequence

1. Record owner approvals, project ID, budget ceiling, region, release SHA and repository visibility.
2. Review an official provider cost estimate. Configure budget alerts before billable resources.
3. Create the dedicated Toronto staging project, user-managed service identities and WIF; prohibit
   basic Owner/Editor roles and downloaded keys.
4. Create Artifact Registry, custom VPC/subnet/private service range, private Cloud SQL, private
   Redis, regional Secret Manager references, logging/monitoring and the evidence bucket.
5. Enable automated Cloud SQL backup and PITR. Record the pre-migration backup identifier and prove
   it is restorable before applying migrations.
6. Build every image from the reviewed SHA, scan it, push by digest and record source SHA → digest.
7. Deploy the auth limiter and synthetic adapters first; require healthy/readiness responses and
   exact IAM audiences.
8. Deploy API with zero public database/Redis exposure. Keep financial/provider gates disabled.
9. Run migrations as a separate one-shot identity. Verify all migration checksums and applied rows.
   Do not let normal API startup apply migrations.
10. Execute the one-time first-admin bootstrap using an expiring single-use secret reference. Record
    only actor alias, release SHA, timestamps and outcome.
11. Deploy Employer, Admin and Worker using the exact API HTTPS origin.
12. Enable Stripe **test mode only** after its separate approval; register the exact raw-body webhook
    endpoint and run signature/replay/unknown-outcome tests.
13. Prepare Organization A/B through QA reset, then create the post-timesheet blueprint records via
    authenticated APIs. Run cross-organization denial after every entity creation.
14. Run `pnpm validate:staging`, required PostgreSQL tests, browser/native/accessibility journeys,
    monitoring alerts, backup/PITR restore and rollback drills.
15. Retain or tear down staging only according to the approved cost and evidence schedule.

## 6. Health, backup and rollback acceptance

- `/health` proves process liveness only. `/ready` must fail when required configuration,
  PostgreSQL, Redis or internal dependencies are unavailable.
- Before migration: immutable image digest, database identity, backup identifier, PITR timestamp,
  migration inventory and rollback owner are mandatory.
- After migration: checksum validation, table/index/constraint checks, API readiness and synthetic
  smoke reads must pass before web traffic.
- Application rollback selects the previous image digest; database rollback is restore/forward-fix
  according to the migration runbook, never an unreviewed down migration.
- A restore must target a separately named staging validation database. Record measured RPO/RTO,
  row/checksum proof and cleanup.
- A failed readiness, migration, isolation, replay, backup or rollback check stops promotion.

## 7. D1–D9 exact decision-to-test map

| Decision | Skipped conformance test | Required owner | Required evidence |
| --- | --- | --- | --- |
| D1 | C1 no buyer-facing economics leak | Mohamed + Privacy/Legal + Contract owner | Versioned forbidden-field policy, DTO inventory, approved Kit checksum and zero-leak result |
| D2 | C2 sensitive routes reject unauth/wrong-role | Product + Finance/Legal + Security | Route/action/role matrix and staging 401/403 evidence |
| D3 | C4 commission on base excluding tax | Finance + Québec accountant/lawyer | Effective-dated marketplace-fee formula, tax flags and approved vectors |
| D4 | C5 no paid without settlement reference | Legal + Accounting + payment owner | Merchant/payer/payee diagram, authoritative settlement source and reconciliation proof |
| D5 | C5b sandbox ref rejected in production | Security + Stripe account owner | Account inventory, reference classifier, secret references and negative vectors |
| D6 | C6 fail-closed jurisdiction | Québec accountant/lawyer | Registration, supply/place-of-supply policy version and blocked/unblocked vectors |
| D7 | C7 issued terms remain frozen | Contract owner + Legal | Immutable terms ID/checksum/effective date and rate-change proof |
| D8 | C8 no double booking | Operations + Legal + Security | Default denial or approved override roles/reasons/expiry plus one-winner DB evidence |
| D9 | C9 append-only audit | Privacy + Accounting + Security | Retention/legal-hold schedule, before/after event, denied mutation and deletion proof |

No skipped case may be enabled, rewritten or marked passed before its exact evidence exists.

## 8. Pre-deployment owner checklist

### Mandatory owner decisions

- [ ] Exact GCP staging project ID and immutable project number.
- [ ] Toronto region confirmation and network CIDRs.
- [ ] Release SHA and rollback SHA/digests.
- [ ] Named deployer, database owner, Security owner, Finance owner and incident commander.
- [ ] Worker ingress choice and physical-device QA owners.

### Credentials and external access

- [ ] WIF principal/repository mapping; no service-account keys.
- [ ] Secret Manager reference names for database, sessions, limiter, adapters, QA reset,
      first-admin and E2E identities.
- [ ] GitHub environment approval and protected deployment workflow.

### Billable resources

- [ ] Maximum monthly staging budget and currency.
- [ ] Official cost estimate approval.
- [ ] Cloud SQL, Redis, Cloud Run, Artifact Registry, Storage, Logging/Monitoring and networking
      quantities/retention.
- [ ] Budget alert recipients and teardown date/owner.

### Stripe test configuration

- [ ] Test account/merchant owner and account reference.
- [ ] Test secret/webhook Secret Manager references.
- [ ] Approved webhook URL, Mastercard test vectors and optional ACSS decision.
- [ ] D2/D4/D5 evidence; live mode remains prohibited.

### Staging-only tests

- [ ] Authenticated Employer/Admin/Worker browser journeys.
- [ ] Physical iOS/Android worker journey and accessibility/reflow evidence.
- [ ] Organization A/B denial matrix.
- [ ] External Cloud SQL migration/concurrency/cleanup.
- [ ] Redis multi-instance limiter, IAM/audience denial and secret-access denial.
- [ ] Stripe test signature/replay/reconciliation/refund.
- [ ] Monitoring alert delivery and backup/PITR restore/cleanup.

### Production-only approvals

- [ ] All D1–D9 decisions and professional evidence.
- [ ] Production merchant/issuer/tax/retention/legal-hold policies.
- [ ] Live provider credentials, DNS, privacy/security/release sign-off and production budget.

## 9. Values Mohamed must provide before deployment

1. Exact GCP staging project ID.
2. Maximum monthly staging spend and currency.
3. Confirmation of `northamerica-northeast2`.
4. Approved network and private-service CIDRs.
5. Named owners: deployer, database, Security, Finance, monitoring primary/secondary and incident
   commander.
6. Approved Secret Manager **reference names only** and WIF repository/principal mapping.
7. Stripe test account owner/reference, approved webhook hostname and whether ACSS is enabled.
8. First-admin bootstrap owner/identity and expiry window.
9. Backup retention, PITR/RPO/RTO targets and teardown date.
10. D1–D9 decision records as listed above.

Until these values and the staging evidence exist, classification remains **LOCAL READY**.
