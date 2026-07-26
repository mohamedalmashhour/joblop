# Page 005 - Contact

Status: Draft complete, awaiting approval
Section: Public Website
Users: Guest, Worker, Employer, Support
Implementation: Not authorized

## 1. Purpose

The Contact page exists to explain contact clearly to public visitors and move them to the correct worker or employer path.

This page must support Resident Job as an operational workforce platform, not a generic job board. It must preserve worker trust, client clarity, human approval, data honesty, and auditability.

## 2. Users

- Guest
- Worker
- Employer
- Support

Secondary stakeholders may include Support, Finance, Compliance, Administrator, or Super Administrator depending on the action and data sensitivity.

## 3. UI Layout

- Header or context bar with page identity and user role.
- Primary content area focused on the page's operating task.
- Status, eligibility, or approval panel when the page affects work, money, documents, or dispatch.
- Action area with clear primary and secondary actions.
- Evidence, history, or help section where users need context before acting.
- Footer or legal/support area where appropriate.

## 4. Components

- Public navigation
- Hero section
- CTA cards
- Explanation sections
- Footer
- Page header
- Primary content area
- Status or trust notice

## 5. Business Rules

- Public copy must not guarantee worker availability.
- No private worker, client, billing, payroll, or healthcare data may appear.
- AI suggestions are advisory and do not create binding operational, financial, compliance, or dispatch actions.
- Every action that affects workers, clients, money, compliance, scheduling, or external communication requires recorded human approval.
- Demo, estimated, pending, and live data must be visually labeled.

## 6. Data Model

- PublicPageContent
- PublicFAQ
- LeadCaptureDraft
- AuditEvent
- PermissionGrant
- NotificationPreference

## 7. APIs

- `GET /api/public/contact`
- `POST /api/leads`

API responses must enforce tenant/role boundaries and must not expose secrets, protected worker data, private client data, or financial data beyond the authenticated user's permission.

## 8. Permissions

- View: public
- Submit lead/contact: public with validation
- Modify content: Administrator
- Approve publication: Super Administrator

## 9. Validation

- Public claims are approved and truthful.
- Lead forms reject malformed contact data.
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

Boundary: AI cannot make staffing promises, confirm availability, quote binding prices, or collect sensitive data beyond approved forms.

AI outputs must be explainable, evidence-aware, and labeled as recommendations, not decisions.

## 11. Mobile Design

- Prioritize mission, role path, and CTA.
- Use stacked cards for categories and trust statements.
- Use short sections.
- Keep primary action visible.
- Use 44px minimum touch targets.
- Avoid dense tables.
- Show status labels clearly.

## 12. Desktop Design

- Present clear positioning and trust posture.
- Use category grid and workflow timeline.
- Use scan-friendly sections.
- Show filters and context side by side.
- Keep audit/approval status visible.
- Use restrained enterprise styling.

## 13. Future Expansion

- SEO pages by role group and region
- Approved testimonials
- Public trust center
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
