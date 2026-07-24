# RJDS Dashboard and Page Templates v1.0

Status: Approved baseline

## 1. Template Rule

Templates define structure, not page ownership. The approved page wireframe remains authoritative for page responsibility.

## 2. Public Website Template

Use for public marketing, information, and policy pages.

Required sequence:

1. Clear page title and purpose.
2. Primary audience signal.
3. Main value or explanation.
4. Trust mechanism or governance cue.
5. Primary call to action.
6. Secondary pathway.
7. FAQ, policy, or support handoff where relevant.

Rules:

- Public pages should be factual and country-neutral.
- Legal and policy pages must state legal review boundaries.
- Testimonials and metrics must remain placeholders unless substantiated.

## 3. Worker Dashboard Template

Use for authenticated worker home and urgent worker surfaces.

Priority order:

1. Current shift or today's work.
2. Critical alerts.
3. Required action.
4. Next scheduled shift.
5. Availability and calendar.
6. Recommendations.
7. Timesheet, earnings, messages, notifications, documents.

Rules:

- Mobile first screen must answer "What do I need to do now?"
- Recommendations must not look assigned.
- Earnings summaries must not look like payroll settlement.

## 4. Worker Profile and Compliance Template

Use for profile, professional information, licenses, certifications, background check, and documents.

Required separation:

1. Worker-owned information.
2. Self-reported professional details.
3. Review or verification status.
4. Employer-visible operational summary.
5. Platform-only governance details.
6. Support or correction path.

Rules:

- Profile complete does not equal approved worker.
- Credential reviewed does not equal shift eligibility.
- Sensitive documents belong in governed document workflows.

## 5. Worker Shift Lifecycle Template

Use for search, shift details, apply, accepted shift, check-in, check-out, timesheet, earnings, and payments.

Required lifecycle clarity:

Search -> Details -> Apply -> Employer review -> Selected -> Assignment offer -> Worker acceptance -> Attendance -> Timesheet -> Earnings -> Payment status

Rules:

- Viewing does not equal applying.
- Applying does not equal selected.
- Assigned does not equal accepted.
- Worked does not equal paid.

## 6. Employer Dashboard Template

Use for employer operational home.

Priority order:

1. Needs staffing now.
2. At-risk shifts.
3. Pending approvals.
4. Active shifts and attendance.
5. Applicants and assignments.
6. Messages and support.
7. Billing summary.
8. Compliance reminders.

Rules:

- Dashboard is a control surface, not source of truth.
- Billing summary must remain high-level unless the page owns finance.
- Worker personal information must be minimum necessary.

## 7. Employer Staffing Workflow Template

Use for create shift, recurring shift, urgent shift, AI worker suggestions, applicants, assigned worker, live tracking, attendance, and approve timesheet.

Required decision chain:

Request -> Review -> Recommendation -> Human selection -> Worker response -> Assignment -> Attendance -> Timesheet review

Rules:

- AI suggestion does not equal assignment.
- Human selection does not equal worker acceptance.
- Attendance evidence does not equal approved hours.
- Timesheet approval does not equal payroll.

## 8. Admin Operations Template

Use for operations dashboard, users, workers, employers, residences, shifts, finance, payroll, compliance, reports, settings, audit log, AI control center, notification center, and analytics.

Required layout:

1. Page title and scope boundary.
2. Current filters and workspace scope.
3. Status summary.
4. Primary table or list.
5. Detail or governance side panel.
6. Governed handoff actions.
7. Audit or freshness metadata.

Rules:

- Admin visibility does not imply authority to modify every record.
- High-impact actions require review, reason, and audit trail.
- Restricted fields must be masked.

## 9. Financial Workflow Template

Use for pricing, invoices, payments, finance, payroll, earnings, and worker payables.

Required separation:

Estimate -> Authorized or scheduled -> Reviewed -> Finalized -> Sent -> Settled or failed

Rules:

- Do not expose internal formulas unless approved.
- Do not expose banking, tax, or payroll secrets.
- Use neutral exception language.
- AI may explain states but must not calculate, approve, or execute.

## 10. AI Governance Template

Use for AI dispatch, AI worker suggestions, AI control center, and AI-assisted panels.

Required structure:

1. AI role label.
2. Recommendation or summary.
3. Evidence.
4. Missing information.
5. Confidence guidance.
6. Human review controls.
7. Audit reference.
8. Prohibited action boundary.

Rules:

- AI recommendation must be visibly separate from human decision.
- AI must never hide uncertainty.
- AI must never create secret rankings.

## 11. Messaging and Support Template

Use for messages, support, contact, and active-shift help.

Required structure:

1. Conversation or case context.
2. Authorized participants.
3. Status.
4. History.
5. Next allowed action.
6. Escalation path.
7. Privacy and retention note where relevant.

Rules:

- Messages are communication only.
- Support case does not become disciplinary, legal, payroll, or payment authority.

## 12. Mobile Rules

- Put the primary task first.
- Collapse secondary widgets.
- Keep filters and capsules reachable.
- Keep critical actions inside comfortable touch targets.
- Avoid dense tables; use cards or grouped rows.
- Preserve visible status labels.

## 13. Desktop Rules

- Use more horizontal space for comparisons, filters, tables, and side panels.
- Preserve the same state language as mobile.
- Do not add desktop-only authority or hidden workflow actions.
- Keyboard navigation must cover all controls.
