# Page 024 - Shift Details Product Design Review

Status: Product Design Review complete
Epic: Epic 3 - Worker Portal
Page: 024 - Shift Details
Wireframe reviewed: PAGE_024_SHIFT_DETAILS_LOW_FIDELITY_WIREFRAME.md
Architecture baseline: Resident Job Architecture Phase 1 v1.0
Epic planning baseline: Epic 3 Worker Portal Planning v1.0
Implementation: Not authorized

## 1. Executive Summary

Page 024 - Shift Details successfully establishes the authoritative worker-facing pre-application
review surface. It separates shift information, requirement review, compensation, employer or
residence information, travel expectations, shift policies, AI explanation, and application action.

The wireframe preserves the boundary between viewing a shift and applying for it. It also preserves
the Page 025 Apply boundary by making "Begin application" a controlled next step rather than an
automatic application, assignment, or acceptance.

Recommendation:

```text
APPROVE WITH CONDITIONS
```

The conditions are focused refinements, not architecture defects.

## 2. Strengths

### 2.1 Authoritative Pre-Application Detail

The page clearly becomes the worker's source of truth before application. It gives more detail than
Search Shifts without duplicating the future Apply page.

### 2.2 Operational Boundary Clarity

The workflow distinctions are visible:

```text
Viewing a shift
does not equal
Applying

Applying
does not equal
Being selected

Assigned
does not equal
Accepted

Accepted
does not equal
Worked

Worked
does not equal
Paid
```

### 2.3 Compensation Separation

The wireframe distinguishes worker pay rate, premiums, travel allowance, reimbursement, estimated
gross, and informational notes. It does not expose employer billing or platform margin.

### 2.4 Requirement Review

The page summarizes licence, certification, availability, background-check, and role-suitability
requirements without exposing sensitive background-check details or making legal conclusions.

### 2.5 AI Governance

AI is correctly limited to summarizing and explaining. It cannot decide eligibility, apply
automatically, accept assignments, negotiate compensation, or fabricate shift information.

### 2.6 Mobile Usability

The mobile structure prioritizes:

- decision boundary;
- shift summary;
- application readiness;
- compensation;
- requirements;
- employer/residence information;
- travel and policies;
- action.

## 3. Weaknesses

### 3.1 Selected vs Assigned Needs More Detail

The wireframe says selected does not equal assigned, but it should explain what "selected" means if
the platform uses that status later. Without clarification, future pages may blur employer selection,
platform assignment, and worker acceptance.

### 3.2 Policy Section Needs Stronger Change/Cancellation Boundaries

Cancellation and shift-change expectations are present, but the page should more clearly state that
policies are configurable, may depend on timing and approved rules, and must be reviewed before the
worker proceeds.

### 3.3 Travel Details Need Safety Language

Travel expectations are included, but the wireframe should explicitly say travel estimates may be
approximate and do not replace worker judgment, site instructions, or approved support guidance.

### 3.4 Application Action Could Better Show Disabled States

The page should show when Begin application is disabled or redirected because of missing
requirements, stale data, shift changes, account restrictions, or connectivity problems.

## 4. Risks

| Risk | Severity | Notes |
| --- | --- | --- |
| Selection/assignment confusion | High | Future workflow could blur selected, assigned, and accepted states. |
| Policy overstatement | Medium | Cancellation or change wording must not become a legal or payment guarantee. |
| Travel estimate overconfidence | Medium | Travel estimates must not imply guaranteed arrival or reimbursement. |
| Disabled action ambiguity | Medium | Workers need to know why Begin application is unavailable. |
| Shift Details duplicating Apply | Low | Current design avoids this, but future revisions must keep Page 025 distinct. |

## 5. Required Improvements

Before Page 024 becomes Approved Wireframe v1.0, revise the wireframe to address:

1. **Selected / Assigned / Accepted Clarification**
   - Add a compact state explanation showing where selection, assignment, and worker acceptance fit.

2. **Cancellation and Change Policy Clarity**
   - Clarify that cancellation and change expectations are configurable and may depend on timing,
     status, approved rules, and exceptional circumstances.

3. **Travel Safety and Estimate Clarity**
   - Clarify that travel time/distance may be estimated and should be reviewed against worker
     judgment, site instructions, and support guidance.

4. **Application Action Disabled States**
   - Add explicit disabled or blocked-action examples for requirement gaps, stale shift data,
     changed shift details, account restrictions, and offline state.

These refinements can be completed without changing architecture.

## 6. Scorecard

| Category | Score |
| --- | ---: |
| Purpose clarity | 9.5 |
| Shift information clarity | 9.4 |
| Worker eligibility clarity | 9.1 |
| Requirement-gap clarity | 9.3 |
| Compensation transparency | 9.5 |
| Employer information governance | 9.4 |
| Travel expectation clarity | 9.0 |
| Shift policy clarity | 9.0 |
| Application boundary | 9.2 |
| AI governance | 9.6 |
| Accessibility | 9.3 |
| Mobile usability | 9.4 |
| International readiness | 9.5 |
| Consistency with Page 023 | 9.6 |
| Overall score | 9.3 |

## 7. Governance Review

| Requirement | Result |
| --- | --- |
| Frozen architecture unchanged | Pass |
| Pages 016-023 unchanged | Pass |
| No implementation | Pass |
| No Page 025 created | Pass |
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

Page 024 is strong and operationally coherent, but the documented refinements should be resolved
before creating an approval record.

## 9. Final Review Status

```text
Page 024 - Shift Details
Wireframe: COMPLETE
Product Review: COMPLETE
Approval Record: NOT CREATED
Owner Review: REQUIRED

Page 025
BLOCKED
```
