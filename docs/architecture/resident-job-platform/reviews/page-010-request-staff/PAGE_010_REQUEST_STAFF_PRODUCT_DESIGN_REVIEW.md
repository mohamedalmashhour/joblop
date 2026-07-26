# Page 010 - Request Staff Product Design Review

Status: Product Design Review complete, awaiting owner decision
Page: 010 - Request Staff
Wireframe reviewed: `docs/architecture/resident-job-platform/wireframes/page-010-request-staff/PAGE_010_REQUEST_STAFF_LOW_FIDELITY_WIREFRAME.md`
Architecture reference: `docs/architecture/resident-job-platform/pages/PAGE_010_REQUEST_STAFF.md`
Architecture baseline: Resident Job Architecture Phase 1 v1.0
UX baseline: Resident Job UX Foundation
Financial UX reference: `docs/architecture/resident-job-platform/wireframes/FINANCIAL_UX_STANDARD_V1_0.md`
Implementation: Not authorized
Authenticated shift-creation workflow: Not included
Staffing request integration: Not authorized
Matching engine: Not authorized
Billing integration: Not authorized
Production data: Not used

## Executive Summary

Page 010 correctly mirrors Page 009 from the employer/residence side. It presents Request Staff as a
public intake and trust page, not as a confirmed assignment or full authenticated shift-creation
workflow.

Recommended owner outcome:

```text
APPROVED WITH DOCUMENTED CONDITIONS
```

The wireframe is strong, but the urgent-staffing and replacement sections should be tightened before
approval so employers cannot misread urgent routing as guaranteed coverage.

## Employer Trust

Score: 9.4

Passed.

The page includes:

- Employer account controls.
- Worker onboarding and document-review workflows.
- Role-based access.
- Secure communication.
- Attendance records.
- Support-case auditability.
- Dispute handling.
- Privacy-aware data sharing.
- Human review of consequential decisions.

It avoids unsupported certification, scale, quality, or replacement claims.

## Conversion Clarity

Score: 9.3

Passed.

The page offers clear public actions:

- Request Staff.
- Talk to Staffing Support.
- Learn How It Works.

The request-not-confirmation boundary is visible near the top.

## Staffing-Request Clarity

Score: 9.5

Passed.

The page clearly explains:

- Who can request staff.
- Roles Resident Job may support.
- Information needed.
- Staffing request journey.
- Request types.
- Confirmation state.

## Urgent-Request Clarity

Score: 8.9

Passed with condition.

Strengths:

- Urgent staffing is visually distinct.
- The page states availability is not guaranteed.
- The page states urgent request submission does not confirm coverage.
- Emergency medical/public-safety situations are routed to local emergency services.

Condition:

- In a controlled Revision 1, strengthen the urgent path by showing that urgent requests enter
  prioritized operational review, not automatic dispatch, and that same-day language must remain
  configurable.

## Worker-Availability Expectation Management

Score: 9.2

Passed.

The page states:

- Request submitted is not worker confirmed.
- Worker suggested is not worker available.
- Replacement availability is not guaranteed.
- The original issue remains unresolved until confirmed.

## AI Transparency

Score: 9.6

Passed.

The page clearly states AI may rank possible matches, flag conflicts, identify missing requirements,
and support replacement search.

It also states AI must not make final hiring decisions, assign workers without authorization,
override eligibility controls, expose private worker information, discipline workers, or guarantee
coverage.

## Financial Transparency

Score: 9.5

Passed.

The page follows the Financial UX Standard:

- Estimate.
- Authorization where applicable.
- Verified attendance.
- Approved timesheet.
- Approved adjustments.
- Final invoice.

It clearly states:

- Authorization is not final charge.
- Estimates are not guarantees.
- Employer billing and worker compensation are separate processes.
- No universal rates, fees, taxes, commissions, or cancellation charges are hardcoded.

## Privacy

Score: 9.4

Passed.

The public intake form avoids unnecessary health information, card credentials, passwords, banking
details, and worker-sensitive data.

It separates signed-out and signed-in boundaries and does not expose account details publicly.

## Security

Score: 9.3

Passed.

The wireframe includes:

- Data minimization.
- Role-based access.
- Safe worker-data visibility.
- Spam/abuse controls.
- Rate limiting as future API requirement.
- Secure references.
- Audit logging.
- Attachment safety if future attachments are proposed.

## Accessibility

Score: 9.4

Passed.

The page includes semantic form structure, accessible labels, keyboard navigation, error
association, focus management, status announcements, no color-only urgency, readable timelines,
accessible date/time inputs, plain language, sufficient contrast, and large touch targets.

## Mobile Usability

Score: 9.3

Passed.

The mobile layout prioritizes:

- Request type first.
- Role/date/time essentials.
- Short progressive form.
- Large touch targets.
- Urgent-staffing path near the top.
- Visible estimate disclaimer.
- Clear next-step status.

## International Readiness

Score: 9.5

Passed.

The page avoids country-specific employment law, healthcare regulation, tax advice, universal role
availability, universal service levels, regional pricing, and hardcoded emergency numbers.

## Consistency With Page 009

Score: 9.5

Passed.

Page 009 builds worker trust. Page 010 builds employer trust.

Both pages:

- Use public gateway framing.
- Avoid guarantees.
- Keep AI advisory.
- Separate public intake from authenticated workflows.
- Preserve privacy and support routing.

## Risk Of Unsupported Promises

Score: 9.2

Passed with condition.

The page avoids fabricated response times, prices, statistics, customers, service areas, guaranteed
availability, and guaranteed replacement.

Condition:

- Tighten wording around urgent or same-day shifts so it cannot be interpreted as a service-level
  promise.

## Scorecard

| Category | Score |
| --- | ---: |
| Employer Trust | 9.4 |
| Conversion Clarity | 9.3 |
| Staffing-Request Clarity | 9.5 |
| Urgent-Request Clarity | 8.9 |
| Worker-Availability Expectation Management | 9.2 |
| AI Transparency | 9.6 |
| Financial Transparency | 9.5 |
| Privacy | 9.4 |
| Security | 9.3 |
| Accessibility | 9.4 |
| Mobile Usability | 9.3 |
| International Readiness | 9.5 |
| Consistency With Page 009 | 9.5 |
| Risk Of Unsupported Promises | 9.2 |
| Overall Score | 9.3 |

## Quality Gate Result

Overall score is above the 9.0 threshold.

Do not approve automatically because Page 010 is the final public website page before Epic 1 Review,
and the urgent-staffing wording should be tightened before creating an Approved Wireframe v1.0
record.

Quality gate result:

```text
APPROVED WITH DOCUMENTED CONDITIONS
```

## Required Controlled Revision 1

Scope must be limited to:

1. Strengthen urgent-staffing expectation management.
2. Clarify that urgent and same-day requests enter prioritized operational review, not automatic
   dispatch.
3. Clarify that same-day, replacement, and response timing are configurable operational outcomes,
   not public promises.
4. Preserve all existing AI, financial, privacy, and security boundaries.

Do not redesign the page.

## Confirmation

- Architecture Freeze v1.0 unchanged.
- UX Foundation unchanged.
- Design System unchanged.
- Navigation unchanged.
- No previously approved pages were modified.
- No approval record was created.
- Page 011 was not created.
- No React work began.
- No frontend implementation began.
- No backend work began.
- No authentication work began.
- No database work began.
- No staffing request integration began.
- No matching engine work began.
- No billing integration began.
- No deployment work began.
- No production data was used.

## Review Outcome

```text
APPROVED WITH DOCUMENTED CONDITIONS
OWNER REVIEW REQUIRED
```
