# Page 031 - Payments Low-Fidelity Wireframe

Status: Initial wireframe complete
Epic: Epic 3 - Worker Portal
Primary user: Authenticated worker
Secondary visibility: Payroll, Finance, Support, Compliance, Administrator, and Super Administrator where role-permitted
Architecture baseline: Resident Job Architecture Phase 1 v1.0
Epic planning baseline: Epic 3 Worker Portal Planning v1.0
Earnings baseline: Page 030 - Earnings Approved Wireframe v1.0
Frozen architecture source: pages/PAGE_031_PAYMENTS.md
Implementation: Not authorized

## 1. Frozen Page Confirmation

The frozen architecture page map defines:

| Page | Frozen title | Source |
| --- | --- | --- |
| 030 | Earnings | pages/PAGE_030_EARNINGS.md |
| 031 | Payments | pages/PAGE_031_PAYMENTS.md |
| 032 | Ratings | pages/PAGE_032_RATINGS.md |

No title inference, rename, or architecture amendment is introduced.

## 2. Page Purpose

Payments is the authenticated worker page for reviewing payment destination status, payment
records, payment states, holds, failures, returned payments, and safe payment support paths.

The page allows the worker to:

- review payment destination status;
- review scheduled and historical payments;
- distinguish sent, settled, failed, returned, and held payments;
- understand payment issues;
- view safe masked payment-method information;
- update or begin updating a payment destination only where the frozen architecture assigns that
  responsibility here;
- access correction, support, or dispute paths;
- understand the relationship between Earnings and Payments.

The page must not:

- calculate payroll;
- calculate taxes or deductions;
- calculate earnings;
- approve hours;
- create employer invoices;
- guarantee settlement timing;
- show payment sent as funds received;
- expose full banking or card details;
- expose payment-provider credentials;
- allow silent changes to payout destination;
- create a real payment-provider integration.

## 3. Financial Lifecycle Separation

```text
Timesheet approved
↓
Earnings calculated
↓
Payroll completed
↓
Payment scheduled
↓
Payment initiated
↓
Payment sent
↓
Payment settled

or

Payment failed / returned / held
```

Required boundaries:

```text
Earnings approved
does not equal
Payment scheduled

Payment scheduled
does not equal
Payment sent

Payment sent
does not equal
Funds received

Funds received
does not equal
Payment permanently final
```

Page 031 owns payment status and payment destination only.

It must not own:

- attendance;
- approved hours;
- earnings calculation;
- payroll calculation;
- employer invoicing;
- tax calculation.

## 4. Independent Payment States

The page must not collapse all dimensions into "Paid."

### A. Payment Readiness

- Not ready.
- Awaiting approved earnings.
- Awaiting payroll.
- Payment information required.
- Ready for scheduling.
- Blocked.
- Readiness unavailable.

### B. Processing State

- Not scheduled.
- Scheduled.
- Processing.
- Sent.
- Failed.
- Returned.
- Cancelled.
- On hold.
- Status unavailable.

### C. Settlement State

- Not applicable.
- Pending settlement.
- Settled.
- Reversed.
- Settlement status unavailable.

### D. Worker Action State

- No action required.
- Payment method required.
- Verification required.
- Correction required.
- Contact support.
- Review hold.

## 5. Desktop Wireframe

```text
HEADER
Resident Job | Payments | Worker: [Name] | Help | Notifications

PAYMENT BOUNDARY NOTICE
Payments show destination, scheduling, sending, settlement, holds, and failures.
This page does not calculate earnings, payroll, deductions, tax, or invoices.
Payment sent does not mean funds received.

PAYMENT LIFECYCLE
Timesheet approved -> Earnings calculated -> Payroll completed -> Payment scheduled
-> Payment initiated -> Payment sent -> Payment settled / failed / returned / held

PAYMENT SUMMARY
| Summary item | Amount | Currency | Payment record | Earnings period | Status | Last update |
| Next scheduled payment | [amount] | [currency] | [ref] | [period] | Scheduled | [timestamp] |
| Processing | [amount] | [currency] | [ref] | [period] | Processing | [timestamp] |
| Sent | [amount] | [currency] | [ref] | [period] | Sent, not settled | [timestamp] |
| Settled | [amount] | [currency] | [ref] | [period] | Settlement confirmed | [timestamp] |
| Failed | [amount] | [currency] | [ref] | [period] | Failed | [timestamp] |
| Returned | [amount] | [currency] | [ref] | [period] | Returned | [timestamp] |
| On hold | [amount] | [currency] | [ref] | [period] | On hold | [timestamp] |

Do not combine currencies into one total without an approved conversion model.

PAYMENT DESTINATION
- Method type: [masked]
- Destination: [masked]
- Account-holder name: [only where necessary and approved]
- Institution/provider: [safe label]
- Destination readiness: [state]
- Verification status: [state]
- Last updated: [timestamp]

DESTINATION CHANGE GOVERNANCE
Current destination summary
-> Begin change
-> Recent authentication / reauthentication
-> Future secure provider flow
-> Confirmation
-> Verification state
-> Effective date
-> Pending-change state
-> Cancel before activation where permitted
-> Audit history
-> Material-change notification

New details submitted != verified.
Verified != active.
Active != applied to a payment already sent.

PAYMENT RECORDS
| Payment ref | Earnings period | Statement/covered shifts | Authorized amount | Currency | Scheduled | Sent | Settled | Destination | Processing state | Settlement state | Hold/failure | Last update | Support |
| [ref] | [period] | [statement/ref] | [amount] | [currency] | [date] | [date] | [date/status] | [masked] | [state] | [state] | [state] | [timestamp] | [route] |

Payment records consume authorized payment amounts. They do not recalculate amounts.

HOLDS AND FAILURES
| Category | Affected payment | Affected amount | Responsible party | Worker action | Last update | Support route |
| [category] | [ref] | [amount/currency] | [party] | [action] | [timestamp] | [route] |

RETURNED / REVERSED PAYMENTS
- Original payment
- Return or reversal record
- Amount
- Currency
- Timestamp
- Reason category
- Current status
- Next action

PAYMENT TIMING
- Scheduled date
- Processing date
- Sent date
- Estimated settlement date
- Actual settlement date

Estimated settlement date != guaranteed receipt date.

RELATIONSHIP TO EARNINGS
Page 030 remains authoritative for earnings records and breakdowns.
[View Earnings]

RELATIONSHIP TO PAYROLL
Future payroll workflow remains authoritative for gross, deductions, net, tax treatment,
and payroll status.

EMPLOYER BILLING BOUNDARY
Employer billing and worker payment are separate.
No employer invoice, employer payment method, credit terms, platform margin, client rate,
or internal funding status appears here.

DISPUTES AND CORRECTIONS
Question != correction request.
Correction request != formal dispute.
Formal dispute != guaranteed payment or adjustment.

STATEMENTS AND RECEIPTS
Payment confirmation: Available / Pending / Unavailable / Superseded
Settlement receipt: Available / Pending / Unavailable / Superseded
Payment statement: Available / Pending / Unavailable / Superseded
Returned-payment notice: Available / Pending / Unavailable / Superseded
Reversal notice: Available / Pending / Unavailable / Superseded

NOTIFICATION STATUS
- Payment scheduled
- Payment sent
- Payment failed
- Payment returned
- Payment destination changed
- Action required

No full financial details in notifications.

PRIVACY AND SECURITY
Worker sees own payment history and masked destination only.
Authorized staff access is governed and audited.
Employers do not see worker bank details, full payment history, deductions, destination,
private disputes, or unrelated net pay.

AI ASSISTANCE
AI can explain payment states and route to support.
AI cannot issue payment, change destination, verify destination, fabricate settlement,
or access full banking information.
```

## 6. Payment Destination Governance

If Page 031 owns payment-destination changes, the governed workflow must include:

- current destination summary;
- begin change;
- worker authentication or reauthentication;
- new destination entry through a future secure provider flow;
- confirmation;
- verification state;
- effective date;
- pending-change state;
- cancellation before activation where permitted;
- audit history;
- notification of material change.

Do not allow silent replacement.

Do not display sensitive entered details after submission.

If the frozen architecture assigns payment-method editing elsewhere, Page 031 links to that workflow
instead of owning it.

## 7. Account-Takeover Protection

Payment-destination changes are high-risk.

Conceptual controls may include:

- recent authentication;
- two-factor confirmation;
- change confirmation;
- delayed activation;
- notification through an existing verified channel;
- support escalation;
- suspicious-change review;
- previous destination retained as an audit reference;
- worker cancellation of an unauthorized pending change.

Do not implement security controls.

Do not expose internal fraud scoring.

AI must not approve a payment-destination change.

## 8. Holds and Failures

Neutral hold categories:

- Payment information incomplete.
- Payment destination under verification.
- Payroll issue.
- Compliance review.
- Earnings dispute.
- Returned payment.
- Provider processing issue.
- Manual review required.
- Technical issue.

Failure states:

- Destination rejected.
- Account information invalid.
- Provider unavailable.
- Payment returned.
- Bank rejected transfer.
- Payment status unavailable.
- Technical failure.
- Manual review required.

Every hold or failure should show:

- affected payment;
- affected amount;
- currency;
- reason category;
- responsible party;
- worker action;
- last update;
- support route.

Do not expose confidential employer funding information, internal risk scores, private reviewer
notes, or provider credentials.

Do not promise automatic retry unless a governed rule exists.

Do not blame the worker without evidence.

## 9. Returned or Reversed Payments

Clearly distinguish:

- payment returned before settlement;
- payment reversed after settlement;
- payment cancelled before sending;
- duplicate payment correction;
- provider correction.

Preserve:

- original payment;
- return or reversal record;
- amount;
- currency;
- timestamp;
- reason category;
- current status;
- next action.

Do not silently overwrite original payment history.

## 10. Relationships to Other Pages and Workflows

### Relationship to Earnings

Page 030 remains authoritative for earnings records and breakdowns.

Page 031 may show:

- payment amount;
- linked earnings statement;
- covered earnings period;
- covered shift references.

Page 031 must not:

- alter earnings;
- alter approved hours;
- calculate gross or net pay;
- create adjustments to earnings.

### Relationship to Payroll

The future payroll workflow remains authoritative for:

- gross calculation;
- deductions;
- net amount;
- tax treatment;
- payroll status.

Page 031 consumes the authorized payment amount.

Do not duplicate payroll logic.

Do not provide tax advice.

### Relationship to Employer Billing

Employer billing and worker payment remain separate.

Do not expose:

- employer invoice;
- employer payment method;
- employer credit terms;
- platform margin;
- client rate;
- internal funding status.

## 11. Dispute and Correction Boundary

Entry points may include:

- payment not received;
- wrong destination;
- wrong amount;
- duplicate payment;
- returned payment;
- unknown hold;
- payment status incorrect.

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
Guaranteed payment or adjustment
```

Page 031 does not own the full dispute workflow unless a future approved architecture change assigns
that responsibility here.

## 12. Staff Access Auditability

Conceptually require auditing for staff access to:

- payment destination details;
- payment failure details;
- returned payments;
- manual payment holds;
- destination changes.

Audit records should preserve:

- actor;
- role;
- action;
- governed payment reference;
- timestamp;
- result;
- reason or support-case reference where appropriate.

Do not log full bank or card details.

## 13. AI Boundaries

AI may:

- explain payment states;
- explain the difference between sent and settled;
- identify missing visible information;
- summarize a non-sensitive payment timeline;
- route the worker to support;
- explain a hold using approved status data.

AI must not:

- issue payment;
- change payment destination;
- approve destination verification;
- calculate payroll;
- calculate tax;
- change payment amount;
- fabricate settlement;
- predict guaranteed receipt;
- resolve disputes;
- expose sensitive payment details;
- access or repeat full banking information.

The structured payment record remains authoritative.

## 14. Empty and Error States

Include:

- no payments yet;
- earnings not ready;
- payment method missing;
- verification pending;
- payment scheduled;
- payment processing;
- payment sent;
- settlement pending;
- payment failed;
- payment returned;
- payment reversed;
- payment on hold;
- destination change pending;
- stale payment data;
- provider unavailable;
- status unavailable;
- support unavailable;
- multiple currencies;
- partial data.

Do not fabricate payment history or status.

## 15. Mobile Wireframe

Mobile must prioritize:

1. Next payment.
2. Amount and currency.
3. Sent versus settled state.
4. Payment destination summary.
5. Worker action.
6. Recent payment history.
7. Failure or hold.
8. Support.
9. Destination-change warning.
10. Clear masking.
11. Large touch targets.

```text
MOBILE TOP
Payments

BOUNDARY NOTICE
Payment sent does not mean funds received.
Payments do not calculate earnings or payroll.

NEXT PAYMENT
[Amount] [Currency]
Readiness: [state]
Processing: [state]
Settlement: [state]
Action: [state/action]

DESTINATION
[Method type]
[Masked destination]
[Readiness / verification]
[Last updated]
[Begin change / link to payment destination workflow]

RECENT PAYMENT CARD
[Payment ref]
[Earnings period]
[Amount + currency]
Scheduled: [date]
Sent: [date/status]
Settled: [date/status]
Status: [state]
[View details]
[Get support]

HOLD / FAILURE
[Category]
[Affected payment]
[Worker action]
[Support route]

AI HELP
[Explain this status]
```

Avoid dense banking tables.

## 16. Desktop Wireframe Principles

Desktop may use:

- payment summary;
- payment timeline;
- payment records;
- destination panel;
- holds and failures;
- returned or reversed payments;
- statements;
- support and dispute entry;
- privacy guidance.

Do not turn the page into a payroll-calculation or employer-billing ledger.

## 17. Accessibility

The page must support:

- semantic payment summaries;
- keyboard navigation;
- screen-reader-friendly amount and status labels;
- no color-only payment states;
- accessible masked destination;
- accessible payment timeline;
- focus management;
- plain-language failure and hold messages;
- accessible correction actions;
- sufficient contrast;
- clear currency pronunciation.

## 18. International Readiness

The page must not hardcode:

- currency;
- banking format;
- payment rail;
- settlement timing;
- provider;
- routing format;
- tax identifier;
- payroll period;
- holiday calendar;
- number format;
- date format;
- language;
- reversal rules;
- dispute deadlines;
- identity-verification requirements.

Jurisdiction, currency, provider, payment rail, worker classification, and policy configuration
remain separate.

## 19. Self Validation

| Requirement | Result |
| --- | --- |
| Frozen title remains Payments | Pass |
| Architecture Freeze unchanged | Pass |
| Epic 3 Planning unchanged | Pass |
| Pages 016-030 unchanged | Pass |
| Attendance Boundary Review unchanged | Pass |
| No Page 032 files created | Pass |
| No implementation started | Pass |
| No React/frontend/backend/API/database work | Pass |
| No payroll implementation created | Pass |
| No tax implementation created | Pass |
| No invoicing implementation created | Pass |
| No banking integration created | Pass |
| No payment-provider integration created | Pass |
| No notification implementation created | Pass |

## 20. Final Wireframe Status

```text
Page 031 - Payments
Wireframe: COMPLETE
Product Review: REQUIRED
Approval Record: NOT CREATED

Page 032 - Ratings
BLOCKED
```
