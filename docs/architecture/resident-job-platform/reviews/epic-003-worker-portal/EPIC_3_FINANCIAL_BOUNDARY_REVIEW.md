# Resident Job

## Epic 3 Financial Boundary Review

**Epic:** Epic 3 - Worker Portal  
**Review Scope:** Pages 029-031, with dependencies on Pages 027-028 and the Attendance Boundary Review  
**Review Type:** Worker financial lifecycle, payroll/payment boundary, privacy, and implementation-readiness review  
**Status:** COMPLETE  
**Review date:** 2026-07-22  
**Final Status:** READY FOR PAGE 032 - Ratings  
**Implementation:** Not authorized

---

## 1. Executive Summary

Pages 029-031 form a coherent worker-facing financial boundary:

- Page 029 - Timesheet owns reviewed attendance, correction requests, approved hours, and disputed time.
- Page 030 - Earnings owns worker-visible earnings records, amount classifications, line items, adjustments, and earnings questions.
- Page 031 - Payments owns payment lifecycle state, payment destination summary, holds, failures, returns, reversals, and payment support paths.

No critical blocker was found. Page 032 - Ratings may proceed as the next controlled gate.

The strongest architecture quality is the separation of money concepts:

```text
Attendance evidence
!= approved hours
!= earnings calculated
!= payroll completed
!= payment sent
!= payment settled
!= employer billing
```

The remaining findings are implementation-governance risks, not wireframe defects. They should be
carried into future engineering, security, payroll, and payment-provider planning.

---

## 2. Scope Reviewed

| Page / Artifact | Status | Financial responsibility |
| --- | --- | --- |
| Page 027 - GPS Check In | Frozen dependency | Check-in evidence only |
| Page 028 - GPS Check Out | Frozen dependency | Checkout evidence only |
| Page 029 - Timesheet | Approved Wireframe v1.0 | Reviewed time, correction, approved hours, disputed time |
| Page 030 - Earnings | Approved Wireframe v1.0 | Earnings records, line items, adjustments, worker-facing financial summaries |
| Page 031 - Payments | Approved Wireframe v1.0 | Payment state, masked destination, holds, failures, returns, reversals |
| EPIC_3_ATTENDANCE_BOUNDARY_REVIEW.md | Frozen dependency | Attendance and payroll boundary baseline |
| FINANCIAL_UX_STANDARD_V1_0.md | Active standard | Financial UX principles and no-implementation boundary |

Pages 016-031 were treated as frozen. No approved page, approval record, architecture artifact, UX
foundation artifact, navigation artifact, or attendance boundary review was modified during this
review.

---

## 3. End-to-End Financial Lifecycle

Reviewed lifecycle:

```text
Accepted shift
↓
Check-in
↓
Check-out
↓
Attendance evidence
↓
Timesheet review
↓
Approved hours
↓
Earnings calculation
↓
Payroll processing
↓
Payment scheduling
↓
Payment sent
↓
Payment settlement
↓
Return, reversal, hold, correction, or dispute
```

| Transition | Owner | Authoritative state | Handoff quality | Audit boundary | Recovery path |
| --- | --- | --- | --- | --- | --- |
| Accepted shift -> Check-in | Page 026 to Page 027 | Accepted assignment, then check-in evidence | Clear | Attendance event | Check-in support/fallback |
| Check-in -> Check-out | Page 027 to Page 028 | Evidence events | Clear | Event timestamps | Checkout support/fallback |
| Check-out -> Timesheet review | Pages 027-028 to Page 029 | Attendance evidence assembled | Clear | Evidence immutability | Correction request |
| Timesheet review -> Approved hours | Page 029 | Approved or disputed hours | Clear | Reviewer adjustment audit | Partial approval/dispute path |
| Approved hours -> Earnings calculation | Page 029 to future payroll/earnings workflow and Page 030 display | Approved hours, then earnings state | Clear | Earnings line-item audit | Earnings/payroll question |
| Earnings -> Payroll processing | Page 030 to future payroll workflow | Payroll state | Clear | Payroll workflow audit | Payroll support |
| Payroll -> Payment scheduling | Future payroll to Page 031 payment state | Authorized payment amount | Clear | Payment record | Payment support |
| Payment sent -> Payment settlement | Page 031 | Sent and settlement states remain separate | Clear | Payment event audit | Failure/return/reversal/hold path |

### Finding

Every transition has one clear owner, one authoritative state, a truthful handoff, an audit
boundary, and a correction or support path. No duplicated responsibility blocks Page 032.

---

## 4. Concept Separation

| Concept | Owner / source of truth | Boundary result |
| --- | --- | --- |
| Scheduled time | Shift Details / Accepted Shift | Not worked time |
| Recorded attendance | GPS Check In / GPS Check Out | Evidence only |
| Elapsed duration | Timesheet | Not automatically approved hours |
| Worked time | Timesheet review | Requires review |
| Approved hours | Page 029 | Not payroll completed |
| Estimated earnings | Page 030 | Not final or available funds |
| Approved earnings | Page 030 / future earnings workflow | Not net pay |
| Payroll-calculated gross | Future payroll workflow | Not payment sent |
| Deductions | Future payroll workflow | Not calculated by Pages 029-031 |
| Net pay | Future payroll workflow | Not employer billing |
| Payment scheduled | Page 031 | Not sent |
| Payment sent | Page 031 | Not settled |
| Payment settled | Page 031 / payment provider evidence | Not irreversible |
| Employer billing | Future employer finance workflow | Hidden from worker pages |
| Platform margin | Internal finance | Hidden from worker pages |
| Reimbursement | Page 030 line item / future payroll workflow | Separate from wages |
| Adjustment | Page 029/030/031 depending on domain | Preserves history |
| Dispute | Future dispute workflow | Entry points only in Pages 029-031 |

### Finding

No approved artifact collapses two financial concepts into one unsafe status. The architecture
explicitly avoids vague "Paid" or "Balance" language as a catch-all.

---

## 5. Source of Truth Map

| Data / state | Authoritative page or future system |
| --- | --- |
| Scheduled shift terms | Page 024 Shift Details / Page 026 Accepted Shift |
| Check-in evidence | Page 027 GPS Check In |
| Checkout evidence | Page 028 GPS Check Out |
| Attendance review | Page 029 Timesheet |
| Approved hours | Page 029 Timesheet |
| Earnings line items | Page 030 Earnings / future payroll-earnings workflow |
| Payroll result | Future payroll workflow |
| Payment destination | Page 031 Payments / future secure payment-destination workflow |
| Payment execution | Future payment provider workflow, surfaced through Page 031 |
| Settlement status | Future payment provider evidence, surfaced through Page 031 |
| Adjustment history | Domain-specific audit: Page 029 for time, Page 030 for earnings, Page 031 for payment |
| Dispute state | Future dispute/support workflow |

### Finding

No page becomes authoritative for data owned elsewhere. Pages 029-031 expose downstream summaries
without claiming ownership over upstream evidence or future provider execution.

---

## 6. State-Machine Consistency

Reviewed state models:

- Timesheet states: Draft, Submitted, Under review, Approved, Partially approved, Disputed, Review unavailable.
- Earnings states: Estimated, Pending calculation, Calculated, Approved, Adjusted, Disputed.
- Payroll states: Not ready, Pending payroll, Processing, Payroll completed, Payroll failed, Status unavailable.
- Payment states: Not scheduled, Scheduled, Processing, Sent, Settlement pending, Settled, Failed, Returned, Reversed, Held, Status unavailable.

### Consistency Checks

| Check | Result |
| --- | --- |
| Duplicate states | No unsafe duplicate ownership found. Similar labels are scoped by page/domain. |
| Contradictory states | None found. |
| Missing transitions | No critical missing transition. Future engineering must define exact provider transitions. |
| Ambiguous terminology | Controlled through explicit labels and avoidance of generic "Paid." |
| Premature "complete" or "paid" language | Avoided. |
| States with no responsible actor | None at wireframe level. |
| States with no recovery path | None at wireframe level; support/correction paths exist. |

Required confirmations:

```text
Sent != Settled
Approved hours != Payroll completed
Payroll completed != Payment received
```

### Finding

State-machine consistency is strong enough to continue to Page 032.

---

## 7. Financial Truthfulness

| Financial truth requirement | Result |
| --- | --- |
| Estimates are labeled | Pass |
| Approved amounts are distinguished from estimates | Pass |
| Gross and net are separate | Pass |
| Reimbursements are separate from wages | Pass |
| Deductions are not fabricated | Pass |
| Payment initiation is not shown as settlement | Pass |
| Historical adjustments remain visible | Pass |
| Multiple currencies are not improperly combined | Pass |
| No guaranteed timing is implied without evidence | Pass |

### Finding

Worker-facing financial language is truthful and aligned with the Financial UX Standard.

---

## 8. Worker Fairness

| Scenario | Fairness assessment |
| --- | --- |
| Missing check-in or checkout | Routes to governed review; not automatic misconduct. |
| GPS failure | Supports fallback/review; not automatic penalty. |
| Break disagreement | Timesheet correction path preserves original and requested values. |
| Early checkout | Neutral handling; not automatic forfeiture. |
| Late checkout | Not automatic overtime or misconduct. |
| Extended shift | Requires review before approved hours/payroll. |
| Partial approval | Approved and disputed portions remain visible. |
| Disputed hours | Dispute remains visible with review path. |
| Missing premium | Earnings/payroll question path exists. |
| Incorrect rate | Earnings correction/support path exists. |
| Payment failure | Neutral failure states and support path exist. |
| Returned payment | Original payment history preserved. |
| Destination change | Pending change and unrecognized-change path exist. |
| Account takeover concern | Page 031 treats destination changes as high-risk and routes to support/security review. |

### Finding

No issue automatically becomes misconduct, forfeited pay, rejected payment, or permanent
disqualification. Material issues have governed review paths.

---

## 9. Employer and Platform Boundaries

Employers cannot access:

- worker bank details;
- unrelated earnings;
- deductions;
- net pay;
- payment history from other employers;
- private worker disputes;
- internal fraud signals.

Platform and payroll staff access is required to be:

- role-based;
- auditable;
- purpose-limited;
- appropriately masked.

### Finding

Worker financial privacy and employer boundary separation are preserved.

---

## 10. Payroll Boundary

Pages 029-031 do not own:

- tax calculation;
- statutory deductions;
- payroll remittance;
- employer invoice generation;
- client payment collection;
- banking settlement;
- accounting ledger posting;
- tax-document generation.

Future integration boundary:

```text
Pages 029-031 define user-facing states, ownership, privacy, and handoff behavior.
Future payroll, banking, tax, accounting, invoicing, and payment-provider systems own execution.
```

No implementation design is introduced by this review.

---

## 11. Employer Billing Separation

Worker-facing financial pages do not expose or visibly depend on:

- client billing rate;
- platform markup;
- employer invoice;
- employer payment method;
- employer credit terms;
- internal funding status;
- platform commission.

### Finding

Worker payment and employer billing remain separate governed flows.

---

## 12. Adjustments, Returns, and Reversals

Every correction or financial event must preserve:

- original amount;
- corrected amount;
- source;
- actor;
- timestamp;
- reason;
- status;
- audit history.

Reviewed events:

| Event | Boundary result |
| --- | --- |
| Positive adjustment | Preserves original and adjusted amount. |
| Negative adjustment | Requires source, actor, reason, timestamp, and status. |
| Payroll correction | Future payroll workflow; Page 030 may surface. |
| Reimbursement correction | Separate from wages. |
| Returned payment | Page 031 preserves original payment and return record. |
| Reversed payment | Page 031 separates reversal from settlement. |
| Duplicate-payment correction | Page 031 preserves original and correction history. |
| Prior-period correction | Page 030 supports as adjustment concept. |

### Finding

No historical financial record may be silently overwritten.

---

## 13. Dispute Readiness

The architecture distinguishes:

- question;
- correction request;
- attendance dispute;
- earnings dispute;
- payment dispute;
- formal complaint.

Future dispute ownership:

```text
Full dispute management should be owned by a future governed support/dispute workflow,
not by Pages 029-031.
```

Pages 029-031 provide appropriate entry points without absorbing the full dispute system.

---

## 14. Privacy and Security

| Area | Result |
| --- | --- |
| Financial-value masking | Pass |
| Payment-destination masking | Pass |
| Staff access auditing | Pass |
| No cross-worker access | Pass |
| No employer access to private financial data | Pass |
| Notification data minimization | Pass |
| Export safety | Pass at wireframe level; future engineering must enforce. |
| Account-takeover protection | Pass at UX governance level; future engineering must enforce. |
| Destination-change governance | Pass |
| Stale-session or reauthentication expectations | Pass conceptually; future engineering must define controls. |

### Critical / High Risks

No critical wireframe blocker was found.

High implementation risk remains around payment-destination changes, staff audit enforcement, and
provider settlement state mapping. These require future engineering/security review but do not
require revision of approved wireframes.

---

## 15. AI Governance

AI cannot:

- approve hours;
- alter attendance evidence;
- calculate payroll;
- calculate taxes;
- change rates;
- approve adjustments;
- change payment destination;
- issue payment;
- fabricate settlement;
- resolve disputes;
- expose private financial information.

AI may only:

- explain governed records;
- summarize visible non-sensitive statuses;
- route to support;
- help users understand labels and next steps.

### Finding

AI governance is consistent across Pages 029-031.

---

## 16. Accessibility and Mobile Consistency

| Area | Result |
| --- | --- |
| Amount and currency pronunciation | Covered by Pages 030-031. |
| Status labels | Explicit and not color-only. |
| No color-only financial states | Required. |
| Mobile hierarchy | Strong: time first, earnings summary, then payment status. |
| Masked financial details | Required. |
| Partial approval | Visible on Page 029. |
| Disputes | Entry points exist without claiming full dispute ownership. |
| Payment timelines | Explicit on Page 031. |
| Returned and reversed states | Explicit on Page 031. |
| Error recovery | Support/correction routes exist. |
| Plain-language terminology | Strong. |

### Finding

Accessibility and mobile consistency are strong enough to proceed. Future high-fidelity design must
validate dense financial states visually.

---

## 17. International Readiness

No reviewed page hardcodes:

- currency;
- payroll period;
- tax model;
- deduction rules;
- banking format;
- payment rail;
- settlement timing;
- premium rules;
- overtime rules;
- reimbursement treatment;
- worker classification;
- statement rules;
- dispute deadlines.

### Finding

International readiness is preserved.

---

## 18. Implementation Readiness

Implementation teams can derive:

- domain ownership;
- state machines;
- permissions;
- audit events;
- API boundaries;
- database ownership;
- error handling;
- notification boundaries;
- integration boundaries.

The approved wireframes provide enough product rules to prevent engineering from inventing the
financial model during implementation.

No technical implementation artifact is created by this review.

---

## 19. Scoring

| Category | Score |
| --- | ---: |
| Financial architecture | 9.8 |
| State-model consistency | 9.7 |
| Source-of-truth clarity | 9.8 |
| Worker fairness | 9.8 |
| Financial truthfulness | 9.9 |
| Privacy | 9.8 |
| Security | 9.6 |
| Auditability | 9.7 |
| AI governance | 10.0 |
| Accessibility | 9.6 |
| International readiness | 9.9 |
| Implementation readiness | 9.6 |
| Overall financial-boundary score | 9.8 |

---

## 20. Recommendations

| Priority | Affected area | Risk | Recommended correction | Approved docs revised? | Design debt? |
| --- | --- | --- | --- | --- | --- |
| High | Payment-destination changes | Future implementation may under-protect high-risk destination changes | Future engineering must require strong authentication, audit, masking, and notification controls. | No | No |
| High | Settlement state mapping | Provider-specific statuses may be ambiguous | Future payment integration must map provider states to Scheduled, Sent, Settlement pending, Settled, Returned, Reversed, Held, or Unavailable. | No | No |
| High | Staff access | Staff access could become too broad if permissions are weak | Future security design must enforce purpose-limited, role-based, audited access. | No | No |
| Medium | Financial notification content | Notifications could leak sensitive details | Future notification design must avoid full amounts, full destinations, and private dispute data where unsafe. | No | Yes |
| Medium | Multi-currency UX | High-fidelity UI may accidentally aggregate currencies | Future visual QA must verify currency grouping and no implied conversion. | No | Yes |
| Low | Dense mobile states | Mobile payment records may become visually crowded | Future high-fidelity design should test mobile financial cards. | No | Yes |

No Critical finding was identified. Page 032 is not blocked.

---

## 21. Validation

| Validation item | Result |
| --- | --- |
| Pages 016-031 unchanged | Pass |
| Approval records unchanged | Pass |
| No Page 032 files created | Pass |
| No implementation started | Pass |
| No React/frontend/backend/API/database changes | Pass |
| No payroll/tax/invoicing/banking/payment integrations | Pass |
| No commit | Pass |
| No push | Pass |
| No merge | Pass |
| No deployment | Pass |
| Unrelated app changes untouched | Pass |

---

## 22. Final Status

```text
READY FOR PAGE 032 - Ratings
```

Page 032 remains uncreated.

No implementation, commit, push, merge, or deployment was performed.
