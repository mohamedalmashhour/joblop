# Resident Job

## Phase 04 - Boundary Validation

**Review Type:** Governance-only boundary validation  
**Scope:** Approved Pages 041-049 only  
**Status:** Boundary Validation Complete  
**Implementation:** Not Started  
**Page 050:** Not Created

---

## 1. Objective

Validate that the frozen operational staffing workflow maintains clean page ownership, state ownership, source-of-truth boundaries, privacy boundaries, AI governance, human approval authority, and separation from financial workflows.

---

## 2. Boundary Validation Matrix

### Page 041 - Create Shift

| Area | Validation |
| --- | --- |
| Primary responsibility | Create one governed employer staffing request. |
| Inputs | Employer, organization, residence, department, role, date/time, shift requirements, staffing need. |
| Outputs | Governed shift request / draft ready for recurrence, urgency, or staffing workflow. |
| Source of truth | Shift request definition for a single shift. |
| State ownership | Draft, submitted, review-required, configured shift-request states. |
| Authority boundaries | Employer defines the request; downstream staffing decisions are not made here. |
| Does not own | Recurrence rules, urgency classification, AI suggestions, applicants, assignment, attendance, timesheets, payroll, billing, invoices, payments. |

### Page 042 - Recurring Shift

| Area | Validation |
| --- | --- |
| Primary responsibility | Govern recurring shift rules, series, occurrences, and exceptions. |
| Inputs | Base shift, recurrence intent, schedule pattern, future occurrence needs. |
| Outputs | Governed recurrence series and occurrence context. |
| Source of truth | Recurrence configuration. |
| State ownership | Recurrence rule, series state, occurrence state, exception state. |
| Authority boundaries | Recurrence setup does not create urgency, assignment, attendance, or payroll. |
| Does not own | Single-shift creation, urgent classification, AI suggestions, applicants, assignment, attendance, timesheets, invoices, payroll, payments. |

### Page 043 - Urgent Shift

| Area | Validation |
| --- | --- |
| Primary responsibility | Govern urgent staffing classification and short-notice staffing workflow. |
| Inputs | Staffing request, timing pressure, operational risk, role requirements, residence/department context. |
| Outputs | Governed urgent shift context ready for suggestions or review. |
| Source of truth | Urgency classification and urgent request governance. |
| State ownership | Urgent request, priority, review, availability-risk, escalation readiness. |
| Authority boundaries | Urgent status prioritizes workflow but does not guarantee coverage or assignment. |
| Does not own | AI decision-making, applicants, assignment, worker confirmation, live tracking, attendance, timesheets, payroll, billing, payments. |

### Page 044 - AI Worker Suggestions

| Area | Validation |
| --- | --- |
| Primary responsibility | Present AI-assisted worker suggestions for human review. |
| Inputs | Shift requirements, worker eligibility context, availability context, urgency context, governed matching constraints. |
| Outputs | Advisory suggestions and explanation context. |
| Source of truth | Advisory suggestion surface only; underlying worker, shift, and eligibility records remain external. |
| State ownership | Suggestion visibility, advisory explanation, confidence/limitation messaging. |
| Authority boundaries | AI suggestion does not equal employer decision, invitation, assignment, rejection, or marketplace action. |
| Does not own | Applicant review, invitations, marketplace, assignment, attendance, payroll, billing, payments, hidden ranking, automated rejection. |

### Page 045 - Applicants

| Area | Validation |
| --- | --- |
| Primary responsibility | Govern employer review of applicants. |
| Inputs | Applicant queue, applications, qualification context, availability context, employer filters, shift reference. |
| Outputs | Human-reviewed applicant decision context and route to assignment workflow. |
| Source of truth | Applicant review state. |
| State ownership | Submitted, under review, shortlisted, clarification requested, declined, withdrawn, closed, move-to-assignment. |
| Authority boundaries | Employer review remains human-controlled; applicant review does not assign the worker. |
| Does not own | AI suggestions, assignment, worker confirmation, attendance, timesheets, payroll, billing, payments, hidden scores, automatic ranking, automatic rejection. |

### Page 046 - Assigned Worker

| Area | Validation |
| --- | --- |
| Primary responsibility | Display and govern the assigned worker state. |
| Inputs | Assignment record, selected worker, shift reference, worker response state, confirmation context. |
| Outputs | Assignment visibility and governed handoff to live tracking, messaging, support, attendance. |
| Source of truth | Assignment visibility record; does not own upstream applicant decision. |
| State ownership | Assignment requested, created, notified, response pending, accepted, declined, expired, confirmed, cancelled, replaced, closed. |
| Authority boundaries | Assigned worker state does not equal presence, attendance, timesheet approval, payroll, or billing. |
| Does not own | Applicant decision, AI suggestions, assignment engine, replacement engine, live tracking, GPS, attendance evidence, payroll, billing, payments, qualification verification. |

### Page 047 - Live Shift Tracking

| Area | Validation |
| --- | --- |
| Primary responsibility | Display governed current-shift tracking status for authorized employer users. |
| Inputs | Active assignment, worker acceptance, tracking authorization, shift window, location freshness signals, attendance state summary. |
| Outputs | Minimum-necessary live operational status and governed handoff to Attendance. |
| Source of truth | Live tracking status only; not attendance or payroll. |
| State ownership | Tracking eligibility, tracking window, tracking state, location freshness, support state. |
| Authority boundaries | Location signals do not prove attendance, work completion, misconduct, or productivity. |
| Does not own | Assignment creation, attendance approval, GPS implementation, geofence implementation, map integration, timesheets, payroll, billing, messaging, notifications, emergency dispatch, incident adjudication. |

### Page 048 - Attendance

| Area | Validation |
| --- | --- |
| Primary responsibility | Govern operational attendance records for assigned shifts. |
| Inputs | Assignment context, check-in/out status, attendance evidence, exceptions, review context. |
| Outputs | Governed attendance outcome and handoff to timesheet approval. |
| Source of truth | Operational attendance record only. |
| State ownership | Scheduled, check-in available, checked in, in progress, check-out available, checked out, review required, approved, rejected, unavailable. |
| Authority boundaries | Attendance is not compensation, performance evaluation, worker discipline, payroll, billing, or dispute adjudication. |
| Does not own | Assignment, live tracking, timesheet approval, payroll, billing, payments, dispute adjudication, attendance engine implementation, AI attendance automation. |

### Page 049 - Approve Timesheet

| Area | Validation |
| --- | --- |
| Primary responsibility | Govern employer review and approval of submitted timesheets. |
| Inputs | Submitted timesheet, approved attendance context, reviewer authority, clarification state, exception context. |
| Outputs | Approved, rejected, clarified, escalated, or archived timesheet state; approved outcome may hand off to invoices. |
| Source of truth | Timesheet approval record only. |
| State ownership | Not submitted, submitted, under review, clarification requested, clarification received, resubmitted, approved, rejected, escalated, archived. |
| Authority boundaries | Approved timesheet does not equal invoice created, payroll processed, payment issued, or worker compensation determined. |
| Does not own | Attendance, assignment, payroll, invoices, accounting, taxation, payments, collections, dispute adjudication, AI decision-making. |

---

## 3. Cross-Page Validation

| Validation Area | Result | Notes |
| --- | --- | --- |
| No duplicated ownership | Pass | Each page owns a distinct operational concept. |
| No missing workflow | Pass | The staffing flow runs from shift creation through timesheet approval. |
| No circular dependency | Pass | Each page hands forward without requiring a downstream page to rewrite upstream state. |
| No conflicting authority | Pass | Human approval remains explicit where required. |
| No state leakage | Pass | Assignment, tracking, attendance, and timesheet states remain separate. |
| No operational dead ends | Pass | Each page has a governed next handoff. |
| No financial logic | Pass | Financial workflow begins at Page 050. |
| No payroll logic | Pass | Pages 041-049 explicitly exclude payroll. |
| No invoicing logic | Pass | Page 049 hands off to Page 050 but does not invoice. |
| No payment logic | Pass | Payment remains outside the operational phase. |
| No accounting logic | Pass | Accounting remains outside Pages 041-049. |
| No taxation logic | Pass | Taxation remains outside Pages 041-049. |

---

## 4. Governance Validation

| Governance Area | Result | Evidence |
| --- | --- | --- |
| AI remains advisory | Pass | Page 044 suggestions are advisory; Pages 046-049 prohibit AI operational decisions. |
| Human approvals remain authoritative | Pass | Applicant review, assignment, attendance review, and timesheet approval preserve human authority. |
| Operational history remains auditable | Pass | Pages 045-049 include conceptual auditability for review, assignment, tracking, attendance, and timesheet events. |
| Privacy boundaries remain intact | Pass | Pages 045-049 use minimum-necessary disclosure and exclude sensitive worker information. |
| Security boundaries remain intact | Pass | Employer access is role/context-based, especially for assignment, live tracking, attendance, and timesheet review. |
| Operational responsibilities remain separated | Pass | Creation, recurrence, urgency, suggestions, applicants, assignment, tracking, attendance, and timesheets are separate. |

---

## 5. State Boundary Validation

The following state boundaries remain intact:

```text
Shift created != Recurring series
Recurring series != Urgent shift
Urgent shift != Worker suggested
AI suggestion != Employer decision
Applicant reviewed != Worker assigned
Assigned != Notified
Notified != Accepted
Accepted != Present
Live location != Attendance proof
Check-in != Worked full shift
Checked out != Attendance approved
Attendance approved != Timesheet approved
Timesheet approved != Payroll complete
Approved timesheet != Invoice created
Invoice created != Payment completed
```

No approved Phase 04 page collapses these states.

---

## 6. Authority Boundary Validation

| Authority | Owner | Validation |
| --- | --- | --- |
| Shift definition | Page 041 | Isolated from recurrence and staffing decision. |
| Recurrence | Page 042 | Isolated from urgency and assignment. |
| Urgency | Page 043 | Prioritizes workflow without guaranteeing coverage. |
| AI suggestion | Page 044 | Advisory only; cannot decide. |
| Applicant review | Page 045 | Human-controlled; cannot assign directly. |
| Assigned worker visibility | Page 046 | Displays assignment but does not track, approve attendance, or replace worker automatically. |
| Live tracking | Page 047 | Displays governed status but does not approve attendance. |
| Attendance | Page 048 | Owns attendance record but not timesheet approval or payroll. |
| Timesheet approval | Page 049 | Owns approval only; does not invoice, pay, or calculate payroll. |

---

## 7. Financial Boundary Validation

Phase 04 contains no financial workflow ownership.

Explicitly excluded:

- invoicing
- payroll
- billing
- payments
- accounting
- taxation
- collections
- compensation calculation
- wage calculation
- settlement

The first financial workflow page remains:

```text
Page 050 — Invoices
```

Page 050 may begin only after owner approval of the Phase 04 review.

---

## 8. Architecture Assessment

**Assessment:** READY

Support:

- Page 041 through Page 049 form a complete operational staffing workflow.
- Each page has one primary responsibility.
- Each handoff is governed.
- No page introduces financial ownership.
- AI remains advisory.
- Human decisions remain authoritative.
- Privacy and auditability are consistently represented.
- Page 050 - Invoices is correctly isolated as the start of the financial workflow.

No critical architectural issue blocks transition to Phase 05.

---

## 9. Minor Observations

These are not blockers:

- Future implementation must define exact role permissions for employer users.
- Future high-fidelity design should keep state labels visible so employers do not confuse approval states.
- Future engineering must preserve audit trail semantics defined in the wireframes.
- Future financial pages must avoid recalculating operational truth already owned by Pages 048-049.

Classification:

```text
Minor observations only.
No targeted architectural corrections required before Page 050.
```

---

## 10. Readiness for Phase 05

Phase 04 is READY.

Page 050 - Invoices may begin after owner approval.

This document does not authorize:

- implementation
- React
- frontend
- backend
- APIs
- database
- payroll
- billing
- payments
- accounting
- taxation
- deployment

---

## 11. Validation

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

## 12. Final Status

```text
PHASE 04 OPERATIONAL REVIEW COMPLETE

Operational Workflow Summary created.
Boundary Validation created.

Awaiting owner approval before beginning Page 050 — Invoices.
```
