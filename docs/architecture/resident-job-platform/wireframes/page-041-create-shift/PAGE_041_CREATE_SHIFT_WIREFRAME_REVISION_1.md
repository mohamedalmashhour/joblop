# Resident Job

## Page 041 - Create Shift Wireframe Revision 1

**Status:** Approved Wireframe Candidate  
**Revision Scope:** Controlled Revision 1  
**Original Wireframe:** `PAGE_041_CREATE_SHIFT_LOW_FIDELITY_WIREFRAME.md`  
**Implementation:** Not Started  
**Page 042:** Unblocked after approval, not created

---

## 1. Summary of Revision

Revision 1 strengthens the Create Shift wireframe in the specific areas approved by the owner:

- shift lifecycle governance
- publication governance
- employer authorization
- scheduling truthfulness
- staffing boundaries
- pricing boundaries
- qualification governance
- conflict detection
- auditability
- AI boundaries
- readiness for Page 042 - Recurring Shift

No redesign was introduced. Page 041 remains a single-shift creation page only.

---

## 2. Shift Lifecycle Governance

Page 041 must show the shift lifecycle as a governed sequence, not a single active status.

```text
Draft
↓
Validated Draft
↓
Approved Draft
↓
Publication Requested
↓
Published Shift
↓
Staffing Activity
↓
Staffed Shift
↓
Active Shift
↓
Completed Shift
↓
Downstream Attendance / Timesheet / Payroll Workflows
```

The wireframe must visibly clarify:

```text
Draft != Published
Published != Filled
Filled != Started
Started != Completed
Completed != Payroll Approved
```

### Status Area

```text
Shift Status Panel
├── Draft status: Saved / Unsaved / Save failed
├── Validation status: Pending / Valid / Correction required
├── Approval status: Not required / Required / Pending / Approved / Rejected
├── Publication status: Not published / Requested / Published / Failed
└── Staffing status: No applications / Applications received / Partially filled / Fully filled
```

These statuses remain independent. They must not collapse into one generic "Active" status.

---

## 3. Scheduling Truthfulness

The page owns scheduled terms only. It does not own attendance, timesheet approval, payroll, or payment.

```text
Scheduled duration
!= Expected duration
!= Worked duration
!= Approved duration
!= Payable duration
```

The date/time section must display a plain-language warning:

```text
Scheduled time is used to describe the planned shift.
Actual worked time is recorded later through attendance and timesheet workflows.
Approved payable time is determined outside this page.
```

Clarify:

```text
Scheduled != Worked
Worked != Approved
Approved != Paid
```

---

## 4. Staffing Boundary

Page 041 defines staffing requirements only.

It may define:

- required worker count
- minimum worker count where governed
- maximum worker count
- role needed
- visibility and application method
- whether employer review is required
- application deadline where governed

It must not:

- assign workers
- approve workers
- reject workers
- calculate staffing success
- guarantee fulfillment
- rank candidates
- create hidden worker exclusions

The staffing section must include:

```text
Quantity requested != Quantity filled.
Published shift != Worker assigned.
Worker application != Worker accepted.
Staffed shift != Attendance confirmed.
```

---

## 5. Pricing Boundary

Page 041 may show governed pricing inputs and summaries, but it must not become payroll, billing, invoice, margin, tax, or settlement logic.

Separate:

- worker rate
- employer estimate
- premium
- reimbursement
- travel allowance
- payroll result
- invoice result

The pricing summary must show:

```text
Worker-facing rate summary
- base rate source
- governed premiums
- travel or reimbursement notes where configured

Employer estimate summary
- estimate only
- final invoice determined downstream

Boundary note
Configured rate != Payroll.
Employer estimate != Invoice.
Premium != Guaranteed payment.
```

The page must not calculate:

- taxes
- deductions
- net pay
- final payroll
- final invoice
- platform margin
- settlement

---

## 6. Qualification Governance

The requirements section must represent these categories as governed configuration:

- licence
- certification
- background check
- training
- experience

Clarify:

```text
Requirement configured != Worker qualified.
Qualified != Assigned.
Assigned != Eligible for future shifts.
```

The page may define requirements for a shift, but final worker eligibility belongs to the eligibility, application, assignment, compliance, and document-review workflows.

No requirement should be presented as universal across all jurisdictions, departments, roles, or employers.

---

## 7. Conflict Detection

The wireframe must represent warnings for:

- duplicate shift
- overlapping shift
- inactive residence
- inactive department
- invalid schedule
- excessive staffing
- missing qualification
- publication conflict

Conflict panel:

```text
Warnings
├── Possible duplicate shift
├── Overlapping time window
├── Missing required qualification
├── Rate source missing
└── Publication conflict

Action guidance
Warnings are advisory unless governed rules require blocking.
```

Clarify:

```text
Warning != Automatic rejection.
Warning resolved != Published.
No warning != Guaranteed fulfillment.
```

---

## 8. Publication Governance

Publication must remain separate from saving, validation, and approval.

Represent:

- validation
- review
- approval
- publication request
- publication success
- publication failure

Publish panel:

```text
Before publication:
[ ] Shift details reviewed
[ ] Requirements reviewed
[ ] Rate / estimate reviewed
[ ] Visibility reviewed
[ ] Authorized user confirmation

Actions:
[Save Draft]
[Request Approval]
[Submit Publication Request]
[Publish Shift] only when permitted
```

Clarify:

```text
Saved != Published.
Validated != Published.
Approved != Published.
Publish clicked != Publication succeeded.
```

The page must not silently publish on save.

---

## 9. Employer Authorization

The page must show conceptual permission checks without implementing authorization logic.

Role distinction:

```text
Dashboard access != Shift creation authority.
Department visibility != Publication authority.
Scheduler != Rate override authority.
Finance access != Worker assignment authority.
Compliance access != Staffing authority.
```

If the current user cannot publish, the page may show:

```text
You can save this draft, but publication requires an authorized user.
```

---

## 10. Auditability

Revision 1 strengthens the conceptual audit trail.

Audit must preserve:

- draft creation
- edits
- publication
- cancellation
- pricing changes
- qualification changes

Each audit entry conceptually includes:

- actor
- role
- timestamp
- action
- shift reference
- prior state
- resulting state

Optional where applicable:

- requested state
- reason
- result
- staff-assisted correction flag

Audit records must not contain resident or patient information.

---

## 11. AI Boundary

AI may:

- summarize the draft
- explain requirements
- identify missing fields
- suggest wording
- identify visible conflicts
- explain status terminology

AI must never:

- publish shifts
- assign workers
- determine pricing
- approve qualifications
- alter staffing
- guarantee fulfillment
- determine compliance
- rank or reject applicants
- bypass employer authorization

AI output must appear as advisory help, not as operational state.

---

## 12. Page 042 Boundary

Page 041 owns single shift creation only.

Page 042 owns:

- recurrence rules
- recurring series
- future occurrences
- recurrence exceptions

Page 041 must not introduce recurrence controls, series editing, occurrence generation, exception management, or recurring-shift conflict resolution.

The only acceptable Page 042 handoff is a future navigation reference such as:

```text
Need repeated coverage?
Recurring Shift is a separate governed workflow.
```

No recurring-shift functionality is introduced in Page 041.

---

## 13. Revised Low-Fidelity Screen Structure

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ Create Shift                                                               │
│ Single shift draft. Publishing requires validation and authorization.        │
├───────────────────────────────────────────────┬─────────────────────────────┤
│ Step Workflow                                  │ Governance Panel            │
│                                               │                             │
│ 1. Organization / Residence / Department       │ Lifecycle                   │
│ 2. Worker Role                                 │ Draft: Saved                │
│ 3. Date, Time, Break, Arrival                  │ Validation: Pending         │
│ 4. Staffing Quantity                           │ Approval: Required          │
│ 5. Rate and Estimate                           │ Publication: Not published  │
│ 6. Qualification Requirements                  │ Staffing: No applications   │
│ 7. Location and Arrival Guidance               │                             │
│ 8. Shift Description                           │ Warnings                    │
│ 9. Visibility and Application Method           │ - Missing qualification     │
│ 10. Cancellation and Support                   │ - Rate source missing       │
│ 11. Review and Publication                     │                             │
│                                               │ AI Advisory                 │
│ Current Step                                   │ AI can explain and suggest. │
│ [Fields for the selected step]                 │ AI cannot publish, price,   │
│                                               │ assign, or approve.         │
├───────────────────────────────────────────────┴─────────────────────────────┤
│ Save Draft | Request Approval | Publish Shift                               │
│ Save != Publish. Approved != Published. Published != Filled.                │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 14. Mobile Revision

Mobile remains step-based.

Each step should show:

- current step title
- one focused form group
- status chips for draft, validation, approval, and publication
- compact warning drawer
- save action
- continue action
- clear boundary note where relevant

Mobile review step must show:

```text
Review before publication
├── Shift summary
├── Staffing requirements
├── Pricing / estimate summary
├── Qualification requirements
├── Visibility and application method
├── Warnings
├── Authorization confirmation
└── Publish action, disabled until allowed
```

---

## 15. Conditions Resolved

Revision 1 resolves the documented conditions:

- Shift lifecycle remains truthful.
- Publication is governed.
- Staffing remains separate.
- Pricing remains truthful.
- Qualification rules remain governed.
- Conflict handling is explicit.
- Page 042 ownership is preserved.
- Auditability is complete.
- AI cannot make operational decisions.
- No governance, operational, financial, or compliance risks remain in the wireframe scope.

---

## 16. Validation

Confirmed:

- Pages 001-040 remain frozen.
- Original Page 041 wireframe remains intact.
- Architecture Freeze unchanged.
- Employer Portal planning unchanged.
- UX Foundation unchanged.
- Navigation unchanged.
- Page 042 not created.
- No implementation started.
- No React created.
- No frontend created.
- No backend created.
- No APIs created.
- No database changes created.
- No scheduling engine created.
- No staffing engine created.
- No payroll created.
- No billing created.
- No matching created.
- No AI automation created.

---

## 17. Final Status

```text
Page 041 — Create Shift
Revision 1: COMPLETE
Approval Record: CREATED IN SEPARATE FILE
Status: APPROVED WIREFRAME v1.0

Page 042 — Recurring Shift
UNBLOCKED
NOT CREATED
```
