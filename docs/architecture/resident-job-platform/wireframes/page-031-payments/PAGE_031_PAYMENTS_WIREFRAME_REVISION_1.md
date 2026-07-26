# Page 031 - Payments Wireframe Revision 1

Status: Approved revision complete
Epic: Epic 3 - Worker Portal
Page: 031 - Payments
Revision: 1
Approval target: Approved Wireframe v1.0
Architecture baseline: Resident Job Architecture Phase 1 v1.0
Epic planning baseline: Epic 3 Worker Portal Planning v1.0
Earnings baseline: Page 030 - Earnings Approved Wireframe v1.0
Frozen architecture source: pages/PAGE_031_PAYMENTS.md
Implementation: Not authorized

## 1. Revision Scope

This controlled revision resolves only the approved owner-review conditions for Page 031.

Revision 1 strengthens:

- payment lifecycle governance;
- payment-destination protection;
- settlement truthfulness;
- payment failure handling;
- worker financial privacy;
- staff auditability;
- account-takeover protection;
- AI boundaries;
- handoff to Page 032 - Ratings.

This revision does not change:

- Architecture Freeze;
- Epic 3 Planning;
- UX Foundation;
- Navigation;
- Pages 016-030;
- Attendance Boundary Review.

## 2. Summary of Changes

| Condition | Revision 1 response |
| --- | --- |
| Payment lifecycle governance | Added a complete Payroll Ready to Settled/Failed/Returned/Reversed/Held lifecycle. |
| Payment-destination protection | Added dedicated current, future, pending-change, effective-date, and verification states. |
| Settlement truthfulness | Required Scheduled, Sent, Settlement Pending, Settled, Failed, Returned, Reversed, Held, and Status unavailable to remain separate. |
| Payment failure handling | Added failure-state display requirements for reason, worker action, support path, and last update. |
| Worker financial privacy | Reconfirmed masked-only destination display and no sensitive banking/provider data. |
| Staff auditability | Required actor, role, timestamp, action, reason, and governed payment reference for staff access. |
| Account-takeover protection | Added pending destination change card and unrecognized-change path. |
| AI boundaries | Reinforced AI as explanatory only, with no payment or destination authority. |
| Handoff to Page 032 | Confirmed Page 032 is unblocked only as the next controlled gate and not created. |

## 3. Revised Payment Lifecycle

```text
Payroll Ready
↓
Payment Scheduled
↓
Payment Processing
↓
Payment Sent
↓
Settlement Pending
↓
Payment Settled

or

Payment Failed
Payment Returned
Payment Reversed
Payment Held
```

Required boundaries:

```text
Scheduled
does not equal
Sent

Sent
does not equal
Settled

Settled
does not equal
Irreversible
```

Do not use one generic "Paid" state.

## 4. Payment State Model

The page must show payment state as separate dimensions.

| Dimension | Allowed values | Boundary |
| --- | --- | --- |
| Readiness | Not ready / Awaiting approved earnings / Awaiting payroll / Payment information required / Ready for scheduling / Blocked / Unavailable | Readiness is not payment |
| Scheduling | Not scheduled / Scheduled / Cancelled / Status unavailable | Scheduled is not sent |
| Processing | Processing / Sent / Failed / Returned / On hold / Status unavailable | Sent is not settled |
| Settlement | Not applicable / Settlement pending / Settled / Reversed / Settlement unavailable | Settled is not irreversible |
| Worker action | No action required / Verification required / Correction required / Contact support / Review hold | Action state is not payment state |

## 5. Payment Destination Governance

Payment destination information must be split into:

- current destination;
- future destination;
- pending destination change;
- effective date;
- verification status.

Required boundaries:

```text
Destination submitted
does not equal
Verified

Verified
does not equal
Active

Active
does not equal
Applied to already-issued payment
```

## 6. Pending Destination Change Card

Add this dedicated card whenever a destination change is pending.

```text
PENDING DESTINATION CHANGE

Current destination:
[method type + masked destination]

Proposed destination:
[method type + masked destination summary only]

Submitted:
[timestamp placeholder]

Verification state:
[Pending / Verified / Failed / Manual review / Unavailable]

Effective date:
[date placeholder / pending]

Applies to:
[future payments only / not yet active / unavailable]

Audit reference:
[audit record placeholder]

Actions:
[I recognize this change]
[Cancel pending change where permitted]
[I do not recognize this change]
```

Rules:

- never show full bank, card, routing, or provider credential details;
- never silently replace the current destination;
- never apply a new destination to already-issued payments unless a future governed rule exists;
- every change must preserve current destination, proposed destination summary, submitted time,
  verification state, effective date, actor/source, and audit reference.

## 7. Unauthorized Change Path

When a pending destination change exists, the page must show a prominent action:

```text
I do not recognize this change
```

This path routes to support or security review.

It must not:

- expose internal fraud scoring;
- promise instant reversal;
- promise instant payment;
- reveal provider credentials;
- blame the worker without evidence;
- allow AI to approve or deny the change.

The path should explain:

- what happened;
- what is currently pending;
- what the worker can do next;
- whether future payments may be held pending review;
- where support continues the review.

## 8. Financial Privacy

Worker sees only:

- masked destination;
- payment status;
- payment history;
- support information.

Never expose:

- full banking details;
- full card details;
- routing numbers;
- payment credentials;
- provider secrets;
- sensitive identifiers;
- internal provider diagnostics;
- full destination details in notifications or logs.

## 9. Payment Failure Handling

Represent:

- provider unavailable;
- returned payment;
- invalid destination;
- verification pending;
- technical issue;
- manual review.

Every failure should include:

- reason category;
- affected payment;
- affected amount and currency;
- worker action;
- support path;
- last update.

Do not promise automatic retry unless a governed rule exists.

Do not expose confidential employer financial information.

## 10. Holds

Represent neutral holds:

- compliance review;
- payment verification;
- payroll issue;
- technical processing;
- returned payment;
- destination review.

Every hold should show:

- affected payment;
- affected amount and currency;
- reason category;
- responsible party;
- worker action;
- last update;
- support route.

Do not expose:

- confidential employer financial information;
- internal risk scores;
- private reviewer notes;
- provider credentials.

## 11. Staff Auditability

Any staff access to payment destination, payment history, or destination changes must conceptually
preserve:

- actor;
- role;
- timestamp;
- action;
- reason;
- governed payment reference.

Audit records must not log:

- full bank account;
- full card number;
- routing details;
- provider secret;
- credential values.

## 12. AI Boundary

AI may:

- explain payment states;
- explain settlement;
- explain holds;
- summarize payment history using visible non-sensitive data;
- route the worker to support.

AI must never:

- initiate payment;
- change destination;
- approve payment;
- approve destination verification;
- resolve disputes;
- calculate payroll;
- calculate tax;
- change payment amount;
- fabricate settlement;
- predict guaranteed receipt;
- expose financial secrets;
- access or repeat full banking information.

The structured payment record remains authoritative.

## 13. Page 032 Handoff

Page 032 - Ratings is unblocked as the next controlled gate, but not created by this revision.

Page 031 does not create rating prompts, worker performance scoring, employer ratings, or platform
quality decisions.

## 14. Revised Desktop Structure

```text
HEADER
PAYMENT BOUNDARY NOTICE
PAYMENT LIFECYCLE
PAYMENT STATE MODEL
PAYMENT SUMMARY
PAYMENT DESTINATION
PENDING DESTINATION CHANGE CARD
UNAUTHORIZED CHANGE PATH
PAYMENT RECORDS
HOLDS AND FAILURES
RETURNED / REVERSED PAYMENTS
PAYMENT TIMING
RELATIONSHIP TO EARNINGS
RELATIONSHIP TO PAYROLL
EMPLOYER BILLING BOUNDARY
DISPUTES AND CORRECTIONS
STATEMENTS AND RECEIPTS
NOTIFICATION STATUS
PRIVACY AND SECURITY
STAFF ACCESS AUDITABILITY
AI ASSISTANCE
```

## 15. Revised Mobile Structure

```text
MOBILE TOP
Payments

BOUNDARY NOTICE
Scheduled != sent.
Sent != settled.
Settled != irreversible.

NEXT PAYMENT
[Amount] [Currency]
Readiness: [state]
Scheduling: [state]
Processing: [state]
Settlement: [state]
Worker action: [state/action]

DESTINATION
[Current masked destination]
[Verification state]
[Last updated]

PENDING CHANGE
[Proposed masked destination]
[Effective date]
[Verification state]
[I do not recognize this change]
[Cancel pending change where permitted]

RECENT PAYMENT CARD
[Payment ref]
[Amount + currency]
Scheduled: [date/status]
Sent: [date/status]
Settled: [date/status]
Hold/failure: [state]
[Support]

AI HELP
[Explain this status]
```

Avoid dense banking tables.

## 16. Accessibility

The revision preserves:

- semantic payment summaries;
- keyboard navigation;
- screen-reader-friendly amount/status labels;
- no color-only payment states;
- accessible masked destination;
- accessible payment timeline;
- focus management;
- plain-language failure and hold messages;
- accessible correction actions;
- sufficient contrast;
- clear currency pronunciation.

## 17. International Readiness

Do not hardcode:

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

## 18. Self Validation

| Requirement | Result |
| --- | --- |
| Payment states remain independent | Pass |
| Settlement is truthful | Pass |
| Destination changes are governed | Pass |
| Payment failures are clear | Pass |
| Financial privacy is preserved | Pass |
| Staff access is auditable | Pass |
| AI cannot initiate or alter payments | Pass |
| No financial, governance, privacy, or operational risk remains at wireframe level | Pass |
| Architecture Freeze unchanged | Pass |
| Epic 3 Planning unchanged | Pass |
| UX Foundation unchanged | Pass |
| Navigation unchanged | Pass |
| Pages 016-030 unchanged | Pass |
| Attendance Boundary Review unchanged | Pass |
| No Page 032 created | Pass |
| No implementation started | Pass |

## 19. Final Revision Status

```text
Page 031 - Payments
Wireframe Revision 1: COMPLETE
Approval target: APPROVED WIREFRAME v1.0

Page 032 - Ratings
UNBLOCKED as next controlled gate
NOT CREATED
```
