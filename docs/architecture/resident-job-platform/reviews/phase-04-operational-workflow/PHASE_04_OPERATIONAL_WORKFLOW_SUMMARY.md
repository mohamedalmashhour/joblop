# Resident Job

## Phase 04 - Operational Workflow Summary

**Review Type:** Governance-only operational workflow freeze review  
**Scope:** Approved Pages 041-049 only  
**Status:** Operational Workflow Summary Complete  
**Implementation:** Not Started  
**Page 050:** Not Created

---

## 1. Objective

Phase 04 validates the frozen operational staffing workflow before the platform enters the financial workflow.

The reviewed sequence covers employer shift creation through timesheet approval:

```text
Create Shift
-> Recurring Shift
-> Urgent Shift
-> AI Worker Suggestions
-> Applicants
-> Assigned Worker
-> Live Shift Tracking
-> Attendance
-> Approve Timesheet
```

The purpose of this review is to confirm that the operational workflow is coherent, auditable, privacy-aware, AI-governed, and ready to hand off to Page 050 - Invoices without introducing financial, payroll, billing, payment, accounting, or taxation logic into the operational phase.

---

## 2. Approved Page Sequence

| Page | Title | Approved Baseline |
| --- | --- | --- |
| 041 | Create Shift | `PAGE_041_APPROVAL_RECORD_V1_0.md` |
| 042 | Recurring Shift | `PAGE_042_APPROVAL_RECORD_V1_0.md` |
| 043 | Urgent Shift | `PAGE_043_APPROVAL_RECORD_V1_0.md` |
| 044 | AI Worker Suggestions | `PAGE_044_APPROVAL_RECORD_V1_0.md` |
| 045 | Applicants | `PAGE_045_APPROVAL_RECORD_V1_0.md` |
| 046 | Assigned Worker | `PAGE_046_APPROVAL_RECORD_V1_0.md` |
| 047 | Live Shift Tracking | `PAGE_047_APPROVAL_RECORD_V1_0.md` |
| 048 | Attendance | `PAGE_048_APPROVAL_RECORD_V1_0.md` |
| 049 | Approve Timesheet | `PAGE_049_APPROVAL_RECORD_V1_0.md` |

All nine pages are approved as `APPROVED WIREFRAME v1.0`.

---

## 3. Workflow Purpose

Phase 04 defines how an employer operationally moves from staffing need to approved timesheet:

1. Capture the staffing need.
2. Support normal, recurring, and urgent shift patterns.
3. Receive AI-assisted worker suggestions without AI making staffing decisions.
4. Review applicants through a human-controlled process.
5. Confirm the assigned worker without converting assignment into attendance.
6. View governed live shift status without creating surveillance or attendance approval.
7. Review operational attendance records without creating payroll.
8. Approve submitted timesheets without generating invoices or payments.

This creates the operational evidence trail needed before the financial workflow begins.

---

## 4. Page Ownership

| Page | Primary Owner Concept | Owner Responsibility |
| --- | --- | --- |
| 041 Create Shift | Shift request definition | Defines one governed staffing request. |
| 042 Recurring Shift | Recurrence governance | Defines recurrence rules, series, future occurrences, and exceptions. |
| 043 Urgent Shift | Urgency governance | Defines urgent staffing classification and short-notice workflow. |
| 044 AI Worker Suggestions | Advisory matching support | Presents AI-assisted suggestions for human review. |
| 045 Applicants | Applicant review | Supports employer-controlled applicant review and filtering. |
| 046 Assigned Worker | Assignment visibility | Displays governed assigned-worker state and handoffs. |
| 047 Live Shift Tracking | Current-shift operational visibility | Displays minimum-necessary governed live tracking state. |
| 048 Attendance | Operational attendance record | Presents and governs attendance records. |
| 049 Approve Timesheet | Timesheet approval | Supports managerial review and approval of submitted timesheets. |

Ownership is cleanly partitioned. No page owns more than one major workflow authority.

---

## 5. Major Transitions

### Page 041 -> Page 042

One-time shift creation may lead to recurring shift configuration when the employer needs a repeat pattern.

Boundary: Page 041 does not own recurrence rules. Page 042 owns recurrence.

### Page 042 -> Page 043

Recurring staffing may still require urgent handling where timing, coverage, or operational risk requires priority.

Boundary: Page 042 does not own urgency classification. Page 043 owns urgency governance.

### Page 043 -> Page 044

Urgent or standard shifts may proceed to AI-assisted worker suggestions.

Boundary: Page 043 owns urgency. Page 044 owns AI-assisted suggestions, not staffing decisions.

### Page 044 -> Page 045

AI suggestions feed into employer applicant review.

Boundary: AI suggestion does not equal employer decision. Page 045 owns applicant review.

### Page 045 -> Page 046

Human applicant review may route to assignment workflow.

Boundary: Page 045 does not assign the worker. Page 046 owns Assigned Worker visibility.

### Page 046 -> Page 047

Assigned worker state may route to live shift tracking during the governed tracking window.

Boundary: Page 046 does not perform live tracking. Page 047 owns Live Shift Tracking.

### Page 047 -> Page 048

Live operational signals may support attendance context.

Boundary: Page 047 does not approve attendance or adjudicate evidence. Page 048 owns Attendance.

### Page 048 -> Page 049

Finalized attendance context supports timesheet review.

Boundary: Page 048 does not approve timesheets or calculate payroll. Page 049 owns Approve Timesheet.

### Page 049 -> Page 050

Approved timesheet outcomes may hand off to the financial workflow.

Boundary: Page 049 does not generate invoices. Page 050 owns Invoices.

---

## 6. Operational Handoffs

| Handoff | From | To | Handoff Payload |
| --- | --- | --- | --- |
| Recurrence setup | Create Shift | Recurring Shift | Shift draft, schedule intent, employer context |
| Urgency handling | Recurring / Create Shift | Urgent Shift | Staffing need, timing, risk classification |
| Worker suggestions | Urgent Shift | AI Worker Suggestions | Shift requirements, availability constraints, governed matching context |
| Applicant review | AI Worker Suggestions | Applicants | Suggested or applicant pool context; human review remains required |
| Assignment | Applicants | Assigned Worker | Human-reviewed applicant decision context |
| Live status | Assigned Worker | Live Shift Tracking | Active assignment, worker acceptance, governed tracking eligibility |
| Attendance record | Live Shift Tracking | Attendance | Operational signals, check-in/out context, evidence references |
| Timesheet review | Attendance | Approve Timesheet | Attendance outcome, exceptions, governed review status |
| Financial entry | Approve Timesheet | Invoices | Approved timesheet outcome only |

Each handoff preserves upstream records without allowing the downstream page to rewrite the upstream source of truth.

---

## 7. External Dependencies

The Phase 04 wireframes identify dependencies without implementing them:

- authenticated employer access
- role and permission model
- organization, residence, and department context
- shift source of truth
- recurrence policy
- urgency classification rules
- worker eligibility and availability context
- AI suggestion engine, advisory only
- applicant review records
- assignment state records
- live tracking authorization policy
- location availability and freshness signals
- attendance evidence records
- timesheet submission records
- audit trail
- support and escalation procedures

These dependencies are recognized as future engineering or policy work, not implemented in Phase 04.

---

## 8. Architectural Assumptions

Phase 04 assumes:

- Human employer actions remain authoritative where approval is required.
- AI remains advisory and cannot assign, reject, approve, penalize, fabricate, calculate, or finalize.
- Operational records are auditable.
- State transitions are explicit and do not imply downstream outcomes.
- Privacy is minimum-necessary by default.
- Financial workflows begin only after timesheet approval handoff.
- Invoicing, payroll, payments, accounting, and taxation remain out of Phase 04.
- All permissions are context-sensitive to organization, residence, department, role, worker, shift, and workflow state.
- Jurisdiction-specific rules remain configurable and are not hardcoded in wireframes.

---

## 9. Cross-Page Operational Summary

The frozen workflow forms a coherent chain:

```text
Staffing request
-> schedule pattern
-> urgency handling
-> advisory matching
-> human applicant review
-> assignment visibility
-> governed live status
-> attendance record
-> timesheet approval
-> financial handoff
```

The review found no duplicated ownership, no missing operational step in the scoped flow, no circular dependency, no conflicting authority, no state leakage that changes page ownership, and no financial logic inside Pages 041-049.

---

## 10. Readiness Assessment

**Architecture Assessment:** READY

Rationale:

- Page 041 owns shift creation and does not own recurrence or downstream staffing.
- Page 042 owns recurrence and does not own urgency.
- Page 043 owns urgency and does not own AI matching or assignment.
- Page 044 owns AI suggestions and keeps decisions human-controlled.
- Page 045 owns applicant review and does not assign workers.
- Page 046 owns assignment visibility and routes live tracking to Page 047.
- Page 047 owns live tracking only and routes attendance to Page 048.
- Page 048 owns attendance only and routes timesheet approval to Page 049.
- Page 049 owns timesheet approval only and routes invoicing to Page 050.

The operational workflow is ready to transition to Phase 05.

---

## 11. Readiness for Phase 05

Phase 04 is READY.

Page 050 - Invoices may begin after owner approval of this Phase 04 review.

This readiness does not authorize implementation, frontend work, backend work, APIs, database models, payroll, billing, payment, accounting, taxation, or deployment.

---

## 12. Validation

Confirmed:

- Pages 041-049 were reviewed as approved wireframes only.
- Pages 001-049 remain unchanged.
- No Page 050 files were created.
- No implementation started.
- No React created.
- No frontend created.
- No backend created.
- No APIs created.
- No database changes created.
- No commits performed.
- No pushes performed.
- No merges performed.
- No deployment performed.

---

## 13. Final Status

```text
PHASE 04 OPERATIONAL REVIEW COMPLETE

Operational Workflow Summary created.
Boundary Validation pending / companion document required.

Awaiting owner approval before beginning Page 050 — Invoices.
```
