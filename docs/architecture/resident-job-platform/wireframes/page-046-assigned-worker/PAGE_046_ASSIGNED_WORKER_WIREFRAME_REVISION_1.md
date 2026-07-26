# Resident Job

## Page 046 - Assigned Worker Wireframe Revision 1

**Status:** Approved Wireframe Candidate  
**Revision Scope:** Controlled Revision 1  
**Original Wireframe:** `PAGE_046_ASSIGNED_WORKER_LOW_FIDELITY_WIREFRAME.md`  
**Implementation:** Not Started  
**Page 047:** Unblocked after approval, not created

---

## 1. Summary of Revision

Revision 1 strengthens Page 046 in the owner-approved areas:

- assignment lifecycle governance
- worker confirmation truthfulness
- privacy
- qualification boundaries
- shift-change governance
- cancellation and replacement
- live-tracking boundary
- attendance and financial boundaries
- auditability
- AI boundaries
- readiness for Page 047 - Live Shift Tracking

No redesign was introduced. Page 046 remains the Assigned Worker visibility and governance page only.

---

## 2. Assignment Lifecycle Governance

Assignment lifecycle states must remain visibly independent:

- assignment requested
- assignment created
- worker notified
- worker response pending
- accepted
- declined
- expired
- confirmed
- cancelled
- replaced
- closed

Clarify:

```text
Assigned != Notified
Notified != Accepted
Accepted != Present
Present != Shift completed
Shift completed != Timesheet approved
```

Page 046 may display the assignment lifecycle, but it must not collapse lifecycle steps into a single confirmed state.

---

## 3. Worker Confirmation Truthfulness

Worker confirmation must be represented through separate status areas:

- notification state
- response state
- confirmation state
- attendance state

Clarify:

```text
Notification delivered != Worker viewed
Worker viewed != Worker accepted
Worker accepted != Worker arrived
```

The page must not fabricate read receipts, worker confirmations, arrival confirmations, attendance events, or acceptance evidence.

---

## 4. Privacy

Employers may see only minimum necessary assignment information.

Never expose:

- banking information
- tax information
- private identity documents
- full background-check details
- protected complaints
- private disputes
- internal investigations
- health information
- unrelated earnings
- private home address
- precise location outside governed live-tracking or attendance scope

Worker information must be grouped as:

```text
Employer-visible operational information
Platform-only review information
Worker-private information
```

Only the first category may appear on Page 046.

---

## 5. Qualification Boundary

Qualification signals must remain separate:

- requirement
- submitted document
- verified credential
- current credential
- expired credential
- review required

Clarify:

```text
Document uploaded != Credential verified
Credential verified != Attendance confirmed
Assignment created != Credential remains valid forever
```

Page 046 may display qualification context. It does not own qualification verification.

---

## 6. Shift-Change Governance

Changes after assignment must preserve original accepted terms and show a governed change flow:

- change proposed
- worker notified
- acknowledgment pending
- accepted
- declined
- review required
- original terms preserved

High-impact changes include:

- date
- time
- location
- department
- role
- rate
- premium
- responsibilities

Clarify:

```text
Employer changed shift != Worker accepted changed terms
```

Accepted assignment terms must not be silently overwritten.

---

## 7. Cancellation Governance

Cancellation states must remain separate:

- cancellation requested
- review pending
- cancellation effective
- cancellation disputed
- compensation review
- closed

Clarify:

```text
Cancellation requested != Cancelled
Worker cancellation != Misconduct
Cancelled assignment != Automatic loss of earned compensation
```

Page 046 must not calculate penalties, compensation, payroll outcomes, billing outcomes, or disciplinary outcomes.

---

## 8. Replacement Governance

Replacement must be represented as a governed workflow:

- replacement requested
- original assignment still active
- candidate review
- replacement selected
- replacement assignment created
- original assignment released
- replacement failed
- support required

Clarify:

```text
Replacement requested != Original worker removed
Replacement selected != Replacement assigned
Replacement assigned != Original assignment safely closed
```

No automatic replacement is introduced on Page 046.

---

## 9. Live Shift Tracking Boundary

Page 046 prepares for Page 047 - Live Shift Tracking, but does not implement or own live tracking.

Page 046 may show only:

- high-level live-tracking availability state
- governed entry point
- permission / authorization reminder
- attendance handoff status
- support path

Page 046 must not own:

- GPS tracking
- live map
- route monitoring
- location refresh
- geofence evaluation
- arrival prediction
- attendance evidence
- location alerts

Clarify:

```text
Assigned worker != Live-tracked worker
Tracking available != Tracking consent or authorization established
```

Page 047 remains the exact next frozen workflow:

```text
Page 047 — Live Shift Tracking
```

---

## 10. Attendance Boundary

Page 046 may display a high-level attendance handoff:

- not started
- check-in available
- checked in
- checked out
- attendance review required
- unavailable

Clarify:

```text
Checked in != Worked full shift
Checked out != Approved hours
Attendance state != Payroll result
```

Page 046 does not own attendance evidence, hours review, timesheet approval, payroll, billing, or disputes.

---

## 11. Financial Boundary

Financial information must remain contextual and non-final.

Keep separate:

- displayed shift rate
- premium
- travel allowance
- employer estimate
- worked earnings
- payroll result
- invoice result

Clarify:

```text
Displayed rate != Final payroll
Premium listed != Premium earned
Cancelled assignment != No compensation due
```

Page 046 does not calculate compensation, payroll, billing, invoicing, settlement, or payment.

---

## 12. Auditability

Assignment events must conceptually preserve:

- actor
- role
- timestamp
- action
- assignment reference
- prior state
- requested state
- resulting state
- reason where applicable

Auditable event types include:

- assignment creation
- worker notification
- worker response
- term changes
- cancellation
- replacement
- support intervention
- attendance handoff

Auditability is conceptual at the wireframe stage. No audit implementation is introduced.

---

## 13. AI Boundary

AI may:

- summarize assignment state
- explain pending actions
- identify missing confirmation
- identify visible credential expiry
- suggest navigation
- help draft support messages

AI must never:

- assign workers
- replace workers
- cancel assignments
- alter accepted terms
- determine misconduct
- approve attendance
- calculate compensation
- rank replacement candidates
- expose restricted information
- fabricate worker acceptance or arrival

Clarify:

```text
AI summary != Assignment decision
AI warning != Worker misconduct finding
AI navigation suggestion != Operational approval
```

---

## 14. Revised Wireframe Structure

### Desktop

```text
Employer Shell
├── Header
│   ├── Assigned Worker
│   ├── Shift reference
│   ├── Assignment lifecycle status
│   └── Privacy / source-of-truth notice
│
├── Primary assignment panel
│   ├── Worker operational summary
│   ├── Assignment state
│   ├── Notification state
│   ├── Worker response state
│   ├── Confirmation state
│   └── Attendance handoff state
│
├── Governance workspace
│   ├── Qualification summary
│   ├── Shift-change review
│   ├── Cancellation status
│   ├── Replacement status
│   ├── Financial boundary summary
│   └── Assignment history
│
├── Right guidance panel
│   ├── Privacy boundary
│   ├── Assignment vs attendance boundary
│   ├── Live Shift Tracking boundary
│   ├── AI limitations
│   └── Support path
│
└── Footer actions
    ├── Open Shift Details
    ├── Open Conversation
    ├── Request Clarification
    ├── Request Cancellation
    ├── Request Replacement
    ├── Open Live Shift Tracking
    └── Request Support
```

### Mobile

```text
Assigned Worker
├── Worker summary
├── Assignment lifecycle status
├── Notification / response / confirmation
├── Today's operational state
├── Qualification summary
├── Shift-change notice
├── Cancellation / replacement status
├── Live Shift Tracking entry point
├── Attendance handoff
├── Support path
└── Governance details collapsed
```

Mobile must answer first:

```text
Who is assigned?
Has the worker accepted?
Is the assignment confirmed?
What needs employer attention?
Where do I go for live tracking?
```

---

## 15. Empty, Error, and Exception States

Represent:

- no worker assigned
- assignment pending
- worker not yet notified
- worker response pending
- worker declined
- confirmation expired
- assignment cancelled
- replacement requested
- replacement failed
- attendance unavailable
- live-tracking unavailable
- source-of-truth unavailable
- permission denied

Exception messaging must remain neutral and non-punitive.

---

## 16. Validation

Confirmed:

- Frozen title remains Assigned Worker.
- Pages 001-045 remain unchanged.
- Page 047 remains Live Shift Tracking.
- No Page 047 files created.
- No implementation started.
- No React created.
- No frontend created.
- No backend created.
- No APIs created.
- No database changes created.
- No assignment engine created.
- No replacement engine created.
- No live-tracking implementation created.
- No GPS or geofence implementation created.
- No attendance implementation created.
- No payroll or billing implementation created.
- No notification or messaging implementation created.
- No AI assignment automation created.

---

## 17. Final Status

```text
Page 046 — Assigned Worker
Wireframe Revision 1: COMPLETE
Recommendation: APPROVED WIREFRAME v1.0

Page 047 — Live Shift Tracking
UNBLOCKED
NOT CREATED
```
