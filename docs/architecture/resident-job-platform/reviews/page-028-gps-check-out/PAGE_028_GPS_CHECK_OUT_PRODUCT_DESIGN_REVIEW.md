# Page 028 - GPS Check Out Product Design Review

Status: Product Design Review complete
Epic: Epic 3 - Worker Portal
Page: 028 - GPS Check Out
Wireframe reviewed: PAGE_028_GPS_CHECK_OUT_LOW_FIDELITY_WIREFRAME.md
Architecture baseline: Resident Job Architecture Phase 1 v1.0
Epic planning baseline: Epic 3 Worker Portal Planning v1.0
Implementation: Not authorized

## 1. Executive Summary

Page 028 creates a focused GPS Check Out experience for ending an active shift while preserving the
boundaries between checkout, attendance review, hours approval, payroll, and payment. It follows the
privacy model established in Page 027 and avoids continuous tracking, unnecessary coordinate
exposure, GPS-only misconduct inference, and premature payroll language.

The page is strong enough for owner review, but should not be approved automatically. Two conditions
should be clarified before it becomes Approved Wireframe v1.0.

Recommendation:

```text
APPROVE WITH CONDITIONS
```

## 2. Strengths

### 2.1 Checkout Lifecycle

The page clearly separates checked-in, working, checkout initiated, validation, submitted, recorded,
attendance review, hours approval, payroll, and payment.

### 2.2 GPS Privacy

The page reuses the Page 027 privacy posture: explicit worker action, no continuous tracking,
minimal location collection, role-based visibility, and fair geofence handling.

### 2.3 Fallback Governance

Fallback checkout methods are presented as configurable concepts and do not appear automatically
approved.

### 2.4 Payroll Separation

The page repeatedly clarifies that checkout recorded is not attendance approval, approved hours,
payroll, overtime approval, or payment.

### 2.5 Worker Safety

The page reminds the worker to finish work safely, avoid device use while driving, and report unsafe
departure conditions.

## 3. Weaknesses

### 3.1 Overtime / Stay-Late Path Needs Stronger Governance

The wireframe mentions employer asked worker to stay late, but should more clearly separate checkout
from overtime approval. It should show that staying late may require governed approval or later
review and does not automatically approve overtime pay.

### 3.2 Missing Check-In State Needs More Detail

The page includes "no active check-in found," but should clarify worker next actions for this case:
contact support, provide evidence, or use a governed correction path. It should not allow checkout
to fabricate a missing check-in.

## 4. Risk Review

| Risk | Severity | Review finding |
| --- | --- | --- |
| Checkout approves attendance | High | Avoided. Checkout is not attendance approval. |
| Checkout approves hours/payroll | High | Avoided. Hours, payroll, and payment are future workflows. |
| Continuous tracking implied | Critical | Avoided. Page states event-specific collection only. |
| Exact coordinates overexposed | High | Avoided for employers by default. |
| GPS failure treated as misconduct | High | Avoided. Neutral review-required language is used. |
| Fallback auto-approved | Medium | Avoided. Fallback submitted is not automatically approved. |
| Offline checkout appears recorded | High | Avoided. Pending and recorded states are separated. |
| Duplicate checkout creates duplicate attendance | High | Avoided conceptually through authoritative current state. |
| Overtime implied by late checkout | Medium | Needs stronger clarification in Revision 1. |
| Missing check-in fabricated by checkout | Medium | Needs stronger clarification in Revision 1. |

## 5. Required Improvements

Before Page 028 becomes Approved Wireframe v1.0, revise the wireframe to address:

1. **Stay-Late / Overtime Governance**
   - Clarify that late checkout or employer request to stay late does not automatically approve
     overtime, extra hours, payroll, or payment.
   - Show a governed review path for extra time where applicable.

2. **No Active Check-In Found**
   - Add a safe correction path if no active check-in is found.
   - Clarify checkout cannot fabricate or backfill check-in automatically.

These refinements are controlled UX clarifications and do not require architecture changes.

## 6. Scorecard

| Category | Score |
| --- | ---: |
| Checkout lifecycle | 9.6 |
| GPS privacy | 9.7 |
| Fallback governance | 9.5 |
| Attendance separation | 9.7 |
| Payroll separation | 9.6 |
| Employer visibility | 9.5 |
| Platform/support visibility | 9.4 |
| Worker safety | 9.6 |
| AI governance | 9.6 |
| Offline handling | 9.5 |
| Duplicate handling | 9.4 |
| Material/status protection | 9.4 |
| Mobile usability | 9.6 |
| Accessibility | 9.5 |
| International readiness | 9.6 |
| Consistency with Pages 016-027 | 9.7 |
| Handoff to Page 029 Timesheet | 9.5 |
| Overall score | 9.5 |

## 7. Governance Review

| Requirement | Result |
| --- | --- |
| Frozen title remains GPS Check Out | Pass |
| Architecture Freeze unchanged | Pass |
| Epic 3 Planning unchanged | Pass |
| Pages 016-027 unchanged | Pass |
| No Page 029 files created | Pass |
| No implementation started | Pass |
| No React/frontend/backend/API/database work | Pass |
| No GPS integration created | Pass |
| No attendance implementation created | Pass |
| No payroll implementation created | Pass |
| Unrelated app changes untouched | Pass |

## 8. Recommendation

```text
APPROVE WITH CONDITIONS
```

The page is operationally clear and consistent with the worker attendance flow. The two documented
conditions should be resolved before creating the Page 028 approval record.

## 9. Final Review Status

```text
Page 028 - GPS Check Out
Wireframe: COMPLETE
Product Review: COMPLETE
Approval Record: NOT CREATED
Owner Review: REQUIRED

Page 029
BLOCKED
```
