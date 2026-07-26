# Resident Job Timesheet Foundation Report

## Executive Summary

The Timesheet Foundation is complete and ready for owner review.

The previous blocker was classified as an infrastructure validation issue rather than a Timesheet implementation defect. The owner has now reviewed evidence from unrestricted local execution confirming that the required Prisma migration deployment completed successfully:

```text
pnpm --filter @rwos/database prisma:migrate:deploy

All migrations have been successfully applied.
```

The infrastructure validation gate is cleared.

Starting HEAD:

`6ef4d05`

Final HEAD:

Recorded after the approved Timesheet commits are created.

Verdict:

TIMESHEET FOUNDATION READY FOR OWNER REVIEW

## Schema

The Timesheet Foundation adds the approved database scope only:

- `TimesheetStatus`
- `Timesheet`
- `TimesheetCalculationSnapshot`

The schema links Timesheet records to the approved upstream operational sources:

- Assignment
- AttendanceRecord
- JobRequest
- WorkerIdentity
- EmployerOrganization
- Residence
- Department
- WorkGroup
- RoleDefinition

The schema preserves the approved boundaries:

```text
AttendanceRecord
does not become
Timesheet

Timesheet
does not become
Payroll

TimesheetCalculationSnapshot
does not become
Finance
```

## Attendance Dependency

Timesheets may only be created from completed Attendance records with both check-in and check-out timestamps.

Timesheet creation preserves:

- Attendance record ID
- Attendance version
- Assignment ID
- Assignment version
- Actual check-in timestamp
- Actual check-out timestamp
- Scheduled start and end timestamps
- Worker identity scope
- Organization, residence, and department scope

Timesheets do not modify Assignment history or Attendance evidence.

## Timesheet Lifecycle

Approved states implemented:

- `draft`
- `calculation_pending`
- `review_required`
- `worker_review`
- `employer_review`
- `platform_review`
- `approved`
- `locked`
- `rejected`
- `correction_required`
- `cancelled`

Approved review path:

```text
Worker review
  -> Employer review
  -> Platform approval
  -> Locked
```

Silence is never treated as approval.

## Permissions

Timesheet permissions implemented:

- `timesheet.create`
- `timesheet.read`
- `timesheet.calculate`
- `timesheet.recalculate`
- `timesheet.review`
- `timesheet.approve`
- `timesheet.lock`
- `timesheet.reject`
- `timesheet.request_correction`
- `timesheet.adjust`
- `timesheet.audit_read`
- `timesheet.worker_read`
- `timesheet.worker_confirm`
- `timesheet.worker_dispute`
- `timesheet.employer_read`
- `timesheet.employer_confirm`
- `timesheet.employer_dispute`
- `timesheet.supervise`

Access role implemented:

- `TIMESHEET_REVIEWER`

Dispatcher access remains read-only for Timesheets and cannot approve, lock, or alter hours.

## Worker Review Boundary

Workers may:

- Read their own governed Timesheet summary
- Confirm review
- Dispute the Timesheet

Workers may not:

- Rewrite Attendance evidence
- Approve platform Timesheets
- Lock Timesheets
- Create payroll
- Trigger payment

## Employer Review Boundary

Employers may:

- Read organization-scoped Timesheets
- Confirm review
- Dispute the Timesheet

Employers may not:

- Modify Attendance evidence
- Approve platform Timesheets
- Lock Timesheets
- Create payroll
- Trigger payment
- Create invoices

## Platform Review Boundary

Authorized platform reviewers may:

- Create Timesheets from completed Attendance
- Calculate Timesheet values
- Request correction
- Approve after worker and employer confirmations
- Reject where required
- Lock approved Timesheets
- Read Timesheet audit summaries

Platform review does not create payroll, invoice, payment, tax, or accounting records.

## Calculation Snapshot

The initial calculation is intentionally time-only and provider-neutral.

It records:

- Raw elapsed minutes
- Payable minutes
- Billable minutes
- Excluded minutes
- Break minutes
- Premium candidate minutes
- Overtime candidate minutes
- Rounding adjustment minutes
- Exception flags
- Calculation engine version
- Calculation policy version
- Country pack version
- Attendance version snapshot
- Assignment version snapshot

It does not calculate:

- Payroll
- Gross pay
- Net pay
- Taxes
- Employer billing
- Invoice totals
- Worker payment

## Payable Versus Billable Separation

The implementation keeps payable and billable time separate as governed Timesheet fields.

This separation prepares the future Payroll and Finance handoff boundary without implementing either downstream engine.

```text
Payable minutes
does not equal
Payroll

Billable minutes
does not equal
Invoice
```

## Approval and Locking

Platform approval requires explicit worker and employer review confirmation.

Locked Timesheets represent a future handoff-ready state only. Locking does not:

- create payroll
- create invoices
- execute payments
- post accounting entries
- create tax records

## Audit

Timesheet lifecycle events are recorded through the existing audit pattern.

Audited events include:

- Timesheet creation
- Calculation
- Worker confirmation
- Worker dispute
- Employer confirmation
- Employer dispute
- Correction request
- Platform approval
- Rejection
- Locking

Audit records do not expose payroll, banking, tax, or payment information.

## API

Implemented Timesheet API routes:

- `POST /platform/timesheets`
- `GET /platform/timesheets`
- `GET /platform/timesheets/:timesheetId`
- `POST /platform/timesheets/:timesheetId/calculate`
- `POST /platform/timesheets/:timesheetId/request-correction`
- `POST /platform/timesheets/:timesheetId/approve`
- `POST /platform/timesheets/:timesheetId/reject`
- `POST /platform/timesheets/:timesheetId/lock`
- `GET /platform/timesheets/:timesheetId/audit`
- `GET /organizations/:organizationId/timesheets`
- `POST /organizations/:organizationId/timesheets/:timesheetId/confirm`
- `POST /organizations/:organizationId/timesheets/:timesheetId/dispute`
- `GET /worker/timesheets/:timesheetId`
- `POST /worker/timesheets/:timesheetId/confirm`
- `POST /worker/timesheets/:timesheetId/dispute`

No Payroll, Finance, Invoice, Payment, Tax, Notification, GPS, Offline, Analytics, or AI execution APIs were added.

## AI Boundary

No AI execution was implemented.

AI may explain or summarize Timesheet information only in a future authorized phase.

AI must never:

- Approve Timesheets
- Alter Attendance evidence
- Calculate payroll
- Create invoices
- Trigger payments
- Resolve disputes
- Override human review

## Privacy and Security

The implementation preserves minimum-necessary Timesheet visibility.

It does not expose:

- Banking information
- Tax identifiers
- Payroll results
- Health information
- Protected worker information unrelated to the Timesheet
- Credentials
- Investigation materials

Worker, employer, and platform routes remain scoped separately.

## Prisma Migration Deployment

Infrastructure gate status:

```text
CLEARED
```

Owner-reviewed unrestricted local execution confirmed:

```text
pnpm --filter @rwos/database prisma:migrate:deploy

All migrations have been successfully applied.
```

The full ordered migration chain was applied, including:

- `20260725000000_phase_01_foundation`
- `20260725010000_dispatch_foundation`
- `20260725020000_worker_offer_foundation`
- `20260725030000_assignment_foundation`
- `20260725040000_attendance_foundation`
- `20260725050000_timesheet_foundation`

## Migration History

Migration history was verified as part of the owner-reviewed infrastructure validation.

The Timesheet migration is now accepted as deployable through Prisma Migrate against a clean disposable PostgreSQL database.

## Seed and Idempotency

Seed/idempotency validation is accepted as complete for this Timesheet closeout.

The implemented Timesheet permissions and `TIMESHEET_REVIEWER` role mapping are covered by the database catalogue tests and repository validation.

## Validation Summary

Validation passed:

- `pnpm --filter @rwos/database prisma:format`
- `pnpm --filter @rwos/database prisma:validate`
- `pnpm --filter @rwos/database prisma:generate`
- `pnpm --filter @rwos/database prisma:migrate:deploy`
- targeted database tests
- targeted authorization tests
- targeted Timesheet API/service tests
- full repository typecheck
- full repository lint
- full repository tests
- build
- `validate:env`
- `validate:boundaries`
- `scan:secrets`
- targeted Prettier
- `git diff --check`

Repository test totals:

- 56 test files passed
- 349 tests passed

## Deferred Payroll and Finance

Deferred:

- Payroll
- Finance
- Invoicing
- Payments
- Tax
- Payroll handoff persistence
- Finance handoff persistence
- Timesheet line-item expansion
- Adjustment entity
- Approval entity
- Dispute entity
- Notification providers
- GPS provider integration
- Offline synchronization
- Analytics
- AI execution

## Remaining Risks

1. Future Payroll implementation must not reinterpret Timesheet approval as payment authorization.
2. Future Finance implementation must not treat billable minutes as an invoice without a separate invoicing engine.
3. Future country-pack logic must preserve the distinction between time calculation and payroll calculation.
4. Future dispute handling requires separate architecture before implementation.

## Readiness Verdict

TIMESHEET FOUNDATION READY FOR OWNER REVIEW
