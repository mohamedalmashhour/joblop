# Resident Job

## Page 043 - Urgent Shift Product Design Review

**Wireframe Reviewed:** `PAGE_043_URGENT_SHIFT_LOW_FIDELITY_WIREFRAME.md`  
**Status:** Product Design Review Complete  
**Recommendation:** Approved With Documented Conditions  
**Approval Record:** Not Created  
**Page 044:** Blocked

---

## 1. Executive Summary

Page 043 successfully frames Urgent Shift as a governed urgent staffing request workflow, not an emergency service, guaranteed fulfillment mechanism, staffing engine, assignment page, payroll page, billing page, notification system, matching engine, or AI automation surface.

The wireframe distinguishes urgent intake, urgent review, publication, applications, assignment, completion, and closure. It also preserves worker eligibility, pricing, publication, auditability, and AI boundaries.

The page is ready for owner review. It should not receive an approval record until the owner confirms that the urgency classification, critical-facts intake, and no-guarantee language are acceptable.

---

## 2. Strengths

- Strong distinction between urgent staffing and emergency services.
- Urgency does not imply guaranteed fulfillment or governance bypass.
- Lifecycle separates draft, urgent review, publication, applications, assignment, completion, and closure.
- Critical facts checklist supports fast review without inventing dispatch logic.
- Pricing section separates standard rate, urgent premium, travel allowance, transportation allowance, employer estimate, payroll, and invoice.
- Worker eligibility remains protected: urgent does not bypass licence, certification, background check, role, or jurisdiction requirements.
- Publication remains governed and does not occur automatically.
- AI boundaries are explicit and advisory only.
- Auditability includes urgency creation, changes, pricing changes, publication, and cancellation.
- Accessibility and mobile-first design are covered.
- International readiness avoids hardcoded emergency numbers, response times, currency, premium rules, labour rules, and jurisdiction-specific requirements.

---

## 3. Weaknesses

- Urgency language requires careful content review to avoid implying emergency response or guaranteed staffing.
- Critical Operational Need may be misunderstood as emergency services unless strong boundary copy remains visible.
- Premium and estimate language must remain precise in future high-fidelity design.
- Page 044 boundary needs future reconciliation with the frozen page map if Page 044 ownership differs from the owner order.

---

## 4. Risk Review

### Urgency Governance Risk

Medium-low. The page uses strong no-guarantee and no-bypass messaging, but urgency language needs owner review.

### Lifecycle Risk

Low. Draft, urgent review, publication, application, assignment, completion, and closure remain separate.

### Pricing Risk

Medium-low. Premium and estimate concepts are present, but the page clearly states that premium is not guaranteed payment, estimate is not invoice, and configured rate is not payroll.

### Qualification Risk

Low. Urgent requests cannot bypass licences, certifications, background checks, role requirements, or jurisdiction.

### Publication Risk

Low. Publication is governed and not automatic.

### AI Governance Risk

Low. AI cannot publish, assign, change pricing, bypass qualifications, guarantee fulfillment, or override authorization.

### International Readiness Risk

Low. No country-specific emergency number, response time, labour rule, or premium rule is hardcoded.

---

## 5. Scoring

| Category | Score | Notes |
| --- | ---: | --- |
| Urgency governance | 9.4 | Strong, but owner should confirm language. |
| Lifecycle separation | 9.5 | Request, review, publication, application, assignment, completion, and closure are distinct. |
| Pricing boundary | 9.2 | Clear estimate/premium/payroll/invoice separation. |
| Qualification boundary | 9.6 | Urgent does not bypass requirements. |
| Publication governance | 9.5 | No automatic publication from urgency. |
| Auditability | 9.4 | Key urgent request actions are conceptually auditable. |
| AI governance | 9.7 | AI remains advisory only. |
| Accessibility | 9.3 | Urgency controls and warnings are accessible in concept. |
| Mobile usability | 9.2 | Mobile prioritizes urgency level, missing facts, and confirmation status. |
| International readiness | 9.5 | No hardcoded jurisdiction or emergency assumptions. |
| Consistency with Pages 041-042 | 9.4 | Standard, recurring, and urgent shift boundaries remain distinct. |

**Overall Score:** 9.4

---

## 6. Required Owner Review Conditions

The page should remain at owner-review status until these points are accepted:

1. Confirm that "Critical Operational Need" does not imply emergency service or guaranteed response.
2. Confirm that urgent no-guarantee language is strong enough for employer expectations.
3. Confirm that urgent premium, travel allowance, transportation allowance, estimate, payroll, and invoice are sufficiently separated.
4. Confirm that urgent publication should remain governed and not automatic.
5. Confirm that Page 043 must not include marketplace behavior or automatic matching.

These are owner-review conditions, not architecture defects.

---

## 7. Non-Blocking Design Debt

- Future content review should standardize urgency labels and warnings.
- Future high-fidelity design should test whether users understand "urgent" as prioritized review rather than guaranteed staffing.
- Future engineering planning should define urgency policy, escalation policy, and premium policy as configurable rules.
- Future governance should reconcile Page 044 ownership if the frozen page map and owner order describe different boundaries.

No new entry was required in the central design debt register during this low-fidelity gate.

---

## 8. Validation

Confirmed:

- Pages 001-042 remain unchanged.
- Page 042 remains approved and frozen.
- No Page 044 files created.
- No approval record created.
- No implementation started.
- No React created.
- No frontend created.
- No backend created.
- No APIs created.
- No database changes created.
- No staffing engine created.
- No scheduling engine created.
- No payroll created.
- No billing created.
- No notifications created.
- No messaging created.
- No matching created.
- No surge-pricing created.
- No compliance integration created.
- No AI integration created.

---

## 9. Final Status

```text
Page 043 — Urgent Shift
Wireframe: COMPLETE
Product Review: COMPLETE
Approval Record: NOT CREATED
Owner Review: REQUIRED

Page 044
BLOCKED
```
