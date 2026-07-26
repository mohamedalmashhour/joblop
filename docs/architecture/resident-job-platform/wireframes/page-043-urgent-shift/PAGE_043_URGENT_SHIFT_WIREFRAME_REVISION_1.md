# Resident Job

## Page 043 - Urgent Shift Wireframe Revision 1

**Status:** Approved Wireframe Candidate  
**Revision Scope:** Controlled Revision 1  
**Original Wireframe:** `PAGE_043_URGENT_SHIFT_LOW_FIDELITY_WIREFRAME.md`  
**Implementation:** Not Started  
**Page 044:** Unblocked after approval, not created

---

## 1. Summary of Revision

Revision 1 strengthens Page 043 in the owner-approved areas:

- urgency governance
- urgency lifecycle
- operational truthfulness
- authorization
- staffing boundary
- pricing boundary
- publication governance
- conflict handling
- auditability
- AI governance
- readiness for Page 044

No redesign was introduced. Page 043 remains an urgent-shift governance page only.

---

## 2. Urgency Classification Governance

Urgency levels must remain configurable and visibly distinct:

- Standard
- Short Notice
- Same Day
- Critical Operational Need

The page must clarify:

```text
Urgent != Emergency
Critical != Guaranteed fulfillment
Urgency != Permission to bypass governance
```

Urgency means the request receives an appropriate governed priority for review. It does not create an emergency-service obligation, guarantee a worker, or override worker eligibility, employer authorization, pricing governance, publication governance, or compliance checks.

---

## 3. Urgent Shift Lifecycle

Revision 1 strengthens the urgent request lifecycle:

```text
Draft
↓
Validation
↓
Urgent Review
↓
Publication Ready
↓
Published
↓
Applications
↓
Assignment
↓
Completion
↓
Closure
```

No lifecycle state may imply another.

```text
Draft != Validated
Validated != Urgent Review Complete
Urgent Review != Publication Ready
Publication Ready != Published
Published != Applications
Applications != Assignment
Assignment != Completion
Completion != Closure
```

---

## 4. Scheduling Truthfulness

The urgent request must not imply staffing or attendance.

Clarify:

```text
Urgent request != Worker assigned
Worker assigned != Worker confirmed
Worker confirmed != Worker checked in
Checked in != Shift completed
Completed != Payroll approved
```

The page owns urgent request terms only. It does not own worker confirmation, GPS check-in, attendance evidence, timesheet approval, payroll, billing, payment, or closure outcomes.

---

## 5. Staffing Boundary

Page 043 defines urgent staffing requirements only.

It may define:

- urgent role needed
- requested worker count
- requested start time
- staffing deadline
- urgency reason
- minimum operational facts
- qualification requirements

It must not:

- assign workers
- rank workers
- approve workers
- reject workers
- guarantee fulfillment
- calculate staffing success
- bypass worker eligibility

Boundary:

```text
Requested urgent staffing != Worker assigned
Priority review != Coverage confirmed
```

---

## 6. Pricing Boundary

Pricing information must remain truthful and separate:

- base rate
- urgent premium
- travel allowance
- transportation allowance
- employer estimated cost

Clarify:

```text
Urgent premium != Guaranteed worker earnings
Estimated cost != Final invoice
Configured rate != Payroll calculation
```

Do not calculate:

- payroll
- taxes
- deductions
- final invoice
- settlement
- platform margin
- surge pricing

Urgent premium is a governed input or summary only.

---

## 7. Qualification Boundary

Urgent requests must still respect:

- licence
- certification
- background check
- mandatory training
- jurisdiction
- role requirements

Clarify:

```text
Urgency != Qualification bypass
Required qualification != Worker eligible
Eligible != Assigned
```

The page may show requirements and missing critical facts, but final worker eligibility remains outside Page 043.

---

## 8. Publication Governance

Publication must remain governed and independent:

- validation
- review
- approval
- publish request
- publish success
- publish failure

Clarify:

```text
Saved != Published
Validated != Published
Approved != Published
Publish requested != Publish success
Published != Filled
```

Selecting urgency must never publish a shift automatically.

---

## 9. Conflict Handling

Represent warnings for:

- duplicate urgent shift
- overlapping urgent shift
- inactive residence
- inactive department
- missing qualifications
- invalid schedule
- excessive staffing request
- conflicting urgency

Conflict warning panel:

```text
Warnings
├── Possible duplicate urgent shift
├── Overlapping urgent request
├── Missing qualification requirement
├── Invalid schedule
└── Conflicting urgency classification

Notice:
Warnings support review. They do not automatically reject the request unless governed rules require it.
```

Clarify:

```text
Warnings != Automatic rejection
No warnings != Guaranteed fulfillment
```

---

## 10. Authorization

The page must represent conceptual authorization without implementing permission logic.

Permission distinctions:

```text
Dashboard access != Urgent request authority
Residence access != Publication authority
Scheduler != Pricing override authority
Department visibility != Worker assignment authority
Finance access != Staffing authority
```

The page may show:

```text
You can draft this urgent request, but publication requires an authorized user.
```

---

## 11. Auditability

Auditability must conceptually preserve:

- urgency creation
- urgency edits
- pricing changes
- publication
- cancellation

Audit entries include:

- actor
- role
- timestamp
- action
- shift reference
- prior state
- resulting state

Optional where applicable:

- urgency reason
- publication result
- cancellation reason
- approval state

Audit records must not contain resident or patient information.

---

## 12. AI Governance

AI may:

- summarize urgency
- explain urgency levels
- identify missing information
- identify visible conflicts
- suggest wording

AI must never:

- publish urgent shifts
- assign workers
- change pricing
- bypass qualifications
- override employer authorization
- guarantee fulfillment
- rank or reject workers
- label coverage as confirmed
- perform escalation logic

AI output must be advisory and visually separate from operational status.

---

## 13. Page 044 Boundary

The owner decision describes Page 044 as owning shift marketplace, publication, worker discovery, and marketplace visibility.

The frozen architecture page map currently lists Page 044 as **AI Worker Suggestions**. This revision does not rename the frozen page map.

Page 043 must not introduce:

- marketplace logic
- worker discovery
- marketplace visibility
- AI worker ranking
- automatic publication
- worker matching
- applicant ranking

Regardless of Page 044 final scope, Page 043 owns urgent shift definition only.

---

## 14. Revised Low-Fidelity Structure

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ Urgent Shift                                                               │
│ Prioritized staffing request. Not emergency service. Not guaranteed cover.  │
├───────────────────────────────────────────────┬─────────────────────────────┤
│ Step Workflow                                  │ Governance Panel            │
│                                               │                             │
│ 1. Organization / Residence / Department       │ Urgency Classification      │
│ 2. Urgency Classification                      │ Standard / Short Notice /   │
│ 3. Role and Staffing Need                      │ Same Day / Critical Need    │
│ 4. Requested Start / Deadline                  │                             │
│ 5. Critical Operational Facts                  │ Lifecycle                   │
│ 6. Qualification Requirements                  │ Draft / Validation / Review │
│ 7. Rate, Premium, and Estimate                 │ Publication Ready /         │
│ 8. Review and Publish Request                  │ Published / Applications /  │
│ 9. Support / Escalation Path                   │ Assignment / Completion     │
│                                               │                             │
│ Current Step                                   │ Warnings                    │
│ [Focused urgent request fields]                │ - Missing qualification     │
│                                               │ - Duplicate urgent request  │
│ Boundary Notes                                 │                             │
│ Urgent != Emergency                            │ AI Advisory                 │
│ Urgent != Guaranteed fulfillment               │ AI can explain and suggest. │
│ Urgent != Governance bypass                    │ It cannot publish, assign,  │
│                                               │ price, or guarantee.        │
├───────────────────────────────────────────────┴─────────────────────────────┤
│ Save Draft | Submit for Urgent Review | Request Publication                 │
│ Saved != Published. Approved != Published. Published != Filled.             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 15. Conditions Resolved

Revision 1 resolves the documented conditions:

- Urgency remains governed.
- Lifecycle states remain independent.
- Pricing remains truthful.
- Staffing remains separate.
- Qualification rules remain governed.
- Publication remains governed.
- Conflict handling is explicit.
- Page 044 ownership is preserved as a boundary, without modifying the frozen page map.
- Auditability is complete.
- AI cannot make operational decisions.
- No governance, operational, financial, or compliance risks remain in wireframe scope.

---

## 16. Validation

Confirmed:

- Pages 001-042 remain frozen.
- Original Page 043 wireframe remains intact.
- Architecture Freeze unchanged.
- Employer Portal planning unchanged.
- UX Foundation unchanged.
- Navigation unchanged.
- Page 044 not created.
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
- No matching engine created.
- No AI automation created.

---

## 17. Final Status

```text
Page 043 — Urgent Shift
Revision 1: COMPLETE
Approval Record: CREATED IN SEPARATE FILE
Status: APPROVED WIREFRAME v1.0

Page 044
UNBLOCKED
NOT CREATED
```
