# Page 027 - GPS Check In Product Design Review

Status: Product Design Review complete
Epic: Epic 3 - Worker Portal
Page: 027 - GPS Check In
Wireframe reviewed: PAGE_027_GPS_CHECK_IN_LOW_FIDELITY_WIREFRAME.md
Architecture baseline: Resident Job Architecture Phase 1 v1.0
Epic planning baseline: Epic 3 Worker Portal Planning v1.0
Implementation: Not authorized

## 1. Executive Summary

Page 027 creates a careful GPS Check In experience that treats attendance evidence, location
permission, privacy, fallback review, and worker safety as governed UX concerns. It avoids the main
risks of a GPS check-in flow: silent tracking, automatic check-in, unfair outside-geofence
judgments, overexposure of precise location, premature offline confirmation, and AI attendance
decisions.

The page is strong enough for owner review, but it should not be approved automatically. Two
conditions should be clarified before it becomes Approved Wireframe v1.0.

Recommendation:

```text
APPROVE WITH CONDITIONS
```

## 2. Strengths

### 2.1 Attendance Lifecycle Separation

The page clearly separates accepted shift, arrival window, worker-initiated check-in, validation,
recorded or review-required states, future check-out, attendance review, approved hours, and payroll.

### 2.2 Location Permission Honesty

The page explains why location is requested, what is collected, when it is collected, who may see
the result, what happens if permission is declined, and that consent is explicit rather than bundled.

### 2.3 Data Minimization

The UX prefers operationally necessary data: timestamp, validation result, approximate distance,
accuracy range, review status, and fallback status. It avoids employer-facing exact coordinates and
continuous location.

### 2.4 Fair Geofence Treatment

Outside-radius and low-accuracy states are not treated as misconduct. The page provides retry,
fallback, support, and review paths.

### 2.5 Worker Safety

The mobile design includes safe-driving guidance and avoids requiring device interaction while
operating a vehicle.

## 3. Weaknesses

### 3.1 Employer Visibility Needs a More Explicit Before/During/After Split

The wireframe lists employer-visible operational status, but it should more explicitly stage what
an employer may see before check-in, after recorded check-in, and while review is required.

### 3.2 Fallback Evidence Needs More Review Ownership Clarity

Fallback options are appropriately governed, but the page should clarify who reviews fallback
evidence: employer, scheduler, support, or platform operations depending on approved rules.

## 4. Risk Review

| Risk | Severity | Review finding |
| --- | --- | --- |
| Continuous tracking implied | Critical | Avoided. Page states event-specific collection only. |
| Permission bundled or implied | Critical | Avoided. Permission is worker-initiated and explicit. |
| Automatic check-in | Critical | Avoided. Worker must initiate and confirm. |
| Exact coordinates exposed | High | Avoided for employers by default. |
| Outside geofence treated as misconduct | High | Avoided. Fair review language is included. |
| Fallback auto-approved | High | Avoided. Fallback creates governed review where necessary. |
| Check-in approves hours | High | Avoided. Check-in does not approve hours, payroll, or payment. |
| Offline submission appears confirmed | High | Avoided. Pending submission is labeled not confirmed. |
| Material changes ignored | High | Avoided. Check-in pauses where acknowledgement is required. |
| AI decides attendance | Critical | Avoided. AI cannot infer fraud, decide presence, or approve attendance. |

## 5. Required Improvements

Before Page 027 becomes Approved Wireframe v1.0, revise the wireframe to address:

1. **Employer Visibility Staging**
   - Clearly separate employer-visible information before check-in, after check-in is recorded,
     and when check-in is under review.

2. **Fallback Review Ownership**
   - Clarify that fallback evidence is reviewed by authorized employer, scheduler, support, or
     platform operations actors according to approved rules and permissions.

These refinements are controlled UX clarifications and do not require architecture changes.

## 6. Scorecard

| Category | Score |
| --- | ---: |
| Attendance lifecycle separation | 9.7 |
| Shift identity clarity | 9.6 |
| Check-in window clarity | 9.6 |
| Informed location permission | 9.8 |
| Data minimization | 9.7 |
| Proximity-state clarity | 9.6 |
| Geofence fairness | 9.8 |
| GPS accuracy handling | 9.6 |
| Fallback governance | 9.3 |
| QR/code safety | 9.4 |
| Successful-check-in truthfulness | 9.7 |
| Review-required language | 9.7 |
| Late check-in | 9.5 |
| Employer visibility | 9.2 |
| Platform/support visibility | 9.5 |
| Privacy and retention | 9.6 |
| Offline handling | 9.6 |
| Duplicate prevention | 9.5 |
| Material-change protection | 9.7 |
| Safety | 9.6 |
| AI governance | 9.8 |
| Mobile usability | 9.6 |
| Desktop limitations | 9.5 |
| Accessibility | 9.6 |
| International readiness | 9.7 |
| Consistency with Pages 016-026 | 9.7 |
| Handoff to future check-out workflow | 9.5 |
| Overall score | 9.6 |

## 7. Governance Review

| Requirement | Result |
| --- | --- |
| Frozen title remains GPS Check In | Pass |
| Architecture Freeze unchanged | Pass |
| Epic 3 Planning unchanged | Pass |
| Pages 016-026 unchanged | Pass |
| No Page 028 files created | Pass |
| No implementation started | Pass |
| No React/frontend/backend/API/database work | Pass |
| No GPS integration created | Pass |
| No geofence implementation created | Pass |
| No attendance implementation created | Pass |
| No payroll implementation created | Pass |
| Unrelated app changes untouched | Pass |

## 8. Recommendation

```text
APPROVE WITH CONDITIONS
```

The page is privacy-aware, operationally clear, and consistent with the Worker Portal. The two
documented clarifications should be resolved before creating the Page 027 approval record.

## 9. Final Review Status

```text
Page 027 - GPS Check In
Wireframe: COMPLETE
Product Review: COMPLETE
Approval Record: NOT CREATED
Owner Review: REQUIRED

Page 028
BLOCKED
```
