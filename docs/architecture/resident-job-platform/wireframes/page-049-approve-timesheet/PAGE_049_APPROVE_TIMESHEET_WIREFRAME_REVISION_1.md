# Resident Job

## Page 049 - Approve Timesheet Wireframe Revision 1

**Status:** Approved Wireframe Candidate  
**Revision Scope:** Controlled Revision 1  
**Original Wireframe:** `PAGE_049_APPROVE_TIMESHEET_LOW_FIDELITY_WIREFRAME.md`  
**Implementation:** Not Started  
**Page 050:** Unblocked after approval, not created

---

## 1. Summary of Revision

Revision 1 strengthens Page 049 in the owner-approved areas:

- timesheet lifecycle governance
- reviewer authority
- attendance-to-timesheet boundary
- clarification workflow
- exception handling
- auditability
- privacy
- AI boundaries
- separation from invoicing and payroll
- readiness for Page 050 - Invoices

No redesign was introduced. Page 049 remains Approve Timesheet only.

---

## 2. Timesheet Lifecycle Governance

Represent timesheet lifecycle states independently:

- not submitted
- submitted
- under review
- clarification requested
- clarification received
- resubmitted
- approved
- rejected
- escalated
- archived

Clarify:

```text
Submitted != Approved
Approved != Invoice created
Invoice created != Payment completed
Rejected != Worker misconduct
```

Timesheet approval must not collapse into invoicing, payroll, payment, or discipline.

---

## 3. Reviewer Authority

Represent reviewer authority states separately:

- reviewer assigned
- review started
- awaiting clarification
- awaiting decision
- approved
- rejected
- escalated

Clarify:

```text
Reviewer assigned != Approval granted
Review opened != Approval implied
```

Only authorized users may approve, reject, request clarification, or escalate.

---

## 4. Attendance-to-Timesheet Boundary

Attendance remains the authoritative attendance record.

Page 049 may reference attendance but must never modify attendance.

Clarify:

```text
Attendance approved != Timesheet approved
Attendance discrepancy != Automatic rejection
```

Attendance context supports review. It does not make the timesheet decision.

---

## 5. Clarification Workflow

Represent:

- clarification requested
- worker response pending
- response received
- additional review
- final decision

Clarify:

```text
Clarification requested != Rejected
Worker response != Automatic approval
```

Clarification is a governed workflow, not a rejection shortcut.

---

## 6. Exception Handling

Represent:

- missing information
- conflicting information
- attendance mismatch
- manual review required
- escalation
- unavailable

Clarify:

```text
Mismatch != Fraud
Incomplete record != Payroll denial
```

Exceptions should route to clarification, review, or escalation without automatic penalty.

---

## 7. Source-of-Truth Boundary

Page 049 owns only:

```text
Timesheet Approval
```

It must not own:

- attendance
- payroll
- invoices
- accounting
- taxation
- payments

---

## 8. Privacy

Display only minimum necessary information.

Do not expose:

- banking
- taxation
- health
- investigations
- complaints
- disciplinary history
- unrelated employment history

Employer-visible review information must remain separate from platform-only review information and worker-private information.

---

## 9. Auditability

Conceptually preserve:

- submission
- review opened
- clarification requested
- clarification received
- approval
- rejection
- escalation
- archive

Include:

- actor
- role
- timestamp
- prior state
- resulting state
- reason

No audit implementation is introduced.

---

## 10. AI Boundary

AI may:

- summarize review status
- identify missing information
- draft clarification requests

AI must never:

- approve timesheets
- reject timesheets
- calculate payroll
- determine compensation
- fabricate worked hours

Clarify:

```text
AI summary != Timesheet decision
AI missing-information flag != Rejection
AI clarification draft != Approval outcome
```

---

## 11. Page 050 Boundary

Page 049 owns:

```text
Approve Timesheet
```

Page 050 owns:

```text
Invoices
```

Only an approved timesheet may be handed off.

Do not introduce:

- invoice generation
- accounting
- billing
- collections
- payment logic

---

## 12. Revised Wireframe Structure

### Desktop

```text
Employer Shell
├── Header
│   ├── Approve Timesheet
│   ├── Shift reference
│   ├── Worker reference
│   ├── Timesheet lifecycle state
│   └── Approval / invoice boundary notice
│
├── Primary review panel
│   ├── Submitted timesheet entries
│   ├── Timesheet lifecycle status
│   ├── Reviewer authority status
│   ├── Awaiting clarification state
│   └── Next governed action
│
├── Attendance comparison panel
│   ├── Attendance outcome reference
│   ├── Check-in / checkout summary
│   ├── Attendance discrepancy marker
│   ├── Exception marker
│   └── No-attendance-modification notice
│
├── Clarification and exception panel
│   ├── Missing information
│   ├── Conflicting information
│   ├── Worker response pending
│   ├── Response received
│   ├── Additional review
│   └── Escalation
│
├── Right governance panel
│   ├── Reviewer authority
│   ├── Attendance boundary
│   ├── Payroll boundary
│   ├── Invoice boundary
│   ├── Privacy
│   ├── Auditability
│   └── AI limitations
│
└── Footer actions
    ├── Request Clarification
    ├── Approve Timesheet
    ├── Reject With Reason
    ├── Escalate
    ├── Open Attendance
    └── Continue to Invoices
```

### Mobile

```text
Approve Timesheet
├── Shift and worker summary
├── Timesheet lifecycle state
├── Reviewer authority state
├── Submitted time summary
├── Attendance comparison
├── Clarification / exception state
├── Decision action group
├── Privacy / AI boundary
└── Invoices handoff
```

Mobile must answer first:

```text
Is the timesheet ready for review?
Who can approve it?
Does attendance context create a question?
Is clarification needed?
What happens after approval?
```

---

## 13. Validation

Confirmed:

- Frozen title remains Approve Timesheet.
- Pages 001-048 remain unchanged.
- Page 050 remains Invoices.
- No Page 050 files created.
- No implementation started.
- No React created.
- No frontend created.
- No backend created.
- No APIs created.
- No database changes created.
- No payroll implementation created.
- No invoicing implementation created.
- No AI automation created.

---

## 14. Final Status

```text
Page 049 — Approve Timesheet
Wireframe Revision 1: COMPLETE
Recommendation: APPROVED WIREFRAME v1.0

Page 050 — Invoices
UNBLOCKED
NOT CREATED
```
