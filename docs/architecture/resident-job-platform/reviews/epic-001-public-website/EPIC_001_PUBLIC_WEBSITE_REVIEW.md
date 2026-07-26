# Epic 1 - Public Website Review

Status: Epic Review complete, awaiting owner decision
Epic: EPIC 1 - Public Website
Pages reviewed: 001-010
Architecture baseline: Resident Job Architecture Phase 1 v1.0
UX baseline: Resident Job UX Foundation
Implementation: Not authorized
Next epic: Authentication, blocked pending owner approval

## Executive Summary

Epic 1 is now complete at the low-fidelity wireframe level.

Pages 001-010 work together as a coherent public website for Resident Job:

- Page 001 - Landing Page.
- Page 002 - About.
- Page 003 - How It Works.
- Page 004 - Pricing.
- Page 005 - Contact.
- Page 006 - FAQ.
- Page 007 - Privacy.
- Page 008 - Terms.
- Page 009 - Become A Worker.
- Page 010 - Request Staff.

Recommended owner outcome:

```text
EPIC APPROVED WITH DOCUMENTED CONDITIONS
```

The public website is strong enough to move toward the Authentication epic after owner review, but
legal-facing pages still require legal review before publication and operational configuration
before launch.

## Navigation Consistency

Result: Pass

The public navigation remains consistent across Pages 001-010:

- About.
- How It Works.
- Pricing.
- Contact.
- FAQ.
- Sign In.
- Request Staff.
- Become A Worker.

Page 009 and Page 010 are balanced as worker and employer entry points.

## Messaging Consistency

Result: Pass

The messaging consistently presents Resident Job as a healthcare and senior-living workforce
platform, not a generic job board.

Common messages:

- Human review remains authoritative.
- AI assists but does not decide.
- Registration, request submission, verification, approval, and assignment are separate states.
- Estimates are not final charges.
- Public pages do not guarantee outcomes.

## Trust Mechanisms

Result: Pass

Trust is expressed through mechanisms, not unsupported claims:

- Verified onboarding workflows.
- Credential/document review workflows.
- Role-based access.
- Secure communication.
- Attendance records.
- Auditability.
- Support routing.
- Privacy-aware data handling.
- Human review of consequential decisions.

The website avoids fake testimonials, fake metrics, fake customer names, and unsupported scale
claims.

## AI Transparency

Result: Pass

AI is consistently described as advisory:

- AI may recommend opportunities.
- AI may suggest candidates.
- AI may flag conflicts.
- AI may identify missing information.
- AI may support replacement search.

AI does not:

- hire.
- assign without authorization.
- approve credentials.
- discipline.
- terminate accounts.
- guarantee work.
- guarantee coverage.
- make financial or legal decisions.

## Privacy And Terms Alignment

Result: Pass with publication condition

Privacy and Terms pages both:

- include governance metadata.
- separate product design from legal content.
- require legal review before publication.
- avoid jurisdiction-specific legal claims.
- preserve source-of-truth and escalation placeholders.

Condition:

- Legal review remains required before publication.
- Operational configuration remains pending for policy, acknowledgement, jurisdiction, and workflow
  behavior.

## Accessibility

Result: Pass

Epic 1 consistently uses:

- semantic page sections.
- mobile-first structure.
- plain language.
- clear CTAs.
- non-color-only status concepts.
- large touch-target guidance.
- readable timelines.
- accessible form expectations.

Future visual design must preserve these accessibility requirements.

## Mobile-First Experience

Result: Pass

The public website has a mobile-first flow:

- short sections.
- stacked cards.
- clear CTAs.
- compact status notices.
- progressive forms where needed.
- visible trust and expectation boundaries near the top of worker/employer pages.

## Public User Journeys

Result: Pass

Worker path:

```text
Landing / Become A Worker
↓
Worker value and trust
↓
Worker journey explanation
↓
Create Account / View Opportunities
↓
Authentication epic later
```

Employer path:

```text
Landing / Request Staff
↓
Employer value and trust
↓
Public intake
↓
Request received, not confirmed
↓
Sign In / Create Account later
```

Policy/support path:

```text
FAQ / Contact / Privacy / Terms
↓
Governance metadata
↓
Escalation path
```

## International Readiness

Result: Pass

Epic 1 avoids:

- hardcoded country-specific laws.
- hardcoded emergency numbers.
- regional wage claims.
- tax advice.
- immigration advice.
- licensing guarantees.
- universal service levels.
- universal role availability.

Jurisdiction-specific behavior remains a future operational/legal configuration.

## Governance Consistency

Result: Pass

All pages 001-010 have:

- Architecture reference.
- Low-fidelity wireframe.
- Product Design Review.
- Revision where required.
- Approval record.
- Design Status Matrix updates.

Policy-facing and legal-facing pages preserve the required review boundaries.

## Epic Scorecard

| Category | Score |
| --- | ---: |
| Navigation Consistency | 9.5 |
| Messaging Consistency | 9.6 |
| Trust Mechanisms | 9.6 |
| AI Transparency | 9.8 |
| Privacy / Terms Alignment | 9.3 |
| Accessibility | 9.4 |
| Mobile-First Experience | 9.5 |
| Public User Journeys | 9.6 |
| International Readiness | 9.7 |
| Governance Consistency | 9.7 |
| Overall Score | 9.6 |

## Conditions Before Publication

These are not blockers to closing Epic 1 wireframe review, but they are publication/launch gates:

- Legal review required for Privacy and Terms.
- Operational configuration required for Terms acknowledgement and policy applicability.
- Final content review required before public publication.
- No production implementation authorized from this review.
- No high-fidelity UI authorized until owner approves the relevant next phase.

## Epic Review Outcome

```text
EPIC APPROVED WITH DOCUMENTED CONDITIONS
OWNER APPROVAL REQUIRED BEFORE PAGE 011
```

## Next Gate

Page 011 - Sign In remains blocked.

Authentication epic may begin only after owner approval of this Epic 1 Public Website Review.

## Implementation Boundary

No React, frontend, backend, database, authentication, deployment, or production data work is
authorized by this Epic Review.
