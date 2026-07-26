# Resident Job

## Page 045 - Applicants Product Design Review

**Wireframe Reviewed:** `PAGE_045_APPLICANTS_LOW_FIDELITY_WIREFRAME.md`  
**Status:** Product Design Review Complete  
**Recommendation:** Approved With Documented Conditions  
**Approval Record:** Not Created  
**Page 046:** Blocked

---

## 1. Executive Summary

Page 045 successfully frames Applicants as a human-controlled applicant queue, review, filtering, comparison, and status-management page.

The wireframe does not assign workers, duplicate AI recommendations, create ranking or matching logic, own messaging or notifications, or replace the later assignment workflow. It protects worker privacy and keeps applicant review separate from eligibility, assignment, confirmation, check-in, payroll, and billing.

The page is ready for owner review.

---

## 2. Strengths

- Applicant lifecycle states are clearly separated.
- Applied, approved, assigned, confirmed, and checked-in are not collapsed.
- Applicant review focuses on qualifications, licences, certifications, availability, conflicts, documents, compliance status, and employer notes.
- Filtering is conceptual and does not create ranking algorithms or hidden exclusion rules.
- Comparison is side-by-side only and does not score or rank applicants automatically.
- Employer actions are explicit but remain separate from assignment.
- Worker privacy protections are strong.
- AI functionality is not duplicated; Page 044 remains the AI suggestions owner.
- Page 046 assignment boundary is preserved.
- Auditability is represented for review, shortlist, decline, archive, and move-to-assignment actions.

---

## 3. Weaknesses

- Comparison views can become dense on mobile and will need careful future high-fidelity design.
- Employer notes need strong future content controls to prevent improper criteria or protected information.
- The decline action needs later governance to ensure respectful, lawful, and auditable use.
- Page 046 title is frozen as Assigned Worker, while the owner order references Assignment; the boundary is preserved but should be handled carefully in the next gate.

---

## 4. Risk Review

### Lifecycle Separation Risk

Low. Applicant status, approval, assignment, confirmation, check-in, and payroll remain separate.

### Review Workflow Risk

Low. Review actions are explicit and human-controlled.

### Filtering Risk

Medium-low. Filtering is useful but must not become ranking, hidden exclusion, or automated decisioning.

### Comparison Risk

Medium-low. Side-by-side comparison is appropriate, but future design must prevent implicit automated ranking.

### Privacy Risk

Low. Private financial, health, dispute, investigation, document, location, and unrelated employment information is excluded.

### Assignment Boundary Risk

Low. Moving to assignment workflow does not confirm assignment.

### AI Separation Risk

Low. AI suggestions remain owned by Page 044.

---

## 5. Scoring

| Category | Score | Notes |
| --- | ---: | --- |
| Lifecycle separation | 9.6 | Applicant states are clear and independent. |
| Review workflow | 9.5 | Employer review actions are explicit. |
| Filtering | 9.2 | Useful but must remain non-ranking. |
| Comparison | 9.1 | Appropriate but visually complex for future mobile design. |
| Privacy | 9.7 | Minimum-necessary information boundary is strong. |
| Employer actions | 9.5 | Actions are clear and bounded. |
| Assignment boundary | 9.7 | Assignment remains outside Page 045. |
| AI separation | 9.8 | Page 044 remains the AI owner. |
| Auditability | 9.5 | Core applicant actions are auditable. |
| Accessibility | 9.3 | Cards, filters, and comparison can be accessible. |
| Mobile usability | 9.1 | Applicant list works; comparison will need care. |
| International readiness | 9.4 | No hardcoded role, licence, language, distance, or compliance model. |
| Consistency with Pages 041-044 | 9.6 | Fits after shift creation, urgent shift, and AI suggestions. |

**Overall Score:** 9.5

---

## 6. Required Owner Review Conditions

The page should remain at owner-review status until these points are accepted:

1. Confirm that Applicants does not own assignment.
2. Confirm that filtering and comparison cannot become automated ranking.
3. Confirm that employer notes require privacy and fairness boundaries.
4. Confirm that decline and archive actions remain auditable and do not imply misconduct.
5. Confirm that AI suggestions remain exclusive to Page 044.

These are owner-review conditions, not architecture defects.

---

## 7. Non-Blocking Design Debt

- Future high-fidelity design should test applicant comparison on mobile.
- Future governance should define employer-note content rules.
- Future implementation planning should define safe decline reasons and audit requirements.
- Future Page 046 planning should clarify the relationship between Applicants and Assigned Worker.

No new entry was required in the central design debt register during this low-fidelity gate.

---

## 8. Validation

Confirmed:

- Pages 001-044 remain unchanged.
- Page 044 remains approved and frozen.
- No Page 046 files created.
- No approval record created.
- No implementation started.
- No React created.
- No frontend created.
- No backend created.
- No APIs created.
- No database changes created.
- No staffing engine created.
- No assignment engine created.
- No payroll created.
- No billing created.
- No notifications created.
- No messaging created.
- No ranking created.
- No matching created.
- No AI automation created.

---

## 9. Final Status

```text
Page 045 — Applicants
Wireframe: COMPLETE
Product Review: COMPLETE
Approval Record: NOT CREATED
Owner Review: REQUIRED

Page 046
BLOCKED
```
