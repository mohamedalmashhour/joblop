# Resident Job Backend Persistence Phase 1 Report

## Scope

Backend Persistence Phase 1 makes the approved calendar and staffing-request workflow durable without introducing a second lifecycle authority.

The existing `JobRequest` remains authoritative for:

- draft creation and editing
- submission
- admin review
- information requests
- approval for dispatch
- cancellation
- tenant isolation
- audit history

Phase 1 adds one optional `StaffingRequestCalendarProfile` per `JobRequest` for calendar-specific operational metadata:

- duties summary
- qualifications
- address summary
- special instructions
- contract verification state
- payment-method readiness state
- location verification state

The profile contains no client rate, worker pay, platform margin, payout, payment secret, tax, invoice, notification, map-provider, AI, attendance-execution, or currency field.

## Persistence Design

Migration:

`packages/database/prisma/migrations/20260727000000_calendar_request_persistence/migration.sql`

The migration adds:

- `CalendarVerificationState`
- `staffing_request_calendar_profiles`
- one-to-one foreign key to `job_requests`
- organization and residence read indexes
- optimistic-concurrency version

Client metadata edits reset all verification states to `pending`. Trusted verification transitions are available only through the platform-admin authorization path. Initial-create uniqueness races and stale versions resolve to a stable conflict instead of silently overwriting data.

## Service and Privacy Boundaries

`createCalendarRequestService` composes the existing authorized `JobRequestService` and `WorkerOfferService`.

- Client reads and writes delegate through organization-scoped Job Request authorization.
- Admin reads and verification updates delegate through platform-admin Job Request authorization.
- Worker offer calendar references delegate through worker ownership checks.
- Worker calendar reads are non-mutating and do not mark offers viewed.
- Client projections omit authoritative internal lifecycle names and admin-review reasons.
- Worker projections contain worker-visible terms only.
- Calendar persistence does not contain economics.

## API Surface

Client:

- `PUT /organizations/:organizationId/calendar/requests/:jobRequestId/profile`
- `GET /organizations/:organizationId/calendar/requests`
- `GET /organizations/:organizationId/calendar/requests/:jobRequestIdOrNumber`

Admin:

- `GET /platform/calendar/requests`
- `GET /platform/calendar/requests/:jobRequestIdOrNumber`
- `PUT /platform/calendar/requests/:jobRequestIdOrNumber/verification`

Worker:

- `GET /worker/calendar/offers/:workerOfferId`

All routes require an authenticated session and reuse existing role, membership, tenant, admin, or worker-ownership checks.

## Frontend Integration Decision

The connected UI remains fixture-backed in Phase 1.

Direct API wiring was not safe within this milestone because the current frontend does not yet have the authenticated request transport and governed loading, empty, stale, restricted, unavailable, error, or optimistic-conflict states required by RJDS. The employer create-request page is also not yet a semantic form.

Keeping the existing fixture copy preserves truthful UI behavior. A later explicitly authorized integration item can replace fixtures atomically after those states and authentication transport exist.

## Review Findings Addressed

Quality Control:

- separated trusted verification from client metadata writes
- rejected invalid and over-limit metadata
- added optimistic concurrency
- reset verification after client edits
- removed admin-only lifecycle fields from client projections
- added API and service coverage

Security and Safety:

- prevented client self-verification
- made worker calendar GET non-mutating
- preserved existing tenant, admin-role, and worker-ownership authorization
- confirmed no `.env`, secret, or prohibited execution expansion

Design Control:

- kept UI fixture-backed rather than introducing incomplete persistence claims
- deferred live integration until complete RJDS data states and semantic forms are available
- recorded the existing 320px admin-grid risk for the future UI integration item

## Explicit Deferrals

- frontend fixture-to-API replacement
- payroll and worker payout
- payment execution
- invoices
- tax calculation
- notifications
- real maps
- AI automation
- attendance execution
- deployment
- C3 money conformance
- currency selection, including proposed Canada/CAD and non-Canada/USD policy, until contract kit v1.1 and jurisdictional review

## Validation

Required repository validation:

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `pnpm scan:secrets`
- `git diff --check`

The macOS system temporary volume was full during implementation, so validation used a repository-local `TMPDIR` on the SSD without changing `.env`.

Final results:

- typecheck: passed
- lint: passed
- tests: 425 passed, 9 intentionally skipped
- build: passed
- secret scan: passed
- diff check: passed

## Verdict

BACKEND PERSISTENCE PHASE 1 COMPLETE
