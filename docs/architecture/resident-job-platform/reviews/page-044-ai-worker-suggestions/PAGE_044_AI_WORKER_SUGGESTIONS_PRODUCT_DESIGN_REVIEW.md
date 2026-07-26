# Resident Job

## Page 044 - AI Worker Suggestions Product Design Review

**Wireframe Reviewed:** `PAGE_044_AI_WORKER_SUGGESTIONS_LOW_FIDELITY_WIREFRAME.md`  
**Status:** Product Design Review Complete  
**Recommendation:** Approved With Documented Conditions  
**Approval Record:** Not Created  
**Page 045:** Blocked

---

## 1. Executive Summary

Page 044 successfully frames AI Worker Suggestions as an advisory, explainable, human-controlled review surface. It does not assign workers, publish shifts, contact workers automatically, replace Applicants, create marketplace behavior, or make final staffing decisions.

The wireframe strongly protects worker privacy, fairness, protected-characteristic exclusion, eligibility governance, and auditability. It is ready for owner review.

---

## 2. Strengths

- Every suggestion resolves from a governed source shift.
- Suggestion, invitation, application, and assignment are clearly separated.
- Explainability is central: each suggestion shows why it appears, matched requirements, unconfirmed requirements, visible conflicts, freshness, source record, and limitations.
- Suggestion generation, worker relevance, employer action, and invitation states remain independent.
- Human decision boundaries are explicit.
- Worker privacy protections are strong.
- Protected characteristics and retaliation signals are explicitly excluded.
- Ratings cannot become the sole eligibility or suggestion factor.
- Applicants workflow remains separate and blocked.
- Auditability captures suggestion request, input version, rules/model version, suggestion result, employer review, shortlist, dismissal, invitation request, and overrides.
- AI boundaries are clear and advisory only.

---

## 3. Weaknesses

- Suggestion explainability may become visually dense without careful high-fidelity design.
- Worker privacy messaging must remain compact so employers still understand why some details are hidden.
- Future implementation must carefully define which worker details are minimum necessary.
- Invitation workflow is referenced but not designed here, so future pages must preserve the boundary.

---

## 4. Risk Review

### Shift Source-of-Truth Risk

Low. Suggestions require a governed shift source and cannot appear as generic worker recommendations.

### Suggestion Explainability Risk

Low-medium. The design requires explanation and limitation notices, but later visual design must avoid clutter.

### Eligibility Boundary Risk

Low. Match indicators and high relevance do not equal eligibility approval or assignment.

### Human Control Risk

Low. AI cannot review, shortlist, invite, assign, publish, contact, or reject workers automatically.

### Worker Privacy Risk

Low. Private documents, background-check detail, banking, tax, disputes, moderation notes, health, earnings, unrelated employer history, and precise private location are excluded.

### Fairness Risk

Low. Protected characteristics, complaints, disputes, accessibility use, unrelated shift declines, and unrelated availability are excluded from suggestion logic.

### Applicants Boundary Risk

Low. Page 044 routes toward Applicants but does not own applicant review.

---

## 5. Scoring

| Category | Score | Notes |
| --- | ---: | --- |
| Shift source-of-truth | 9.7 | Suggestions require governed shift context. |
| Suggestion explainability | 9.5 | Strong explanation model with freshness and limits. |
| Independent states | 9.6 | Generation, relevance, action, and invitation states are separate. |
| Eligibility boundary | 9.7 | Suggestion does not equal approval, eligibility, invitation, or assignment. |
| Human control | 9.8 | Employer remains in control of all actions. |
| Worker privacy | 9.7 | Minimum-necessary disclosure is explicit. |
| Fairness | 9.7 | Retaliation and protected-characteristic exclusions are strong. |
| Protected-characteristic exclusion | 9.8 | Explicitly barred from suggestion inputs. |
| Invitation boundary | 9.5 | Invitation is governed and separate. |
| Applicants boundary | 9.6 | Page 045 remains Applicants. |
| Auditability | 9.5 | Suggestion and employer actions are conceptually auditable. |
| AI governance | 9.8 | AI cannot make operational decisions. |
| Accessibility | 9.4 | Card explanations and controls can be accessible. |
| Mobile usability | 9.3 | Progressive disclosure fits mobile review. |
| International readiness | 9.5 | No hardcoded licence, role, jurisdiction, or language model. |
| Consistency with Pages 041-043 | 9.6 | Follows shift creation, recurrence, and urgency governance. |

**Overall Score:** 9.6

---

## 6. Required Owner Review Conditions

The page should remain at owner-review status until these points are accepted:

1. Confirm that suggestion explainability is sufficient for employer trust.
2. Confirm that worker privacy boundaries are strict enough.
3. Confirm that protected characteristics and retaliation signals are excluded from suggestion inputs.
4. Confirm that ratings cannot become the sole eligibility or recommendation factor.
5. Confirm that Page 044 does not replace Applicants, invitations, assignment, marketplace, or human staffing decisions.

These are owner-review conditions, not architecture defects.

---

## 7. Non-Blocking Design Debt

- Future high-fidelity design should test suggestion cards for density and scannability.
- Future implementation planning must define minimum-necessary worker fields.
- Future governance should define how model/rules version is displayed in audit records.
- Future design should decide whether employer dismissal feedback is allowed and how to prevent unfair feedback loops.

No new entry was required in the central design debt register during this low-fidelity gate.

---

## 8. Validation

Confirmed:

- Frozen title remains AI Worker Suggestions.
- Pages 001-043 remain unchanged.
- Page 045 remains Applicants.
- No marketplace page created.
- No Page 045 files created.
- No approval record created.
- No implementation started.
- No React created.
- No frontend created.
- No backend created.
- No APIs created.
- No database changes created.
- No matching engine created.
- No ranking engine created.
- No invitation implementation created.
- No notification or messaging implementation created.
- No AI automation created.

---

## 9. Final Status

```text
Page 044 — AI Worker Suggestions
Wireframe: COMPLETE
Product Review: COMPLETE
Approval Record: NOT CREATED
Owner Review: REQUIRED

Page 045 — Applicants
BLOCKED
```
