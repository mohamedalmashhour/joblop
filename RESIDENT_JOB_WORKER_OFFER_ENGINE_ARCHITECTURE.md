# Resident Job Worker Offer Engine Architecture

Status: READY FOR OWNER REVIEW

This document governs a future Worker Offer implementation. It is architecture only. No schema, migration, permissions, API, service, frontend, notification, calendar, Assignment, AI execution, or reporting code is authorized by this document.

## Primary Operating Principle

Worker Offer is the governed proposal sent to a specific worker after authorized Dispatch preparation.

Canonical flow:

```text
Job Request
→ DispatchReview
→ Shortlist Ready
→ Offer Preparation
→ Worker Offer Created
→ Worker Offer Sent
→ Worker Views Offer
→ Worker Accepts or Declines
→ Assignment boundary
```

Worker Offer stops before Assignment creation.

Clarifications:

- Dispatch does not equal Worker Offer.
- Candidate does not equal Worker Offer Recipient.
- Shortlist does not equal Offer Sent.
- Offer Sent does not equal Offer Delivered.
- Offer Delivered does not equal Offer Viewed.
- Offer Viewed does not equal Offer Accepted.
- Offer Accepted does not equal Assignment.
- Assignment does not equal Attendance.

## 1. Worker Offer Purpose

Worker Offer is:

- a specific governed offer
- sent to one worker
- tied to one originating JobRequest
- tied to one DispatchReview
- tied to one DispatchCandidate or candidate reference
- containing worker-visible work and compensation terms
- requiring explicit worker response
- expiring according to policy
- preserving immutable offer history
- auditable
- privacy-controlled
- idempotent
- concurrency-safe

Worker Offer must never be treated as an Assignment before acceptance and authoritative Assignment creation.

## 2. Canonical Worker Offer Flow

| Transition | Actor | Source | Target | Required Conditions | Permission | System | Audit | Notification | Failure/Retry/Idempotency | Human Approval |
|---|---|---|---|---|---|---|---|---|---|---|
| Select Candidate | Dispatcher | Dispatch offer_preparation | Candidate selected for offer draft | DispatchReview active; candidate shortlisted; remaining need exists | `worker_offer.create` | Worker Offer | selection logged | none | repeated selection returns draft or safe duplicate error | yes |
| Re-evaluate Candidate | System with human trigger | selected candidate | verified candidate summary | source available; freshness acceptable | `worker_offer.create` | CandidateSource | recheck logged | none | source failure blocks draft | yes trigger |
| Recheck Availability | System with human trigger | candidate summary | availability confirmed | availability source available | `worker_offer.create` | CandidateSource | recheck logged | none | unavailable blocks offer | yes trigger |
| Recheck Conflict | System with human trigger | candidate summary | conflict checked | schedule scope known | `worker_offer.create` | CandidateSource | recheck logged | none | conflict blocks or flags for human review | yes trigger |
| Recheck Role Match | System with human trigger | candidate summary | role match confirmed | WorkGroup and RoleDefinition still valid | `worker_offer.create` | Catalogue + CandidateSource | recheck logged | none | mismatch blocks or requires new candidate | yes trigger |
| Recheck Qualification Summary | System with human trigger | candidate summary | qualification summary confirmed | summary evidence exists | `worker_offer.create` | CandidateSource | recheck logged | none | missing required summary blocks | yes trigger |
| Build Worker-visible Offer | Dispatcher | verified summary | draft | approved terms available | `worker_offer.create` | Worker Offer | created | none | idempotency key prevents duplicate draft | yes |
| Admin Review | Dispatcher/Admin | draft | draft reviewed | terms complete; privacy checks pass | `worker_offer.approve` | Worker Offer | reviewed/approved | none | stale terms rejected | yes |
| Approve Offer | Dispatcher/Admin | draft | approved | authorization; no blockers | `worker_offer.approve` | Worker Offer | approved | none | version checked | yes |
| Send Offer | Dispatcher/Admin | approved | sent | not expired; worker identity resolved; channel available | `worker_offer.send` | Worker Offer | sent | delivery attempt starts | idempotent send key | yes |
| Delivery Status | Notification subsystem | sent | delivered or delivery_pending | delivery evidence received | delivery boundary | Notification | delivery attempted/delivered | channel-specific | retry without changing offer terms | no state authority beyond delivery fields |
| Worker Opens Offer | Worker | delivered/sent | viewed | addressed authenticated worker | `worker_offer.respond` read boundary | Worker Offer | viewed | none | duplicate view idempotent | worker action |
| Worker Accepts | Worker | sent/delivered/viewed | accepted | not expired, not withdrawn/cancelled, current terms version | `worker_offer.respond` | Worker Offer | accepted | confirmation may be sent | duplicate accept idempotent or safe conflict | explicit worker |
| Worker Declines | Worker | sent/delivered/viewed | declined | addressed authenticated worker | `worker_offer.respond` | Worker Offer | declined | optional confirmation | duplicate decline idempotent | explicit worker |
| Expiry Handling | System | sent/delivered/viewed | expired | server time past deadline | system policy | Worker Offer | expired | optional notice | authoritative scheduler; UI timer not authority | no |
| Assignment Boundary | Future Assignment engine | accepted | assignment handoff pending | recheck remaining need and schedule conflict | future assignment permission | Assignment | handoff attempted later | later | transaction required later | human/system policy TBD |

## 3. Worker Offer Entity

Minimum future `WorkerOffer` fields:

Identity:

- Worker Offer ID
- Job Request ID
- Dispatch Review ID
- Dispatch Candidate ID or candidate source reference
- Employer Organization ID
- Residence ID
- Department ID
- Work Group ID
- Role Definition ID
- worker/candidate reference

Offer terms:

- worker-facing title
- worker-facing description
- responsibilities
- start date/time
- end date/time
- timezone
- arrival instructions
- break terms
- worker offer rate boundary
- premium boundary
- transport allowance boundary
- travel allowance boundary
- cancellation terms
- special instructions
- safety/equipment summary boundary

Control:

- state
- response deadline
- sent at
- delivered at
- viewed at
- accepted at
- declined at
- expired at
- cancelled at
- withdrawn at
- created by
- updated by
- version

Evidence:

- terms version
- policy version
- acceptance evidence boundary
- decline reason boundary
- delivery evidence boundary
- audit correlation ID

Do not include:

- employer commercial price
- platform margin
- employer payment method
- other workers' data
- internal candidate ranking
- protected worker data
- Assignment state
- attendance
- payroll
- invoice information

## 4. Worker Offer States

Recommended narrow lifecycle:

- `draft`
- `approved`
- `sent`
- `delivered`
- `viewed`
- `accepted`
- `declined`
- `expired`
- `withdrawn`
- `cancelled`

| State | Meaning | Owner | Allowed Actions | Prohibited Actions | Next States | Worker Visibility | Employer Visibility | Admin Visibility | Response | Audit Event | Notification | Terminal | Assignment Eligibility |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| draft | Offer terms are being prepared | Dispatcher/Admin | edit, approve, withdraw | send, respond, assign | approved, withdrawn, cancelled | none | high-level preparing only | full authorized view | blocked | created/updated | none | no | no |
| approved | Human-approved offer ready to send | Dispatcher/Admin | send, withdraw, cancel | worker response, assignment | sent, withdrawn, cancelled | none | high-level ready only | full authorized view | blocked | approved | none | no | no |
| sent | Authoritative offer sent | Worker Offer | delivery tracking, worker view/respond, withdraw/cancel/expire | assign | delivered, viewed, accepted, declined, expired, withdrawn, cancelled | visible if authenticated | awaiting response | full authorized view | allowed | sent | send attempt | no | no |
| delivered | Notification delivery evidence received | Notification boundary | view/respond, expire, withdraw/cancel | claim acceptance | viewed, accepted, declined, expired, withdrawn, cancelled | visible | awaiting response | full authorized view | allowed | delivered | delivered | no | no |
| viewed | Worker opened offer | Worker | accept, decline | infer acceptance | accepted, declined, expired, withdrawn, cancelled | visible | viewed/awaiting response | full authorized view | allowed | viewed | optional | no | no |
| accepted | Worker explicitly accepted current terms | Worker | assignment handoff later | edit, withdraw as pre-acceptance, attendance | future assignment boundary | visible | accepted, assignment finalization pending | full authorized view | blocked except idempotent repeat | accepted | optional confirmation | yes for offer | eligible for future Assignment transaction |
| declined | Worker explicitly declined | Worker | dispatch may continue | penalize automatically, assign | none | visible history | response received without private detail | full authorized view | blocked except idempotent repeat | declined | optional | yes | no |
| expired | Server deadline passed | System | reissue per policy | accept, silently extend | none or new offer | visible history | expired | full authorized view | blocked | expired | optional | yes | no |
| withdrawn | Admin/Dispatcher retracted before acceptance | Dispatcher/Admin | reissue per policy | accept, delete | none or new offer | visible if sent | withdrawn | full authorized view | blocked | withdrawn | optional | yes | no |
| cancelled | Governing source invalidated offer | System/Admin | future cancellation handling | accept, delete | none | visible if sent | cancelled | full authorized view | blocked | cancelled | optional | yes | no |

Do not include `assigned`, `scheduled`, `in_progress`, or `completed`; those belong to later engines.

## 5. Offer Creation Rules

Worker Offer may be created only when:

- JobRequest remains valid
- DispatchReview is in `offer_preparation`
- candidate remains shortlisted
- candidate source remains available
- candidate data freshness is acceptable
- role match remains valid
- availability has been rechecked
- conflicts have been rechecked
- required summary evidence exists
- admin/dispatcher is authorized
- required worker count and remaining need permit another offer
- no prohibited duplicate active offer exists

Safe failure behavior:

- block offer creation
- preserve DispatchReview
- preserve DispatchCandidate history
- record audit event
- return safe error
- do not contact worker
- do not create Assignment

## 6. Worker-Visible Terms

Worker may see only approved terms:

- employer or worksite identity as governed
- Residence/worksite
- Department
- Role Definition
- date/time/timezone
- expected duties
- responsibilities
- break terms
- worker offer rate
- worker premium
- worker travel/transport allowance
- approved equipment requirements
- approved safety requirements
- arrival/contact instructions
- offer deadline
- cancellation terms
- special instructions
- data freshness
- support channel

Worker must not see:

- employer charge
- employer contract rate
- platform margin
- employer card details
- internal admin notes
- internal AI ranking
- other candidates
- unrelated tenant information
- protected personal information

## 7. Commercial Privacy

Strict separation:

```text
Employer Commercial Terms
≠
Worker Offer Terms
```

Worker Offer may contain:

- worker rate
- worker premium
- worker allowances
- estimated payable boundary

Worker Offer must not contain:

- employer invoice amount
- tax charged to employer
- platform fee
- internal margin
- employer discount
- collection status

Admin may view both sides only where explicitly authorized.

## 8. Offer Approval

Recommended smallest Phase 01 model:

- Dispatcher or Platform Administrator may approve ordinary Worker Offers.
- Dual approval is reserved for future high-value, exceptional-rate, compliance-exception, or policy-exception terms.
- Automatic validation may flag completeness and risks.
- AI may validate completeness or flag risk.
- AI cannot approve the offer.

## 9. Send And Delivery

Future channels:

- in-app
- email
- SMS
- push notification

Phase 01 architecture separates:

```text
Authoritative WorkerOffer state
≠
Notification delivery state
```

Rules:

- Offer Sent does not equal Notification Delivered.
- Notification failure must not corrupt WorkerOffer state.
- send attempt records channel, timestamp, status, idempotency key, and error category.
- retry preserves the same WorkerOffer terms version unless reissued.
- channel fallback must be policy-governed.
- duplicate prevention requires idempotency keys.
- delivery status must never falsely claim delivery.
- no production notification provider is implemented in this architecture phase.

## 10. Worker Response

Worker response must be explicit.

Supported actions:

- Accept
- Decline
- Request Clarification boundary if approved

Rules:

- no automatic acceptance
- no acceptance by Admin on behalf of worker
- no acceptance inferred from viewing
- no acceptance inferred from clicking a notification
- no hidden consent
- decline may include an optional governed reason
- decline must not automatically penalize the worker
- repeated responses must be idempotent or safely rejected
- expired offers cannot be accepted
- withdrawn/cancelled offers cannot be accepted
- acceptance must use current authoritative terms version

## 11. Acceptance Evidence

Accepted Worker Offers require evidence:

- worker identity
- authenticated session
- Worker Offer ID
- terms version
- response timestamp
- response source
- IP/device boundary where lawful
- correlation ID
- consent statement version
- locale/language shown
- policy version
- audit event

Evidence must not be broadly exposed. Preserve it for future dispute review and Assignment creation.

## 12. Decline

Governed decline reason categories:

- unavailable
- schedule conflict
- travel distance
- rate
- role mismatch
- personal reason
- safety concern
- insufficient information
- other

Worker may decline without mandatory detailed explanation unless policy requires otherwise.

Decline must not automatically penalize the worker.

Dispatch may continue with another candidate. Prior Worker Offer remains immutable.

## 13. Expiry

Worker Offer should include:

- response deadline
- timezone
- expiration state
- expiry reason
- policy version
- audit event

Expiration is computed authoritatively by server time and policy. UI timers are informational only.

Late responses are safely rejected.

Do not silently extend expiry.

Recommended smallest Phase 01 behavior:

- fixed response deadline per offer
- no extension
- reissue creates a new Worker Offer or new terms version according to owner decision

## 14. Withdrawal And Cancellation

Withdrawn:

- Admin/Dispatcher retracts the offer before worker acceptance.
- requires reason.
- preserves history.

Cancelled:

- Job Request, Dispatch, employer, compliance, safety, or other governed source invalidates the offer.
- requires governed source.
- preserves history.

Do not delete Worker Offers.

Do not overwrite accepted Worker Offers with a new state if Assignment already exists later. Downstream cancellation rules must govern after Assignment.

## 15. Duplicate Offer Rules

Recommendations:

- one active Worker Offer per candidate per Dispatch is required.
- multiple candidates may receive offers simultaneously only if owner approves over-offer policy.
- default Phase 01 should not allow over-offering beyond remaining worker need.
- remaining worker count is protected by transactional checks.
- race conditions are handled through optimistic concurrency, unique constraints, and row locks where needed.
- replacement offers must reference replacement context later, without deleting prior offers.
- reissued offers preserve prior immutable history.

## 16. Multi-Worker Job Requests

When `requiredWorkerCount > 1`, architecture supports:

- multiple simultaneous Worker Offers up to remaining need by default
- partial acceptance
- remaining worker count
- offer batches
- alternates
- over-offer policy boundary
- accepted count
- assignment count boundary

Do not create Assignment entities in this architecture phase.

Recommended Phase 01:

- allow multiple active offers up to remaining need.
- over-offering requires explicit owner policy before schema implementation.

## 17. Multi-Day And Recurring Requests

Worker Offer implications:

- one worker covering all dates requires clear all-date terms.
- partial date coverage requires future schedule-instance or coverage-scope model.
- different workers by date requires future instance-level offer/assignment mapping.
- recurring schedule requires separate future recurrence policy.
- holiday dates and future rate changes require Country Pack/policy evaluation.
- timezone differences must be explicit in worker-visible terms.
- future replacement may happen by schedule instance.

Recommended future boundary:

- keep Phase 01 offer tied to the approved JobRequest schedule as a whole.
- defer schedule-instance persistence until Assignment or advanced scheduling architecture.

## 18. Worker Calendar Boundary

Before acceptance:

- Worker Offer may appear as a pending offer.
- It must not be treated as confirmed work.
- It must not block the calendar permanently unless a temporary hold policy is approved.
- It must show offer expiry.

After acceptance:

- future Assignment creation may create a confirmed calendar entry.
- Worker Offer alone must not create a confirmed Assignment entry.

Temporary hold options:

- No hold: simplest and safest.
- Soft hold: display pending offer without blocking other work.
- Hard hold: temporarily blocks conflicting offers.

Recommendation for Phase 01:

- soft hold only, if implemented later.
- no confirmed calendar entry until Assignment exists.

## 19. Assignment Boundary

Future handoff:

```text
Accepted Worker Offer
→ Recheck authoritative state
→ Recheck remaining worker need
→ Recheck schedule conflict
→ Create Assignment transactionally
→ Mark Worker Offer consumed/linked
→ Update Dispatch boundary
→ Update employer visibility
→ Future Worker Calendar confirmed entry
```

Accepted Worker Offer does not equal Assignment until the authoritative Assignment transaction succeeds.

## 20. Dispatch Effect

Dispatch effects:

- draft offer does not change Dispatch.
- sent offer may keep Dispatch in `offer_preparation`.
- declined/expired offer returns candidate need to Dispatch.
- accepted offer reduces remaining need boundary only after future handoff rules are approved.
- enough accepted future assignments may allow Dispatch closure later.
- one failed offer must not destroy the Dispatch.
- all prior offers remain auditable.

Do not add Assignment logic in Worker Offer.

## 21. Employer Visibility

Before acceptance, Employer may see only:

- worker offers being prepared
- offers sent
- awaiting worker responses
- partial response status
- no candidate identities unless policy explicitly allows it

After accepted Worker Offer but before Assignment creation:

- Employer must not see worker as assigned.
- Employer may see `worker accepted - assignment finalization pending`.

Employer must not see:

- declined workers' identities
- candidate rankings
- internal reasons
- worker compensation details beyond governed client-facing status
- AI confidence
- other workers' private information

## 22. Admin Visibility

Admin/Dispatcher may see:

- Worker Offer terms
- candidate summary
- delivery status
- response state
- expiry
- terms version
- audit history
- exception state
- remaining worker need
- future Assignment readiness

Do not expose confidential data beyond authorized operational need.

## 23. Worker Offer Permissions

Proposed future permissions:

| Permission | Actor | Role | Context | API Use | Lifecycle | Risk | Test Requirement |
|---|---|---|---|---|---|---|---|
| `worker_offer.create` | Dispatcher/Admin | DISPATCHER, PLATFORM_ADMINISTRATOR | platform | create draft offer | active | could create unauthorized worker proposal | requires Dispatch offer_preparation and shortlisted candidate |
| `worker_offer.read` | Dispatcher/Admin/Worker addressed | DISPATCHER, PLATFORM_ADMINISTRATOR, WORKER_ACCESS | platform or worker | read offer | active | could expose worker terms | worker may read only own addressed offer |
| `worker_offer.approve` | Dispatcher/Admin | DISPATCHER, PLATFORM_ADMINISTRATOR | platform | approve draft terms | active | could approve bad terms | validates completeness and policy |
| `worker_offer.send` | Dispatcher/Admin | DISPATCHER, PLATFORM_ADMINISTRATOR | platform | send approved offer | active | could contact worker incorrectly | requires approved offer and idempotency |
| `worker_offer.withdraw` | Dispatcher/Admin | DISPATCHER, PLATFORM_ADMINISTRATOR | platform | withdraw pre-acceptance | active | could retract unfairly | requires reason and audit |
| `worker_offer.cancel` | Dispatcher/Admin/System | DISPATCHER, PLATFORM_ADMINISTRATOR | platform | cancel invalidated offer | active | could confuse downstream state | requires governed source |
| `worker_offer.audit_read` | Dispatcher/Admin | DISPATCHER, PLATFORM_ADMINISTRATOR | platform | read audit summary | active | exposes history | safe audit summary only |
| `worker_offer.respond` | Worker | WORKER_ACCESS | worker | accept/decline | active | could allow wrong worker to respond | addressed worker only |
| `worker_offer.supervise` | Future supervisor | future Dispatch Supervisor | platform | exceptional oversight | reserved | high privilege | no active assignment in Phase 01 |

Do not modify permission catalogue yet.

## 24. Access Roles

Recommended Phase 01 mappings:

- `DISPATCHER`: create, read, approve, send, withdraw, cancel, audit read.
- `PLATFORM_ADMINISTRATOR`: same active worker-offer permissions through platform authority.
- `WORKER_ACCESS`: respond only to offers addressed to that worker; read own offer only.
- future `DISPATCH_SUPERVISOR`: reserved; not required for Phase 01.

Organization roles must not gain Worker Offer management authority automatically.

## 25. Worker Identity Dependency

Worker Offer cannot be fully implemented without a reliable worker/candidate identity boundary.

Options:

- A. CandidateSource reference only.
- B. Minimal WorkerIdentity entity.
- C. Full WorkerProfile.
- D. External candidate identity integration.

Recommendation:

- B. Minimal WorkerIdentity entity for Phase 01.

Reason:

- CandidateSource reference only is too weak for authenticated worker response.
- Full WorkerProfile is too broad.
- External integration is not reliable as the core identity source.
- Minimal WorkerIdentity provides a stable addressed-worker boundary now and remains compatible with future WorkerProfile and Global HR expansion.

Do not create WorkerProfile now.

## 26. Privacy And Data Retention

Define:

- store minimum worker data needed to address and evidence the offer.
- preserve offer terms version for dispute and audit.
- preserve acceptance evidence under restricted access.
- treat decline reason as sensitive.
- store delivery metadata only as needed for delivery proof and troubleshooting.
- retain audit under approved audit policy.
- preserve candidate privacy and avoid exposing other candidates.
- country-specific retention belongs to Country Pack/policy.
- right-to-access/export must distinguish worker-visible offer terms from internal audit.
- legal hold may suspend deletion where approved.

Do not invent retention periods without approved policy.

## 27. Concurrency

Controls:

- optimistic concurrency for offer edits and state changes.
- unique active offer constraints for candidate/Dispatch where approved.
- idempotency keys for create, send, and response.
- row locking or serializable transaction for last-slot acceptance race.
- authoritative server timestamps.
- stale terms version rejection.
- safe duplicate response handling.
- cancellation/acceptance and expiry/acceptance resolved by authoritative transaction.

Race cases:

- two Admins creating offers for same candidate: unique constraint/idempotency.
- withdrawal while worker accepts: transaction decides first valid write.
- expiry while worker accepts: authoritative server timestamp decides.
- Job Request cancellation while response arrives: source-state recheck blocks if invalid.
- Dispatch cancellation while offer is open: cancellation cascades through governed offer cancellation.
- multiple workers accepting last remaining slot: future Assignment transaction guards final slot.
- duplicate send: idempotency preserves one authoritative send.
- duplicate response: idempotent or safe conflict.
- reissued offer: new version or new offer according to owner policy.

## 28. Audit

Future audit events:

- Worker Offer created
- terms updated before send
- approved
- sent
- delivery attempted
- delivered
- viewed
- accepted
- declined
- expired
- withdrawn
- cancelled
- response rejected
- duplicate response
- stale terms response
- sensitive access denied
- Assignment handoff attempted later

Audit must include:

- actor
- actor role/context
- Job Request
- Dispatch
- Worker Offer
- worker/candidate reference
- prior state
- new state
- reason
- timestamp
- terms version
- policy version
- correlation ID
- source/channel

## 29. API Capability Map

No endpoint URLs are invented here.

| Capability | Actor | Permission | Input | Output | Validation | Idempotency | Concurrency | Audit | Notification Boundary | Safe Error |
|---|---|---|---|---|---|---|---|---|---|---|
| Create Worker Offer | Dispatcher/Admin | `worker_offer.create` | Dispatch, candidate, terms | draft offer | dispatch/candidate/terms | create key | unique active checks | created | none | generic denied/conflict |
| Read Worker Offer | Dispatcher/Admin/Worker | `worker_offer.read` | offer reference | scoped offer | authorization | none | current state read | sensitive read optional | none | not found/denied safe |
| List Worker Offers | Dispatcher/Admin/Worker | `worker_offer.read` | filters | scoped list | tenant/worker scope | none | read snapshot | optional | none | safe empty/denied |
| Update Draft Terms | Dispatcher/Admin | `worker_offer.create` | terms + version | updated draft | draft only | update key optional | optimistic version | terms updated | none | stale version |
| Approve Worker Offer | Dispatcher/Admin | `worker_offer.approve` | offer + version | approved | complete and policy-valid | approval key | optimistic version | approved | none | invalid terms |
| Send Worker Offer | Dispatcher/Admin | `worker_offer.send` | offer + version/channel | sent + delivery attempt | approved only | send key | optimistic version | sent | starts delivery | duplicate safe |
| Read Delivery Status | Dispatcher/Admin/Worker addressed | `worker_offer.read` | offer | delivery summary | scoped | none | read snapshot | optional | read-only | safe restricted |
| View Worker Offer | Worker | `worker_offer.read` | offer | viewed terms | addressed worker | view key | idempotent | viewed | none | denied/not found safe |
| Accept Worker Offer | Worker | `worker_offer.respond` | offer, terms version, consent | accepted | current terms, not expired | response key | transaction | accepted | optional confirmation | stale/expired safe |
| Decline Worker Offer | Worker | `worker_offer.respond` | offer, optional reason | declined | addressed worker | response key | transaction | declined | optional confirmation | safe |
| Withdraw Worker Offer | Dispatcher/Admin | `worker_offer.withdraw` | offer, reason | withdrawn | pre-acceptance | action key | transaction | withdrawn | optional | conflict if accepted |
| Cancel Worker Offer | Dispatcher/Admin/System | `worker_offer.cancel` | source/reason | cancelled | governed source | action key | transaction | cancelled | optional | safe |
| Expire Worker Offer | System | system policy | offer/deadline | expired | server time | scheduler key | transaction | expired | optional | safe |
| Read Audit Summary | Dispatcher/Admin | `worker_offer.audit_read` | offer | audit summary | authorization | none | read snapshot | audit read | none | safe restricted |

## 30. Entity Impact

| Entity | Required Phase 01 | Reusable Existing Entity | Deferred | Optional | Not Needed | Recommendation |
|---|---:|---:|---:|---:|---:|---|
| WorkerOffer | yes | no | no | no | no | required core entity |
| WorkerOfferTermsVersion | recommended | no | no | no | no | separate entity if terms can change before send/reissue |
| WorkerOfferDeliveryAttempt | yes | no | no | no | no | required to separate offer state from notification delivery |
| WorkerOfferResponse | recommended | no | no | no | no | separate evidence entity improves immutability |
| WorkerOfferAuditLink | no | AuditEvent | yes | yes | no | rely on AuditEvent initially |
| WorkerCalendarHold | no | no | yes | yes | no | defer; soft hold may be future |
| WorkerIdentityReference | yes | future minimal worker identity | no | no | no | minimal dependency needed |
| AssignmentHandoffReference | no | no | yes | yes | no | defer until Assignment foundation |

Smallest viable schema:

- `WorkerIdentity` or `WorkerIdentityReference`
- `WorkerOffer`
- `WorkerOfferTermsVersion`
- `WorkerOfferDeliveryAttempt`
- `WorkerOfferResponse`

Avoid entity proliferation beyond these until Assignment is approved.

## 31. Permission And Seed Impact

New future permissions:

- `worker_offer.create`
- `worker_offer.read`
- `worker_offer.approve`
- `worker_offer.send`
- `worker_offer.withdraw`
- `worker_offer.cancel`
- `worker_offer.audit_read`
- `worker_offer.respond`
- `worker_offer.supervise` reserved

Role mappings:

- DISPATCHER: active management permissions except reserved supervision.
- PLATFORM_ADMINISTRATOR: active management permissions.
- WORKER_ACCESS: `worker_offer.read` and `worker_offer.respond` only for own addressed offers.
- organization roles: no management authority by default.

Seed impact:

- add permission definitions.
- update access-role permission mappings.
- preserve backward compatibility with Dispatch baseline.

Do not modify actual permissions yet.

## 32. Global HR Compatibility

The Worker Offer architecture must support future:

- temporary staffing
- permanent employment offers
- contractor engagements
- internal employee mobility
- enterprise talent pools
- staffing-partner offers
- multi-country operations
- multilingual terms
- multi-currency compensation display

Universal concepts:

- offer identity
- addressed person
- terms version
- explicit response
- evidence
- audit
- delivery boundary

Resident Job-specific concepts:

- Residence
- Department
- WorkGroup
- RoleDefinition
- JobRequest staffing demand

Option C remains preserved: `RoleDefinition` remains unchanged for Phase 01 with future compatibility layer. Do not introduce `GlobalOccupation` now.

## 33. Country Pack Boundary

Future Country Packs may govern:

- offer validity
- required disclosures
- compensation presentation
- contract classification
- worker consent language
- cooling-off or cancellation rules
- licence requirements
- privacy
- retention
- overtime and holiday disclosures
- currency
- language

Do not hardcode Quebec rules into Worker Offer core.

## 34. Exception Flows

| Exception | Authoritative Actor | Preserved Records | State Result | Dispatch Impact | Assignment Impact | Notification | Audit |
|---|---|---|---|---|---|---|---|
| candidate source unavailable | CandidateSource boundary | Dispatch, candidate summary if any | creation blocked or source unavailable | remains in offer_preparation/candidate review | none | none | source unavailable |
| worker identity unresolved | Worker identity boundary | DispatchCandidate | offer blocked | dispatch continues | none | none | identity unresolved |
| offer delivery failure | Notification boundary | WorkerOffer, delivery attempt | sent or delivery_failed boundary | no candidate deletion | none | retry/fallback | delivery failed |
| worker never views offer | WorkerOffer/system | WorkerOffer | expires if deadline passes | dispatch may continue | none | optional reminder | expired/unviewed |
| worker declines | Worker | WorkerOfferResponse | declined | dispatch may select alternate | none | optional confirmation | declined |
| offer expires | System policy | WorkerOffer | expired | need returns to dispatch | none | optional notice | expired |
| Admin withdraws | Dispatcher/Admin | WorkerOffer | withdrawn | dispatch may continue | none | optional notice | withdrawn |
| Job Request cancelled | JobRequest | JobRequest, WorkerOffer | cancelled | dispatch invalidated | none | cancellation notice | cancelled |
| Dispatch paused/cancelled | Dispatch | Dispatch, WorkerOffer | paused blocks sends; cancelled cancels open offers | dispatch state authoritative | none | optional | dispatch/offer cancelled |
| candidate becomes ineligible | CandidateSource/compliance | WorkerOffer and evidence | block send or cancel open offer | dispatch may continue | none | optional | ineligible |
| schedule conflict appears | CandidateSource/calendar | WorkerOffer evidence | block/cancel/worker warning by policy | dispatch may continue | none | optional | conflict |
| worker accepts after slot filled | Assignment/WorkerOffer transaction | WorkerOffer response attempt | response rejected or waitlisted only if approved | no overfill | no assignment | safe notice | response rejected |
| worker accepts stale terms | WorkerOffer | stale response evidence | rejected | no change | none | safe notice | stale terms response |
| duplicate response | WorkerOffer | original and duplicate evidence | idempotent or rejected | no duplicate effect | none | none | duplicate response |
| partial multi-worker fill | WorkerOffer/Assignment later | offers | remaining need updated | dispatch continues | future assignments only | optional | partial fill |
| emergency replacement need | Dispatch/Replacement later | prior offer history | new dispatch/replacement flow | new DispatchReview later | future replacement assignment | optional | replacement initiated |

## 35. Test Strategy

Future required tests:

Lifecycle:

- every valid transition
- invalid transitions
- terminal states
- reissue behavior

Security:

- only addressed worker may respond
- another worker denied
- employer denied worker terms
- organization roles denied management
- Dispatcher and Platform Administrator boundaries
- tenant isolation
- safe errors

Concurrency:

- last-slot race
- expiry/accept race
- withdraw/accept race
- cancellation/accept race
- duplicate send
- duplicate response
- stale version

Privacy:

- commercial separation
- prohibited fields absent
- candidate privacy preserved
- acceptance evidence restricted

Integration:

- Dispatch boundary
- notification boundary
- future Assignment handoff
- multi-worker
- multi-day
- CandidateSource dependency

## 36. Implementation Order

Recommended order:

1. Worker Offer schema and migration
2. Worker Offer permissions
3. Minimal worker identity boundary
4. Worker Offer service
5. Draft and approval lifecycle
6. Send/delivery boundary
7. Worker read/respond boundary
8. Expiry/withdraw/cancel
9. Dispatch integration
10. Employer high-level status
11. Audit
12. Tests
13. Final report

Dependencies:

- schema must define identity, terms, state, delivery, and response boundaries before services.
- permissions must exist before API/service authorization.
- minimal worker identity is required before a worker can respond.
- delivery boundary must be separate before send behavior is exposed.
- Assignment integration must wait until Assignment architecture is approved.

## 37. Owner Decisions Required

| Decision | Options | Recommendation | Impact | Risk | Required Before Schema |
|---|---|---|---|---|---|
| Worker Offer entity strategy | single WorkerOffer, WorkerOffer + terms version, event-sourced | WorkerOffer + terms version | preserves immutable terms | too much complexity if event-sourced | yes |
| Terms version entity | embedded, separate | separate | supports stale response checks | extra table | yes |
| Minimal worker identity model | candidate ref only, minimal identity, full profile | minimal WorkerIdentity | supports authenticated response | schema dependency | yes |
| Simultaneous active offers | none, up to remaining need, over-offer | up to remaining need | fills multi-worker requests | race conditions need handling | yes |
| Over-offering policy | disallow, allow by ratio, allow manually | disallow Phase 01 | avoids overfill | slower fulfillment | yes |
| Response deadline policy | fixed, configurable, per urgency | fixed Phase 01 | simple expiry | less flexible | yes |
| Worker-calendar hold | none, soft hold, hard hold | soft hold later, none for core | avoids false assignment | worker may double-book until Assignment | deferrable |
| Approval authority | dispatcher, admin, dual approval | dispatcher/admin ordinary; dual reserved | small model | exceptional terms need policy later | yes |
| Delivery channels | in-app, email, SMS, push | in-app/email boundary first | practical | provider dependency | deferrable before send |
| Decline reason policy | optional, required category, free text | optional category | worker-friendly | less analytics | yes |
| Clarification requests | no, support case, message thread | defer | avoids scope creep | worker may need support route | deferrable |
| Acceptance evidence | minimal, full evidence package | full evidence boundary | dispute readiness | privacy controls required | yes |
| Employer status visibility | coarse, candidate identity, detailed | coarse before Assignment | protects privacy | employer may want more detail | yes |
| Compensation-field visibility | worker-only rate, employer status only | worker sees worker terms only | commercial privacy | admin needs authorized dual view | yes |
| Reissue policy | new offer, new terms version, edit same | new offer or new terms version | preserves history | more records | yes |
| Multi-worker handling | sequential, batch up to need, over-offer | batch up to remaining need | efficient | concurrency needed | yes |
| Multi-day handling | whole request, schedule instance | whole request Phase 01 | simple | less flexible | yes |
| Replacement behavior | new offer, new DispatchReview | new DispatchReview later | preserves prior history | later complexity | deferrable |
| Audit retention | inherit audit, country-specific | inherit pending policy | consistency | retention unclear | deferrable |
| Country Pack responsibilities | none, disclosure only, full policy | disclosure/policy boundary | global readiness | needs future ACR | deferrable |

## Validation

Confirmed:

- Dispatch baseline remains frozen.
- Job Request remains source of truth.
- Worker Offer belongs to Dispatch.
- Worker response is explicit.
- No Assignment exists before accepted offer and authoritative handoff.
- Employer commercial terms remain hidden from worker.
- Worker sees only governed offer terms.
- Notification failure does not corrupt offer state.
- Expiry is authoritative.
- AI remains advisory.
- Global HR compatibility remains open.

## Verdict

WORKER OFFER ENGINE ARCHITECTURE READY FOR OWNER APPROVAL
