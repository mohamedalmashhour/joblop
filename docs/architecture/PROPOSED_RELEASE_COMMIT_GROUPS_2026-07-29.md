# Proposed Release Commit Groups — 2026-07-29

Status: **classification only; no files staged, committed, pushed, deleted or overwritten**

Branch observed: `main`

This document classifies the current dirty worktree for owner review. It does not establish
authorship or authorize inclusion. Git status alone cannot distinguish all pre-existing user-owned
changes from later platform work, so every group requires diff review before staging.

## Concise approval table

Counts below use non-overlapping recommended core membership. Shared integration files and
conditional files are counted separately so they are never silently duplicated between commits.

| Order | Group                                      | Purpose                                                                            | Exact core count | New / modified | Validation completed                                                          | Dependencies                           | Uncertain or user-owned boundary                                 | Recommendation                                    |
| ----: | ------------------------------------------ | ---------------------------------------------------------------------------------- | ---------------: | -------------: | ----------------------------------------------------------------------------- | -------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------- |
|     1 | Database integrity and durable state       | Candidate identity, synthetic delivery, QA state and operational-chain constraints |                6 |          3 / 3 | 11-migration integrity, schema tests, disposable PostgreSQL                   | None                                   | Mixed-purpose schema/migration group; review as a unit           | Safe after owner reviews broad DB scope           |
|     2 | Trusted service identity and adapters      | Service authentication, limiter, candidate source and offer delivery               |               60 |         59 / 1 | Package lint/typecheck, HTTP/unit/security and zero-egress tests              | Group 1 for durable delivery           | One modified limiter runbook; root wiring separate               | Safe after Group 1                                |
|     3 | QA-reset application and local harness     | Deterministic 24-entity reset, durable execution and PostgreSQL harness            |               31 |         31 / 0 | 89 local tests plus 1/1 lifecycle test, lint/typecheck, disposable PostgreSQL | Groups 1–2 and shared integration      | Entire app is untracked; provenance review required              | Safe after Groups 1–2                             |
|     4 | API authorization and operations           | Organization-bound API, staffing, assignments, attendance and timesheets           |                9 |          0 / 9 | 41 API tests, auth tests, lint/typecheck                                      | Groups 1–2                             | `package.json` and `tsconfig` contain mixed integration concerns | Safe after Groups 1–2                             |
|     5 | Calendar, session and validation contracts | Persisted calendar, frontend sessions and identity-chain validation                |               10 |         0 / 10 | Auth/shared/validation and session integration tests                          | Group 4                                | Broad platform integration source/test excluded pending review   | Safe core; conditional files require approval     |
|     6 | Admin authenticated application            | Admin calendar, dispatch, assignment, middleware and accessibility                 |               22 |         3 / 19 | Admin tests, navigation, accessibility, lint/typecheck/build                  | Groups 4–5 and 9                       | Package/container files remain in Group 10/shared integration    | Safe after dependencies                           |
|     7 | Employer authenticated application         | Selected-organization session and calendar surface                                 |               13 |         2 / 11 | Employer tests, navigation, accessibility, lint/typecheck/build               | Groups 4–5 and 9                       | Packaging files excluded to Group 10                             | Safe after dependencies                           |
|     8 | Worker authenticated application           | Secure worker session, calendar and accessibility                                  |                6 |          1 / 5 | Mobile session/accessibility tests, lint/typecheck/build                      | Groups 4–5 and 9                       | `apps/mobile/App.tsx` excluded pending explicit review           | Safe core; demo surface conditional               |
|     9 | Shared UI and locale                       | Contrast, accessibility primitives, responsive and locale contracts                |                9 |          3 / 6 | UI/design/locale/accessibility tests and typechecks                           | Group 5 shares the domain barrel       | Shared barrel needs hunk-level ownership review                  | Safe with coordinated barrel review               |
|    10 | Container packaging                        | Docker sources, health/readiness and worker web server                             |               26 |         26 / 0 | Build and 20/20 static container tests                                        | Groups 2–8 plus shared package scripts | Runtime Docker validation unavailable locally                    | Safe as packaging source; not deployment evidence |
|    11 | Local validation and security tooling      | Secret/bundle gates, PostgreSQL runner, evidence and E2E policies                  |               44 |        26 / 18 | Policy tests, scans, local PostgreSQL 4/4                                     | Groups 1–10 and shared integration     | Online dependency audit and external E2E remain gated            | Safe local-policy core                            |
|    12 | Governance and completion evidence         | Plans, decision records, launch matrices and approval forms                        |               24 |         19 / 5 | Consistency and terminology review                                            | Groups 1–11                            | Human attestations and provenance-sensitive documents            | Conditional; approve last                         |
|    13 | Shared root integration                    | Workspace scripts, lockfile, TypeScript/Vitest and CI wiring                       |                7 |          0 / 7 | Full lint, typecheck, tests, builds and policy scans                          | Groups 1–11                            | Whole files combine multiple groups                              | Safe only after hunk/file review                  |

### Files outside safe core groups

- Conditional broad platform integration: 2 modified files —
  `packages/shared/src/domain/platformIntegration.ts` and
  `tests/integration/platform-integration.test.ts`.
- Conditional worker demo surface: 1 modified file — `apps/mobile/App.tsx`.
- Generated/excluded artifacts: 3 new files — two PDFs under `output/pdf/` and one PNG under
  `tmp/pdfs/`.
- Dependency advisory conclusions remain conditional on an authorized successful online audit.

Recommended commit order:

`1 → 2 → 3 → 4 → 5 → 9 → 6 → 7 → 8 → 10 → 11 → 13 → 12`

## Proposed groups

### 1. Database integrity and durable state

Include together:

- `packages/database/prisma/schema.prisma`
- `packages/database/prisma/migrations/checksums.json`
- `packages/database/prisma/migrations/20260727020000_dispatch_candidate_worker_identity_uniqueness/`
- `packages/database/prisma/migrations/20260729000000_qa_reset_and_synthetic_delivery_state/`
- `packages/database/prisma/migrations/20260729010000_operational_scope_chain_integrity/`
- `packages/database/src/schema-boundary.test.ts`

Reason: schema, checksum manifest and all three migrations are coupled. The files combine candidate
identity, synthetic delivery, QA-reset state and operational scope-chain constraints and are not
safe to cherry-pick independently.

### 2. Trusted service identity and local service adapters

Include:

- `packages/service-auth/**`
- `apps/auth-limiter/**`
- `apps/candidate-source/**`
- `apps/offer-delivery/**`
- `tests/integration/internal-service-http-security.test.ts`
- associated adapter runbooks

Reason: shared receiver authentication, audience validation, local/fake rate limiting, synthetic
candidate sourcing, synthetic offer delivery and zero-egress behavior form one security boundary.

### 3. Deterministic QA-reset application

Include:

- `apps/qa-reset/**`, except its Dockerfile may travel with container packaging
- `scripts/validate-qa-reset-local-postgres.sh`
- QA-reset package/script wiring from shared root configuration

Depends on groups 1 and 2. The app includes the 24-entity fixture factory, 70 denial cases, durable
inspection and mutation, retained audit evidence verification, HTTP/auth boundaries and the real
PostgreSQL lifecycle test.

### 4. API authorization and operational workflows

Include:

- `apps/api/**`
- `packages/auth/src/index.ts` and corresponding test
- `packages/auth/src/productionIntegrations.ts` and corresponding test

Reason: organization-bound API responses, staffing, dispatch, assignment, attendance and timesheet
operations share the same authorization and persistence contracts.

### 5. Calendar, frontend session and validation contracts

Include:

- `packages/auth/src/calendarRequest.ts` and test
- `packages/auth/src/frontendSession.ts` and test
- `packages/shared/src/domain/connectedCalendar.ts` and test
- `packages/validation/src/domain/application.ts` and test
- related integration tests

Reason: persisted calendar authorization, session transport, application identity chains and
cross-organization projection checks are one contract layer.

### 6. Admin authenticated operations

Include the admin calendar, dispatch, candidate-review, offer/assignment, session-boundary and
associated test files under `apps/admin/app/api`, `apps/admin/app/calendar` and
`apps/admin/app/dispatches`.

Reason: these files implement one admin request-to-assignment workflow and its route-ID and
organization-binding checks.

### 7. Employer authenticated calendar surface

Include the employer session boundary, middleware, route policy, shell, calendar panels,
accessibility test and associated styles/tests under `apps/employer`.

Reason: these files implement selected-organization sessions and the persisted employer calendar
surface.

### 8. Worker session, calendar and accessibility

Include:

- `apps/mobile/src/auth/**`
- `apps/mobile/src/ProductionApp.tsx`
- `apps/mobile/src/features/worker-calendar/**`
- `apps/mobile/src/ui/**`
- required package and TypeScript wiring

Reason: secure worker sessions, offer/reference binding, calendar presentation and worker
accessibility are coupled. Review `apps/mobile/App.tsx` separately because it is a fixture/demo
surface.

### 9. Shared UI and locale behavior

Include:

- `packages/design-system/**`
- `packages/ui/**`
- `tests/integration/local-accessibility-contract.test.ts`
- `packages/shared/src/domain/localeFormatting.ts` and test
- `apps/mobile/src/features/shifts/formatters.ts`

Reason: contrast-safe tokens, accessibility primitives, responsive contracts and locale formatting
are independently reviewable presentation behavior.

### 10. Container packaging and health/readiness

Include:

- `.dockerignore`
- `container-build-matrix.json`
- application Dockerfiles
- admin/employer health and readiness routes/tests
- `apps/mobile/server.*`
- `scripts/container-packaging.test.ts`
- `scripts/validate-containers.mjs`
- `docs/runbooks/CLOUD_RUN_APPLICATION_PACKAGING.md`

Reason: this is deployable packaging only. It is not staging or production evidence.

### 11. Local validation and security policy tooling

Include:

- environment classification and public-bundle policy/validator
- secret scanner changes
- localhost/staging PostgreSQL target policy and required-test runner
- contract-kit, launch-evidence and staging policy validators/tests
- browser/native input validators and E2E source
- corresponding runbooks

Prefer subcommits for public-bundle/secret gates, local PostgreSQL validation, external-evidence
policy and E2E policy. Root `package.json`, lockfile, TypeScript configs, Vitest config and workflow
changes are shared integration files and require hunk-level review.

### 12. Governance and completion evidence

Review separately after implementation groups:

- root launch, privacy, accessibility and deployment documents
- `docs/approvals/**`
- owner registers, decision packages and human approval forms
- `LOCAL_*` plans/reports and completion reports
- GCP planning and external-validation inventories

These are provenance-sensitive attestations and plans, not executable implementation. Do not
include them automatically.

## Exclude from proposed source commits

- `output/pdf/*.pdf`
- `tmp/**`
- rendered witness images or approval forms
- `.next`, `dist`, coverage or other generated build output if it later appears

The current `output/` and `tmp/` content is generated evidence/inspection material. No deletion is
authorized; exclusion means only “do not stage automatically.”

## Review decisions required before staging

1. Confirm which proposed groups belong to the intended release.
2. Confirm whether broad `packages/shared/src/domain/platformIntegration.ts` changes are approved.
3. Confirm whether `apps/mobile/App.tsx` demo/fixture changes belong in the release.
4. Confirm provenance and inclusion of governance/approval documents.
5. Decide whether shared root configuration is reviewed by whole file or staged by approved hunks.
6. Decide whether the dependency advisory document reflects an approved current audit result.

Only after these decisions should exact file lists and commit order be converted into a staging
plan. Production remains excluded, and Phase 2 staging still requires the exact GCP staging project
ID and maximum spending authorization.
