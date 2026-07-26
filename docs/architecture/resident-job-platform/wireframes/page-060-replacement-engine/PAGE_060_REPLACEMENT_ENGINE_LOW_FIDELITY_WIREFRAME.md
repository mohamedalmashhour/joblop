# Resident Job

## Page 060 - Replacement Engine Low-Fidelity Wireframe

**Status:** Low-Fidelity Wireframe Complete  
**Owner review:** Required  
**Approval record:** Not created  
**Implementation:** Not Started  
**Frozen title:** Replacement Engine  
**Page 061:** Admin Dashboard blocked

---

## 1. Purpose

Page 060 designs the governed Replacement Engine experience after a replacement has already been
determined to be necessary. It coordinates replacement review, candidate discovery, qualification and
availability comparison, human approval, and authoritative workflow handoff.

Page 060 is not Manual Assignment, Conflict Resolution, AI Dispatch, Scheduling, Worker Messaging,
Attendance, Payroll, Billing, or Complaint Resolution.

---

## 2. Core Boundary Statements

```text
Replacement required != Replacement assigned
Replacement requested != Replacement authorized
Visible worker != Eligible replacement
Replacement selected != Replacement accepted
Replacement accepted != Attendance confirmed
Replacement recommendation != Human approval
Human approval != Worker notification
Authoritative handoff != Downstream workflow completed
```

---

## 3. Desktop Wireframe

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Resident Job / Scheduler Console / Replacement Engine                        │
│ Role: Scheduler | Residence: Selected Residence | Page 061: Admin Dashboard  │
├──────────────────────────────┬───────────────────────────────────────────────┤
│ Replacement Requests         │ Replacement Case                              │
│ ┌──────────────────────────┐ │ ┌───────────────────────────────────────────┐ │
│ │ Filters                  │ │ │ Replacement reference                      │ │
│ │ - Residence              │ │ │ Original assignment reference              │ │
│ │ - Department             │ │ │ Shift reference                            │ │
│ │ - Status                 │ │ │ Source: Conflict / Attendance / Support    │ │
│ │ - Replacement window     │ │ │ State: Under review                         │ │
│ │ - Authorization state    │ │ │ Policy version                              │ │
│ └──────────────────────────┘ │ └───────────────────────────────────────────┘ │
│ ┌──────────────────────────┐ │                                               │
│ │ Request card             │ │ Replacement Eligibility                       │
│ │ Worker unavailable       │ │ - Requested                                   │
│ │ Shift still active       │ │ - Authorized                                  │
│ │ Window active            │ │ - Original assignment still valid             │
│ │ [Open]                   │ │ - Replacement window active                   │
│ └──────────────────────────┘ │ - Policy permits replacement                  │
│                              │ - Human approval required                     │
├──────────────────────────────┼───────────────────────────────────────────────┤
│ Candidate Pool               │ Candidate Review                              │
│ ┌──────────────────────────┐ │ ┌───────────────────────────────────────────┐ │
│ │ Governed eligible pool   │ │ │ Candidate reference                         │ │
│ │ Worker A: eligible       │ │ │ Qualification match                         │ │
│ │ Worker B: source stale   │ │ │ Licence / certification status              │ │
│ │ Worker C: unavailable    │ │ │ Availability and schedule compatibility     │ │
│ │ Worker D: mismatch       │ │ │ Travel suitability                          │ │
│ └──────────────────────────┘ │ │ Organization authorization                  │ │
│                              │ │ AI summary: advisory only                   │ │
│                              │ └───────────────────────────────────────────┘ │
├──────────────────────────────┴───────────────────────────────────────────────┤
│ Human Approval                                                               │
│ [Select candidate] [Request clarification] [Escalate] [Cancel request]       │
│ Required: responsible actor, role, rationale, policy version, handoff target │
│                                                                              │
│ Handoff                                                                      │
│ Authoritative workflow receives approved replacement route.                  │
│ Page 060 does not notify, assign, release original assignment, or automate.  │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Mobile Wireframe

```text
┌──────────────────────────────┐
│ Replacement Engine           │
│ Case: replacement reference  │
├──────────────────────────────┤
│ Request status               │
│ Requested / Authorized       │
│ Window: active / expired     │
│ Policy: permits / blocked    │
├──────────────────────────────┤
│ Original assignment          │
│ Shift ref                    │
│ Worker ref                   │
│ Still valid: yes / no        │
├──────────────────────────────┤
│ Candidate pool               │
│ Eligible candidates only     │
│ [Candidate card]             │
│ - Qualification match        │
│ - Availability               │
│ - Travel suitability         │
│ - Source freshness           │
├──────────────────────────────┤
│ AI advisory summary          │
│ Explanation + missing info   │
│ Not a decision               │
├──────────────────────────────┤
│ Human decision               │
│ [Select for handoff]         │
│ [Escalate]                   │
│ [Cancel replacement request] │
└──────────────────────────────┘
```

---

## 5. Replacement Eligibility

Represent independently:

- replacement requested
- replacement authorized
- original assignment still valid
- replacement window active
- policy permits replacement
- human approval required
- replacement blocked
- replacement unavailable

Clarify:

```text
Replacement requested != Replacement authorized
Replacement authorized != Replacement completed
```

---

## 6. Candidate Pool Governance

The candidate pool includes only governed eligible workers.

Candidate evaluation may display:

- qualification match
- licence status
- certification status
- availability
- schedule compatibility
- travel suitability
- organization authorization
- source freshness
- policy version

Do not allow unrestricted worker selection.

Clarify:

```text
Visible worker != Eligible replacement
Eligible replacement != Selected replacement
```

---

## 7. Human Authority

Represent separate authority for:

- reviewing replacement
- selecting candidate
- approving replacement
- escalating replacement
- cancelling replacement request
- read-only audit

Every replacement decision must identify:

- responsible human actor
- role
- timestamp
- replacement reference
- assignment reference
- selected worker reference where applicable
- rationale
- policy version

---

## 8. Source-of-Truth Boundary

Page 060 may reference:

- shifts
- assignments
- worker availability
- qualifications
- conflict outcome
- policy

Page 060 must not become authoritative for those records.

Every operational change must return to the authoritative workflow.

```text
Replacement review != Assignment record changed
Candidate selected != Worker contacted
Workflow handoff != Downstream state completed
```

---

## 9. AI Boundary

AI may:

- summarize candidate information
- explain policy
- compare eligible candidates
- identify missing information
- draft rationale

AI must never:

- assign workers
- approve replacements
- override policy
- waive qualifications
- contact workers
- create authoritative state
- rank outside the governed eligible pool
- hide alternative candidates

---

## 10. Replacement Lifecycle

Represent independently:

- replacement requested
- under review
- candidate search
- candidate selected
- approval pending
- approved
- rejected
- cancelled
- expired
- authoritative handoff complete

Do not collapse lifecycle stages.

---

## 11. Notification Boundary

Page 060 prepares downstream workflow only.

It must not:

- send email
- send SMS
- send push notifications
- contact workers automatically
- fabricate delivery status
- fabricate acceptance status

---

## 12. Financial Boundary

Page 060 must not:

- calculate pay
- modify invoices
- issue refunds
- determine payroll
- calculate travel compensation
- alter rates
- settle payments

Financial implications remain in authoritative financial workflows.

---

## 13. Auditability

Conceptually preserve:

- replacement requested
- reviewer assigned
- candidate reviewed
- candidate selected
- approval granted
- approval denied
- workflow handed off
- replacement cancelled
- replacement closed

Include:

- actor
- role
- timestamp
- replacement reference
- assignment reference
- worker reference
- policy version
- rationale

---

## 14. Privacy

Expose only minimum necessary information.

Do not expose:

- banking information
- tax information
- health information
- identity documents
- unrelated complaints
- investigation records
- protected personal information
- private message contents
- internal fraud signals

---

## 15. Empty and Error States

Include:

- no replacement requests
- replacement already closed
- replacement unavailable
- policy blocks replacement
- original assignment invalid
- replacement window expired
- no eligible candidates
- candidate source stale
- availability source unavailable
- qualification source unavailable
- approval blocked
- access denied
- service unavailable

Do not fabricate replacement success.

---

## 16. Accessibility

Review:

- keyboard navigation
- screen-reader compatibility
- semantic headings
- accessible candidate comparison
- no color-only eligibility states
- readable dates and times
- plain-language errors
- confirmation before high-impact actions
- large touch targets on mobile
- focus management after route selection

---

## 17. International Readiness

Do not hardcode:

- worker roles
- qualification rules
- replacement policies
- labour rules
- scheduling rules
- locale
- timezone
- language
- organization structure
- residence structure

Keep all policy configurable.

---

## 18. Validation

Confirmed in this wireframe package:

- Governance control stack unchanged.
- Pages 001-059 unchanged.
- Page 060 title remains Replacement Engine.
- Exact Page 061 title identified as Admin Dashboard.
- No Page 061 files created.
- No approval record created.
- No implementation.
- No React.
- No frontend.
- No backend.
- No APIs.
- No database changes.
- No replacement engine implementation.
- No assignment automation.
- No notification implementation.
- No payroll implementation.
- No AI automation.
- No commit, push, merge, or deployment.

---

## 19. Final Status

```text
Page 060 — Replacement Engine
Wireframe: COMPLETE
Product Review: COMPLETE
Approval Record: NOT CREATED
Owner Review: REQUIRED

Page 061 — Admin Dashboard
BLOCKED
```
