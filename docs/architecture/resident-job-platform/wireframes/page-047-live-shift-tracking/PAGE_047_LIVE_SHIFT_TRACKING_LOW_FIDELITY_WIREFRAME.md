# Resident Job

## Page 047 - Live Shift Tracking

**Status:** Low-Fidelity Wireframe Complete  
**Owner Review:** Required  
**Approval Record:** Not Created  
**Implementation:** Not Started  
**Page 048:** Blocked

---

## 1. Purpose

Page 047 designs the authenticated employer Live Shift Tracking experience.

The page allows an authorized employer user to view governed, minimum-necessary operational status for an assigned worker during a shift.

This page may show:

- assignment context
- live operational state
- check-in and check-out status
- last authorized location update where policy permits
- arrival or departure status
- tracking availability
- location confidence or freshness
- support and incident entry points

This page must not:

- become continuous employee surveillance
- expose location outside the governed shift window
- expose the worker's private home or unrelated movements
- fabricate live location
- treat location as proof of completed work
- replace attendance evidence
- replace timesheets
- replace payroll
- become emergency dispatch
- allow employers to track unassigned workers
- allow AI to infer misconduct or productivity from movement
- silently continue tracking after the authorized window

---

## 2. Primary Users

Authorized employer-side users with role-based access:

- organization owner
- residence manager
- department manager
- scheduler
- operations manager
- authorized support
- read-only observer where permitted

Authorization depends on organization, residence, department, assignment, shift, and policy context.

---

## 3. Tracking Eligibility

Tracking requires a governed basis.

Possible prerequisites:

- authenticated employer user
- authorized residence or department access
- active assignment
- worker acceptance
- governed tracking policy
- current shift window
- worker notice or consent where required
- supported device and permission state

Clarify:

```text
Worker assigned != Tracking authorized
Tracking authorized != Location available
Location available != Location accurate
```

---

## 4. Tracking Window

Represent tracking window states:

- tracking not yet available
- pre-shift arrival window
- shift tracking active
- temporary tracking interruption
- checkout window
- tracking ended
- tracking unavailable

Clarify:

```text
Shift scheduled != Tracking active
Shift completed != Tracking may continue
```

Tracking must stop at the governed end condition. The page must not imply permanent or background tracking.

---

## 5. Independent States

### A. Assignment State

- Assigned
- Worker accepted
- Worker declined
- Assignment cancelled
- Assignment replaced
- Assignment unavailable

### B. Attendance State

- Not started
- Check-in available
- Checked in
- In progress
- Check-out available
- Checked out
- Attendance review required
- Attendance unavailable

### C. Tracking State

- Not authorized
- Authorized
- Starting
- Active
- Paused
- Interrupted
- Ended
- Unavailable

### D. Location State

- No location
- Current
- Stale
- Low confidence
- Approximate
- Permission denied
- Device offline
- Service unavailable

### E. Support State

- No support required
- Contact requested
- Safety review
- Incident workflow opened
- Resolved
- Closed

Do not collapse these into one generic "Live" state.

---

## 6. Source-of-Truth Boundary

Page 047 may display governed operational signals.

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
Check-in status != Hours approved
Worker stopped moving != Worker inactive
No location != Worker absent
```

---

## 7. Employer Authorization

Live tracking access must be role-based and context-based.

Clarify:

```text
Organization access != Live-location access
Department access != Tracking authority
Scheduler != Safety investigator
```

Employers must not track workers assigned to unrelated residences, departments, or shifts.

---

## 8. Worker Privacy

Employers may see only minimum-necessary information.

Possible worker-visible data to employer:

- worker display name
- role
- assignment
- check-in status
- approximate or governed live location
- last update time
- tracking status
- support state

Do not expose:

- worker home address
- location before the approved pre-shift window
- location after the approved post-shift window
- unrelated travel
- historical personal movements
- precise background tracking where unnecessary
- banking, tax, health, complaint, dispute, or private document data

---

## 9. Location Precision

Represent configurable precision:

- status only
- arrival zone
- approximate area
- geofence state
- precise location only where explicitly governed

Clarify:

```text
More precise != More truthful
Precise location != Proof of work
```

Do not show precise coordinates unless the approved policy requires them.

---

## 10. Location Freshness

Every displayed location should conceptually show:

- last update time
- freshness state
- confidence
- source
- interruption reason where safe
- status disclaimer

Possible freshness labels:

- Current
- Recent
- Stale
- Unknown
- Unavailable

Do not display stale location as live.

---

## 11. Map Boundary

If a map is represented, it should show only:

- governed assignment location
- safe arrival zone
- authorized worker location where permitted
- location freshness
- high-level route or distance only where governed

Do not display:

- full worker travel history
- unrelated stops
- home address
- other workers
- residents or patients
- internal security-sensitive site details

Do not design route optimization.

---

## 12. Geofence Boundary

Represent conceptual geofence states:

- Outside arrival zone
- Entered arrival zone
- At workplace
- Left workplace
- Geofence unavailable
- Low-confidence result

Clarify:

```text
Inside geofence != Checked in
Outside geofence != Absent or misconduct
```

Geofence result must not automatically approve or reject attendance.

---

## 13. Check-In and Check-Out Boundary

Page 047 may display status from the governed attendance workflow.

It must not own:

- check-in evidence
- check-out evidence
- GPS evidence adjudication
- manual attendance correction
- approved hours
- timesheet review

Clarify:

```text
Check-in recorded != Attendance approved
Check-out recorded != Shift completed for payroll
```

---

## 14. Tracking Failure

Represent:

- location permission denied
- device offline
- low battery where governed
- GPS unavailable
- network unavailable
- stale update
- app closed
- service unavailable
- authorization expired

Each failure should show:

- safe reason category
- last known state
- whether attendance remains available
- employer action
- worker support path
- last update

Do not treat a tracking failure as misconduct.

---

## 15. Safety and Emergency Boundary

Clearly distinguish:

- operational delay
- contact needed
- safety concern
- emergency

Clarify:

```text
No location != Emergency
Support requested != Emergency service contacted
Tracking page != Emergency dispatch
```

For urgent danger, route users to the approved emergency procedure. Do not promise immediate response.

---

## 16. Incident Boundary

Page 047 may provide a governed entry point to:

- report operational issue
- request support
- open safety workflow
- document tracking failure

It must not display:

- allegation details
- reporter identity
- victim identity
- clinical information
- investigative notes
- internal fraud signals

Clarify:

```text
Incident reported != Misconduct proven
```

---

## 17. Tracking Consent and Notice

Where required, conceptually preserve:

- policy version
- notice provided
- consent or legal basis
- effective window
- withdrawal or limitation where permitted
- employer purpose
- worker acknowledgment
- audit history

Clarify:

```text
App permission != Legal consent
Consent != Unlimited tracking
Tracking policy != Permission to monitor outside the shift
```

Do not implement consent logic.

---

## 18. Historical Tracking Boundary

Page 047 focuses on live or current-shift status.

If historical data is represented, limit it to governed operational events:

- tracking started
- arrival zone entered
- check-in
- tracking interruption
- check-out
- tracking ended

Do not create a detailed movement timeline. Do not expose historical personal routes.

---

## 19. Notifications Boundary

Page 047 may display notification state only where already governed.

It must not own:

- push delivery
- SMS
- email
- alert scheduling
- provider logic
- emergency paging

Do not send notifications.

---

## 20. Messaging Boundary

Page 047 may provide a governed entry point to the assignment conversation.

It must not:

- create message threads
- expose personal phone or email
- send messages automatically
- treat message status as attendance confirmation

---

## 21. Fairness and Retaliation

Do not allow tracking data to penalize workers automatically for:

- GPS failure
- device failure
- low battery
- network interruption
- declining excessive tracking
- raising safety concerns
- disputing attendance
- requesting accessibility support

Clarify:

```text
Tracking interruption != Misconduct
Stale location != Absence
```

---

## 22. Auditability

Conceptually preserve audit events for:

- live-tracking access
- tracking start
- tracking stop
- precision change
- worker-location view
- support access
- tracking failure
- incident entry
- authorization denial

Include:

- actor
- role
- shift or assignment reference
- worker reference
- action
- purpose or case reference where available
- timestamp
- result

Do not place raw location history into broad logs.

---

## 23. AI Boundary

AI may:

- summarize visible operational status
- explain tracking states
- identify stale or missing updates
- suggest navigation
- help draft a support request

AI must not:

- infer misconduct
- infer productivity
- approve attendance
- declare absence
- predict worker intent
- expose precise location beyond policy
- continue tracking
- change precision
- contact emergency services
- fabricate location or arrival
- rank workers based on movement

The governed location and attendance records remain authoritative.

---

## 24. Information Architecture

### Desktop Structure

```text
Employer Shell
├── Header
│   ├── Live Shift Tracking
│   ├── Assignment reference
│   ├── Tracking window state
│   └── Privacy / authorization notice
│
├── Primary status panel
│   ├── Worker operational summary
│   ├── Assignment state
│   ├── Attendance state
│   ├── Tracking state
│   ├── Location freshness
│   └── Last update
│
├── Governed map / location panel
│   ├── Assignment location
│   ├── Arrival zone
│   ├── Authorized worker location where permitted
│   ├── Precision label
│   ├── Confidence label
│   └── Accessible non-map summary
│
├── Operational actions
│   ├── Open assignment
│   ├── Open conversation
│   ├── Request support
│   ├── Report tracking issue
│   └── Open attendance workflow
│
├── Right governance panel
│   ├── Tracking eligibility
│   ├── Tracking window
│   ├── Worker privacy
│   ├── Attendance boundary
│   ├── Safety / emergency boundary
│   ├── AI limitations
│   └── Audit notice
│
└── Current-shift event summary
    ├── Tracking started
    ├── Arrival zone entered
    ├── Check-in
    ├── Tracking interruption
    ├── Check-out
    └── Tracking ended
```

### Mobile Structure

```text
Live Shift Tracking
├── Assignment summary
├── Worker status
├── Tracking state
├── Location freshness
├── Check-in / check-out status
├── Last update
├── Map or zone where governed
├── Contact / support action
├── Tracking failure state
├── Privacy notice
└── Governance details collapsed
```

Avoid dense surveillance-style dashboards.

---

## 25. Empty and Error States

Include:

- no assigned worker
- tracking not authorized
- tracking not started
- location unavailable
- location stale
- permission denied
- device offline
- assignment cancelled
- check-in unavailable
- tracking ended
- support unavailable
- service unavailable

Do not fabricate live tracking.

---

## 26. Accessibility

Review:

- semantic status labels
- keyboard navigation
- accessible map alternative
- screen-reader-friendly location state
- no color-only tracking or attendance states
- readable timestamps
- accessible stale-location warnings
- focus management
- sufficient contrast
- plain-language privacy notices
- accessible support actions

---

## 27. International Readiness

Do not hardcode:

- tracking consent model
- lawful basis
- precision
- geofence policy
- tracking window
- employment model
- privacy terminology
- emergency process
- time format
- timezone
- location format
- device policy
- attendance model
- retention period

Keep jurisdiction, organization, residence, department, shift, tracking policy, locale, precision, and retention configurable.

---

## 28. Page 048 Boundary

Exact frozen Page 048 title:

```text
Page 048 — Attendance
```

Source:

- `docs/architecture/resident-job-platform/pages/PAGE_048_ATTENDANCE.md`
- `docs/architecture/resident-job-platform/wireframes/DESIGN_STATUS_MATRIX.md`

Page 047 owns:

```text
Live Shift Tracking
```

Page 048 owns:

```text
Attendance
```

Do not create Page 048 files.

---

## 29. Validation

Confirmed:

- Frozen title remains Live Shift Tracking.
- Pages 001-046 remain unchanged.
- Exact Page 048 frozen title identified as Attendance.
- No Page 048 files created.
- No approval record created.
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

## 30. Final Status

```text
Page 047 — Live Shift Tracking
Wireframe: COMPLETE
Product Review: PENDING
Approval Record: NOT CREATED
Owner Review: REQUIRED

Page 048 — Attendance
BLOCKED
```
