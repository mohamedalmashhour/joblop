# Resident Job

## Page 058 - Manual Assignment Product Design Review

**Wireframe Reviewed:** `PAGE_058_MANUAL_ASSIGNMENT_LOW_FIDELITY_WIREFRAME.md`  
**Status:** Product Design Review Complete  
**Recommendation:** Approved With Documented Conditions  
**Approval Record:** Not Created  
**Implementation:** Not Started  
**Page 059:** Conflict Resolution blocked

---

## 1. Executive Summary

Page 058 successfully defines Manual Assignment as the explicit human assignment execution surface
after AI Dispatch or independent manual review. It preserves human authority, keeps AI
recommendations advisory, separates assignment from notification and worker acceptance, protects
accepted terms, routes conflicts to Page 059, and prevents assignment from becoming attendance,
payroll, invoicing, or payment.

The page is complete at the owner-review gate. It should not be frozen until the owner confirms
the documented conditions around eligibility truthfulness, assignment execution, fairness,
notification separation, privacy, auditability, Page 046 handoff, and Page 059 boundary.

---

## 2. Strengths

- Human authority is explicit and central to the page.
- AI Dispatch is treated as optional evidence only and cannot generate assignment decisions.
- Eligibility, visibility, selection, assignment, worker acceptance, attendance, and payroll remain separate.
- The page prevents hidden worker ranking and protected-data use.
- Assignment cannot silently contact workers or employers.
- Accepted shift terms are protected from silent modification.
- The handoff to Page 046 is clear without duplicating Assigned Worker functionality.
- Page 059 - Conflict Resolution is identified as the next frozen boundary.
- Auditability captures actor, role, shift, selected worker, evidence, AI reference, decision reason, override reason, and handoff target.

---

## 3. Weaknesses

- Future implementation will need strict role and tenant checks before displaying worker candidates.
- Future engineering must define the assignment handoff contract between Page 058 and the authoritative assignment workflow.
- Mobile candidate selection can become dense if evidence, gaps, and reasons are not progressively disclosed.
- The exact notification workflow after assignment creation remains future work and must stay outside Page 058.

These are future implementation risks, not current wireframe implementation work.

---

## 4. Risk Review

### Human Authority Risk

Low. The wireframe requires an authorized human operator, reviewed evidence, selected worker,
selection reason, and handoff target.

### Eligibility Truthfulness Risk

Low. The page distinguishes visible, eligible, selected, assigned, and accepted worker states.
Blocking gaps and stale availability must be displayed rather than hidden.

### AI Recommendation Risk

Low. AI recommendations are optional evidence only. Page 058 does not generate AI recommendations
and cannot treat AI output as an assignment decision.

### Fairness Risk

Low. The page restricts assignment criteria to governed operational criteria and prohibits
protected characteristics, unrelated personal data, retaliation indicators, complaint misuse,
hidden reputation penalties, and unrelated financial information.

### Notification Risk

Low. Assignment creation is separated from notification. The page cannot send email, SMS, push,
messages, invitations, or employer contact automatically.

### Accepted-Terms Risk

Low. The page cannot silently alter role, time, location, rate, requirements, cancellation
expectations, or assignment scope.

### Privacy Risk

Low. Worker information is minimized to operational assignment needs and excludes full profiles,
home addresses, full documents, health information, private messages, support details, complaints,
financial data, and protected personal information.

### Page 059 Boundary Risk

Low. Conflict Resolution is identified as the next frozen title and Page 058 routes unresolved
conflicts there instead of resolving them.

---

## 5. Scorecard

| Category | Score | Notes |
| --- | ---: | --- |
| Human authority | 10.0 | Human selection and reason capture are central. |
| Eligibility truthfulness | 9.9 | Visible, eligible, selected, assigned, and accepted states remain separate. |
| AI recommendation separation | 10.0 | AI Dispatch evidence cannot become assignment decision. |
| Fairness | 9.9 | Governed criteria and prohibited criteria are explicit. |
| Assignment execution | 9.8 | Assignment handoff is clear and bounded. |
| Notification separation | 10.0 | Page cannot contact workers or employers automatically. |
| Accepted-terms protection | 9.9 | Silent term changes are prohibited. |
| Auditability | 9.8 | Decision context, evidence, reasons, and handoff are preserved. |
| Privacy | 9.9 | Worker data is minimum necessary. |
| Page 046 handoff | 9.8 | Assigned Worker remains authoritative for assigned worker display/state. |
| Page 059 boundary | 9.9 | Conflict Resolution is identified and not created. |
| Accessibility | 9.7 | Candidate cards, decision controls, gaps, and warnings are accessible. |
| Mobile usability | 9.6 | Mobile flow prioritizes shift, readiness, candidate, reason, and handoff. |
| International readiness | 9.8 | Country-specific rules remain configurable and out of scope. |
| Consistency with Pages 001-057 | 9.9 | Frozen pages and the governance stack are preserved. |

**Overall Score:** 9.9

---

## 6. Required Owner Review Conditions

The page should remain at owner-review status until these points are accepted:

1. Confirm Page 058 owns explicit human assignment execution only.
2. Confirm AI recommendation remains separate from human assignment decision.
3. Confirm human selection does not notify workers or employers.
4. Confirm assignment created does not equal worker acceptance.
5. Confirm worker acceptance does not equal attendance.
6. Confirm eligibility, qualification, availability, and conflict states are truthful and independent.
7. Confirm protected and unrelated data cannot influence manual assignment.
8. Confirm accepted shift terms cannot be silently changed.
9. Confirm Page 046 remains the Assigned Worker handoff.
10. Confirm Page 059 - Conflict Resolution owns unresolved conflicts.
11. Confirm auditability is sufficient for future engineering.

These are owner-review conditions, not implementation defects.

---

## 7. Non-Blocking Design Debt

- Future engineering should define a formal assignment handoff contract.
- Future implementation should define candidate-pool snapshot retention.
- Future design should test candidate selection cards on small mobile screens.
- Future governance should define notification triggers after assignment without placing them in Page 058.
- Future Page 059 should preserve conflict ownership without reopening assignment logic.

No new entry was required in the central Design Debt Register during this gate.

---

## 8. Validation

Confirmed:

- Governance control stack unchanged.
- Pages 001-057 remain unchanged.
- Exact Page 059 title identified as Conflict Resolution.
- No Page 059 files created.
- No approval record created.
- No implementation started.
- No React created.
- No frontend created.
- No backend created.
- No APIs created.
- No database changes created.
- No assignment engine created.
- No notifications created.
- No AI automation created.
- No commit, push, merge, or deployment performed.
- Unrelated app changes remain untouched.

---

## 9. Final Status

```text
Page 058 — Manual Assignment
Wireframe: COMPLETE
Product Review: COMPLETE
Approval Record: NOT CREATED
Owner Review: REQUIRED

Page 059 — Conflict Resolution
BLOCKED
```
