# RWO-G02 - Worker Applications, Offers and Confirmation

**Status:** Implemented locally  
**Branch:** `foundation/repository-foundation`  
**Date:** 2026-07-13

## Objective

Extend the worker app from G01 shift discovery into the first controlled commitment flow:

```text
Available Shift
  -> Application Review
  -> Application Submitted
  -> Offer Review
  -> Offer Accepted or Declined
  -> Final Confirmation
  -> Confirmed or Declined
```

## Scope Delivered

- Shared G02 domain contracts:
  - `WorkerApplication`
  - `ShiftOffer`
  - `WorkerConfirmation`
  - `LocalAuditEvent`
- Application, offer, and confirmation state transition helpers.
- Validation schemas for all G02 domain records.
- `WorkerApplicationRepository` interface.
- Local `MockWorkerApplicationRepository` with synthetic state and audit events.
- Apply flow from Shift Details.
- Application review screen with final submit review gate.
- Application success screen.
- Application details screen with withdrawal.
- My Shifts section for applications, offers, pending confirmations, and confirmed shifts.
- Offer Details screen with original/current worker-facing term comparison.
- Confirmation Details screen with final human confirmation gate.
- Typed mobile routes for application, offer, and confirmation surfaces.
- Focused domain, repository, route, and boundary tests.

## Explicit Exclusions

- Attendance.
- Punch-in or punch-out.
- Post-shift work logs.
- Payroll.
- Worker payout.
- Client billing.
- Payment authorization.
- Employer portal workflows.
- Admin approval workflows.
- Production API business endpoints.
- Production database schema or migrations.
- Push notifications, SMS, or email delivery.
- AI matching or autonomous recommendations.
- Deployment.

## Architecture

G02 keeps the same layered pattern as G01:

```text
packages/shared/src/domain/application.ts
  WorkerApplication
  ShiftOffer
  WorkerConfirmation
  WorkerApplicationRepository
  State transition helpers

packages/validation/src/domain/application.ts
  Zod schemas for G02 records

apps/mobile/src/features/applications
  Application, offer, confirmation, and My Shifts screens
  Mock repository adapter

apps/mobile/App.tsx
  Local route orchestration only
```

## Repository Interface

`WorkerApplicationRepository` defines:

- `submitApplication(input)`
- `getApplicationById(id)`
- `listWorkerApplications(workerId, filters)`
- `withdrawApplication(id)`
- `acceptOffer(offerId)`
- `declineOffer(offerId)`
- `confirmShift(confirmationId)`
- `declineConfirmation(confirmationId)`
- `listAuditEvents()`

The local mock implementation is the only G02 data source. Future API integration must implement
the repository contract rather than moving data logic into screens.

## Worker-Facing Commercial Boundary

G02 continues the commercial separation from Milestone 001 and G01:

- Worker-facing screens show worker hourly rate and worker-facing estimated total.
- Client billing, platform margin, commercial billing rate, and payment capture are not exposed in
  worker mobile code.
- Offer changes are shown as worker-visible terms only.

## Human Decision Boundary

Every state-changing worker action is explicit:

- Submit application requires review.
- Accept offer requires a second review press.
- Decline offer requires a second review press.
- Confirm shift requires a second review press.
- Decline confirmation requires a second review press.

No system or AI actor commits a worker to a shift in G02.

## Tests

Coverage added for:

- Valid and invalid application state transitions.
- Valid and invalid offer state transitions.
- Valid and invalid confirmation state transitions.
- Immutable shift offer snapshots.
- Validation schemas for application, offer, confirmation, summary, and audit events.
- Application submission and local audit event creation.
- Duplicate active application blocking.
- Application withdrawal.
- Offer acceptance with changed terms.
- Offer decline into terminal state.
- Final shift confirmation.
- Repeated terminal offer transition blocking.
- Expired offer blocking.
- Worker application summary listing.
- G02 route names.
- Boundary checks preventing application screens from importing mock data arrays directly.
- Boundary checks preventing G02 from implementing attendance, payroll, payment, or margin concepts.

## Known Limitations

- All data remains synthetic and local.
- No production API exists for applications, offers, or confirmations.
- No production database migrations exist.
- No real authentication or authorization exists.
- No live notification delivery exists.
- No employer or admin screens exist for creating offers.
- No attendance, punch, payout, invoice, billing, or payment workflow exists.
- Visual review evidence remains to be captured after the G02 shell is opened locally.

## G03 Prerequisites

Before G03 starts:

- Review the G02 mobile application, offer, and confirmation flow visually.
- Confirm the My Shifts information hierarchy.
- Confirm worker-facing commercial separation remains intact.
- Confirm the state transition model is accepted.
- Approve whether G03 should cover attendance/check-in or a narrower worker schedule slice.
