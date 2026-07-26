# Resident Job Financial UX Standard v1.0

Status: Active financial design governance standard
Architecture baseline: Resident Job Architecture Phase 1 v1.0
UX baseline: Resident Job UX Foundation
Implementation: Not authorized
Payment integration: Not authorized

## Purpose

This standard governs every Resident Job page that presents, estimates, authorizes, invoices,
calculates, disputes, or explains money.

It applies to current and future pages including Pricing, Employer Billing, Worker Earnings,
Payroll, Invoices, Payments, Refunds, Disputes, and Finance Dashboard.

## Principle 1 - Estimate Is Not Final Charge

Estimated cost and final charge must always be visually distinct.

Every estimate must be labeled:

```text
Estimate only
```

Final charges depend on verified work, approved time, approved adjustments, and applicable business
rules.

## Principle 2 - Authorization Is Not Payment

Payment authorization and payment capture must be visually and verbally separated.

Authorization means the payment method may be reserved or checked according to approved payment
rules. Authorization does not mean the final amount has been charged unless an approved business
rule explicitly says so.

## Principle 3 - Employer Billing Is Not Worker Compensation

Employer billing and worker compensation are separate workflows, ledgers, language systems, and
permission domains.

Do not imply that the worker receives the full employer charge.

Do not display commission percentages or internal pricing formulas unless formally approved.

## Principle 4 - AI Assists, Humans Decide

AI may organize estimate inputs, identify missing information, flag anomalies, explain line items,
and prepare review summaries.

AI must not quote binding prices, approve payment authorization, capture payments, decide final
invoice amounts, calculate worker pay by itself, decide disputes, decide refunds, decide
cancellation fees, or provide legal, tax, payroll, or accounting advice.

## Principle 5 - Transparent Line Items

Financial interfaces should avoid hidden or bundled charges where separation matters.

Line items should be clear when applicable:

- Base staffing charge.
- Urgency adjustment.
- Travel time.
- Mileage or transportation.
- Taxes where applicable.
- Approved adjustments.
- Cancellation or replacement handling where applicable.
- Final total.

## Principle 6 - Configurable Business Rules

Do not hardcode fees, rates, penalties, tax behavior, or payment timing in UX unless officially
approved in controlled business rules.

Public pages may show illustrative examples only when clearly labeled. Public pages must not
present unapproved values as active public tariffs.

## Principle 7 - Auditability

Users should understand how amounts are derived without exposing internal formulas or protected
commercial logic.

Financial pages should make the following reviewable:

- Which inputs produced an estimate.
- Which attendance events affected the invoice.
- Which adjustments were approved.
- Who approved a protected financial action where appropriate.
- Whether a dispute or exception is under human review.

## Principle 8 - Country Neutrality

Financial UX must avoid country-specific tax, payroll, employment, healthcare, accounting, or
background-check claims unless a localized policy has been approved.

Use wording such as:

- "Taxes where applicable."
- "Rules may vary by agreement or jurisdiction."
- "Where available and applicable."

## Principle 9 - No Misleading Financial Marketing

Do not use fake discounts, coupons, promotional pricing, fabricated savings claims, "lowest price"
claims, legal guarantees, tax guarantees, or accounting advice unless formally approved through
the correct governance path.

## Required Review Questions

Every financial page must answer:

- Is the estimate clearly different from the final invoice?
- Is authorization clearly different from payment capture?
- Is employer billing separated from worker compensation?
- Are line items visible enough to avoid hidden-fee appearance?
- Are cancellation, replacement, dispute, and adjustment concepts handled without hardcoded
  unapproved fees?
- Is AI advisory only?
- Are financial exceptions routed to human review?
- Is the page country-neutral?
- Are internal formulas and commission percentages protected?

## Implementation Boundary

This standard does not authorize implementation.

No React, frontend implementation, backend, database, payment integration, production data, live
integrations, or deployment work is authorized by this standard.
