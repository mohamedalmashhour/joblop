# Resident Job

## Page 058 - Manual Assignment Low-Fidelity Wireframe

**Status:** Low-Fidelity Wireframe Complete  
**Owner Review:** Required  
**Approval Record:** Not Created  
**Implementation:** Not Started  
**Page 059:** Conflict Resolution blocked

---

## 1. Purpose

Page 058 designs the authenticated Manual Assignment experience.

Manual Assignment owns explicit human assignment execution after advisory recommendations or
independent manual review. It allows an authorized operator to select an open shift, review
eligible workers, review an AI recommendation where available, select a different eligible worker,
verify qualification and availability state, record the human decision, provide a selection or
override reason, and submit the assignment to the authoritative assignment workflow.

It must not:

- generate AI recommendations
- rank workers secretly
- bypass eligibility controls
- contact workers automatically
- fabricate availability
- waive qualifications
- alter accepted shift terms silently
- approve attendance
- calculate payroll
- issue invoices
- execute payments
- penalize workers for not being selected

---

## 2. Governance Control Stack

Page 058 follows the approved governance hierarchy:

```text
1. Individual Page Governance
2. Phase Governance
3. Platform Governance
```

If a conflict appears between documents, this page must not silently reconcile it. The conflict
must be identified and returned for owner direction. Frozen pages remain unchanged unless an
Architecture Change Request explicitly reopens them.

---

## 3. Architecture Reference

| Page | Frozen title | Source |
| --- | --- | --- |
| 046 | Assigned Worker | `pages/PAGE_046_ASSIGNED_WORKER.md` |
| 057 | AI Dispatch | `pages/PAGE_057_AI_DISPATCH.md` |
| 058 | Manual Assignment | `pages/PAGE_058_MANUAL_ASSIGNMENT.md` |
| 059 | Conflict Resolution | `pages/PAGE_059_CONFLICT_RESOLUTION.md` |

Page 058 is a Scheduler Console page. It is the human-controlled execution layer after advisory AI
recommendation review or independent manual review.

---

## 4. Core Boundary Statements

Clarify on the page:

```text
AI recommendation != Human assignment decision
Human selection != Worker notification
Assignment created != Worker acceptance
Worker acceptance != Attendance
Assignment != Payroll
Assignment != Invoice
```

Manual Assignment creates a governed assignment handoff only. It does not prove attendance, create
payment, or guarantee the worker will accept.

---

## 5. Users and Permissions

Primary users:

- Scheduler
- Administrator

Secondary users where permissioned:

- Support
- Compliance
- Super Administrator

Access requirements:

- authenticated user
- authorized operator role
- permission to view the selected shift
- permission to view eligible worker assignment information
- permission to submit assignment decisions

Users without assignment authority may see an access-denied or read-only state.

---

## 6. Page-Level Information Hierarchy

Primary:

1. selected shift context
2. assignment eligibility state
3. eligible worker list
4. AI recommendation reference where available
5. human selection and reason
6. assignment submission handoff

Secondary:

1. requirement gaps
2. availability freshness
3. conflict warnings
4. accepted-terms protection
5. notification boundary notice
6. audit preview

Tertiary:

1. help and escalation
2. policy explanation
3. future conflict-resolution handoff

The first screen should answer:

```text
Which shift is being assigned?
Who is eligible to be considered?
What evidence supports the selection?
What conflicts or gaps exist?
What human decision is being recorded?
What workflow receives the handoff?
```

---

## 7. Desktop Wireframe

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ Resident Job / Scheduler Console / Manual Assignment                        │
│ Role: Scheduler | Scope: Authorized residences only | Human decision page    │
├─────────────────────────────────────────────────────────────────────────────┤
│ Shift Context                                                                │
│ ┌──────────────────────────────┐ ┌────────────────────────────────────────┐ │
│ │ Shift: Evening care aide     │ │ Assignment Readiness                   │ │
│ │ Status: Open / Urgent        │ │ Shift active: yes                      │ │
│ │ Residence: permitted scope   │ │ Terms protected: yes                   │ │
│ │ Time: configured local time  │ │ Qualification requirements loaded      │ │
│ │ Role + requirements          │ │ Availability snapshot current/stale    │ │
│ └──────────────────────────────┘ └────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│ AI Recommendation Reference (optional)                                      │
│ Recommendation available: yes/no/stale/unavailable                          │
│ Candidate suggested: Worker ref | Confidence: informational only             │
│ Note: AI recommendation is not assignment and can be overridden by human.     │
├─────────────────────────────────────────────────────────────────────────────┤
│ Eligible Workers                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ Worker A | Eligibility: verified where required | Availability: current  │ │
│ │ Qualifications: role match, licence current, certification current       │ │
│ │ Conflicts: none visible | Privacy: minimum operational profile only      │ │
│ │ Action: Select for assignment review                                     │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ Worker B | Eligibility: review required | Availability: conditional      │ │
│ │ Gap: certification review pending | Action: Cannot assign until resolved │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│ Human Decision                                                               │
│ Selected worker: [worker reference]                                          │
│ Selection reason: [required text / controlled reason]                        │
│ Override reason if different from AI recommendation: [required if relevant]   │
│ Confirm: no eligibility bypass | no automatic notification | no term change   │
├─────────────────────────────────────────────────────────────────────────────┤
│ Assignment Submission Handoff                                                │
│ Submit to authoritative assignment workflow                                  │
│ Creates: assignment pending / worker response pending as governed             │
│ Does not create: worker acceptance, attendance, payroll, invoice, payment     │
├─────────────────────────────────────────────────────────────────────────────┤
│ Audit Preview                                                                │
│ Captures: actor, role, timestamp, shift, selected worker, eligible pool,      │
│ evidence, AI recommendation reference, human reason, override reason, handoff.│
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Mobile Wireframe

```text
┌──────────────────────────────┐
│ Manual Assignment            │
│ Human decision required       │
├──────────────────────────────┤
│ Shift Context                │
│ Open / urgent shift           │
│ Terms protected               │
├──────────────────────────────┤
│ Assignment Readiness         │
│ Requirements loaded           │
│ Availability current/stale    │
│ Conflicts clear/present       │
├──────────────────────────────┤
│ AI Reference                 │
│ Advisory only                 │
│ Not assignment                │
├──────────────────────────────┤
│ Eligible Worker Card         │
│ Qualification state           │
│ Availability state            │
│ Gaps/conflicts                │
│ [Select for review]           │
├──────────────────────────────┤
│ Human Decision               │
│ Selection reason required     │
│ Override reason if needed     │
│ [Submit assignment handoff]   │
└──────────────────────────────┘
```

Mobile priority:

1. shift identity
2. readiness to assign
3. selected worker eligibility
4. conflicts or gaps
5. human reason
6. assignment handoff

Worker lists collapse into cards. Evidence, qualification details, and availability details expand
on demand.

---

## 9. Human Authority

Manual Assignment must clearly show:

- human operator identity
- permission status
- selected shift
- selected worker
- evidence reviewed
- reason required
- override reason where applicable
- final handoff target

Clarify:

```text
Human selection != Worker notification
Human selection != Worker acceptance
Human selection != Attendance
```

The human operator is accountable for the assignment decision. AI may inform but cannot decide.

---

## 10. Eligibility Truthfulness

Represent worker eligibility states:

- eligible for assignment review
- missing required qualification
- review required
- unavailable
- conflicting assignment
- stale availability
- restricted by policy
- access denied

Clarify:

```text
Visible worker != Eligible worker
Eligible worker != Selected worker
Selected worker != Assigned worker
Assigned worker != Accepted worker
```

The page must not fabricate eligibility or hide blocking gaps.

---

## 11. AI Recommendation Separation

Where an AI Dispatch recommendation exists, display it as evidence only:

- recommendation reference
- confidence state
- supporting evidence
- missing information
- freshness
- alternatives
- policy version

Clarify:

```text
AI recommendation != Human assignment decision
AI recommendation accepted != Assignment complete
AI recommendation overridden != Worker penalty
```

Page 058 does not generate new recommendations. Page 057 owns AI Dispatch.

---

## 12. Fairness

Manual selection may consider only governed operational criteria:

- role requirement
- verified qualification where required
- availability
- conflict status
- authorized location or residence scope
- relevant experience where policy permits
- accepted business rules

Prohibited criteria:

- protected characteristics
- health information
- disability
- unrelated personal data
- retaliation indicators
- complaint history outside approved process
- investigation status outside approved process
- hidden reputation penalties
- unrelated financial information

Non-selection must not be treated as discipline or penalty.

---

## 13. Assignment Execution

Represent assignment execution as a governed handoff:

1. shift selected
2. worker reviewed
3. eligibility and availability checked
4. AI recommendation reference reviewed where available
5. human selection made
6. selection or override reason recorded
7. assignment submitted to authoritative assignment workflow
8. assignment pending / worker response pending shown as the next state

Clarify:

```text
Assignment submitted != Worker accepted
Worker accepted != Checked in
Checked in != Hours approved
```

---

## 14. Notification Separation

Manual Assignment must never silently contact a worker.

The page must not:

- send automatic worker notifications
- send automatic employer messages
- send email
- send SMS
- send push notifications
- open a conversation automatically

Clarify:

```text
Assignment created != Notification sent
Worker notification != Worker acceptance
```

Notifications remain governed by their authoritative communication/notification workflow.

---

## 15. Accepted-Terms Protection

If a shift already has accepted terms, the page must protect them.

Manual Assignment may not silently alter:

- role
- time
- location
- rate or compensation summary
- requirements
- cancellation expectations
- assignment scope

Any required change routes to the authoritative shift/change workflow, not hidden inside assignment.

---

## 16. Privacy

Show only minimum required worker information:

- worker reference
- role fit
- qualification state
- availability state
- conflict status
- authorized service area where applicable
- operational notes permitted for assignment

Do not expose:

- full personal profile
- home address
- full documents
- health information
- private messages
- unrelated support cases
- complaint details
- financial data
- protected personal information

---

## 17. Page 046 Handoff

Page 046 remains the Assigned Worker page.

Page 058 may hand off:

- selected worker reference
- shift reference
- assignment decision reference
- decision reason
- eligibility evidence references
- AI recommendation reference where applicable
- assignment pending state

Page 058 must not duplicate:

- Assigned Worker display
- worker acceptance workflow
- attendance workflow
- live tracking workflow
- timesheet workflow

---

## 18. Page 059 Boundary

Exact frozen Page 059 title:

```text
Conflict Resolution
```

Page 059 owns conflict resolution after assignment conflicts or disputed operational issues require
a separate governed workflow.

Page 058 may route to Page 059 when:

- assignment conflict blocks selection
- availability conflict requires review
- duplicate assignment risk appears
- policy conflict requires review
- unresolved worker/employer conflict prevents assignment

Page 058 must not resolve conflicts itself.

---

## 19. AI Boundary

AI may:

- explain prior recommendation context
- summarize visible evidence
- identify missing information
- explain eligibility gaps
- suggest navigation to the correct workflow

AI must never:

- assign
- contact
- notify
- reject
- penalize
- fabricate eligibility
- fabricate availability
- waive qualifications
- alter accepted terms
- write authoritative assignment state without recorded human action

---

## 20. Failure and Empty States

Include:

- no open shifts
- no eligible workers
- candidate pool unavailable
- availability stale
- qualification source unavailable
- conflict detected
- access denied
- assignment submission failed
- assignment already filled
- shift cancelled
- manual review required

Failures must explain the next governed action without inventing assignment results.

---

## 21. Auditability

Conceptually preserve:

- actor
- role
- timestamp
- shift reference
- worker candidate pool reference
- selected worker reference
- AI recommendation reference where applicable
- eligibility evidence
- availability snapshot
- conflict warnings
- human selection reason
- override reason
- handoff target
- resulting assignment state

Audit records should avoid unnecessary protected personal data.

---

## 22. Accessibility

Design requirements:

- clear heading hierarchy
- keyboard-accessible candidate cards
- screen-reader labels for eligibility, gaps, and conflicts
- no color-only eligibility states
- visible focus states
- plain-language reasons and errors
- mobile-friendly decision controls
- 44px minimum touch targets
- confirmation state before high-impact submission

---

## 23. International Readiness

Keep configurable:

- role names
- qualification labels
- assignment terms
- language direction
- date and time formats
- location and travel terminology
- legal and employment terminology
- notification language
- conflict categories

Do not hardcode country-specific workforce, healthcare, licensing, employment, payroll, or privacy
rules.

---

## 24. Validation

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

## 25. Final Status

```text
Page 058 — Manual Assignment
Wireframe: COMPLETE
Product Review: COMPLETE
Approval Record: NOT CREATED

Page 059 — Conflict Resolution
BLOCKED
```
