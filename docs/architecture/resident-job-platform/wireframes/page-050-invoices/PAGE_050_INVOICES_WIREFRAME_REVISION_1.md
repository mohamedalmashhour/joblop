# Resident Job

## Page 050 - Invoices Wireframe Revision 1

**Status:** Approved Wireframe Candidate  
**Revision Scope:** Controlled Revision 1  
**Original Wireframe:** `PAGE_050_INVOICES_LOW_FIDELITY_WIREFRAME.md`  
**Implementation:** Not Started  
**Page 051:** Payments unblocked after approval, not created

---

## 1. Summary of Revision

Revision 1 strengthens Page 050 in the owner-approved areas:

- invoice lifecycle governance
- invoice source of truth
- approved-timesheet handoff
- invoice review and correction
- dispute handling
- payment separation
- accounting and tax boundaries
- privacy and permissions
- auditability
- AI boundaries
- readiness for Page 051 - Payments

No redesign was introduced. Page 050 remains Invoices only.

---

## 2. Invoice Lifecycle Governance

Represent invoice lifecycle states independently:

- draft
- generated
- under review
- issued
- correction requested
- corrected
- partially paid
- paid
- overdue
- disputed
- voided
- archived

Clarify:

```text
Generated != Issued
Issued != Paid
Paid != Reconciled
Disputed != Voided
```

Invoice lifecycle must not collapse into payment execution, accounting reconciliation, tax filing, collections, or reporting.

---

## 3. Approved-Timesheet Handoff

Page 050 may create an invoice only from a governed approved record.

Represent these source handoff states separately:

- source timesheet approved
- invoice generation pending
- invoice generated
- source discrepancy detected
- correction required
- source unavailable

Clarify:

```text
Timesheet approved != Invoice issued
Invoice generated != Source record may be silently changed
```

Page 050 must not modify attendance history, timesheet history, approved hours, or approved source evidence.

---

## 4. Invoice Source of Truth

Page 050 owns only:

```text
Invoices
```

Page 050 must not own:

- attendance
- timesheet approval
- payment execution
- payroll
- accounting ledger
- tax filing
- collections adjudication

Clarify:

```text
Invoice total != Payment received
Payment received != Accounting reconciliation
```

---

## 5. Invoice Contents

Represent safe invoice placeholders:

- invoice reference
- organization
- residence
- billing period
- approved timesheet references
- service dates
- worker role or service category
- approved hours
- approved rate
- premiums where already governed
- subtotal
- tax lines where applicable
- total
- currency
- issue date
- due date
- status
- last updated
- correction history

Do not expose unnecessary worker personal information, worker banking details, tax identifiers, private payroll deductions, health information, complaints, investigations, unrelated employment history, full payment credentials, or internal accounting notes.

---

## 6. Corrections

Represent correction states:

- correction requested
- review pending
- corrected invoice prepared
- corrected invoice issued
- original preserved
- correction rejected
- support required

Clarify:

```text
Correction requested != Original invoice deleted
Corrected invoice != Original history erased
```

Issued invoices must not be silently overwritten. Prior invoice versions and correction reasons remain conceptually preserved.

---

## 7. Disputes

Represent only governed dispute entry and status:

- dispute opened
- evidence requested
- under review
- resolved
- unresolved
- closed

Clarify:

```text
Invoice disputed != Invoice invalid
Dispute opened != Payment automatically cancelled
```

Page 050 must not adjudicate legal, employment, payroll, accounting, collections, or payment disputes.

---

## 8. Payment Boundary

Page 050 prepares explicitly for:

```text
Page 051 — Payments
```

Page 050 may show high-level payment status only:

- unpaid
- partially paid
- paid
- overdue
- payment pending
- payment unavailable

Page 050 must not own:

- card processing
- bank transfer execution
- payment authorization
- refunds
- payout rails
- reconciliation
- payment provider logic

Clarify:

```text
Payment initiated != Payment successful
Payment successful != Funds reconciled
```

Do not create Page 051 logic inside Page 050.

---

## 9. Accounting Boundary

Page 050 must not own:

- general ledger
- journal entries
- accounts receivable ledger
- revenue recognition
- bank reconciliation
- financial statements
- chart of accounts

It may only hand off governed invoice records to future accounting workflows.

Clarify:

```text
Invoice exported != Accounting posted
Invoice issued != Revenue recognized
Payment status != Bank reconciliation
```

---

## 10. Tax Boundary

Page 050 may display configured tax lines where already governed.

It must not:

- determine tax residency
- calculate employer remittances
- file taxes
- issue tax slips
- infer tax exemptions
- hardcode jurisdictional tax rules

Clarify:

```text
Tax displayed != Tax filed
Tax estimate != Final tax obligation
```

Currency, tax configuration, invoice policy, locale, due-date rules, tax terminology, and jurisdiction remain configurable.

---

## 11. Permissions

Represent role-based access for:

- organization owner
- finance manager
- authorized residence manager
- billing administrator
- read-only auditor
- support where governed

Clarify:

```text
Residence manager != Payment authority
Invoice visibility != Invoice modification authority
```

Permission states should distinguish:

- may view invoice
- may request correction
- may issue invoice where authorized
- may export invoice
- may view audit summary
- may not access payment execution
- may not access worker-private financial data

---

## 12. Privacy

Display only minimum necessary financial information.

Do not expose:

- worker banking information
- tax identifiers
- private payroll deductions
- health information
- complaints
- investigations
- unrelated employment history
- full payment credentials
- provider secrets
- unrestricted internal accounting notes

Separate:

```text
Employer-visible invoice information
Platform-only billing review information
Worker-private information
Internal accounting information
```

Only employer-visible invoice information may appear in this employer invoice view.

---

## 13. Auditability

Conceptually preserve:

- invoice generated
- invoice reviewed
- invoice issued
- correction requested
- correction completed
- dispute opened
- status updated
- voided
- archived

Include:

- actor
- role
- timestamp
- invoice reference
- prior state
- resulting state
- reason
- source record reference

Prior versions must not be erased.

---

## 14. AI Boundary

AI may:

- summarize invoice status
- identify missing invoice fields
- explain invoice states
- draft correction or dispute messages
- suggest navigation

AI must never:

- issue invoices
- void invoices
- approve corrections
- calculate final taxes
- execute payments
- reconcile funds
- fabricate amounts
- alter approved source records

Clarify:

```text
AI invoice summary != Financial approval
AI correction draft != Final invoice change
AI missing-field flag != Invoice rejection
```

---

## 15. Empty and Error States

Include:

- no invoices
- invoice generation pending
- source record unavailable
- correction pending
- dispute pending
- payment status unavailable
- tax configuration unavailable
- export unavailable
- service unavailable
- stale invoice data

Do not fabricate financial success.

---

## 16. Mobile Design

Prioritize:

- invoice reference
- status
- total
- issue and due dates
- source timesheet
- correction status
- dispute status
- payment handoff
- export or download
- support path
- large touch targets
- clear overdue and unavailable states

Mobile must answer first:

```text
What invoice needs attention?
What is its status?
What approved work is it based on?
Is correction or dispute active?
Where does payment continue?
```

---

## 17. Desktop Design

Use:

- invoice list
- filters
- invoice detail
- source references
- totals and tax summary
- status history
- correction panel
- dispute panel
- payment-status handoff
- audit summary

Do not expose sensitive financial data in persistent side panels.

---

## 18. Accessibility

Review:

- semantic financial headings
- keyboard navigation
- screen-reader-friendly status labels
- no color-only overdue or paid states
- readable currency and dates
- accessible tables
- accessible correction and dispute actions
- focus management
- plain-language errors
- sufficient contrast

---

## 19. International Readiness

Do not hardcode:

- currency
- tax model
- invoice numbering
- due-date rules
- decimal format
- date format
- language
- billing entity
- tax terminology
- payment terms
- correction rules
- retention period

Keep jurisdiction, organization, residence, currency, tax configuration, locale, and invoice policy configurable.

---

## 20. Validation

Confirmed:

- Frozen title remains Invoices.
- Pages 001-049 remain unchanged.
- Page 051 remains Payments.
- No Page 051 files created.
- No implementation started.
- No React created.
- No frontend created.
- No backend created.
- No APIs created.
- No database changes created.
- No invoice engine created.
- No payment implementation created.
- No accounting implementation created.
- No tax implementation created.
- No AI automation created.

---

## 21. Final Status

```text
Page 050 — Invoices
Wireframe Revision 1: COMPLETE
Recommendation: APPROVED WIREFRAME v1.0

Page 051 — Payments
UNBLOCKED
NOT CREATED
```
