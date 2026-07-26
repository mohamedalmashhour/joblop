# Resident Job

## Page 043 - Urgent Shift Product Design Review Revision 1

**Reviewed Wireframe:** `PAGE_043_URGENT_SHIFT_WIREFRAME_REVISION_1.md`  
**Status:** Review Revision 1 Complete  
**Recommendation:** Approve as Wireframe v1.0  
**Implementation:** Not Started  
**Page 044:** Unblocked, not created

---

## 1. Executive Summary

Revision 1 resolves the documented owner conditions for Page 043. The Urgent Shift page now clearly governs urgent staffing intake and urgent-request review without becoming an emergency service, staffing engine, scheduling engine, payroll page, billing page, matching engine, marketplace page, or AI automation surface.

The page is now suitable to freeze as **APPROVED WIREFRAME v1.0**.

---

## 2. Resolved Conditions

### Urgency Governance

Resolved. Standard, Short Notice, Same Day, and Critical Operational Need remain distinct configurable urgency classifications.

Key boundary:

```text
Urgent != Emergency
Critical != Guaranteed fulfillment
Urgency != Permission to bypass governance
```

### Lifecycle Separation

Resolved. Draft, Validation, Urgent Review, Publication Ready, Published, Applications, Assignment, Completion, and Closure are independent states.

No lifecycle state implies another.

### Scheduling Truthfulness

Resolved. Urgent request, worker assignment, worker confirmation, check-in, completion, and payroll approval remain separate.

### Pricing Boundary

Resolved. Base rate, urgent premium, travel allowance, transportation allowance, and employer estimated cost are separated from payroll and invoice outcomes.

Key boundary:

```text
Urgent premium != Guaranteed worker earnings
Estimated cost != Final invoice
Configured rate != Payroll calculation
```

### Qualification Boundary

Resolved. Licence, certification, background check, mandatory training, jurisdiction, and role requirements remain governed.

Key boundary:

```text
Urgency != Qualification bypass
Required qualification != Worker eligible
Eligible != Assigned
```

### Staffing Boundary

Resolved. Page 043 defines urgent staffing requirements only. It does not assign, rank, approve, reject, or guarantee workers.

### Publication Governance

Resolved. Validation, review, approval, publish request, publish success, and publish failure are independent.

Key boundary:

```text
Saved != Published
Validated != Published
Approved != Published
```

### Conflict Handling

Resolved. Duplicate urgent shift, overlap, inactive residence, inactive department, missing qualifications, invalid schedule, excessive staffing request, and conflicting urgency are represented as warnings.

Key boundary:

```text
Warnings != Automatic rejection
```

### Auditability

Resolved. Urgency creation, edits, pricing changes, publication, and cancellation are conceptually auditable with actor, role, timestamp, action, shift reference, prior state, and resulting state.

### AI Governance

Resolved. AI may summarize, explain, identify missing information, identify visible conflicts, and suggest wording. AI cannot publish, assign, price, bypass qualifications, override authorization, or guarantee fulfillment.

### Page 044 Boundary

Resolved. Page 043 does not introduce marketplace logic, worker discovery, marketplace visibility, automatic publication, worker matching, applicant ranking, or AI worker ranking.

Note: the owner order names Page 044 as Shift Marketplace, while the frozen architecture page map currently names Page 044 as AI Worker Suggestions. This review preserves the Page 044 boundary without renaming the frozen page map.

---

## 3. Scoring

| Category | Score | Revision 1 Assessment |
| --- | ---: | --- |
| Urgency governance | 9.7 | Urgent, critical, emergency, and fulfillment concepts are separated. |
| Lifecycle separation | 9.6 | States remain independent and truthful. |
| Pricing boundary | 9.6 | Premium, estimate, payroll, and invoice are separate. |
| Qualification governance | 9.7 | Urgency does not bypass eligibility requirements. |
| Staffing boundary | 9.7 | Requirements only; no assignment or ranking. |
| Publication governance | 9.6 | Save, validate, approve, request, and publish remain independent. |
| Conflict handling | 9.4 | Warnings are explicit and not automatic rejection. |
| Auditability | 9.5 | Conceptual audit metadata is complete. |
| AI governance | 9.8 | AI cannot make operational decisions. |
| Accessibility | 9.4 | Urgency warnings and classifications can be presented accessibly. |
| Mobile usability | 9.4 | Critical facts and status are prioritized for mobile. |
| International readiness | 9.6 | No hardcoded jurisdiction, emergency number, or response guarantee. |
| Consistency with Pages 041-042 | 9.6 | Standard, recurring, and urgent shift ownership remain distinct. |
| Readiness for Page 044 | 9.3 | Boundary is preserved; page-map naming mismatch remains documented. |

**Overall Score:** 9.6

---

## 4. Remaining Risks

No wireframe-blocking risks remain.

Future governance should resolve the Page 044 naming mismatch before beginning Page 044:

- Owner order: Page 044 - Shift Marketplace
- Frozen architecture map: Page 044 - AI Worker Suggestions

This is not a Page 043 defect, but it should be clarified before the next controlled gate.

---

## 5. Approval Criteria Assessment

| Criterion | Result |
| --- | --- |
| Urgency remains governed | Pass |
| Lifecycle states remain independent | Pass |
| Pricing remains truthful | Pass |
| Staffing remains separate | Pass |
| Qualification rules remain governed | Pass |
| Publication remains governed | Pass |
| Conflict handling is explicit | Pass |
| Page 044 ownership is preserved | Pass |
| Auditability is complete | Pass |
| AI cannot make operational decisions | Pass |
| No governance, operational, financial, or compliance risks remain | Pass |

---

## 6. Recommendation

Approve Page 043 as:

```text
APPROVED WIREFRAME v1.0
```

Unblock Page 044 as the next controlled gate, but clarify the Page 044 title/scope before creating it.

Do not create Page 044 during this task.

---

## 7. Validation

Confirmed:

- Pages 001-042 remain frozen.
- Architecture Freeze unchanged.
- Employer Portal planning unchanged.
- UX Foundation unchanged.
- Navigation unchanged.
- No Page 044 created.
- No implementation started.
- No React created.
- No frontend created.
- No backend created.
- No APIs created.
- No database changes created.
- No scheduling engine created.
- No staffing engine created.
- No payroll created.
- No billing created.
- No matching engine created.
- No AI automation created.

---

## 8. Final Status

```text
Page 043 — Urgent Shift
Product Design Review Revision 1: COMPLETE
Recommendation: APPROVED WIREFRAME v1.0

Page 044
UNBLOCKED
NOT CREATED
```
