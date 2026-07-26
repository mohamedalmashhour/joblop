# Resident Job

## Page 048 - Attendance

**Status:** Low-Fidelity Wireframe Complete  
**Owner Review:** Required  
**Approval Record:** Not Created  
**Implementation:** Not Started  
**Page 049:** Blocked

---

## 1. Purpose

Page 048 designs the authenticated employer Attendance experience.

The page is responsible for presenting and governing attendance records for an assigned shift.

This page may allow authorized users to:

- view attendance status
- view check-in status
- view check-out status
- identify attendance exceptions
- initiate attendance review
- hand off to timesheet workflows

This page must not:

- determine payroll
- approve payroll
- calculate worked wages
- adjudicate disputes
- replace timesheets
- replace live tracking
- assign workers
- modify assignment decisions
- verify qualifications
- automatically approve attendance
- automatically reject attendance
- use AI to determine attendance outcomes

---

## 2. Primary Users

Authorized employer-side users with permission to review attendance context:

- organization owner
- residence manager
- department manager
- scheduler
- operations manager
- authorized support
- read-only observer where permitted

Role and organization context determine whether a user may review, comment, escalate, or only view attendance records.

---

## 3. Attendance Lifecycle

Represent attendance lifecycle states independently:

- scheduled
- not started
- check-in available
- checked in
- in progress
- check-out available
- checked out
- attendance review required
- attendance approved
- attendance rejected
- attendance unavailable

Clarify:

```text
Checked in != Worked full shift
Checked out != Approved attendance
Approved attendance != Payroll complete
```

Do not collapse attendance into one generic completed state.

---

## 4. Source of Truth

Attendance is the authoritative operational record only.

Attendance is not authoritative for:

- payroll
- billing
- compensation
- disputes
- performance evaluation
- employment status

Clarify:

```text
Attendance != Compensation
Attendance != Performance
Attendance != Worker discipline
```

---

## 5. Attendance Evidence

Conceptually distinguish attendance evidence types:

- manual confirmation
- system event
- governed location event
- supported timestamp
- supporting documentation
- pending review

Clarify:

```text
Evidence available != Attendance approved
Missing evidence != Attendance denied
```

Evidence must be visible as context, not treated as automatic outcome.

---

## 6. Exception Handling

Represent attendance exceptions:

- late arrival
- missed check-in
- missed check-out
- incomplete attendance
- conflicting evidence
- manual review required
- attendance unavailable

Clarify:

```text
Late != Absent
Missing check-out != Misconduct
Incomplete attendance != Payroll decision
```

Exceptions should route to review, clarification, or support, not automatic penalty.

---

## 7. Review Workflow

Attendance review should support:

- employer review
- worker clarification
- support escalation
- compliance review where governed
- final attendance outcome

Review statuses:

- no review required
- review pending
- clarification requested
- worker response received
- support review
- compliance review
- attendance approved
- attendance rejected
- reopened
- closed

Do not resolve disputes automatically.

---

## 8. Privacy

Display only minimum necessary attendance information.

Do not expose:

- health information
- disciplinary history
- banking information
- tax information
- private complaints
- investigation records
- unrelated employment history

Attendance view should separate:

```text
Employer-visible attendance context
Platform-only review context
Worker-private information
```

Only employer-visible attendance context may appear on Page 048.

---

## 9. Auditability

Conceptually preserve:

- attendance created
- attendance modified
- attendance reviewed
- attendance approved
- attendance rejected
- attendance reopened

Include:

- actor
- role
- timestamp
- prior state
- resulting state
- reason where applicable

Auditability is conceptual at the wireframe stage. No audit implementation is introduced.

---

## 10. AI Boundary

AI may:

- summarize attendance status
- explain attendance states
- identify missing information
- draft clarification requests

AI must never:

- approve attendance
- reject attendance
- calculate worked hours
- calculate payroll
- determine misconduct
- fabricate attendance evidence

Clarify:

```text
AI summary != Attendance decision
AI missing-information flag != Rejection
AI clarification draft != Final review outcome
```

---

## 11. Page Boundary

Page 048 owns:

```text
Attendance
```

It must not own:

- assignment
- live tracking
- timesheets
- payroll
- billing
- payments
- dispute adjudication

Page 048 may provide only a governed handoff to the next workflow.

Exact frozen Page 049 title:

```text
Page 049 — Approve Timesheet
```

Source:

- `docs/architecture/resident-job-platform/wireframes/DESIGN_STATUS_MATRIX.md`

---

## 12. Information Architecture

### Desktop Structure

```text
Employer Shell
├── Header
│   ├── Attendance
│   ├── Shift reference
│   ├── Worker assignment reference
│   ├── Attendance lifecycle state
│   └── Source-of-truth notice
│
├── Primary attendance panel
│   ├── Scheduled time
│   ├── Check-in state
│   ├── Check-out state
│   ├── Attendance review state
│   ├── Exception state
│   └── Next action
│
├── Evidence panel
│   ├── System event
│   ├── Governed location event
│   ├── Manual confirmation
│   ├── Supporting documentation
│   └── Pending review
│
├── Review workflow panel
│   ├── Employer review
│   ├── Worker clarification
│   ├── Support escalation
│   ├── Compliance review where governed
│   └── Final attendance outcome
│
├── Right governance panel
│   ├── Attendance boundary
│   ├── Evidence truthfulness
│   ├── Privacy notice
│   ├── AI limitations
│   ├── Auditability
│   └── Page 049 handoff
│
└── Footer actions
    ├── Request Clarification
    ├── Escalate to Support
    ├── Open Live Shift Tracking
    ├── Open Assigned Worker
    └── Continue to Approve Timesheet
```

### Mobile Structure

```text
Attendance
├── Shift and worker summary
├── Attendance lifecycle state
├── Check-in status
├── Check-out status
├── Exception notice
├── Evidence summary
├── Review workflow status
├── Next action
├── Privacy / AI boundary
└── Approve Timesheet handoff
```

Mobile must answer first:

```text
What is the attendance state?
Is anything missing or conflicting?
Does this require review?
What can the employer do next?
Where does timesheet approval continue?
```

---

## 13. Empty and Error States

Represent:

- no assigned worker
- shift not started
- attendance unavailable
- check-in missing
- check-out missing
- conflicting evidence
- evidence unavailable
- review required
- support unavailable
- permission denied
- source-of-truth unavailable

Do not fabricate attendance evidence.

---

## 14. Accessibility

Review:

- semantic status labels
- keyboard navigation
- screen-reader-friendly attendance state
- no color-only attendance or exception states
- readable timestamps
- clear review-action labels
- focus management
- sufficient contrast
- plain-language exception messages
- accessible evidence summary

---

## 15. International Readiness

Do not hardcode:

- attendance law
- payroll rule
- billing rule
- time format
- timezone
- break policy
- overtime rule
- employment model
- evidence requirement
- dispute process
- compliance procedure

Keep jurisdiction, organization, residence, department, role, shift, time, locale, evidence policy, and review procedure configurable.

---

## 16. Validation

Confirmed:

- Pages 001-047 remain unchanged.
- Exact Page 049 frozen title identified as Approve Timesheet.
- No Page 049 files created.
- No approval record created.
- No implementation started.
- No React created.
- No frontend created.
- No backend created.
- No APIs created.
- No database changes created.
- No attendance engine created.
- No payroll implementation created.
- No billing implementation created.
- No AI automation created.

---

## 17. Final Status

```text
Page 048 — Attendance
Wireframe: COMPLETE
Product Review: PENDING
Approval Record: NOT CREATED
Owner Review: REQUIRED

Page 049 — Approve Timesheet
BLOCKED
```
