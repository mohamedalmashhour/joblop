# Resident Job

## Page 041 - Create Shift Product Design Review

**Wireframe Reviewed:** `PAGE_041_CREATE_SHIFT_LOW_FIDELITY_WIREFRAME.md`  
**Status:** Product Design Review Complete  
**Recommendation:** Approved With Documented Conditions  
**Approval Record:** Not Created  
**Page 042:** Blocked

---

## 1. Executive Summary

Page 041 successfully frames Create Shift as a governed employer draft-and-publication experience rather than a scheduling engine, staffing engine, assignment page, payroll page, billing page, or AI automation surface.

The wireframe strongly separates draft, validation, approval, publication, and staffing states. It also protects critical downstream boundaries: worker eligibility, application review, worker assignment, attendance, timesheets, payroll, employer billing, payments, notifications, messaging, compliance verification, and document verification remain outside Page 041.

The page is ready for owner review. It should not receive an approval record until the owner confirms that the form sequence, publication confirmation, and rate/pricing language are acceptable for the Employer Portal.

---

## 2. Strengths

- Clear operational boundary: draft creation is separate from publication, staffing, assignment, attendance, payroll, billing, and payments.
- Strong state model: draft, validation, approval, publication, and staffing states remain independent.
- Good permission clarity: dashboard visibility does not imply shift-creation, publication, rate override, or worker-assignment authority.
- Worker role governance is protected: role selection does not imply eligibility, assignment, or universal qualification requirements.
- Scheduled time is separated from worked time, actual checkout, overtime, and approved timesheet hours.
- Rate and pricing messaging avoids treating estimates as final payroll or final invoice.
- Urgent and same-day shift messaging avoids guaranteed fulfillment.
- Location and description sections protect resident, patient, private staff, and protected health information.
- AI boundaries are explicit and appropriate.
- Mobile flow avoids one long form and uses step-based creation.
- Accessibility and international readiness are addressed.

---

## 3. Weaknesses

- The review-and-publish step is necessarily dense because it summarizes many governed inputs.
- Rate and pricing language will require careful later content review to avoid confusion between worker-facing compensation and employer-facing estimates.
- Multi-user draft editing is represented conceptually only, so later engineering must define exact behavior before implementation.
- Publication review depends on future permission and approval models that are not implemented in this wireframe phase.

---

## 4. Risk Review

### Operational Risk

Low. The page does not merge draft, publication, staffing, assignment, attendance, or timesheet concepts.

### Financial Risk

Medium-low. The page includes worker rate and employer estimated cost, but the wireframe clearly states that estimates are not final payroll or final invoice.

### Privacy Risk

Low. Location and description guidance explicitly prohibit resident-identifying information, medical details, broad security codes, and protected health information.

### Permission Risk

Low. Permission boundaries are visible and conceptual roles are separated.

### AI Governance Risk

Low. AI is limited to explanation, summarization, safe drafting, missing-field detection, and navigation support.

### International Readiness Risk

Low. The page avoids hardcoded currencies, date formats, time formats, worker roles, urgent definitions, break rules, licence models, and payroll assumptions.

---

## 5. Scoring

| Category | Score | Notes |
| --- | ---: | --- |
| Shift lifecycle separation | 9.6 | Draft, validation, approval, publication, and staffing remain independent. |
| Source-of-truth clarity | 9.5 | Downstream authoritative workflows are clearly referenced. |
| Organization/residence/department authorization | 9.4 | Context chain and authorization caveats are explicit. |
| Employer role permissions | 9.3 | Permission distinctions are clear without implementation details. |
| Scheduled-time truthfulness | 9.7 | Scheduled time is clearly separated from worked and approved time. |
| Staffing quantity clarity | 9.3 | Requested, assigned, and remaining counts remain separate. |
| Rate and pricing boundary | 9.1 | Strong, but should receive owner attention before approval. |
| Urgent-shift governance | 9.5 | Urgency does not imply fulfillment or bypass. |
| Break rules | 9.3 | Break planning is separated from payroll deduction. |
| Location privacy | 9.7 | Minimum-necessary disclosure is well represented. |
| Description safety | 9.6 | Prohibited-content guidance is strong. |
| Qualification requirements | 9.4 | Self-contained and avoids universal requirements. |
| Eligibility boundary | 9.6 | Eligibility is not decided on this page. |
| Visibility | 9.4 | Visibility states are distinct and scoped. |
| Application and assignment boundary | 9.6 | Apply, assign, accept, and confirm remain separate. |
| Cancellation boundary | 9.2 | Clear enough for wireframe; later policy configuration needed. |
| Publication review | 9.1 | Strong but dense; should be reviewed carefully by owner. |
| Conflict awareness | 9.3 | Warnings do not silently block unless governed. |
| Draft governance | 9.2 | Save/validate/approve/publish are separate. |
| Auditability | 9.4 | Conceptual audit metadata is complete. |
| AI governance | 9.8 | AI is advisory only. |
| Mobile usability | 9.2 | Step-based flow fits mobile creation. |
| Accessibility | 9.3 | Accessibility considerations are broad and appropriate. |
| International readiness | 9.5 | No country-specific assumptions introduced. |
| Consistency with Pages 037-040 | 9.4 | Employer Portal boundaries are respected. |
| Readiness for later shift-management pages | 9.3 | Inputs and boundaries for Pages 042+ are clear. |

**Overall Score:** 9.4

---

## 6. Required Owner Review Conditions

The page should remain at owner-review status until these points are accepted:

1. Confirm that the 11-step creation flow is understandable for employer users.
2. Confirm that the publication confirmation language is strong enough to prevent silent publishing.
3. Confirm that worker-facing rate and employer-facing estimated cost are separated clearly enough for future implementation.
4. Confirm that urgent and same-day language does not imply guaranteed fulfillment.
5. Confirm that location guidance is operationally useful while preserving privacy.

These are owner-review conditions, not architecture defects.

---

## 7. Non-Blocking Design Debt

- Future high-fidelity design should explore progressive disclosure for the review-and-publish summary.
- Future implementation planning should define exact multi-user draft conflict behavior.
- Future content review should standardize employer-facing labels for rates, premiums, travel allowance, and estimated cost.
- Future design should consider a compact mobile warning drawer to avoid overwhelming the step flow.

No new entry was required in the central design debt register during this low-fidelity gate.

---

## 8. Validation

Confirmed:

- Frozen title remains Create Shift.
- Architecture Freeze unchanged.
- Employer Portal planning unchanged.
- Pages 001-040 unchanged.
- No Page 042 files created.
- No approval record created.
- No implementation started.
- No React created.
- No frontend created.
- No backend created.
- No APIs created.
- No database changes created.
- No shift implementation created.
- No scheduling engine created.
- No staffing or matching implementation created.
- No payroll or billing implementation created.
- No notification or messaging implementation created.
- No compliance or document-verification implementation created.
- No AI shift implementation created.

---

## 9. Final Status

```text
Page 041 — Create Shift
Wireframe: COMPLETE
Product Review: COMPLETE
Approval Record: NOT CREATED
Owner Review: REQUIRED

Page 042
BLOCKED
```
