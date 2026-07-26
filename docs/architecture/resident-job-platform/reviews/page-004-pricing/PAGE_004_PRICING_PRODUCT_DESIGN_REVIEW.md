# Page 004 - Pricing Product Design Review

Status: Product Design Review complete, awaiting owner decision
Page: 004 - Pricing
Wireframe reviewed: `docs/architecture/resident-job-platform/wireframes/page-004-pricing/PAGE_004_PRICING_LOW_FIDELITY_WIREFRAME.md`
Architecture reference: `docs/architecture/resident-job-platform/pages/PAGE_004_PRICING.md`
Architecture baseline: Resident Job Architecture Phase 1 v1.0
UX baseline: Resident Job UX Foundation
Implementation: Not authorized
Payment integration: Not authorized

## Executive Summary

The Page 004 Pricing wireframe correctly avoids a generic subscription-pricing pattern and instead
frames pricing as a staffing-service estimate and invoicing lifecycle.

The page separates estimate from final invoice, employer billing from worker compensation, and AI
estimate support from human-reviewed financial decisions. It also avoids fixed production prices,
fake discounts, savings claims, country-specific taxes, and unsupported legal or accounting
promises.

Recommended outcome:

```text
APPROVED WITH DOCUMENTED CONDITIONS
```

The page is strong, but due to financial-risk sensitivity, one controlled revision should make the
payment authorization and final charge distinction even more prominent before approval.

## Financial Clarity Review

Strengths:

- Pricing variables are explained clearly: role, urgency, duration, location, travel, and approved
  requirements.
- Transparent breakdown separates base staffing charge, urgency adjustment, travel time,
  transportation/mileage, taxes where applicable, approved adjustments, and estimated total.
- Final amount is tied to verified time and approved adjustments.

Condition:

- Add a stronger first-screen warning that an estimate is not the final invoice and that payment
  authorization is not the same as final charge capture.

## Trust Review

Strengths:

- No hidden-fee appearance.
- No fake discounts.
- No invented savings claims.
- No production tariff is hardcoded.
- Human review is preserved for disputes and exceptional cases.

Condition:

- Add a short "Pricing transparency principles" block that lists estimate labeling, separate
  ledgers, human review for disputes, and approved-rule calculation.

## Conversion Review

Strengths:

- Request Staff, Get an Estimate, and Contact Sales CTAs are clear.
- Recurring and enterprise staffing are separated from regular and urgent shifts.

Risk:

- Too many disclaimers could reduce conversion if visual hierarchy is poor later.

Mitigation:

- Keep disclaimers close to financial outputs and CTAs, not scattered throughout the page.

## Risk Of Misleading Pricing

Passed with condition.

The page avoids:

- Fixed public tariff claims.
- "Lowest price" claims.
- Discounts or fabricated savings.
- Country-specific tax promises.
- Legal or accounting guarantees.
- Claims that all verification or payment methods work in every jurisdiction.

Condition:

- Clarify authorization versus final charge in the lifecycle and calculator output.

## Estimate Versus Final Invoice

Passed with condition.

The distinction appears repeatedly, but it should be more prominent in the first viewport.

## Employer Billing Versus Worker Pay

Passed.

The page clearly states that employer billing and worker compensation are separate ledgers and
processes. It does not imply the worker receives the full employer charge and does not disclose a
commission percentage.

## Cancellation Clarity

Passed.

The page says charges may depend on timing, assignment status, actual work performed, approved
rules, and human review. Exact fees remain configurable and jurisdiction-neutral.

## Urgent-Shift Clarity

Passed.

Urgent or same-day staffing is presented as a pricing model that may use an urgency adjustment, not
as a hardcoded universal rate.

## Mobile Comprehension

Passed with condition.

The mobile flow is understandable, but first-screen financial disclaimers should be short and
visually close to the Get an Estimate action.

## International Readiness

Passed.

The page is country-neutral and avoids tax, payroll, employment, healthcare, or background-check
claims tied to a specific jurisdiction.

## AI Transparency

Passed.

AI is advisory and may help organize inputs or flag anomalies. It does not create binding prices,
approve payment authorization, decide final invoices, calculate worker pay, or decide disputes.

## Scorecard

| Category | Score |
| --- | ---: |
| Business Value | 9.4 |
| UX | 9.0 |
| Accessibility | 9.1 |
| Healthcare Trust | 9.2 |
| Conversion | 8.9 |
| Mobile Experience | 8.9 |
| Navigation | 9.2 |
| Scalability | 9.2 |
| AI Transparency | 9.4 |
| International Readiness | 9.3 |
| Financial Clarity | 8.8 |
| Pricing Risk Control | 8.9 |
| Overall Score | 9.0 |

## Quality Gate Result

Overall score is at the 9.0 threshold, but material financial ambiguity remains around the
prominence of authorization versus final charge.

Do not approve automatically.

## Consistency Audit

Architecture Freeze:

- Passed. No contradiction with frozen Page 004 architecture.

UX Foundation:

- Passed. Mobile-first, accessibility, AI advisory, and public-page security posture are preserved.

Global Design System:

- Passed at wireframe level.

Navigation Architecture:

- Passed. Public links and CTA behavior remain consistent with Pages 001-003.

Permission Matrix:

- Passed. Public page exposes public pricing model information only.

Design Review Checklist:

- Passed with documented financial-clarity condition.

Trust claims and trust mechanisms:

- Passed. No unsupported pricing trust claims were introduced.

Design Status Matrix:

- Page 004 should remain in review state until the owner decision is recorded.

## Recommended Improvements

Priority: Critical

- In Revision 1, make the authorization-versus-final-charge distinction impossible to miss:
  - Estimate only.
  - Payment method authorization may occur before a shift.
  - Final charge depends on worker checkout, verified time, timesheet review, approved adjustments,
    and applicable rules.

Priority: High

- Add a "Pricing transparency principles" block.

Priority: Medium

- Keep the pricing calculator output visibly labeled "Estimate only" on desktop and mobile.

Priority: Low

- Record future enhancements such as interactive pricing calculator, contract-specific pricing,
  and region-specific tax display in the Design Debt Register.

## Review Outcome

```text
APPROVED WITH DOCUMENTED CONDITIONS
```

Required condition before approval record:

- Create a controlled Revision 1 that strengthens authorization-versus-final-charge clarity and
  adds a concise pricing transparency principles block.

## Implementation Boundary

No production implementation has begun.

No React, frontend implementation, backend, database, payment integration, production data, live
integrations, or deployment work is authorized.

Page 005 remains blocked.
