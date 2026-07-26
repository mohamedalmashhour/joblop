# Page 030 - Earnings Low-Fidelity Wireframe

Status: Initial wireframe complete
Epic: Epic 3 - Worker Portal
Primary user: Authenticated worker
Secondary visibility: Payroll, Support, Finance, Compliance, Administrator, and Super Administrator where role-permitted
Architecture baseline: Resident Job Architecture Phase 1 v1.0
Epic planning baseline: Epic 3 Worker Portal Planning v1.0
Timesheet baseline: Page 029 - Timesheet Approved Wireframe v1.0
Frozen architecture source: pages/PAGE_030_EARNINGS.md
Implementation: Not authorized

## 1. Frozen Page Confirmation

The frozen architecture page map defines:

| Page | Frozen title | Source |
| --- | --- | --- |
| 029 | Timesheet | pages/PAGE_029_TIMESHEET.md |
| 030 | Earnings | pages/PAGE_030_EARNINGS.md |
| 031 | Payments | pages/PAGE_031_PAYMENTS.md |

No title inference, rename, or architecture amendment is introduced.

## 2. Page Purpose

Earnings is the authenticated worker page for reviewing earnings-related records and understanding
the status of estimated, approved, processed, sent, settled, disputed, or unavailable amounts.

The page allows the worker to:

- review earnings-related records;
- understand estimated, approved, processed, and paid amounts;
- see which shifts contributed to an amount;
- understand premiums, travel compensation, and reimbursements;
- identify pending or disputed items;
- review payment status;
- access a correction or support path.

The page must not:

- calculate payroll;
- calculate deductions or taxes;
- issue payment;
- generate employer invoices;
- guarantee payment timing;
- present estimates as final;
- expose employer billing or platform margins;
- allow workers to edit approved financial records;
- imply that a completed shift is automatically payable.

## 3. Financial Lifecycle

```text
Shift completed
↓
Timesheet reviewed
↓
Hours approved
↓
Earnings calculated by future payroll workflow
↓
Payroll processing
↓
Payment scheduled
↓
Payment sent
↓
Payment settled or failed
```

Required boundaries:

```text
Shift completed
does not equal
Hours approved

Hours approved
does not equal
Payroll calculated

Payroll calculated
does not equal
Payment sent

Payment sent
does not equal
Payment settled
```

## 4. Independent Amount Types

The page must not collapse financial states into one generic "Balance."

| Amount type | Meaning | Boundary |
| --- | --- | --- |
| Estimated earnings | Preliminary amount from visible shift or rate data | Not final |
| Pending approval | Amount blocked by attendance, timesheet, or review state | Not payable yet |
| Approved gross earnings | Gross amount approved for future payroll input | Not net pay |
| Payroll-calculated gross | Future payroll workflow output | Not payment sent |
| Deductions | Future payroll categories where applicable | Not calculated here |
| Net pay | Future payroll output | Not guaranteed by this page |
| Reimbursements | Non-wage approved expense-related amount | Separate from hourly earnings |
| Travel compensation | Approved travel-related compensation where applicable | Separate line item |
| Premiums | Approved premium line item | Not universal |
| Adjustments | Governed correction to a prior amount | Must be auditable |
| Disputed amount | Amount not resolved | Must remain visible |
| Payment sent | Payment initiated | Not funds received |
| Payment settled | Confirmed settlement status | Final only when confirmed |

Every amount must include:

- currency;
- status;
- applicable period;
- last updated;
- estimated or final label.

Multiple currencies must not be combined into one total without an approved conversion model.

## 5. Desktop Wireframe

```text
HEADER
Resident Job | Earnings | Worker: [Name] | Help | Notifications

FINANCIAL BOUNDARY NOTICE
Earnings records are separate from payroll execution, payment settlement,
employer billing, tax advice, and platform margin.

LIFECYCLE STRIP
Shift completed -> Timesheet reviewed -> Hours approved -> Future payroll calculation
-> Payroll processing -> Payment scheduled -> Payment sent -> Settled/failed

SUMMARY BY STATUS
| Status | Amount | Currency | Period | Last updated | Finality |
| Estimated | [amount] | [currency] | [period] | [timestamp] | Estimate |
| Pending approval | [amount] | [currency] | [period] | [timestamp] | Not final |
| Approved gross | [amount] | [currency] | [period] | [timestamp] | Approved hours only |
| Processing | [amount] | [currency] | [period] | [timestamp] | Payroll pending |
| Payment sent | [amount] | [currency] | [period] | [timestamp] | Not settled |
| Settled | [amount] | [currency] | [period] | [timestamp] | Confirmed |
| Disputed | [amount] | [currency] | [period] | [timestamp] | Under review |

PERIOD AND FILTERS
- Current period
- Previous periods
- Custom date range
- Payment status
- Employer / residence
- Shift
- Earnings type
- Currency

SHIFT-LEVEL EARNINGS RECORDS
| Shift | Role | Residence | Date | Approved hours | Base rate | Premiums | Travel | Reimbursement | Gross | Payroll status | Payment status | Correction |
| [shift ref] | [role] | [approved name] | [date] | [hours] | [rate] | [line] | [line] | [line] | [amount] | [status] | [status] | [status/action] |

LINE-ITEM BREAKDOWN
- Base hourly rate
- Approved hours
- Urgent premium
- Evening/night/weekend/holiday premium where applicable
- Travel-time compensation
- Mileage reimbursement
- Transportation allowance
- Other approved adjustment

Each line item shows:
rate or amount | quantity or basis | source | status | estimated/approved/final

HOURS BOUNDARY
Page 029 Timesheet is the source for reviewed attendance and approved hours.
Recorded time != approved hours.
Approved hours != automatically payable hours.
[View Timesheet]
[Request correction]

REIMBURSEMENTS
Reimbursement != hourly earnings.
Submitted expense != approved reimbursement.
Approved reimbursement != payment settled.

PAYROLL AND DEDUCTIONS BOUNDARY
Gross earnings != net pay.
This page does not calculate deductions, taxes, or jurisdiction-specific payroll rules.

PAYMENT STATUS PANEL
- Not ready for payroll
- Pending payroll
- Payroll processing
- Payment scheduled
- Payment sent
- Payment settled
- Payment failed
- Payment returned
- Payment on hold
- Payment status unavailable

Payment sent != funds received.

PAYMENT METHOD SUMMARY
- Type: [masked]
- Destination: [masked]
- Provider status: [safe status]
- Last update: [timestamp]

No full bank, card, routing, or provider credential values.

HOLDS AND EXCEPTIONS
| Reason category | Affected amount | Worker action | Responsible party | Last update | Support path |
| [category] | [amount] | [action] | [party] | [timestamp] | [link] |

ADJUSTMENTS
Original amount | adjustment amount | reason | actor/source | timestamp | resulting amount | review status

DISPUTES AND CORRECTIONS
Question/correction != formal dispute.
Formal dispute != guaranteed adjustment.

STATEMENTS AND DOCUMENTS
- Earnings statement: Available / Pending / Unavailable / Superseded
- Pay statement: Available / Pending / Unavailable / Superseded
- Payment confirmation: Available / Pending / Unavailable / Superseded
- Tax document: Available / Pending / Unavailable / Superseded
- Adjustment notice: Available / Pending / Unavailable / Superseded

PRIVACY AND SECURITY
Worker sees own earnings only.
Employer visibility is separate and limited.
No employer billing, client rate, platform commission, or internal margin appears here.

AI ASSISTANCE
AI can explain categories and status.
AI cannot calculate payroll, change rates, issue payment, resolve disputes, or expose billing.
```

## 6. Shift-Level Record Requirements

Each record should include:

- shift reference;
- role;
- employer or residence;
- date;
- approved hours;
- base rate;
- premiums;
- travel compensation;
- reimbursement;
- gross amount;
- payroll status;
- payment status;
- dispute or correction status.

Do not expose:

- employer billing;
- client rate;
- platform commission;
- employer credit status;
- internal margin.

## 7. Hours Boundary

Page 029 is authoritative for reviewed attendance and approved hours.

```text
Recorded time
does not equal
Approved hours

Approved hours
does not equal
Automatically payable hours
```

Workers cannot edit hours on Page 030.

Allowed paths:

- view the related Timesheet;
- request a correction through the governed correction path;
- contact support.

## 8. Rate, Premium, and Reimbursement Transparency

Where applicable, display separately:

- base hourly rate;
- urgent premium;
- evening premium;
- night premium;
- weekend premium;
- holiday premium;
- travel-time compensation;
- mileage reimbursement;
- transportation allowance;
- other approved adjustment.

Every line item should identify:

- rate or amount;
- quantity or basis;
- source;
- status;
- estimated or approved label.

Do not invent premiums, universal pay rules, or jurisdiction-specific rules.

Reimbursements remain separate from wages.

## 9. Payroll, Deductions, and Tax Boundary

If deductions are displayed, classify them only as future payroll categories:

- tax withholding;
- statutory deduction;
- benefit deduction;
- adjustment;
- recovery;
- other approved payroll item.

The page must not:

- calculate deductions;
- provide tax advice;
- imply universal deduction rules;
- hardcode Quebec, Canadian, Syrian, or any other jurisdiction's payroll model.

```text
Gross earnings
does not equal
Net pay
```

## 10. Holds and Exceptions

Use neutral states:

- Timesheet under review;
- Hours disputed;
- Missing payroll information;
- Payment-method issue;
- Compliance review;
- Employer funding issue;
- Technical processing issue;
- Manual review required.

Every hold should show:

- reason category;
- affected amount;
- worker action if any;
- responsible party;
- last update;
- support path.

Do not expose confidential employer financial information.

## 11. Adjustments

Adjustment concepts:

- positive adjustment;
- negative adjustment;
- correction;
- reimbursement correction;
- previous-period adjustment;
- reversal.

Preserve:

- original amount;
- adjustment amount;
- reason;
- actor or source;
- timestamp;
- resulting amount;
- review status.

Historical earnings are never silently overwritten.

## 12. Privacy and Visibility

Worker-visible:

- own earnings;
- own payment status;
- own adjustments;
- own dispute status;
- masked payment destination.

Authorized platform/payroll staff:

- governed financial details;
- processing status;
- audit history;
- support history.

Employer-visible only where separately authorized:

- approved hours;
- employer-side cost records;
- not the worker's complete financial profile.

Privacy requirements:

- role-based access;
- auditability;
- sensitive-value masking;
- no public display;
- no financial details in insecure notifications.

## 13. AI Boundaries

AI may:

- explain earnings categories;
- summarize non-sensitive status;
- explain the difference between gross and net;
- identify missing visible line items;
- help navigate to support;
- explain why an amount is pending based on approved status data.

AI must not:

- calculate final payroll;
- calculate tax;
- change rates;
- approve adjustments;
- issue payment;
- predict guaranteed earnings;
- fabricate payment status;
- resolve disputes;
- expose employer billing;
- provide personalized tax advice;
- modify financial records.

The structured financial record remains authoritative.

## 14. Truthful Empty and Error States

Include:

- no earnings yet;
- hours not approved;
- payroll not started;
- payment pending;
- payment failed;
- payment returned;
- amount disputed;
- statement unavailable;
- payment method unavailable;
- stale financial data;
- service unavailable;
- currency mismatch;
- partial data;
- support unavailable.

Do not fabricate totals when data is unavailable.

## 15. Mobile Wireframe

Mobile must prioritize:

1. Summary by status.
2. Current expected amount.
3. Approved amount.
4. Paid amount.
5. Next payment status.
6. Shift-level records.
7. Line-item expansion.
8. Dispute or support action.
9. Masked payment method.
10. Clear currency and status labels.

```text
MOBILE TOP
Earnings
[Worker name]

BOUNDARY
Earnings are not payroll execution or tax advice.
Payment sent does not mean funds received.

SUMMARY
Estimated: [amount] [currency] [period] [estimate]
Approved gross: [amount] [currency] [period] [not net pay]
Processing: [amount] [status]
Sent: [amount] [not settled]
Settled: [amount] [confirmed]
Disputed: [amount] [under review]

NEXT STATUS
[Not ready / Pending payroll / Processing / Scheduled / Sent / Settled / Failed]
[Last updated]

SHIFT RECORD CARD
[Role] at [Residence]
[Date]
Approved hours: [hours]
Gross: [amount]
Premiums: [amount/status]
Travel/reimbursement: [amount/status]
Payroll: [status]
Payment: [status]
[View line items]
[View timesheet]
[Request correction]

HOLDS / EXCEPTIONS
[Reason category]
[Affected amount]
[Worker action]
[Support]

PAYMENT METHOD
[Masked destination]
[Provider status]
[Last update]

AI HELP
[Explain this status]
```

Avoid dense payroll tables on mobile.

## 16. Desktop Wireframe Principles

Desktop may use:

- summary cards;
- lifecycle strip;
- filters;
- status panels;
- shift-level rows;
- expandable line items;
- payment status panel;
- adjustments;
- disputes or corrections;
- statements section;
- privacy guidance.

Do not turn Page 030 into an employer invoicing ledger.

## 17. Accessibility

The page must support:

- semantic financial summaries;
- keyboard navigation;
- screen-reader-friendly amount and status labels;
- no color-only payment states;
- accessible filters;
- clear currency pronunciation;
- accessible expanded line items;
- focus management;
- plain-language financial terms;
- sufficient contrast;
- accessible masked payment details.

## 18. International Readiness

The page must not hardcode:

- currency;
- tax treatment;
- deduction categories;
- payroll period;
- payment rails;
- banking format;
- rate rules;
- premium rules;
- reimbursement rules;
- date format;
- number format;
- labour classification;
- pay-statement requirements;
- payment timing;
- jurisdiction-specific terminology.

Jurisdiction, employer, worker classification, currency, payroll provider, and policy configuration
remain separate.

## 19. Self Validation

| Requirement | Result |
| --- | --- |
| Frozen title remains Earnings | Pass |
| Architecture Freeze unchanged | Pass |
| Epic 3 Planning unchanged | Pass |
| Pages 016-029 unchanged | Pass |
| Attendance Boundary Review unchanged | Pass |
| No Page 031 files created | Pass |
| No implementation started | Pass |
| No React/frontend/backend/API/database work | Pass |
| No payroll implementation created | Pass |
| No tax implementation created | Pass |
| No invoicing implementation created | Pass |
| No banking or payment integration created | Pass |

## 20. Final Wireframe Status

```text
Page 030 - Earnings
Wireframe: COMPLETE
Product Review: REQUIRED
Approval Record: NOT CREATED

Page 031 - Payments
BLOCKED
```
