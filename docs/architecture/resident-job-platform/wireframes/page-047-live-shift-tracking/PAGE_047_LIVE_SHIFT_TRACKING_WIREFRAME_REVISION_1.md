# Resident Job

## Page 047 - Live Shift Tracking Wireframe Revision 1

**Status:** Approved Wireframe Candidate  
**Revision Scope:** Controlled Revision 1  
**Original Wireframe:** `PAGE_047_LIVE_SHIFT_TRACKING_LOW_FIDELITY_WIREFRAME.md`  
**Implementation:** Not Started  
**Page 048:** Unblocked after approval, not created

---

## 1. Summary of Revision

Revision 1 strengthens Page 047 in the owner-approved areas:

- tracking eligibility
- tracking-window governance
- worker privacy
- location precision and freshness
- map and geofence boundaries
- attendance separation
- tracking failures
- safety and incident boundaries
- consent and notice
- historical-data limits
- fairness and retaliation
- auditability
- AI boundaries
- readiness for Page 048 - Attendance

No redesign was introduced. Page 047 remains Live Shift Tracking only.

---

## 2. Tracking Eligibility

Tracking eligibility must use a governed prerequisite chain:

- employer authenticated
- employer role authorized
- active assignment
- worker acceptance
- approved tracking basis
- governed shift window
- required notice or consent
- supported permission state

Clarify:

```text
Assigned != Tracking authorized
Tracking authorized != Location available
Location available != Location accurate
Location accurate != Attendance proven
```

Assignment alone must not automatically enable live tracking.

---

## 3. Tracking Window Governance

Represent tracking window states separately:

- not yet eligible
- pre-shift window
- active shift window
- temporary interruption
- checkout window
- tracking ended
- authorization expired
- unavailable

Clarify:

```text
Scheduled shift != Tracking active
Check-out recorded != Tracking may continue
Shift ended != Location access remains authorized
```

Tracking must stop at the governed end condition.

---

## 4. State Separation

Preserve independent states for:

### A. Assignment

- assigned
- accepted
- declined
- cancelled
- replaced
- unavailable

### B. Attendance

- not started
- check-in available
- checked in
- in progress
- check-out available
- checked out
- review required
- unavailable

### C. Tracking

- not authorized
- authorized
- starting
- active
- paused
- interrupted
- ended
- unavailable

### D. Location

- no location
- current
- recent
- stale
- approximate
- low confidence
- permission denied
- device offline
- service unavailable

### E. Support

- no support required
- contact requested
- safety review
- incident workflow opened
- resolved
- closed

Do not collapse these into one "Live" or "Present" state.

---

## 5. Source-of-Truth Boundary

Page 047 may display operational signals only.

It must not become authoritative for:

- assignment
- attendance approval
- worked hours
- shift completion
- timesheets
- payroll
- billing
- misconduct
- safety adjudication

Clarify:

```text
Location update != Attendance proof
Inside geofence != Checked in
Checked in != Hours approved
No location != Absent
Worker stopped moving != Inactive
```

---

## 6. Worker Privacy

Employers may see only minimum-necessary data.

May show where governed:

- worker display name
- role
- assignment
- tracking state
- approximate or governed location
- last update time
- freshness
- attendance status
- support state

Must not expose:

- home address
- unrelated movements
- historical personal routes
- location outside the approved window
- private identity documents
- health information
- complaints
- disputes
- banking or tax information
- unrelated work history

---

## 7. Location Precision

Represent configurable precision levels:

- status only
- arrival zone
- approximate area
- geofence state
- precise location only where explicitly required

Clarify:

```text
More precise != More reliable
Precise != Proof of work
```

Do not default to maximum precision.

---

## 8. Freshness and Confidence

Every visible location state should conceptually include:

- last update time
- freshness label
- confidence level
- source category
- interruption reason where appropriate
- plain-language disclaimer

Possible labels:

- Current
- Recent
- Stale
- Unknown
- Unavailable

Do not display stale information as live.

---

## 9. Map Boundary

If a map appears, limit it to:

- governed workplace location
- safe arrival zone
- authorized worker location
- freshness and confidence
- high-level operational context

Do not show:

- full route history
- unrelated stops
- home location
- other workers
- residents or patients
- precise internal security-sensitive details

No route optimization is introduced.

---

## 10. Geofence Boundary

Represent:

- outside arrival zone
- entered arrival zone
- at workplace
- left workplace
- unavailable
- low confidence

Clarify:

```text
Inside geofence != Checked in
Outside geofence != Absent
Geofence failure != Misconduct
```

Geofence state must not approve, reject, or determine attendance automatically.

---

## 11. Attendance Boundary

Page 047 prepares explicitly for Page 048 - Attendance.

Page 047 may show only:

- high-level attendance state
- governed handoff to Attendance
- tracking context relevant to current operational awareness

Page 047 must not own:

- check-in evidence
- check-out evidence
- manual corrections
- attendance disputes
- approved hours
- timesheet review
- payroll consequences

Clarify:

```text
Check-in event != Attendance approved
Check-out event != Shift completed for payroll
Tracking data != Final attendance record
```

---

## 12. Tracking Failure

Represent:

- permission denied
- device offline
- low battery where governed
- GPS unavailable
- network unavailable
- stale update
- app closed
- authorization expired
- service unavailable

Each state should show:

- safe reason category
- last known status
- whether attendance remains available
- employer action
- worker support path
- timestamp

Do not convert failures into misconduct.

---

## 13. Safety and Emergency Boundary

Separate:

- routine delay
- contact needed
- safety concern
- emergency

Clarify:

```text
No location != Emergency
Support request != Emergency services contacted
Page 047 != Emergency dispatch
```

Route genuine emergencies to the approved emergency procedure. Do not promise immediate response.

---

## 14. Incident Boundary

Page 047 may provide entry points to:

- report operational issue
- request support
- open safety workflow
- document tracking failure

It must not show:

- allegation details
- reporter identity
- victim identity
- clinical information
- investigative notes
- fraud signals

Clarify:

```text
Incident reported != Misconduct proven
```

---

## 15. Consent and Notice

Conceptually preserve:

- policy version
- notice provided
- lawful basis or consent
- effective window
- worker acknowledgment
- permitted purpose
- limitation or withdrawal where applicable
- audit history

Clarify:

```text
App permission != Legal consent
Consent != Unlimited tracking
Tracking policy != Authority outside the shift window
```

No consent logic is implemented.

---

## 16. Historical Data Boundary

Limit any history to governed operational events:

- tracking started
- arrival zone entered
- check-in
- interruption
- check-out
- tracking ended

Do not create:

- detailed route playback
- continuous movement history
- broad historical surveillance

---

## 17. Fairness and Retaliation

Do not allow automatic penalties for:

- GPS failure
- device failure
- network interruption
- low battery
- declining excessive tracking
- reporting safety concerns
- disputing attendance
- requesting accessibility support

Clarify:

```text
Tracking interruption != Misconduct
Stale location != Absence
Declining unlawful or excessive tracking != Disqualification
```

---

## 18. Auditability

Conceptually preserve:

- tracking access
- tracking start
- tracking stop
- precision change
- location view
- authorization denial
- support access
- failure state
- incident entry

Include:

- actor
- role
- assignment or shift reference
- worker reference
- action
- purpose or case reference
- timestamp
- result

Do not place raw continuous location data in broad audit logs.

---

## 19. AI Boundary

AI may:

- summarize visible operational status
- explain tracking states
- identify stale updates
- suggest navigation
- help draft support requests

AI must not:

- infer misconduct
- infer productivity
- declare absence
- approve attendance
- predict worker intent
- alter precision
- continue tracking
- contact emergency services
- fabricate location
- rank workers based on movement

---

## 20. Revised Wireframe Structure

### Desktop

```text
Employer Shell
├── Header
│   ├── Live Shift Tracking
│   ├── Assignment reference
│   ├── Tracking eligibility state
│   ├── Tracking window state
│   └── Privacy / authorization notice
│
├── Primary current-state panel
│   ├── Assignment state
│   ├── Attendance state
│   ├── Tracking state
│   ├── Location state
│   ├── Freshness and confidence
│   └── Last update
│
├── Governed location panel
│   ├── Workplace / arrival zone
│   ├── Authorized worker location where permitted
│   ├── Precision label
│   ├── Freshness label
│   ├── Confidence label
│   └── Accessible status alternative
│
├── Operational exception panel
│   ├── Tracking failure state
│   ├── Safe reason category
│   ├── Worker support path
│   ├── Employer action
│   └── Safety / incident entry point
│
├── Right governance panel
│   ├── Eligibility prerequisites
│   ├── Tracking window
│   ├── Attendance boundary
│   ├── Worker privacy
│   ├── Consent / notice
│   ├── AI limitations
│   └── Auditability note
│
└── Footer actions
    ├── Open Assigned Worker
    ├── Open Attendance
    ├── Open Conversation
    ├── Request Support
    └── Report Tracking Issue
```

### Mobile

```text
Live Shift Tracking
├── Assignment summary
├── Tracking eligibility / window
├── Worker operational status
├── Location freshness and confidence
├── Attendance state handoff
├── Governed location or zone summary
├── Tracking failure notice
├── Support / incident entry point
├── Privacy notice
└── Collapsed governance details
```

Mobile must prioritize:

```text
Is tracking authorized?
Is the location current?
What does the status actually mean?
What requires employer action?
Where does Attendance continue?
```

---

## 21. Page 048 Boundary

Page 047 owns:

```text
Live Shift Tracking
```

Page 048 owns:

```text
Attendance
```

Page 047 may provide only a governed handoff to Attendance.

Do not introduce Page 048 evidence, correction, approval, or dispute logic into Page 047.

Do not create Page 048 files.

---

## 22. Validation

Confirmed:

- Frozen title remains Live Shift Tracking.
- Pages 001-046 remain unchanged.
- Page 048 remains Attendance.
- No Page 048 files created.
- No implementation started.
- No React created.
- No frontend created.
- No backend created.
- No APIs created.
- No database changes created.
- No GPS implementation created.
- No geofence implementation created.
- No map integration created.
- No attendance implementation created.
- No notification or messaging implementation created.
- No incident or emergency implementation created.
- No AI tracking automation created.

---

## 23. Final Status

```text
Page 047 — Live Shift Tracking
Wireframe Revision 1: COMPLETE
Recommendation: APPROVED WIREFRAME v1.0

Page 048 — Attendance
UNBLOCKED
NOT CREATED
```
