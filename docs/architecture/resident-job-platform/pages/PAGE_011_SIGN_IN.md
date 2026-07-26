# Page 011 - Sign In

Status: Draft complete, awaiting approval
Section: Authentication
Users: Worker, Employer, Scheduler, Administrator
Implementation: Not authorized

## 1. Purpose

The Sign In page exists to protect access and route each user to the correct portal after identity verification.

This page must support Resident Job as an operational workforce platform, not a generic job board. It must preserve worker trust, client clarity, human approval, data honesty, and auditability.

## 2. Users

- Worker
- Employer
- Scheduler
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

- Credential form
- Identity prompt
- Security notice
- Recovery link
- Submit action
- Page header
- Primary content area
- Status or trust notice

## 5. Business Rules

- Authentication errors must not reveal whether an account exists.
- Security events must be logged without exposing secrets.
- AI suggestions are advisory and do not create binding operational, financial, compliance, or dispatch actions.
- Every action that affects workers, clients, money, compliance, scheduling, or external communication requires recorded human approval.
- Demo, estimated, pending, and live data must be visually labeled.

## 6. Data Model

- User
- IdentityCredential
- Session
- MfaChallenge
- AuditEvent
- PermissionGrant
- NotificationPreference

## 7. APIs

- `POST /api/sign-in/start`
- `POST /api/sign-in/verify`
- `POST /api/sign-in/complete`

API responses must enforce tenant/role boundaries and must not expose secrets, protected worker data, private client data, or financial data beyond the authenticated user's permission.

## 8. Permissions

- View: unauthenticated user
- Submit credentials: account owner
- Manage security policy: Super Administrator
- Audit security events: Administrator

## 9. Validation

- Rate limiting is active.
- Invalid attempts are logged safely.
- Secrets are never displayed.
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

Boundary: AI cannot bypass authentication, MFA, password reset, lockout, or account recovery controls.

AI outputs must be explainable, evidence-aware, and labeled as recommendations, not decisions.

## 11. Mobile Design

- Keep forms short and keyboard-friendly.
- Expose recovery and help paths.
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

- Passkeys
- Enterprise SSO
- Device management
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
