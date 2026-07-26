# Resident Job

## Page 058 - Manual Assignment Wireframe Revision 1

**Status:** Controlled Revision 1 Complete  
**Original Wireframe:** `PAGE_058_MANUAL_ASSIGNMENT_LOW_FIDELITY_WIREFRAME.md`  
**Implementation:** Not Started  
**Page 059:** Conflict Resolution unblocked after approval, not created

---

## 1. Revision Summary

Revision 1 strengthens Page 058 - Manual Assignment as the governed human assignment execution
surface. It clarifies authorized human roles, assignment lifecycle separation, shift and worker
eligibility truthfulness, AI recommendation separation, manual selection governance, override
governance, fairness, notification separation, accepted-term protection, auditability, and the
handoff to Page 059 - Conflict Resolution.

No redesign or implementation is introduced.

---

## 2. Human Assignment Authority

Represent distinct authorized roles:

- organization owner
- operations manager
- authorized residence manager
- authorized department manager
- scheduler
- staffing coordinator
- authorized administrator

Clarify:

```text
Platform access != Assignment authority
Residence access != Authority over unrelated departments
AI recommendation visibility != Permission to assign
```

Every assignment decision must identify the responsible human actor.

---

## 3. Assignment Lifecycle

Represent assignment lifecycle states independently:

- no candidate selected
- candidate under review
- eligibility review pending
- candidate selected
- assignment submission pending
- assignment created
- worker notification pending
- worker notified
- worker response pending
- accepted
- declined
- expired
- cancelled
- replaced
- unavailable

Clarify:

```text
Candidate selected != Assignment created
Assignment created != Worker notified
Worker notified != Accepted
Accepted != Attendance confirmed
```

Selection, assignment, notification, and acceptance must never collapse into one status.

---

## 4. Shift Eligibility

Before assignment, conceptually confirm:

- shift remains active
- shift remains open
- required role is unchanged
- date and time remain valid
- residence and department remain valid
- rate and premium remain governed
- responsibilities remain unchanged or properly acknowledged
- no assignment conflict exists
- no cancellation or closure blocks assignment

Clarify:

```text
Shift displayed != Shift still assignable
Open shift != Candidate eligible
```

Do not assign against stale shift data.

---

## 5. Worker Eligibility

Represent separately:

- worker account active
- role match
- qualification requirement
- qualification verified
- licence current
- certification current
- background-check state where governed
- availability current
- schedule conflict
- work-area authorization
- compliance review required
- eligibility unavailable

Clarify:

```text
Worker visible != Eligible
Document submitted != Verified
Verified != Available
Available != Accepted
```

Manual Assignment cannot bypass governed eligibility controls.

---

## 6. AI Recommendation Boundary

Page 057 owns AI Dispatch recommendations.

Page 058 may display:

- AI-recommended candidate
- recommendation explanation
- confidence
- missing information
- alternatives
- policy version
- source freshness

Page 058 must not:

- generate new AI recommendations
- modify AI confidence
- hide alternatives
- treat AI output as authority
- silently accept the top recommendation
- penalize operators for overriding AI

Clarify:

```text
AI recommendation != Human decision
High confidence != Mandatory selection
AI first position != Best or required candidate
```

---

## 7. Manual Candidate Selection

Allow an authorized operator to:

- select an AI-recommended candidate
- select an alternative candidate
- search within the governed eligible pool
- select no candidate
- defer the decision
- request clarification
- record the selection rationale

Do not allow unrestricted selection outside the governed candidate pool.

Clarify:

```text
Manual selection != Eligibility override
No candidate selected != Shift cancelled
```

---

## 8. Override Governance

If an operator selects a candidate different from the AI recommendation, represent:

- override selected
- reason required where governed
- alternative evidence
- policy exception request where applicable
- supervisor review where required
- override accepted
- override blocked
- decision deferred

Clarify:

```text
Override != AI failure
Override != Worker penalty
Override != Permission to bypass qualifications
```

Override behavior must not be used to score or punish operators or workers without separate
governance.

---

## 9. Fairness

Manual assignment must not consider:

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
- retaliation indicators
- unrelated financial information
- unrelated private information

Clarify:

```text
Low rating != Automatic exclusion
Prior complaint != Assignment risk
Accessibility request != Lower suitability
```

Human discretion does not override anti-discrimination and retaliation protections.

---

## 10. Availability Truthfulness

Represent:

- available
- conditionally available
- unavailable
- conflicting assignment
- stale
- unknown
- confirmation required

Clarify:

```text
Declared available != Worker accepted
No response != Permanent unavailability
Stale availability != Confirmed availability
```

Do not fabricate current availability.

---

## 11. Qualification Truthfulness

Represent:

- requirement
- submitted
- verified
- current
- expired
- unavailable
- review required

Clarify:

```text
Uploaded != Verified
Verified != Current forever
Selected worker != Qualification waived
```

Page 058 must not become a credential-verification workflow.

---

## 12. Shift-Term Protection

Display governed assignment terms before submission:

- date
- start and end time
- timezone
- residence
- department
- role
- rate
- premium
- responsibilities
- travel or allowance terms where governed

If terms changed after the worker became a candidate, represent:

- change detected
- review required
- candidate eligibility rechecked
- worker acknowledgment required after notification
- original terms preserved

Clarify:

```text
Operator changed terms != Worker accepted them
```

Do not silently alter accepted or previously presented terms.

---

## 13. Assignment Execution Boundary

Page 058 may submit a human-approved assignment decision to the authoritative assignment workflow.

It must not directly own:

- assignment state machine
- worker response
- replacement
- cancellation
- attendance
- payroll
- billing

Clarify:

```text
Submit assignment decision != Assignment successfully created
Assignment successfully created != Worker accepted
```

Page 046 remains authoritative for the resulting Assigned Worker record.

---

## 14. Notification Boundary

Page 058 may prepare the next governed communication step.

It must not:

- send messages
- send email
- send SMS
- send push notifications
- contact workers automatically
- fabricate delivery or read status

Clarify:

```text
Assignment created != Worker notified
Worker notified != Worker read
Worker read != Worker accepted
```

Page 054 or the governed invitation workflow owns communication.

---

## 15. Duplicate and Conflict Prevention

Represent checks for:

- existing assignment
- overlapping assignment
- duplicate submission
- stale candidate state
- shift filled by another operator
- worker became unavailable
- qualification expired
- concurrent assignment attempt
- policy conflict

Clarify:

```text
Submit clicked != Assignment guaranteed
Conflict detected != Worker misconduct
```

Use safe retry or refresh guidance.

---

## 16. High-Impact Confirmation

Before final submission, conceptually require confirmation of:

- selected worker
- shift reference
- role
- date and time
- residence and department
- rate and premium
- eligibility state
- notification expectation
- human actor
- override reason where applicable

Do not use vague confirmation language.

---

## 17. Cancellation and Replacement Boundary

Page 058 owns initial human assignment only.

It must not own:

- post-assignment cancellation
- replacement
- reassignment
- worker withdrawal
- support intervention

Clarify:

```text
Initial selection != Replacement
Assignment failed != Original worker misconduct
```

---

## 18. Privacy

Display only minimum necessary candidate information.

Do not expose:

- banking information
- tax information
- health information
- identity-document images
- private addresses
- complaints
- investigations
- unrelated employment history
- private support cases
- precise off-shift location
- internal fraud signals

Use role-appropriate identities and governed qualification summaries.

---

## 19. Auditability

Conceptually preserve:

- assignment page opened
- candidate pool viewed
- AI recommendation viewed
- alternative selected
- manual candidate selected
- eligibility checked
- override recorded
- clarification requested
- assignment decision submitted
- submission succeeded or failed
- authoritative handoff created
- authorization denied

Include:

- actor
- role
- timestamp
- shift reference
- selected worker reference
- recommendation reference where applicable
- prior state
- requested state
- resulting state
- rationale or override reason
- policy version

Do not broadly log protected candidate data.

---

## 20. AI Boundary

AI may:

- explain the existing recommendation
- summarize visible candidate information
- identify missing information
- help compare eligible candidates
- explain conflicts
- draft a human-reviewed rationale

AI must never:

- select the worker automatically
- submit the assignment
- contact the worker
- waive qualifications
- override policy
- alter shift terms
- fabricate availability
- fabricate eligibility
- rank using protected data
- punish overrides
- write authoritative assignment state

---

## 21. Conflict Resolution Boundary

Prepare explicitly for Page 059 - Conflict Resolution.

Page 058 may identify assignment conflicts such as:

- duplicate assignment
- schedule overlap
- stale selection
- qualification conflict
- concurrent operator action
- policy conflict

Page 058 must not adjudicate complex conflicts.

Page 059 owns governed conflict review and resolution.

Clarify:

```text
Conflict detected != Conflict resolved
Manual assignment != Conflict adjudication
```

Do not create Page 059 files.

---

## 22. Empty and Error States

Include:

- no open shifts
- no eligible candidates
- AI recommendation unavailable
- candidate became unavailable
- qualification expired
- shift already filled
- duplicate submission prevented
- assignment submission failed
- authorization denied
- source data stale
- manual review required
- service unavailable

Do not fabricate assignment success.

---

## 23. Mobile Design

Prioritize:

- shift summary
- selected candidate
- eligibility state
- recommendation context
- alternatives
- availability
- qualifications
- conflicts
- terms
- human rationale
- final confirmation
- large touch targets
- clear failure and stale states

Avoid dense scoring interfaces.

---

## 24. Desktop Design

Use:

- open-shift context
- candidate list
- AI recommendation reference
- eligible alternatives
- qualification and availability panel
- conflict panel
- term summary
- rationale or override panel
- confirmation
- audit guidance
- handoff state

Do not include direct communication or attendance controls.

---

## 25. Accessibility

Review:

- semantic headings
- keyboard navigation
- accessible candidate comparison
- screen-reader-friendly eligibility states
- no color-only conflicts
- readable dates, times, rates, and qualifications
- accessible confirmation controls
- focus management
- sufficient contrast
- plain-language errors
- clear override and submission confirmation

---

## 26. International Readiness

Do not hardcode:

- roles
- qualification rules
- licence models
- worker classification
- assignment authority
- rate models
- travel rules
- scheduling rules
- fairness policy
- timezone
- date format
- locale
- language
- notification model
- override policy

Keep jurisdiction, organization, residence, department, role, assignment policy, eligibility
policy, fairness policy, locale, timezone, and terms configurable.

---

## 27. Validation

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

## 28. Final Status

```text
Page 058 — Manual Assignment
Revision 1: COMPLETE
Approval Criteria: SATISFIED

Page 059 — Conflict Resolution
UNBLOCKED AFTER APPROVAL
NOT CREATED
```
