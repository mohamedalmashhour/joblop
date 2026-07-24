# Resident Job Platform Integration Report

## 1. Shared Domain Model

The shared domain layer now defines one canonical vocabulary for the operational platform:

- EmployerOrganization
- Residence
- Department
- Role
- Shift
- Application
- Recommendation
- Assignment
- AttendanceRecord
- Timesheet
- Invoice
- EmployerPayment
- WorkerPayable
- Notification
- MessageThread
- SupportCase
- AuditEvent

The model is implemented in `packages/shared/src/domain/platformIntegration.ts` and exported through `@rwos/shared`.

## 2. API Integration Status

No persistence APIs beyond the existing health endpoint are currently available. The platform integration map documents the intended action, current fixture source, target API, current limitation, and integration status for every end-to-end staffing action.

Current state:

- Shift creation: missing backend
- Worker discovery: fixture-backed
- Worker application: missing backend
- Employer applicant review: missing backend
- Assignment: missing backend
- Worker response: missing backend
- Attendance: missing backend
- Timesheet review: missing backend
- Invoice generation: missing backend
- Employer payment state: missing backend
- Worker payable state: missing backend
- Reports: fixture-backed
- Admin supervision: fixture-backed
- Notifications: missing backend

No endpoints were invented and no persistence was fabricated.

## 3. Employer - Worker Alignment

Employer and worker journeys now align to the same shared state model:

Shift
-> Application
-> Recommendation
-> Assignment
-> AttendanceRecord
-> Timesheet
-> Invoice
-> EmployerPayment
-> WorkerPayable

Important boundaries remain explicit:

- Published shift does not equal assigned worker.
- Worker application does not equal selection.
- AI recommendation does not equal assignment.
- Assignment created does not equal worker acceptance.
- Worker acceptance does not equal attendance.
- Attendance does not equal approved hours.
- Timesheet approval does not equal payroll or payment.
- Employer payment does not equal worker payable.

## 4. Admin Integration

Admin remains supervisory. The shared model identifies admin as the owner or participant for organization approval, roles, worker payable visibility, support cases, audit events, AI supervision, compliance summaries, finance summaries, and cross-domain oversight.

Admin does not duplicate employer operation or worker participation logic.

## 5. Notification Integration

Notifications are represented as informational records only:

Pending
-> Ready to Send
-> Sent / Failed / Suppressed / Archived

Notification failure does not change authoritative workflow state. No push, SMS, delivery provider, notification center backend, or orchestration engine was implemented.

## 6. Remaining Backend Work

Required backend work includes:

- Authentication and authorization integration
- Organization, residence, and department persistence
- Shift publication APIs
- Worker discovery APIs
- Application APIs
- Recommendation service boundary
- Assignment workflow APIs
- Attendance evidence APIs
- Timesheet review APIs
- Invoice APIs
- Employer payment state APIs
- Worker payable APIs
- Transactional notification delivery
- Message thread APIs
- Support case APIs
- Audit event persistence
- Reporting aggregation

## 7. Remaining Production Blockers

- No production database schema approved for these workflows
- No migrations approved
- No payment provider selected
- No notification provider selected
- No production credentials
- No security review for operational APIs
- No audit persistence
- No end-to-end backend transaction model
- No role/permission enforcement layer connected to these workflows

## 8. End-to-End Staffing Results

The end-to-end staffing scenario is represented and tested at the shared-domain layer:

Employer creates shift
-> Employer publishes shift
-> Worker discovers shift
-> Worker applies
-> Employer reviews
-> Employer assigns
-> Worker accepts
-> Attendance starts
-> Attendance closes
-> Timesheet approved
-> Invoice issued
-> Employer payment settles
-> Worker payable created
-> Reports updated

Result:

- State vocabulary is aligned.
- Workflow order is aligned.
- API integration gaps are documented.
- No backend persistence is claimed.
- No schema changes were made.

## 9. Readiness Verdict

PLATFORM READY FOR BACKEND INTEGRATION REVIEW

