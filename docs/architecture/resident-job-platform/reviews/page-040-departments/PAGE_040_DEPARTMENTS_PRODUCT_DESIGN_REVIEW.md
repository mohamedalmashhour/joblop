# Page 040 - Departments Product Design Review

Status: Product review complete
Page: 040 - Departments
Epic: Epic 4 - Employer Portal
Reviewed artifact: PAGE_040_DEPARTMENTS_LOW_FIDELITY_WIREFRAME.md
Implementation: Not authorized

## 1. Executive Summary

The Page 040 Departments wireframe creates a governed Employer Portal experience for managing
department information inside a selected residence. It preserves the boundary between residences,
departments, units, services, cost centres, operational teams, shifts, and workers.

The page remains a control surface. It does not become a staffing engine, scheduling engine,
payroll, HR, compliance adjudication, resident registry, clinical record, analytics surface, or AI
integration.

Recommendation:

```text
APPROVE WITH OWNER REVIEW
```

No approval record is created at this stage. Page 041 remains blocked.

## 2. Strengths

- Department hierarchy is clear and tied to residence context.
- Department, shift, worker, and budget concepts remain separate.
- Department types are configurable and not hardcoded.
- Operational states remain independent and are not collapsed into one "Active" label.
- Worker visibility is limited to assigned department, approved department name, and assignment
  instructions.
- Staffing summaries are high-level and non-authoritative.
- Compliance summaries do not become compliance decisions or document verification.
- Role separation prevents residence managers, department managers, schedulers, and compliance
  contacts from being treated as the same authority.
- Empty and error states avoid fabricated department, staffing, compliance, or worker data.
- Auditability is required for department creation, edits, status changes, contacts, and visibility.
- AI boundaries prevent creation, activation, suspension, assignment, shift creation, staffing
  changes, compliance approval, or fabricated metrics.
- Mobile hierarchy prioritizes residence context, department list, operational status, staffing
  attention, action-required items, and worker visibility.

## 3. Weaknesses

### 3.1 Department Permission Model Requires Later Detail

The wireframe identifies role separation, but future employer pages and engineering must define
exact department-level permissions, role inheritance from residence, and escalation paths.

Classification: Future implementation governance condition, not wireframe defect.

### 3.2 Staffing Summaries Need Future Source Contracts

Department staffing summaries are correctly non-authoritative. Future shift/staffing pages must
define exact source ownership, refresh cadence, and consistency rules.

Classification: Future implementation condition.

### 3.3 Compliance Summaries Need Policy Definitions

Department compliance summaries avoid adjudication. Future compliance workflows must define which
items can be shown and which require restricted access.

Classification: Future compliance governance condition.

## 4. Risk Review

| Risk | Severity | Review |
| --- | --- | --- |
| Department becomes shift or staffing engine | Critical | Avoided. |
| Department becomes payroll or HR | Critical | Avoided. |
| Department becomes compliance adjudication | Critical | Avoided. |
| Department becomes resident registry or clinical record | Critical | Avoided. |
| Department type hardcodes one operating model | High | Avoided. |
| Worker sees internal department strategy or budgets | Critical | Avoided. |
| Staffing summaries become authoritative | Critical | Avoided. |
| Compliance summary becomes compliance approval | Critical | Avoided. |
| Role visibility implies edit authority | High | Avoided. |
| AI creates, activates, suspends, staffs, or fabricates metrics | Critical | Avoided. |

## 5. Scorecard

| Category | Score |
| --- | ---: |
| Department hierarchy | 9.8 |
| Operational truthfulness | 9.8 |
| Role separation | 9.7 |
| Worker visibility | 10.0 |
| Staffing boundary | 10.0 |
| Compliance boundary | 9.9 |
| Auditability | 9.8 |
| AI governance | 10.0 |
| Accessibility | 9.7 |
| Mobile usability | 9.7 |
| International readiness | 9.8 |
| Consistency with Pages 037-039 | 9.9 |
| Readiness for Page 041 - Create Shift | 9.7 |
| Overall score | 9.8 |

## 6. Product Review Findings

| Review area | Result |
| --- | --- |
| Department hierarchy | Pass |
| Operational truthfulness | Pass |
| Role separation | Pass |
| Worker visibility | Pass |
| Staffing boundary | Pass |
| Compliance boundary | Pass |
| Auditability | Pass |
| AI governance | Pass |
| Accessibility | Pass |
| Mobile usability | Pass |
| International readiness | Pass |
| Consistency with Pages 037-039 | Pass |

## 7. Required Improvements

No required wireframe corrections are identified at this review stage.

Future pages should continue validating:

- department-to-shift handoff;
- department-level role permissions;
- staffing source contracts;
- compliance source contracts;
- department-level audit events;
- safe worker-facing instructions.

These are future consistency checks, not Page 040 blockers.

## 8. Governance Review

| Requirement | Result |
| --- | --- |
| Frozen title remains Departments | Pass |
| Architecture Freeze unchanged | Pass |
| Employer Portal scope unchanged | Pass |
| Pages 001-039 unchanged | Pass |
| No Page 041 files created | Pass |
| No approval record created | Pass |
| No implementation started | Pass |
| No React/frontend/backend/API/database work | Pass |
| No staffing or scheduling implementation created | Pass |
| No payroll implementation created | Pass |
| No compliance implementation created | Pass |
| No messaging or notification implementation created | Pass |
| No analytics implementation created | Pass |
| No AI integration created | Pass |
| Unrelated app changes untouched | Pass |

## 9. Recommendation

```text
APPROVE WITH OWNER REVIEW
```

Page 040 is ready for owner review. It preserves department hierarchy, worker visibility,
staffing and compliance boundaries, auditability, AI limits, and consistency with the approved
Employer Portal pages.

## 10. Final Review Status

```text
Page 040 - Departments
Wireframe: COMPLETE
Product Review: COMPLETE
Approval Record: NOT CREATED
Owner Review: REQUIRED

Page 041 - Create Shift
BLOCKED
```
