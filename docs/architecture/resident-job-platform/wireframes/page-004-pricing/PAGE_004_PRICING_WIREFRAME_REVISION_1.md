# Page 004 - Pricing Wireframe Revision 1

Status: Controlled Revision 1 complete
Page: 004 - Pricing
Revision date: 2026-07-21
Revision scope: Strengthen authorization versus final charge clarity and pricing transparency
Architecture reference: `docs/architecture/resident-job-platform/pages/PAGE_004_PRICING.md`
Architecture baseline: Resident Job Architecture Phase 1 v1.0
UX baseline: Resident Job UX Foundation
Financial UX standard: Resident Job Financial UX Standard v1.0
Implementation: Not authorized
Payment integration: Not authorized

## Summary Of Changes

Revision 1 resolves the documented Product Design Review condition by making financial safety
language more explicit and easier to understand.

Changed:

- Added a dedicated Payment Authorization vs Final Charge timeline.
- Added a dedicated "How We Keep Pricing Transparent" section.
- Strengthened Estimate vs Invoice separation.
- Strengthened Worker Compensation separation.
- Clarified cancellation principles without hardcoded fees.
- Kept AI advisory and separated from financial decisions.

Not changed:

- Architecture.
- UX Foundation.
- Navigation.
- Public page purpose.
- Pricing configurability.
- Permissions.
- APIs.
- Data entities.
- Implementation status.

## Updated Information Hierarchy

1. Pricing introduction.
2. Financial safety notice: estimate, authorization, final charge.
3. Employer pricing model.
4. How we keep pricing transparent.
5. Transparent charge breakdown.
6. Payment authorization vs final charge timeline.
7. Estimate vs invoice.
8. Worker-pay separation.
9. Cancellation and replacement principles.
10. Pricing calculator placeholder.
11. Employer calls to action.
12. FAQ preview.
13. Footer.

## Updated Desktop Wireframe

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
│ Financial safety notice:                                                     │
│ Estimate is not a final invoice. Authorization is not final payment. Final    │
│ billing is based on verified work and approved adjustments.                   │
│                                                                              │
│ [Request Staff] [Get an Estimate] [Contact Sales]                            │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ EMPLOYER PRICING MODEL                                                       │
│ [Regular Shift] [Urgent / Same-Day] [Recurring Staffing]                     │
│ [Long-Distance Assignment] [Managed / Enterprise Agreement]                  │
│                                                                              │
│ No universal public tariff is shown. Pricing remains configurable according  │
│ to approved business rules and agreement terms.                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ HOW WE KEEP PRICING TRANSPARENT                                              │
│                                                                              │
│ Clear estimates before booking                                               │
│ No hidden platform charges                                                   │
│ Charges based on verified attendance                                         │
│ Approved adjustments are visible                                             │
│ Workers and employers have separate financial records                        │
│ Disputes are reviewed by people                                              │
│ AI may assist calculations but does not make financial decisions             │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ TRANSPARENT CHARGE BREAKDOWN                                                 │
│ Estimate components:                                                         │
│ Base staffing charge + Urgency adjustment + Travel time + Mileage or         │
│ transportation + Taxes where applicable + Approved adjustments                │
│ = Estimated cost                                                             │
│                                                                              │
│ Label: Estimate only. This is not guaranteed and is not the final invoice.    │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ PAYMENT AUTHORIZATION VS FINAL CHARGE                                        │
│ Payment Authorization → Shift Confirmed → Worker Check-in → Worker Check-out │
│ → Employer Timesheet Review → Approved Adjustments → Final Charge Calculation│
│ → Invoice → Settlement                                                       │
│                                                                              │
│ Authorization reserves or verifies the payment method only. It is not final  │
│ payment. Never assume the card is charged immediately unless approved         │
│ business rules specifically require it.                                      │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────┬───────────────────────────────────────┐
│ ESTIMATED COST                       │ FINAL INVOICE                         │
│                                      │                                       │
│ Role, time, urgency, location,       │ Actual hours worked, checkout,        │
│ travel, and number of workers create │ timesheet review, approved            │
│ an estimate.                         │ adjustments, and applicable rules     │
│                                      │ create the invoice.                   │
│ Estimated Cost                       │ Actual Hours Worked                   │
│ ↓                                    │ ↓                                     │
│ Actual Hours Worked                  │ Approved Adjustments                  │
│ ↓                                    │ ↓                                     │
│ Approved Adjustments                 │ Final Invoice                         │
│ ↓                                    │                                       │
│ Final Invoice                        │                                       │
└──────────────────────────────────────┴───────────────────────────────────────┘

┌──────────────────────────────────────┬───────────────────────────────────────┐
│ EMPLOYER BILLING                     │ WORKER COMPENSATION                   │
│                                      │                                       │
│ Employer billing includes applicable │ Worker compensation is a separate     │
│ staffing charges, travel, taxes,     │ financial process based on approved   │
│ invoices, and approved adjustments.  │ worker rules, hours, corrections, and │
│                                      │ payment status.                       │
│ No internal formulas or commission   │                                       │
│ percentages are displayed.           │ The worker does not see employer      │
│                                      │ billing totals or platform margin.    │
└──────────────────────────────────────┴───────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ CANCELLATION AND REPLACEMENT PRINCIPLES                                      │
│ Charges may depend on timing, work completed, approved business rules, and    │
│ exceptional circumstances.                                                    │
│                                                                              │
│ Exact fees are not hardcoded on this public page. Exceptional cases and       │
│ disputes require human review.                                                │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ PRICING CALCULATOR PLACEHOLDER                                               │
│ Inputs: role, date, start/end time, urgency, location, estimated travel,      │
│ number of workers                                                            │
│                                                                              │
│ Output: ESTIMATE ONLY                                                        │
│                                                                              │
│ Final amount depends on verified time, employer timesheet review, approved    │
│ adjustments, and applicable pricing rules.                                   │
│                                                                              │
│ [Estimate Staff Cost]                                                        │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ AI ESTIMATE SUPPORT                                                          │
│ AI may organize inputs or flag anomalies.                                    │
│                                                                              │
│ AI Estimate Support → Human Review → Approved Rules → Final Charge            │
│                                                                              │
│ AI does not make financial decisions, approve charges, decide disputes,       │
│ calculate payroll, or provide legal, tax, accounting, or payroll advice.      │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Updated Mobile Flow

```text
┌──────────────────────────────┐
│ PRICING                      │
│ Prices depend on role,       │
│ urgency, duration, location, │
│ travel, and requirements.    │
│                              │
│ Estimate is not final invoice│
│ Authorization is not payment │
│ Final billing uses verified  │
│ work and approved changes.   │
│ [Get an Estimate]            │
└──────────────────────────────┘

┌──────────────────────────────┐
│ TRANSPARENCY PRINCIPLES      │
│ Clear estimates              │
│ No hidden platform charges   │
│ Verified attendance          │
│ Visible adjustments          │
│ Separate financial records   │
│ Human dispute review         │
│ AI assists only              │
└──────────────────────────────┘

┌──────────────────────────────┐
│ AUTHORIZATION VS CHARGE      │
│ Payment Authorization        │
│ ↓                            │
│ Shift Confirmed              │
│ ↓                            │
│ Worker Check-in              │
│ ↓                            │
│ Worker Check-out             │
│ ↓                            │
│ Employer Timesheet Review    │
│ ↓                            │
│ Approved Adjustments         │
│ ↓                            │
│ Final Charge Calculation     │
│ ↓                            │
│ Invoice                      │
│ ↓                            │
│ Settlement                   │
└──────────────────────────────┘

┌──────────────────────────────┐
│ ESTIMATE VS INVOICE          │
│ Estimated Cost               │
│ ↓                            │
│ Actual Hours Worked          │
│ ↓                            │
│ Approved Adjustments         │
│ ↓                            │
│ Final Invoice                │
└──────────────────────────────┘

┌──────────────────────────────┐
│ SEPARATE FINANCIAL PROCESSES │
│ Employer billing             │
│ ≠                            │
│ Worker compensation          │
│ No commission percentages    │
│ No internal formulas         │
└──────────────────────────────┘

┌──────────────────────────────┐
│ CANCELLATION                 │
│ Charges depend on timing,    │
│ work completed, approved     │
│ rules, and exceptional       │
│ circumstances. No hardcoded  │
│ public fees.                 │
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
│ Output: ESTIMATE ONLY        │
└──────────────────────────────┘
```

## Financial Safety Confirmations

Payment Authorization vs Final Charge:

- Visually separated.
- Dedicated timeline added.
- Authorization is explicitly not final payment.
- Final billing is based on verified work and approved adjustments.
- No language implies immediate card charge unless approved business rules require it.

Pricing Transparency Principles:

- Dedicated section added.
- Uses operational language.
- Avoids marketing language.

Estimate vs Invoice:

- Estimated Cost, Actual Hours Worked, Approved Adjustments, and Final Invoice are separated.
- Estimate is never presented as guaranteed.

Worker Compensation:

- Employer billing and worker compensation are independent financial processes.
- No commission percentages are displayed.
- No internal pricing formulas are exposed.

Cancellation:

- Charges depend on timing, work completed, approved business rules, and exceptional circumstances.
- No hardcoded fees were added.

## Design Principles Confirmed

- Country neutrality maintained.
- Mobile-first maintained.
- Accessibility maintained.
- Financial transparency strengthened.
- AI transparency maintained.
- No subscriptions, coupons, discounts, promotional pricing, legal guarantees, tax guarantees, or
  accounting advice were added.

## Confirmation

Architecture unchanged.

UX Foundation unchanged.

Navigation unchanged.

Pricing remains configurable.

No implementation started.

Page 005 remains blocked until Page 004 reaches Approved Wireframe v1.0.

No React, frontend implementation, backend, database, payment integration, production data, live
integrations, or deployment work was performed.
