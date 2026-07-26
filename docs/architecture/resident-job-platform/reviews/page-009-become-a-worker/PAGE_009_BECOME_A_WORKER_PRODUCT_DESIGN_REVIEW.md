# Page 009 - Become A Worker Product Design Review

Status: Product Design Review complete, awaiting owner decision
Page: 009 - Become A Worker
Wireframe reviewed: `docs/architecture/resident-job-platform/wireframes/page-009-become-a-worker/PAGE_009_BECOME_A_WORKER_LOW_FIDELITY_WIREFRAME.md`
Architecture reference: `docs/architecture/resident-job-platform/pages/PAGE_009_BECOME_A_WORKER.md`
Architecture baseline: Resident Job Architecture Phase 1 v1.0
UX baseline: Resident Job UX Foundation
Implementation: Not authorized
Registration form: Not included
Document upload implementation: Not authorized
Authentication: Not authorized
Production data: Not used

## Executive Summary

Page 009 correctly presents Become A Worker as a public gateway into the worker journey, not as the
registration or verification system itself.

The wireframe explains why workers may join, who may apply by broad role category, how onboarding
works, what verification may involve, how availability and AI recommendations work, and what support
paths exist.

Recommended owner outcome:

```text
APPROVED WITH DOCUMENTED CONDITIONS
```

The wireframe is strong, but the worker trust section should be strengthened before approval so the
page better balances conversion with realistic expectation-setting.

## Business Value

Score: 9.2

Strengths:

- Clear worker gateway purpose.
- Strong call-to-action hierarchy.
- Worker Journey connects public interest to future Worker Portal steps.
- No employment, approval, or assignment guarantee is made.

Condition:

- Add a more explicit "Worker Trust And Safety" section explaining how Resident Job protects worker
  clarity before, during, and after shifts without promising work or legal outcomes.

## Worker Trust

Score: 8.8

Strengths:

- The page separates registration, verification, approval, and assignments.
- Support routes are visible.
- AI boundaries are explicit.
- Verification workflow is presented as a process, not a promise.

Condition:

- Strengthen worker trust signals around secure documents, verified employer context, clear shift
  details, attendance records, earnings visibility, support access, and respectful communication.

Do not add fake worker testimonials, unsupported statistics, or operational scale claims.

## Conversion

Score: 9.3

Passed.

The page gives three clear CTAs:

- Create Account.
- Learn More.
- View Opportunities.

The no-guarantee notice is visible but does not overwhelm the worker journey.

## Healthcare Professionalism

Score: 9.2

Passed.

The page uses healthcare and senior-living role categories without turning into a generic job board.

It remains careful around licensing and eligibility by avoiding regional rules or certification
promises.

## Accessibility

Score: 9.4

Passed.

The wireframe includes:

- Sequential headings.
- Mobile-first stacked layout.
- Large touch targets.
- Screen-reader-friendly Worker Journey order.
- Non-color-only status guidance.
- Simple language.

## AI Transparency

Score: 9.6

Passed.

The page clearly states AI may recommend shifts, detect conflicts, and suggest opportunities.

It also clearly states AI does not employ workers, guarantee assignments, discipline workers,
terminate workers, or make final operational decisions.

## Verification Clarity

Score: 9.2

Passed.

The page explains verification as a workflow involving possible identity, credential, licence,
certification, background-review, and document-expiry checks.

It avoids:

- Approval promises.
- Verification-provider claims.
- Universal background-check claims.
- Country-specific licensing claims.

## Expectation Management

Score: 9.1

Passed with condition.

Strengths:

- Registration does not guarantee assignments.
- Verification and approval are separate.
- AI recommendations are not guarantees.
- Payment Processing is placed at the end of the Worker Journey without promising timing or amount.

Condition:

- In the next controlled revision, make the "no guarantee" boundary visible in both the hero trust
  notice and the Worker Journey closeout so first-time visitors cannot miss it.

## International Readiness

Score: 9.5

Passed.

The page avoids:

- Employment law.
- Tax law.
- Licensing guarantees.
- Immigration advice.
- Regional salary claims.
- Country-specific healthcare compliance claims.

## Scorecard

| Category | Score |
| --- | ---: |
| Business Value | 9.2 |
| Worker Trust | 8.8 |
| Conversion | 9.3 |
| Healthcare Professionalism | 9.2 |
| Accessibility | 9.4 |
| AI Transparency | 9.6 |
| Verification Clarity | 9.2 |
| Expectation Management | 9.1 |
| International Readiness | 9.5 |
| Mobile Experience | 9.3 |
| Navigation | 9.2 |
| Financial Clarity | 9.1 |
| Risk Of Unsupported Claims | 9.5 |
| Overall Score | 9.2 |

## Quality Gate Result

Overall score is above the 9.0 threshold.

Do not approve automatically because the worker trust condition should be resolved before creating
an Approved Wireframe v1.0 record.

Quality gate result:

```text
APPROVED WITH DOCUMENTED CONDITIONS
```

## Required Controlled Revision 1

Scope must be limited to the following:

1. Add a compact "Worker Trust And Safety" section.
2. Strengthen trust signals without unsupported claims.
3. Reinforce that registration, verification, approval, and assignments are separate.
4. Preserve AI as recommendation support only.
5. Preserve country neutrality.

Allowed trust mechanisms:

- Secure document handling placeholder.
- Verified employer context.
- Clear shift details before acceptance.
- Attendance records.
- Earnings visibility without payment guarantees.
- Support access.
- Respectful communication.
- Privacy and Terms access.

Forbidden trust claims:

- Fake testimonials.
- Fake worker counts.
- Guaranteed shifts.
- Guaranteed approval.
- Guaranteed income.
- Unsupported certifications.
- Regional licensing claims.
- Immigration, tax, or legal advice.

## Consistency Audit

Architecture Freeze:

- Passed. No contradiction with Page 009 architecture.

UX Foundation:

- Passed. Mobile-first, accessibility, navigation, and AI boundaries are preserved.

Design System:

- Passed. Sections are card-compatible and can use the established public website hierarchy.

Financial UX Standard:

- Passed. Earnings are described as visibility, not a guaranteed payment amount or timing.

Content Governance:

- Passed. The page avoids unsupported claims and keeps future operational details configurable.

## Confirmation

- Architecture Freeze v1.0 unchanged.
- UX Foundation unchanged.
- Navigation unchanged.
- No previously approved wireframes were modified.
- No approval record was created.
- Page 010 remains blocked.
- No React work began.
- No frontend work began.
- No backend work began.
- No authentication work began.
- No database work began.
- No document upload implementation began.
- No deployment work began.
- No production data was used.

## Review Outcome

```text
APPROVED WITH DOCUMENTED CONDITIONS
OWNER REVIEW REQUIRED
```
