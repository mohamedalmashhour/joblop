# Resident Workforce OS — Timesheet Engine Architecture

Status: READY FOR OWNER REVIEW

This document defines Timesheet architecture only. It authorizes no schema, migration, permission, service, API, frontend, payroll, finance, invoicing, payment, notification, GPS, offline synchronization, AI execution, push, merge, deployment, or implementation work.

Canonical flow:

```text
Job Request
-> Dispatch
-> Worker Offer
-> Assignment
-> Attendance
-> Timesheet
-> Payroll and Finance boundaries
```

Required clarifications:

- Attendance does not equal Timesheet.
- Timesheet does not equal Payroll.
- Timesheet does not equal Employer Invoice.
- Worker Payable Time does not equal Employer Billable Time.
- Approved Timesheet does not equal Payment.
- Operational Evidence does not equal Financial Posting.

## 1. Timesheet Operating Principle

Timesheet is the governed calculation and review layer that converts accepted Attendance evidence into an approved record of payable and billable work time.

A Timesheet is:

- derived from authoritative Attendance evidence
- linked to one Assignment
- linked to one worker
- linked to one employer organization and worksite
- calculated using versioned rules
- reviewable by authorized actors
- correctable through governed adjustments
- auditable
- concurrency-safe
- Country Pack aware
- separate from Payroll and Finance
- immutable after final approval except through formal correction

Timesheet must preserve the original Attendance evidence. It must never rewrite check-in or check-out events.

## 2. Canonical Timesheet Flow

Recommended flow:

| Transition | Actor | Source | Target | Conditions | Permission | Source | Calculation Version | Audit | Failure/Retry | Concurrency | Downstream Effect | Human Review |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Eligibility check | system/platform | Attendance `completed` or reviewed `exception` | eligible | Attendance exists and versions match | `timesheet.create` | Attendance | none | eligibility checked | no Timesheet created on failure | unique Assignment constraint | none | no |
| Create draft | platform | eligible | `draft` | no duplicate Timesheet | `timesheet.create` | Attendance + Assignment | initial | created | safe retry by idempotency key | transaction | none | yes later |
| Import evidence | platform | `draft` | `calculation_pending` | Attendance references captured | `timesheet.calculate` | Attendance | calculation run version | evidence imported | retry calculation | version snapshot | none | no |
| Determine interval | platform | `calculation_pending` | `review_required` or `worker_review` | timestamps complete or exception flagged | `timesheet.calculate` | Attendance | calculation snapshot | calculation completed | failed calculation remains reviewable | stale input rejected | none | clean result can enter review |
| Exception flag | platform | any pre-approval | `review_required` | missing/conflicting evidence | `timesheet.review` | Attendance/Assignment | current | exception detected | manual review required | version lock | blocks handoff | yes |
| Worker review | worker | `worker_review` | `employer_review` or `correction_required` | worker owns Timesheet | `timesheet.worker_confirm` or `timesheet.worker_dispute` | Timesheet | current | worker reviewed | dispute keeps review open | expected version | none | yes |
| Employer review | employer | `employer_review` | `platform_review` or `correction_required` | employer owns organization | `timesheet.employer_confirm` or `timesheet.employer_dispute` | Timesheet | current | employer reviewed | dispute keeps review open | expected version | none | yes |
| Platform review | reviewer | `platform_review` | `approved` or `rejected` or `correction_required` | all required reviews complete or documented exception | `timesheet.approve` or `timesheet.reject` | Timesheet | current | approved/rejected | reviewer can request correction | expected version | approval boundary only | yes |
| Lock | platform reviewer | `approved` | `locked` | approval exists, calculation current | `timesheet.lock` | Timesheet | locked calculation | locked | no silent overwrite | expected version | payroll/finance handoff eligible | yes |
| Payroll handoff boundary | platform/payroll future | `locked` | unchanged | locked Timesheet | future handoff permission | Timesheet | locked | attempted | failure does not unlock | idempotency key | payroll input only | future |
| Finance handoff boundary | platform/finance future | `locked` | unchanged | locked Timesheet | future handoff permission | Timesheet | locked | attempted | failure does not unlock | idempotency key | finance input only | future |

## 3. Timesheet Entity Strategy

Entities considered:

- `Timesheet`
- `TimesheetLine`
- `TimesheetCalculationSnapshot`
- `TimesheetAdjustment`
- `TimesheetApproval`
- `TimesheetException`
- `TimesheetRuleReference`

Recommended smallest Phase 01 schema:

- Required: `Timesheet`
- Required: `TimesheetCalculationSnapshot`
- Optional Phase 01 only if owner selects detailed line review: `TimesheetLine`
- Deferred: `TimesheetAdjustment`
- Deferred: `TimesheetApproval` as separate entity unless multiple approval signatures are required
- Deferred: `TimesheetException` unless exception history cannot be represented on Timesheet
- Deferred: `TimesheetRuleReference` if calculation snapshot stores versioned rule references

Immutable evidence to store:

- AttendanceRecord ID and version
- Assignment ID and version/schedule snapshot
- calculation policy version
- Country Pack version
- raw and normalized timestamps used
- calculation timestamp and engine version

Recalculable derived data:

- display summaries
- explanatory text
- non-authoritative review hints
- candidate premium labels before approval

## 4. Timesheet States

Recommended minimum Phase 01 states:

| State | Meaning | Owner | Allowed Actions | Prohibited Actions | Next States | Worker Visibility | Employer Visibility | Platform Visibility | Recalculation | Approval | Handoff | Terminal | Audit |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `draft` | Timesheet exists but calculation not complete | Platform | calculate, cancel | approve, lock, handoff | `calculation_pending`, `cancelled` | hidden or limited | hidden or limited | full | yes | no | no | no | created |
| `calculation_pending` | calculation is in progress or queued | Platform | complete calculation, fail calculation | approval, lock | `review_required`, `worker_review`, `correction_required` | limited | limited | full | yes | no | no | no | calculation started |
| `review_required` | exception or human review required | Platform | request correction, recalculate, move to review | lock, handoff | `worker_review`, `employer_review`, `platform_review`, `correction_required`, `rejected` | visible if worker affected | visible if employer affected | full | yes | no until resolved | no | no | exception detected |
| `worker_review` | worker can review own time | Worker | confirm, dispute, add explanation | edit Attendance, approve final | `employer_review`, `correction_required` | full worker-facing | summary | full | no unless correction | no | no | no | worker viewed/confirmed/disputed |
| `employer_review` | employer confirms work occurrence/billable view | Employer | confirm, dispute, add evidence | edit Attendance, approve payroll | `platform_review`, `correction_required` | status | organization view | full | no unless correction | no final approval | no | no | employer viewed/confirmed/disputed |
| `platform_review` | authorized reviewer makes final decision | Platform | approve, reject, request correction, recalculate | payroll/payment execution | `approved`, `rejected`, `correction_required` | status | status | full | yes if stale | yes | no | no | platform review |
| `approved` | payable/billable minutes approved but not locked | Platform | lock, correction before lock | payment, invoice creation | `locked`, `correction_required` | approved status | approved status | full | only through correction | already approved | no | no | approved |
| `locked` | immutable Timesheet eligible for downstream handoff | Platform | formal correction only, handoff boundary | silent edit, Attendance rewrite | post-lock correction future | locked status | locked status | full | no silent recalculation | no new approval without correction | yes | yes for normal flow | locked |
| `rejected` | Timesheet invalid and blocked | Platform | recreate through governed path if valid | payroll/finance handoff | none or future correction | status | status | full | no | no | no | terminal unless reopened by ACR-approved correction | rejected |
| `correction_required` | review found missing or disputed data | Platform | correction, adjustment proposal, recalculate | lock, handoff | `calculation_pending`, `worker_review`, `employer_review`, `platform_review`, `rejected` | visible reason where appropriate | visible reason where appropriate | full | yes | no | no | no | correction requested |
| `cancelled` | Timesheet stopped because upstream context invalid | Platform | audit/read | payroll/finance handoff | none | status | status | full | no | no | no | terminal | cancelled |

Excluded states:

- `paid`
- `invoiced`
- `remitted`
- `collected`

Those belong to Payroll and Finance.

## 5. Attendance Dependency

Attendance states:

| Attendance State | Timesheet Creation Behavior |
| --- | --- |
| `completed` | permitted |
| `checked_out` but not `completed` | not permitted by default; platform must complete/review Attendance first |
| `exception` | permitted only after exception is resolved or explicitly accepted into Timesheet review |
| missing checkout | not permitted unless a governed exception path creates review-required Timesheet |
| `missed` | no payable work Timesheet by default; may require cancellation/no-show policy in future |
| `cancelled` | not permitted |

Timesheet must reference:

- AttendanceRecord ID
- AttendanceRecord version
- Assignment ID
- Assignment schedule/version snapshot

If Attendance is corrected before Timesheet approval, recommendation: require manual recalculation and create a new calculation snapshot version. If Attendance correction occurs after lock, recommendation: use formal post-lock correction; never mutate the locked Timesheet silently.

## 6. Worked Time Calculation

Timesheet architecture must determine:

- scheduled start
- scheduled end
- actual check-in
- actual check-out
- raw elapsed time
- approved worked time
- payable time
- billable time
- excluded time
- break time
- premium candidate time
- overtime candidate time
- rounding adjustment

No jurisdiction-specific formula is universal. All calculations must be versioned, explainable, and reproducible.

## 7. Payable vs Billable Time

Worker Payable Time and Employer Billable Time are separate.

Future differences may include:

- minimum worker pay
- minimum employer billing
- travel time
- transportation allowance
- cancelled shift compensation
- late employer cancellation
- premiums
- unpaid breaks
- rounding policies

Worker-facing Timesheets may show payable minutes and worker-relevant rule explanations. Employer-facing Timesheets may show billable minutes and employer-relevant rule explanations. Worker view must not expose employer billable rate, platform margin, employer discounts, or confidential commercial calculations.

No rates, payroll amounts, invoice amounts, taxes, or payment amounts are implemented in Timesheet Phase 01.

## 8. Break Boundary

Future break support may include:

- paid break
- unpaid break
- automatic break deduction
- recorded break
- missed break
- multiple breaks
- interrupted break
- employer-approved correction
- Country Pack rules
- client-specific rules

Smallest Phase 01 behavior:

- do not implement Attendance break events
- do not fabricate breaks
- store a calculation snapshot field indicating break evidence was unavailable or not applied
- require review when break handling materially affects payable or billable time

## 9. Rounding Boundary

Future rounding options:

- no rounding
- nearest minute
- governed increments
- start-only rounding
- end-only rounding
- employer billing rounding
- worker payment rounding

Rounding rules must be:

- versioned
- jurisdiction-aware
- non-secret where they affect the worker
- consistently applied
- auditable
- separately applied to payable and billable time where lawful

No Quebec-specific rule should be hardcoded into Timesheet core.

## 10. Overtime and Premium Boundary

Future support may include:

- daily overtime
- weekly overtime
- consecutive-day rules
- night premiums
- weekend premiums
- holiday premiums
- emergency-shift premiums
- short-notice premiums
- split shifts
- minimum call-in pay
- travel-time pay

Timesheet may identify candidate premium categories and candidate overtime minutes. Payroll and Finance remain responsible for monetary calculation and posting.

Do not implement legal formulas in Timesheet core.

## 11. Schedule Variance

Schedule variance types:

- early arrival
- late arrival
- early departure
- late departure
- work outside Assignment schedule
- employer-requested extension
- worker-requested extension
- unauthorized extra time
- missing approval
- worksite change
- role change

Recommended handling:

- minor variance within owner-approved tolerance: review label, not automatic penalty
- late arrival/early departure: worker explanation and employer review
- extra time: employer review and platform approval
- worksite or role change: platform review and Country Pack validation
- missing approval: `review_required`

No variance should automatically become worker fault.

## 12. Timesheet Exceptions

| Exception | Authoritative Source | State Result | Review | Permitted Correction | Audit | Downstream Blocking |
| --- | --- | --- | --- | --- | --- | --- |
| missing check-in | Attendance | `review_required` | platform | correction/exception evidence | yes | blocks lock |
| missing check-out | Attendance | `review_required` | worker/employer/platform | correction/exception evidence | yes | blocks lock |
| duplicate check-in | Attendance audit | `review_required` | platform | select valid evidence, preserve all | yes | blocks lock |
| duplicate checkout | Attendance audit | `review_required` | platform | select valid evidence, preserve all | yes | blocks lock |
| conflicting evidence | Attendance | `review_required` | platform | adjustment proposal | yes | blocks lock |
| Attendance exception | Attendance | `review_required` | platform | resolve exception | yes | blocks lock |
| Assignment cancellation | Assignment | `cancelled` or `review_required` | platform | cancellation policy future | yes | blocks handoff |
| worker replacement | Assignment/Replacement | separate Timesheet per worker/Assignment | platform | new downstream record | yes | prevents merge |
| overnight shift | Assignment timezone | review or calculation | platform | split line future | yes | may block if policy missing |
| timezone change | Assignment timezone | review | platform | normalized calculation | yes | blocks if unresolved |
| daylight-saving transition | timezone database | review | platform | Country Pack rule | yes | blocks if unresolved |
| zero duration | Attendance | `review_required` | platform | correction/reject | yes | blocks lock |
| negative duration | Attendance | `review_required` | platform | correction/reject | yes | blocks lock |
| excessively long duration | Attendance + policy | `review_required` | platform | correction/review | yes | blocks lock |
| break evidence missing | break boundary | `review_required` where required | platform | no fabrication | yes | blocks if policy requires |
| offline evidence | future offline engine | deferred | platform | not Phase 01 | yes future | blocked |
| supervisor override | platform evidence | `platform_review` | platform | adjustment | yes | blocks until approved |
| disputed time | worker/employer | `correction_required` | platform | adjustment/recalculate/reject | yes | blocks lock |

## 13. Worker Review

Recommended Phase 01 worker behavior:

- worker may view draft/review Timesheet when worker review is opened
- worker may confirm hours
- worker may dispute hours
- worker may add explanation
- worker may request correction
- worker may see payable minutes, break deductions, rounding adjustments, premium categories, dispute history, approval state, and lock state where applicable

Worker must not see:

- employer billable rate
- employer invoice amount
- platform margin
- employer discounts
- internal fraud or risk notes
- other workers' information

## 14. Employer Review

Recommended smallest Phase 01 employer authority:

- view own organization's Timesheets
- confirm work occurred
- dispute Attendance-derived time
- submit correction evidence
- view billable minutes and exception state
- view worker identity necessary for operational review
- view approval and lock state

Employer must not:

- directly alter Attendance evidence
- approve Payroll
- create invoices
- view confidential worker compensation or platform margin

Employer correction requests remain auditable and reviewable.

## 15. Platform Review

Platform Administrator or authorized Timesheet Reviewer may:

- review exceptions
- approve corrections
- recalculate
- reject invalid Timesheet
- approve
- lock
- reopen through formal correction
- view calculation versions
- view worker-payable and employer-billable boundaries where authorized

AI may flag anomalies but cannot approve, reject, adjust, or lock a Timesheet.

## 16. Approval Model

Options:

- A. Platform-only approval
- B. Worker confirmation plus platform approval
- C. Employer confirmation plus platform approval
- D. Worker and employer review plus platform approval
- E. Rule-based auto-approval for clean Timesheets with human exception review

Recommendation for Phase 01: Option D for reviewed Timesheets, with no hidden consent and no silence-as-approval. Clean Timesheets may move efficiently through review, but final approval remains human/platform-authoritative until owner approves any rule-based auto-approval.

Worker or employer silence should not count as approval in Phase 01.

## 17. Corrections and Adjustments

Correction types:

- before approval
- after approval
- after lock

Every correction/adjustment must preserve:

- original value
- revised value
- actor
- evidence
- rule version
- approval
- audit
- downstream Payroll/Finance impact

Recommendation:

- pre-lock correction: create a new calculation snapshot version
- post-lock correction: use a `TimesheetAdjustment` or reversal-and-replacement model
- never overwrite a locked Timesheet silently

Owner decision required before schema.

## 18. Multi-Day Assignments

Options:

- one Timesheet per Assignment
- one Timesheet per workday
- one Timesheet per schedule segment
- one Timesheet per pay period
- parent Timesheet with daily lines

Recommendation: parent Timesheet per Assignment with daily or segment lines when required. This supports multi-day assignments, recurring assignments, overnight shifts, different workers by date through separate Assignments, replacements, partial completion, and country-specific pay periods without merging workers.

## 19. Overnight Shifts

Timesheet must handle:

- shift crossing midnight
- shift crossing pay period
- shift crossing holiday boundary
- timezone
- daylight-saving changes
- date attribution
- overtime attribution
- employer billing attribution

Use authoritative Assignment timezone data. Do not rely on device-local dates.

## 20. Timesheet Lines

Possible line types:

- regular worked time
- paid break
- unpaid break
- travel time
- premium time
- overtime candidate
- adjustment
- cancellation pay
- minimum-call amount boundary

Recommendation: defer `TimesheetLine` unless the owner requires line-level review in Phase 01. If included, store minutes and categories only, not monetary amounts.

## 21. Calculation Snapshot

Recommended required `TimesheetCalculationSnapshot` contains:

- Attendance references and versions
- Assignment schedule version
- calculation policy version
- Country Pack version
- raw timestamps
- normalized timestamps
- timezone
- applied break rule
- applied rounding rule
- payable minutes
- billable minutes
- exception flags
- calculation timestamp
- calculation engine version

The snapshot is required for audit, reproducibility, dispute resolution, and downstream handoff integrity.

## 22. Permissions

Proposed permissions:

| Permission | Actor | Context | Boundary | Status | Risk | Test Requirement |
| --- | --- | --- | --- | --- | --- | --- |
| `timesheet.create` | platform/reviewer | platform | create from Attendance | active | duplicate or invalid Timesheet | valid/invalid creation |
| `timesheet.read` | platform | platform | read all authorized | active | excess visibility | least privilege |
| `timesheet.calculate` | platform | platform | initial calculation | active | incorrect derived time | versioned snapshot |
| `timesheet.recalculate` | reviewer | platform | recalc before lock | active | silent changes | snapshot version |
| `timesheet.review` | reviewer | platform | exception review | active | ungoverned changes | audit |
| `timesheet.approve` | reviewer | platform | final approval | active | premature payroll/finance | no downstream creation |
| `timesheet.lock` | reviewer | platform | immutable lock | active | irreversible error | correction path |
| `timesheet.reject` | reviewer | platform | reject invalid Timesheet | active | unfair blocking | reason/audit |
| `timesheet.request_correction` | reviewer/employer/worker | mixed | correction request | active | hidden edits | no evidence overwrite |
| `timesheet.adjust` | reviewer | platform | formal adjustment | optional/reserved | financial impact | preserves original |
| `timesheet.audit_read` | reviewer | platform | audit summary | active | sensitive history | scoped access |
| `timesheet.worker_read` | worker | self | own Timesheet | active | other worker data | ownership test |
| `timesheet.worker_confirm` | worker | self | confirm own review | active | hidden consent | explicit action |
| `timesheet.worker_dispute` | worker | self | dispute own time | active | abuse/retaliation | audit |
| `timesheet.employer_read` | employer | organization | own org only | active | cross-tenant leakage | tenant isolation |
| `timesheet.employer_confirm` | employer | organization | confirm work/billable view | active | employer alters evidence | no Attendance write |
| `timesheet.employer_dispute` | employer | organization | dispute/review | active | unfair denial | platform review |
| `timesheet.supervise` | platform | platform | reserved elevated supervision | reserved | broad authority | unassigned |

Do not modify permissions yet.

## 23. Access Roles

Evaluate roles:

- Platform Administrator
- Timesheet Reviewer
- Dispatcher
- Employer Organization roles
- Worker Access
- future Payroll Reviewer
- future Finance Reviewer

Recommendation: introduce a narrow Timesheet Reviewer role or capability. Do not automatically grant Timesheet approval to Dispatcher. Employer roles receive organization-scoped read/confirm/dispute. Worker Access receives self-service read/confirm/dispute.

## 24. Employer Visibility

Employer may see only its own organization's Timesheets.

Employer may see:

- scheduled hours
- attendance-derived hours
- billable minutes
- exception state
- worker dispute state
- employer review state
- approval state
- lock state

Employer should not see worker-private compensation, worker tax/banking data, platform margin, or internal risk notes.

## 25. Worker Visibility

Worker may see only their own Timesheets.

Worker may see:

- raw Attendance timestamps
- payable minutes
- break deductions
- rounding adjustments
- premium categories
- dispute history
- approval state
- lock state

Worker must not see employer billable terms, platform margin, other workers' Timesheets, internal fraud indicators, or confidential employer commercial calculations.

## 26. Payroll Handoff Boundary

Future payroll handoff:

```text
Approved and locked Timesheet
-> validate worker payable time
-> generate Payroll input
-> preserve Timesheet reference and version
-> Payroll calculates monetary compensation
-> Payroll posts payment obligations later
```

Timesheet must not:

- create payroll
- calculate final tax
- issue payment
- create pay stub
- remit deductions

## 27. Finance and Invoice Handoff

Future finance handoff:

```text
Approved and locked Timesheet
-> validate employer billable time
-> generate Finance/Invoice input
-> preserve Timesheet reference and version
-> Finance applies commercial rates, taxes, fees, credits, and collection rules
```

Timesheet must not:

- create invoice
- charge card
- collect payment
- calculate platform margin
- post accounting entries

## 28. Concurrency

Required controls:

- duplicate Timesheet prevention by Assignment
- optimistic concurrency
- unique constraints
- transaction boundaries
- idempotency keys
- authoritative server timestamps
- row locking where approval/lock races require it

Race conditions to handle:

- simultaneous calculation
- recalculation during review
- Attendance correction during approval
- worker dispute during employer approval
- employer dispute during platform approval
- approval and cancellation race
- lock and correction race
- duplicate adjustment
- stale calculation version
- Assignment cancellation after Timesheet creation

## 29. Audit

Required events:

- Timesheet created
- calculation started
- calculation completed
- calculation failed
- exception detected
- worker viewed
- worker confirmed
- worker disputed
- employer viewed
- employer confirmed
- employer disputed
- correction requested
- adjustment proposed
- adjustment approved
- recalculated
- approved
- rejected
- locked
- post-lock correction initiated
- downstream handoff attempted
- sensitive access denied

Audit must include actor, role/context, organization, Assignment, Attendance, Timesheet, prior state, new state, input versions, calculation version, rule version, reason, timestamp, and correlation ID.

## 30. API Capability Map

Future capabilities only:

| Capability | Actor | Permission | Input | Output | Validation | Idempotency | Concurrency | Audit | Safe Error | Downstream Effect |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Create Timesheet | platform | `timesheet.create` | Attendance/Assignment IDs | draft Timesheet | Attendance complete/resolved | required | unique Assignment | created | generic denial | none |
| Read Timesheet | platform/employer/worker | read/self/org permission | Timesheet ID | scoped view | ownership/context | no | none | viewed where sensitive | scoped denial | none |
| List Timesheets | platform/employer | read permission | filters | scoped list | tenant scope | no | none | optional | scoped denial | none |
| Calculate | platform | `timesheet.calculate` | Timesheet ID | snapshot | input versions | required | expected version | calculation | safe fail | none |
| Recalculate | reviewer | `timesheet.recalculate` | Timesheet ID/version | new snapshot | not locked | required | expected version | recalculated | stale error | none |
| Read Explanation | authorized actor | read permission | Timesheet ID | explanation | visibility rules | no | none | viewed | scoped denial | none |
| Worker Confirm | worker | `timesheet.worker_confirm` | Timesheet ID/version | review status | worker owns | required | expected version | confirmed | generic denial | none |
| Worker Dispute | worker | `timesheet.worker_dispute` | reason/evidence | correction state | worker owns | required | expected version | disputed | generic denial | blocks approval |
| Employer Confirm | employer | `timesheet.employer_confirm` | Timesheet ID/version | review status | organization owns | required | expected version | confirmed | generic denial | none |
| Employer Dispute | employer | `timesheet.employer_dispute` | reason/evidence | correction state | organization owns | required | expected version | disputed | generic denial | blocks approval |
| Request Correction | reviewer | `timesheet.request_correction` | reason | correction state | review authority | required | expected version | requested | safe denial | blocks approval |
| Apply Adjustment | reviewer | `timesheet.adjust` | adjustment data | new version | evidence required | required | expected version | adjustment | safe denial | none |
| Approve | reviewer | `timesheet.approve` | Timesheet ID/version | approved | reviews complete | required | expected version | approved | safe denial | no payroll/finance |
| Reject | reviewer | `timesheet.reject` | reason | rejected | review authority | required | expected version | rejected | safe denial | blocks handoff |
| Lock | reviewer | `timesheet.lock` | approved Timesheet | locked | approved/current | required | expected version | locked | safe denial | handoff eligible |
| Audit Summary | reviewer | `timesheet.audit_read` | Timesheet ID | audit summary | authority | no | none | read | safe denial | none |
| Payroll Handoff Boundary | future | future | locked Timesheet | input reference | locked | required | expected version | attempted | no mutation | future only |
| Finance Handoff Boundary | future | future | locked Timesheet | input reference | locked | required | expected version | attempted | no mutation | future only |

No endpoint URLs are defined here.

## 31. Entity Impact

| Entity | Recommendation |
| --- | --- |
| `Timesheet` | required Phase 01 |
| `TimesheetLine` | optional Phase 01 if line-level review is required |
| `TimesheetCalculationSnapshot` | required Phase 01 |
| `TimesheetAdjustment` | deferred or optional if post-lock correction must exist immediately |
| `TimesheetApproval` | deferred unless multi-signature approval is selected |
| `TimesheetException` | deferred unless exceptions need standalone lifecycle |
| `TimesheetDispute` | deferred; may be represented on Timesheet initially |
| `PayrollHandoffReference` | deferred boundary |
| `FinanceHandoffReference` | deferred boundary |

Smallest viable schema: `Timesheet` plus `TimesheetCalculationSnapshot`, with line/adjustment/dispute entities deferred unless owner decisions require them.

## 32. Country Pack Boundary

Country Packs may define:

- overtime rules
- break rules
- minimum call-in
- rounding
- holiday rules
- premium categories
- worker classification
- record retention
- approval requirements
- dispute timelines
- employer disclosure
- worker disclosure
- pay-period boundaries
- timezone handling

Timesheet core must not hardcode Quebec rules or any single-country model.

## 33. Global HR Compatibility

Timesheet must support future:

- temporary staffing
- permanent hourly employees
- contractors
- enterprise internal staff
- staffing partners
- multi-country operations
- multiple currencies in later financial engines
- multiple timezones
- multilingual explanations
- salaried exceptions
- project-based work
- unit-based work

Preserve the current Option C RoleDefinition strategy. Do not introduce GlobalOccupation in this phase.

## 34. Data Retention and Privacy

Retention boundaries:

- Attendance evidence retention remains owned by Attendance policy.
- Timesheet retention covers Timesheet records, calculation snapshots, reviews, disputes, corrections, and audit references.
- Audit retention remains governed separately.
- Legal hold may block deletion.
- Access/export rights must follow tenant, worker, and country policy.

Do not invent retention periods without owner or Country Pack approval.

## 35. Exception Flows

| Flow | Authoritative Actor | Records Preserved | State Result | Recalculation | Approval Impact | Downstream Impact | Audit |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Attendance unavailable | platform | Assignment | no Timesheet | no | blocked | no handoff | yes |
| Attendance incomplete | platform | Attendance | `review_required` | after correction | blocked | no handoff | yes |
| Attendance corrected | platform | old/new Attendance versions | `calculation_pending` or correction | new snapshot | approval reset if material | no handoff until current | yes |
| Assignment cancelled | platform | Assignment/Attendance | `cancelled` or review | policy dependent | blocked | no handoff | yes |
| worker replaced | platform | separate Assignment/Attendance | separate Timesheet | separate | no merge | separate handoff | yes |
| worker disputes | worker/platform | dispute reason | `correction_required` | optional | blocked | no handoff | yes |
| employer disputes | employer/platform | dispute evidence | `correction_required` | optional | blocked | no handoff | yes |
| platform override | reviewer | original values | `platform_review` | new snapshot | reviewer required | no handoff until approved | yes |
| missing break evidence | platform | snapshot flag | review if required | no fabrication | maybe blocked | no handoff if material | yes |
| overnight shift | platform | timezone snapshot | review/calculated | with timezone rules | maybe blocked | no handoff if missing policy | yes |
| daylight-saving transition | platform | timezone snapshot | review/calculated | with timezone rules | maybe blocked | no handoff if missing policy | yes |
| duplicate Timesheet | platform | original Timesheet | conflict | no | blocked | no duplicate handoff | yes |
| stale calculation | platform | old snapshot | `calculation_pending` | new snapshot | blocked | no handoff | yes |
| post-lock correction | reviewer | locked version | formal correction | adjustment/reversal | new approval | downstream impact recorded | yes |
| Payroll handoff failure | future payroll | locked Timesheet | unchanged | no | none | retry boundary | yes |
| Finance handoff failure | future finance | locked Timesheet | unchanged | no | none | retry boundary | yes |
| Country Pack unavailable | platform | inputs | `review_required` | no | blocked | no handoff | yes |

## 36. Test Strategy

Future tests:

Lifecycle:

- valid states
- invalid transitions
- approval
- lock
- correction
- rejection

Calculation:

- normal shift
- early/late arrival
- missing checkout
- overnight shift
- timezone
- daylight-saving transition
- break unavailable
- no rounding
- configurable rounding
- payable versus billable separation

Security:

- worker own Timesheet only
- other worker denied
- cross-tenant denied
- employer own organization only
- Dispatcher approval denied unless granted
- reviewer allowed
- platform admin allowed
- confidential commercial fields hidden

Concurrency:

- duplicate creation
- stale recalculation
- Attendance correction race
- approval/dispute race
- lock/correction race

Boundaries:

- no Payroll creation
- no invoice creation
- no payment
- no finance posting
- no Attendance mutation

## 37. Implementation Order

Recommended implementation order:

1. Timesheet schema and migration
2. Timesheet permissions and reviewer role
3. Timesheet creation boundary
4. Attendance import and validation
5. Calculation snapshot
6. Basic worked-time calculation
7. Exception detection
8. Worker review boundary
9. Employer review boundary
10. Platform approval
11. Locking and correction boundary
12. Payroll handoff interface
13. Finance handoff interface
14. Audit
15. APIs
16. Tests
17. Final report

Dependencies:

- schema depends on owner decisions for entity strategy and state lifecycle
- calculation depends on Attendance version references and Country Pack boundary
- review depends on worker/employer visibility decisions
- approval depends on reviewer role and silence-as-approval decision
- handoffs depend on approved locked Timesheet model

## 38. Owner Decisions Required

| Decision | Options | Recommendation | Impact | Risk | Required Before Schema |
| --- | --- | --- | --- | --- | --- |
| Entity strategy | Timesheet only; Timesheet + snapshot; add lines/adjustments | Timesheet + CalculationSnapshot | defines schema size | under-modeling disputes | yes |
| Timesheet unit | per Assignment; daily; segment; pay period; parent with lines | parent per Assignment with optional lines | affects multi-day/overnight | hard migration later | yes |
| Calculation snapshot | required; optional | required | audit/reproducibility | non-reproducible calculations | yes |
| Approval model | A-E | worker + employer review + platform approval | trust and fairness | hidden consent | yes |
| Worker confirmation | required; optional; exceptions only | required where worker review opened | fairness | delay | yes |
| Employer confirmation | required; optional; exceptions only | required where employer review opened | billing confidence | delay | yes |
| Silence as approval | allowed; not allowed | not allowed Phase 01 | consent model | unfair approval | yes |
| Payable/billable visibility | separate; combined | separate | privacy/commercial clarity | data leakage | yes |
| Break unavailable behavior | ignore; flag; require review | flag/review when material | compliance | fabricated breaks | yes |
| Rounding policy | none; configurable; country pack | configurable boundary, no hardcoded jurisdiction | accuracy | legal mismatch | yes |
| Correction model | recalculation; adjustment; reversal | recalculation before lock, adjustment/reversal after lock | audit | silent overwrite | yes |
| Post-lock adjustments | allowed; prohibited; reversal only | formal correction only | downstream integrity | financial drift | yes |
| Overnight attribution | start date; end date; split; country pack | timezone + Country Pack | pay/bill accuracy | misattribution | yes |
| Multi-day structure | one record; lines; separate | parent with optional lines | scalability | schema churn | yes |
| Reviewer role | platform admin only; new reviewer; dispatcher | new Timesheet Reviewer | least privilege | overbroad dispatcher | yes |
| Dispatcher authority | approve; read; none | no approval by default | separation | operational conflict | yes |
| Payroll handoff | immediate; explicit boundary | explicit boundary from locked Timesheet | clean separation | payroll leakage | deferrable but recommended |
| Finance handoff | immediate; explicit boundary | explicit boundary from locked Timesheet | clean separation | invoice leakage | deferrable but recommended |
| Country Pack responsibility | core; pack; hybrid | pack for legal rules, core for engine | global readiness | jurisdiction lock-in | yes |
| Audit retention | fixed; country pack; owner policy | owner/Country Pack policy | compliance | over/under retention | deferrable |
| Dispute rules | free-form; governed timeline; country pack | governed timeline boundary | fairness | open-ended disputes | yes |

## Validation

Architecture validation:

- Attendance baseline remains frozen.
- Attendance remains source evidence.
- Timesheet never rewrites Attendance.
- Payable and billable time remain separate.
- Timesheet does not perform Payroll.
- Timesheet does not create invoices.
- All calculation rules are versioned.
- Locked records are not silently overwritten.
- AI remains advisory.
- Country Pack boundaries remain open.
- Global HR compatibility remains possible.

No code, schema, migration, permission, seed, API, frontend, test, or environment file change is authorized by this document.

## Verdict

TIMESHEET ENGINE ARCHITECTURE READY FOR OWNER APPROVAL
