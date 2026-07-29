# Resident Workforce OS Master Local Completion Plan

Status: **LOCAL ENGINEERING CHECKPOINT RECONCILED — EXTERNAL VALIDATION BLOCKED**

Committed implementation checkpoint: `69686c527f41cc4b1138a8ddc84c6c9ef60f0d47` on `main`

Authoritative launch status: `LAUNCH_READINESS.md` — **NOT READY**, 0 of 11 gates GREEN (0%).

This is the dependency-ordered master plan for locally executable work. It preserves the existing
dirty worktree and does not authorize a commit, push, deployment, provider access, production
access, credentials, spending, real data or any approval recorded only as a proposed default.

## 1. Frozen boundaries

The following boundaries apply to every workstream:

- C1 no-economics-leak and C3 pending Contract Kit v1.1;
- client, administrator and worker privacy separation;
- attendance handoff only;
- no payroll, payment execution, invoices, tax, notifications, real maps, AI execution or worker
  payout;
- production mutations remain disabled;
- B5.7 and every external database/Redis action remain frozen; QA-reset and OD-06 local
  implementation is authorized;
- no architecture, ownership, retention, immutable provider identifier or human approval may be
  invented.

`B5_EXTERNAL_VALIDATION_OWNER_DECISION_REGISTER.md` is the approval handoff for frozen work. A
recommended default in that register is not an approval.

## 2. Dependency order

1. Governance and frozen-boundary reconciliation.
2. Shared configuration, authentication, authorization and privacy-safe observability.
3. Database-independent domain contracts and repository interfaces.
4. Employer, worker and administrator read/write journeys permitted by the launch boundary.
5. Synthetic adapters and QA tooling.
6. Packaging, local validation and public-bundle controls.
7. Approved local schema/persistence implementation.
8. Separately authorized external infrastructure and distributed validation.
9. Browser, native, accessibility, operational, privacy/legal and contract evidence.
10. Explicit deployment and launch authorization.

Step 7 is now locally authorized. Steps 8–10 remain blocked. Earlier steps are locally complete to
the extent recorded below.

## 3. Platform workstream matrix

| Workstream                            | Local checkpoint                                                                                                                                                                         | Remaining local or external work                                                               | Dependency/blocker                                                       | Next authorized action                    |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------- |
| Employer platform                     | Authenticated session/tenant boundary, persisted staffing-request entry, request status, calendar, assignment/attendance/timesheet handoff views and governed finance placeholders exist | Fixture-free browser validation and real dependency states                                     | Isolated staging, accounts, provider identities and Browser E2E evidence | External approval package only            |
| Worker web/mobile                     | Production fixture gate, secure session transport, authenticated calendar/offer/assignment reference and truthful empty/denied/stale/unavailable states exist                            | Signed native builds, physical devices and final ingress architecture                          | RO-04 native public API versus gateway decision; Native E2E              | Owner architecture decision               |
| Administration                        | Session/role boundaries, request review, dispatch, candidate review, offer/assignment status and governed operational surfaces exist                                                     | Fixture-free browser validation and real operational identities                                | Staging and Browser E2E                                                  | External approval package only            |
| Authentication/authorization          | DB-backed roles, fail-closed production config, registration restriction, B1 limiter, B5.1–B5.6 dual-header trusted-service boundaries and bundle protections exist locally              | Real Google verification, exact identities/audiences, IAM grants and cutover evidence          | B5.7 approvals and immutable GCP values                                  | Keep frozen                               |
| Staffing requests/candidate matching  | Persisted request/dispatch/candidate provenance contracts, synthetic B2 adapter and tenant/caller authorization exist                                                                    | Real provider validation; durable distributed adapter counters                                 | OD-06 and external integration approvals                                 | Keep provider-free synthetic contract     |
| Assignments/scheduling                | Worker-offer and Assignment handoff, concurrency policy and calendar representations exist                                                                                               | Authorized PostgreSQL concurrency and full staging journey                                     | Database witness and external target                                     | Evidence planning only                    |
| Attendance/punch-in/out               | Time-only attendance/check-in/out and exception boundaries exist; production mutation is disabled                                                                                        | Real device/location policy and execution are absent                                           | Location/privacy/worker-rights decisions; real maps prohibited           | Preserve attendance-handoff-only boundary |
| Contracts/documents                   | C1 import/leak checks and C3 v1.1 intake validator/runbook exist                                                                                                                         | Signed v1.1 artifact, checksum, provenance and executable C3                                   | Named contract owner and external artifact                               | Intake only after approval                |
| Pricing/invoicing/payments            | Truthful design/interface boundaries and no-economics-leak controls exist                                                                                                                | Executable money rules and providers are intentionally absent                                  | Finance/legal/worker-rights decisions; milestone prohibition             | No implementation                         |
| Notifications/communications          | Package boundary and synthetic B3 offer-delivery simulation exist; no real communication is sent                                                                                         | Provider selection/delivery evidence and durable state                                         | OD-06, integration/privacy approval and external provider                | No real communications                    |
| Candidate/offer adapters              | B2/B3 services plus schema-aligned PostgreSQL idempotency SQL, atomic Redis Lua ports, HMAC-scoped keys, dependency-aware readiness and local replica simulations exist                  | Packaged external composition, real PostgreSQL/Redis and multi-replica evidence                | Exact external targets, identities, secrets and staging approvals        | Keep packaged staging fail-closed         |
| QA reset/testing                      | B4 service plus durable PostgreSQL transaction/control contract, advisory lock, UUID ownership manifest, Prisma executor boundary and dependency-aware readiness exist                   | Approved operational entity payload/mutator, packaged composition and witnessed reset evidence | Business payload contract, identity verifier and external-stage approval | Keep packaged staging fail-closed         |
| Database/migrations                   | Operational schema plus staging-only QA-reset and synthetic-delivery persistence models, non-applied migration, checksums and boundary tests exist                                       | Disposable migration rehearsal, production diagnostic, backup/PITR                             | External target and staging authorization                                | Keep migration unapplied                  |
| Security/privacy/logging/retention    | Secret/public-bundle scans, safe errors, headers, role isolation and structured-log filtering exist                                                                                      | Approved retention/export/deletion/legal-hold rules and operational evidence                   | Privacy/legal owners and jurisdiction decisions                          | Preserve technical inventory              |
| Monitoring/operations                 | Health/readiness contracts, runbook and evidence validator exist                                                                                                                         | Real alerting, paging, secondary on-call and incident drill                                    | Monitoring owner, secondary on-call and external services                | Local policy tests only                   |
| Accessibility/responsive/localization | Semantics, selected states, contrast-oriented tokens, Next metadata and English/Arabic evidence requirements exist                                                                       | Automated exact-release browser checks, keyboard/manual, physical device, AT and human signoff | Staging/build/device/tester/accessibility owner                          | Do not mark gate complete                 |
| Tests/builds/docs/evidence            | Full local test/build/security toolchain, static container checks and evidence validators exist                                                                                          | Container runtime, real PostgreSQL/Redis, browser/native staging and human evidence            | External authorization and tools                                         | Maintain truthful local validation        |

## 4. Completed local milestones

1. Launch Safety Foundation: fail-closed production configuration and mutation boundary,
   database-backed authorization roles, registration restriction, response/header hardening and
   production fixture gate.
2. Persisted staffing request, dispatch, candidate provenance, worker offer, Assignment,
   attendance and timesheet foundations.
3. Milestone A: Cloud Run-compatible definitions for API, employer, admin and worker web, with
   static validation; container execution remains unverified.
4. Milestone B1: authentication limiter HTTP service, atomic Redis contract, fail-closed readiness
   and local multi-instance simulation.
5. Milestones B2/B3: synthetic candidate-source and offer-delivery adapters with no provider
   egress.
6. Milestone B4: staging-only QA reset policy/service using an abstract repository and
   deterministic in-memory implementation.
7. Milestones B5.1–B5.6: provider/verifier interfaces, official acquisition adapter behind
   injection, receiver application authorization, distinct QA identities, public-bundle controls
   and local validation.
8. QA-reset and OD-06 local persistence schema, non-applied migration, restrictive constraints,
   checksums and schema-boundary tests.
9. QA-reset advisory-lock/control repository, OD-06 fixed PostgreSQL persistence statements and
   atomic Redis Lua ports with fake-executor concurrency, outage, recovery and isolation tests.
10. Documentation-only QA-reset database and OD-06 decisions plus the consolidated B5 approval
    register.
11. Local security, environment, migration, boundary, packaging and evidence-validation tooling.
12. Shared `en-CA` locale-formatting boundary with explicit time zones and deterministic invalid
    input fallbacks; Arabic translation and RTL signoff remain external.
13. Admin textarea keyboard-focus parity, expanded accessible-name/tab semantics policy, and
    consolidated employer/admin/worker production fixture-exclusion tests.

These are local engineering statements only. They do not make a blocked launch gate GREEN.

## 5. Frozen approval-dependent implementation

### B5.7

Needs exact GCP project number, canonical Cloud Run URLs, service accounts, WIF subjects, IAM
grants, monitoring identity, named Infrastructure/Security/QA owners and action-specific approval.

### QA-reset external database execution

Local schema and migration preparation is authorized. Applying it to an external target, executing
mutations or capturing staging evidence still needs the external-stage approvals and exact target.
The packaged server also requires an approved fixed operational entity mutator and complete
synthetic business payload; it fails closed rather than inventing those records.

The current manifest lacks the approved tenant reference chain, authentication identities and
roles, request schedule/type/title, offer terms/response, and assignment validation inputs needed
for truthful application rows. Those values must be supplied through an expanded approved
manifest/template before a concrete entity mutator is implemented.

### OD-06 external persistence validation

Local schema and provider-free implementation is authorized. Real PostgreSQL/Redis validation and
staging use still need the named external-stage approvals and packaged dependency composition.

No external target may be created, accessed or changed before the register is completed with valid
approvals.

## 6. External launch work

1. Read-only production database diagnostic.
2. Contract Kit C3 v1.1 artifact intake and execution.
3. Isolated staging topology, identity, TLS, migration and provider validation.
4. Witnessed backup/PITR restore rehearsal.
5. Real two-replica Redis limiter validation and outage/recovery evidence.
6. Monitoring, paging, escalation and incident drill.
7. Browser E2E against exact-release fixture-free staging.
8. Signed native iOS/Android physical-device E2E.
9. Accessibility browser, keyboard, device, assistive-technology and owner signoff.
10. Privacy/legal policy approval and witnessed export/deletion tests.

Dependency Security and all other launch gates remain blocked. Local tests cannot substitute for
these records.

## 7. Local validation policy

For any later authorized local change, run proportionate focused tests first, then:

```sh
pnpm format
pnpm lint
pnpm typecheck
pnpm test
pnpm validate:env
pnpm validate:boundaries
pnpm validate:migrations
pnpm scan:secrets
pnpm build
pnpm scan:public-bundles
git diff --check
```

The required PostgreSQL suite may run locally without external evidence when an existing loopback
PostgreSQL server is available:

```sh
RWOS_POSTGRES_TEST_MODE=local-disposable \
RWOS_TEST_DATABASE_URL='postgresql://<local-user>@127.0.0.1:<port>/rwos_validation_admin' \
RWOS_TEST_DATABASE_CONFIRMATION=disposable-test-target \
pnpm test:postgres:required
```

This mode accepts loopback only, rejects application-database collisions, creates and drops a
random child database, and emits no staging evidence. Container, browser, native and external
PostgreSQL checks still require their exact runtime, target, credentials and authorization.
Unavailable external validation is a blocker, never a pass.

## 8. Stop and continuation rules

Stop the affected workstream when:

- a new dependency, schema or migration needs unrecorded approval;
- work overlaps unrelated user changes or a frozen decision package;
- a real database, Redis, provider, credential, GCP resource or production target is needed;
- a financial, legal, privacy, worker-rights, location or employer-obligation rule is missing;
- a destructive target is not exact and independently reviewable;
- a named person, independent witness or external authorization is required.

Continue only another independent, provider-free workstream that has a clear existing contract.
At this checkpoint, no additional feature milestone meets that test. Local disposable PostgreSQL
validation is complete; the next truthful launch step is human role assignment and scoped external
approval—not speculative implementation.
