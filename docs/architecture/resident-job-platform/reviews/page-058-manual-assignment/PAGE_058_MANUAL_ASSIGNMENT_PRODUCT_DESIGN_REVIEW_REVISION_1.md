# Resident Job

## Page 058 - Manual Assignment Product Design Review Revision 1

**Wireframe Reviewed:** `PAGE_058_MANUAL_ASSIGNMENT_WIREFRAME_REVISION_1.md`  
**Status:** Product Design Review Revision 1 Complete  
**Recommendation:** Approve as Wireframe v1.0  
**Implementation:** Not Started  
**Page 059:** Conflict Resolution unblocked after approval, not created

---

## 1. Executive Summary

Revision 1 resolves the documented owner conditions for Page 058 - Manual Assignment. Human
assignment authority is explicit, AI remains advisory, eligibility cannot be bypassed, fairness
protections apply to human and AI-informed decisions, availability and qualifications remain
truthful, accepted terms are protected, notifications remain outside Page 058, Page 046 remains the
authoritative Assigned Worker handoff, Page 059 owns conflict resolution, privacy is preserved, and
auditability is complete.

The page is ready to freeze as Approved Wireframe v1.0.

---

## 2. Resolved Conditions

| Owner condition | Revision 1 result |
| --- | --- |
| Human assignment authority | Resolved with authorized role distinctions and explicit actor accountability. |
| Assignment lifecycle | Resolved with independent selection, submission, creation, notification, response, accepted, declined, expired, cancelled, replaced, and unavailable states. |
| Shift eligibility | Resolved with active/open shift, role, time, residence, department, rate, responsibilities, conflict, and cancellation checks. |
| Worker eligibility | Resolved with account, role, qualification, licence, certification, background-check, availability, conflict, authorization, compliance, and unavailable states. |
| AI recommendation boundary | Resolved by keeping Page 057 as AI Dispatch owner and Page 058 as human decision owner. |
| Manual candidate selection | Resolved with governed pool selection, alternatives, no-candidate/defer paths, and rationale capture. |
| Override governance | Resolved with reason, alternative evidence, policy exception, supervisor review, accepted/blocked/deferred states. |
| Fairness | Resolved by prohibiting protected characteristics, complaint misuse, investigations, retaliation indicators, unrelated financial data, and unrelated private information. |
| Availability truthfulness | Resolved with available, conditional, unavailable, conflict, stale, unknown, and confirmation-required states. |
| Qualification truthfulness | Resolved with requirement, submitted, verified, current, expired, unavailable, and review-required states. |
| Shift-term protection | Resolved with governed term display and explicit change review. |
| Assignment execution boundary | Resolved by limiting Page 058 to submission of a human-approved assignment decision. |
| Notification boundary | Resolved by excluding messages, email, SMS, push, automatic worker contact, and fabricated read/delivery status. |
| Duplicate and conflict prevention | Resolved with duplicate, stale, filled, unavailable, expired, concurrent, and policy conflict checks. |
| High-impact confirmation | Resolved with selected worker, shift, role, date/time, residence/department, rate/premium, eligibility, notification expectation, actor, and override confirmation. |
| Cancellation and replacement boundary | Resolved by excluding cancellation, replacement, reassignment, withdrawal, and support intervention. |
| Privacy | Resolved by limiting display to minimum necessary candidate data. |
| Auditability | Resolved with actor, role, timestamp, shift, selected worker, recommendation, prior/requested/resulting state, reason, and policy version. |
| AI boundary | Resolved by prohibiting automatic selection, submission, contact, qualification waivers, policy overrides, term changes, fabricated data, protected-data ranking, and authoritative-state writes. |
| Conflict Resolution boundary | Resolved by identifying Page 059 - Conflict Resolution as the next governed conflict workflow. |

---

## 3. Scorecard

| Category | Score | Notes |
| --- | ---: | --- |
| Human assignment authority | 10.0 | Roles and responsible human actor are explicit. |
| Lifecycle separation | 10.0 | Selection, assignment, notification, response, acceptance, cancellation, replacement, and unavailability remain independent. |
| Shift eligibility | 9.9 | Active/open/current shift checks are clear. |
| Worker eligibility | 9.9 | Eligibility, qualification, availability, conflict, and compliance states remain separate. |
| AI separation | 10.0 | Page 057 owns AI recommendations; Page 058 owns human decision only. |
| Manual selection | 9.9 | Governed pool and rationale capture are clear. |
| Override governance | 9.9 | Overrides require reason and cannot bypass qualifications or punish workers/operators. |
| Fairness | 10.0 | Protected, retaliatory, unrelated, complaint, investigation, and hidden penalty risks are blocked. |
| Availability truthfulness | 9.9 | Stale, unknown, conditional, and unavailable states are not fabricated. |
| Qualification truthfulness | 9.9 | Uploaded, verified, current, expired, and review-required states are independent. |
| Accepted-term protection | 10.0 | Silent term changes are prohibited. |
| Assignment handoff | 9.9 | Page 046 remains authoritative for resulting Assigned Worker record. |
| Notification boundary | 10.0 | No messages, email, SMS, push, automatic contact, or fabricated delivery/read status. |
| Conflict prevention | 9.9 | Duplicate, stale, concurrent, filled, unavailable, expired, and policy conflicts are covered. |
| Privacy | 9.9 | Minimum necessary candidate data and protected-data exclusions are explicit. |
| Auditability | 9.9 | Page open, pool view, recommendation view, selection, checks, override, submission, outcome, and denial are auditable. |
| AI governance | 10.0 | AI cannot select, submit, contact, waive, alter, fabricate, rank with protected data, punish, or write state. |
| Accessibility | 9.7 | Candidate comparison, eligibility states, conflicts, confirmations, focus, contrast, and errors are covered. |
| Mobile usability | 9.7 | Mobile priority is clear and avoids dense scoring interfaces. |
| International readiness | 9.8 | Roles, qualifications, rates, scheduling, fairness, locale, timezone, and notification models remain configurable. |
| Consistency with Pages 046 and 057 | 10.0 | Assigned Worker and AI Dispatch boundaries are preserved. |
| Readiness for Page 059 | 10.0 | Conflict Resolution is clearly unblocked but not created. |

**Overall Score:** 9.9

---

## 4. Remaining Risks

No blocking wireframe risks remain.

Future implementation and policy work must define:

- formal assignment handoff contract
- assignment state machine
- notification/invitation workflow
- conflict lock and concurrency rules
- candidate-pool snapshot retention
- role/tenant authorization enforcement
- audit retention and redaction rules
- fairness-policy enforcement checks

These are future engineering and governance tasks, not Page 058 wireframe blockers.

---

## 5. Approval Criteria Assessment

| Approval criterion | Status |
| --- | --- |
| Human assignment authority is explicit | Pass |
| AI remains advisory | Pass |
| Eligibility cannot be bypassed | Pass |
| Fairness protections apply to human and AI decisions | Pass |
| Availability and qualifications remain truthful | Pass |
| Accepted terms are protected | Pass |
| Notification remains outside Page 058 | Pass |
| Authoritative assignment ownership remains with Page 046 | Pass |
| Conflict resolution remains outside Page 058 | Pass |
| Privacy is preserved | Pass |
| Auditability is complete | Pass |
| No governance, fairness, privacy, operational, or compliance risks remain | Pass |

---

## 6. Recommendation

Approve Page 058 - Manual Assignment as:

```text
APPROVED WIREFRAME v1.0
```

Page 059 - Conflict Resolution may be unblocked as the next controlled gate, but it must not be
created during this approval step.

---

## 7. Validation

Confirmed:

- Governance control stack unchanged.
- Frozen title remains Manual Assignment.
- Pages 001-057 remain unchanged.
- Page 059 remains Conflict Resolution.
- No Page 059 files created.
- No implementation started.
- No React created.
- No frontend created.
- No backend created.
- No APIs created.
- No database changes created.
- No assignment engine created.
- No notification implementation created.
- No conflict-resolution implementation created.
- No AI automation created.
- No commit, push, merge, or deployment performed.
- Unrelated app changes remain untouched.

---

## 8. Final Status

```text
Page 058 — Manual Assignment
Product Design Review Revision 1: COMPLETE
Recommendation: APPROVE WIREFRAME v1.0

Page 059 — Conflict Resolution
UNBLOCKED AFTER APPROVAL
NOT CREATED
```
