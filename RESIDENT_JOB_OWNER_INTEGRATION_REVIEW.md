# Resident Job Owner Integration Review

## 1. Shared Domain Audit

Audit source: `packages/shared/src/domain/platformIntegration.ts`

The repository now has one canonical shared-domain vocabulary exported from `@rwos/shared`. The canonical concepts are:

| Concept | Canonical owner | Authoritative source | Duplication result |
| --- | --- | --- | --- |
| EmployerOrganization | Admin | Organization owner workflow | No duplicate canonical definition found |
| Residence | Employer | Residence owner workflow | No duplicate canonical definition found |
| Department | Employer | Department owner workflow | No duplicate canonical definition found |
| Role | Admin | Role and permission owner workflow | No duplicate canonical definition found |
| Shift | Employer | Shift owner workflow | No duplicate canonical definition found |
| Application | Worker | Application owner workflow | No duplicate canonical definition found |
| Recommendation | System | AI recommendation workflow | No duplicate canonical definition found |
| Assignment | Employer | Assignment owner workflow | No duplicate canonical definition found |
| AttendanceRecord | Worker | Attendance owner workflow | No duplicate canonical definition found |
| Timesheet | Employer | Timesheet owner workflow | No duplicate canonical definition found |
| Invoice | Employer | Invoice owner workflow | No duplicate canonical definition found |
| EmployerPayment | Employer | Employer payment owner workflow | No duplicate canonical definition found |
| WorkerPayable | Admin | Worker payable owner workflow | No duplicate canonical definition found |
| Notification | System | Notification event workflow | No duplicate canonical definition found |
| MessageThread | System | Messaging owner workflow | No duplicate canonical definition found |
| SupportCase | Admin | Support owner workflow | No duplicate canonical definition found |
| AuditEvent | System | Audit owner workflow | No duplicate canonical definition found |

Result: Shared concept coverage is complete. No duplicate canonical concept definitions were identified. Existing app-level fixtures still use local content models, but those are presentation fixtures, not competing authoritative domain definitions.

## 2. State-Machine Audit

Audit source: shared state definitions and route/page content in employer, worker, and admin surfaces.

| Workflow | Canonical state names | Employer usage | Worker usage | Admin usage | Result |
| --- | --- | --- | --- | --- | --- |
| Shift | `draft`, `published`, `open`, `reserved`, `confirmed`, `in_progress`, `completed`, `cancelled`, `expired` | Create, review, publish, published, detail | Discovery and shift detail | Shift summary and supervision | Aligned through shared model |
| Application | `draft`, `submitted`, `under_review`, `offered`, `accepted`, `confirmed`, `withdrawn`, `rejected`, `expired`, `cancelled` | Applicants, applicant detail, comparison | Apply, application detail, My Shifts | Supervision only | Aligned through shared model |
| Assignment | `proposed`, `pending_worker_response`, `accepted`, `declined`, `expired`, `cancelled`, `confirmed`, `active`, `completed`, `replacement_requested` | Manual assignment, worker response, assignment detail | Offer, confirmation, attendance handoff | Operations supervision | Aligned through shared model |
| Attendance | `scheduled`, `arrival_window`, `ready_to_clock_in`, `clocked_in`, `in_progress`, `on_break`, `clocked_out`, `completed`, `exception_review`, `missed_clock_in`, `missed_clock_out`, `no_show`, `cancelled`, `replacement_required` | Attendance monitoring states | Worker attendance states | Supervision only | Aligned through shared model |
| Timesheet | `draft`, `worker_review`, `correction_requested`, `employer_review`, `partially_approved`, `approved`, `disputed`, `locked`, `finance_ready` | Review, clarification, corrected, approved | Worker review, correction, finance-ready view | Payroll/finance supervision | Aligned through shared model |
| Invoice | `draft`, `generated`, `employer_review`, `correction_requested`, `issued`, `partially_paid`, `paid`, `void`, `disputed`, `exported` | Invoices, detail, breakdown | Not worker-owned | Finance supervision | Aligned through shared model |
| Payment | Employer: `authorized`, `scheduled`, `processing`, `sent`, `settlement_pending`, `settled`, `failed`, `returned`, `reversed`, `held`; Worker: `pending_timesheet_approval`, `finance_ready`, `payable_created`, `payment_scheduled`, `processing`, `paid`, `failed`, `on_hold`, `disputed`, `reconciled` | Employer payment states | Worker earnings/payable states | Finance/payroll supervision | Aligned with separate employer payment and worker payable concepts |
| Support | `question`, `support`, `active_shift_support`, `operational_review`, `closed`, `reopened` | Support handoff only | Support mode | Admin support supervision | Aligned through shared model |
| Audit | `recorded`, `restricted`, `retained`, `retention_expired` | Audit references only | No mutation | Audit Log surface | Aligned through shared model |

Inconsistencies highlighted: none requiring architecture change. Some UI copy uses display labels such as `Pending Worker Response`, while canonical domain states use machine-safe names such as `pending_worker_response`. This is an acceptable presentation difference because tests validate the shared canonical names.

## 3. Route Audit

Employer implemented routes found:

- Public: `/`, `/about`, `/contact`, `/faq`, `/how-it-works`, `/pricing`, `/signup/employer`
- Onboarding: `/employer/onboarding/company`, `/employer/onboarding/residences`, `/employer/onboarding/departments`
- Dashboard: `/employer/dashboard`
- Shifts: `/employer/shifts/create`, `/employer/shifts/recurring`, `/employer/shifts/urgent`, `/employer/shifts/review`, `/employer/shifts/publish`, `/employer/shifts/detail`, `/employer/shifts/published`, `/employer/shifts/ai-suggestions`
- Applicants and assignments: `/employer/applicants`, `/employer/applicants/detail`, `/employer/applicants/compare`, `/employer/assignments/manual`, `/employer/assignments/review`, `/employer/assignments/confirmation`, `/employer/assignments/worker-response`, `/employer/assignments/detail`
- Attendance: `/employer/attendance`, `/employer/attendance/arrival`, `/employer/attendance/clock-in`, `/employer/attendance/in-progress`, `/employer/attendance/clock-out`, `/employer/attendance/exceptions`
- Timesheets: `/employer/timesheets`, `/employer/timesheets/review`, `/employer/timesheets/clarification`, `/employer/timesheets/corrected`, `/employer/timesheets/approved`
- Finance: `/employer/invoices`, `/employer/invoices/detail`, `/employer/invoices/breakdown`, `/employer/payments`, `/employer/payments/method`, `/employer/payments/authorization`, `/employer/payments/settlement`, `/employer/payments/receipt`, `/employer/payments/exceptions`
- Reports: `/employer/reports`

Worker implemented route references found:

- `rwos://worker/home`
- `rwos://worker/signup`
- `rwos://worker/onboarding/profile`
- `rwos://worker/onboarding/qualifications`
- `rwos://worker/onboarding/availability`
- `rwos://worker/onboarding/review`
- `rwos://worker/available`
- `rwos://worker/available/:shiftId`
- `rwos://worker/available/:shiftId/apply`
- `rwos://worker/applications/:applicationId/success`
- `rwos://worker/applications/:applicationId`
- `rwos://worker/offers/:offerId`
- `rwos://worker/confirmations/:confirmationId`
- `rwos://worker/assignments/:assignmentId/attendance`
- `rwos://worker/assignments/:assignmentId/timesheet`
- `rwos://worker/earnings`
- `rwos://worker/ratings`
- `rwos://worker/messages`
- `rwos://worker/support`
- `rwos://worker/owner-review`
- `rwos://worker/calendar`
- `rwos://worker/my-shifts`
- `rwos://worker/billing`
- `rwos://worker/profile`
- `rwos://worker/notifications`

Admin implemented routes found:

- `/`
- `/phase-01-review`
- `/workers`
- `/employers`
- `/residences`
- `/shifts`
- `/finance`
- `/payroll`
- `/compliance`
- `/reports`
- `/audit-log`
- `/system-settings`
- `/ai-control-center`
- `/notification-center`
- `/platform-analytics`

Route audit result:

- Orphan routes: none identified from static route inventory.
- Duplicate pages: no duplicate implemented route paths identified.
- Inconsistent naming: no blocking naming issue identified.
- Missing back navigation: not fully runtime-click tested in this documentation-only phase; static links and tested route constants are present.
- Broken review links: no broken route constant detected by tests.

## 4. Fixture Audit

Fixture-backed areas are intentionally still present because backend implementation has not begun.

| Area | Fixture status | Boundary result |
| --- | --- | --- |
| Employer onboarding | Development fixture organization/residence/department | Does not claim approval or persistence |
| Employer shift creation | Development fixture, no server persistence, no backend publication | Does not claim live shift creation |
| Employer applicants | Fixture-backed candidate data, no backend assignment engine, no real notifications | Does not claim real worker assignment |
| AI suggestions | Advisory fixture | Does not assign workers |
| Attendance | Fixture-backed attendance data, no server attendance persistence | Does not claim GPS/live feed |
| Timesheets | Fixture-backed timesheet data, no worker payment execution | Does not claim payroll or payment |
| Invoices | Fixture-backed invoice data, no payment provider | Does not claim charge execution |
| Payments | Fixture-backed payment state | Does not claim settlement |
| Reports | Static frontend summaries | Does not claim live reporting |
| Worker onboarding/profile | Fixture-backed profile data, no identity/credential/background integration | Does not claim verification |
| Worker discovery/applications | Local fixture repository | Does not claim persistence |
| Worker attendance/timesheet/earnings | Fixture-backed workflow summaries | Does not claim payroll/payment |
| Worker messages/support/ratings | Fixture-backed service content | Does not send messages, publish ratings, or open support cases |
| Admin pages | Development fixtures | Supervision only; no workflow execution |

Fixture audit result: no reviewed page claims real persistence, payment, payroll, notification delivery, backend success, or production integration.

## 5. Backend Readiness Map

| Frontend action | Required backend API | Persistence required | Notification required | Current status |
| --- | --- | --- | --- | --- |
| Employer creates shift | Shift create endpoint | Shift, requirements, schedule, residence, department | Optional transactional email after publication | Missing backend |
| Employer publishes shift | Shift publication endpoint | Publication state and audit event | Worker discovery update, optional email/in-app | Missing backend |
| Worker discovers shifts | Shift search/list endpoint | Read from shift store | No | Fixture-backed |
| Worker views shift detail | Shift detail endpoint | Read from shift store | No | Fixture-backed |
| Worker applies | Application create endpoint | Application and audit event | Employer in-app/email optional | Missing backend |
| Employer reviews applicants | Application list/detail endpoint | Read application, worker-safe profile snapshot | No | Missing backend |
| Employer reviews AI suggestions | Recommendation read endpoint | Recommendation evidence and audit | No | Missing backend |
| Employer assigns worker | Assignment create endpoint | Assignment and audit event | Worker assignment offer notification | Missing backend |
| Worker responds to assignment | Assignment response endpoint | Worker response, assignment state, audit event | Employer response notification | Missing backend |
| Worker records attendance | Attendance event endpoint | Attendance evidence and audit event | Employer status update optional | Missing backend |
| Employer reviews timesheet | Timesheet review endpoint | Timesheet, correction, approval, audit event | Worker status update optional | Missing backend |
| Invoice generated | Invoice create/read endpoint | Invoice and line items | Employer invoice notification optional | Missing backend |
| Employer payment state changes | Employer payment endpoint | Payment state and audit event | Employer receipt/failure email optional | Missing backend |
| Worker payable state changes | Worker payable endpoint | Worker payable and audit event | Worker payable notification optional | Missing backend |
| Messages | Message thread endpoints | Threads, messages, moderation, audit | In-app/email optional | Missing backend |
| Support | Support case endpoints | Case, comments, state, audit | In-app/email optional | Missing backend |
| Reports updated | Report query endpoints | Read-only aggregation over source records | No | Fixture-backed |
| Admin supervises | Admin read/supervision endpoints | Cross-domain reads and audit | Optional | Fixture-backed |
| Notification delivery | Transactional notification endpoint | Notification event and delivery status | Yes | Missing backend |

No endpoints were implemented during this review. Endpoint names above describe required backend capabilities and must still go through backend design before implementation.

## 6. Known Integration Risks

- No approved database schema exists for the full operational workflow.
- No persistence layer connects employer, worker, admin, and API surfaces.
- No authentication/authorization enforcement is connected to operational routes.
- No assignment engine exists.
- No attendance evidence capture exists.
- No transactional notification delivery exists.
- No payment provider or payroll provider is selected.
- No production audit persistence exists.
- Existing frontend fixtures are useful for owner review but cannot prove production transaction integrity.
- Admin home has unrelated local modifications in `apps/admin/app/page.tsx`; this review did not modify it.

## 7. Required Owner Decisions

1. Approve backend schema planning for the 17 shared concepts.
2. Decide the first persistence milestone: organization/residence/department/shift or full staffing transaction.
3. Approve authentication and authorization scope before workflow APIs.
4. Decide notification provider strategy for transactional email/in-app.
5. Decide payment provider and payroll boundary before finance APIs.
6. Decide audit retention and access policy.
7. Confirm whether admin supervision remains read-only for the first backend milestone.

## 8. Recommended Backend Implementation Order

1. Authentication, organization membership, roles, and permissions.
2. EmployerOrganization, Residence, Department, and Role persistence.
3. Shift create/publish/discovery APIs.
4. Application APIs.
5. Recommendation read/evidence API, advisory only.
6. Assignment workflow APIs and worker response.
7. Attendance event APIs.
8. Timesheet review and correction APIs.
9. Invoice APIs.
10. EmployerPayment and WorkerPayable state APIs, after payment/payroll provider decisions.
11. Transactional notification delivery.
12. MessageThread and SupportCase APIs.
13. AuditEvent persistence and admin supervision views.
14. Reporting aggregation over source records.

## Final Verdict

READY FOR OWNER INTEGRATION REVIEW

