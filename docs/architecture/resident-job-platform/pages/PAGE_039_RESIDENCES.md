# Page 039 - Residences

Status: Draft complete, awaiting approval
Section: Employer Portal
Users: Employer, Residence Manager, Scheduler
Implementation: Not authorized

## 1. Purpose

The Residences page exists to help employers manage organization, residences, departments, and active staffing operations.

This page must support Resident Job as an operational workforce platform, not a generic job board. It must preserve worker trust, client clarity, human approval, data honesty, and auditability.

## 2. Users

- Employer
- Residence Manager
- Scheduler

Secondary stakeholders may include Support, Finance, Compliance, Administrator, or Super Administrator depending on the action and data sensitivity.

## 3. UI Layout

- Header or context bar with page identity and user role.
- Primary content area focused on the page's operating task.
- Status, eligibility, or approval panel when the page affects work, money, documents, or dispatch.
- Action area with clear primary and secondary actions.
- Evidence, history, or help section where users need context before acting.
- Footer or legal/support area where appropriate.

## 4. Components

- Organization summary
- Residence list
- Department cards
- Open needs
- Approval queue
- Page header
- Primary content area
- Status or trust notice

## 5. Business Rules

- Employers see client billing and staffing status, not private worker compensation.
- A staffing request is not a dispatch confirmation.
- AI suggestions are advisory and do not create binding operational, financial, compliance, or dispatch actions.
- Every action that affects workers, clients, money, compliance, scheduling, or external communication requires recorded human approval.
- Demo, estimated, pending, and live data must be visually labeled.

## 6. Data Model

- EmployerAccount
- Residence
- Department
- ClientContact
- AuditEvent
- PermissionGrant
- NotificationPreference

## 7. APIs

- `GET /api/employer/dashboard`
- `GET /api/employer/residences`
- `POST /api/employer/events`

API responses must enforce tenant/role boundaries and must not expose secrets, protected worker data, private client data, or financial data beyond the authenticated user's permission.

## 8. Permissions

- View: Employer, Residence Manager, Scheduler
- Modify: role-specific and permission-gated
- Approve: authorized human actor only
- Audit: Administrator or Super Administrator

## 9. Validation

- Client sees request and billing data only for their organization.
- Worker private pay data is hidden.
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

Boundary: AI cannot create binding staffing, payment, or dispatch commitments without approval.

AI outputs must be explainable, evidence-aware, and labeled as recommendations, not decisions.

## 11. Mobile Design

- Prioritize urgent requests, approvals, and active shifts.
- Use step-by-step forms.
- Use short sections.
- Keep primary action visible.
- Use 44px minimum touch targets.
- Avoid dense tables.
- Show status labels clearly.

## 12. Desktop Design

- Show requests, calendars, approvals, and billing status in one operational view.
- Use scan-friendly sections.
- Show filters and context side by side.
- Keep audit/approval status visible.
- Use restrained enterprise styling.

## 13. Future Expansion

- Multi-residence portfolios
- Contract pricing
- Budget controls
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
