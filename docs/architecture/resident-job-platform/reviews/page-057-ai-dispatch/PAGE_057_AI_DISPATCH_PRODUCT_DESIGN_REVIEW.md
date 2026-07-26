# Resident Job

## Page 057 - AI Dispatch Product Design Review

**Wireframe Reviewed:** `PAGE_057_AI_DISPATCH_LOW_FIDELITY_WIREFRAME.md`  
**Status:** Product Design Review Complete  
**Recommendation:** Approved With Documented Conditions  
**Approval Record:** Not Created  
**Implementation:** Not Started  
**Page 058:** Manual Assignment blocked

---

## 1. Executive Summary

Page 057 successfully defines AI Dispatch as an advisory recommendation surface, not an
operational execution engine. The wireframe preserves the Phase 10 AI governance principle:

```text
AI recommends
-> Human reviews
-> Human approves
-> Authoritative workflow executes
```

The page is complete at the owner-review gate. It should not be frozen until the owner confirms the
documented conditions around dispatch eligibility, state separation, source-of-truth boundaries,
candidate-pool fairness, recommendation transparency, human review, notification and assignment
handoff, urgency, failure states, and auditability.

---

## 2. Strengths

- The page clearly states that AI Dispatch owns recommendations only.
- Recommendation, human review, and assignment states are separated.
- The candidate pool is governed by role, qualification, availability, conflicts, authorized scope, service area, and approved policy.
- Protected characteristics, complaint history, investigations, disputes, health information, and unrelated personal data are explicitly prohibited from recommendation criteria.
- Confidence is treated as informational rather than an approval threshold or quality score.
- Alternatives are presented without implying inferior worker quality.
- Human review requires evidence comparison, decision reason, and authoritative workflow handoff.
- AI cannot contact workers, send notifications, create assignments, or alter shift state.
- Urgency cannot waive qualifications, fairness, evidence, or human review.
- Auditability captures source scope, policy version, AI/rules version, evidence, reviewer, decision, override reason, and final handoff.

---

## 3. Weaknesses

- Future engineering will need a formal recommendation packet schema so evidence, confidence, missing information, alternatives, and non-recommendation reasons are consistent.
- Policy-version visibility must be implemented carefully so operators understand which rules governed the recommendation.
- Candidate comparison could become visually dense on mobile if not progressively disclosed.
- Manual dispatch handoff will need Page 058 to preserve the same boundaries.

These are future implementation and next-page considerations, not current wireframe implementation
work.

---

## 4. Risk Review

### Assignment Risk

Low. The wireframe repeatedly distinguishes recommended, selected for next step, assignment
pending, assigned, worker response pending, and accepted. Page 057 cannot create assignment state.

### Notification Risk

Low. The page explicitly cannot send invitations, messages, push, email, SMS, or worker contacts.
Messaging remains owned by Page 054 and assignment remains owned by the governed assignment
workflow.

### Fairness Risk

Low. Candidate criteria are restricted to governed operational criteria. Protected
characteristics, complaints, investigations, disputes, retaliation indicators, unrelated financial
information, and protected personal data are excluded.

### Source-of-Truth Risk

Low. AI Dispatch consumes shifts, availability, qualifications, licences, certifications,
assignments, and approved policy configuration, but owns none of those records.

### Urgency Risk

Low. Urgency is separately represented and cannot waive qualifications, bypass human review, or
lower governance standards.

### Transparency Risk

Medium-low. The wireframe requires recommendation reasons, evidence, missing factors, confidence,
uncertainty, source freshness, policy version, alternatives, and non-recommendation reasons.
Future design must keep this understandable without overwhelming operators.

### Privacy Risk

Low. Location and travel context are minimized. Home address, precise off-shift location, route
history, unrelated movement, protected residence information, and unnecessary protected data are
excluded.

### AI Governance Risk

Low. AI cannot assign, reassign, contact, notify, reject, penalize, alter shifts, change rates,
waive qualifications, determine misconduct, fabricate eligibility, fabricate availability, bypass
human approval, or write authoritative state.

---

## 5. Scorecard

| Category | Score | Notes |
| --- | ---: | --- |
| Purpose clarity | 9.9 | AI Dispatch is advisory and recommendation-only. |
| Dispatch eligibility | 9.7 | Eligibility checks are explicit and independently represented. |
| State separation | 9.9 | Shift, recommendation, human review, and assignment states remain separate. |
| Source-of-truth boundary | 9.9 | Page consumes governed data but owns no source records. |
| Candidate-pool governance | 9.8 | Allowed and prohibited criteria are well-defined. |
| Recommendation transparency | 9.8 | Evidence, uncertainty, confidence, freshness, and alternatives are visible. |
| Confidence governance | 9.8 | Confidence cannot become a quality score or approval threshold. |
| Human review | 9.9 | Human review and reason capture are required before handoff. |
| Notification and assignment boundary | 10.0 | Page cannot contact workers or create assignment state. |
| Urgency governance | 9.8 | Urgency cannot bypass fairness, qualifications, evidence, or approval. |
| Failure and empty states | 9.7 | Partial, stale, failed, missing, denied, and manual states are covered. |
| Fairness | 9.9 | Protected and retaliatory criteria are excluded. |
| Privacy | 9.8 | Location and personal data are minimized. |
| Auditability | 9.8 | Recommendation lifecycle and human outcome are auditable. |
| Accessibility | 9.6 | Core keyboard, screen-reader, plain-language, and contrast needs are covered. |
| Mobile usability | 9.5 | Mobile flow is clear, though dense comparisons need careful future design. |
| International readiness | 9.7 | Country-specific rules remain configurable and out of scope. |
| Consistency with Pages 041-056 | 9.9 | Phase 10 boundaries are preserved. |
| Readiness for Page 058 | 9.7 | Manual Assignment is correctly identified as the next blocked workflow. |

**Overall Score:** 9.8

---

## 6. Required Owner Review Conditions

The page should remain at owner-review status until these points are accepted:

1. Confirm AI Dispatch owns recommendations only and never creates authoritative workflow state.
2. Confirm recommendation, human review, and assignment states remain independent.
3. Confirm candidate inclusion criteria are governed and protected criteria are prohibited.
4. Confirm every recommendation must show reasons, evidence, confidence, uncertainty, missing information, source freshness, policy version, alternatives, and non-recommendation reasons where appropriate.
5. Confirm confidence is informational only and cannot become a worker quality score, attendance probability, or approval threshold.
6. Confirm human review and recorded reason are required before any workflow handoff.
7. Confirm accepted recommendation does not contact workers, notify workers, or create assignment.
8. Confirm urgency cannot bypass qualification, fairness, evidence, or human review requirements.
9. Confirm AI cannot assign, reassign, reject, penalize, alter shifts, change rates, waive qualifications, or write authoritative state.
10. Confirm auditability requirements are sufficient for future engineering.

These are owner-review conditions, not implementation defects.

---

## 7. Non-Blocking Design Debt

- Future implementation should define a canonical AI recommendation packet schema.
- Future implementation should define AI/rules version storage and evidence snapshot retention.
- Future design should test candidate comparison cards on small mobile devices.
- Future governance should define policy-version display standards across AI-related pages.
- Page 058 should preserve the distinction between AI recommendation, scheduler decision, worker contact, worker acceptance, and final assignment.

No new entry was required in the central Design Debt Register during this gate.

---

## 8. Validation

Confirmed:

- Pages 001-056 remain unchanged.
- Page 057 uses the frozen title AI Dispatch.
- No Page 058 files created.
- No approval record created.
- No implementation started.
- No React created.
- No frontend created.
- No backend created.
- No APIs created.
- No database changes created.
- No dispatch implementation created.
- No assignment implementation created.
- No notification implementation created.
- No AI model integration created.
- No commit, push, merge, or deployment performed.

---

## 9. Final Status

```text
Page 057 — AI Dispatch
Wireframe: COMPLETE
Product Review: COMPLETE
Approval Record: NOT CREATED
Owner Review: REQUIRED

Page 058 — Manual Assignment
BLOCKED
```
