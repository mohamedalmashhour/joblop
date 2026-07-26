# Resident Job

## Page 048 - Attendance Wireframe Revision 1

**Status:** Approved Wireframe Candidate  
**Revision Scope:** Controlled Revision 1  
**Original Wireframe:** `PAGE_048_ATTENDANCE_LOW_FIDELITY_WIREFRAME.md`  
**Implementation:** Not Started  
**Page 049:** Unblocked after approval, not created

---

## 1. Summary of Revision

Revision 1 strengthens Page 048 in the owner-approved areas:

- attendance lifecycle governance
- attendance evidence boundaries
- exception handling
- attendance review workflow
- privacy
- auditability
- AI boundaries
- separation from payroll and timesheets
- readiness for Page 049 - Approve Timesheet

No redesign was introduced. Page 048 remains Attendance only.

---

## 2. Attendance Lifecycle Governance

Attendance lifecycle states must remain independent:

- scheduled
- check-in available
- checked in
- in progress
- check-out available
- checked out
- review required
- approved
- rejected
- unavailable

Clarify:

```text
Checked in != Worked full shift
Checked out != Attendance approved
Attendance approved != Timesheet approved
Timesheet approved != Payroll complete
```

Attendance state must not collapse into timesheet approval, payroll, billing, or compensation.

---

## 3. Attendance Evidence Boundaries

Represent evidence types separately:

- manual confirmation
- system event
- governed location event
- timestamp
- supporting documentation
- review pending
- conflicting evidence

Clarify:

```text
Evidence available != Attendance approved
Missing evidence != Attendance denied
Location event != Proof of work performed
```

Evidence is context for review. It is not an automatic attendance outcome.

---

## 4. Attendance Exceptions

Represent:

- late arrival
- early departure
- missed check-in
- missed check-out
- incomplete attendance
- conflicting evidence
- manual review required
- unavailable

Clarify:

```text
Late != Absent
Missed check-out != Misconduct
Incomplete attendance != Payroll denied
```

Exceptions must route to governed review, clarification, support, or compliance where applicable.

---

## 5. Review Workflow

Represent review states:

- employer review
- worker clarification
- support review
- compliance review where governed
- final attendance outcome

Clarify:

```text
Review started != Attendance approved
Clarification requested != Attendance rejected
```

The review workflow must not automatically resolve disputes.

---

## 6. Source-of-Truth Boundary

Attendance owns only the operational attendance record.

Attendance must not own:

- assignment
- live tracking
- timesheet approval
- payroll
- billing
- compensation
- disputes

Clarify:

```text
Attendance != Compensation
Attendance != Performance evaluation
Attendance != Worker discipline
```

---

## 7. Privacy

Display only minimum necessary attendance information.

Never expose:

- health information
- banking information
- tax information
- private complaints
- investigation notes
- disciplinary history
- unrelated employment records

Employer-visible attendance context must remain separate from platform-only review context and worker-private information.

---

## 8. Auditability

Conceptually preserve:

- attendance created
- attendance updated
- review started
- clarification requested
- approved
- rejected
- reopened

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

- summarize attendance status
- explain workflow states
- identify missing information
- draft clarification requests

AI must never:

- approve attendance
- reject attendance
- determine misconduct
- calculate hours
- calculate payroll
- fabricate attendance evidence

Clarify:

```text
AI summary != Attendance decision
AI missing-information flag != Rejection
AI clarification draft != Final review outcome
```

---

## 10. Page 049 Boundary

Page 048 owns:

```text
Attendance
```

Page 049 owns:

```text
Approve Timesheet
```

Attendance may hand off only governed attendance outcomes.

Do not introduce:

- timesheet approval
- payroll review
- worked-hour approval
- compensation calculations

---

## 11. Revised Wireframe Structure

### Desktop

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
│   ├── Scheduled state
│   ├── Check-in status
│   ├── Check-out status
│   ├── Review required state
│   ├── Approved / rejected / unavailable state
│   └── Next governed action
│
├── Evidence governance panel
│   ├── Manual confirmation
│   ├── System event
│   ├── Governed location event
│   ├── Timestamp
│   ├── Supporting documentation
│   ├── Review pending
│   └── Conflicting evidence
│
├── Exception and review panel
│   ├── Late arrival
│   ├── Early departure
│   ├── Missed check-in / checkout
│   ├── Worker clarification
│   ├── Support review
│   ├── Compliance review where governed
│   └── Final attendance outcome
│
├── Right governance panel
│   ├── Attendance boundary
│   ├── Evidence truthfulness
│   ├── Privacy
│   ├── Auditability
│   ├── AI limitations
│   └── Page 049 handoff
│
└── Footer actions
    ├── Request Clarification
    ├── Escalate to Support
    ├── Open Live Shift Tracking
    ├── Open Assigned Worker
    └── Continue to Approve Timesheet
```

### Mobile

```text
Attendance
├── Shift and worker summary
├── Attendance lifecycle state
├── Check-in / checkout status
├── Evidence summary
├── Exception notice
├── Review workflow status
├── Next governed action
├── Privacy / AI boundary
└── Approve Timesheet handoff
```

Mobile must answer first:

```text
What is the attendance state?
What evidence exists?
Is anything missing or conflicting?
Does this require review?
Where does timesheet approval continue?
```

---

## 12. Validation

Confirmed:

- Frozen title remains Attendance.
- Pages 001-047 remain unchanged.
- Page 049 remains Approve Timesheet.
- No Page 049 files created.
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

## 13. Final Status

```text
Page 048 — Attendance
Wireframe Revision 1: COMPLETE
Recommendation: APPROVED WIREFRAME v1.0

Page 049 — Approve Timesheet
UNBLOCKED
NOT CREATED
```
