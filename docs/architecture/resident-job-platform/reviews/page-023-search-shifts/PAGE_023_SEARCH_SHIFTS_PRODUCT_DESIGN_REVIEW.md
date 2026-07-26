# Page 023 - Search Shifts Product Design Review

Status: Product Design Review complete
Epic: Epic 3 - Worker Portal
Page: 023 - Search Shifts
Wireframe reviewed: PAGE_023_SEARCH_SHIFTS_LOW_FIDELITY_WIREFRAME.md
Architecture baseline: Resident Job Architecture Phase 1 v1.0
Epic planning baseline: Epic 3 Worker Portal Planning v1.0
Implementation: Not authorized

## 1. Executive Summary

Page 023 - Search Shifts is a strong first wireframe for worker shift discovery. It preserves the frozen architecture title and purpose, continues the Page 016-022 worker-domain boundaries, and clearly prevents shift recommendations from being confused with assignments.

The page is appropriately positioned as an operational discovery surface rather than a generic job board. It gives workers enough information to understand why opportunities appear, what actions are available, and what conditions may prevent action.

The page should not be approved automatically. Owner review is required before any approval record is created.

Recommendation:

```text
APPROVE WITH CONDITIONS
```

The conditions are not architecture defects. They are controlled wireframe refinement items that should be resolved before Page 023 becomes Approved Wireframe v1.0.

## 2. Frozen Page Verification

| Item | Finding |
| --- | --- |
| Exact Page 023 title | Search Shifts |
| Frozen source | docs/architecture/resident-job-platform/pages/PAGE_023_SEARCH_SHIFTS.md |
| Source section | `# Page 023 - Search Shifts`; `## 1. Purpose` |
| Page 023 purpose | Help verified workers discover, review, and apply for appropriate shifts. |
| Adjacent Page 022 | Availability Calendar |
| Adjacent Page 024 | Shift Details |
| Title inferred or renamed | No |
| Architecture amendment created | No |

## 3. Strengths

### 3.1 Purpose Clarity

The page clearly answers:

- what the worker can search;
- why results appear;
- what each result state means;
- what action is available;
- what requires more review;
- what is not guaranteed.

### 3.2 Worker Usability

The wireframe gives workers practical controls:

- date filters;
- role group filters;
- distance filters;
- status filters;
- requirement visibility;
- result sorting;
- direct paths to details, applications, profile gaps, and availability.

### 3.3 Operational Integrity

The wireframe preserves the critical operational chain:

```text
Available
does not equal
Eligible

Recommended
does not equal
Assigned

Applied
does not equal
Accepted

Accepted
does not equal
Worked

Worked
does not equal
Paid
```

### 3.4 Privacy

The page clearly separates:

- worker-only information;
- employer-visible assignment-relevant information;
- platform-only matching and audit information.

This is consistent with Pages 017-022 and the Worker Compliance Relationship Map.

### 3.5 AI Governance

AI is correctly framed as advisory.

AI may recommend and explain, but cannot:

- assign work;
- apply for the worker;
- approve eligibility;
- verify credentials;
- override availability;
- approve attendance;
- approve payment.

### 3.6 Mobile-First Design

The mobile wireframe keeps the core flow compact:

1. boundary notice;
2. readiness summary;
3. filters;
4. result count;
5. shift cards;
6. clear actions.

This supports fast worker use in real operational conditions.

## 4. Weaknesses

### 4.1 Eligibility Language Needs More Precision

The frozen architecture says "Only open, eligible shifts should be selectable." The wireframe correctly avoids a single eligibility badge, but it should more explicitly distinguish:

- eligible to view;
- eligible to review;
- eligible to apply;
- eligible for assignment after review.

Without this distinction, future implementation could accidentally treat "selectable" as a final eligibility decision.

### 4.2 Application Flow Needs a Stronger Human-Review Boundary

The wireframe says application is not assignment, but the Apply action should more clearly show the immediate next state:

```text
Application submitted
↓
Awaiting review / employer or platform workflow
↓
Worker acceptance or assignment confirmation where applicable
```

This avoids users thinking that Apply instantly reserves the shift.

### 4.3 Requirement Gap Presentation Should Avoid Shame or Overexposure

The Not Eligible card is useful, but the page should ensure requirement gaps are explained without exposing sensitive compliance details in the search list. Full details should remain in the appropriate page or Shift Details.

### 4.4 Offline State Needs Slightly More Guardrail

The wireframe notes offline saved lists may be visible and applying requires connectivity. It should also state that offline views may be stale and must not be used as proof that a shift is still open.

## 5. Risks

| Risk | Severity | Notes |
| --- | --- | --- |
| Eligibility collapse | High | Search Shifts could become the first place users assume all requirements are final. |
| Apply as assignment confusion | High | Workers may think applying immediately secures the shift unless the next state is prominent. |
| Sensitive requirement exposure | Medium | Requirement gaps must be useful without exposing private compliance details in search results. |
| Stale/offline result confusion | Medium | Offline or cached results must not imply live availability. |
| AI overconfidence | Medium | Recommendation explanations must stay evidence-based and qualified. |
| Generic job-board drift | Low | Current design avoids this, but visual implementation must keep operational context. |

## 6. Required Improvements

Before Page 023 becomes Approved Wireframe v1.0, revise the wireframe to address:

1. **Eligibility Precision**
   - Add a compact distinction between viewable, reviewable, applicable, and assignment-ready states.
   - Avoid treating one search-list label as final eligibility.

2. **Application Next-State Clarity**
   - Show what happens immediately after Apply.
   - Make "application submitted" visibly separate from "assignment confirmed".

3. **Sensitive Requirement Gap Handling**
   - Keep search-list explanations short and privacy-safe.
   - Route detailed requirement review to Shift Details or the owning worker page.

4. **Offline / Stale Data Warning**
   - Clarify that cached shift results may be outdated.
   - Applying or confirming availability requires live connectivity.

These conditions can be handled in a controlled Revision 1 without changing architecture.

## 7. Scorecard

| Category | Score |
| --- | ---: |
| Purpose clarity | 9.4 |
| Information ownership | 9.3 |
| Worker usability | 9.2 |
| Employer visibility | 9.5 |
| Privacy | 9.4 |
| Status clarity | 9.0 |
| AI governance | 9.6 |
| Accessibility | 9.3 |
| Mobile usability | 9.2 |
| International readiness | 9.5 |
| Operational readiness | 9.1 |
| Consistency with Pages 016-022 | 9.5 |
| Overall score | 9.3 |

## 8. Review Against Governance Requirements

| Requirement | Result |
| --- | --- |
| Worker-controlled information preserved | Pass |
| Employer-visible operational information limited | Pass |
| Authorized platform-only information identified | Pass |
| Truthful review and verification states used | Pass with refinement needed |
| Explicit AI limits included | Pass |
| Privacy by default | Pass |
| Mobile-first usability | Pass |
| Accessibility included | Pass |
| International readiness included | Pass |
| No unsupported guarantees | Pass |
| No automatic eligibility claims | Pass with refinement needed |
| Consistency with Page 016 Worker Dashboard | Pass |
| Consistency with Page 017 My Profile | Pass |
| Consistency with Page 018 Professional Information | Pass |
| Consistency with Page 019 Licenses | Pass |
| Consistency with Page 020 Certifications | Pass |
| Consistency with Page 021 Background Check | Pass |
| Consistency with Page 022 Availability Calendar | Pass |
| Consistency with Worker Compliance Relationship Map | Pass |
| Consistency with Epic 3 Mid-Epic Architecture Review | Pass |

## 9. Non-Blocking Design Debt

No new design-debt entry is required at this stage. The identified items are controlled Revision 1 conditions for Page 023, not deferred future enhancements.

## 10. Validation

- Pass: Exact frozen Page 023 title used.
- Pass: Architecture Freeze unchanged.
- Pass: Epic 3 Planning unchanged.
- Pass: Pages 016-022 unchanged.
- Pass: No Page 024 files created.
- Pass: No implementation started.
- Pass: No React created.
- Pass: No frontend created.
- Pass: No backend created.
- Pass: No APIs created.
- Pass: No database changes created.
- Pass: Unrelated app changes untouched.

## 11. Final Review Status

```text
Page 023 - Search Shifts
Wireframe: COMPLETE
Product Review: COMPLETE
Approval Record: NOT CREATED
Owner Review: REQUIRED
Recommendation: APPROVE WITH CONDITIONS

Page 024
BLOCKED
```
