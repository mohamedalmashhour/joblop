# Resident Job

## Page 046 - Assigned Worker Product Design Review Revision 1

**Reviewed Wireframe:** `PAGE_046_ASSIGNED_WORKER_WIREFRAME_REVISION_1.md`  
**Status:** Review Revision 1 Complete  
**Recommendation:** Approve as Wireframe v1.0  
**Implementation:** Not Started  
**Page 047:** Unblocked, not created

---

## 1. Executive Summary

Revision 1 resolves the documented owner conditions for Page 046. The Assigned Worker page now clearly governs assignment visibility, assignment lifecycle, worker confirmation, privacy, qualification boundaries, shift-change governance, cancellation, replacement, auditability, AI boundaries, and the handoff to Page 047 - Live Shift Tracking.

The page remains a governed employer visibility surface. It does not become the assignment engine, replacement engine, live-tracking page, GPS page, attendance workflow, timesheet page, payroll page, billing page, notification system, messaging system, or AI automation surface.

The page is now suitable to freeze as **APPROVED WIREFRAME v1.0**.

---

## 2. Resolved Conditions

### Assignment Lifecycle

Resolved. Assignment requested, assignment created, worker notified, worker response pending, accepted, declined, expired, confirmed, cancelled, replaced, and closed remain separate.

Key boundary:

```text
Assigned != Notified
Notified != Accepted
Accepted != Present
Present != Shift completed
Shift completed != Timesheet approved
```

### Worker Confirmation Truthfulness

Resolved. Notification state, response state, confirmation state, and attendance state are independent.

Key boundary:

```text
Notification delivered != Worker viewed
Worker viewed != Worker accepted
Worker accepted != Worker arrived
```

No fabricated read receipts, confirmations, acceptance, arrival, or attendance evidence is introduced.

### Privacy

Resolved. Employers see only minimum necessary operational information. Banking information, tax information, private identity documents, full background-check details, protected complaints, private disputes, internal investigations, health information, unrelated earnings, private home address, and precise location outside governed tracking or attendance scope are excluded.

### Qualification Boundary

Resolved. Requirement, submitted document, verified credential, current credential, expired credential, and review required remain separate.

Key boundary:

```text
Document uploaded != Credential verified
Credential verified != Attendance confirmed
Assignment created != Credential remains valid forever
```

Page 046 does not own qualification verification.

### Shift-Change Governance

Resolved. Changes after assignment are governed through proposed change, notification, acknowledgment pending, accepted, declined, review required, and original terms preserved.

Key boundary:

```text
Employer changed shift != Worker accepted changed terms
```

Accepted terms cannot be silently overwritten.

### Cancellation Governance

Resolved. Cancellation requested, review pending, cancellation effective, cancellation disputed, compensation review, and closed remain separate.

Key boundary:

```text
Cancellation requested != Cancelled
Worker cancellation != Misconduct
Cancelled assignment != Automatic loss of earned compensation
```

### Replacement Governance

Resolved. Replacement requested, original assignment still active, candidate review, replacement selected, replacement assignment created, original assignment released, replacement failed, and support required remain separate.

Key boundary:

```text
Replacement requested != Original worker removed
Replacement selected != Replacement assigned
Replacement assigned != Original assignment safely closed
```

No automatic replacement is introduced.

### Live Shift Tracking Boundary

Resolved. Page 046 only provides a high-level governed entry point to Page 047. It does not own GPS tracking, live map, route monitoring, location refresh, geofence evaluation, arrival prediction, attendance evidence, or location alerts.

Key boundary:

```text
Assigned worker != Live-tracked worker
Tracking available != Tracking consent or authorization established
```

### Attendance Boundary

Resolved. Page 046 may show not started, check-in available, checked in, checked out, attendance review required, or unavailable. It does not approve hours or payroll.

Key boundary:

```text
Checked in != Worked full shift
Checked out != Approved hours
Attendance state != Payroll result
```

### Financial Boundary

Resolved. Displayed shift rate, premium, travel allowance, employer estimate, worked earnings, payroll result, and invoice result remain separate.

Key boundary:

```text
Displayed rate != Final payroll
Premium listed != Premium earned
Cancelled assignment != No compensation due
```

### Auditability

Resolved. Assignment creation, worker notification, worker response, term changes, cancellation, replacement, support intervention, and attendance handoff conceptually preserve actor, role, timestamp, action, assignment reference, prior state, requested state, resulting state, and reason where applicable.

### AI Boundary

Resolved. AI may summarize visible assignment state, explain pending actions, identify missing confirmation, identify visible credential expiry, suggest navigation, and help draft support messages.

AI may not assign workers, replace workers, cancel assignments, alter accepted terms, determine misconduct, approve attendance, calculate compensation, rank replacement candidates, expose restricted information, or fabricate worker acceptance or arrival.

---

## 3. Scoring

| Category | Score | Revision 1 Assessment |
| --- | ---: | --- |
| Assignment lifecycle governance | 9.8 | Assignment lifecycle states are independent and truthful. |
| Worker confirmation truthfulness | 9.8 | Notification, response, confirmation, and attendance remain separate. |
| Worker privacy | 9.8 | Employer visibility is minimum necessary. |
| Qualification boundary | 9.7 | Page 046 displays context but does not verify qualifications. |
| Shift-change governance | 9.7 | Accepted terms cannot be silently overwritten. |
| Cancellation governance | 9.6 | Neutral, governed, and non-punitive. |
| Replacement governance | 9.6 | Replacement is not automatic and original assignment remains protected. |
| Live-tracking boundary | 9.8 | Page 047 owns Live Shift Tracking. |
| Attendance boundary | 9.7 | Attendance is handoff only; no hours approval. |
| Financial boundary | 9.7 | Rate context is not payroll, billing, or settlement. |
| Auditability | 9.7 | Assignment events preserve required audit context conceptually. |
| AI governance | 9.9 | AI cannot assign, replace, cancel, approve attendance, or fabricate state. |
| Accessibility | 9.5 | State labels, action groups, and mobile hierarchy remain accessible. |
| Mobile usability | 9.5 | Priority answers are clear and governance detail can collapse. |
| International readiness | 9.6 | No country-specific employment, cancellation, tracking, or compensation model. |
| Consistency with Pages 041-045 | 9.7 | Clean continuation from shift creation, AI suggestions, and applicant review. |
| Readiness for Page 047 | 9.8 | Live Shift Tracking has a clean handoff. |

**Overall Score:** 9.7

---

## 4. Remaining Risks

No wireframe-blocking risks remain.

Future design and engineering work must still define:

- exact live-tracking authorization rules
- assignment history filtering
- support escalation language
- cancellation and replacement notification copy
- role-specific employer permissions
- high-fidelity mobile density controls

These are future implementation/governance concerns, not Page 046 wireframe defects.

---

## 5. Approval Criteria Assessment

| Criterion | Result |
| --- | --- |
| Assignment and confirmation states remain independent | Pass |
| Worker privacy is preserved | Pass |
| Qualifications remain outside Page 046 ownership | Pass |
| Accepted terms cannot be silently changed | Pass |
| Cancellation remains governed | Pass |
| Replacement remains non-automatic | Pass |
| Page 047 owns live tracking | Pass |
| Attendance and financial boundaries remain clear | Pass |
| Auditability is complete | Pass |
| AI cannot make assignment or attendance decisions | Pass |
| No governance, privacy, operational, or financial risk remains | Pass |

---

## 6. Recommendation

Approve Page 046 as:

```text
APPROVED WIREFRAME v1.0
```

Unblock Page 047 - Live Shift Tracking as the next controlled gate.

Do not create Page 047 during this task.

---

## 7. Validation

Confirmed:

- Frozen title remains Assigned Worker.
- Pages 001-045 remain frozen.
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

## 8. Final Status

```text
Page 046 — Assigned Worker
Product Design Review Revision 1: COMPLETE
Recommendation: APPROVED WIREFRAME v1.0

Page 047 — Live Shift Tracking
UNBLOCKED
NOT CREATED
```
