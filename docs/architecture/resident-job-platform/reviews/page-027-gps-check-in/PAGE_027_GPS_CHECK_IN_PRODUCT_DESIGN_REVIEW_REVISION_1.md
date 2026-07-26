# Page 027 - GPS Check In Product Design Review Revision 1

Status: Product Design Review Revision 1 complete
Epic: Epic 3 - Worker Portal
Page: 027 - GPS Check In
Wireframe reviewed: PAGE_027_GPS_CHECK_IN_WIREFRAME_REVISION_1.md
Architecture baseline: Resident Job Architecture Phase 1 v1.0
Epic planning baseline: Epic 3 Worker Portal Planning v1.0
Implementation: Not authorized

## 1. Executive Summary

Page 027 Revision 1 resolves the documented owner conditions. The revised wireframe now cleanly
separates device/location state, proximity state, and attendance/check-in state. It strengthens
informed permission, correct-shift confirmation, geofence fairness, configurable proximity rules,
accuracy handling, fallback governance, QR/code safety, offline truthfulness, duplicate handling,
material-change protection, employer visibility, staff access, data minimization, worker safety,
attendance boundaries, AI governance, accessibility, and mobile usability.

The page is ready to be approved as the baseline GPS Check In wireframe.

Recommendation:

```text
APPROVE AS APPROVED WIREFRAME v1.0
```

## 2. Condition Resolution Review

| Condition | Review finding | Status |
| --- | --- | --- |
| Three dimensions | Device/location, proximity, and attendance/check-in states are separate. | Resolved |
| State truthfulness | Location available, submitted, recorded, approved attendance, approved hours, and paid remain distinct. | Resolved |
| Informed location permission | Permission explanation precedes request and is explicit, event-specific, unbundled, and non-continuous. | Resolved |
| Correct shift confirmation | Assignment, employer, date, time, timezone, location, status, and material changes must be confirmed. | Resolved |
| Geofence fairness | Outside/near-boundary states are neutral and not treated as misconduct. | Resolved |
| Configurable proximity | Radius and rules remain policy/configuration-driven without exposing sensitive logic. | Resolved |
| Accuracy handling | Plain-language accuracy states, retry, safe open-area guidance, fallback, and support are included. | Resolved |
| Fallback governance | Fallback methods are configurable, assignment-specific, auditable, and not auto-approved. | Resolved |
| Fallback ownership | Authorized employer, scheduler, support, or platform operations review ownership is clarified. | Resolved |
| QR/code safety | Assignment/site/time-limited concepts are shown without reusable secrets or algorithms. | Resolved |
| Offline truthfulness | Saved-on-device, submitted, and recorded are separated; server confirmation is required. | Resolved |
| Duplicate handling | Duplicate, cross-device, stale, wrong-assignment, cancelled, and version-changed states are included. | Resolved |
| Early/late windows | Configurable windows are shown without penalties or automatic no-show/misconduct. | Resolved |
| Material changes | Check-in pauses where acknowledgement is required. | Resolved |
| Employer visibility | Before, recorded, and review-required visibility stages are separated. | Resolved |
| Platform access | Role-based, auditable, purpose-bound staff access is clarified. | Resolved |
| Data minimization | Exact location and continuous tracking are minimized; retention is not invented. | Resolved |
| Worker safety | Safe arrival, no device use while driving, unsafe access reporting, and escalation are included. | Resolved |
| Attendance/payroll boundary | Check-in does not edit/approve hours, calculate payroll, create payment, or complete shift. | Resolved |
| AI governance | AI cannot infer fraud, determine presence, approve/reject check-in, alter timestamps, expose location, approve hours, or create payroll. | Resolved |
| Accessibility/mobile | Mobile order and accessible state/error/fallback handling remain explicit. | Resolved |

## 3. Strengths

### 3.1 State Model Integrity

The revised page no longer risks collapsing device, proximity, and attendance states into a single
pass/fail experience.

### 3.2 Permission Trust

Location permission is presented as event-specific and worker-initiated. The page avoids continuous
tracking implications and provides fallback/support paths when permission is declined.

### 3.3 Fairness

The page explicitly avoids misconduct language for GPS uncertainty and provides fair explanations
for outside-area or near-boundary results.

### 3.4 Privacy and Access Control

Employer visibility is limited to staged operational status. Platform/support access is role-based,
auditable, and purpose-bound.

### 3.5 Clean Handoff to Page 028

Page 027 records or routes the check-in state only. It does not absorb check-out, attendance review,
approved hours, payroll, or payment.

## 4. Remaining Risks

No remaining risks block approval at wireframe level.

Future implementation and launch risks:

| Risk | Classification | Future control |
| --- | --- | --- |
| Device/proximity/check-in states may be merged in code | Implementation risk | Preserve independent state model. |
| Location permission may be requested too early | Privacy risk | Enforce worker-initiated event-specific permission. |
| Offline queue may misrepresent success | UX/implementation risk | Require authoritative confirmation before recorded status. |
| Geofence details may be overexposed | Security risk | Keep sensitive proximity logic internal. |
| Employer view may overexpose location data | Privacy risk | Enforce staged employer visibility. |
| AI language may sound accusatory | AI governance risk | Use neutral explanation and support-routing only. |

These are implementation and launch-governance risks, not wireframe defects.

## 5. Scorecard

| Category | Score |
| --- | ---: |
| Check-in state separation | 9.8 |
| Informed permission | 9.8 |
| Shift identity | 9.8 |
| Geofence fairness | 9.8 |
| Accuracy handling | 9.7 |
| Fallback governance | 9.7 |
| QR/code safety | 9.6 |
| Offline truthfulness | 9.8 |
| Duplicate handling | 9.7 |
| Early/late window clarity | 9.7 |
| Material-change protection | 9.8 |
| Employer visibility | 9.7 |
| Platform access | 9.7 |
| Privacy and retention | 9.8 |
| Attendance boundary | 9.8 |
| Worker safety | 9.7 |
| AI governance | 9.8 |
| Mobile usability | 9.7 |
| Accessibility | 9.7 |
| International readiness | 9.7 |
| Consistency with Pages 016-026 | 9.8 |
| Handoff to Page 028 | 9.7 |
| Overall score | 9.8 |

## 6. Governance Review

| Governance area | Result |
| --- | --- |
| Frozen title remains GPS Check In | Pass |
| Architecture Freeze unchanged | Pass |
| Epic 3 Planning unchanged | Pass |
| UX Foundation unchanged | Pass |
| Navigation unchanged | Pass |
| Pages 016-026 unchanged | Pass |
| EPIC_3_MID_ARCHITECTURE_REVIEW.md unchanged | Pass |
| No Page 028 files created | Pass |
| No implementation started | Pass |
| No React/frontend/backend/API/database work | Pass |
| No GPS integration created | Pass |
| No geofence implementation created | Pass |
| No attendance implementation created | Pass |
| No payroll implementation created | Pass |
| Unrelated app changes untouched | Pass |

## 7. Approval Recommendation

Page 027 satisfies the approval rule:

- Device, proximity, and attendance states remain independent.
- Consent is explicit.
- No continuous tracking is implied.
- Outside-geofence is not treated as misconduct.
- Fallback check-in is governed.
- Offline states do not claim premature success.
- Exact location is minimized.
- Material changes protect the worker.
- Employer access is limited.
- AI cannot infer fraud or approve attendance.
- Page 027 does not absorb hours, payroll, or payment.
- No privacy, fairness, safety, or operational risk remains at wireframe level.

## 8. Final Review Status

```text
Page 027 - GPS Check In
Product Review Revision 1: COMPLETE
Recommendation: APPROVE AS APPROVED WIREFRAME v1.0

Page 028
May be unblocked only after the approval record is created.
```
