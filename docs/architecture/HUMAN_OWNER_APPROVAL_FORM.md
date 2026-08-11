# Resident Workforce OS Human Owner Approval Form

Status: **BLANK — NO APPROVALS RECORDED**

Checkpoint SHA: `a31fa96f52247bb684032c6a8d3d379c098c2603`

Complete one copy of this form for each person and each approved scope. A person's name in the role
table is not approval. Proposed defaults, verbal agreement, general approval and approval of a Git
SHA alone are not authorization to access an external system, spend money, deploy or launch.

The Database Owner and Independent Database Witness must be different people.

## Part 1 — Person and role

| Field                                                     | Required response         |
| --------------------------------------------------------- | ------------------------- |
| Full legal or professional name                           |                           |
| Organization/company                                      |                           |
| Job title or professional capacity                        |                           |
| Email or durable contact reference                        |                           |
| Assigned role                                             |                           |
| Relevant qualifications/experience                        |                           |
| Independent from the implementer/operator where required? | Yes / No / Not applicable |
| Conflict of interest disclosed?                           | Yes / No; explain if Yes  |

Permitted role names:

- Release Owner
- Infrastructure Owner
- Billing Owner
- Database Owner
- Independent Database Reviewer/Witness
- Security Owner
- Privacy/Legal Owner
- QA Owner
- Accessibility Reviewer
- Candidate-source Integration Owner
- Offer-delivery Integration Owner
- Monitoring/Operations Owner
- Secondary On-Call
- Contract Kit Owner
- Evidence Reviewer

## Part 2 — Material reviewed

The approver confirms which exact records were reviewed:

| Record                                         | Version, checksum or reference             | Reviewed?                 |
| ---------------------------------------------- | ------------------------------------------ | ------------------------- |
| Checkpoint commit                              | `a31fa96f52247bb684032c6a8d3d379c098c2603` | Yes / No                  |
| B5 External Validation Owner Decision Register |                                            | Yes / No                  |
| Cloud Run Service Authorization Plan           |                                            | Yes / No                  |
| QA-reset Database Decision Package             |                                            | Yes / No / Not applicable |
| OD-06 Durable Adapter State Decision Package   |                                            | Yes / No / Not applicable |
| GCP Staging Pre-Creation Package               |                                            | Yes / No / Not applicable |
| Launch Readiness matrix                        |                                            | Yes / No                  |
| Other reviewed evidence                        |                                            |                           |

## Part 3 — Technical decision approval

This section approves a design or technical rule only. It does not authorize implementation,
external access, spending, deployment or launch.

| Field                                    | Required response                      |
| ---------------------------------------- | -------------------------------------- |
| Decision IDs being approved              |                                        |
| Exact technical decision                 |                                        |
| Approved scope and affected services     |                                        |
| Explicit exclusions                      |                                        |
| Required tests and acceptance evidence   |                                        |
| Failure/stop conditions                  |                                        |
| Rollback requirements                    |                                        |
| Conditions that require renewed approval |                                        |
| Decision status                          | Approved / Rejected / Changes required |

Approval statement:

> I approve only the technical decision and scope written above for checkpoint
> `a31fa96f52247bb684032c6a8d3d379c098c2603`. I understand that this approval does not authorize
> external access, spending, deployment, production access or launch.

## Part 4 — Local implementation authorization

Complete this section only when local code or documentation changes are authorized.

| Field                                               | Required response           |
| --------------------------------------------------- | --------------------------- |
| Exact milestone/decision IDs                        |                             |
| Exact files, packages or services allowed to change |                             |
| Schema or migration changes allowed?                | No / Yes, exact scope:      |
| Dependency or lockfile changes allowed?             | No / Yes, exact scope:      |
| Local fake/test providers allowed                   |                             |
| Prohibited files and workstreams                    |                             |
| Required validation commands                        |                             |
| Required reviewer/witness                           |                             |
| Authorization status                                | Authorized / Not authorized |

Authorization statement:

> I authorize only the local implementation described above. No real credential, personal data,
> production-like record or external provider may be used. This authorization does not permit a
> commit, push, deployment, external access or spending unless a separate section explicitly
> authorizes that exact action.

## Part 5 — External-system access authorization

Leave this section blank unless one exact external action is authorized. Approval must identify
immutable targets. Secret values must never be written in this form.

| Field                                                | Required response                                    |
| ---------------------------------------------------- | ---------------------------------------------------- |
| Provider and account/project authority               |                                                      |
| Exact immutable project/resource IDs                 |                                                      |
| Exact environment                                    | Staging only / Other explicitly approved environment |
| Exact action permitted                               |                                                      |
| Named human operator                                 |                                                      |
| Access role and least-privilege permissions          |                                                      |
| Secret Manager reference names, without values       |                                                      |
| Tenant/test identity references, without credentials |                                                      |
| Start time and expiration (UTC)                      |                                                      |
| Evidence that must be captured                       |                                                      |
| Revocation/cleanup action                            |                                                      |
| External access status                               | Authorized / Not authorized                          |

Authorization statement:

> I authorize only the external action, target, operator, permissions and time window written
> above. Production access is prohibited unless production is named explicitly in a separate
> owner-approved order. This authorization does not permit spending, deployment or launch.

## Part 6 — Billing and spending authorization

The Billing Owner must complete this section separately for each chargeable resource-creation
action. Budget alerts do not cap or stop spending.

| Field                                  | Required response           |
| -------------------------------------- | --------------------------- |
| Exact resource/action                  |                             |
| Provider pricing-calculator reference  |                             |
| Estimated one-time cost                |                             |
| Estimated monthly cost                 |                             |
| Maximum authorized amount              |                             |
| Currency                               |                             |
| Billing account/project reference      |                             |
| Start date and required teardown date  |                             |
| Budget alert thresholds                |                             |
| Person responsible for cost monitoring |                             |
| Spending status                        | Authorized / Not authorized |

Authorization statement:

> I authorize charges only for the resource and maximum amount written above. The project planning
> ceiling of USD 200 per month is not automatic spending permission. Any configuration or cost
> increase requires new approval.

## Part 7 — Database witness record

Complete this section for schema review, migration rehearsal, mutation, concurrency, cleanup,
backup or restore evidence. The witness must be independent from the Database Owner and operator.

| Field                                    | Required response                            |
| ---------------------------------------- | -------------------------------------------- |
| Database Owner                           |                                              |
| Independent Database Witness             |                                              |
| Exact disposable/staging database ID     |                                              |
| Exact release SHA and migration checksum |                                              |
| Operation witnessed                      |                                              |
| Expected result                          |                                              |
| Actual result                            |                                              |
| Start/completion time (UTC)              |                                              |
| Evidence references                      |                                              |
| Unknown or partial outcome?              | No / Yes; explain and stop                   |
| Cleanup verified?                        | Yes / No                                     |
| Witness decision                         | Accepted / Rejected / Investigation required |

Witness statement:

> I independently witnessed the exact operation and evidence recorded above. I did not infer a
> successful result from missing, partial or unknown evidence. This witness record does not approve
> production execution or launch.

## Part 8 — Deployment authorization

Leave blank until every applicable launch gate is GREEN. Staging deployment and production
deployment require separate forms.

| Field                                       | Required response           |
| ------------------------------------------- | --------------------------- |
| Environment                                 |                             |
| Immutable image digests                     |                             |
| Release SHA                                 |                             |
| Exact services                              |                             |
| Deployment window (UTC)                     |                             |
| Named deployer                              |                             |
| Approved configuration references           |                             |
| Pre-deployment checks                       |                             |
| Smoke tests                                 |                             |
| Rollback trigger and exact rollback version |                             |
| Release Owner approval reference            |                             |
| Deployment status                           | Authorized / Not authorized |

## Part 9 — Signature and expiry

| Field                                     | Required response |
| ----------------------------------------- | ----------------- |
| Approver name                             |                   |
| Role                                      |                   |
| Approval/authorization sections completed |                   |
| Approval date and time (UTC)              |                   |
| Expiration date and time (UTC)            |                   |
| Immutable approval reference              |                   |
| Electronic or written signature reference |                   |

Final statement:

> I confirm that I am the person named above, that I understand the limits of my role and that my
> approval applies only to the exact checkpoint, scope, action and expiration recorded in this
> form. Anything not explicitly authorized remains prohibited.

## Current assignment worksheet

| Responsibility                   | Person                    | Complete approval reference                                          |
| -------------------------------- | ------------------------- | -------------------------------------------------------------------- |
| Release Owner                    | Mohamed Almashhour        | **MISSING**                                                          |
| Infrastructure Owner             | Mohamed Almashhour        | **MISSING**                                                          |
| Billing Owner                    | Mohamed Almashhour        | **MISSING**                                                          |
| Database Owner                   | **MISSING**               | **MISSING**                                                          |
| Independent Database Witness     | Nour Al Mashhour          | **CORRECTION REQUIRED**                                              |
| Security Owner                   | Mohamed Almashhour        | **MISSING**                                                          |
| Privacy/Legal Owner              | Mohamed Almashhour        | **MISSING**                                                          |
| QA Owner                         | Mohamed Almashhour        | **MISSING**                                                          |
| Accessibility Reviewer           | Mohamed Almashhour        | **MISSING**                                                          |
| Candidate Integration Owner      | Mohamed Almashhour        | **MISSING**                                                          |
| Offer-delivery Integration Owner | Mohamed Almashhour        | **MISSING**                                                          |
| Monitoring Owner                 | Mohamed Almashhour        | **MISSING**                                                          |
| Secondary On-Call                | Mohamed Majed Al Mashhour | `RWOS-ONCALL-MAJED-2026-001` — corrected personal signature required |
| Contract Kit Owner               | Mohamed Almashhour        | **MISSING**                                                          |

All blocked milestones remain blocked until the relevant rows contain real people and their
complete, scope-limited approval records.

Mohamed Almashhour's Release Owner approval `RWOS-RELEASE-MAM-2026-001` is accepted as limited
local authorization from 2026-07-29 13:39 UTC through 2026-08-28 13:39 UTC. It does not constitute
Database Owner, Security, Privacy, Infrastructure, Integration, external-access, spending,
deployment or launch approval.

Nour Al Mashhour's submitted record is rejected for correction. Mohamed Majed Al Mashhour is the
confirmed Secondary On-Call assignee, and the owner accepts his submitted signature and role
acceptance. His exact availability window, acknowledgement-time expectation, expiration and
escalation channel remain required before staging validation.
