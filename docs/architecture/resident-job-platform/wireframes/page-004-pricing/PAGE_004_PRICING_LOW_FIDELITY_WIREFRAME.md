# Page 004 - Pricing Low-Fidelity Wireframe

Status: Initial low-fidelity wireframe created
Page: 004 - Pricing
Architecture reference: `docs/architecture/resident-job-platform/pages/PAGE_004_PRICING.md`
Architecture baseline: Resident Job Architecture Phase 1 v1.0
UX baseline: Resident Job UX Foundation
Implementation: Not authorized
Payment integration: Not authorized

## A. Purpose

The Pricing page explains how employers may be charged for staffing services while avoiding
premature or unsupported financial promises.

This is not a generic subscription-pricing page. It must explain that pricing depends on role,
urgency, duration, location, travel, applicable requirements, verified attendance, approved time,
and approved adjustments.

The page must clearly separate:

- Estimate versus final invoice.
- Employer billing versus worker compensation.
- Platform pricing rules versus human review.
- Payment authorization versus final charge.

## B. Primary User

Primary users:

- Employer.
- Residence Manager.
- Finance stakeholder.
- Guest comparing service model.

Secondary users:

- Scheduler.
- Operations stakeholder.
- Worker seeking clarity that employer billing is separate from worker pay.
- Investor or partner evaluating commercial discipline.

## C. User Goals

Visitors should understand:

- Pricing is variable and rule-driven, not one-size-fits-all.
- Urgent, same-day, distant, recurring, or enterprise staffing may be priced differently.
- Payment authorization may happen before a shift, while final invoicing may happen after verified
  attendance and timesheet approval.
- Worker compensation is separate from the employer's total charge.
- Taxes, travel, adjustments, cancellation handling, and disputes may be separated when applicable.
- AI may help estimate or flag anomalies, but humans and approved rules determine final charges.

## D. Information Hierarchy

1. Pricing introduction.
2. Employer pricing model.
3. Transparent charge breakdown.
4. Attendance-to-invoice lifecycle.
5. Worker-pay separation.
6. Cancellation and replacement principles.
7. Pricing calculator placeholder.
8. Employer calls to action.
9. FAQ preview.
10. Footer.

## E. Desktop Wireframe

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ HEADER                                                                       │
│ Resident Job       About   How It Works   Pricing   Contact   Sign In        │
│                                      [Request Staff] [Get an Estimate]       │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ PRICING INTRODUCTION                                                         │
│                                                                              │
│ Staffing prices depend on role, urgency, duration, location, travel, and      │
│ approved requirements.                                                       │
│                                                                              │
│ This page explains the pricing structure. It does not publish a binding       │
│ universal tariff. Final charges depend on verified time and approved          │
│ adjustments.                                                                 │
│                                                                              │
│ [Request Staff] [Get an Estimate] [Contact Sales]                            │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ EMPLOYER PRICING MODEL                                                       │
│                                                                              │
│ [Regular Shift]           Planned or scheduled staffing coverage              │
│ [Urgent / Same-Day]       Faster response may use urgency adjustment          │
│ [Recurring Staffing]      Repeated coverage or predictable schedule support   │
│ [Long-Distance Assignment] Travel time, mileage, or transportation may apply  │
│ [Managed / Enterprise]    Custom agreement for larger or recurring needs      │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ TRANSPARENT CHARGE BREAKDOWN                                                 │
│                                                                              │
│ Estimate components:                                                         │
│ Base staffing charge                                                         │
│ + Urgency adjustment                                                          │
│ + Travel time                                                                │
│ + Mileage or transportation                                                  │
│ + Taxes where applicable                                                     │
│ + Approved adjustments                                                        │
│ = Estimated total                                                            │
│                                                                              │
│ Label: Estimate only. Final total depends on verified time, approved          │
│ adjustments, and applicable rules.                                            │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ ATTENDANCE-TO-INVOICE LIFECYCLE                                              │
│                                                                              │
│ Shift requested → Payment method authorized → Worker checks in → Worker       │
│ checks out → Timesheet reviewed → Final charge calculated → Invoice issued    │
│                                                                              │
│ Human review remains required for disputes, corrections, and exceptional      │
│ cases.                                                                       │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────┬───────────────────────────────────────┐
│ EMPLOYER BILLING                     │ WORKER COMPENSATION                   │
│                                      │                                       │
│ Employer sees staffing charges,      │ Worker sees approved worker earnings, │
│ travel, taxes where applicable,      │ hours, payment status, and allowed    │
│ invoices, adjustments, and disputes. │ corrections.                          │
│                                      │                                       │
│ These are separate ledgers. The      │ The worker does not see client billing│
│ worker does not receive the full     │ totals or platform business margin.   │
│ employer charge unless an approved   │                                       │
│ rule says otherwise.                 │                                       │
└──────────────────────────────────────┴───────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ CANCELLATION AND REPLACEMENT PRINCIPLES                                      │
│                                                                              │
│ Charges may depend on timing, assignment status, actual work performed,       │
│ approved rules, and human review.                                             │
│                                                                              │
│ Exact fees remain configurable and jurisdiction-neutral. Disputes and         │
│ exceptional cases require review.                                             │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ PRICING CALCULATOR PLACEHOLDER                                               │
│                                                                              │
│ Inputs: role, date, start/end time, urgency, location, estimated travel,      │
│ number of workers                                                            │
│                                                                              │
│ Output: estimate only                                                        │
│                                                                              │
│ Notice: The final amount depends on verified time, approved adjustments,      │
│ and applicable pricing rules.                                                │
│                                                                              │
│ [Estimate Staff Cost]                                                        │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ AI ESTIMATE SUPPORT                                                          │
│                                                                              │
│ AI may help organize estimate inputs or flag missing information.             │
│                                                                              │
│ AI Estimate Support → Human Review → Approved Rules → Final Charge            │
│                                                                              │
│ AI does not create binding prices, approve charges, decide disputes, or       │
│ calculate payroll by itself.                                                 │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ EMPLOYER CALLS TO ACTION                                                     │
│ [Request Staff] [Get an Estimate] [Contact Sales for Recurring / Enterprise] │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ FAQ PREVIEW                                                                  │
│ When is the card charged? What happens if hours change? Are travel costs      │
│ included? What happens if a worker cancels? How are disputes handled? Are     │
│ taxes included?                                                              │
│ [View FAQ]                                                                   │
└──────────────────────────────────────────────────────────────────────────────┘
```

## F. Tablet Adaptation

- Pricing model cards use a two-column grid.
- Charge breakdown and estimate notice remain above the calculator placeholder.
- Employer billing and worker compensation cards stack if width is limited.
- Attendance-to-invoice lifecycle becomes a horizontal timeline or two-row timeline.
- CTA band remains full width and does not obscure pricing disclaimers.

## G. Mobile Wireframe

```text
┌──────────────────────────────┐
│ HEADER                       │
│ Resident Job        Menu     │
│ [Request Staff]              │
└──────────────────────────────┘

┌──────────────────────────────┐
│ PRICING                      │
│ Pricing depends on role,     │
│ urgency, duration, location, │
│ travel, and requirements.    │
│                              │
│ Estimate only. Final invoice │
│ depends on verified time and │
│ approved adjustments.        │
│ [Get an Estimate]            │
└──────────────────────────────┘

┌──────────────────────────────┐
│ PRICING MODELS               │
│ Regular shift                │
│ Urgent / same-day shift      │
│ Recurring staffing           │
│ Long-distance assignment     │
│ Managed / enterprise         │
└──────────────────────────────┘

┌──────────────────────────────┐
│ CHARGE BREAKDOWN             │
│ Base staffing charge         │
│ Urgency adjustment           │
│ Travel time                  │
│ Mileage / transportation     │
│ Taxes where applicable       │
│ Approved adjustments         │
│ Estimated total              │
└──────────────────────────────┘

┌──────────────────────────────┐
│ FROM ATTENDANCE TO INVOICE   │
│ Shift requested              │
│ ↓                            │
│ Payment method authorized    │
│ ↓                            │
│ Worker checks in             │
│ ↓                            │
│ Worker checks out            │
│ ↓                            │
│ Timesheet reviewed           │
│ ↓                            │
│ Final charge calculated      │
│ ↓                            │
│ Invoice issued               │
└──────────────────────────────┘

┌──────────────────────────────┐
│ SEPARATE LEDGERS             │
│ Employer billing is separate │
│ from worker compensation.    │
│ No commission percentage is  │
│ shown unless approved.       │
└──────────────────────────────┘

┌──────────────────────────────┐
│ CANCELLATION / REPLACEMENT   │
│ Charges may depend on timing,│
│ assignment status, actual    │
│ work, approved rules, and    │
│ human review.                │
└──────────────────────────────┘

┌──────────────────────────────┐
│ CALCULATOR PLACEHOLDER       │
│ Role                         │
│ Date                         │
│ Start / end time             │
│ Urgency                      │
│ Location                     │
│ Estimated travel             │
│ Number of workers            │
│ Output: estimate only        │
└──────────────────────────────┘

┌──────────────────────────────┐
│ AI ESTIMATE SUPPORT          │
│ AI may organize inputs and   │
│ flag anomalies.              │
│ Human review and approved    │
│ rules determine final charge.│
└──────────────────────────────┘

┌──────────────────────────────┐
│ NEXT STEP                    │
│ [Request Staff]              │
│ [Get an Estimate]            │
│ [Contact Sales]              │
└──────────────────────────────┘
```

## H. Navigation Behavior

- Public header remains consistent with Pages 001-003.
- Request Staff routes to the public Request Staff page.
- Get an Estimate routes to the pricing calculator placeholder or lead form.
- Contact Sales routes to Contact.
- FAQ preview routes to FAQ.
- Sign In remains available but secondary.
- Mobile menu does not expose authenticated-only pages.

## I. Empty States

If public pricing content cannot load:

- Show approved generic pricing model text.
- Keep the estimate-only disclaimer visible.
- Keep Request Staff and Contact Sales CTAs visible.
- Do not show fake prices, fake discounts, fake savings, or fake customer proof.

## J. Loading States

- Header, pricing introduction, estimate disclaimer, and CTAs render first.
- Calculator placeholder may show a loading skeleton.
- Avoid blank pricing cards.
- Avoid infinite spinners.

## K. Error States

If estimate generation fails:

- Show: "Estimate could not be prepared. Please review the inputs or contact sales."
- Keep the lead/contact path available.
- Do not show internal pricing formulas, stack traces, or payment processor details.

## L. Success States

If an estimate is prepared:

- Label it as estimate only.
- Show that final amount depends on verified time and approved adjustments.
- Do not imply dispatch, worker availability, payment capture, or contract approval.

If a lead is submitted:

- Confirm receipt only.
- Do not imply pricing approval or assignment confirmation.

## M. Accessibility Considerations

- WCAG 2.2 AA target.
- Pricing components must use text labels and not color alone.
- Estimate disclaimers must be close to the estimated total.
- Calculator inputs require visible labels.
- Error messages explain recovery.
- Touch targets are at least 44px.
- Tables are avoided on mobile.

## N. AI Assistant Placement

AI assistant placement:

- Optional helper inside the pricing calculator placeholder or FAQ preview.
- It may identify missing inputs, explain estimate components, or flag anomalies.
- It must be labeled advisory.

AI must not:

- Quote binding prices.
- Approve payment authorization.
- Decide final invoice amounts.
- Calculate worker pay by itself.
- Decide cancellation fees or disputes.
- Make legal, accounting, payroll, tax, or compliance determinations.

## O. Future Expansion Notes

Future enhancements:

- Interactive calculator after implementation authorization.
- Configurable pricing-rule admin after commercial rules approval.
- Region-specific tax display after localization and finance review.
- Contract-specific pricing views for enterprise accounts.
- Payment authorization flow after payment architecture approval.
- Dispute workflow details on a protected employer page.

## Self Validation

Required sections:

- Complete.

Navigation consistency:

- Passed. Uses public navigation and CTAs consistent with Pages 001-003.

Mobile-first:

- Passed. Mobile flow prioritizes estimate disclaimer, pricing model, breakdown, lifecycle, and CTA.

Accessibility:

- Passed at wireframe level.

AI boundaries:

- Passed. AI is advisory and separate from final pricing, invoice, payment, payroll, tax, legal,
  accounting, and dispute decisions.

Permission consistency:

- Passed. Public page exposes public pricing model information and public lead actions only.

Financial clarity:

- Passed at wireframe level. Estimate, final invoice, authorization, worker pay, employer billing,
  travel, taxes, adjustments, and disputes are separated.

Implementation boundary:

- Passed. No production implementation, payment integration, backend, database, or production data
  is introduced.

## Review Gate

Page 004 - Pricing requires Product Design Review before Page 005 begins.

Valid outcomes:

- Approved.
- Approved with documented conditions.
- Remediation required.

No React, frontend implementation, backend, database, payment integration, production data, live
integrations, or deployment work is authorized.
