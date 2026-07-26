# Resident Job

## Page 050 - Invoices Product Design Review Revision 1

**Reviewed Wireframe:** `PAGE_050_INVOICES_WIREFRAME_REVISION_1.md`  
**Status:** Review Revision 1 Complete  
**Recommendation:** Approve as Wireframe v1.0  
**Implementation:** Not Started  
**Page 051:** Payments unblocked, not created

---

## 1. Executive Summary

Revision 1 resolves the documented owner conditions for Page 050. The Invoices page now clearly governs invoice lifecycle, source-of-truth ownership, approved-timesheet handoff, correction and dispute handling, payment separation, accounting and tax boundaries, privacy, permissions, auditability, AI boundaries, and readiness for Page 051 - Payments.

The page remains an invoice lifecycle surface. It does not become attendance, timesheet approval, payroll, payment execution, accounting, taxation, collections, reporting, implementation, or AI automation.

The page is now suitable to freeze as **APPROVED WIREFRAME v1.0**.

---

## 2. Resolved Conditions

### Invoice Lifecycle

Resolved. Draft, generated, under review, issued, correction requested, corrected, partially paid, paid, overdue, disputed, voided, and archived remain independent.

Key boundaries:

```text
Generated != Issued
Issued != Paid
Paid != Reconciled
Disputed != Voided
```

### Approved-Timesheet Handoff

Resolved. Page 050 may create an invoice only from a governed approved record. Source timesheet approved, invoice generation pending, invoice generated, source discrepancy detected, correction required, and source unavailable remain separate.

Key boundaries:

```text
Timesheet approved != Invoice issued
Invoice generated != Source record may be silently changed
```

Page 050 cannot modify attendance history, timesheet history, approved hours, or approved source evidence.

### Invoice Source of Truth

Resolved. Page 050 owns only Invoices. It does not own attendance, timesheet approval, payment execution, payroll, accounting ledger, tax filing, or collections adjudication.

Key boundaries:

```text
Invoice total != Payment received
Payment received != Accounting reconciliation
```

### Invoice Contents

Resolved. The revision defines safe placeholders for invoice reference, organization, residence, billing period, approved timesheet references, service dates, worker role or service category, approved hours, approved rate, governed premiums, subtotal, tax lines where applicable, total, currency, issue date, due date, status, last updated, and correction history.

Unnecessary worker personal information and sensitive financial information remain excluded.

### Corrections

Resolved. Correction requested, review pending, corrected invoice prepared, corrected invoice issued, original preserved, correction rejected, and support required remain governed states.

Key boundaries:

```text
Correction requested != Original invoice deleted
Corrected invoice != Original history erased
```

Issued invoices must not be silently overwritten.

### Disputes

Resolved. Dispute opened, evidence requested, under review, resolved, unresolved, and closed remain governed statuses.

Key boundaries:

```text
Invoice disputed != Invoice invalid
Dispute opened != Payment automatically cancelled
```

Page 050 does not adjudicate legal, employment, payroll, accounting, collections, or payment disputes.

### Payment Boundary

Resolved. Page 051 fully owns Payments. Page 050 may show only high-level payment status and may not own card processing, bank transfer execution, payment authorization, refunds, payout rails, reconciliation, or payment provider logic.

Key boundaries:

```text
Payment initiated != Payment successful
Payment successful != Funds reconciled
```

### Accounting Boundary

Resolved. Page 050 does not own general ledger, journal entries, accounts receivable ledger, revenue recognition, bank reconciliation, financial statements, or chart of accounts.

Key boundaries:

```text
Invoice exported != Accounting posted
Invoice issued != Revenue recognized
Payment status != Bank reconciliation
```

### Tax Boundary

Resolved. Page 050 may display configured tax lines where already governed, but it cannot determine tax residency, calculate employer remittances, file taxes, issue tax slips, infer exemptions, or hardcode jurisdictional tax rules.

Key boundaries:

```text
Tax displayed != Tax filed
Tax estimate != Final tax obligation
```

### Privacy and Permissions

Resolved. The revision explicitly separates organization owner, finance manager, authorized residence manager, billing administrator, read-only auditor, and governed support roles.

Key boundaries:

```text
Residence manager != Payment authority
Invoice visibility != Invoice modification authority
```

Worker banking information, tax identifiers, private payroll deductions, health information, complaints, investigations, unrelated employment history, full payment credentials, provider secrets, and unrestricted internal accounting notes are excluded.

### Auditability

Resolved. Invoice generated, reviewed, issued, correction requested, correction completed, dispute opened, status updated, voided, and archived conceptually preserve actor, role, timestamp, invoice reference, prior state, resulting state, reason, and source record reference.

Prior versions are not erased.

### AI Boundary

Resolved. AI may summarize invoice status, identify missing invoice fields, explain states, draft correction or dispute messages, and suggest navigation.

AI cannot issue invoices, void invoices, approve corrections, calculate final taxes, execute payments, reconcile funds, fabricate amounts, or alter approved source records.

---

## 3. Scoring

| Category | Score | Revision 1 Assessment |
| --- | ---: | --- |
| Invoice lifecycle | 9.8 | Required lifecycle states are explicit and independent. |
| Approved-timesheet handoff | 9.8 | Governed source records cannot be silently changed. |
| Source-of-truth boundary | 9.8 | Page owns invoices only. |
| Invoice contents | 9.7 | Safe invoice placeholders are clear. |
| Correction governance | 9.8 | Corrections preserve original history. |
| Dispute governance | 9.7 | Disputes remain governed and non-automatic. |
| Payment separation | 9.9 | Page 051 fully owns Payments. |
| Accounting boundary | 9.8 | No ledger, journal, AR, or reconciliation ownership. |
| Tax boundary | 9.8 | Tax remains configured and non-jurisdictional. |
| Privacy | 9.8 | Sensitive worker and financial information is excluded. |
| Permissions | 9.7 | Role-based visibility and authority are explicit. |
| Auditability | 9.8 | Required invoice events preserve core audit metadata. |
| AI governance | 9.9 | AI cannot issue, void, pay, reconcile, or fabricate. |
| Accessibility | 9.6 | Status, tables, and actions can be accessible. |
| Mobile usability | 9.6 | Status-first invoice flow is clear. |
| International readiness | 9.8 | No hardcoded currency, tax, numbering, or due-date model. |
| Consistency with Pages 041-049 | 9.8 | Clean handoff from approved timesheets. |
| Readiness for Page 051 | 9.9 | Payments boundary is explicit. |

**Overall Score:** 9.8

---

## 4. Remaining Risks

No wireframe-blocking risks remain.

Future design and engineering work must still define:

- exact invoice permission model
- invoice number generation rules
- correction reason taxonomy
- dispute evidence rules
- source-timesheet handoff contract
- export format governance
- tax configuration source
- payment status source for Page 051
- audit retention rules

These are future implementation/governance concerns, not Page 050 wireframe defects.

---

## 5. Approval Criteria Assessment

| Criterion | Result |
| --- | --- |
| Invoice lifecycle is truthful | Pass |
| Approved source records cannot be silently changed | Pass |
| Corrections preserve history | Pass |
| Disputes remain governed | Pass |
| Page 051 fully owns payment execution | Pass |
| Accounting boundary remains clear | Pass |
| Tax boundary remains clear | Pass |
| Privacy is preserved | Pass |
| Permissions are explicit | Pass |
| Auditability is complete | Pass |
| AI cannot issue, void, pay, reconcile, or fabricate invoice data | Pass |
| No governance, privacy, financial, or compliance risks remain | Pass |

---

## 6. Recommendation

Approve Page 050 as:

```text
APPROVED WIREFRAME v1.0
```

Unblock Page 051 - Payments as the next controlled gate.

Do not create Page 051 during this task.

---

## 7. Validation

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

## 8. Final Status

```text
Page 050 — Invoices
Product Design Review Revision 1: COMPLETE
Recommendation: APPROVED WIREFRAME v1.0

Page 051 — Payments
UNBLOCKED
NOT CREATED
```
