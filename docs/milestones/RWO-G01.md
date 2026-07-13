# RWO-G01 - Worker Identity and Shift Discovery Foundation

**Status:** Implemented locally  
**Branch:** `foundation/repository-foundation`  
**Date:** 2026-07-13

## Objective

Create the first controlled worker-app vertical slice without beginning applications, offers, attendance, payroll, payments, AI recommendations, employer workflows, admin workflows, production database migrations, deployment, or live integrations.

## Scope Delivered

- Shared worker identity domain contract.
- Shared shift discovery domain contract.
- Validation schemas for worker identity, shift records, money, dates, filters, and enums.
- Mobile navigation foundation:
  - Home
  - Available
  - Shift Details
  - Filters route name
  - My Shifts
  - Billing
  - Profile
  - Notifications
- Functional Available screen.
- Functional Shift Details screen.
- Search and basic filters:
  - keyword
  - city
  - category
  - date
  - minimum hourly rate
  - time of day
  - urgency
- Local mock repository behind `ShiftDiscoveryRepository`.
- Loading, populated, empty, error, retry, and reset-filter states.
- Reusable mobile primitives backed by `packages/design-system` and `packages/ui` boundaries.

## Explicit Exclusions

- Real authentication provider.
- Employer portal business workflows.
- Admin decisions.
- Shift application submission.
- Shift acceptance.
- Attendance or punch-in/out.
- Timesheets.
- Payroll or payments.
- Notification delivery.
- AI recommendations.
- Production database schema or migrations.
- Deployment.

## Architecture

G01 separates domain, validation, data access, and visual surfaces:

```text
packages/shared/src/domain
  WorkerIdentity
  ShiftDiscoveryRecord
  ShiftDiscoveryFilters
  ShiftDiscoveryRepository

packages/validation/src/domain
  workerIdentitySchema
  shiftDiscoveryRecordSchema
  shiftDiscoveryFiltersSchema

apps/mobile/src/features/shifts
  AvailableShiftsScreen
  ShiftDetailsScreen
  ShiftDiscoveryRepository usage
  filter and formatting helpers

apps/mobile/src/data/mock
  synthetic shift fixtures only
```

## Domain Contracts

Worker identity includes the approved G01 fields only. No identity documents or sensitive verification payloads are stored in G01.

Shift discovery uses integer minor-unit money values:

```text
$50.00 CAD = { amountMinor: 5000, currency: "CAD" }
```

Dates are transported as ISO-compatible strings. UI formatting is kept in mobile formatting helpers.

## Repository Interface

`ShiftDiscoveryRepository` defines:

- `listAvailableShifts(filters)`
- `getShiftById(id)`
- `listShiftCategories()`
- `listSupportedCities()`

`MockShiftDiscoveryRepository` implements this interface with local synthetic records. Future API integration must replace the implementation, not the visual components.

## Navigation Routes

- `rwos://worker/home`
- `rwos://worker/available`
- `rwos://worker/available/:shiftId`
- `rwos://worker/available/filters`
- `rwos://worker/my-shifts`
- `rwos://worker/billing`
- `rwos://worker/profile`
- `rwos://worker/notifications`

## Tests

Coverage added for:

- Worker validation.
- Shift validation.
- Invalid money values.
- Invalid date ranges.
- Invalid status values.
- Listing available shifts.
- Getting a shift by ID.
- Unknown shift lookup.
- Filter combinations.
- Empty results.
- Available loading, populated, empty, error, retry-message, and reset-filter state paths.
- Navigation route names.
- Shift Details unavailable-applications message.
- Boundary checks preventing visual components from importing mock data directly.
- Boundary checks preventing worker-facing mobile code from exposing client billing/platform margin terms.

## Known Limitations

- Mock data is local and synthetic.
- No API repository exists yet.
- No real authentication provider exists yet.
- No application or acceptance action is enabled.
- No screenshots were captured in this implementation pass.
- Expo web export validates the shell; native device review remains a future review activity.

## G02 Prerequisites

Before RWO-G02 starts:

- Review the G01 mobile flow visually.
- Confirm that the worker-facing compensation language remains separated from client billing and platform margin.
- Approve the repository contract for API replacement.
- Authorize applications/offers explicitly.
