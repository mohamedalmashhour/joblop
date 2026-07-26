# Resident Job

## Page 057 - AI Dispatch Wireframe Revision 1

**Status:** Controlled Revision 1 Complete  
**Original Wireframe:** `PAGE_057_AI_DISPATCH_LOW_FIDELITY_WIREFRAME.md`  
**Implementation:** Not Started  
**Page 058:** Manual Assignment unblocked after approval, not created

---

## 1. Revision Summary

Revision 1 strengthens Page 057 - AI Dispatch as a governed recommendation surface. It clarifies
that AI Dispatch recommends and explains candidate options, while humans remain authoritative and
the Manual Assignment workflow owns the next operational assignment step.

This revision resolves the documented owner conditions for:

- dispatch eligibility governance
- recommendation lifecycle
- recommendation transparency
- confidence governance
- candidate-pool governance
- human approval and override
- fairness and explainability
- qualification and availability truthfulness
- assignment separation
- notification separation
- auditability
- AI governance
- readiness for Page 058 - Manual Assignment

No redesign or implementation is introduced.

---

## 2. Recommendation Lifecycle

Represent recommendation lifecycle independently:

- not requested
- generating
- ready
- partial
- stale
- failed
- unavailable
- under human review
- accepted for assignment workflow
- rejected
- deferred

Clarify:

```text
Recommendation != Assignment
Accepted recommendation != Worker assigned
Assigned != Worker accepted
```

The recommendation lifecycle is not the assignment lifecycle. Page 057 can prepare a reviewed
handoff, but it cannot create, update, or finalize an assignment record.

---

## 3. Recommendation Transparency

Every recommendation must display:

- recommendation reason
- supporting evidence
- missing information
- uncertainty
- confidence
- freshness
- governing policy version
- alternatives

Clarify:

```text
High confidence != Guaranteed success
Low confidence != Disqualification
Missing information != Negative evidence
```

No recommendation may appear as an opaque worker ranking or hidden score.

---

## 4. Candidate Governance

Only governed inputs may influence recommendations:

- verified qualifications
- licences
- certifications
- availability
- assignment conflicts
- authorized geography
- relevant experience where policy permits

Explicitly prohibited inputs:

- race
- ethnicity
- religion
- disability
- health information
- complaints
- investigations
- retaliation indicators
- unrelated financial data
- protected personal information

Candidate inclusion must be explainable, policy-scoped, and auditable. Exclusion must never be
based on hidden protected-data signals.

---

## 5. Human Review and Override

Represent human review states:

- recommendation reviewed
- alternatives compared
- clarification requested
- recommendation accepted
- recommendation rejected
- override
- deferred

Clarify:

```text
Override != AI failure
Override != Worker penalty
```

When a human accepts, rejects, overrides, or defers a recommendation, the page must conceptually
capture a reason before handoff or closure.

---

## 6. Assignment Boundary

Page 057 owns:

```text
AI Dispatch Recommendation
```

Page 058 owns:

```text
Manual Assignment
```

Page 046 remains:

```text
Assigned Worker
```

Clarify:

```text
Recommendation != Assignment
Assignment != Attendance
```

Page 057 must not duplicate assignment logic, worker-response logic, attendance logic, or accepted
assignment state.

---

## 7. Notification Boundary

AI Dispatch must never:

- notify workers
- send invitations
- send email
- send SMS
- send push notifications
- contact employers

Clarify:

```text
Recommendation generated != Worker contacted
Candidate selected for next step != Invitation sent
```

Messages and notifications remain owned by their authoritative workflows. Page 057 may navigate to
the next governed workflow only after human review.

---

## 8. Confidence Governance

Confidence remains informational.

Represent:

- high
- medium
- low
- unavailable

Explain:

- evidence used
- missing evidence
- freshness
- limitations

Clarify:

```text
Confidence != Automatic approval threshold
Confidence != Worker quality score
Confidence != Probability of attendance
```

Confidence cannot automatically promote, suppress, assign, reject, or penalize a worker.

---

## 9. Fairness

Explicitly prohibit:

- protected-characteristic filtering
- complaint-based penalties
- retaliation
- accessibility penalties
- hidden reputation penalties
- automatic rejection from ratings

Clarify:

```text
Rating signal != Automatic rejection
Complaint != Dispatch penalty
Accessibility request != Lower suitability
```

If fairness-sensitive evidence is unavailable, the page must show uncertainty rather than infer a
negative conclusion.

---

## 10. Qualification and Availability Truthfulness

Represent qualification independently:

- required
- submitted
- verified
- expired
- review required
- unavailable

Represent availability independently:

- available
- conditionally available
- unavailable
- conflicting assignment
- stale
- unknown

Clarify:

```text
Verified != Available
Available != Accepted
Submitted != Verified
Expired != Eligible
```

AI Dispatch cannot verify credentials, alter availability, or guarantee future eligibility.

---

## 11. Auditability

Conceptually preserve:

- recommendation requested
- candidate pool generated
- recommendation generated
- alternatives shown
- confidence recorded
- reviewer
- human decision
- override reason
- workflow handoff

Include:

- actor
- role
- timestamp
- recommendation reference
- shift reference
- AI/rules version
- evidence references
- human outcome

Audit records should preserve decision context without storing unnecessary or protected personal
data.

---

## 12. AI Boundary

AI may:

- recommend
- explain
- summarize
- compare
- identify missing information
- suggest navigation

AI must never:

- assign
- contact
- notify
- reject
- penalize
- alter shifts
- alter pay
- fabricate eligibility
- fabricate availability
- bypass human approval
- write authoritative state

---

## 13. Readiness for Page 058 - Manual Assignment

Revision 1 confirms Page 058 is the next controlled gate and owns Manual Assignment.

Page 057 may hand off:

- reviewed recommendation
- selected candidate reference
- evidence summary
- missing information
- confidence state
- human decision
- override reason where applicable

Page 057 may not hand off:

- completed assignment
- worker notification
- attendance state
- payroll state
- payment state
- disciplinary conclusion
- hidden ranking

---

## 14. Validation

Confirmed:

- Frozen title remains AI Dispatch.
- Pages 001-056 remain unchanged.
- Page 058 remains Manual Assignment.
- No Page 058 files created.
- No implementation started.
- No React created.
- No frontend created.
- No backend created.
- No APIs created.
- No database changes created.
- No dispatch engine created.
- No assignment automation created.
- No notifications created.
- No AI operational automation created.
- No commit, push, merge, or deployment performed.
- Unrelated app changes remain untouched.

---

## 15. Final Status

```text
Page 057 — AI Dispatch
Revision 1: COMPLETE
Approval Criteria: SATISFIED

Page 058 — Manual Assignment
UNBLOCKED AFTER APPROVAL
NOT CREATED
```
