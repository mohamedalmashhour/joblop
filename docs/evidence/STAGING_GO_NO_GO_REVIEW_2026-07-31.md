# Resident Workforce OS staging GO/NO-GO review

Date: 2026-07-31  
Checkpoint: `dd077cf14d5288e1d368e83ea7f5a4563df2fffc`  
Environment authorization: `X1_STAGING_AUTHORIZED=NOT_YET`  
Decision: **NO-GO**

This record distinguishes local and CI evidence from evidence that can exist only after separately
authorized staging work. It does not authorize Plan B, image publication, provider access, secret
creation, deployment, DNS, Stripe/email activation, production activity or spending.

## 1. Gate matrix

| Gate                                              | Status                       | Exact evidence or blocker                                                                                                                                                                                                                                                                                                                                                  | Required owner/action                                                                                                                              |
| ------------------------------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reviewed QA-reset ownership hardening             | PASS                         | Commit `48b02ae3a9a1a26ea2acd18193df2bca8f1548e7`; Foundation Validation run `30662509245` passed. The focused suite passed 43 tests and the full local suite passed 1,129 tests with 13 intentional skips.                                                                                                                                                                | None for the reviewed local change. Deployment remains prohibited.                                                                                 |
| QA-reset composition root                         | PASS                         | Commit `dd077cf14d5288e1d368e83ea7f5a4563df2fffc`; staging-only composition, exact audience/caller and organization/namespace/manifest/release binding, liveness-only fallback, dependency-aware readiness and fail-closed mutation behavior are covered by 7 composition tests and the 24-entity lifecycle integration test.                                              | None for local implementation. Managed staging verification remains external.                                                                      |
| Disposable PostgreSQL integration                 | PASS                         | Local PostgreSQL 17 temporary cluster; all 20 migrations applied; QA-reset lifecycle 1/1, password/admin 2/2 and offer/assignment concurrency 3/3 passed; rollback was atomic and advisory locking exclusive. The unique database and temporary cluster were deleted.                                                                                                      | None for local evidence. Managed Cloud SQL validation remains external.                                                                            |
| Eight unpublished container builds/runtime probes | PASS                         | Foundation Validation run `30663359112`: `api`, `employer`, `admin`, `worker`, `auth-limiter`, `candidate-source`, `offer-delivery` and `qa-reset` build/probe jobs passed. Images were ephemeral and unpublished.                                                                                                                                                         | None for CI packaging evidence. Publication requires Infrastructure, Security and Release approval.                                                |
| Dependency advisory audit                         | PASS                         | Foundation Validation run `30663359112`, `dependency-audit` job passed against the frozen lockfile.                                                                                                                                                                                                                                                                        | Re-run for the immutable publication checkpoint.                                                                                                   |
| Terraform static validation                       | PASS                         | Foundation Validation run `30663359112`: bootstrap, runtime and state-bootstrap format/init-without-backend/validate jobs passed. This is not a provider plan/apply result.                                                                                                                                                                                                | None for syntax; external authorization is required for provider operations.                                                                       |
| Plan A billing budget                             | BLOCKED                      | Exact saved-plan SHA-256 `c98284b191fa65e7dc7aacb9ba5261c7eb131ad60ae3290828f6be40121c8871` and local inventory remained one CAD 500 budget addition, with 33/67/90/100% thresholds, no IAM change and expected direct cost CAD 0. Remote generation/lock could not be reconfirmed because Google authentication requires interactive reauthentication; no apply occurred. | Billing/Infrastructure owner must reauthenticate, then authorize a new read-only preflight. Stop if generation, lock, digest or inventory differs. |
| Plan B infrastructure                             | OWNER APPROVAL REQUIRED      | Draft JSON contains 55 additions, 0 approved applies. Inventory is recorded below.                                                                                                                                                                                                                                                                                         | Infrastructure, Billing, Security, Database, Privacy/Retention, Monitoring and Release owners must approve exact plan, cost and expiry.            |
| Immutable image publication                       | OWNER APPROVAL REQUIRED      | No Artifact Registry digests or signed publication manifest exist. CI evidence is for unpublished images only.                                                                                                                                                                                                                                                             | Release and Security approve exact SHA; Infrastructure publishes eight images by digest and records provenance/scans.                              |
| Staging PostgreSQL/Redis integration              | EXTERNAL VALIDATION REQUIRED | Local PostgreSQL evidence exists; no authorized Cloud SQL, Memorystore, TLS, connection, multi-replica or outage evidence exists.                                                                                                                                                                                                                                          | Database owner plus independent witness; Infrastructure and Security for connectivity/IAM.                                                         |
| Cloud Run IAM and identity-token validation       | EXTERNAL VALIDATION REQUIRED | Local fake-provider and receiver tests exist; no real Google token, audience, caller, IAM-denial or secret-denial evidence exists. B5.7 remains blocked.                                                                                                                                                                                                                   | Security and Infrastructure owners approve exact service accounts, audiences and grants.                                                           |
| Distributed rate limiting                         | EXTERNAL VALIDATION REQUIRED | Atomic Redis policy and local simulations exist; no authorized real Redis, two-replica, outage or recovery run exists.                                                                                                                                                                                                                                                     | Security, Infrastructure and QA owners.                                                                                                            |
| Monitoring, paging and incident response          | OWNER APPROVAL REQUIRED      | Draft includes one Cloud SQL CPU alert only; no approved endpoints, recipient tests, second channel, primary/secondary on-call drill or incident evidence exists.                                                                                                                                                                                                          | Monitoring/Operations owner, Secondary On-Call, Evidence Reviewer and Billing owner.                                                               |
| Backup, PITR, restore and cleanup                 | EXTERNAL VALIDATION REQUIRED | Configuration/runbooks exist; no witnessed managed backup/PITR restore into a distinct disposable target, cleanup proof or measured RPO/RTO exists.                                                                                                                                                                                                                        | Database owner and independent database witness; Privacy/Retention and Infrastructure owners.                                                      |
| Browser E2E                                       | EXTERNAL VALIDATION REQUIRED | Local test infrastructure exists; no immutable deployed URL, browser matrix or authorized staging journey evidence exists.                                                                                                                                                                                                                                                 | QA, Security and Release owners.                                                                                                                   |
| Native E2E                                        | EXTERNAL VALIDATION REQUIRED | No signed iOS/Android build, approved test devices, staging endpoint or device evidence exists.                                                                                                                                                                                                                                                                            | QA, Accessibility Reviewer, Security and Release owners.                                                                                           |
| Accessibility                                     | OWNER APPROVAL REQUIRED      | Static/local checks do not replace keyboard, browser, device, assistive-technology and named-human signoff bound to the immutable release.                                                                                                                                                                                                                                 | Accessibility Reviewer and QA owner.                                                                                                               |
| Stripe test-mode journey                          | OWNER APPROVAL REQUIRED      | A disabled test-mode adapter and local fake-provider tests exist; no Stripe test account/reference, webhook hostname/signature/replay/reconciliation evidence or D2/D4/D5 approvals exist. Live mode remains prohibited.                                                                                                                                                   | Payment Integration Owner, Security, Accounting/Legal and Release owner.                                                                           |
| Synthetic email journey                           | OWNER APPROVAL REQUIRED      | Synthetic offer-delivery simulation sends no real communications; no approved sandbox provider, sender/domain, recipient allowlist or delivery evidence exists.                                                                                                                                                                                                            | Offer-delivery Integration, Security, Privacy and QA owners.                                                                                       |
| Terms, Privacy, tax and contracts                 | OWNER APPROVAL REQUIRED      | Technical boundaries exist, but approved Terms/Privacy versions, Québec tax/jurisdiction decisions, retention/legal-hold schedule and C3 contract-kit v1.1 checksum/signoff are absent.                                                                                                                                                                                    | Privacy/Legal, Québec accountant/lawyer, Contract Kit owner and Release owner.                                                                     |
| Production database                               | BLOCKED                      | No production access or diagnostic evidence is authorized or present.                                                                                                                                                                                                                                                                                                      | Separate production authorization and named Database/Security owners; not part of this staging decision.                                           |

## 2. Plan B draft inventory — not authorized and not applied

The local draft contains **55 creates**: 8 Cloud Run services, 6 Cloud Run invoker bindings, 8
runtime service accounts, 8 deployer `actAs` bindings, 7 regional secrets, 8 secret-access bindings,
1 Cloud SQL PostgreSQL instance, 1 application database, 1 Memorystore Redis instance, 1 VPC,
1 subnet, 1 private-service address, 1 service-networking connection, 1 logging bucket, 1 logging
sink and 1 Cloud SQL CPU alert policy.

The eight services are `api`, `employer`, `admin`, `worker`, `auth-limiter`, `candidate-source`,
`offer-delivery` and `qa-reset`. Plan B apply remains prohibited.

## 3. IAM and secret-name contracts

Proposed minimal call grants are employer/admin/worker runtime identities → API, and API → limiter,
candidate-source and offer-delivery. QA-reset invocation requires separately approved browser, iOS,
Android, manual-QA and monitoring identities; public clients must never receive reusable application
credentials or service-account keys. Each runtime service account is distinct. The deployer may
impersonate only those approved runtime accounts during the authorized publication window. Runtime
secret access is per-service and per-secret; no project-wide secret accessor is approved.

Proposed secret resource names (names only; no values):

- `rwos-staging-database-url`
- `rwos-staging-session-secret`
- `rwos-staging-limiter-hmac-key`
- `rwos-staging-limiter-token`
- `rwos-staging-candidate-source-token`
- `rwos-staging-offer-delivery-token`
- `rwos-staging-qa-reset-browser-token`

These draft names require Security and Infrastructure approval. Additional QA-reset platform-specific
identity references must be resolved before B5.7; a single browser token is not sufficient evidence
for the approved identity-separation contract.

## 4. Recovery and service objectives

PITR is planned, but no managed backup, restore, retention or deletion operation has been performed.
RPO and RTO are **BLOCKED** pending owner-selected targets and a timed witnessed restore. The restore
must use a distinct disposable staging database, verify manifest/SHA/tenant isolation and audit
integrity, then prove cleanup. Database rollback is restore or forward-fix—not destructive down
migration. Application rollback selects a previously verified immutable image digest. Any failed
readiness, migration, isolation, replay, backup or rollback check stops promotion.

The current Terraform draft retains seven backups, while an earlier owner package proposed fourteen.
Database and Privacy/Retention owners must reconcile that conflict before any apply.

## 5. D1–D9 decision status

| Decision                                        | Status                       | Missing approval/evidence                                                                           |
| ----------------------------------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------- |
| D1 — C1 no buyer-facing economics leak          | OWNER APPROVAL REQUIRED      | Release, Privacy/Legal and Contract Kit owners; forbidden-field evidence and approved kit checksum. |
| D2 — sensitive-route authorization              | EXTERNAL VALIDATION REQUIRED | Product/Finance-Legal/Security role matrix plus staging 401/403 evidence.                           |
| D3 — commission base excludes tax               | OWNER APPROVAL REQUIRED      | Finance and Québec accountant/lawyer approve effective-dated formula and vectors.                   |
| D4 — no paid state without settlement reference | OWNER APPROVAL REQUIRED      | Legal, Accounting and Payment owner approve settlement source and reconciliation proof.             |
| D5 — sandbox references rejected in production  | EXTERNAL VALIDATION REQUIRED | Security and Stripe owner approve account inventory/classifier, then negative staging vectors.      |
| D6 — fail-closed jurisdiction                   | OWNER APPROVAL REQUIRED      | Québec accountant/lawyer approves registration and place-of-supply policy.                          |
| D7 — issued terms remain frozen                 | OWNER APPROVAL REQUIRED      | Contract Kit and Legal approve immutable terms identity/checksum and rate-change proof.             |
| D8 — no double booking                          | EXTERNAL VALIDATION REQUIRED | Operations/Legal/Security approve exception policy, then one-winner managed-DB evidence.            |
| D9 — append-only audit                          | EXTERNAL VALIDATION REQUIRED | Privacy/Accounting/Security approve retention/legal hold, then mutation-denial and deletion proof.  |

## 6. Cost statement

- Plan A budget resource: estimated direct cost **CAD 0**, but it was not applied.
- CAD 500 is a notification budget, not a spending cap and not permission to spend.
- The current Plan B planning range is **USD 90–130/month**. Applying the repository's dated
  2026-07-30 planning rate of USD/CAD 1.4014 gives **CAD 126.13–182.18/month**. This is a planning
  estimate, not an official calculator quote or spending authorization. The Billing owner must enter
  the exact Plan B configuration in the official calculator, record its date/exchange basis and
  approve each chargeable creation action separately.

## 7. Required publication, deployment, validation and rollback sequence

1. Assign the named specialist owners and record scope-limited approvals bound to this SHA, date and
   expiration.
2. Reauthenticate Google access; re-run read-only Plan A digest/state/lock/inventory preflight. Apply
   only the unchanged saved plan under renewed authorization, then verify recipients, generations,
   lock release and a zero-change plan.
3. Obtain an official Plan B calculator result and exact-plan approvals. Plan B remains a separate
   apply authorization.
4. Publish all eight images from the exact checkpoint; record registry URI, immutable digest,
   provenance and vulnerability result. Never deploy mutable tags.
5. Create separately authorized regional infrastructure, IAM and empty Secret Manager references;
   populate values only through the approved human secret process.
6. Apply migrations to isolated staging only after backup/PITR identity and rollback evidence are
   captured. Verify readiness before mutation traffic.
7. Deploy by digest in dependency order: PostgreSQL/Redis connectivity, limiter/adapters, API,
   employer/admin/worker, then QA-reset. Keep all mutation paths unavailable until dependency and
   identity checks pass.
8. Run synthetic Organization A/B cross-organization denial, browser and native journeys; Stripe
   test and synthetic email only after their separate approvals. Capture no real customer data.
9. Execute monitoring/incident and witnessed backup/PITR restore/cleanup drills; measure RPO/RTO.
10. On failure, stop traffic, select the previous verified image digests, restore/forward-fix the
    database when required, verify isolation/audit/readiness, preserve evidence and remove temporary
    access/resources under owner approval.

## 8. Exact approvals still required

Named, dated, scope-limited and expiring approvals remain required from Infrastructure, Billing,
Database, an independent Database Reviewer/Witness, Security, Privacy/Legal, QA, Accessibility,
Candidate-source Integration, Offer-delivery Integration, Payment Integration, Monitoring/Operations,
Secondary On-Call, Evidence Review, Contract Kit, Accounting/Finance and a qualified Québec
accountant/lawyer. Mohamed Al Mashhour is the Release Owner; this record does not infer that he holds
any specialist, witness or independent-review role.

Missing immutable/external values include the authorized GCP project/account and billing reference,
service-account resource IDs, exact Cloud Run audiences and HTTPS endpoints, approved secret
resource references, database/Redis resource IDs, evidence bucket, notification channels, test
identity references, Stripe test reference/webhook, synthetic-email sandbox reference, image
digests/revisions, backup/PITR identifiers, cleanup date and approved RPO/RTO.

## 9. Recommendation

**NO-GO.** Local implementation, disposable PostgreSQL integration and unpublished container
packaging are strong evidence, but they do not satisfy the mandatory external, human, legal,
immutable-publication, recovery, monitoring, browser/native or provider gates. Plan A was not
applied because the required remote-state preflight could not authenticate. Plan B is a draft only.
No staging or production launch may proceed while `X1_STAGING_AUTHORIZED=NOT_YET`.
