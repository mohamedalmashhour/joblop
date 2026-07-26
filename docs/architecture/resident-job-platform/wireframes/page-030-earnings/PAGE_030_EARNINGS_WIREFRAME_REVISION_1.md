# Page 030 - Earnings Wireframe Revision 1

Status: Approved revision complete
Epic: Epic 3 - Worker Portal
Page: 030 - Earnings
Revision: 1
Approval target: Approved Wireframe v1.0
Architecture baseline: Resident Job Architecture Phase 1 v1.0
Epic planning baseline: Epic 3 Worker Portal Planning v1.0
Timesheet baseline: Page 029 - Timesheet Approved Wireframe v1.0
Frozen architecture source: pages/PAGE_030_EARNINGS.md
Implementation: Not authorized

## 1. Revision Scope

This controlled revision resolves only the approved owner-review conditions for Page 030.

Revision 1 strengthens:

- earnings-state governance;
- estimated versus approved versus paid separation;
- shift-level traceability;
- adjustments and reversals;
- payment-status truthfulness;
- dispute and correction boundaries;
- privacy and employer visibility;
- international readiness;
- AI governance;
- clean handoff to Page 031 - Payments.

This revision does not change:

- Architecture Freeze;
- Epic 3 Planning;
- UX Foundation;
- Navigation;
- Pages 016-029;
- EPIC_3_ATTENDANCE_BOUNDARY_REVIEW.md.

## 2. Summary of Changes

| Condition | Revision 1 response |
| --- | --- |
| Separate financial states | Added independent attendance, earnings, payroll, and payment state lanes. |
| Amount classification | Required every amount to show type, source, period, currency, status, finality, and last update. |
| Shift-level traceability | Strengthened every earnings record back to shift, role, date, approved hours, rate, line items, and statuses. |
| Timesheet boundary | Reconfirmed Page 029 owns attendance evidence, approved hours, disputed hours, and correction workflow. |
| Estimated earnings | Added estimate-only rules with source, known inputs, missing inputs, assumptions, currency, and last update. |
| Gross/net/deductions | Separated gross earnings, deductions, and net pay without calculating deductions here. |
| Premiums/travel/reimbursements | Kept premiums, travel compensation, and reimbursements as distinct line items. |
| Adjustments/reversals | Required original amount, adjustment amount, reason, source, actor, timestamp, status, and resulting amount. |
| Holds/exceptions | Added neutral hold-state requirements with affected amount, responsible party, worker action, and support route. |
| Payment truthfulness | Strengthened Scheduled, Sent, Settled, Failed, Returned, On hold, and Status unavailable boundaries. |
| Payment method boundary | Limited Page 030 to safe masked payment summary and assigned deeper payment workflow to Page 031. |
| Dispute/correction boundary | Added explicit question, correction request, formal dispute, and adjustment boundaries. |
| Statements/documents | Kept document references truthful and governed elsewhere. |
| Multiple currencies | Added separate grouping and no implied conversion without an approved model. |
| Employer visibility | Restricted employer access to separate authorized workflows. |
| Privacy/security | Added masking, role-based access, no cross-worker visibility, and auditable staff access rules. |
| AI boundary | Reinforced AI as explanatory only, with no financial action authority. |
| Page 031 handoff | Defined Page 031 as owner of payment details, instructions, scheduling, execution, failures, returns, and confirmations. |

## 3. Four Independent State Lanes

Page 030 must display four independent state lanes. These cannot collapse into one generic "Paid,"
"Balance," or "Complete" label.

### A. Attendance State

- Timesheet pending.
- Hours under review.
- Hours approved.
- Hours disputed.

Source of truth: Page 029 - Timesheet.

### B. Earnings State

- Estimated.
- Pending calculation.
- Calculated.
- Approved.
- Adjusted.
- Disputed.

Source of truth: future payroll/earnings workflow.

### C. Payroll State

- Not ready.
- Pending payroll.
- Processing.
- Payroll completed.
- Payroll failed.
- Payroll status unavailable.

Source of truth: future payroll workflow.

### D. Payment State

- Not scheduled.
- Scheduled.
- Sent.
- Settled.
- Failed.
- Returned.
- On hold.
- Status unavailable.

Source of truth: Page 031 - Payments or future payment workflow.

Required visible boundaries:

```text
Hours approved
does not equal
Earnings calculated

Earnings calculated
does not equal
Payroll completed

Payroll completed
does not equal
Payment sent

Payment sent
does not equal
Funds settled
```

## 4. Revised Financial Status Panel

```text
FINANCIAL STATUS PANEL

Attendance:
[Timesheet pending / Hours under review / Hours approved / Hours disputed]

Earnings:
[Estimated / Pending calculation / Calculated / Approved / Adjusted / Disputed]

Payroll:
[Not ready / Pending payroll / Processing / Completed / Failed / Unavailable]

Payment:
[Not scheduled / Scheduled / Sent / Settled / Failed / Returned / On hold / Unavailable]

Truth note:
Payment sent does not mean funds received.
Payment settled is the confirmed state when settlement evidence exists.
```

## 5. Amount Classification

Every amount must identify:

- type;
- source;
- period;
- currency;
- status;
- whether estimated or final;
- last update.

Separate categories:

- estimated earnings;
- approved gross earnings;
- payroll-calculated gross;
- deductions;
- net pay;
- reimbursements;
- travel compensation;
- premiums;
- positive adjustments;
- negative adjustments;
- disputed amount;
- paid amount;
- returned amount.

Do not combine unlike categories into one total.

## 6. Amount Finality Label

Each amount card and line item must include one of these visible labels:

- Estimate only.
- Pending approval.
- Approved gross.
- Payroll-calculated.
- Net pay pending.
- Payment scheduled.
- Payment sent.
- Settled.
- Disputed.
- Returned.
- Status unavailable.

Required microcopy:

```text
Estimated amount is not available funds.
Approved gross is not net pay.
Payment sent is not settled.
```

## 7. Shift-Level Traceability

Every earnings entry must trace back to:

- shift reference;
- date;
- role;
- employer or residence;
- approved hours;
- base rate;
- premiums;
- travel terms;
- reimbursement line items;
- adjustment source;
- payroll status;
- payment status.

The worker should be able to understand why an amount exists.

Do not expose:

- employer billing;
- platform margin;
- employer credit status;
- internal pricing model;
- client rate.

## 8. Timesheet Boundary

Page 029 remains authoritative for:

- attendance evidence;
- approved hours;
- disputed hours;
- correction workflow.

Page 030 may display approved results but must not edit them.

```text
Recorded time
does not equal
Approved hours

Approved hours
does not equal
Final earnings
```

Page 030 links back to Page 029 for time questions. It does not duplicate Timesheet correction logic.

## 9. Estimated Earnings Rules

Estimated earnings must show:

- source of estimate;
- known inputs;
- missing inputs;
- assumptions;
- currency;
- last update.

Required language:

```text
Estimate only.
Pending approval.
Subject to payroll rules.
```

Do not display an estimate as available funds.

## 10. Gross, Net, and Deductions

Separate:

- gross earnings;
- deductions;
- net pay.

Page 030 must not calculate deductions.

If deduction details are unavailable, show:

- Pending payroll.
- Detail unavailable.
- Awaiting payroll provider.

Do not fabricate tax or statutory deductions.

Do not provide personalized tax advice.

## 11. Premiums, Travel, and Reimbursements

Show line-item clarity for:

- urgent premium;
- evening premium;
- night premium;
- weekend premium;
- holiday premium;
- travel-time compensation;
- mileage reimbursement;
- fuel reimbursement;
- transportation allowance;
- approved expenses.

Required boundaries:

```text
Premium
does not equal
Base wage

Travel compensation
does not equal
Expense reimbursement

Reimbursement
does not equal
Taxable wage by default
```

Do not make legal or tax conclusions.

## 12. Adjustments and Reversals

Every adjustment must preserve:

- original amount;
- adjustment amount;
- reason;
- source;
- actor;
- timestamp;
- status;
- resulting amount.

Supported concepts:

- correction;
- reversal;
- prior-period adjustment;
- reimbursement correction;
- payroll correction.

Do not silently replace historical amounts.

## 13. Holds and Exceptions

Use neutral hold states:

- Timesheet under review.
- Hours disputed.
- Payroll information missing.
- Payment-method issue.
- Compliance review.
- Employer funding issue.
- Technical processing issue.
- Manual review required.

Every hold should explain:

- affected amount;
- reason category;
- responsible party;
- worker action;
- last update;
- support route.

Do not expose confidential employer financial details.

## 14. Payment Status Truthfulness

Strengthen the distinction between:

- Scheduled.
- Sent.
- Settled.
- Failed.
- Returned.
- On hold.
- Status unavailable.

Do not show "Paid" based only on a payment-initiation event.

```text
Payment sent
does not equal
Funds received

Payment settled
does not equal
No future reversal possible
```

Where settlement evidence is unavailable, show:

```text
Status unavailable
```

## 15. Payment Method Boundary

Page 030 may display only safe payment-method summary information:

- payment method type;
- masked destination;
- last update;
- readiness status.

Page 030 must not allow payment-method editing unless a future approved architecture change assigns
that responsibility here.

Page 031 - Payments owns:

- payment-method details;
- payment instructions;
- payment destination;
- payment scheduling;
- payment execution;
- payment failures;
- returned payments;
- payment confirmations.

Do not expose:

- full account numbers;
- routing details;
- provider secrets;
- full card numbers.

## 16. Dispute and Correction Boundary

Allow entry points for:

- incorrect rate;
- missing premium;
- wrong approved hours;
- missing reimbursement;
- unknown deduction;
- payment not received;
- wrong payment amount.

Required boundaries:

```text
Question
does not equal
Correction request

Correction request
does not equal
Formal dispute

Formal dispute
does not equal
Guaranteed adjustment
```

Page 030 does not own the complete dispute process.

## 17. Correction Routing Matrix

| Worker concern | Primary route | Page 030 role |
| --- | --- | --- |
| Wrong approved hours | Page 029 Timesheet correction | Link only |
| Missing premium | Earnings/payroll question | Entry point |
| Missing reimbursement | Reimbursement support | Entry point |
| Unknown deduction | Payroll question | Entry point |
| Payment not received | Page 031 Payments support | Handoff |
| Wrong payment amount | Payment support or payroll review | Handoff with context |
| Wrong document | Documents workflow | Link only |

## 18. Statement and Document Boundary

Where statements are referenced, show truthful states:

- Available.
- Pending.
- Unavailable.
- Superseded.

Do not fabricate:

- pay statements;
- tax documents;
- payment confirmations.

Document storage remains governed elsewhere.

## 19. Multiple Currencies

Do not combine multiple currencies into one total without an approved conversion model.

If multiple currencies exist:

- group separately;
- label clearly;
- show no implied conversion;
- avoid a single aggregate total.

Do not invent exchange rates.

## 20. Employer Visibility

This page is worker-facing.

Employers must not gain access to:

- complete worker earnings history;
- net pay;
- deductions;
- payment destination;
- earnings from other employers;
- private dispute details.

Employer financial views belong to separate authorized workflows.

## 21. Privacy and Security

Require:

- role-based access;
- financial-data masking;
- no public display;
- no sensitive information in notifications;
- auditable staff access;
- no cross-worker visibility;
- no employer cross-access;
- no insecure export links.

Platform or payroll staff access remains governed and auditable.

## 22. AI Boundary

AI may:

- explain financial labels;
- summarize visible status;
- explain why an amount is pending;
- identify visible missing line items;
- route the worker to support.

AI must not:

- calculate payroll;
- calculate tax;
- change rates;
- approve adjustments;
- issue payments;
- fabricate settlement status;
- resolve disputes;
- expose employer billing;
- provide personalized tax advice;
- modify financial records.

The structured financial record remains authoritative.

## 23. Revised Mobile Pattern

Mobile users must clearly understand:

- estimated amount;
- approved amount;
- processing amount;
- settled amount;
- disputed amount;
- current currency;
- next action;
- shift-level breakdown;
- payment status;
- support path.

```text
MOBILE TOP
Earnings

STATE LANES
Attendance: [state]
Earnings: [state]
Payroll: [state]
Payment: [state]

TRUTH NOTICE
Estimate is not final.
Payment sent is not settled.

AMOUNT SUMMARY
Estimated: [amount] [currency] [Estimate only]
Approved gross: [amount] [currency] [Not net pay]
Processing: [amount] [currency] [Payroll pending]
Sent: [amount] [currency] [Not settled]
Settled: [amount] [currency] [Confirmed]
Disputed: [amount] [currency] [Under review]

SHIFT CARD
[Shift reference]
[Date / role / residence]
Approved hours: [hours] [from Timesheet]
Base: [amount] [finality label]
Premiums: [amount] [status]
Travel: [amount] [status]
Reimbursement: [amount] [status]
Adjustment: [amount] [status]
Payroll: [state]
Payment: [state]
[View line items]
[View Timesheet]
[Ask a question]

SUPPORT ROUTING
[Concern type] -> [route]

PAYMENT METHOD SUMMARY
[Masked destination]
[Readiness status]
[Page 031 handoff]
```

Avoid dense financial tables.

## 24. Accessibility

The revised design must preserve:

- semantic financial summaries;
- accessible currency labels;
- screen-reader-friendly amount/status pairing;
- no color-only states;
- keyboard-accessible filters;
- accessible line-item expansion;
- focus management;
- plain-language terms;
- accessible masked payment method;
- sufficient contrast.

## 25. International Readiness

Do not hardcode:

- currency;
- payroll period;
- tax model;
- deduction categories;
- banking format;
- payment rail;
- premium rules;
- reimbursement rules;
- number format;
- date format;
- pay timing;
- labour classification;
- statement requirements.

Jurisdiction, currency, worker classification, payroll provider, employer, and policy configuration
remain separate.

## 26. Self Validation

| Requirement | Result |
| --- | --- |
| Attendance, earnings, payroll, and payment states remain independent | Pass |
| Estimated amounts cannot appear final | Pass |
| Payment sent cannot appear settled | Pass |
| Shift-level traceability is clear | Pass |
| Gross, deductions, and net remain separate | Pass |
| Adjustments preserve history | Pass |
| Multiple currencies are not improperly combined | Pass |
| Employer access is restricted | Pass |
| Page 030 does not duplicate Page 031 | Pass |
| AI cannot calculate, modify, approve, or pay | Pass |
| Architecture Freeze unchanged | Pass |
| Epic 3 Planning unchanged | Pass |
| UX Foundation unchanged | Pass |
| Navigation unchanged | Pass |
| Pages 016-029 unchanged | Pass |
| Attendance Boundary Review unchanged | Pass |
| No Page 031 created | Pass |
| No implementation started | Pass |

## 27. Final Revision Status

```text
Page 030 - Earnings
Wireframe Revision 1: COMPLETE
Approval target: APPROVED WIREFRAME v1.0

Page 031 - Payments
UNBLOCKED as next controlled gate
NOT CREATED
```
