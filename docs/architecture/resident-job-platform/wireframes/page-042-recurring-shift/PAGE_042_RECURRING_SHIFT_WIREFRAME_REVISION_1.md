# Resident Job

## Page 042 - Recurring Shift Wireframe Revision 1

**Status:** Approved Wireframe Candidate  
**Revision Scope:** Controlled Revision 1  
**Original Wireframe:** `PAGE_042_RECURRING_SHIFT_LOW_FIDELITY_WIREFRAME.md`  
**Implementation:** Not Started  
**Page 043:** Unblocked after approval, not created

---

## 1. Summary of Revision

Revision 1 strengthens Page 042 in the owner-approved areas:

- recurrence governance
- template vs occurrence ownership
- recurrence lifecycle
- exception handling
- scheduling truthfulness
- authorization
- auditability
- AI boundaries
- readiness for Page 043 - Urgent Shift

No redesign was introduced. Page 042 remains a recurrence-governance page only.

---

## 2. Template vs Occurrence Ownership

Page 042 must show that a recurring template is not an occurrence, not a published shift, not an assignment, and not worked time.

```text
Recurring Template
!= Generated Occurrence
!= Published Occurrence
!= Assigned Occurrence
!= Completed Occurrence
!= Cancelled Occurrence
```

Clarify:

```text
Template != Occurrence
Occurrence != Published
Published != Assigned
Assigned != Worked
Worked != Payroll Approved
```

The template defines recurrence structure. Each occurrence is a downstream instance governed separately.

---

## 3. Recurrence Lifecycle

Revision 1 separates three independent lifecycles.

### Template Lifecycle

- Draft
- Saved
- Active
- Paused
- Archived
- Cancelled

### Occurrence Lifecycle

- Generated
- Scheduled
- Published
- Filled
- Active
- Completed
- Cancelled

### Exception Lifecycle

- Pending
- Applied
- Reverted
- Archived

No lifecycle state may imply another.

```text
Active template != Published occurrences
Published occurrence != Filled occurrence
Filled occurrence != Active shift
Completed occurrence != Payroll approved
Applied exception != Template changed
```

---

## 4. Recurrence Rules

Recurrence remains configurable.

Conceptual recurrence options:

- daily
- weekly
- bi-weekly
- monthly
- every X days
- every X weeks
- custom interval

The UI must display these as configurable examples, not hardcoded universal rules.

Clarify:

```text
Configured rule != Generated occurrence
Generated occurrence != Published shift
```

Rule configuration must not imply occurrence generation, publication, assignment, staffing, attendance, payroll, or billing.

---

## 5. Exception Governance

Revision 1 strengthens exception ownership.

Represent:

- skipped occurrence
- edited occurrence
- cancelled occurrence
- added occurrence
- holiday override
- daylight-saving adjustment
- timezone adjustment
- manual override

Exception panel:

```text
Exception Type
[Skipped / Edited / Cancelled / Added / Holiday Override / DST Adjustment /
 Timezone Adjustment / Manual Override]

Affected Scope
[One occurrence / Future occurrences only / Review required]

Effect
[Pending / Applied / Reverted / Archived]

Boundary Notice
Editing one occurrence != editing the template.
Editing template != changing historical occurrences.
```

Exceptions must preserve history. They must not silently mutate completed, worked, paid, cancelled, or historically published occurrences.

---

## 6. Scheduling Truthfulness

Future recurrence must not be represented as guaranteed staffing.

Clarify:

```text
Future occurrence != Guaranteed shift
Occurrence created != Worker assigned
Worker assigned != Worker confirmed
Worker confirmed != Worker checked in
```

The occurrence preview must label rows as preview, generated, scheduled, published, or exception-applied. It must not use vague status labels that imply work has been staffed or completed.

---

## 7. Authorization

Represent conceptual permissions for:

- organization owner
- administrator
- scheduler
- residence manager
- department manager
- read-only observer

Authorization distinctions:

```text
Template visibility != Edit authority
Scheduler != Publication authority
Department visibility != Series cancellation authority
Residence access != Exception override authority
Read-only observer != Template editor
```

The page may show:

```text
You can view this recurring template, but editing or activation requires authorization.
```

No authorization logic is implemented in this wireframe.

---

## 8. Auditability

Auditability must conceptually preserve:

- template creation
- recurrence edits
- exception creation
- pause/resume
- cancellation
- regeneration request

Audit entries include:

- actor
- role
- timestamp
- action
- template reference
- prior state
- resulting state

Optional where applicable:

- exception type
- affected occurrence range
- reason
- approval state
- result

Audit records must not contain resident or patient information.

---

## 9. AI Boundary

AI may:

- summarize recurrence
- explain schedules
- identify visible conflicts
- explain recurrence rules
- explain template vs occurrence terminology

AI must never:

- generate recurring schedules autonomously
- publish occurrences
- assign workers
- modify staffing
- alter recurrence without explicit user action
- pause or cancel a series
- apply exceptions
- alter payroll
- guarantee fulfillment

AI output must be labeled as advisory and must not appear as operational state.

---

## 10. Page 043 Boundary

Page 042 owns recurring scheduling governance only.

Page 043 - Urgent Shift owns:

- urgency
- emergency staffing classification
- short-notice workflow
- premium urgency handling

Page 042 must not introduce:

- urgent-shift classification
- emergency staffing workflows
- same-day staffing prioritization
- urgent premiums
- urgent matching
- emergency dispatch language

Allowed handoff:

```text
Need urgent coverage?
Urgent Shift is a separate governed workflow.
```

No urgent-shift logic is added to Page 042.

---

## 11. Revised Low-Fidelity Structure

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ Recurring Shift                                                            │
│ Configure a recurrence template. A template is not a worked shift.          │
├───────────────────────────────────────────────┬─────────────────────────────┤
│ Step Workflow                                  │ Governance Panel            │
│                                               │                             │
│ 1. Template Context                            │ Template Lifecycle          │
│ 2. Base Shift Details                          │ Draft / Saved / Active      │
│ 3. Recurrence Rule                             │ Paused / Archived / Cancel  │
│ 4. Effective Dates and Timezone                │                             │
│ 5. Publication Policy                          │ Occurrence Lifecycle        │
│ 6. Exception Policy                            │ Generated / Scheduled /     │
│ 7. Occurrence Preview                          │ Published / Filled / Active │
│ 8. Review and Save Template                    │ Completed / Cancelled       │
│ 9. Activation Request                          │                             │
│                                               │ Exception Lifecycle         │
│ Current Step                                   │ Pending / Applied /         │
│ [Focused recurrence fields]                    │ Reverted / Archived         │
│                                               │                             │
│ Boundary Notes                                 │ AI Advisory                 │
│ Template != Occurrence                         │ AI explains only. It cannot │
│ Occurrence != Published                        │ generate, publish, assign,  │
│ Published != Assigned                          │ or modify staffing.         │
├───────────────────────────────────────────────┴─────────────────────────────┤
│ Save Template Draft | Preview Occurrences | Request Approval | Activate      │
│ Active template != Published occurrences.                                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 12. Conditions Resolved

Revision 1 resolves the documented conditions:

- Template and occurrence remain separate.
- Recurrence lifecycle is truthful.
- Exception handling is governed.
- Authorization is explicit.
- Page 043 ownership is preserved.
- Auditability is complete.
- AI cannot generate or publish recurring shifts.
- No governance, scheduling, or operational risks remain in wireframe scope.

---

## 13. Validation

Confirmed:

- Pages 001-041 remain frozen.
- Original Page 042 wireframe remains intact.
- Architecture Freeze unchanged.
- Employer Portal planning unchanged.
- UX Foundation unchanged.
- Navigation unchanged.
- Page 043 not created.
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
- No notifications created.
- No AI automation created.

---

## 14. Final Status

```text
Page 042 — Recurring Shift
Revision 1: COMPLETE
Approval Record: CREATED IN SEPARATE FILE
Status: APPROVED WIREFRAME v1.0

Page 043 — Urgent Shift
UNBLOCKED
NOT CREATED
```
