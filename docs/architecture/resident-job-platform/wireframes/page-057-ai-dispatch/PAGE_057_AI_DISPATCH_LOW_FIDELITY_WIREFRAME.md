# Resident Job

## Page 057 - AI Dispatch Low-Fidelity Wireframe

**Status:** Low-Fidelity Wireframe Complete  
**Owner Review:** Required  
**Approval Record:** Not Created  
**Implementation:** Not Started  
**Page 058:** Manual Assignment blocked

---

## 1. Purpose

Page 057 designs the authenticated AI Dispatch experience.

AI Dispatch owns AI-assisted dispatch recommendations only. It helps authorized operators review
open or urgent staffing needs, understand governed candidate pools, compare transparent
recommendation factors, and prepare a proposed dispatch plan for human review.

It must not:

- assign or reassign workers
- contact or notify workers
- change shifts or accepted terms
- reject, penalize, or downgrade workers
- bypass qualification requirements
- approve attendance or timesheets
- issue invoices or execute payments
- close support cases
- publish or moderate ratings
- create authoritative operational state
- use hidden rankings
- act without explicit human review

Core principle:

```text
AI recommends
-> Human reviews
-> Human approves
-> Authoritative workflow executes
```

---

## 2. Architecture Reference

| Page | Frozen title | Source |
| --- | --- | --- |
| 056 | Operations Dashboard | `pages/PAGE_056_OPERATIONS_DASHBOARD.md` |
| 057 | AI Dispatch | `pages/PAGE_057_AI_DISPATCH.md` |
| 058 | Manual Assignment | `pages/PAGE_058_MANUAL_ASSIGNMENT.md` |

Page 057 is the first page where AI becomes an operational recommendation engine. It remains
bounded by the Phase 10 AI Governance Review and cannot become an assignment, notification,
attendance, financial, messaging, support, or ratings workflow.

---

## 3. Users and Permissions

Primary users:

- Scheduler
- Administrator

Secondary observers where permissioned:

- Support
- Compliance
- Super Administrator

Access requirements:

- authenticated user
- authorized operator role
- permission to view dispatch recommendations
- permission to view the relevant shift scope
- permission to view the relevant candidate scope

Unauthorized users see an access-denied state and no candidate details.

---

## 4. Page-Level Information Hierarchy

Primary:

1. dispatch context and selected shift
2. eligibility and recommendation readiness
3. recommendation packet status
4. candidate recommendations with evidence
5. human review controls

Secondary:

1. alternatives
2. missing information
3. policy constraints
4. source freshness
5. audit preview

Tertiary:

1. explanation glossary
2. help and escalation
3. recommendation history where permitted

The first screen should answer:

```text
Which shift is being considered?
Is AI dispatch permitted?
Is the recommendation ready and trustworthy enough to review?
What is missing or uncertain?
What can the human do next?
```

---

## 5. Desktop Wireframe

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ Resident Job / Scheduler Console / AI Dispatch                              │
│ Role: Scheduler | Scope: Authorized residences only | AI status: Advisory    │
├─────────────────────────────────────────────────────────────────────────────┤
│ Shift Context                                                                │
│ ┌──────────────────────────────┐ ┌────────────────────────────────────────┐ │
│ │ Shift: Care aide evening     │ │ Dispatch Eligibility                   │ │
│ │ Status: Open / Urgent        │ │ Authorized operator: yes               │ │
│ │ Residence: permitted scope   │ │ Active shift: yes                      │ │
│ │ Time: configured local time  │ │ Candidate scope authorized: yes        │ │
│ │ Requirements: role, licence  │ │ Policy restrictions checked: pending   │ │
│ └──────────────────────────────┘ └────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│ Recommendation State                                                         │
│ [Not requested] [Generating] [Ready] [Partial] [Stale] [Failed] [Unavailable]│
│ Source freshness: availability current / qualification current / policy vX   │
│ Notice: AI recommendation is not assignment, contact, or approval.            │
├─────────────────────────────────────────────────────────────────────────────┤
│ Candidate Recommendations                                                    │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ Candidate A | Recommendation: review candidate for next governed step    │ │
│ │ Reasons: role match, verified credential, available window, service area │ │
│ │ Missing: recent preference update                                       │ │
│ │ Confidence: Medium | Uncertainty: availability freshness                 │ │
│ │ Evidence: shift requirements, availability, verified docs, conflicts     │ │
│ │ Human action: Compare | Request clarification | Select for next step     │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ Candidate B | Alternative                                               │ │
│ │ Reasons: role match, available, longer travel boundary                   │ │
│ │ Missing: certification review date                                      │ │
│ │ Confidence: Low | Not disqualified                                      │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│ Non-Recommendations and Gaps                                                 │
│ Worker visible != eligible | Eligible != recommended | Recommended != assigned│
│ Missing data, stale data, policy conflict, unavailable source, access limits  │
├─────────────────────────────────────────────────────────────────────────────┤
│ Human Review                                                                 │
│ Decision state: Not reviewed / Under review / Clarification required         │
│ Options: Reject recommendation | Defer | Select candidate for next workflow  │
│ Required reason: [text area placeholder]                                     │
│ Handoff target: Assigned Worker / Manual Assignment workflow                 │
│ Note: accepted recommendation does not create assignment or contact worker.   │
├─────────────────────────────────────────────────────────────────────────────┤
│ Audit Preview                                                                │
│ Captures: actor, role, timestamp, shift, candidate refs, source scope,        │
│ policy version, AI/rules version, recommendation, confidence, evidence,       │
│ reviewer, human decision, override reason, workflow handoff.                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Mobile Wireframe

```text
┌──────────────────────────────┐
│ AI Dispatch                  │
│ Advisory only                │
├──────────────────────────────┤
│ Shift Context                │
│ Open urgent shift            │
│ Requirements summary         │
├──────────────────────────────┤
│ Dispatch Eligibility         │
│ Operator: authorized         │
│ Data: partial/current/stale   │
│ AI permitted: yes/no          │
├──────────────────────────────┤
│ Recommendation Status        │
│ Ready / Partial / Failed      │
│ Confidence is informational   │
├──────────────────────────────┤
│ Candidate Card 1             │
│ Reason summary               │
│ Evidence chips               │
│ Missing information           │
│ Confidence: medium            │
│ [Compare] [Review next step]  │
├──────────────────────────────┤
│ Candidate Card 2             │
│ Alternative                  │
│ Not inferior                 │
├──────────────────────────────┤
│ Human Review                 │
│ Select / Reject / Defer       │
│ Reason required               │
│ Handoff only                  │
└──────────────────────────────┘
```

Mobile priority:

1. shift identity
2. AI-permitted status
3. recommendation readiness
4. top recommendation evidence
5. missing information
6. human review action

Secondary candidate comparisons collapse behind expandable cards.

---

## 7. Dispatch Eligibility

Represent these eligibility checks:

- authorized operator
- valid active shift
- AI dispatch permitted
- candidate scope authorized
- qualification data available
- availability data current
- policy restrictions checked
- recommendation generation available

Clarify:

```text
Open shift != AI dispatch eligible
Worker visible != Worker eligible
Worker eligible != Worker recommended
Worker recommended != Worker assigned
```

If any eligibility condition fails, show the reason category and the authoritative workflow that
can resolve it.

---

## 8. State Separation

The page must keep four state groups independent.

| State group | Controlled values |
| --- | --- |
| Shift state | open, urgent, partially covered, filled, cancelled, unavailable |
| Recommendation state | not requested, generating, ready, partial, stale, failed, unavailable |
| Human review state | not reviewed, under review, clarification required, accepted for next step, rejected, deferred |
| Assignment state | no assignment, assignment pending, assigned, worker response pending, accepted, declined, cancelled |

Clarify:

```text
Recommendation state != Human review state
Human review state != Assignment state
Assignment pending != Worker accepted
```

---

## 9. Source-of-Truth Boundary

Page 057 may consume governed data from:

- shifts
- availability
- qualifications
- licences and certifications
- assignments
- approved policy configuration

It must not become authoritative for any source record.

Clarify:

```text
AI recommendation != Eligibility determination
Confidence != Verified qualification
Proposed dispatch != Assignment record
```

The authoritative assignment workflow must execute every approved assignment.

---

## 10. Candidate Pool Governance

Allowed candidate criteria:

- role match
- required qualifications
- current verified licence or certification
- declared availability
- assignment conflicts
- authorized residence or department
- permitted service area or travel boundary
- relevant experience where policy permits

Prohibited candidate criteria:

- race
- ethnicity
- religion
- sex
- gender identity
- sexual orientation
- disability
- health information
- family status
- complaints
- investigations
- disputes
- retaliation indicators
- unrelated financial information
- protected personal data

Candidate filters must be explainable and configurable by approved policy.

---

## 11. Recommendation Transparency

Every recommendation packet should show:

- candidate reference
- recommendation reason
- supporting factors
- missing factors
- uncertainty
- confidence
- source freshness
- policy version
- alternatives
- reason for non-recommendation where appropriate

Clarify:

```text
High confidence != Guaranteed success
Low confidence != Disqualification
Missing data != Negative evidence
Displayed first != Best worker
Alternative != Inferior worker
```

No opaque recommendation is allowed.

---

## 12. Confidence Governance

Confidence is informational only.

Represent:

- high
- medium
- low
- unavailable

Explain:

- contributing data
- missing data
- freshness
- limitations

Clarify:

```text
Confidence != Probability of attendance
Confidence != Worker quality score
Confidence != Automatic approval threshold
```

---

## 13. Human Review and Override

Represent human review steps:

1. recommendation presented
2. evidence reviewed
3. alternatives compared
4. clarification requested where needed
5. candidate accepted for next governed step, rejected, deferred, or alternative selected
6. override reason recorded
7. authoritative workflow opened for execution

Clarify:

```text
Human accepts recommendation != Assignment created
Candidate selected != Worker contacted
Override != AI failure
Override != Worker penalty
```

Human action labels should say:

- Review evidence
- Compare alternatives
- Request clarification
- Select for assignment workflow
- Reject recommendation
- Defer decision

Avoid:

- Assign now
- Notify worker
- Auto-dispatch
- Replace worker
- Reject worker

---

## 14. Qualification and Availability Truthfulness

Qualification states:

- requirement exists
- document submitted
- verified
- current
- expired
- review required
- unavailable

Availability states:

- available
- conditionally available
- unavailable
- conflict
- stale
- unknown

Clarify:

```text
Document uploaded != Verified
Verified != Available
Available != Accepted shift
Recommended != Qualification guaranteed forever
```

Page 057 does not own credential verification.

---

## 15. Location and Travel Boundary

Use only governed location context:

- residence
- approved service area
- approximate travel boundary
- configured distance or travel-time policy

Do not expose:

- home address
- precise off-shift location
- route history
- unrelated movement
- protected residence information

Clarify:

```text
Closer != More qualified
Farther != Automatically ineligible
```

No route optimization or live tracking is owned by this page.

---

## 16. Notification and Assignment Boundary

Page 057 must not:

- send invitations
- send messages
- send push, email, or SMS
- contact workers
- create assignments
- reassign workers

Clarify:

```text
Candidate selected != Worker contacted
Recommendation accepted != Assignment created
Assignment created != Worker accepted
```

Page 054 owns governed messaging. Page 046 and the governed assignment workflow own assigned
worker state.

---

## 17. Urgency Boundary

Represent urgency separately:

- routine
- elevated
- urgent
- critical staffing gap
- unavailable

Clarify:

```text
Urgency != Lower governance standard
Urgency != Permission to waive qualifications
Urgency != Permission to bypass human review
```

Urgent staffing may prioritize review, but it cannot reduce evidence, fairness, or approval
requirements.

---

## 18. Failure and Empty States

Include:

- no eligible open shifts
- no eligible candidates
- recommendation not requested
- recommendation generating
- recommendation partial
- recommendation stale
- missing qualification data
- missing availability data
- policy conflict
- source unavailable
- recommendation failed
- access denied
- manual dispatch required

Do not fabricate candidates, evidence, confidence, or recommendations.

---

## 19. AI Boundary

AI may:

- summarize shift requirements
- identify governed candidate pools
- compare candidates
- explain factors
- identify missing information
- present alternatives
- suggest navigation
- draft a proposed human-reviewed dispatch plan

AI must never:

- assign
- reassign
- contact
- notify
- reject
- penalize
- alter shifts
- change rates
- waive qualifications
- determine misconduct
- use protected data
- fabricate eligibility
- fabricate availability
- bypass human approval
- write authoritative state

---

## 20. Auditability

Conceptually preserve:

- recommendation requested
- source scope
- policy version
- AI or rules version
- candidate pool
- recommendation
- confidence
- explanation
- alternatives
- reviewer
- human decision
- override reason
- workflow handoff
- final assignment outcome where available

Include:

- actor
- role
- timestamp
- shift reference
- candidate references
- recommendation reference
- evidence references
- human decision
- final outcome

Do not store unnecessary or protected personal data.

---

## 21. Accessibility

Design requirements:

- clear heading hierarchy
- keyboard-accessible candidate cards
- screen-reader labels for confidence, uncertainty, and stale-data notices
- no color-only status communication
- plain-language explanations
- readable comparison tables
- touch targets of at least 44px on mobile
- focus management after recommendation generation or failure
- error recovery paths that do not depend on hover

---

## 22. International Readiness

Keep configurable:

- role names
- qualification labels
- policy labels
- distance and travel units
- language direction
- date and time formats
- urgency terminology
- consent and legal labels

Do not hardcode country-specific workforce, licensing, employment, privacy, or healthcare rules.

---

## 23. Validation

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
- No notification or assignment implementation created.
- No commit, push, merge, or deployment performed.

---

## 24. Final Status

```text
Page 057 — AI Dispatch
Wireframe: COMPLETE
Product Review: COMPLETE
Approval Record: NOT CREATED

Page 058 — Manual Assignment
BLOCKED
```
