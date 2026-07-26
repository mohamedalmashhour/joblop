# Page 027 - GPS Check-In

Status: Draft complete, awaiting approval
Section: Worker Portal
Users: Worker, Scheduler, Employer
Implementation: Not authorized

## 1. Purpose

The GPS Check-In page exists to record attendance evidence for worker pay and client billing review.

This page must support Resident Job as an operational workforce platform, not a generic job board. It must preserve worker trust, client clarity, human approval, data honesty, and auditability.

## 2. Users

- Worker
- Scheduler
- Employer

Secondary stakeholders may include Support, Finance, Compliance, Administrator, or Super Administrator depending on the action and data sensitivity.

## 3. UI Layout

- Header or context bar with page identity and user role.
- Primary content area focused on the page's operating task.
- Status, eligibility, or approval panel when the page affects work, money, documents, or dispatch.
- Action area with clear primary and secondary actions.
- Evidence, history, or help section where users need context before acting.
- Footer or legal/support area where appropriate.

## 4. Components

- Shift status card
- Location evidence notice
- Check-in/out button
- Notes field
- Exception warning
- Page header
- Primary content area
- Status or trust notice

## 5. Business Rules

- Closed attendance records cannot be silently edited.
- Corrections require an exception record.
- AI suggestions are advisory and do not create binding operational, financial, compliance, or dispatch actions.
- Every action that affects workers, clients, money, compliance, scheduling, or external communication requires recorded human approval.
- Demo, estimated, pending, and live data must be visually labeled.

## 6. Data Model

- ShiftAssignment
- CheckInEvent
- CheckOutEvent
- Timesheet
- AuditEvent
- PermissionGrant
- NotificationPreference

## 7. APIs

- `POST /api/time-clock/check-in`
- `POST /api/time-clock/check-out`
- `POST /api/timesheets/exceptions`

API responses must enforce tenant/role boundaries and must not expose secrets, protected worker data, private client data, or financial data beyond the authenticated user's permission.

## 8. Permissions

- View: Worker, Scheduler, Employer
- Modify: role-specific and permission-gated
- Approve: authorized human actor only
- Audit: Administrator or Super Administrator

## 9. Validation

- Location/time evidence is labeled.
- Offline or exception states are visible.
- Required fields are enforced.
- User-facing errors are clear.
- No protected data leaks in UI, logs, analytics, or API responses.
- Audit events are emitted for protected actions.

## 10. AI Features

Allowed AI support:

- Suggested actions
- Risk detection
- Missing information detection
- Recommendations with evidence
- Compliance checks where evidence exists
- Automation opportunities requiring approval

Boundary: AI cannot complete protected actions without recorded human approval.

AI outputs must be explainable, evidence-aware, and labeled as recommendations, not decisions.

## 11. Mobile Design

- Use short sections.
- Keep primary action visible.
- Use 44px minimum touch targets.
- Avoid dense tables.
- Show status labels clearly.

## 12. Desktop Design

- Use scan-friendly sections.
- Show filters and context side by side.
- Keep audit/approval status visible.
- Use restrained enterprise styling.

## 13. Future Expansion

- Localization
- Advanced search
- Saved views
- Export and reporting
- Deeper AI assistance after governance approval

## Page Gate

Review outcomes:

- Approved
- Approved with conditions
- Remediation required
