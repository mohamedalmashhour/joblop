# Page 037 - Employer Dashboard Product Design Review

Status: Product review complete
Page: 037 - Employer Dashboard
Epic: Epic 4 - Employer Portal
Reviewed artifact: PAGE_037_EMPLOYER_DASHBOARD_LOW_FIDELITY_WIREFRAME.md
Implementation: Not authorized

## 1. Executive Summary

The Page 037 Employer Dashboard wireframe successfully starts the Employer Portal as a distinct
operational workspace rather than a continuation of worker-facing assumptions. It prioritizes
urgent staffing needs, at-risk shifts, pending approvals, active conversations, notifications,
compliance reminders, support requests, and high-level billing visibility while keeping the
dashboard as a control surface.

The wireframe does not invent live metrics, expose worker-private data, approve staffing actions,
approve payroll, or replace source workflows for shifts, workers, messaging, notifications,
documents, invoices, payments, or compliance.

Recommendation:

```text
APPROVE WITH OWNER REVIEW
```

No approval record is created at this stage. Page 038 remains blocked.

## 2. Strengths

- Clearly opens the Employer Portal as a separate domain from the Worker Portal.
- Answers the operational questions employers need first: attention, changes, risks, approvals,
  staffing needs, and compliance actions.
- Uses primary, secondary, and tertiary dashboard hierarchy to avoid turning the page into a
  reporting screen.
- Separates urgent staffing, at-risk shifts, pending approvals, and checked-in workers as top-level
  attention items.
- Keeps all dashboard metrics conceptual and avoids fabricated live values.
- Preserves source-of-truth boundaries for shifts, workers, attendance, applications, messages,
  notifications, billing, compliance, support, and organization records.
- Defines role-based visibility for Employer, Residence Manager, Scheduler, Finance, Compliance,
  and Support viewers.
- Protects worker privacy by preventing exposure of private settings, banking, tax, raw
  background-check, identity-document, export, deletion, or consent data.
- Keeps billing summary separate from final invoices, worker compensation, payroll, and payment
  credentials.
- Presents AI as advisory only and prevents AI from approving, assigning, rejecting, billing,
  modifying compliance, or fabricating metrics.
- Provides mobile hierarchy with attention cards before secondary summaries.

## 3. Weaknesses

### 3.1 Employer Portal Permission Model Requires Future Engineering Detail

The wireframe correctly identifies role-based visibility, but future engineering must define exact
permission grants, organization membership, residence-level access, department-level access, and
audit rules.

Classification: Future implementation condition, not wireframe defect.

### 3.2 Organization Switching Is Conceptual

The page is future-ready for organization switching, but no implementation detail is defined. This
is appropriate for the wireframe stage, but engineering must later handle tenant isolation,
context switching, and stale data risks.

Classification: Future architecture/implementation detail, not Page 037 blocker.

### 3.3 Billing and Compliance Sources Need Later Source Contracts

Billing and compliance widgets are properly high-level, but later pages and APIs must define exact
source contracts to avoid conflicting dashboard numbers.

Classification: Future implementation governance condition.

## 4. Risk Review

| Risk | Severity | Review |
| --- | --- | --- |
| Employer Dashboard inherits worker assumptions | Critical | Avoided. |
| Dashboard becomes source of truth for operational records | Critical | Avoided. |
| Metrics are fabricated or presented as live | Critical | Avoided. |
| Urgent request implies guaranteed staffing | Critical | Avoided. |
| AI appears to assign, approve, reject, or bill | Critical | Avoided. |
| Worker private data leaks to employer | Critical | Avoided. |
| Employer sees worker compensation or payroll | Critical | Avoided. |
| Dashboard becomes dense reporting screen | High | Avoided through attention-first hierarchy. |
| Role-based visibility is unclear | High | Mitigated conceptually; future permission detail needed. |
| Organization switching leaks tenant data | Critical | Mitigated conceptually; future implementation validation needed. |
| Billing summary confused with final invoice | High | Avoided. |
| Compliance reminder treated as final disqualification | High | Avoided. |

## 5. Scorecard

| Category | Score |
| --- | ---: |
| Purpose clarity | 9.8 |
| Employer Portal boundary | 9.9 |
| Operational prioritization | 9.8 |
| Dashboard hierarchy | 9.7 |
| Control-surface discipline | 9.9 |
| Metrics truthfulness | 10.0 |
| Role-based visibility | 9.5 |
| Permission awareness | 9.5 |
| Worker privacy | 10.0 |
| Billing boundary | 9.8 |
| Compliance boundary | 9.7 |
| AI governance | 10.0 |
| Mobile usability | 9.6 |
| Accessibility | 9.7 |
| International readiness | 9.8 |
| Consistency with Page 036 transition | 9.9 |
| Future implementation readiness | 9.5 |
| Overall score | 9.8 |

## 6. Product Review Findings

| Review area | Result |
| --- | --- |
| Dashboard widgets | Pass |
| Operational metrics | Pass |
| Actionable alerts | Pass |
| Pending tasks | Pass |
| Navigation | Pass |
| Organization switching future-readiness | Pass |
| Permissions | Pass |
| Role-based visibility | Pass |
| Auditability | Pass |
| Privacy | Pass |
| AI boundaries | Pass |
| Source-of-truth boundaries | Pass |
| Mobile usability | Pass |
| Accessibility | Pass |
| International readiness | Pass |

## 7. Required Improvements

No required wireframe corrections are identified at this review stage.

Recommended future follow-up when later Employer Portal pages are developed:

- Confirm exact permissions in Company Profile, Residences, Departments, and Create Shift pages.
- Keep billing widgets aligned with future Invoices pages.
- Keep compliance reminders aligned with future employer document/compliance workflows.
- Validate organization switching before implementation.

These are future consistency checks, not Page 037 blockers.

## 8. Governance Review

| Requirement | Result |
| --- | --- |
| Pages 001-036 unchanged | Pass |
| Frozen title remains Employer Dashboard | Pass |
| Page begins Employer Portal | Pass |
| Worker assumptions not inherited | Pass |
| No Page 038 files created | Pass |
| No approval record created | Pass |
| No implementation started | Pass |
| No React/frontend/backend/API/database work | Pass |
| No commit, push, merge, or deployment | Pass |

## 9. Recommendation

```text
APPROVE WITH OWNER REVIEW
```

The Employer Dashboard is ready for owner review. It is operationally focused, privacy-aware,
permission-conscious, and AI-governed. It does not require implementation or architecture changes.

## 10. Final Review Status

```text
Page 037 - Employer Dashboard
Wireframe: COMPLETE
Product Review: COMPLETE
Approval Record: NOT CREATED
Owner Review: REQUIRED

Page 038 - Company Profile
BLOCKED
```
