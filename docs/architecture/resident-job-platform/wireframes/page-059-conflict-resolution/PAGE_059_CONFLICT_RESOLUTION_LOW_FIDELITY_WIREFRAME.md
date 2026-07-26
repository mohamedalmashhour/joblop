# Page 059 - Conflict Resolution Low-Fidelity Wireframe

**Status:** Low-fidelity wireframe complete  
**Owner review:** Required  
**Approval record:** Not created  
**Implementation:** Not authorized  
**Frozen architecture title:** Conflict Resolution  
**Next frozen page:** Page 060 - Replacement Engine

## 1. Purpose

Page 059 owns governed review and routing of operational conflicts detected before or during assignment.
It helps authorized humans understand record disagreement, choose a governed resolution route, and hand
changes back to the authoritative workflow.

This page does not determine fault, discipline workers, investigate complaints, adjudicate legal disputes,
assign or reassign workers, execute notifications, calculate money, or automate AI decisions.

## 2. Architecture References

| Page | Frozen title | Boundary |
| --- | --- | --- |
| 046 | Assigned Worker | Owns the resulting assignment record. |
| 057 | AI Dispatch | Owns advisory dispatch recommendations. |
| 058 | Manual Assignment | Owns human assignment execution. |
| 059 | Conflict Resolution | Owns conflict review and resolution routing. |
| 060 | Replacement Engine | Owns the next replacement workflow, not created here. |

## 3. Core Boundary Statements

```text
Conflict detected != Conflict proven
Conflict exists != Worker fault
Authorized workflow access != Conflict-resolution authority
Category != Cause
Category != Misconduct finding
Conflict summary != Source record
Conflict resolution != Silent source-record mutation
Resolution selected != Authoritative change completed
Conflict resolved != Worker penalized
Alternative candidate required != Alternative assigned
Assignment conflict != No compensation due
```

## 4. Desktop Wireframe

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Resident Job / Scheduler Console / Conflict Resolution                       │
│ Role: Scheduler | Residence: Selected Residence | Source freshness: Current │
├──────────────────────────────┬───────────────────────────────────────────────┤
│ Conflict Queue               │ Conflict Summary                              │
│ ┌──────────────────────────┐ │ ┌───────────────────────────────────────────┐ │
│ │ Filters                  │ │ │ Conflict reference                         │ │
│ │ - Residence              │ │ │ Category: Overlapping schedule              │ │
│ │ - Shift                  │ │ │ Detection: Confirmed for review             │ │
│ │ - Category               │ │ │ Review: Under review                         │ │
│ │ - Impact                 │ │ │ Impact: Assignment paused                    │ │
│ │ - Review state           │ │ │ Resolution: Decision pending                 │ │
│ └──────────────────────────┘ │ └───────────────────────────────────────────┘ │
│ ┌──────────────────────────┐ │                                               │
│ │ Queue item               │ │ Affected Records                              │
│ │ Shift: reference only    │ │ ┌──────────────┬──────────────┬─────────────┐ │
│ │ Worker: masked summary   │ │ │ Shift record │ Assignment   │ Availability│ │
│ │ Impact: paused           │ │ │ source       │ source       │ source      │ │
│ │ [Open]                   │ │ │ Freshness    │ Freshness    │ Freshness   │ │
│ └──────────────────────────┘ │ └──────────────┴──────────────┴─────────────┘ │
├──────────────────────────────┼───────────────────────────────────────────────┤
│ Evidence & Comparison        │ Clarification                                 │
│ - Shift reference            │ - Clarification requested                     │
│ - Assignment reference       │ - Response pending / received / expired       │
│ - Worker reference           │ - Actor requested from                        │
│ - Relevant timestamps        │ - Manual review required if unresolved        │
│ - Qualification state        │                                               │
│ - Policy version             │ Resolution Routes                              │
│ - Prior human decision       │ ┌───────────────────────────────────────────┐ │
│                              │ │ [Refresh / Re-evaluate]                    │ │
│ Restricted evidence hidden   │ │ [Preserve assignment]                      │ │
│ unless explicitly authorized │ │ [Withdraw proposed assignment]              │ │
│                              │ │ [Return to candidate selection]             │ │
│                              │ │ [Request qualification review]              │ │
│                              │ │ [Escalate to support/compliance]            │ │
│                              │ └───────────────────────────────────────────┘ │
├──────────────────────────────┴───────────────────────────────────────────────┤
│ Fairness notice: conflict involvement is not a performance signal.            │
│ AI can summarize and suggest governed routes. Human reviewer decides route.   │
│ Authoritative workflow handoff: no source record changes happen here.         │
└──────────────────────────────────────────────────────────────────────────────┘
```

## 5. Mobile Wireframe

```text
┌──────────────────────────────┐
│ Conflict Resolution          │
│ Conflict: CR-0000            │
├──────────────────────────────┤
│ Status                       │
│ Category: Changed terms      │
│ Impact: Assignment blocked   │
│ Review: Clarification needed │
│ Freshness: Requires refresh  │
├──────────────────────────────┤
│ Affected records             │
│ Shift ref                    │
│ Worker ref                   │
│ Assignment ref               │
│ Policy version               │
├──────────────────────────────┤
│ What changed                 │
│ Date / time / role / rate    │
│ Worker has not accepted      │
│ changed terms                │
├──────────────────────────────┤
│ Clarification                │
│ Request from: operator       │
│ State: response pending      │
├──────────────────────────────┤
│ Available routes             │
│ [Refresh records]            │
│ [Request shift confirmation] │
│ [Return to selection]        │
│ [Escalate]                   │
├──────────────────────────────┤
│ Confirm route                │
│ Human reviewer + reason      │
│ No automatic assignment      │
└──────────────────────────────┘
```

## 6. Conflict Eligibility

A conflict may enter this page only when:

- A valid conflict reference exists.
- The conflict involves authorized organization, residence, department, shift, worker, or assignment records.
- The requesting actor has authority to view the matter.
- The reviewer has conflict-resolution authority.
- Authoritative records are available or the unavailable source is clearly labeled.
- The conflict remains unresolved.
- No separate investigation, complaint, legal, or disciplinary process exclusively owns the matter.

## 7. Conflict Categories

The category picker is configurable and supports:

- Duplicate assignment.
- Overlapping schedule.
- Stale candidate selection.
- Qualification conflict.
- Availability conflict.
- Shift-state conflict.
- Changed-term conflict.
- Concurrent operator conflict.
- Worker-response conflict.
- Replacement conflict.
- Assignment policy conflict.
- Source-record mismatch.
- Other governed operational conflict.

Categories explain operational context only; they do not prove cause or misconduct.

## 8. Independent State Model

### Detection State

```text
Not detected -> Detected -> Confirmed for review -> False positive
                                      └────────────-> Unavailable
```

### Review State

```text
Not reviewed -> Under review -> Clarification required -> Evidence pending
                       └────-> Escalated -> Decision pending -> Resolved -> Closed
                                                              └──────────-> Reopened
```

### Workflow Impact State

- No impact.
- Assignment blocked.
- Assignment paused.
- Notification paused.
- Worker response preserved.
- Replacement required.
- Manual review required.
- Downstream workflow unavailable.

### Resolution State

- No action.
- Refresh required.
- Candidate selection withdrawn.
- Assignment cancelled through authoritative workflow.
- Assignment preserved.
- Alternative candidate required.
- Authoritative-record correction requested.
- Escalated to another workflow.

Detection, review, workflow impact, and resolution are visually separate and cannot collapse into one badge.

## 9. Source-of-Truth Boundary

Page 059 compares governed records but never becomes authoritative for them.

| Source record | Page 059 behavior |
| --- | --- |
| Shift | Show reference, freshness, relevant changed fields. |
| Assignment | Show state and conflict linkage. |
| Availability | Show current known state and freshness. |
| Qualification / licence / certification | Show status only, not restricted evidence. |
| Worker response | Show response state, not private message body unless authorized. |
| Notification | Show delivery or acceptance mismatch status. |
| Support / policy configuration | Show governed reference only where applicable. |

Corrections must return to the workflow that owns the source record.

## 10. Human Authority

Conflict resolution routes are available only to authorized roles, such as:

- Operations manager.
- Residence manager.
- Department manager.
- Scheduler.
- Staffing coordinator.
- Authorized administrator.
- Support supervisor where governed.
- Compliance reviewer where necessary.

Every selected route records the responsible human actor, role, timestamp, reason, and handoff target.

## 11. Evidence and Privacy

Minimum necessary evidence may include:

- Shift, worker, and assignment references.
- Relevant timestamps.
- Current availability.
- Qualification status.
- Worker response state.
- Assignment state.
- Policy version.
- Source freshness.
- Prior human decisions.
- Safe conflict reason.

Restricted evidence is not broadly exposed:

- Health information.
- Banking or tax information.
- Unrelated complaints.
- Investigation notes.
- Protected personal information.
- Full identity documents.
- Private message bodies.
- Unrelated support cases.
- Internal fraud signals.

Missing or conflicting records are not treated as fraud or intentional wrongdoing.

## 12. Clarification Workflow

```text
Clarification requested
↓
Response pending
↓
Response received
↓
Additional information required
↓
Review resumed
↓
Decision pending
```

Alternative states:

- Response expired.
- Manual review required.
- Clarification unavailable.

Clarification may involve an operator, worker, residence manager, support, compliance reviewer, or the
authoritative workflow owner. A missing response does not equal misconduct.

## 13. Resolution Routes

Available routes are governed and permission-gated:

- Refresh / re-evaluate.
- Preserve existing assignment.
- Withdraw proposed assignment.
- Cancel invalid assignment through the authoritative assignment workflow.
- Return to candidate selection.
- Request updated availability.
- Request qualification review.
- Request shift-term confirmation.
- Request replacement.
- Escalate to support or compliance.
- Route to complaint or investigation workflow.
- No action required.
- Close as false positive.

Selecting a route creates a reviewed handoff; it does not silently mutate source records.

## 14. Assignment and Replacement Boundary

Page 059 does not directly assign, reassign, replace, cancel, notify, or accept on behalf of a worker.

```text
Resolution recommends cancellation != Assignment cancelled
Alternative candidate required != Alternative assigned
Replacement required != Replacement created
```

Assignment execution returns to Page 058 or the authoritative assignment workflow. Replacement continues
to Page 060 - Replacement Engine only after owner approval of the next controlled gate.

## 15. Qualification, Availability, and Changed-Term Conflicts

### Qualification Conflict

Represent:

- Current.
- Expired.
- Missing.
- Under review.
- Source unavailable.
- Policy mismatch.
- Re-verification required.

Qualification conflict does not equal dishonesty, permanent ineligibility, or credential verification.

### Availability and Schedule Conflict

Represent:

- Overlap detected.
- Availability stale.
- Worker became unavailable.
- Assignment conflict.
- Timezone mismatch.
- Travel-time conflict.
- Source unavailable.

Overlap is not misconduct. Unavailable is not declined. Stale availability is not confirmed truth.

### Changed-Term Conflict

Represent conflicts involving:

- Date.
- Start time.
- End time.
- Timezone.
- Residence.
- Department.
- Role.
- Rate.
- Premium.
- Responsibilities.
- Travel or allowance terms.

Changed terms require acknowledgment or acceptance through the authoritative workflow.

## 16. Concurrent Action Governance

The page explicitly handles:

- Another operator acted first.
- Shift filled elsewhere.
- Assignment changed.
- Worker state changed.
- Stale page.
- Duplicate submission.
- Transition conflict.
- Retry available.
- Manual refresh required.

The response does not overwrite another completed decision. Duplicate attempts must not create duplicate assignments.

## 17. Fairness and Complaint Boundary

Conflict resolution must not penalize workers for:

- Complaints.
- Safety reports.
- Attendance, timesheet, or payment disputes.
- Accessibility requests.
- Declining changed terms.
- Declining unrelated work.
- Participating in an investigation.

Page 059 may route to a separate complaint, investigation, compliance, or legal workflow. It does not own
formal complaints, findings, sanctions, suspension, termination, or legal adjudication.

## 18. Financial Boundary

Conflict Resolution must not:

- Alter rates silently.
- Calculate compensation.
- Modify invoices.
- Execute refunds.
- Reverse payments.
- Reconcile funds.
- Determine payroll outcomes.

Any financial consequence is resolved in the authoritative financial workflow.

## 19. Auditability

The audit model conceptually preserves:

- Conflict detected, opened, resolved, closed, and reopened.
- Reviewer assigned.
- Evidence viewed.
- Clarification requested and received.
- Resolution proposed and selected.
- Workflow handoff.
- Authorization denied.
- Actor, role, timestamp, conflict reference, related records, category, prior state, requested outcome,
  resulting conflict state, reason, policy version, and authoritative handoff reference.

Restricted evidence is referenced by governed link or safe summary only.

## 20. AI Boundary

AI may:

- Summarize visible conflict records.
- Identify inconsistent fields.
- Explain policy options.
- Identify missing information.
- Suggest possible governed routes.
- Draft a human-reviewed resolution note.
- Suggest navigation.

AI must never:

- Decide fault.
- Determine misconduct.
- Resolve conflicts automatically.
- Assign or reassign workers.
- Cancel assignments.
- Waive qualifications.
- Alter terms.
- Penalize users.
- Expose restricted information.
- Write authoritative operational state.

## 21. Empty and Error States

- No conflicts.
- Conflict already resolved.
- Conflict unavailable.
- Source record unavailable.
- Stale conflict data.
- Clarification pending.
- Evidence unavailable.
- Resolution blocked.
- Another operator completed action.
- Access denied.
- Service unavailable.

The page never fabricates resolution success.

## 22. Accessibility and International Readiness

Accessibility requirements:

- Semantic conflict headings.
- Keyboard navigation.
- Screen-reader-friendly conflict states.
- Accessible source comparison.
- No color-only severity.
- Readable timestamps and timezones.
- Accessible clarification and resolution controls.
- Focus management.
- Sufficient contrast.
- Plain-language explanations.
- Confirmation before high-impact routing.

International readiness keeps jurisdiction, organization, residence, department, role, conflict policy,
assignment policy, fairness policy, locale, timezone, date format, language, retention, and escalation
policy configurable.

## 23. Validation

- Governance control stack unchanged.
- Frozen title remains Conflict Resolution.
- Pages 001-058 unchanged.
- Exact Page 060 title identified as Replacement Engine.
- No Page 060 files created.
- No approval record created.
- No implementation.
- No React.
- No frontend.
- No backend.
- No APIs.
- No database changes.
- No conflict engine.
- No assignment automation.
- No notification implementation.
- No complaint or investigation implementation.
- No financial implementation.
- No AI automation.
- No commit, push, merge, or deployment.

## 24. Final Status

```text
Page 059 - Conflict Resolution
Wireframe: COMPLETE
Product Review: COMPLETE
Approval Record: NOT CREATED
Owner Review: REQUIRED

Page 060 - Replacement Engine
BLOCKED
```
