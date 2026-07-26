# Resident Job

## Page 047 - Live Shift Tracking Product Design Review Revision 1

**Reviewed Wireframe:** `PAGE_047_LIVE_SHIFT_TRACKING_WIREFRAME_REVISION_1.md`  
**Status:** Review Revision 1 Complete  
**Recommendation:** Approve as Wireframe v1.0  
**Implementation:** Not Started  
**Page 048:** Unblocked, not created

---

## 1. Executive Summary

Revision 1 resolves the documented owner conditions for Page 047. The Live Shift Tracking page now clearly governs tracking eligibility, authorized tracking windows, worker privacy, location precision, freshness, map/geofence boundaries, attendance separation, tracking failures, safety and incident boundaries, consent and notice, historical-data limits, fairness, auditability, AI boundaries, and readiness for Page 048 - Attendance.

The page remains a governed employer visibility surface for current-shift operational status. It does not become GPS implementation, geofence implementation, map integration, attendance approval, timesheet review, payroll, billing, messaging, notification delivery, emergency dispatch, incident adjudication, or AI tracking automation.

The page is now suitable to freeze as **APPROVED WIREFRAME v1.0**.

---

## 2. Resolved Conditions

### Tracking Eligibility

Resolved. Tracking requires employer authentication, authorized role, active assignment, worker acceptance, approved tracking basis, governed shift window, required notice or consent, and supported permission state.

Key boundary:

```text
Assigned != Tracking authorized
Tracking authorized != Location available
Location available != Location accurate
Location accurate != Attendance proven
```

### Tracking Window

Resolved. Not yet eligible, pre-shift window, active shift window, temporary interruption, checkout window, tracking ended, authorization expired, and unavailable are separate.

Key boundary:

```text
Scheduled shift != Tracking active
Check-out recorded != Tracking may continue
Shift ended != Location access remains authorized
```

### State Separation

Resolved. Assignment, attendance, tracking, location, and support states remain independent and cannot collapse into one "Live" or "Present" state.

### Source-of-Truth Boundary

Resolved. Page 047 displays operational signals only and is not authoritative for assignment, attendance approval, worked hours, shift completion, timesheets, payroll, billing, misconduct, or safety adjudication.

Key boundary:

```text
Location update != Attendance proof
Inside geofence != Checked in
Checked in != Hours approved
No location != Absent
Worker stopped moving != Inactive
```

### Worker Privacy

Resolved. Employers may see minimum-necessary data only. Home address, unrelated movements, historical personal routes, location outside the approved window, private identity documents, health information, complaints, disputes, banking or tax information, and unrelated work history are excluded.

### Location Precision

Resolved. Status only, arrival zone, approximate area, geofence state, and precise location only where explicitly required are separate configurable levels.

Key boundary:

```text
More precise != More reliable
Precise != Proof of work
```

### Freshness and Confidence

Resolved. Visible location states conceptually include last update time, freshness label, confidence level, source category, interruption reason where appropriate, and a plain-language disclaimer. Stale information cannot be displayed as live.

### Map Boundary

Resolved. Map representation is limited to governed workplace location, safe arrival zone, authorized worker location, freshness/confidence, and high-level operational context. It does not show route history, unrelated stops, home location, other workers, residents, patients, or sensitive internal details.

### Geofence Boundary

Resolved. Outside arrival zone, entered arrival zone, at workplace, left workplace, unavailable, and low confidence remain conceptual states.

Key boundary:

```text
Inside geofence != Checked in
Outside geofence != Absent
Geofence failure != Misconduct
```

### Attendance Boundary

Resolved. Page 047 may show only high-level attendance state and a governed handoff to Page 048 - Attendance.

Key boundary:

```text
Check-in event != Attendance approved
Check-out event != Shift completed for payroll
Tracking data != Final attendance record
```

### Tracking Failure

Resolved. Permission denied, device offline, low battery where governed, GPS unavailable, network unavailable, stale update, app closed, authorization expired, and service unavailable are non-punitive operational states.

### Safety and Incident Boundaries

Resolved. Routine delay, contact needed, safety concern, and emergency are separate. Page 047 is not emergency dispatch and does not adjudicate incidents.

### Consent and Notice

Resolved. Policy version, notice, lawful basis or consent, effective window, worker acknowledgment, permitted purpose, limitation or withdrawal where applicable, and audit history are conceptually preserved.

Key boundary:

```text
App permission != Legal consent
Consent != Unlimited tracking
Tracking policy != Authority outside the shift window
```

### Historical Data Boundary

Resolved. History is limited to governed operational events and does not include detailed route playback, continuous movement history, or broad historical surveillance.

### Fairness and Retaliation

Resolved. GPS failure, device failure, network interruption, low battery, declining excessive tracking, reporting safety concerns, disputing attendance, and requesting accessibility support cannot trigger automatic penalties.

### Auditability

Resolved. Tracking access, tracking start, tracking stop, precision change, location view, authorization denial, support access, failure state, and incident entry conceptually preserve actor, role, assignment or shift reference, worker reference, action, purpose or case reference, timestamp, and result.

### AI Boundary

Resolved. AI may summarize visible operational status, explain tracking states, identify stale updates, suggest navigation, and help draft support requests.

AI cannot infer misconduct, infer productivity, declare absence, approve attendance, predict worker intent, alter precision, continue tracking, contact emergency services, fabricate location, or rank workers based on movement.

---

## 3. Scoring

| Category | Score | Revision 1 Assessment |
| --- | ---: | --- |
| Tracking eligibility | 9.8 | Assignment alone cannot authorize tracking. |
| Tracking window | 9.8 | Tracking stops at the governed end condition. |
| State separation | 9.8 | Assignment, attendance, tracking, location, and support stay separate. |
| Authorization | 9.7 | Role and context access remain bounded. |
| Worker privacy | 9.8 | Minimum-necessary access is explicit. |
| Precision | 9.8 | Precision is configurable and not default-maximized. |
| Freshness | 9.8 | Stale information cannot appear live. |
| Map boundary | 9.7 | No route history, home location, or unrelated movement. |
| Geofence boundary | 9.8 | Geofence never determines attendance automatically. |
| Attendance separation | 9.9 | Page 048 fully owns Attendance. |
| Failure handling | 9.8 | Failures are non-punitive operational states. |
| Safety and incident boundaries | 9.7 | No emergency dispatch or incident adjudication. |
| Consent and notice | 9.7 | App permission and legal consent are separate. |
| Historical-data limits | 9.8 | No detailed route playback or broad surveillance. |
| Fairness | 9.8 | Tracking data cannot automatically penalize workers. |
| Auditability | 9.7 | Access and tracking events are conceptually auditable. |
| AI governance | 9.9 | AI cannot infer misconduct, approve attendance, or fabricate location. |
| Accessibility | 9.5 | Non-map alternatives and status labels are required in future design. |
| Mobile usability | 9.5 | Current-state-first structure is clear. |
| International readiness | 9.7 | Consent, precision, retention, time, and emergency policies remain configurable. |
| Consistency with Pages 041-046 | 9.7 | Continues from Assigned Worker without taking ownership. |
| Readiness for Page 048 | 9.8 | Attendance handoff is clean. |

**Overall Score:** 9.8

---

## 4. Remaining Risks

No wireframe-blocking risks remain.

Future design and engineering work must still define:

- exact tracking authorization policy
- precision rules by jurisdiction and organization
- live-location retention limits
- accessible map alternatives
- role-based access enforcement
- tracking-failure content language
- incident and safety escalation policy

These are future implementation/governance concerns, not Page 047 wireframe defects.

---

## 5. Approval Criteria Assessment

| Criterion | Result |
| --- | --- |
| Assignment does not automatically authorize tracking | Pass |
| Tracking is limited to the governed window | Pass |
| Stale location is never shown as live | Pass |
| Privacy and minimum-necessary access are preserved | Pass |
| Precision is configurable | Pass |
| Geofence never determines attendance automatically | Pass |
| Tracking failure is not treated as misconduct | Pass |
| Page 048 fully owns attendance | Pass |
| Safety and incident boundaries remain clear | Pass |
| Raw movement history is limited | Pass |
| Auditability is complete | Pass |
| AI cannot infer misconduct or approve attendance | Pass |
| No unresolved privacy, governance, operational, or compliance risk remains | Pass |

---

## 6. Recommendation

Approve Page 047 as:

```text
APPROVED WIREFRAME v1.0
```

Unblock Page 048 - Attendance as the next controlled gate.

Do not create Page 048 during this task.

---

## 7. Validation

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

## 8. Final Status

```text
Page 047 — Live Shift Tracking
Product Design Review Revision 1: COMPLETE
Recommendation: APPROVED WIREFRAME v1.0

Page 048 — Attendance
UNBLOCKED
NOT CREATED
```
