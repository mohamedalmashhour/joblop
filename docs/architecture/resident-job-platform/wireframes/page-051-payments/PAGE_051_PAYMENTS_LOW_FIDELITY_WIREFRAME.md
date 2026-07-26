# Resident Job

## Page 051 - Payments

**Status:** Low-Fidelity Wireframe Complete  
**Owner Review:** Required  
**Approval Record:** Not Created  
**Implementation:** Not Started  
**Page 052:** Reports blocked

---

## 1. Purpose

Page 051 designs the authenticated employer Payments experience.

Page 051 governs visibility and controlled actions around payments connected to issued invoices. It continues from Page 050 - Invoices and prepares a governed handoff to the next frozen workflow:

```text
Page 052 — Reports
```

Page 051 may allow authorized users to:

- view payment status
- view payment attempts
- initiate a governed payment flow
- review partial payments
- view failed or pending payments
- request support
- view refunds or adjustments where already governed
- hand off settled results to reconciliation or reporting workflows

Page 051 must not:

- fabricate payment success
- treat authorization as settlement
- calculate payroll
- execute host or worker payouts
- own accounting reconciliation
- own taxation
- alter invoice history
- silently retry charges
- expose full payment credentials
- allow AI to approve, capture, refund, retry, or reconcile money

---

## 2. Primary Users

Authorized employer-side users with payment visibility or action permissions:

- organization owner
- finance manager
- billing administrator
- authorized residence manager
- read-only auditor
- platform support where governed

Role and organization context determine whether the user may view, initiate, retry, refund, export, or request support for payments.

---

## 3. Payment Lifecycle

Represent payment lifecycle states independently:

- not initiated
- payment method required
- initiated
- authorization pending
- authorized
- capture pending
- captured
- partially paid
- settled
- failed
- cancelled
- refunded
- partially refunded
- disputed
- chargeback
- reconciliation pending
- reconciled
- unavailable

Clarify:

```text
Initiated != Authorized
Authorized != Captured
Captured != Settled
Settled != Reconciled
Refund requested != Refund completed
```

Do not collapse payment lifecycle into invoice issuance, accounting, taxation, payroll, or reporting.

---

## 4. Invoice Boundary

Page 050 remains authoritative for invoice records.

Page 051 may reference:

- invoice reference
- amount due
- currency
- due date
- payment status
- outstanding balance

Page 051 must not:

- change invoice totals
- delete invoice history
- alter approved timesheet sources
- issue invoices
- void invoices

Clarify:

```text
Invoice issued != Payment initiated
Invoice corrected != Payment automatically corrected
```

---

## 5. Payment Source of Truth

Page 051 owns only:

```text
Governed payment record and status display
```

Page 051 must not own:

- invoice generation
- payroll
- payouts
- general ledger
- bank reconciliation
- tax filing
- collections adjudication

The authoritative payment-provider or internal payment record must remain distinguishable from UI state.

Clarify:

```text
UI success message != Provider-confirmed success
Provider authorization != Funds settled
```

---

## 6. Payment Methods

Represent safe payment-method categories:

- card
- bank transfer
- pre-authorized debit where governed
- account credit
- external or manual payment
- unsupported
- unavailable

Do not expose:

- full card number
- CVV
- full bank account number
- secret tokens
- raw provider credentials

Use masked identifiers only.

---

## 7. Payment Attempts

Represent payment attempt states:

- attempt created
- awaiting action
- processing
- succeeded
- failed
- cancelled
- expired
- requires review

Each attempt should conceptually include:

- attempt reference
- amount
- currency
- method category
- timestamp
- result
- safe failure reason
- provider reference where permitted

Do not overwrite prior attempts.

---

## 8. Partial Payments

Represent separately:

- original invoice total
- amount paid
- outstanding balance
- payment allocation
- next payment due
- overpayment review where applicable

Clarify:

```text
Partial payment != Invoice paid
Outstanding balance != Automatic collections action
```

---

## 9. Failed Payments

Represent safe failure categories:

- insufficient funds
- authentication required
- method declined
- expired method
- provider unavailable
- network failure
- duplicate attempt prevented
- authorization expired
- unknown failure

Clarify:

```text
Payment failed != User misconduct
Failure != Invoice cancelled
```

Do not expose sensitive provider details or raw provider error payloads.

---

## 10. Retry Governance

Represent:

- retry available
- retry pending
- retry blocked
- manual review required
- support required

Do not:

- silently retry charges
- create unlimited retries
- retry after cancellation
- retry without current authorization where required

Clarify:

```text
Retry available != Retry authorized
```

Retry must remain a visible, governed action.

---

## 11. Refund Boundary

Represent refund states:

- refund requested
- review pending
- approved
- submitted
- processing
- partially refunded
- refunded
- failed
- disputed
- unavailable

Clarify:

```text
Refund requested != Refund approved
Refund approved != Funds returned
Refund completed != Accounting reconciled
```

Page 051 may show governed refund state but must not adjudicate legal disputes.

---

## 12. Disputes and Chargebacks

Represent only high-level governed states:

- dispute opened
- evidence requested
- under review
- won
- lost
- chargeback recorded
- closed
- unavailable

Do not expose:

- private complaint details
- legal strategy
- sensitive evidence
- internal fraud scoring

Clarify:

```text
Dispute opened != Payment invalid
Chargeback != Final accounting outcome
```

---

## 13. Reconciliation Boundary

Page 051 may show:

- reconciliation pending
- reconciled
- mismatch detected
- review required

Page 051 must not own:

- general ledger
- journal entries
- bank reconciliation
- financial statements
- revenue recognition

Clarify:

```text
Payment settled != Reconciled
Reconciled != Accounting period closed
```

---

## 14. Permissions

Represent role-based access for:

- organization owner
- finance manager
- billing administrator
- authorized residence manager
- read-only auditor
- support where governed

Clarify:

```text
Invoice visibility != Payment authority
Payment authority != Refund authority
Refund authority != Reconciliation authority
```

Permission states should distinguish:

- may view payment status
- may initiate payment flow
- may retry where authorized
- may request refund review
- may view dispute state
- may view audit summary
- may not access full credentials
- may not reconcile accounting records

---

## 15. Privacy and Security

Display only minimum necessary financial data.

Do not expose:

- full payment credentials
- banking secrets
- tax identifiers
- private worker banking data
- health information
- complaints
- investigations
- internal fraud rules
- raw provider error payloads

Represent:

- masked method
- safe payment reference
- secure redirect or handoff state
- session expiry
- re-authentication where required

---

## 16. Auditability

Conceptually preserve:

- payment initiated
- authorization requested
- authorization result
- capture requested
- capture result
- settlement state
- retry
- cancellation
- refund request
- refund result
- dispute state
- reconciliation state
- support intervention

Include:

- actor
- role
- timestamp
- payment reference
- invoice reference
- prior state
- resulting state
- amount and currency
- safe reason
- provider reference where permitted

Do not log secrets or full credentials.

---

## 17. AI Boundary

AI may:

- summarize payment status
- explain payment states
- identify missing user action
- explain safe failure categories
- draft support messages
- suggest navigation

AI must never:

- authorize payments
- capture funds
- retry charges automatically
- issue refunds
- determine dispute outcomes
- reconcile funds
- fabricate provider success
- expose restricted payment data

Clarify:

```text
AI payment summary != Payment approval
AI failure explanation != Provider decision
AI support draft != Refund approval
```

---

## 18. Information Architecture

### Desktop Structure

```text
Employer Shell
├── Header
│   ├── Payments
│   ├── Organization / residence context
│   ├── Payment lifecycle state
│   └── Source-of-truth notice
│
├── Payment list / summary
│   ├── Invoice reference
│   ├── Amount due
│   ├── Amount paid
│   ├── Outstanding balance
│   ├── Payment status
│   └── Next required action
│
├── Payment detail panel
│   ├── Attempt history
│   ├── Payment method category
│   ├── Safe provider reference where permitted
│   ├── Partial-payment summary
│   ├── Failure or pending reason
│   └── Refund / dispute state
│
├── Governed action panel
│   ├── Initiate payment flow
│   ├── Retry where authorized
│   ├── Request refund review
│   ├── Contact support
│   └── View payment audit
│
├── Right governance panel
│   ├── Invoice boundary
│   ├── Payment source of truth
│   ├── Credential privacy
│   ├── Refund boundary
│   ├── Reconciliation boundary
│   ├── Permissions
│   └── AI limitations
│
└── Footer actions
    ├── Open Invoice
    ├── View Attempt History
    ├── Request Support
    ├── Export Receipt Where Governed
    └── Continue to Reports
```

### Mobile Structure

```text
Payments
├── Invoice reference
├── Amount due / amount paid / balance
├── Payment status
├── Payment method category
├── Next required action
├── Attempt history
├── Retry or support path
├── Refund / dispute state
├── Privacy / AI boundary
└── Reports handoff
```

Mobile must answer first:

```text
What payment needs attention?
What is the status?
Is action required?
Was money actually settled?
Where does reporting continue?
```

---

## 19. Empty and Error States

Include:

- no payments
- payment not initiated
- payment pending
- authorization required
- payment failed
- partial payment
- refund pending
- provider unavailable
- reconciliation unavailable
- payment data stale
- access denied
- service unavailable

Do not fabricate success.

---

## 20. Accessibility

Review:

- semantic payment headings
- keyboard navigation
- screen-reader-friendly state labels
- no color-only success or failure states
- readable currency
- accessible tables
- accessible retry and refund controls
- focus management
- sufficient contrast
- plain-language error messages
- confirmation before high-impact actions

---

## 21. International Readiness

Do not hardcode:

- currency
- payment method
- provider
- settlement timing
- refund rules
- chargeback terminology
- decimal format
- date format
- authentication requirements
- payment authority
- retention period
- reconciliation model

Keep jurisdiction, organization, residence, currency, provider, payment policy, locale, and refund policy configurable.

---

## 22. Page 052 Boundary

Exact frozen Page 052 title:

```text
Page 052 — Reports
```

Source:

- `docs/architecture/resident-job-platform/wireframes/DESIGN_STATUS_MATRIX.md`
- `docs/architecture/resident-job-platform/pages/PAGE_052_REPORTS.md`

Page 051 owns:

```text
Payments
```

Page 052 owns:

```text
Reports
```

Page 051 may provide governed payment status and settled-result context to future reporting workflows. It must not create reports, financial statements, accounting ledgers, tax reports, or analytics dashboards.

---

## 23. Validation

Confirmed:

- Frozen title remains Payments.
- Pages 001-050 remain unchanged.
- Exact Page 052 frozen title identified as Reports.
- No Page 052 files created.
- No approval record created.
- No implementation started.
- No React created.
- No frontend created.
- No backend created.
- No APIs created.
- No database changes created.
- No payment engine created.
- No provider integration created.
- No refund implementation created.
- No reconciliation implementation created.
- No accounting implementation created.
- No tax implementation created.
- No AI payment automation created.

---

## 24. Final Status

```text
Page 051 — Payments
Wireframe: COMPLETE
Product Review: PENDING
Approval Record: NOT CREATED
Owner Review: REQUIRED

Page 052 — Reports
BLOCKED
```
