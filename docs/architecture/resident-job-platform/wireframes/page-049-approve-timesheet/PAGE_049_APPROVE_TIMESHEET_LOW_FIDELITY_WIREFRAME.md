# Resident Job

## Page 049 - Approve Timesheet

**Status:** Low-Fidelity Wireframe Complete  
**Owner Review:** Required  
**Approval Record:** Not Created  
**Implementation:** Not Started  
**Page 050:** Blocked

---

## 1. Purpose

Page 049 designs the authenticated employer Approve Timesheet experience.

This page governs managerial review and approval of completed timesheets after attendance has been finalized.

This page may allow authorized users to:

- review submitted timesheets
- compare attendance summary with timesheet entries
- approve a timesheet
- reject a timesheet with a governed reason
- return a timesheet for clarification
- escalate for review
- hand off approved records to payroll

This page must not:

- calculate payroll
- calculate taxes
- issue payments
- generate invoices
- modify attendance history
- modify assignment history
- determine worker compensation
- resolve employment disputes
- automatically approve timesheets
- use AI to approve or reject timesheets

---

## 2. Primary Users

Authorized employer users with timesheet review permissions:

- organization owner
- residence manager
- department manager
- scheduler
- operations manager
- authorized finance reviewer where permitted
- read-only observer where permitted

Role and organization context determine whether the user may approve, reject, request clarification, escalate, or only view the timesheet.

---

## 3. Timesheet Lifecycle

Represent timesheet lifecycle states independently:

- not submitted
- submitted
- under review
- clarification requested
- resubmitted
- approved
- rejected
- escalated
- archived

Clarify:

```text
Submitted != Approved
Approved != Payroll processed
Rejected != Worker misconduct
```

Do not collapse timesheet approval into payroll, billing, payment, or discipline.

---

## 4. Source-of-Truth Boundary

Page 049 owns only timesheet approval.

It must not own:

- attendance
- assignment
- payroll
- billing
- payments
- accounting
- taxation

Clarify:

```text
Approved timesheet != Payroll complete
Approved timesheet != Payment issued
Approved timesheet != Invoice generated
```

---

## 5. Review Workflow

Represent:

- manager review
- clarification request
- worker response
- resubmission
- approval
- rejection
- escalation

Clarify:

```text
Review started != Approved
Clarification requested != Rejected
Escalated != Dispute resolved
Approved != Paid
```

Do not resolve disputes automatically.

---

## 6. Attendance Comparison

The page may compare the submitted timesheet against attendance summary.

Show only governed context:

- scheduled shift
- attendance state
- check-in summary
- check-out summary
- approved attendance outcome
- exception markers
- worker-entered timesheet entries
- review notes

Clarify:

```text
Attendance summary != Timesheet approval
Timesheet entry != Payroll calculation
Exception marker != Worker misconduct
```

Page 049 must not modify attendance history.

---

## 7. Privacy

Display only minimum necessary information.

Do not expose:

- banking details
- tax records
- health information
- private complaints
- investigation notes
- unrelated employment history

Timesheet review should separate:

```text
Employer-visible review information
Platform-only review information
Worker-private information
```

Only employer-visible review information may appear on Page 049.

---

## 8. Auditability

Conceptually preserve:

- submission
- review started
- clarification requested
- resubmission
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

## 9. AI Boundary

AI may:

- summarize timesheet status
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

## 10. Page Boundary

Page 049 owns:

```text
Approve Timesheet
```

It must not own:

- attendance record
- assignment
- payroll
- billing
- payments
- accounting
- taxation
- invoices

Exact frozen Page 050 title:

```text
Page 050 — Invoices
```

Source:

- `docs/architecture/resident-job-platform/wireframes/DESIGN_STATUS_MATRIX.md`

Prepare only a governed handoff to the next workflow. Do not introduce payroll or payment logic.

---

## 11. Information Architecture

### Desktop Structure

```text
Employer Shell
├── Header
│   ├── Approve Timesheet
│   ├── Shift reference
│   ├── Worker reference
│   ├── Timesheet lifecycle state
│   └── Source-of-truth notice
│
├── Primary timesheet panel
│   ├── Submitted timesheet entries
│   ├── Submitted hours summary
│   ├── Breaks / adjustments where governed
│   ├── Review state
│   └── Next governed action
│
├── Attendance comparison panel
│   ├── Attendance outcome
│   ├── Check-in summary
│   ├── Check-out summary
│   ├── Exception markers
│   └── Review notes
│
├── Review workflow panel
│   ├── Manager review
│   ├── Clarification request
│   ├── Worker response
│   ├── Resubmission
│   ├── Approval
│   ├── Rejection
│   └── Escalation
│
├── Right governance panel
│   ├── Timesheet approval boundary
│   ├── Payroll boundary
│   ├── Privacy notice
│   ├── Auditability
│   ├── AI limitations
│   └── Page 050 handoff
│
└── Footer actions
    ├── Request Clarification
    ├── Approve Timesheet
    ├── Reject With Reason
    ├── Escalate for Review
    ├── Open Attendance
    └── Continue to Invoices
```

### Mobile Structure

```text
Approve Timesheet
├── Shift and worker summary
├── Timesheet lifecycle state
├── Submitted hours summary
├── Attendance comparison
├── Exception or clarification notice
├── Review action group
├── Privacy / AI boundary
└── Invoices handoff
```

Mobile must answer first:

```text
What is the timesheet state?
Does it match attendance context?
Is clarification required?
What decision can the employer make?
Where does invoicing continue?
```

---

## 12. Empty and Error States

Represent:

- no submitted timesheet
- attendance unavailable
- timesheet incomplete
- conflicting attendance context
- clarification pending
- worker response pending
- approval unavailable
- permission denied
- source-of-truth unavailable
- support unavailable

Do not fabricate worked hours or approval status.

---

## 13. Accessibility

Review:

- semantic status labels
- keyboard navigation
- screen-reader-friendly timesheet state
- no color-only approval or exception states
- readable timestamps
- clear approval/rejection labels
- focus management
- sufficient contrast
- accessible comparison summary
- plain-language rejection and clarification reasons

---

## 14. International Readiness

Do not hardcode:

- payroll law
- tax rule
- overtime rule
- break policy
- invoice rule
- accounting rule
- employment model
- dispute process
- time format
- timezone
- currency handling

Keep jurisdiction, organization, residence, department, role, shift, locale, time, currency, payroll policy, and review procedure configurable.

---

## 15. Validation

Confirmed:

- Pages 001-048 remain unchanged.
- Exact Page 050 frozen title identified as Invoices.
- No Page 050 files created.
- No approval record created.
- No implementation started.
- No React created.
- No frontend created.
- No backend created.
- No APIs created.
- No database changes created.
- No payroll implementation created.
- No billing implementation created.
- No AI automation created.

---

## 16. Final Status

```text
Page 049 — Approve Timesheet
Wireframe: COMPLETE
Product Review: PENDING
Approval Record: NOT CREATED
Owner Review: REQUIRED

Page 050 — Invoices
BLOCKED
```
