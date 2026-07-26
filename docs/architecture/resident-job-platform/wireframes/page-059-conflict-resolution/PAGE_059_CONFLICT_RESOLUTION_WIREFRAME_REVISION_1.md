# Resident Job

## Page 059 - Conflict Resolution Wireframe Revision 1

**Status:** Controlled Revision 1 Complete  
**Original Wireframe:** `PAGE_059_CONFLICT_RESOLUTION_LOW_FIDELITY_WIREFRAME.md`  
**Implementation:** Not Started  
**Page 060:** Replacement Engine unblocked after approval, not created

---

## 1. Revision Summary

Revision 1 strengthens Page 059 - Conflict Resolution as the governed human review and routing
surface for operational conflicts. It clarifies conflict eligibility, configurable classification,
independent state groups, source-of-truth boundaries, human authority, evidence minimization,
clarification, resolution routing, assignment separation, qualification and availability conflicts,
changed-term conflicts, concurrency handling, fairness, complaint and investigation separation,
financial boundaries, auditability, AI limits, and readiness for Page 060 - Replacement Engine.

No redesign or implementation is introduced.

---

## 2. Conflict Eligibility Chain

A conflict may enter Page 059 only when the governed eligibility chain is satisfied:

- valid conflict reference
- authorized organization, residence, department, shift, worker, or assignment scope
- authorized reviewer
- authoritative records available or clearly unavailable
- conflict remains unresolved
- no separate complaint, investigation, legal, or disciplinary process exclusively owns the issue

Clarify:

```text
Conflict detected != Conflict confirmed
Conflict confirmed != Fault established
Workflow access != Conflict-resolution authority
```

Page 059 must not accept free-floating conflict claims without a controlled reference and scoped
authorization.

---

## 3. Conflict Classification

Represent configurable conflict categories:

- duplicate assignment
- overlapping schedule
- stale candidate selection
- qualification conflict
- licence or certification conflict
- availability conflict
- shift-state conflict
- changed-term conflict
- concurrent operator conflict
- worker-response conflict
- replacement conflict
- policy conflict
- source-record mismatch
- other governed operational conflict

Clarify:

```text
Category != Cause
Category != Misconduct
Category != Final resolution
```

Categories help route review. They do not establish responsibility, misconduct, or final outcome.

---

## 4. Independent Conflict States

Page 059 represents four independent state groups.

### A. Detection

- detected
- confirmed for review
- false positive
- unavailable

### B. Review

- not reviewed
- under review
- clarification required
- evidence pending
- escalated
- decision pending
- resolved
- closed
- reopened

### C. Workflow Impact

- no impact
- assignment blocked
- assignment paused
- notification paused
- worker response preserved
- replacement review required
- manual review required
- downstream workflow unavailable

### D. Resolution Routing

- refresh required
- preserve assignment
- withdraw proposal
- request cancellation through authoritative workflow
- return to candidate selection
- request updated availability
- request qualification review
- request changed-term acknowledgment
- request replacement
- escalate to support
- escalate to compliance
- route to complaint or investigation
- no action
- close as false positive

These groups must never collapse into a single combined status.

---

## 5. Source-of-Truth Boundary

Page 059 may compare governed records from:

- shifts
- assignments
- worker availability
- qualifications
- licences and certifications
- worker responses
- notifications
- support cases
- approved policy configuration

Page 059 must not become authoritative for those records.

Clarify:

```text
Conflict summary != Source record
Conflict decision != Source record updated
Conflict closed != All downstream changes completed
```

Every correction must occur in the workflow that owns the source record.

---

## 6. Human Authority

Represent separate authority for:

- conflict viewing
- evidence review
- clarification request
- resolution selection
- escalation
- workflow handoff
- read-only audit

Possible authorized roles:

- operations manager
- residence manager
- department manager
- scheduler
- staffing coordinator
- authorized administrator
- support supervisor
- compliance reviewer where governed

Clarify:

```text
Support participation != Assignment authority
Compliance review != Disciplinary authority
```

Every decision must identify the responsible human actor.

---

## 7. Evidence Governance

Show only minimum-necessary evidence:

- shift reference
- assignment reference
- worker reference
- relevant timestamps
- availability state
- qualification state
- worker-response state
- assignment state
- policy version
- source freshness
- prior human decisions
- safe conflict reason

Do not expose:

- health information
- banking or tax information
- unrelated complaints
- investigation notes
- identity-document images
- private message bodies
- unrelated support cases
- internal fraud signals
- protected personal information

Clarify:

```text
Conflicting records != Fraud
Missing record != Intentional wrongdoing
```

Restricted evidence should be referenced through governed links or safe summaries only.

---

## 8. Clarification Workflow

Represent:

- clarification requested
- response pending
- response received
- additional information required
- review resumed
- response window expired
- manual review required

Potential participants may include:

- operator
- worker
- residence manager
- support
- authoritative workflow owner

Clarify:

```text
Clarification requested != Resolution denied
No response != Misconduct
Expired response window != Automatic adverse outcome
```

---

## 9. Resolution Routing

Page 059 may select a governed route, but must not execute the downstream action itself.

Possible routes:

- refresh and re-evaluate
- preserve existing assignment
- withdraw proposed assignment
- return to candidate selection
- request updated availability
- request credential review
- request changed-term acknowledgment
- request cancellation
- request replacement
- escalate to support
- escalate to compliance
- route to complaint or investigation
- close as false positive
- no action required

Clarify:

```text
Resolution selected != Authoritative action completed
Conflict resolved != Worker penalized
No action != Conflict ignored
```

---

## 10. Assignment Boundary

Page 058 owns:

```text
Manual Assignment
```

Page 046 owns:

```text
Assigned Worker
```

Page 059 owns:

```text
Conflict Resolution
```

Page 059 must not directly:

- assign
- reassign
- replace
- cancel
- notify
- accept on behalf of a worker

Clarify:

```text
Cancellation requested != Assignment cancelled
Replacement required != Replacement assigned
Conflict resolution != Assignment execution
```

---

## 11. Qualification Conflict

Represent:

- current
- expired
- missing
- under review
- source unavailable
- policy mismatch
- re-verification required

Clarify:

```text
Qualification conflict != Dishonesty
Expired credential != Permanent exclusion
```

Page 059 must not verify or waive qualifications.

---

## 12. Availability and Schedule Conflict

Represent:

- overlap detected
- stale availability
- worker became unavailable
- assignment conflict
- timezone mismatch
- travel-time conflict
- source unavailable

Clarify:

```text
Overlap != Misconduct
Unavailable != Declined
Stale != Confirmed conflict
```

Do not fabricate schedule state.

---

## 13. Changed-Term Conflict

Represent conflicts involving:

- date
- start time
- end time
- timezone
- residence
- department
- role
- rate
- premium
- responsibilities
- travel or allowance terms

Clarify:

```text
Employer changed terms != Worker accepted them
Prior acceptance != Acceptance of revised terms
```

Route acknowledgment back to the authoritative workflow.

---

## 14. Concurrent Action Governance

Represent:

- another operator acted first
- shift filled elsewhere
- assignment changed
- worker state changed
- stale page
- duplicate submission
- transition conflict
- retry available
- manual refresh required

Clarify:

```text
Conflict response != System failure
Duplicate attempt != Duplicate assignment created
```

Do not overwrite a completed decision.

---

## 15. Fairness and Retaliation

Conflict resolution must not penalize users for:

- complaints
- safety reports
- attendance disputes
- timesheet disputes
- payment disputes
- accessibility requests
- declining changed terms
- declining unrelated work
- participating in an investigation

Clarify:

```text
Conflict involvement != Performance signal
Declining changed terms != Misconduct
```

---

## 16. Complaint, Investigation, and Discipline Boundary

Page 059 may route a matter to a separate governed process.

It must not own:

- formal complaints
- investigations
- harassment findings
- fraud findings
- disciplinary action
- suspension
- termination
- sanctions
- legal adjudication

Clarify:

```text
Operational conflict != Complaint
Conflict evidence != Violation proven
Conflict reviewer != Investigator
```

---

## 17. Financial Boundary

Page 059 must not:

- alter rates
- calculate compensation
- modify invoices
- issue refunds
- reverse payments
- reconcile funds
- determine payroll outcomes

Clarify:

```text
Assignment conflict != No compensation due
Cancellation route != Refund completed
```

Financial consequences remain in authoritative financial workflows.

---

## 18. Auditability

Conceptually preserve:

- conflict detected
- conflict opened
- reviewer assigned
- evidence viewed
- clarification requested
- response received
- resolution proposed
- resolution selected
- workflow handoff
- resolved
- closed
- reopened
- authorization denied

Include:

- actor
- role
- timestamp
- conflict reference
- related shift, worker, and assignment references
- category
- source references
- prior state
- requested outcome
- resulting conflict state
- reason
- policy version
- handoff reference

Do not broadly log restricted evidence.

---

## 19. AI Boundary

AI may:

- summarize visible records
- identify inconsistent fields
- explain policy options
- identify missing information
- suggest governed routes
- draft a human-reviewed resolution note
- suggest navigation

AI must never:

- decide fault
- determine misconduct
- resolve automatically
- assign or reassign
- cancel assignments
- waive qualifications
- alter terms
- penalize users
- expose restricted information
- write authoritative state

---

## 20. Replacement Engine Boundary

Prepare explicitly for Page 060 - Replacement Engine.

Page 059 may determine that replacement review is required.

Page 060 owns:

```text
Replacement Engine
```

Page 059 must not:

- search for replacement candidates
- rank candidates
- assign a replacement
- release the original assignment
- contact replacement candidates
- automate replacement

Clarify:

```text
Replacement required != Replacement selected
Replacement selected != Replacement assigned
Replacement assigned != Original assignment safely closed
```

Do not create Page 060 files.

---

## 21. Empty and Error States

Include:

- no conflicts
- already resolved
- source unavailable
- stale data
- clarification pending
- evidence unavailable
- resolution blocked
- another operator completed action
- access denied
- service unavailable

Do not fabricate resolution success.

---

## 22. Final Status

```text
Page 059 — Conflict Resolution
APPROVED WIREFRAME v1.0

Page 060 — Replacement Engine
UNBLOCKED
NOT CREATED
```
