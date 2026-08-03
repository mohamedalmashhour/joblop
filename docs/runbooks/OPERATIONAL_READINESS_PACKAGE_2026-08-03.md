# Resident Workforce OS Operational Readiness Package

Date: 2026-08-03

Accepted staging release: `6825dd060da595fc56e9250e50457fa14c01f94a`

Accepted evidence checkpoint: `6ae313a7b948e6ab61f58cea8419a2f7e4688b06`

Environment: isolated staging, Toronto (`northamerica-northeast2`)

Decision: **STAGING SECURITY ROLLOUT — ACCEPTED**

Production recommendation: **NO-GO**

This package consolidates the remaining operational launch requirements. It does not authorize a
production deployment, staging promotion, migration execution, provider activation, payment,
customer communication, DNS change, real data, or infrastructure modification.

## 1. Accepted and preserved evidence

The following claims are accepted only for the named staging release and evidence checkpoint:

- Foundation Validation run `30851184940` passed.
- The supported dependency audit reported zero known vulnerabilities against the frozen lockfile.
- Eight immutable images were published by run `30851647060` and the reviewed release was rolled
  out to the existing staging services.
- All nine Cloud Run services reported ready revisions on reviewed immutable digests.
- Employer, Admin, Worker and API custom-domain `/health` returned HTTPS `200`; API `/ready`
  returned `200`.
- Synthetic sign-in for Test Employer Organization A employer, administrator and worker returned
  `200` through the correct endpoints.
- Revoked Test Employer Organization B access returned a generic `401`.
- The reviewed Terraform rollout reconciled to zero drift.
- The migration job definition was updated but the migration job was not executed.
- Existing user-owned files remained outside the rollout.
- No production deployment, production data, live payment or real communication occurred.

These results do not grant browser, native-device, accessibility, restore, paging, incident-drill,
legal, privacy, payment-provider or production credit.

## 2. Readiness scoring method

The dashboard contains 17 required categories. Green earns 1 point, Yellow earns 0.5 and Red earns 0. The score is evidence coverage, not a probability of launch success.

- Green: release-bound acceptance evidence exists and no mandatory item in the category is open.
- Yellow: meaningful evidence exists, but one or more mandatory external or owner-controlled items
  remain.
- Red: mandatory launch evidence or an authoritative decision is absent.

Current score: `(4 Green + 3 × 0.5 Yellow) ÷ 17 = 32%`.

**Readiness percentage: 32% evidence-complete.** This must not be interpreted as permission to
deploy 32% of production or as an estimated probability of safety.

## 3. Production readiness dashboard

| Category          | Color  | Status                         | Evidence and remaining requirement                                                                                                                                                            |
| ----------------- | ------ | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Infrastructure    | Green  | Complete                       | Staging Cloud Run rollout is healthy and Terraform is zero-drift. Production remains separately prohibited.                                                                                   |
| Security          | Green  | Complete for staging release   | Foundation Validation, dependency audit, immutable images and staging security rollout passed. Production threat review remains part of final acceptance but is not a current staging defect. |
| Authentication    | Green  | Complete for synthetic staging | Employer, Admin and Worker synthetic sign-in passed; revoked organization returned generic `401`. Real identity enrollment and recovery journeys remain production acceptance checks.         |
| Authorization     | Yellow | In Progress                    | Cross-organization and revoked-access behavior has evidence. D2 route-role matrix and release-bound staging `401/403` coverage remain open.                                                   |
| Database          | Yellow | In Progress                    | API readiness passed and local disposable PostgreSQL evidence exists. The release migration job was not executed; production-like migration, lock and managed-database evidence remain open.  |
| Backup            | Red    | Blocked                        | No witnessed managed backup/PITR restore, distinct disposable target, cleanup proof or measured RPO/RTO.                                                                                      |
| Monitoring        | Yellow | In Progress                    | Runtime readiness and post-rollout error-log query passed. Alert delivery, owner acknowledgement, escalation and recovery drill are absent.                                                   |
| Accessibility     | Red    | Blocked                        | No release-bound keyboard, screen-reader, browser, zoom, contrast and device evidence with named reviewer signoff.                                                                            |
| Privacy           | Red    | Blocked                        | Approved privacy notice, retention/deletion/legal-hold schedule, logging retention and data-subject procedures are absent.                                                                    |
| Legal             | Red    | Blocked                        | Terms, marketplace/worker classification, Québec tax treatment, invoice issuer model and contract-kit approval remain authoritative external decisions.                                       |
| Payments          | Red    | Blocked                        | Live payments remain prohibited. Stripe test-mode journey, webhook, replay, refund, dispute and reconciliation evidence and D2/D4/D5 decisions remain absent.                                 |
| Mobile            | Red    | Blocked                        | No release-bound signed Android/iOS build or physical-device end-to-end evidence.                                                                                                             |
| Browser           | Red    | Blocked                        | No release-bound authenticated browser journey matrix for Employer, Admin and Worker.                                                                                                         |
| Operations        | Red    | Blocked                        | Named primary/secondary operators, release command rehearsal, rollback drill and operational handoff are absent.                                                                              |
| Customer Support  | Red    | Blocked                        | Support ownership, intake channels, severity/response targets, escalation and privacy-safe tooling are not approved or rehearsed.                                                             |
| Incident Response | Red    | Blocked                        | Runbook exists, but no release-bound alert-to-resolution exercise with primary, secondary and incident commander.                                                                             |
| Documentation     | Green  | Complete for this checkpoint   | Staging rollout evidence, database and incident runbooks, and this consolidated package exist. Future evidence must remain release-bound and independently reviewed.                          |

## 4. Browser end-to-end validation plan

Status: **Blocked** pending QA, Security and Release authorization and approved staging identities.

Matrix:

- Chrome, Safari and Edge at supported desktop widths.
- Safari on iPad portrait and landscape.
- Chrome on supported Android tablet/phone portrait and landscape.
- Employer, Admin and Worker web origins on the immutable release.

Required journeys:

1. Sign up where self-registration is approved; confirm email through the synthetic provider.
2. Sign in, sign out, session expiry, forgot/reset password and generic invalid-account responses.
3. Employer creates a staffing request, reviews estimate and submits it.
4. Admin reviews the request, candidate/dispatch state and permitted financial records.
5. Worker receives an eligible assignment, accepts it and follows permitted attendance steps.
6. Timesheet creation, review and lock.
7. Invoice, bilingual PDF, local-delivery record, credit note and governed payment-test views.
8. Back/Next, pagination, tabs, menus, links, retry, validation and denial paths.
9. Test Employer Organization A cannot access any Organization B entity or document path.
10. Revoked, expired and wrong-role sessions fail generically without information leakage.

Acceptance requires zero unexplained 404s, dead controls, fake-success states or cross-organization
exposure. Evidence must include release SHA, immutable revisions, browser versions, viewport, result,
safe screenshots, reviewer and corrective issue references.

## 5. Native mobile end-to-end validation plan

Status: **Blocked** pending signed staging builds, approved devices and QA/Security/Release owners.

Test Android and iOS independently. Validate install/launch, secure sign-in, session expiry, deep
links, permission denial, background/foreground recovery, network loss/retry, notification-disabled
behavior, accessibility settings, assignment acceptance, attendance boundary presentation,
timesheet review and cross-organization denial. Do not collect real location or send real
notifications. Device logs and screenshots must contain synthetic data only.

Acceptance requires signed-build identity, checksum, OS/device matrix, exact staging endpoints,
zero credential leakage, deterministic denied-permission behavior and named reviewer approval.

## 6. Accessibility verification plan

Status: **Blocked** pending Accessibility Reviewer and QA owner.

Required checks:

- Keyboard-only completion of all supported web journeys with visible focus and logical order.
- Screen-reader landmarks, headings, labels, errors, status announcements and modal focus handling.
- 200% and 400% zoom/reflow; text spacing; responsive portrait/landscape layouts.
- Contrast, non-color status communication, reduced motion and target size.
- Validation errors associated with inputs and safe focus placement after failure.
- PDF language, reading order, headings, table semantics and meaningful file names.
- Native platform accessibility settings and external keyboard behavior.

Acceptance requires no critical or serious defect, documented disposition of moderate/minor defects,
assistive-technology/browser versions, release-bound evidence and human signoff.

## 7. Disaster recovery, backup and restore

Status: **Blocked**.

Use `docs/runbooks/DATABASE_BACKUP_RESTORE_AND_MIGRATIONS.md` as the authoritative procedure.
Before any drill, approve RPO, RTO, backup retention, deletion, legal hold, database owner,
independent witness and incident decision owner.

The controlled staging exercise must:

1. Identify an existing provider recovery point without exposing credentials.
2. Restore into a new, distinct, disposable target.
3. Validate target identity and the disposable restore guard.
4. Verify migrations, schema fingerprint, safe invariants, audit integrity and A/B isolation.
5. Record measured RPO and RTO.
6. Exercise application rollback to a previous verified immutable image.
7. Prove cleanup of the disposable restore target under approved deletion controls.

Provider settings or screenshots alone do not pass this gate. A witnessed restore and measured
results are mandatory.

## 8. Monitoring and alert verification

Status: **In Progress**.

Use `docs/runbooks/API_MONITORING_AND_INCIDENT_RESPONSE.md`. Configure and test readiness, liveness,
5xx/error-budget, latency, database, adapter, limiter, authentication-denial, assignment-conflict and
migration alerts. Record thresholds, dashboards, immutable channel identifiers and named primary,
secondary and incident commander.

Acceptance requires a controlled alert that is fired, delivered, acknowledged, escalated where
required, resolved and closed, with chronological timestamps and no secrets or personal data.

## 9. Incident response runbook and drill

Status: **Blocked** pending named operators and a controlled drill.

Scenario: sustained readiness failure after a candidate release. The drill must prove detection,
privacy-safe triage, commander assignment, mutation containment, rollback decision, dependency or
image recovery, five-minute readiness stability, authenticated read-only canary, expected denial,
stakeholder communication and closure review. Any suspected cross-organization exposure becomes an
immediate Security/Privacy incident.

## 10. Security logging review

Status: **In Progress**.

Review normalized route, safe request ID, status, latency, release and service identity coverage.
Verify logs exclude authorization headers, cookies, tokens, passwords, contact information,
addresses, worker identities, database URLs and raw provider payloads. Confirm access controls,
retention, deletion and export destinations. Observability logs must not be represented as the
append-only domain audit ledger.

Acceptance requires Security and Privacy reviewers, approved retention and sampled evidence from
each service on the immutable release.

## 11. Privacy and legal readiness checklist

Status: **Blocked**.

- Approved Terms and Privacy notice versions and checksums.
- Marketplace legal model, independent-worker language and role responsibilities.
- Québec invoice issuer, GST/QST, place-of-supply and registration decisions.
- T4A payer identity and verified-payment source policy.
- Retention, deletion, legal hold, backup expiry and log-retention schedule.
- Data-subject access/correction/deletion and incident-notification procedures.
- Synthetic-to-real-data transition controls and prohibited-data inventory.
- Processor/subprocessor and cross-border transfer review.
- Contract Kit C3 v1.1 approval and forbidden economics-field verification.
- D1–D9 approvals from qualified owners; no engineering substitution for professional advice.

Draft documents do not enable registration or production.

## 12. Launch rollback procedure

Status: **In Progress**; procedure exists but requires rehearsal.

1. Stop promotion on any readiness, isolation, migration, replay, payment, monitoring or backup
   failure.
2. Preserve release, revision, request and incident evidence without secrets or personal data.
3. Disable affected mutation paths while keeping safe diagnostics available.
4. Route traffic to the prior verified immutable image when schema compatibility permits.
5. Never use destructive down migrations or edit migration history.
6. Restore only to a new isolated database; validate before an approved cutover.
7. Reconcile ambiguous payments or assignments against authoritative records and audit events.
8. Verify health, readiness, authenticated read-only canary, expected denial, isolation and logs.
9. Record owner decision, UTC timeline, impact, cleanup and corrective work.

Acceptance requires a timed staging rehearsal with Release, Database, Security and Operations
owners and an independent evidence reviewer.

## 13. Operational support checklist

Status: **Blocked**.

- Name release, infrastructure, database, security, privacy, monitoring and support owners.
- Name primary and secondary on-call and incident commander rotation.
- Define customer support intake, severity, response targets and escalation boundaries.
- Provide privacy-safe support scripts for sign-in, assignment, attendance, invoice and payment-test
  issues.
- Prohibit support staff from requesting passwords, card data, service-account keys or raw tokens.
- Document feature flags, mutation kill switches, provider disablement and maintenance messaging.
- Establish evidence retention, handoff, shift change and post-incident review procedures.
- Rehearse one support-to-incident escalation with synthetic data.

## 14. Production acceptance checklist

Status: **Blocked**.

All items are mandatory unless an accountable owner records a legally and operationally valid
waiver. A waiver cannot override security isolation, payment law, privacy law or recoverability.

- Exact release SHA and immutable image digests approved.
- Foundation Validation and dependency/security evidence current.
- Production Terraform plan separately reviewed, costed and digest-bound.
- Production IAM, secret references, domains/TLS and service audiences reviewed.
- Browser, native and accessibility matrices passed.
- Managed database migration rehearsal, backup/PITR restore and rollback drill passed.
- Monitoring, paging, incident and customer-support drills passed.
- Authentication, authorization and A/B isolation evidence passed.
- Stripe/provider test evidence passed without live money.
- Terms, Privacy, contracts, tax, retention and D1–D9 decisions approved.
- Named production owners and launch bridge confirmed.
- Explicit production GO approval recorded after evidence review.

## 15. Final production gate list

| Gate                  | Description                                  | Accountable owner                             | Required evidence                                             | Acceptance criteria                                                      | Blocks production      |
| --------------------- | -------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------ | ---------------------- |
| G1 Browser E2E        | Authenticated Employer/Admin/Worker journeys | QA + Security + Release                       | Release-bound browser matrix                                  | All critical journeys pass; no dead controls, leakage or unexplained 404 | Yes                    |
| G2 Native E2E         | Android/iOS worker journeys                  | QA + Accessibility + Security                 | Signed builds and physical-device results                     | Supported device matrix passes with synthetic data                       | Yes                    |
| G3 Accessibility      | Web, PDF and native accessibility            | Accessibility Reviewer + QA                   | Human/automated evidence                                      | No critical/serious defects; signoff recorded                            | Yes                    |
| G4 Managed migration  | Production-like managed DB migration         | Database Owner + independent witness          | Singleton run, checksums, locks, no-op replay                 | Migration and prior/new app compatibility pass                           | Yes                    |
| G5 Backup/PITR        | Recoverability and cleanup                   | Database + Infrastructure + Privacy           | Witnessed distinct-target restore                             | Approved RPO/RTO met; isolation/audit verified; target cleaned           | Yes                    |
| G6 Monitoring         | Alerts reach accountable humans              | Monitoring/Operations                         | Fired-to-resolved alert records                               | Primary/secondary paths and recovery verified                            | Yes                    |
| G7 Incident response  | Coordinated containment and rollback         | Incident Commander + Security                 | Timed staging drill                                           | Detection, containment, recovery and closure pass                        | Yes                    |
| G8 Security logging   | Safe and sufficient operational logs         | Security + Privacy                            | Service samples and access/retention review                   | Required fields present; prohibited data absent                          | Yes                    |
| G9 Privacy/legal      | Authoritative launch documents and policy    | Privacy/Legal + qualified Québec advisors     | Signed versions, checksums and policy decisions               | Terms, privacy, tax, retention, contracts approved                       | Yes                    |
| G10 D1–D9             | Frozen business/security decisions           | Named specialist owners                       | Completed decision record and test evidence                   | Every decision approved and corresponding tests pass                     | Yes                    |
| G11 Payments          | Provider test-mode safety                    | Payments + Accounting/Legal + Security        | Test account, webhook, refund/dispute/reconciliation evidence | No live mode; D2/D4/D5 satisfied; journeys pass                          | Yes if payments launch |
| G12 Email             | Approved synthetic delivery                  | Integration + Privacy + Security              | Allowlisted sandbox delivery evidence                         | Sender/recipient/replay/privacy controls pass                            | Yes for email features |
| G13 Operations        | Named ownership and launch rehearsal         | Release + Operations                          | Roster, runbook rehearsal and bridge plan                     | Every duty has primary/backup and tested procedure                       | Yes                    |
| G14 Customer Support  | Safe support and escalation                  | Support Owner + Privacy                       | Scripts, SLAs and synthetic exercise                          | Intake-to-resolution and incident escalation pass                        | Yes                    |
| G15 Production change | Exact production plan and explicit GO        | Infrastructure + Billing + Release + Security | Digest-bound plan, cost, rollback and owner approval          | Separate production authorization after all gates                        | Yes                    |

## 16. Critical blockers and launch outlook

Critical blockers are G1–G10, G13–G15, plus G11/G12 for any launch that exposes payments or email.
They depend on named humans, approved policies and controlled external evidence; the repository cannot
close them autonomously.

Estimated launch readiness: **not responsibly date-estimable** until owners and testing windows are
assigned. Once inputs exist, the order is browser/native/accessibility validation, managed migration
and restore, monitoring/incident/support drills, legal/D1–D9 approval, then an exact production
plan review. Parallel execution is possible, but no elapsed-time promise is evidence.

## 17. Final recommendation

**NO-GO for production.**

The staging security rollout is accepted and technically healthy. Production remains blocked by
release-bound browser/native/accessibility evidence, managed migration and recovery proof,
monitoring/incident/support operations, payments/email decisions where applicable, and authoritative
privacy/legal/D1–D9 approvals.

No production deployment, infrastructure modification, staging promotion, database migration,
customer data, payment activation or real communication is authorized by this package.
