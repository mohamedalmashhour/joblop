# Resident Job

## Page 045 - Applicants Product Design Review Revision 1

**Reviewed Wireframe:** `PAGE_045_APPLICANTS_WIREFRAME_REVISION_1.md`  
**Status:** Review Revision 1 Complete  
**Recommendation:** Approve as Wireframe v1.0  
**Implementation:** Not Started  
**Page 046:** Unblocked, not created

---

## 1. Executive Summary

Revision 1 resolves the documented owner conditions for Page 045. The Applicants page now clearly governs applicant queue review, applicant status, filtering, comparison, employer review actions, privacy, fairness, auditability, and AI separation without becoming an assignment workflow, staffing engine, ranking engine, matching engine, messaging system, notification system, payroll page, billing page, or AI decision surface.

The page is now suitable to freeze as **APPROVED WIREFRAME v1.0**.

---

## 2. Resolved Conditions

### Applicant Lifecycle

Resolved. Application submitted, application received, employer review, shortlisted, clarification requested, offer pending, accepted, declined, withdrawn, and closed remain independent.

Key boundary:

```text
Applied != Shortlisted
Shortlisted != Approved
Approved != Assigned
Assigned != Confirmed
Confirmed != Checked in
```

### Human Decision Boundary

Resolved. Viewed, reviewed, shortlisted, declined, clarification requested, and moved to assignment are separate human-controlled states.

Key boundary:

```text
Employer review != Assignment
Shortlist != Offer
Offer != Acceptance
```

### Qualification Truthfulness

Resolved. Licence, certification, background check, availability, required training, and document status are separate governed review signals.

Key boundary:

```text
Visible qualification != Verified
Verified != Eligible
Eligible != Assigned
```

### Filtering Boundary

Resolved. Filtering may use only governed criteria and must not use protected characteristics, health information, complaints, disputes, or retaliation indicators.

Key boundary:

```text
Filter result != Hiring recommendation
```

### Comparison Boundary

Resolved. Applicant comparison is informational only. It cannot compute hidden scores, automatically rank, automatically reject, hide applicants, or create AI hiring decisions.

### Privacy

Resolved. Employers cannot see banking information, tax information, protected complaints, internal investigations, private disputes, unrelated employment history, protected health information, or internal moderation notes.

### AI Boundary

Resolved. Page 045 owns no AI decision-making. AI suggestions remain on Page 044 only.

Key boundary:

```text
AI suggestion != Employer decision
Employer decision != Assignment
```

### Fairness

Resolved. Race, ethnicity, religion, disability, sex, gender identity, sexual orientation, family status, protected complaints, and retaliation indicators are prohibited from applicant review.

Key boundary:

```text
Low rating != Automatic rejection
Complaint history != Reduced consideration
```

### Auditability

Resolved. Applicant review, shortlist, clarification, decline, archive, and move-to-assignment actions are conceptually auditable with actor, role, timestamp, action, applicant reference, prior state, and resulting state.

### Page 046 Boundary

Resolved. Page 045 owns Applicant Review. Page 046 owns Assigned Worker. Assignment management is not introduced into Page 045.

---

## 3. Scoring

| Category | Score | Revision 1 Assessment |
| --- | ---: | --- |
| Lifecycle separation | 9.8 | Applicant states remain truthful and independent. |
| Employer review workflow | 9.7 | Human-controlled review actions are explicit. |
| Qualification truthfulness | 9.7 | Visible, verified, eligible, and assigned are separate. |
| Filtering | 9.6 | Governed filters only; no protected or retaliatory inputs. |
| Comparison | 9.5 | Informational only; no hidden ranking or automatic rejection. |
| Privacy | 9.8 | Minimum-necessary disclosure is clear. |
| Fairness | 9.8 | Protected and retaliation criteria are explicitly prohibited. |
| AI separation | 9.8 | Page 044 remains the only AI suggestions owner. |
| Assignment boundary | 9.8 | Page 046 ownership is preserved. |
| Auditability | 9.6 | Core applicant actions are auditable. |
| Accessibility | 9.4 | Applicant cards and review controls can be accessible. |
| Mobile usability | 9.4 | Queue-first approach works on mobile. |
| International readiness | 9.5 | No hardcoded role, licence, language, or compliance model. |
| Consistency with Pages 041-044 | 9.7 | Applicant review fits after shift creation and AI suggestions. |
| Readiness for Page 046 | 9.7 | Page 046 handoff is clean. |

**Overall Score:** 9.7

---

## 4. Remaining Risks

No wireframe-blocking risks remain.

Future design and engineering work must still define:

- safe employer note policy
- decline reason governance
- exact applicant visibility rules
- comparison layout behavior on mobile
- assignment workflow handoff details

These are future implementation/governance concerns, not Page 045 wireframe defects.

---

## 5. Approval Criteria Assessment

| Criterion | Result |
| --- | --- |
| Applicant lifecycle remains truthful | Pass |
| Employer decisions remain human-controlled | Pass |
| Qualifications remain governed | Pass |
| Filtering remains fair | Pass |
| Comparison remains informational | Pass |
| Privacy is preserved | Pass |
| Page 046 ownership is preserved | Pass |
| Auditability is complete | Pass |
| AI remains advisory only | Pass |
| No governance, privacy, operational, or compliance risks remain | Pass |

---

## 6. Recommendation

Approve Page 045 as:

```text
APPROVED WIREFRAME v1.0
```

Unblock Page 046 as the next controlled gate.

Do not create Page 046 during this task.

---

## 7. Validation

Confirmed:

- Pages 001-044 remain frozen.
- Architecture Freeze unchanged.
- Employer Portal planning unchanged.
- UX Foundation unchanged.
- Navigation unchanged.
- No Page 046 created.
- No implementation started.
- No React created.
- No frontend created.
- No backend created.
- No APIs created.
- No database changes created.
- No assignment engine created.
- No staffing engine created.
- No payroll created.
- No billing created.
- No notifications created.
- No messaging created.
- No AI automation created.

---

## 8. Final Status

```text
Page 045 — Applicants
Product Design Review Revision 1: COMPLETE
Recommendation: APPROVED WIREFRAME v1.0

Page 046 — Assigned Worker
UNBLOCKED
NOT CREATED
```
