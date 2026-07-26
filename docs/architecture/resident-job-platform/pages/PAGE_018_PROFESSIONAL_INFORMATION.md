# Page 018 - Professional Information

Status: Draft complete, awaiting approval
Section: Worker Portal
Users: Worker, Recruiter, Administrator
Implementation: Not authorized

## 1. Purpose

The Professional Information page exists to help workers manage their verified profile, groups, documents, preferences, and work readiness.

This page must support Resident Job as an operational workforce platform, not a generic job board. It must preserve worker trust, client clarity, human approval, data honesty, and auditability.

## 2. Users

- Worker
- Recruiter
- Administrator

Secondary stakeholders may include Support, Finance, Compliance, Administrator, or Super Administrator depending on the action and data sensitivity.

## 3. UI Layout

- Header or context bar with page identity and user role.
- Primary content area focused on the page's operating task.
- Status, eligibility, or approval panel when the page affects work, money, documents, or dispatch.
- Action area with clear primary and secondary actions.
- Evidence, history, or help section where users need context before acting.
- Footer or legal/support area where appropriate.

## 4. Components

- Worker summary
- Group status
- Readiness checklist
- Recent activity
- Next action card
- Page header
- Primary content area
- Status or trust notice

## 5. Business Rules

- Workers see worker pay and their own records only.
- Workers must not see client billing or platform margin.
- AI suggestions are advisory and do not create binding operational, financial, compliance, or dispatch actions.
- Every action that affects workers, clients, money, compliance, scheduling, or external communication requires recorded human approval.
- Demo, estimated, pending, and live data must be visually labeled.

## 6. Data Model

- WorkerProfile
- WorkerGroupMembership
- WorkerPreference
- WorkerDocument
- AuditEvent
- PermissionGrant
- NotificationPreference

## 7. APIs

- `GET /api/worker/18`
- `PATCH /api/worker/18`
- `GET /api/worker/audit-summary`

API responses must enforce tenant/role boundaries and must not expose secrets, protected worker data, private client data, or financial data beyond the authenticated user's permission.

## 8. Permissions

- View: Worker, Recruiter, Administrator
- Modify: role-specific and permission-gated
- Approve: authorized human actor only
- Audit: Administrator or Super Administrator

## 9. Validation

- Worker can only see own records.
- Document status labels are clear.
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

Boundary: AI cannot apply, accept, cancel, or modify worker records without the worker's explicit action.

AI outputs must be explainable, evidence-aware, and labeled as recommendations, not decisions.

## 11. Mobile Design

- Prioritize today's status, groups, offers, calendar, and earnings.
- Use bottom navigation.
- Use short sections.
- Keep primary action visible.
- Use 44px minimum touch targets.
- Avoid dense tables.
- Show status labels clearly.

## 12. Desktop Design

- Show profile readiness, calendar, and offers together where useful.
- Use scan-friendly sections.
- Show filters and context side by side.
- Keep audit/approval status visible.
- Use restrained enterprise styling.

## 13. Future Expansion

- Training
- Career progression
- Preferred-residence relationships
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
