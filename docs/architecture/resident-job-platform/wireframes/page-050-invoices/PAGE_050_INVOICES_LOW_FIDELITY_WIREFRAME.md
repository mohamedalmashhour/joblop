# Resident Job

## Page 050 - Invoices

**Status:** Low-Fidelity Wireframe Complete  
**Owner Review:** Required  
**Approval Record:** Not Created  
**Implementation:** Not Started  
**Page 051:** Blocked

---

## 1. Purpose

Page 050 designs the authenticated employer Invoices experience.

Page 050 owns invoice lifecycle management only. It begins after approved timesheet outputs are available and prepares a governed handoff to future payment workflows.

This page may include governed workflows such as:

- invoice generation from approved timesheets
- invoice review
- invoice status
- invoice corrections
- invoice history
- invoice export
- handoff to payment workflows

This page must not own:

- attendance
- timesheet approval
- payroll calculations
- payment execution
- accounting ledger
- taxation engine
- collections
- financial reporting

Those belong to future pages or separate governed systems.

---

## 2. Primary Users

Authorized employer-side users with invoice visibility or review permissions:

- organization owner
- billing administrator
- finance reviewer
- residence manager where permitted
- department manager where permitted
- read-only observer where permitted
- platform support where authorized

Role and organization context determine whether the user may view, review, request correction, export, or hand off an invoice.

---

## 3. Invoice Lifecycle

Represent invoice lifecycle states independently:

- not generated
- draft generated
- under review
- correction requested
- corrected
- issued
- sent
- viewed
- disputed
- voided
- archived

Clarify:

```text
Approved timesheet != Invoice generated
Draft invoice != Issued invoice
Issued invoice != Payment completed
Disputed invoice != Collection action
```

Do not collapse invoice lifecycle into payment, accounting, or collections.

---

## 4. Source-of-Truth Boundary

Page 050 owns:

```text
Invoices
```

Page 050 does not own:

- attendance
- timesheet approval
- payroll
- payment execution
- accounting ledger
- tax calculation
- collections
- financial reporting

Clarify:

```text
Invoice amount != Payment received
Invoice issued != Accounting posted
Invoice exported != Tax filing completed
```

---

## 5. Invoice Inputs

Invoice generation may use governed inputs:

- approved timesheet outcome
- employer billing profile
- organization or residence billing contact
- approved rate context
- approved adjustments
- invoice period
- billing policy
- invoice template or format

Clarify:

```text
Approved timesheet input != Payroll calculation
Approved adjustment != Tax decision
Invoice period != Payment schedule
```

Page 050 must not recalculate attendance, timesheets, worker compensation, payroll, taxes, or payments.

---

## 6. Invoice Review

Invoice review may show:

- invoice number placeholder
- invoice period
- employer organization
- residence or department context
- shift references
- approved timesheet references
- approved adjustments
- subtotal summary
- taxes or fees placeholder where governed
- status
- review notes

Do not expose:

- worker banking information
- worker tax records
- payroll calculations
- internal pricing formulas
- accounting ledger entries
- payment credentials

---

## 7. Corrections and Disputes

Represent:

- correction requested
- correction under review
- corrected draft
- dispute opened
- dispute under review
- dispute resolved
- voided
- reissued

Clarify:

```text
Correction requested != Invoice voided
Dispute opened != Payment stopped automatically
Reissued invoice != Payment completed
```

Page 050 may route corrections and disputes to governed review. It must not adjudicate legal, accounting, payroll, or payment disputes automatically.

---

## 8. Export Boundary

Invoice export may include:

- PDF export
- CSV export
- accounting-ready export placeholder
- share/send action placeholder
- download history

Clarify:

```text
Exported invoice != Accounting posted
Downloaded invoice != Paid
Sent invoice != Viewed
```

No external accounting integration is implemented.

---

## 9. Payment Handoff Boundary

Page 050 may provide a governed handoff to the next workflow.

Exact frozen Page 051 title:

```text
Page 051 — Payments
```

Source:

- `docs/architecture/resident-job-platform/wireframes/DESIGN_STATUS_MATRIX.md`
- `docs/architecture/resident-job-platform/pages/PAGE_051_PAYMENTS.md`

Clarify:

```text
Invoice issued != Payment scheduled
Payment scheduled != Payment received
Payment received != Accounting reconciled
```

Page 050 must not execute, authorize, reverse, settle, or reconcile payments.

---

## 10. Privacy and Least Privilege

Display only minimum necessary invoice information.

Do not expose:

- worker banking information
- worker tax records
- private complaints
- investigation notes
- payroll-only details
- payment credentials
- internal accounting notes
- unrelated employer financial data

Invoice visibility should separate:

```text
Employer-visible invoice information
Platform-only billing review information
Worker-private information
Internal accounting information
```

Only employer-visible invoice information may appear in this employer invoice view.

---

## 11. Auditability

Conceptually preserve:

- invoice generated
- invoice reviewed
- correction requested
- corrected
- issued
- sent
- exported
- disputed
- voided
- reissued
- archived

Include:

- actor
- role
- timestamp
- prior state
- resulting state
- reason where applicable
- invoice reference

No audit implementation is introduced.

---

## 12. AI Boundary

AI may:

- summarize invoice status
- explain invoice lifecycle states
- identify missing invoice information
- draft clarification or correction messages
- suggest where to navigate next

AI must never:

- generate final invoice amounts autonomously
- approve invoices
- issue invoices
- execute payments
- calculate taxes
- post accounting entries
- start collections
- fabricate invoice records
- expose restricted financial data

Clarify:

```text
AI invoice summary != Financial approval
AI missing-information flag != Invoice rejection
AI correction draft != Final invoice change
```

---

## 13. Information Architecture

### Desktop Structure

```text
Employer Shell
├── Header
│   ├── Invoices
│   ├── Organization / residence context
│   ├── Invoice lifecycle state
│   └── Source-of-truth notice
│
├── Invoice list / summary
│   ├── Invoice reference
│   ├── Invoice period
│   ├── Status
│   ├── Amount summary placeholder
│   ├── Due / issue date placeholder where governed
│   └── Action state
│
├── Invoice detail panel
│   ├── Approved timesheet references
│   ├── Shift references
│   ├── Approved adjustment summary
│   ├── Review notes
│   ├── Correction / dispute state
│   └── Export history
│
├── Review and correction panel
│   ├── Review status
│   ├── Correction requested
│   ├── Corrected draft
│   ├── Dispute state
│   └── Reissue / void status
│
├── Right governance panel
│   ├── Invoice ownership
│   ├── Timesheet handoff boundary
│   ├── Payment boundary
│   ├── Tax / accounting boundary
│   ├── Privacy
│   ├── Auditability
│   └── AI limitations
│
└── Footer actions
    ├── Review Invoice
    ├── Request Correction
    ├── Export Invoice
    ├── View History
    ├── Open Approved Timesheet
    └── Continue to Payments
```

### Mobile Structure

```text
Invoices
├── Invoice status summary
├── Invoice list item / selected invoice
├── Invoice period and amount summary placeholder
├── Approved timesheet references
├── Correction / dispute status
├── Export action
├── Privacy / AI boundary
└── Payments handoff
```

Mobile must answer first:

```text
What invoice needs attention?
What is its status?
What approved work is it based on?
Is correction or dispute active?
Where does payment continue?
```

---

## 14. Empty and Error States

Represent:

- no invoices yet
- no approved timesheets available
- draft generation unavailable
- invoice under review
- correction requested
- dispute active
- export unavailable
- permission denied
- source-of-truth unavailable
- payment handoff unavailable

Do not fabricate invoice records.

---

## 15. Accessibility

Review:

- semantic invoice status labels
- keyboard navigation
- screen-reader-friendly table/list summaries
- no color-only invoice statuses
- readable dates and currency placeholders
- clear correction/dispute labels
- focus management
- sufficient contrast
- accessible export actions
- plain-language payment boundary

---

## 16. International Readiness

Do not hardcode:

- tax rule
- invoice law
- accounting standard
- payment term
- currency
- date format
- timezone
- invoice numbering model
- collections procedure
- financial reporting model
- retention period

Keep jurisdiction, organization, residence, department, locale, currency, invoice template, tax handling, issue date rules, due date rules, and retention configurable.

---

## 17. Validation

Confirmed:

- Pages 041-049 remain unchanged.
- Exact Page 051 frozen title identified as Payments.
- No Page 051 files created.
- No approval record created.
- No implementation started.
- No React created.
- No frontend created.
- No backend created.
- No APIs created.
- No database changes created.
- No invoice engine created.
- No payment implementation created.
- No accounting implementation created.
- No taxation implementation created.
- No AI automation created.

---

## 18. Final Status

```text
Page 050 — Invoices
Wireframe: COMPLETE
Product Review: PENDING
Approval Record: NOT CREATED
Owner Review: REQUIRED

Page 051 — Payments
BLOCKED
```
