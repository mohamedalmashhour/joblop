# Resident Job

## Page 047 - Live Shift Tracking Product Design Review

**Wireframe Reviewed:** `PAGE_047_LIVE_SHIFT_TRACKING_LOW_FIDELITY_WIREFRAME.md`  
**Status:** Product Design Review Complete  
**Recommendation:** Approved With Documented Conditions  
**Approval Record:** Not Created  
**Page 048:** Blocked

---

## 1. Executive Summary

Page 047 successfully frames Live Shift Tracking as a governed, minimum-necessary operational visibility page for authorized employer users during an approved shift window.

The wireframe avoids continuous surveillance, does not expose private or unrelated worker movement, does not treat location as proof of work, and does not become attendance approval, timesheets, payroll, billing, emergency dispatch, incident adjudication, notification delivery, messaging, GPS implementation, or AI automation.

The page is ready for owner review.

---

## 2. Strengths

- Tracking eligibility requires a governed basis and does not start from assignment alone.
- Tracking window states prevent permanent or background-tracking assumptions.
- Assignment, attendance, tracking, location, and support states remain independent.
- Source-of-truth boundaries prevent location from becoming attendance proof.
- Employer authorization is role-based and context-based.
- Worker privacy limits visibility to minimum necessary assignment status.
- Location precision is configurable and does not imply greater truthfulness.
- Freshness labels prevent stale location from being shown as live.
- Map and geofence boundaries avoid route history and automatic attendance conclusions.
- Tracking failures are handled as operational states, not misconduct.
- Safety and incident entry points are separated from emergency dispatch and adjudication.
- Consent and notice concepts remain governed without implementation.
- Historical tracking is limited to operational events, not movement history.
- Messaging and notification are entry points only.
- Fairness and retaliation protections are explicit.
- Auditability exists conceptually without broad raw-location logging.
- AI cannot infer misconduct, approve attendance, declare absence, fabricate location, or contact emergency services.
- Exact frozen Page 048 title is identified as Attendance.

---

## 3. Weaknesses

- Live tracking is inherently sensitive, so future high-fidelity design must avoid visual patterns that feel like surveillance.
- Map views need an accessible non-map alternative.
- Tracking failure and safety states require careful copy so employers do not overreact to ordinary device or network issues.
- Role-based access will need strict engineering controls later; the wireframe can only define the UX boundary.

---

## 4. Risk Review

### Surveillance Risk

Low. Tracking is constrained to governed shift context, window, policy, and authorization.

### Privacy Risk

Low. Worker home address, unrelated movement, historical routes, private documents, health, banking, tax, complaints, disputes, and precise background tracking are excluded.

### Attendance Boundary Risk

Low. Location, geofence, check-in, and checkout signals do not approve attendance or hours.

### Misconduct Inference Risk

Low. No location, stale location, stopped movement, tracking interruption, device failure, or low battery cannot automatically imply absence or misconduct.

### Emergency Boundary Risk

Low. The page is not emergency dispatch and does not promise immediate response.

### AI Governance Risk

Low. AI is limited to explanation, summary, stale-update identification, navigation, and support drafting.

---

## 5. Scoring

| Category | Score | Notes |
| --- | ---: | --- |
| Tracking eligibility | 9.7 | Governed basis is explicit. |
| Tracking-window governance | 9.8 | No permanent or background tracking implied. |
| State separation | 9.8 | Assignment, attendance, tracking, location, and support are independent. |
| Source-of-truth clarity | 9.7 | Location is not attendance proof. |
| Employer authorization | 9.6 | Role/context visibility is clearly bounded. |
| Worker privacy | 9.8 | Minimum-necessary disclosure is strong. |
| Location precision | 9.7 | Precision is configurable and policy-bound. |
| Freshness truthfulness | 9.8 | Stale location cannot appear live. |
| Map and geofence boundaries | 9.6 | No movement history or automatic attendance conclusion. |
| Attendance boundary | 9.8 | Page 048 owns Attendance. |
| Tracking-failure handling | 9.7 | Failures are non-punitive and operational. |
| Safety and incident boundaries | 9.6 | Support and incident entry points do not adjudicate. |
| Consent and notice | 9.6 | Consent is conceptual and policy-bound. |
| Historical-data limitation | 9.7 | Operational event summary only. |
| Fairness | 9.8 | Tracking data cannot automatically penalize workers. |
| Auditability | 9.6 | Access and tracking events are conceptually auditable. |
| AI governance | 9.9 | AI cannot infer misconduct, approve attendance, or fabricate location. |
| Mobile usability | 9.4 | Status-first mobile flow is clear. |
| Accessibility | 9.4 | Requires accessible map alternative in future design. |
| International readiness | 9.7 | Consent, precision, time, emergency, and retention remain configurable. |
| Consistency with Pages 041-046 | 9.7 | Clean continuation from Assigned Worker. |
| Readiness for Page 048 | 9.8 | Attendance handoff is explicit. |

**Overall Score:** 9.7

---

## 6. Required Owner Review Conditions

The page should remain at owner-review status until these points are accepted:

1. Confirm that assignment does not automatically enable tracking.
2. Confirm that tracking does not continue outside the governed window.
3. Confirm that stale, unavailable, or missing location is never treated as live, absence, emergency, or misconduct.
4. Confirm that geofence state does not approve or reject attendance.
5. Confirm that precise location is only shown where policy permits.
6. Confirm that movement history is not broadly available.
7. Confirm that tracking failures cannot trigger automatic penalties.
8. Confirm that staff access is conceptually auditable.
9. Confirm that AI cannot infer misconduct, approve attendance, or fabricate location.
10. Confirm that Page 048 - Attendance remains the next frozen workflow.

These are owner-review conditions, not architecture defects.

---

## 7. Non-Blocking Design Debt

- Future high-fidelity design should test whether map-first or status-first layout creates better trust.
- Future implementation planning should define exact precision modes and policy controls.
- Future accessibility review should validate non-map alternatives for all location states.
- Future content review should standardize neutral copy for stale, unavailable, and failed tracking states.
- Future Page 048 design should define how Attendance consumes tracking signals without rewriting tracking history.

No new entry was required in the central design debt register during this low-fidelity gate.

---

## 8. Validation

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

## 9. Final Status

```text
Page 047 — Live Shift Tracking
Wireframe: COMPLETE
Product Review: COMPLETE
Approval Record: NOT CREATED
Owner Review: REQUIRED

Page 048 — Attendance
BLOCKED
```
