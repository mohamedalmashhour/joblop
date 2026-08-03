# Local Blocker Ledger — 2026-07-29

Status: **local work continues; external launch gates remain blocked**

This ledger separates unavailable external evidence from locally executable engineering work. An
external blocker stops only the affected external exercise. It does not stop independent local
coding, unapplied schema or migration preparation, synthetic-data tests, disposable local
PostgreSQL tests, fake/local adapters, builds, scans or documentation.

The internal term `tenant` remains the security and data-isolation concept. Human-facing synthetic
evidence uses **Test Employer Organization A** and **Test Employer Organization B**. Both are
fictional and contain synthetic data only.

## External-only gates

| Gate                                  | Current blocker                                                                        | Preserved boundary                                                                    | Unblock evidence                                                                                                                                                               |
| ------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Production database diagnostic        | No authorized production target, immutable cluster identity or read-only evidence      | No production access or mutation                                                      | Approved read-only target and release-bound diagnostic evidence                                                                                                                |
| Contract Kit C3 v1.1                  | Signed v1.1 artifact, checksum, provenance and executable result are absent            | Do not invent contract or economics rules                                             | Approved artifact intake and passing C3 evidence                                                                                                                               |
| Isolated staging                      | Exact topology, identities, secrets, providers and staging authorization are absent    | No GCP, IAM, billing, shared database or staging action                               | Approved target inventory and exact-release staging evidence                                                                                                                   |
| Backup/PITR                           | Managed source/restore targets and witnessed exercise are absent                       | No external restore or provider operation                                             | Distinct disposable managed target, measured rehearsal and witness record                                                                                                      |
| Distributed rate limiting             | No authorized real Redis service or multi-replica environment                          | Keep local/fake Redis behavior fail-closed                                            | Two-replica external Redis outage/recovery evidence                                                                                                                            |
| Monitoring and incident response      | Real paging destinations, secondary on-call and witnessed drill are absent             | No external alerting or paging                                                        | Fired/resolved alert and escalation evidence                                                                                                                                   |
| Browser E2E                           | Fixture-free staging URLs, accounts and provider states are absent                     | Local browser tests are not staging evidence                                          | Exact-release fixture-free staging run                                                                                                                                         |
| Native E2E                            | Signed builds, physical devices and staging accounts are absent                        | No signing, distribution or external device claim                                     | iOS/Android device evidence bound to the release                                                                                                                               |
| Accessibility signoff                 | Exact-release browser/device/AT and named human evidence are absent                    | Local accessibility tests may continue but cannot turn the gate GREEN                 | Automated, manual, device, AT and signoff records                                                                                                                              |
| Privacy/legal operations              | Approved retention, deletion, export, legal-hold and jurisdiction decisions are absent | Preserve technical inventory; do not invent policy                                    | Dated policy approval and witnessed operational tests                                                                                                                          |
| External QA reset                     | Exact staging target, identities and external-validation approval are absent           | No shared/staging database; independent witness is deferred to this external exercise | Approved external target plus witnessed reset/cleanup evidence                                                                                                                 |
| Deployment and launch                 | External gates are not GREEN and deployment authority is absent                        | No commit, push, merge, deployment or production migration                            | All launch gates GREEN and explicit immutable-release authorization                                                                                                            |
| Authenticated staging credential test | Independent organization-security review is incomplete for PAB and Workforce Identity  | No Token Creator grant, token minting, authenticated smoke or QA Reset                | Independent PAB/Workforce inspection, confirmation that no organization restriction blocks keyless impersonation, and written approval for one narrowly scoped credential test |

Nour Al Mashhour's independent database-review record is a future external-validation requirement.
An incomplete approval artifact does not block local development or isolated disposable local
database testing.

### Authenticated credential-test blocker — 2026-08-03

**Blocker:** Independent organization-security review required before credential testing.

Required evidence:

1. Independent inspection of all Principal Access Boundary policies.
2. Independent inspection of Workforce Identity pools, providers and related organization
   policies.
3. Confirmation that no organization-level restriction changes or blocks the intended keyless
   service-account impersonation path.
4. Written authorization for exactly one narrowly scoped staging credential test.

The diagnostic checkpoint is recorded in
`docs/evidence/STAGING_IAM_DIAGNOSTIC_CHECKPOINT_2026-08-03.md`. The proposed non-executable test
procedure is recorded in `docs/runbooks/STAGING_CREDENTIAL_TEST_PROPOSAL_2026-08-03.md`. The staging
decision remains **NO-GO for authenticated smoke testing**.

## Locally actionable queue

These items remain eligible whenever repository inspection shows unfinished work:

| Workstream                                 | Authorized local action                                                                                                          |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Employer, admin and worker applications    | Complete contract-derived journeys, responsive behavior, truthful dependency states and accessibility tests                      |
| Authentication and authorization           | Strengthen fail-closed local boundaries, role/organization isolation and synthetic tests                                         |
| Staffing, dispatch, offers and assignments | Complete schema-derived repositories, state transitions, concurrency and rollback tests                                          |
| Scheduling, attendance and timesheets      | Complete boundary-only implementation without payroll or payment execution                                                       |
| Invoicing                                  | Complete synthetic calculation, lifecycle, PDF, fake delivery and isolation; keep production legal/tax activation fail-closed    |
| Employer payment orchestration             | Complete provider-neutral local/fake authorization, collection, refund, reconciliation and denial controls; keep Stripe external |
| QA reset                                   | Complete deterministic fixtures and denial coverage for Test Employer Organization A/B                                           |
| PostgreSQL and migrations                  | Prepare unapplied migrations and test them against isolated disposable local PostgreSQL using synthetic data                     |
| Redis behavior                             | Implement and test fake/local atomicity, outage, recovery and isolation behavior                                                 |
| Security and privacy                       | Run tenant-isolation, secret, bundle and dependency scans; remediate locally                                                     |
| Accessibility and responsive design        | Add static, component and locally runnable browser coverage without claiming external signoff                                    |
| Validation and evidence                    | Run focused tests, lint, typecheck, builds, migration checks and truthful documentation updates                                  |

Local PostgreSQL is not presently a blocker: repository evidence records a successful isolated
`/tmp` cluster run applying all 13 migrations, checking 30 QA-reset constraints, proving atomic
rollback and advisory-lock exclusion, then stopping and removing the disposable cluster. The
reproducible command is `npm run qa-reset:postgres:validate`.

The required repository/concurrency suite also supports an explicitly local-only mode. It accepts
only a loopback administration database, rejects collisions with `DATABASE_URL`, creates and drops
a random child database, applies all 13 migrations and emits no staging evidence. The latest run
passed all four required PostgreSQL tests, including the 24-entity QA-reset lifecycle.

## Current local completion checkpoint

- Reconciliation checkpoint `070284f1528988373c5479a0b6c0fbaeec0ab1f8` retains the reviewed worker
  tab semantics and records the existing assignment, worker-response, attendance and timesheet API
  boundaries without claiming external availability.
- Full workspace tests: 925 passed; 13 environment-gated; zero failed.
- Static container packaging and health/readiness contracts: 20/20 passed.
- Lint, typecheck, production builds, environment validation and workspace boundaries: passed.
- Migration integrity, secret scan and public-bundle credential scan: passed.
- Required disposable PostgreSQL suite: 4/4 passed.
- Runtime container execution is unavailable because no container runtime is installed; installing
  system software is outside the local authorization.
- Evidence validators correctly require a named external gate and exact external evidence inputs;
  their absent inputs are external blockers, not local product failures.

### 2026-07-30 local validation record

Validation completed at `2026-07-30T00:01:07Z` against reconciliation checkpoint `070284f`:

| Command                                                                              | Result                                                                                                                               |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm validate`                                                                      | PASS — lint, typecheck, 925 tests passed/13 skipped, environment/boundary/migration/secret checks, all builds and public-bundle scan |
| `pnpm validate:containers:static`                                                    | PASS — 20/20 tests                                                                                                                   |
| `pnpm qa-reset:postgres:validate`                                                    | PASS — 11 migrations, 30 constraints, atomic rollback and exclusive advisory lock                                                    |
| `pnpm test:postgres:required` with a loopback-only temporary administration database | PASS — QA lifecycle 1/1, worker-offer capacity 1/1, assignment concurrency 2/2 and cleanup                                           |

The required PostgreSQL runner created and dropped a random child database inside a temporary
`/tmp` cluster. It used synthetic data only and emitted `evidence=none`; this is local validation,
not staging evidence.

## Preserved-file disposition

| File                                                     | Classification                                       | Evidence and disposition                                                                                                                                                                                                                                       |
| -------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/mobile/App.tsx`                                    | Clearly compatible and owned                         | Tab-list/tab roles match the existing accessibility contract; retained, tested and committed in `070284f`                                                                                                                                                      |
| `packages/shared/src/domain/platformIntegration.ts`      | Clearly compatible and owned                         | Updated entries name API routes that exist in `apps/api/src/app.ts` while keeping status `integration_pending`; retained, tested and committed in `070284f`                                                                                                    |
| `tests/integration/platform-integration.test.ts`         | Clearly compatible and owned                         | Verifies truthful persisted-boundary status without claiming availability; retained, tested and committed in `070284f`                                                                                                                                         |
| `docs/security/DEPENDENCY_ADVISORY_REVIEW_2026-07-27.md` | Genuinely ambiguous and unsupported for this release | Uncommitted edit claims current clean registry audits and CI audit execution; no current-release registry evidence exists and Group 13 intentionally removed automatic CI audits. Preserve unchanged pending Security Owner review or a fresh authorized audit |

`RO-04 / OD-02` remains a genuine architecture decision. Both safe alternatives and their shared
invariants are documented in `docs/architecture/WORKER_INGRESS_DECISION_PACKAGE.md`; no ingress
choice or external configuration was invented.

## Intentional exclusions

Do not implement payroll or worker payments, automatic payment collection, real notifications,
tax filing/remittance, automated AI employment decisions or real location tracking. Invoice work
is permitted only under ACR-0001 with synthetic, effective-dated policies and all production issuer
models disabled pending professional approval. Do not use real credentials, organizations,
workers, registration numbers or personal information.

ACR-0002 additionally permits employer payment orchestration through a deterministic local fake
provider. Mastercard through Stripe is the intended default and ACSS debit the alternative, but
neither external rail is connected. Québec payment-method surcharges remain disabled. The
effective-dated marketplace service fee is contractual and independent of the selected method or
actual processor cost.

## Invoice milestone local record — 2026-07-30

Validation completed at `2026-07-30T00:29:45Z` from base checkpoint `2c623553`:

| Command                                                      | Result                                                                            |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| `pnpm test`                                                  | PASS — 943 passed, 13 intentionally environment-gated, zero failed                |
| `pnpm lint` / `pnpm typecheck`                               | PASS                                                                              |
| environment, boundary, migration-integrity and secret checks | PASS                                                                              |
| `pnpm build` / public-bundle credential scan                 | PASS — all builds; 446 artifacts and 141 classified environment names             |
| `pnpm validate:containers:static`                            | PASS — 20/20                                                                      |
| `pnpm qa-reset:postgres:validate`                            | PASS — 12 migrations, 30 constraints, atomic rollback and exclusive advisory lock |

Implemented locally: locked-timesheet invoice source, versioned CAD minor-unit calculation,
separate GST/QST treatment, three configurable issuer models, production fail-closed gates,
organization-scoped numbering, optimistic concurrency, immutable snapshots, credit notes,
append-only audit, fake email receipts, bilingual synthetic PDF evidence and employer/admin
fixture presentation. The legal issuer, registration/tax policy, payment terms, number policy,
contract chain and T4A payer remain external accounting/legal decisions.

## Payment orchestration local record — 2026-07-30

Validation completed at `2026-07-30T03:12:49Z` from base checkpoint `c378f549`:

| Command                                                      | Result                                                                            |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| `pnpm test`                                                  | PASS — 964 passed, 13 intentionally environment-gated, zero failed                |
| `pnpm lint` / `pnpm typecheck`                               | PASS                                                                              |
| environment, boundary, migration-integrity and secret checks | PASS                                                                              |
| all workspace builds / public-bundle scan                    | PASS — 446 artifacts and 141 classified environment names                         |
| `pnpm validate:containers:static`                            | PASS — 20/20                                                                      |
| `pnpm qa-reset:postgres:validate`                            | PASS — 13 migrations, 30 constraints, atomic rollback and exclusive advisory lock |

Implemented locally: four effective-dated collection policies, opaque payment methods, fake
provider scenarios, preauthorization assignment gate, issued-invoice collection, partial
allocations/refunds, optimistic concurrency, replay protection, signed webhook recovery,
append-only events, cross-organization denial, Mastercard-first/ACSS-alternative presentation,
contractual marketplace-fee estimates and a fail-closed Québec surcharge gate. Stripe remains
unconnected and no provider credentials or real financial data were used.

## Continuation rule

When a local item is blocked, record its exact dependency here, preserve that boundary, and move to
the next non-overlapping local task. Stop the overall local effort only when every remaining item
requires external access, destructive action, spending, real data or a business decision that
cannot be derived safely from repository contracts.
