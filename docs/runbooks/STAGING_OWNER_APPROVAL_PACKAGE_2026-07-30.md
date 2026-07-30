# Resident Workforce OS — Staging Owner Approval Package

Status: **UNSIGNED — RECOMMENDATIONS ONLY — NO DEPLOYMENT OR SPENDING AUTHORIZED**

Release SHA: `570458d4ec35c419a96575d0c0bd01e8c98921a4`
Package generated: `2026-07-30T22:25:38Z`
Recommended approval expiry: `2026-08-13T22:25:38Z` (14 days)

Completing this package may authorize a later, separately executed **staging-only** change window.
It does not approve production, live Stripe, real email, real data, DNS changes, card charging or
unbounded spending. Every row requires one of `APPROVE`, `REJECT` or `MODIFY`; silence is rejection.

## 1. D1–D9 owner decisions

### D1 — Financial-field disclosure

- Plain language: decide which economic fields each audience may receive.
- Recommendation: versioned explicit allowlists per DTO; deny every unknown field.
- Alternatives: broader reviewed disclosure; keep all economics blocked.
- Consequences: safest privacy boundary; adds maintenance when fields change.
- Exact approval wording: **“APPROVE D1: use explicit versioned response allowlists and deny
  non-allowlisted economic fields for release `570458d…21a4`.”**
- Review: Privacy/Legal and Contract owner required.
- Selection: APPROVE ☐ REJECT ☐ MODIFY ☐ Modification: __________

### D2 — Financial roles and separation of duties

- Plain language: decide who can create, approve, issue, dispute, void and refund.
- Recommendation: Employer members read/download/dispute only; Finance Reviewers create/approve/
  issue/send and propose credit notes; Platform Admin may issue, void and execute approved refunds;
  the same actor must not both propose and approve a governed correction when separation is enabled.
- Alternatives: stricter two-person approval; no financial writes in staging.
- Consequences: least privilege with operational overhead; incorrect roles create financial risk.
- Exact approval wording: **“APPROVE D2 recommended staging role matrix; production remains
  disabled pending Finance/Legal and Security review.”**
- Review: Finance/Legal and Security required.
- Selection: APPROVE ☐ REJECT ☐ MODIFY ☐ Modification: __________

### D3 — Marketplace-fee basis

- Plain language: decide how the client-paid platform fee is calculated and taxed.
- Recommendation: keep the fee disabled (`0`) in externally presented staging invoices until an
  effective-dated contract formula and Québec tax treatment are approved; use clearly synthetic
  vectors only for engine tests.
- Alternatives: fixed amount; percentage of pre-tax eligible service lines; no fee.
- Consequences: disabling prevents an unsupported charge; enabling affects contracts and GST/QST.
- Exact approval wording: **“APPROVE D3 safe default: production marketplace fee remains disabled;
  synthetic staging vectors are non-contractual.”**
- Review: Québec accountant and Legal required before a non-zero contractual fee.
- Selection: APPROVE ☐ REJECT ☐ MODIFY ☐ Modification: __________

### D4 — Merchant, payer and settlement identity

- Plain language: decide which legal entity collects and what proves payment.
- Recommendation: staging uses Stripe test objects only; never mark an invoice paid without a
  verified provider settlement/reconciliation reference; legal merchant model remains unselected.
- Alternatives: platform principal; worker supplier; self-billing agent; manual collection.
- Consequences: prevents false paid state; legal/accounting model blocks production collection.
- Exact approval wording: **“APPROVE D4 staging-only verified test-settlement rule; no production
  merchant or issuer model is approved.”**
- Review: Legal and Accounting required.
- Selection: APPROVE ☐ REJECT ☐ MODIFY ☐ Modification: __________

### D5 — Stripe test/production separation

- Plain language: prevent test objects or credentials from entering production.
- Recommendation: test account only, `sk_test_`/test-object classifier, separate webhook secret,
  Secret Manager references, startup rejection of live mode and no downloaded keys.
- Alternatives: keep Stripe fully disconnected.
- Consequences: enables staging evidence without real money; Security must verify account ownership.
- Exact approval wording: **“APPROVE D5 Stripe test-only boundary; live keys, live objects and live
  mode remain prohibited.”**
- Review: Security and Stripe account owner required.
- Selection: APPROVE ☐ REJECT ☐ MODIFY ☐ Modification: __________

### D6 — Québec tax and place of supply

- Plain language: decide whether and how GST/QST applies.
- Recommendation: `tax_not_enabled` and production issuance blocked until registrations, supply
  classification and place-of-supply policy are professionally approved.
- Alternatives: taxable, zero-rated or exempt under a signed effective-dated policy.
- Consequences: prevents unsupported tax collection; blocks legally presented invoices.
- Exact approval wording: **“APPROVE D6 fail-closed tax default; no GST/QST conclusion is made.”**
- Review: Québec accountant/lawyer required.
- Selection: APPROVE ☐ REJECT ☐ MODIFY ☐ Modification: __________

### D7 — Terms and acceptance evidence

- Plain language: decide the authoritative Terms/Privacy versions and re-acceptance rules.
- Recommendation: registration remains disabled; immutable version, checksum, locale, effective
  date and acceptance evidence required after Legal approves final bilingual content.
- Alternatives: invitation-only staging identities; approved public self-registration.
- Consequences: prevents assent to draft terms; staging identities require controlled creation.
- Exact approval wording: **“APPROVE D7 safe default: drafts do not enable registration; controlled
  synthetic staging identities only.”**
- Review: Contract owner, Privacy and Legal required.
- Selection: APPROVE ☐ REJECT ☐ MODIFY ☐ Modification: __________

### D8 — Double-booking

- Plain language: decide whether any assignment overlap override exists.
- Recommendation: prohibit overrides and retain database-enforced one-winner behavior.
- Alternatives: narrowly approved override with distinct approver, reason, expiry and audit.
- Consequences: strongest safety and simpler operations; may require manual rescheduling.
- Exact approval wording: **“APPROVE D8: no double-booking override.”**
- Review: Operations; Legal/Security only if an override is requested.
- Selection: APPROVE ☐ REJECT ☐ MODIFY ☐ Modification: __________

### D9 — Audit retention and legal hold

- Plain language: decide retention/deletion for financial and consent evidence.
- Recommendation: append-only application audit; deletion disabled pending policy; staging logs and
  synthetic evidence proposed at 30 days without retention lock; backups governed separately.
- Alternatives: longer approved schedule; legal-hold-aware scheduled deletion.
- Consequences: indefinite application retention increases privacy/storage exposure; premature
  deletion weakens legal/accounting evidence.
- Exact approval wording: **“APPROVE D9 staging safe default only; final record-class retention and
  legal-hold policy remains professionally gated.”**
- Review: Privacy, Accounting, Legal and Security required.
- Selection: APPROVE ☐ REJECT ☐ MODIFY ☐ Modification: __________

## 2. GCP architecture, sizing and cost

### A1 — Provider and region

- Recommendation: dedicated staging project in GCP `northamerica-northeast2` (Toronto), isolated
  VPC, private Cloud SQL/Redis, Cloud Run, regional Secret Manager and Artifact Registry.
- Alternative: another Canadian region after latency/residency/cost review.
- Exact approval wording: **“APPROVE A1 dedicated GCP staging project in
  `northamerica-northeast2`; production remains separate and excluded.”**
- Review: Infrastructure, Security and Privacy.
- Selection: APPROVE ☐ REJECT ☐ MODIFY ☐

### A2 — Proposed sizes

| Resource          | Recommendation                                                                  | Alternative/consequence                                                 |
| ----------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Cloud SQL         | PostgreSQL 16, zonal `db-custom-1-3840`, 20 GiB SSD autosize, private IP, PITR  | HA costs more; smaller/shared core may be unstable                      |
| Redis             | Basic 1 GiB Redis 7.2 with transit encryption                                   | Standard/HA costs more; no Redis breaks distributed rate-limit evidence |
| Cloud Run         | Eight services, min 0; API max 4, web/adapters max 1–2; 0.5–1 vCPU, 256–512 MiB | Higher min/max reduces cold starts but increases cost                   |
| Storage           | Toronto Standard evidence/log buckets, 30-day proposed lifecycle                | Longer retention increases cost/privacy exposure                        |
| Artifact Registry | Toronto Docker repository; approved image plus rollback image                   | More retained images increase storage/scanning cost                     |

Exact approval wording: **“APPROVE A2 recommended staging sizes as ceilings, subject to the
reviewed Terraform plan remaining within A3.”**
Selection: APPROVE ☐ REJECT ☐ MODIFY ☐

### A3 — Planning estimate and spending ceiling

This is an engineering estimate, not a Google quote. Recalculate using the official calculator
before provisioning. Current official pages identify pay-as-you-go Cloud Run, Toronto Redis Basic
at USD `$0.049/GiB-hour`, Toronto Standard Storage near USD `$0.02/GiB-month`, and Artifact
Registry above 0.5 GiB near USD `$0.10/GiB-month`.

| Monthly component                      | Baseline planning amount (USD) | Stress ceiling (USD) |
| -------------------------------------- | -----------------------------: | -------------------: |
| Cloud SQL compute, SSD and backups     |                             85 |                  120 |
| Redis Basic 1 GiB (730 hours)          |                             36 |                   40 |
| Eight scale-to-zero Cloud Run services |                             20 |                   45 |
| Logs, monitoring and evidence storage  |                             12 |                   25 |
| Artifact storage/build/network/DNS     |                              7 |                   20 |
| Contingency                            |                             20 |                   50 |
| **Total**                              |                        **180** |              **300** |

- Recommendation: monthly hard approval ceiling **USD 300**, one-time provisioning/build-test
  ceiling **USD 75**, alerts at USD 100/200/300, teardown review after 30 days.
- Alternative: USD 200/month requires smaller usage/log allowances; do not assume it is approved.
- Consequences: budget alerts do not automatically stop spending; Billing owner must monitor.
- Exact approval wording: **“APPROVE A3 maximum USD 300/month and USD 75 one-time for staging;
  alerts at USD 100, 200 and 300; no amount is authorized for production.”**
- Review: Mohamed and Billing owner; official calculator estimate required.
- Selection: APPROVE ☐ REJECT ☐ MODIFY ☐ Monthly: ____ Currency: ____ One-time: ____

Official planning sources:

- `https://cloud.google.com/run/pricing`
- `https://cloud.google.com/sql/pricing`
- `https://cloud.google.com/memorystore/docs/redis/pricing`
- `https://cloud.google.com/storage/pricing`
- `https://cloud.google.com/artifact-registry/pricing`

## 3. Domain, DNS and TLS

### N1 — Proposed staging names

- `employer.staging.<approved-domain>`
- `admin.staging.<approved-domain>`
- `worker.staging.<approved-domain>`
- `api.staging.<approved-domain>`
- `auth-limiter.staging.<approved-domain>` (IAM/internal; no public application access)
- `candidate.staging.<approved-domain>` (IAM/internal)
- `delivery.staging.<approved-domain>` (IAM/internal)
- `qa-reset.staging.<approved-domain>` (IAM/internal)

Recommendation: Google-managed TLS; CAA/DNS reviewed before changes; public web hosts only; internal
services require Cloud Run IAM plus application authorization. No DNS action occurs in this phase.

Exact approval wording: **“APPROVE N1 proposed staging hostname pattern and managed TLS plan;
actual domain and DNS change require a separate reviewed change.”**
Domain: __________ DNS owner: __________
Selection: APPROVE ☐ REJECT ☐ MODIFY ☐

## 4. WIF, service identities, IAM and audiences

### I1 — Proposed identity matrix

| Identity                      | Minimum intended access                                                                             |
| ----------------------------- | --------------------------------------------------------------------------------------------------- |
| GitHub WIF deployer           | Exact private repository and `main`; impersonate staging deployer only                              |
| Staging deployer              | Cloud Run deploy, attach named runtime identities, read/push Artifact Registry during change window |
| Migration identity            | Cloud SQL connect and migration secret only; singleton job                                          |
| API runtime                   | Database/session/limiter/provider secret references; invoke internal dependencies                   |
| Employer/Admin/Worker runtime | Invoke API only                                                                                     |
| Limiter runtime               | Redis and limiter-key references only                                                               |
| Candidate/Delivery runtime    | Own adapter secrets only; synthetic boundary                                                        |
| QA-reset runtime              | Reset secrets and staging database only; Organization A/B allowlist                                 |
| Evidence writer               | Storage object-create only; no read/delete                                                          |
| Monitoring                    | Metrics/checks and approved paging channel only                                                     |

Recommendation: no Owner/Editor, no service-account keys, WIF subject bound to
`drmmashhour-ux/resident-workforce-os`, protected GitHub staging environment and exact Cloud Run
audience URL per service after creation.

Exact approval wording: **“APPROVE I1 least-privilege WIF/IAM design; Security must approve the
generated IAM diff and denied-access tests before deployment.”**
Selection: APPROVE ☐ REJECT ☐ MODIFY ☐

## 5. Secret Manager name inventory

Names only; values must be entered out of band:

- `rwos-staging-database-url`
- `rwos-staging-postgres-admin-url`
- `rwos-staging-session-secret`
- `rwos-staging-limiter-token`
- `rwos-staging-limiter-hmac-key`
- `rwos-staging-candidate-source-token`
- `rwos-staging-offer-delivery-token`
- `rwos-staging-first-admin-bootstrap-secret`
- `rwos-staging-stripe-test-secret-key`
- `rwos-staging-stripe-test-webhook-secret`
- `rwos-staging-email-provider-key`
- `rwos-staging-qa-reset-browser-token`
- `rwos-staging-qa-reset-native-token`
- `rwos-staging-e2e-employer-credentials`
- `rwos-staging-e2e-admin-credentials`
- `rwos-staging-e2e-worker-credentials`

Exact approval wording: **“APPROVE S1 these staging secret names; values and accessor grants require
separate Security-controlled entry and review.”**
Selection: APPROVE ☐ REJECT ☐ MODIFY ☐

## 6. Stripe, fee and collection policy

### P1 — Staging payment behavior

- Mastercard/card first; ACSS disabled unless separately approved.
- Stripe test mode only; no raw card/bank data stored.
- Marketplace fee independent of payment method; no Québec card/Stripe surcharge.
- Require payment method before assignment only when an approved contract policy says so.
- Authorize estimated total, then capture no more than final issued invoice after locked timesheet.
- Voids for unused authorization; refunds require role/reason/idempotency/audit.
- Disputes do not rewrite invoices; credit notes/corrections remain linked and immutable.
- Unknown webhook outcome remains pending until reconciliation; verified signature/replay limits.

Recommendation: approve these as staging test rules, with fee amount `0` until D3 and capture policy
professionally approved.

Exact approval wording: **“APPROVE P1 Stripe test-only Mastercard-first scenarios; ACSS and fee are
disabled; no real authorization, capture, refund or email.”**
Review: Payment owner/Security; Legal/Accounting for production.
Selection: APPROVE ☐ REJECT ☐ MODIFY ☐

## 7. Synthetic email and recipients

Recommendation: approved sandbox/test provider; verified staging sender; recipients limited to
named owner-controlled test inboxes and provider sink addresses; no worker/employer real addresses;
subject/body prominently synthetic; retention 7 days where provider supports it.

Exact approval wording: **“APPROVE E1 synthetic staging email only to this allowlist:
\__________; provider/account reference: \________; sender domain: \________.”**
Review: Privacy/Security and email-domain owner.
Selection: APPROVE ☐ REJECT ☐ MODIFY ☐

## 8. Named owners

| Role                           | Required name/title/contact reference |
| ------------------------------ | ------------------------------------- |
| Mohamed / product owner        | __________                            |
| Infrastructure operator        | __________                            |
| Billing owner                  | __________                            |
| Security reviewer              | __________                            |
| Database/migration owner       | __________                            |
| Release approver               | __________                            |
| Monitoring primary / secondary | __________ / __________               |
| Incident commander             | __________                            |
| Rollback operator/reviewer     | __________ / __________               |
| Privacy/Legal reviewer         | __________                            |
| Québec accounting/tax reviewer | __________                            |
| Stripe test account owner      | __________                            |
| Email provider/domain owner    | __________                            |

Selection: APPROVE ☐ REJECT ☐ MODIFY ☐

## 9. Privacy, retention, backup and recovery

### R1 — Proposed staging schedule

- Synthetic application records: retain through staging cycle; deletion only through approved
  teardown after evidence export.
- Application audit: append-only; no deletion until D9.
- Logs/evidence: 30 days, no retention lock pending Legal.
- Email sandbox records: 7 days where configurable.
- Provider test objects: provider default until owner documents cleanup.
- Legal hold: no automated deletion when an approved hold is active; authority remains unresolved.

Exact approval wording: **“APPROVE R1 staging-only provisional schedule; final privacy, deletion and
legal-hold schedule remains professionally gated.”**
Selection: APPROVE ☐ REJECT ☐ MODIFY ☐

### R2 — Backup/PITR and RPO/RTO

Recommendation: daily backup, PITR enabled, 7-day transaction-log window, 14 retained backups;
proposed staging RPO 15 minutes and RTO 4 hours; restore to a separately named validation database;
cleanup after proof; no restore into production.

Exact approval wording: **“APPROVE R2 staging backup/PITR configuration, RPO 15 minutes and RTO
4 hours, subject to an isolated restore drill before acceptance.”**
Review: Database/Incident/Security owners.
Selection: APPROVE ☐ REJECT ☐ MODIFY ☐

## 10. Monitoring and incidents

### M1 — Proposed thresholds

- `/health` failure: 2 consecutive minutes.
- `/ready` failure: 2 consecutive checks; deployment promotion stops immediately.
- 5xx: >2% for 5 minutes or any sustained authentication/payment 5xx.
- p95 API latency: >1.5 seconds for 10 minutes.
- Cloud SQL: connections >80%, storage >80%, failed backup/PITR or replication/storage alert.
- Redis: unavailable/evictions/connection exhaustion; auth limiter fail-closed alert.
- Payment/email: signature failure spike, unknown outcome >5 minutes, provider outage.
- Security: IAM denial anomaly, secret-access anomaly and cross-organization test failure.
- Cost: USD 100/200/300 alerts under recommended A3.

Paging: primary __________ secondary __________ destination reference __________
Escalation: primary → secondary after 10 minutes → incident commander after 20 minutes.

Exact approval wording: **“APPROVE M1 thresholds and paging/escalation destinations above.”**
Selection: APPROVE ☐ REJECT ☐ MODIFY ☐

## 11. Tooling and external disclosure authorizations

### T1 — Dependency advisory lookup

Exact disclosure: package manager, package names, package versions, dependency graph metadata and
possibly repository-scoped/private package names are sent to the configured registry advisory
service. No source code, credentials or runtime data is intended, but the external service receives
dependency metadata.

Recommendation: authorize `pnpm audit` and `pnpm audit --prod` against the approved npm registry
from CI only; retain redacted results; do not send lockfiles elsewhere.

Exact approval wording: **“APPROVE T1 dependency metadata disclosure to the approved npm registry
advisory endpoint for `pnpm audit`; no other external scanner is authorized.”**
Review: Security/Privacy.
Selection: APPROVE ☐ REJECT ☐ MODIFY ☐ Registry: __________

### T2 — Terraform, containers and images

Recommendation: CI may download pinned Terraform/provider tooling, run `fmt/init -backend=false/
validate`, build all eight images locally without publishing, execute health/readiness probes and
delete CI containers. Image publication by digest requires a later staging change approval.

Exact approval wording: **“APPROVE T2 non-provisioning CI validation and local CI container builds;
image publication and Terraform plan/apply against GCP remain unapproved.”**
Selection: APPROVE ☐ REJECT ☐ MODIFY ☐

## 12. Staging change-window authorization

### X1 — Deployment, migration, rollback and synthetic data

Recommendation after all inputs exist: review Terraform plan and cost; publish exact-SHA images;
record digests; provision staging only; pre-migration backup; singleton migrations; deploy API then
web; bootstrap one admin; create synthetic Organization A/B; run isolation/auth/email/Stripe/
invoice/refund/accessibility/monitoring/restore/rollback tests; stop on any failure.

Exact approval wording for the later change window:

**“APPROVE X1 staging-only deployment of release `570458d4ec35c419a96575d0c0bd01e8c98921a4`
within approved project/budget, using synthetic data only and the reviewed plan. Production,
live payments, real email and DNS changes remain prohibited.”**

This package does not make X1 effective until project, billing, spending, owners, D1–D9 evidence,
secrets, domains and reviewed Terraform plan/image digests are attached.

Selection: APPROVE ☐ REJECT ☐ MODIFY ☐

## 13. Explicitly prohibited until separate production approval

- Production project, database, Redis, DNS, TLS cutover or traffic.
- Live Stripe credentials, cards, charges, refunds, payouts or tax filing.
- Real employer/worker data or real notification recipients.
- Production invoice issuer/tax configuration or T4A generation/filing.
- Service-account key downloads, broad Owner/Editor grants or credentials in repository files.
- Unreviewed migrations, destructive database actions, force-pushes or history rewriting.
- Claims of staging/production readiness without collected external evidence.

## 14. Signature

I confirm that each approved row contains my intended value; modifications are written explicitly;
professional-review requirements are not waived; and production remains excluded.

Owner name: ____________________
Owner title/authority: ____________________
Signature: ____________________
Signed UTC timestamp: ____________________
Approval expiry UTC (recommended no later than `2026-08-13T22:25:38Z`): ____________________
Release SHA: `570458d4ec35c419a96575d0c0bd01e8c98921a4`

Security reviewer: ____________________ Timestamp: __________
Billing owner: ____________________ Timestamp: __________
Legal/accounting reviewers and evidence references: ____________________

## 15. Compact response template

```text
Release SHA: 570458d4ec35c419a96575d0c0bd01e8c98921a4
Approval expiry UTC:

D1: APPROVE / REJECT / MODIFY —
D2: APPROVE / REJECT / MODIFY —
D3: APPROVE / REJECT / MODIFY —
D4: APPROVE / REJECT / MODIFY —
D5: APPROVE / REJECT / MODIFY —
D6: APPROVE / REJECT / MODIFY —
D7: APPROVE / REJECT / MODIFY —
D8: APPROVE / REJECT / MODIFY —
D9: APPROVE / REJECT / MODIFY —

A1 region/architecture:
A2 resource sizes:
A3 monthly ceiling + currency:
A3 one-time ceiling + currency:
GCP project ID:
GCP project number:
Billing-account reference:
Approved domain:
DNS owner:
Network CIDRs:
WIF repository/environment:
Secret names: APPROVE / MODIFY —
Stripe test account reference:
ACSS: DISABLED / APPROVED —
Synthetic email provider/sender/recipient allowlist:
Named owners:
Retention/legal hold modifications:
Backup RPO/RTO:
Monitoring/paging destination:
T1 dependency audit: APPROVE / REJECT / MODIFY —
T2 non-provisioning Terraform/container CI: APPROVE / REJECT / MODIFY —
X1 staging deployment: NOT YET / APPROVE AFTER ATTACHMENTS —

Owner name/title:
Signature:
Signed UTC timestamp:
Security/Billing/Legal/Accounting evidence references:
```
