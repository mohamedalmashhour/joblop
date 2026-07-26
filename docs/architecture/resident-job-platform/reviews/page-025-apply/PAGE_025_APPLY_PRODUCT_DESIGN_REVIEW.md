# Page 025 - Apply Product Design Review

Status: Product Design Review complete
Epic: Epic 3 - Worker Portal
Page: 025 - Apply
Wireframe reviewed: PAGE_025_APPLY_LOW_FIDELITY_WIREFRAME.md
Architecture baseline: Resident Job Architecture Phase 1 v1.0
Epic planning baseline: Epic 3 Worker Portal Planning v1.0
Implementation: Not authorized

## 1. Executive Summary

Page 025 - Apply establishes a clear application-only step between Shift Details and future
selection, assignment, acceptance, and confirmed-assignment workflows. It protects the worker from
confusing application submission with assignment, acceptance, attendance, payroll, or employment.

The wireframe is strong, mobile-focused, and consistent with Pages 016-024. It uses explicit
confirmations, limited shift-specific inputs, worker privacy boundaries, compensation transparency,
and advisory AI boundaries.

Recommendation:

```text
APPROVE WITH CONDITIONS
```

The conditions are controlled refinements, not architecture defects.

## 2. Strengths

### 2.1 Application Boundary

The page clearly owns only application submission and does not absorb assignment, acceptance,
attendance, or payroll responsibilities.

### 2.2 Consent Clarity

The worker must explicitly confirm shift details, location/travel, duties/scope, compensation,
requirements, cancellation terms, and the no-guarantee boundary.

### 2.3 Worker Input Restraint

The wireframe avoids re-collecting profile, professional, licence, certification,
background-check, or availability data already governed by other pages.

### 2.4 Privacy

Employer-visible application information is limited to what is needed for evaluating the specific
application. Worker private notes and search/viewing history remain private.

### 2.5 AI Governance

AI is limited to summaries, gap explanations, and missing-field guidance. It cannot submit,
modify answers, negotiate, promise selection, rank unfairly, waive requirements, or pressure the
worker.

## 3. Weaknesses

### 3.1 Selection State Needs Stronger Future Boundary

The state model includes "Selected" as a future workflow, but the page should more explicitly state
that selection does not create an assignment offer or worker acceptance.

### 3.2 Withdrawal Boundary Needs More Detail

The page includes withdrawn status, but it should more clearly separate withdrawing a draft or
submitted application from cancelling an accepted assignment.

### 3.3 Additional Information Requested Needs Privacy Guardrail

The wireframe allows additional information requests, but should clarify that requests must be
shift-specific, necessary, and cannot bypass the governed profile, document, or compliance pages.

### 3.4 Compensation Confirmation Needs Estimate State

The compensation summary is clear, but the consent checklist should explicitly include whether the
compensation shown is confirmed, estimated, pending, or unavailable.

## 4. Risks

| Risk | Severity | Notes |
| --- | --- | --- |
| Application mistaken for selection | High | Workers may think submit means they are selected unless the next state is very visible. |
| Selection mistaken for assignment | High | Future workflow must keep selected, assignment offer, and worker acceptance distinct. |
| Additional info overreach | Medium | Requests could duplicate profile or compliance data if not governed. |
| Withdrawal/cancellation confusion | Medium | Worker needs to know withdrawing an application differs from cancelling accepted work. |
| Consent overload | Medium | Too many confirmations may become checkbox fatigue if not grouped clearly. |

## 5. Required Improvements

Before Page 025 becomes Approved Wireframe v1.0, revise the wireframe to address:

1. **Selection / Assignment / Acceptance Boundary**
   - Add explicit text that selected is a future workflow state and does not equal assignment offer,
     assignment, worker acceptance, or confirmed assignment.

2. **Withdrawal vs Cancellation Boundary**
   - Clarify that withdrawing an application is not the same as cancelling an accepted assignment.

3. **Additional Information Request Guardrail**
   - State that additional information requests must be shift-specific, necessary, and cannot bypass
     Profile, Professional Information, Licences, Certifications, Background Check, or Availability.

4. **Compensation Confirmation State**
   - Add explicit confirmation of whether compensation information is confirmed, estimated, pending,
     or unavailable before submission.

These can be resolved in a controlled Revision 1 without changing architecture.

## 6. Scorecard

| Category | Score |
| --- | ---: |
| Application flow clarity | 9.4 |
| Separation from assignment | 9.1 |
| Consent | 9.2 |
| Worker privacy | 9.5 |
| Employer visibility | 9.4 |
| Compensation transparency | 9.2 |
| AI governance | 9.6 |
| Accessibility | 9.3 |
| Mobile usability | 9.4 |
| Operational readiness | 9.2 |
| Consistency with Pages 016-024 | 9.6 |
| Overall score | 9.3 |

## 7. Governance Review

| Requirement | Result |
| --- | --- |
| Frozen architecture unchanged | Pass |
| Pages 016-024 unchanged | Pass |
| No implementation | Pass |
| No Page 026 created | Pass |
| No React | Pass |
| No frontend | Pass |
| No backend | Pass |
| No APIs | Pass |
| No database | Pass |
| No deployment | Pass |

## 8. Recommendation

```text
APPROVE WITH CONDITIONS
```

Page 025 is strong and aligned with the Worker Portal model, but the documented refinements should
be resolved before creating an approval record.

## 9. Final Review Status

```text
Page 025 - Apply
Wireframe: COMPLETE
Product Review: COMPLETE
Approval Record: NOT CREATED
Owner Review: REQUIRED

Page 026
BLOCKED
```
