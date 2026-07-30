# Comprehensive Staging Readiness Review

Reviewed checkpoint: `a4ef2680b6d1291454e126efc32704112cc83388`

Repository: `drmmashhour-ux/resident-workforce-os` (private)

Classification: **LOCAL READY**

The repository is reproducibly buildable and its approved local foundations pass. It is not
staging-validated or production-ready. No deployment, cloud provisioning, Stripe access, real
email, real data or spending occurred.

## Application and package purposes

| Workspace                | Production purpose                                                   | Current boundary                                                                           |
| ------------------------ | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `@rwos/api`              | Authentication, authorization and governed staffing lifecycle API    | Durable PostgreSQL required; production mutations retain kill switches                     |
| `@rwos/employer`         | Employer registration, organization context and staffing workflow UI | Several downstream pages are truthful workflow shells, not durable invoice/payment clients |
| `@rwos/admin`            | Platform review, dispatch and governed administration UI             | Finance/payroll/analytics surfaces remain non-authoritative placeholders                   |
| `@rwos/mobile`           | Worker web export and native-compatible worker experience            | Production entry excludes fixtures; physical-device evidence remains external              |
| `@rwos/auth-limiter`     | Shared fail-closed authentication rate limiting                      | Requires approved Redis and at least two staging replicas                                  |
| `@rwos/candidate-source` | Synthetic candidate-source boundary                                  | No real acquisition/provider data                                                          |
| `@rwos/offer-delivery`   | Synthetic offer-delivery boundary                                    | No real notification delivery                                                              |
| `@rwos/qa-reset`         | Deterministic synthetic Test Employer Organization A/B lifecycle     | Staging mutation requires separate authority and disposable target                         |
| `@rwos/auth`             | Domain services and authorization/state-machine contracts            | Library only                                                                               |
| `@rwos/config`           | Environment validation and fail-closed runtime configuration         | Library only                                                                               |
| `@rwos/database`         | Prisma schema, migrations and database boundaries                    | Library/migration job                                                                      |
| `@rwos/design-system`    | Shared visual tokens and primitives                                  | Library only                                                                               |
| `@rwos/notifications`    | Notification ports and local/fake behavior                           | No real delivery provider                                                                  |
| `@rwos/observability`    | Safe structured logging contracts                                    | External dashboards/paging unconfigured                                                    |
| `@rwos/service-auth`     | Service-to-service identity verification contracts                   | Real Google IAM evidence external                                                          |
| `@rwos/shared`           | Invoice, payment and cross-application domain contracts              | Invoice/payment foundations are not fully exposed as durable API workflows                 |
| `@rwos/ui`               | Shared web UI components                                             | Library only                                                                               |
| `@rwos/validation`       | Shared request/domain validation                                     | Library only                                                                               |

All 18 workspaces have a defined purpose. No workspace is approved for deletion.

## Verified local evidence

- Foundation Validation run `30559416868`: successful from a clean GitHub checkout.
- Local full suite: `1033 passed`, `13 intentionally skipped`.
- Focused filesystem/public-bundle tests: `20 passed`.
- Production builds: API, employer, admin, worker and all packages passed.
- Public-bundle scan: `493` artifacts and `153` classified environment names.
- Scanner passes with `rg` absent from `PATH`.
- Environment, workspace-boundary, migration-integrity, secret and tracked-file checks passed.
- Static container suite: `20/20`.
- PostgreSQL loopback: 14 migrations, 30 constraints, atomic rollback and exclusive advisory lock.
- PostgreSQL required cases: QA-reset lifecycle, first-admin concurrency, Worker Offer final slot,
  Assignment final slot and overlapping Assignment all passed; child database was removed.
- Runtime container validation is **not evidence**: local Docker was unavailable.
- Online dependency audit is **not evidence**: sending the private dependency inventory to an
  external registry was not separately approved.

## Product workflow disposition

| Workflow                                        | Local disposition                                                           | Remaining staging requirement                                                     |
| ----------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Registration/sign-in/session/email verification | Implemented with local/fake email and denial tests                          | Recovery/MFA ceremony and real identity/email provider evidence                   |
| First Platform Admin                            | One-time, expiring, concurrency-safe bootstrap implemented                  | Authorized secret reference and witnessed staging ceremony                        |
| Employer organization and staffing request      | Durable routes and UI implemented                                           | Signed-in browser journey on exact release                                        |
| Dispatch, matching, offers and assignments      | State machines, durable routes, authorization and races tested              | Synthetic adapters plus full browser/worker journey                               |
| Worker calendar and acceptance                  | Authenticated routes and worker UI implemented                              | Signed build/browser and device evidence                                          |
| Attendance and timesheets                       | Durable state-machine routes and organization/worker boundaries implemented | Approved GPS/evidence policy and staging journey                                  |
| Invoice                                         | Versioned local engine, schema, PDF/fake delivery and tests exist           | Durable API/UI integration and D3/D4/D6/D7/D9 decisions                           |
| Employer payment                                | Fake provider and Stripe test adapter foundation exist                      | Durable API/UI integration, test account, webhook endpoint and D2/D4/D5 decisions |
| ACSS                                            | Configurable Stripe test foundation only                                    | Provider/account/mandate policy and authorized network test                       |
| Worker payable/payroll/T4A                      | Not authorized; ACR-0003 remains proposed                                   | Product, Finance, Legal, Tax and Security approvals                               |
| QA reset                                        | Durable disposable-loopback lifecycle passes                                | Authorized staging target, identities and cleanup witness                         |
| Notifications                                   | Fake/local only                                                             | Approved provider, consent, templates, retries and delivery evidence              |

## Security and isolation

Existing tests cover authentication, platform/employer/worker roles, direct organization scope,
cross-organization fixture references, session transport, service authentication, replay and
provider idempotency. Financial, invoice, payment and audit production activation remains
fail-closed. Hidden UI controls do not substitute for API capability checks.

No file-upload endpoint is currently part of the supported production API. Document onboarding UI
must not be represented as secure upload capability until a durable upload service defines content
sniffing, size/type limits, filename normalization, malware handling, object isolation, retention
and download authorization.

The repository scan found no tracked real `.env`, credential, PDF, dump, `output/` or `tmp/`
artifact. Preserved uncommitted owner/approval files were not reviewed as release inputs and remain
outside committed history.

## Frontend, accessibility and responsive evidence

Static navigation, route integrity, accessible naming, shell semantics and mobile pressable
contracts pass. Production builds contain no accepted localhost runtime origin. Automated local
checks do not replace browser zoom/reflow, keyboard/focus restoration, contrast, screen-reader,
tablet/phone layout or physical-device testing. Those checks remain part of the staging
accessibility and browser/native gates.

Pricing, contact submission, selected onboarding records, AI suggestions, admin finance/payroll and
some report actions are intentionally labelled placeholders or governed handoffs. They must remain
non-authoritative until their contracts and durable routes are approved.

## Deployment artifacts

Eight non-root Dockerfiles, build metadata, liveness/readiness contracts, static packaging tests,
migration/bootstrap jobs and rollback ordering exist. The GCP pre-creation package now includes the
previously omitted Redis-backed authentication limiter and uses Toronto
`northamerica-northeast2`.

Still required externally: project ID, budget, official cost estimate, network CIDRs, service
identities, secret references, Cloud SQL/Redis resources, image registry/digests, runtime container
evidence, staging URLs and provider/account identifiers. Templates are planning material and must
not be applied without the separate staging authorization.

## Exact remaining blockers

1. Decisions D1–D9 in `HR_MONEY_POLICY_DECISION_PACKAGE_2026-07-30.md`.
2. GCP staging project ID and explicit maximum spend.
3. Approved private networking, Cloud SQL, Redis, Secret Manager and workload identities.
4. Stripe test account/merchant decision and secret-reference injection authority.
5. Authorized staging database and QA-reset mutation/cleanup witness.
6. Browser, native, accessibility and responsive human/device evidence.
7. Runtime Docker/container evidence or equivalent immutable image evidence.
8. Authorized online dependency audit for the release lockfile.
9. Monitoring thresholds, channels and named primary/secondary/incident commander.
10. Backup/PITR restore target, measured RPO/RTO and witnessed cleanup.
11. Privacy retention, deletion, export, backup expiry and legal-hold approval.
12. Durable invoice/payment API integration and approved end-to-end staging journeys.

The repository is **LOCAL READY**. It is not `STAGING READY` because infrastructure and external
test inputs do not exist or are unauthorized. It is not `PRODUCTION READY` because all launch gates
have not passed and the nine policy decisions remain open.
