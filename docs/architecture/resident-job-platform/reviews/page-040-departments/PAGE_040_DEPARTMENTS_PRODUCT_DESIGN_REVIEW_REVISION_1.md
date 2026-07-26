# Page 040 - Departments Product Design Review Revision 1

Status: Revision 1 product review complete
Page: 040 - Departments
Reviewed artifact: PAGE_040_DEPARTMENTS_WIREFRAME_REVISION_1.md
Owner decision: Approved with documented conditions
Implementation: Not authorized

## 1. Executive Summary

Revision 1 resolves the Page 040 owner conditions by strengthening department hierarchy,
residence-versus-department boundaries, department lifecycle separation, role and permission
governance, staffing and scheduling boundaries, worker-facing visibility, compliance and financial
boundaries, auditability, AI limits, and readiness for Page 041 - Create Shift.

Recommendation:

```text
APPROVE AS APPROVED WIREFRAME v1.0
```

## 2. Resolved Conditions

| Condition | Result |
| --- | --- |
| Department hierarchy | Resolved. Organization, residence, department, unit, service, operational team, cost centre, shift, and assignment remain separate. |
| Department ownership | Resolved. Organization owner, residence manager, department manager, scheduler, compliance, finance, operational contact, and read-only roles remain distinct. |
| Department lifecycle | Resolved. Record, operational, worker-visibility, and compliance lifecycles remain independent. |
| Operational truthfulness | Resolved. Created, operational, staffed, role listed, shift required, shift created, assigned, checked in, and completed are not merged. |
| Department types | Resolved. Types are configurable and do not imply legal classification, professional authorization, or staffing demand. |
| Worker-facing visibility | Resolved. Worker-visible data remains minimum necessary and assignment-specific. |
| Staffing boundary | Resolved. Staffing summaries remain non-authoritative and route to staffing/shift workflows. |
| Page 041 boundary | Resolved. Page 040 can route to Create Shift but cannot define shift details or publication states. |
| Role and service coverage | Resolved. Supported roles, needed roles, open shifts, assignments, and credential verification remain separate. |
| Compliance boundary | Resolved. Compliance attention, requirements, restrictions, and worker compliance remain separate. |
| Financial boundary | Resolved. Cost-centre links do not expose payroll, rates, banking, tax, invoices, margin, or budgets. |
| Contact governance | Resolved. Contact roles, scopes, visibility, authority, effective period, and replacement states are explicit. |
| Status changes | Resolved. High-impact changes require authority, reason, evidence where required, review, effective date, prior-state preservation, audit, and support path. |
| Versioning | Resolved. Department name, type, residence relationship, contacts, operational state, and visibility history are preserved. |
| Multi-department isolation | Resolved. Department managers and filters are scoped to authorized departments. |
| Resident-information protection | Resolved. Resident, patient, ward, and clinical-record concepts are excluded. |
| Auditability | Resolved. Department creation, edits, reassignment, type/contact/status/visibility/access changes, and corrections are auditable. |
| AI governance | Resolved. AI cannot create departments/shifts, assign workers, approve compliance, set rates, infer resident needs, or publish changes. |

## 3. Revised Risk Review

| Risk | Severity | Revision 1 result |
| --- | --- | --- |
| Department absorbs Page 041 shift creation | Critical | Avoided. |
| Department treated as physical unit, budget, shift, or worker group | High | Avoided. |
| One lifecycle state implies another | High | Avoided. |
| Worker-facing view exposes internal strategy or budgets | Critical | Avoided. |
| Staffing summaries become authoritative | Critical | Avoided. |
| Compliance attention becomes compliance approval | Critical | Avoided. |
| Cost centre becomes budget or payroll authority | High | Avoided. |
| Contact role grants universal authority | High | Avoided. |
| High-impact status changes bypass review/audit | Critical | Avoided conceptually. |
| Department leaks resident/patient information | Critical | Avoided. |
| AI creates shifts or makes operational/compliance decisions | Critical | Avoided. |

## 4. Updated Scorecard

| Category | Score |
| --- | ---: |
| Organization/residence/department separation | 10.0 |
| Department ownership | 9.9 |
| Lifecycle separation | 10.0 |
| Operational truthfulness | 10.0 |
| Configurable department types | 9.9 |
| Worker-facing visibility | 10.0 |
| Staffing boundary | 10.0 |
| Page 041 boundary | 10.0 |
| Role and service coverage | 9.8 |
| Compliance boundary | 9.9 |
| Financial boundary | 10.0 |
| Contact governance | 9.9 |
| Status-change governance | 9.9 |
| Versioning | 9.8 |
| Multi-department isolation | 9.9 |
| Resident-information protection | 10.0 |
| Auditability | 9.9 |
| AI governance | 10.0 |
| Mobile usability | 9.7 |
| Accessibility | 9.8 |
| International readiness | 9.9 |
| Consistency with Pages 037-039 | 9.9 |
| Readiness for Page 041 - Create Shift | 10.0 |
| Overall score | 9.9 |

## 5. Product Review Findings

| Review area | Result |
| --- | --- |
| Organization/residence/department separation | Pass |
| Department ownership | Pass |
| Lifecycle separation | Pass |
| Operational truthfulness | Pass |
| Configurable department types | Pass |
| Worker-facing visibility | Pass |
| Staffing boundary | Pass |
| Page 041 boundary | Pass |
| Role and service coverage | Pass |
| Compliance boundary | Pass |
| Financial boundary | Pass |
| Contact governance | Pass |
| High-impact status changes | Pass |
| Versioning | Pass |
| Multi-department isolation | Pass |
| Resident-information protection | Pass |
| Auditability | Pass |
| AI governance | Pass |
| Mobile usability | Pass |
| Accessibility | Pass |
| International readiness | Pass |
| Consistency with Pages 037-039 | Pass |
| Readiness for Page 041 - Create Shift | Pass |

## 6. Remaining Conditions

No wireframe-blocking conditions remain.

Future implementation and governance must define:

- department-level permissions;
- residence-to-department access inheritance;
- staffing and scheduling source contracts;
- Page 041 shift creation workflow;
- compliance summary sources;
- audit-log implementation;
- department isolation tests.

These are not Page 040 wireframe defects.

## 7. Governance Validation

| Requirement | Result |
| --- | --- |
| Frozen title remains Departments | Pass |
| Architecture Freeze unchanged | Pass |
| Employer Portal scope unchanged | Pass |
| Pages 001-039 unchanged | Pass |
| No Page 041 files created | Pass |
| No implementation started | Pass |
| No React/frontend/backend/API/database work | Pass |
| No department implementation created | Pass |
| No shift-creation implementation created | Pass |
| No staffing or scheduling implementation created | Pass |
| No payroll implementation created | Pass |
| No compliance implementation created | Pass |
| No clinical or resident-record implementation created | Pass |
| No analytics implementation created | Pass |
| No AI department implementation created | Pass |
| Unrelated app changes untouched | Pass |

## 8. Recommendation

```text
Page 040 - Departments
APPROVED WIREFRAME v1.0

Page 041 - Create Shift
UNBLOCKED
NOT CREATED
```
