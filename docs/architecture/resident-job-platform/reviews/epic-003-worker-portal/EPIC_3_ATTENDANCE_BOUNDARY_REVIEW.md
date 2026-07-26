# Resident Job

## Epic 3 Attendance & Payroll Boundary Review

**Epic:** Epic 3 - Worker Portal  
**Review Scope:** Pages 023-028  
**Review Type:** Attendance lifecycle, payroll boundary, and operational fairness review  
**Status:** COMPLETE  
**Review date:** 2026-07-22  
**Final Status:** READY FOR PAGE 029 - Timesheet  
**Implementation:** Not authorized

---

## 1. Executive Summary

Pages 023-028 form a coherent pre-timesheet attendance baseline. The flow moves from discovery to
shift details, application, accepted commitment, check-in evidence, and check-out evidence without
collapsing governed concepts.

No critical blocker was found. Page 029 - Timesheet may proceed as the next controlled gate.

The key strength is boundary discipline:

- Search does not assign.
- Shift Details does not apply, assign, or calculate payroll.
- Apply does not create employment or attendance.
- Accepted Shift does not check in, approve hours, or cancel automatically.
- GPS Check In records or routes a check-in event only.
- GPS Check Out records or routes a checkout event only.
- No approved page creates payroll, payment, invoice, or dispute decisions.

Page 029 must preserve this architecture by treating GPS check-in/out as evidence inputs, not as
approved hours or payroll-ready truth.

---

## 2. Scope Reviewed

| Page | Name | Frozen Status | Domain Responsibility |
| --- | --- | --- | --- |
| 023 | Search Shifts | Approved Wireframe v1.0 | Worker-facing discovery of shift opportunities |
| 024 | Shift Details | Approved Wireframe v1.0 | Authoritative worker-facing shift record before application |
| 025 | Apply | Approved Wireframe v1.0 | Worker application submission only |
| 026 | Accepted Shift | Approved Wireframe v1.0 | Accepted or confirmed commitment preparation |
| 027 | GPS Check In | Approved Wireframe v1.0 | Worker-initiated check-in event evidence |
| 028 | GPS Check Out | Approved Wireframe v1.0 | Worker-initiated checkout event evidence |

No Page 029 wireframe, review, approval record, or implementation artifact was created during this
review.

---

## 3. Lifecycle Continuity

Reviewed lifecycle:

```text
Search
↓
Details
↓
Apply
↓
Accepted
↓
GPS Check In
↓
GPS Check Out
↓
Timesheet
```

### Assessment

The transitions are clear and controlled.

| Transition | Assessment |
| --- | --- |
| Search -> Details | Clear. Search exposes opportunity summaries and routes to the full shift record. |
| Details -> Apply | Clear. Viewing a shift is separated from applying. |
| Apply -> Accepted | Clear. Application, employer review, selection, offer, and worker acceptance are independent. |
| Accepted -> GPS Check In | Clear. Accepted Shift prepares for attendance but cannot check in. |
| GPS Check In -> GPS Check Out | Clear. Check-in starts attendance evidence but does not approve hours. |
| GPS Check Out -> Timesheet | Clear. Checkout records evidence and hands off to future review. |

### Finding

No missing transition blocks Page 029. The Timesheet page should explicitly receive evidence from
Pages 027-028 while preserving review, correction, and approval boundaries.

---

## 4. Operational Boundaries

Required concepts remain separate.

| Concept | Owning Stage | Boundary Result |
| --- | --- | --- |
| Application | Page 025 | Worker applies only; no assignment or employment is created. |
| Assignment | Future employer/assignment workflow + Page 026 summary | Not created by search, details, or apply. |
| Acceptance | Page 026 | Accepted commitment is separated from arrival and attendance. |
| Attendance | Pages 027-028 as evidence events | Check-in/out evidence is not attendance approval. |
| Attendance Review | Future Page 029+ workflow | Not absorbed by GPS pages. |
| Approved Hours | Future Timesheet/Approval workflow | Not created by accepted shift, check-in, or checkout. |
| Payroll | Future finance/payroll workflow | Not created by any page in scope. |
| Payment | Future payment workflow | Not created or guaranteed by any page in scope. |
| Invoice | Future employer finance workflow | Not exposed to worker GPS/attendance pages. |
| Dispute | Future review/support workflow | Fallback and correction paths route to review without deciding disputes. |

### Finding

No reviewed page merges two governed concepts. Page 029 must preserve the same pattern by treating
timesheet as a reviewable work record, not payroll.

---

## 5. Time Ownership

Time concepts are clearly staged.

| Time Type | Current Owner / Source | Review Finding |
| --- | --- | --- |
| Scheduled time | Shift Details / Accepted Shift | Worker-facing schedule is shown, but does not equal worked time. |
| Actual check-in | GPS Check In | Event evidence only; does not approve attendance. |
| Actual checkout | GPS Check Out | Event evidence only; does not approve attendance or hours. |
| Elapsed time | Future Timesheet | Can be derived later but is not approved by GPS pages. |
| Worked time | Future Timesheet / Attendance Review | Requires review and correction paths. |
| Approved hours | Future authorized approval workflow | Must remain separate from GPS events and worker submission. |
| Payroll hours | Future payroll workflow | Must remain downstream of approved hours and business rules. |

### Recommendation

High: Page 029 should include a time-source table that distinguishes scheduled time, check-in time,
checkout time, worker-reported corrections, employer-reviewed time, approved hours, and payroll
hours.

This is not a blocker because the current pages already preserve the distinction.

---

## 6. Financial Boundaries

Financial separation is preserved.

| Boundary | Result | Notes |
| --- | --- | --- |
| GPS pages cannot influence payroll | Pass | Pages 027-028 explicitly do not approve hours, payroll, or payment. |
| Accepted Shift cannot approve hours | Pass | Page 026 prepares for attendance only. |
| Shift Details cannot calculate final compensation | Pass | Page 024 shows worker-facing compensation state only. |
| Apply cannot create employment | Pass | Page 025 submits application only. |
| Employer billing hidden from workers | Pass | Pages 023-028 do not expose employer billing or platform margin. |
| Payment not guaranteed | Pass | Pages 024, 026, 027, and 028 explicitly avoid payment guarantees. |

### Finding

No critical financial boundary defect exists. The strongest future risk is implementation drift:
automated duration calculation could be mistaken for approved paid hours unless Page 029 keeps
calculation, review, approval, payroll, and payment distinct.

---

## 7. Worker Fairness

Worker fairness is strong across the attendance lifecycle.

| Scenario | Review Finding |
| --- | --- |
| Late arrival | Neutral handling. No automatic misconduct, no-show, or penalty conclusion. |
| Early departure | Checkout/problem reporting can route to review without automatic punishment. |
| GPS failure | Neutral states and fallback paths exist. |
| Offline | Pending submission is not shown as recorded until authoritative confirmation. |
| Duplicate submissions | Authoritative current state and support path prevent duplicate attendance records. |
| Manual review | Used for exceptions and fallback, not as a punitive state. |
| Fallback | Fallback submitted is not automatically approved or rejected. |
| Support | Support routes are present across accepted shift, check-in, and checkout. |

### Finding

No automatic punitive conclusion was found. Language in Pages 027-028 avoids fraud, misconduct, and
worker-absent claims when evidence is inconclusive.

---

## 8. Employer Fairness

Employer fairness is supported without overexposing worker data.

| Area | Review Finding |
| --- | --- |
| Attendance evidence | Check-in/out events, timestamps, review-required status, fallback status, and exception status are available conceptually. |
| Exception handling | Fallback, late/early, no-active-check-in, duplicate, and offline paths route to governed review. |
| Review process | Future Page 029+ receives evidence but must conduct review before hours approval. |
| Correction path | Correction requests are supported without automatic acceptance. |
| Support path | Support path exists for unresolved operational states. |

### Recommendation

Medium: Page 029 should make employer review visibility explicit without exposing raw GPS
diagnostics, private worker explanations, or platform-only support notes.

---

## 9. Privacy Review

Privacy remains strong.

| Privacy Area | Result | Notes |
| --- | --- | --- |
| GPS minimization | Pass | Exact coordinates are minimized and not generally employer-visible. |
| Role-based access | Pass | Pages 027-028 limit employer and platform/support visibility. |
| Continuous tracking | Pass | Explicitly excluded. |
| Employer visibility | Pass | Employer sees operational status, not raw diagnostics or private explanations. |
| Worker-only data | Pass | Private notes and explanations are not broadly exposed. |
| Platform-only data | Pass | Support/audit/internal states remain role-limited. |

### Finding

No privacy blocker was found. Future implementation must enforce these as permission checks and
audit controls rather than UI-only hiding.

---

## 10. AI Governance

AI boundaries remain consistent.

AI may:

- explain shift information;
- summarize non-sensitive steps;
- explain requirement gaps;
- explain check-in/out states;
- explain why review is required;
- route workers to fallback or support;
- highlight missing information.

AI must never:

- submit an application;
- accept an assignment;
- change a commitment;
- check in or check out;
- infer fraud;
- determine misconduct;
- decide presence;
- approve attendance;
- approve hours;
- calculate payroll;
- create payment;
- expose precise location;
- alter timestamps.

### Finding

No reviewed page gives AI final operational, attendance, financial, or disciplinary authority.

---

## 11. Future Implementation Readiness

Pages 029+ have clear inputs and outputs.

### Inputs Available to Page 029 - Timesheet

- Scheduled shift data from Pages 024 and 026.
- Accepted commitment state from Page 026.
- Check-in event state from Page 027.
- Checkout event state from Page 028.
- Material-change acknowledgements from Pages 026-028.
- Fallback and review-required states from Pages 027-028.
- Worker problem reports from Pages 027-028.
- Support/correction context from Pages 026-028.

### Outputs Page 029 Should Own

- Timesheet view.
- Time evidence summary.
- Worker review of recorded time.
- Correction request.
- Review-required state.
- Submitted timesheet state.
- Handoff to authorized attendance/hours approval.

### Outputs Page 029 Must Not Own

- Payroll calculation.
- Payment.
- Employer invoice.
- Final dispute resolution.
- GPS implementation.
- Worker discipline.

### Recommendation

High: Page 029 should be designed as a review and correction page, not as payroll or payment.

---

## 12. Scoring

| Category | Score |
| --- | ---: |
| Architecture | 9.8 |
| Operational governance | 9.7 |
| Worker fairness | 9.8 |
| Employer fairness | 9.5 |
| Privacy | 9.8 |
| Financial separation | 9.8 |
| AI governance | 9.8 |
| Accessibility | 9.6 |
| Implementation readiness | 9.6 |
| Overall attendance architecture | 9.7 |

---

## 13. Recommendations

| Priority | Recommendation | Blocks Page 029? |
| --- | --- | --- |
| High | Page 029 should include a time-source table separating scheduled, check-in, checkout, elapsed, worked, approved, and payroll hours. | No |
| High | Page 029 must label GPS evidence as evidence, not approved time. | No |
| High | Page 029 should preserve worker correction rights before any authorized approval workflow. | No |
| Medium | Employer review visibility should avoid raw GPS diagnostics and private worker explanations. | No |
| Medium | Timesheet should show review-required and correction-requested states without punitive language. | No |
| Low | Later implementation should include audit logging for every attendance state transition. | No |

No Critical recommendations were identified.

---

## 14. Validation

```text
No approved pages modified.
No Page 029 created.
No implementation started.
No React created.
No frontend created.
No backend created.
No APIs created.
No database created.
No GPS integration created.
No attendance implementation created.
No hours implementation created.
No payroll implementation created.
No commit, push, merge, or deployment performed.
```

---

## 15. Final Status

```text
READY FOR PAGE 029 - Timesheet
```

Page 029 may proceed as the next controlled gate, but it must preserve the attendance/payroll
boundaries confirmed in this review.
