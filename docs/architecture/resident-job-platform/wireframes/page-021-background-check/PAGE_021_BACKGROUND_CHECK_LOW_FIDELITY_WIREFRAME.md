# Page 021 - Background Check Low-Fidelity Wireframe

Status: Product Design Review ready
Epic: Epic 3 - Worker Portal
Primary user: Authenticated worker
Architecture baseline: Resident Job Architecture Phase 1 v1.0
Epic planning baseline: Epic 3 Worker Portal Planning v1.0
Relationship reference: ../WORKER_COMPLIANCE_RELATIONSHIP_MAP.md
Implementation: Not authorized

## 1. Purpose

The Background Check page lets an authenticated worker understand, consent to, track, and respond
to an approved background-check process when a check is required for a specific role, employer,
assignment, jurisdiction, residence policy, or approved platform policy.

The page allows workers to:

- Understand why a background check may be requested.
- View the current requirement context.
- Provide explicit informed consent.
- Begin or continue an approved third-party provider process.
- View safe status information.
- Respond to missing-information or correction requests.
- Understand expiry or renewal where applicable.
- Access support and dispute paths.

The page must not:

- Run a real background check.
- Expose criminal-record details.
- Determine guilt or innocence.
- Make automatic employment decisions.
- Guarantee worker approval.
- Guarantee assignment eligibility.
- Expose employer-only or reviewer-only information.
- Imply every role requires the same check.
- Claim verification when no provider confirmation exists.

## 2. Core Boundary

Background check, consent, provider process, review state, identity verification, worker approval,
and assignment eligibility are distinct.

```text
Identity verification
!=
Background check

Consent given
!=
Check completed

Check completed
!=
Clear result

Clear result
!=
Worker approved

Worker approved
!=
Eligible for every assignment
```

## 3. Information Hierarchy

Primary:

- Requirement explanation.
- Consent status and consent action.
- Current process status.
- Next required worker action.
- Privacy and visibility notice.

Secondary:

- Provider boundary.
- Review/disposition state.
- Dispute or correction path.
- Expiry/renewal context.
- Documents references.

Tertiary:

- AI guidance.
- Data minimization and retention notice.
- Support links.
- Audit/history summary.

## 4. Desktop Wireframe

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Resident Job                            Background Check     Help Profile  │
│ Worker: [Name]                       Status: Action needed / Up to date   │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ BACKGROUND-CHECK SAFETY NOTICE                                             │
│ A background check may be required for a specific role, employer,           │
│ assignment, jurisdiction, residence policy, or approved platform policy.    │
│ It does not automatically approve a worker or guarantee assignments.        │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ REQUIREMENT SUMMARY                                                        │
├──────────────────────────────────────┬─────────────────────────────────────┤
│ Requirement state: Assignment-required│ Source: Approved employer policy    │
│ Applies to: [Specific assignment]     │ Jurisdiction: [Configurable]        │
│ Requirement reason: [Plain language] │ Validity needed: [If applicable]    │
│ Required by one employer != required by all employers.                     │
│ Required for one assignment != permanent universal requirement.             │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ CONSENT PANEL                                                              │
│ Purpose: [Why the check is requested]                                      │
│ Performed by: [Approved provider / source]                                 │
│ Categories that may be checked: [Configurable summary]                     │
│ Information that may be shared: [Safe summary]                             │
│ Who may receive status: [Worker / authorized platform / permitted employer]│
│ Retention boundary: [Configurable notice; no exact period invented]         │
│ You may decline. Declining may affect this specific role or assignment.     │
│ You may ask questions before consenting. Withdrawal may be available where  │
│ legally and operationally permitted.                                       │
│ [ ] I understand and consent to this specific background-check request      │
│ [Continue with provider] [Decline] [Ask support]                           │
│ Consent is not preselected, hidden, bundled, or implied by account creation.│
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ PROCESS TIMELINE                                                           │
│ Requested -> Consent requested -> Consent accepted -> Provider process     │
│ -> Worker action / Provider review -> Authorized review -> Requirement     │
│ status                                                                     │
│                                                                            │
│ Current step: Waiting for worker action                                    │
│ Next action: Continue with approved provider                               │
│ Last update: [Placeholder]                                                 │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ INDEPENDENT STATUS DIMENSIONS                                              │
├────────────────────┬────────────────────┬────────────────────┬────────────┤
│ REQUIREMENT        │ CONSENT            │ PROCESS            │ REVIEW     │
│ Not required       │ Not requested      │ Not started        │ Not review │
│ Role-required      │ Requested          │ In progress        │ Under auth │
│ Employer-required  │ Accepted           │ Waiting worker     │ Satisfied  │
│ Assignment-required│ Declined           │ Waiting provider   │ Further rev│
│ Under review       │ Withdrawn where app│ Completed          │ Correction │
│ Source unavailable │ Consent expired    │ Unable to complete │ Verif. unav│
│ Do not collapse these into "Passed" or "Failed."                          │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ THIRD-PARTY PROVIDER BOUNDARY                                              │
│ Provider: [Approved provider name placeholder]                             │
│ Provider status: [Safe status only]                                        │
│ Start/continue link: [Provider handoff]                                    │
│ Return status: [Received / pending / unavailable]                          │
│ Support path: [Provider support] [Resident Job support]                    │
│ Resident Job shows safe status only and does not pretend to be the          │
│ screening authority unless a future approved model authorizes that role.    │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ PRIVACY AND RESULT VISIBILITY                                              │
├────────────────────────────┬────────────────────────────┬──────────────────┤
│ WORKER ONLY                │ EMPLOYER VISIBLE ONLY      │ AUTHORIZED STAFF │
│ Consent record             │ WHEN RELEVANT/PERMITTED    │ Requirement state│
│ Provider process details   │ Requirement satisfied /    │ Process state    │
│ Dispute details            │ not currently satisfied    │ Authorized review│
│ Correction materials       │ Valid-until where app.     │ Audit trail      │
│ Full report where legally  │ Further worker action      │ Dispute workflow │
│ available                  │ required where app.        │ Provider ref.    │
│ Private notes              │ Assignment-specific impact │ Evidence access  │
│ Detailed provider comms    │                            │ where authorized │
│ Employers do not receive full reports, allegations, detailed records,       │
│ identity documents, dispute materials, or internal comments by default.     │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ FURTHER REVIEW / CORRECTION / DISPUTE                                      │
│ State: Additional information requested                                    │
│ Affected requirement: [Specific role/employer/assignment requirement]       │
│ What happened: [Plain-language non-accusatory explanation]                 │
│ Next action: [Correct information] [Contact provider] [Contact support]    │
│ Evidence: link approved correction material through Documents workflow      │
│ Last update: [Placeholder]                                                 │
│ Deadline: [Only where legitimately configured]                             │
│ Resident Job may not be able to modify provider-controlled records.         │
│ A dispute does not guarantee a changed outcome.                            │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ EXPIRY AND RENEWAL                                                         │
│ Completion date: [Where available]                                         │
│ Valid until: [Where applicable]                                            │
│ Renewal required: [Configurable]                                           │
│ Upcoming expiry: [Configurable notice]                                     │
│ Expired: [Clear state]                                                     │
│ Requirement source: [Approved configurable source]                         │
│ Last review date: [Placeholder]                                            │
│ No universal validity period, grace period, or renewal window is invented.  │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ DOCUMENTS BOUNDARY                                                         │
│ Background-check process -> Supporting-document reference -> Documents      │
│ workflow                                                                   │
│ Document uploaded != provider accepted it                                  │
│ Provider accepted it != requirement satisfied                              │
│ Requirement satisfied != universal assignment eligibility                   │
│ Document storage and evidence review stay in the Documents workflow.       │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ DATA MINIMIZATION AND RETENTION                                            │
│ The page displays only necessary status information. It does not duplicate │
│ full reports unnecessarily, expose data publicly, or hardcode retention     │
│ periods. Retention and deletion limits remain configurable by jurisdiction, │
│ provider, contract, and approved policy.                                   │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ AI GUIDANCE - HELP ONLY                                                    │
│ AI may explain process steps, identify missing fields, remind workers of   │
│ required actions, summarize non-sensitive status, route workers to support,│
│ detect incomplete consent forms, and explain process vs review states.      │
│ AI must not analyze criminal-record content, predict criminality, infer     │
│ risk from protected characteristics, approve/reject workers, decide legal   │
│ eligibility, make adverse decisions, assign hidden scores, summarize        │
│ sensitive details for employers, alter consent, or submit screening without │
│ confirmation.                                                              │
└────────────────────────────────────────────────────────────────────────────┘
```

## 5. Mobile Wireframe

Mobile prioritizes requirement explanation, consent, current status, next action, provider handoff,
support/dispute access, validity, and privacy.

```text
┌──────────────────────────────┐
│ Background Check      Help   │
│ Status: Action needed        │
└──────────────────────────────┘

┌──────────────────────────────┐
│ WHY THIS IS REQUESTED        │
│ Assignment-required          │
│ Source: approved employer    │
│ Not a universal requirement  │
└──────────────────────────────┘

┌──────────────────────────────┐
│ CONSENT REQUIRED             │
│ Purpose                      │
│ Provider                     │
│ What may be checked          │
│ Who may receive status       │
│ [ ] I consent                │
│ [Continue] [Decline]         │
└──────────────────────────────┘

┌──────────────────────────────┐
│ CURRENT STATUS               │
│ Requirement: assignment req. │
│ Consent: requested           │
│ Process: not started         │
│ Review: not reviewed         │
│ Next: give consent or ask    │
│ support                      │
└──────────────────────────────┘

┌──────────────────────────────┐
│ PRIVACY                      │
│ Employers see only permitted │
│ status when relevant.        │
│ Full report is not shared by │
│ default.                     │
└──────────────────────────────┘

┌──────────────────────────────┐
│ HELP / DISPUTE               │
│ Contact provider             │
│ Contact Resident Job support │
│ Link correction evidence     │
└──────────────────────────────┘
```

## 6. Error and Status States

Required states:

- No check required.
- Requirement pending.
- Consent requested.
- Consent declined.
- Consent withdrawn where applicable.
- Consent expired where applicable.
- Process not started.
- Provider handoff unavailable.
- Provider process in progress.
- Worker action required.
- Provider delay.
- Unable to complete.
- Further review required.
- Correction requested.
- Dispute open.
- Requirement satisfied.
- Validity expiring.
- Expired.
- Verification unavailable.
- Offline or interrupted state.
- Support unavailable.

## 7. Accessibility

- Consent controls are semantic and never preselected.
- Keyboard navigation supports consent, provider handoff, support, and dispute actions.
- Status updates are announced accessibly.
- The timeline is screen-reader friendly.
- Error messages are associated with affected fields or actions.
- Focus moves to the next required action after state changes.
- Color is never the only way to communicate status.
- Privacy notices use readable plain language.
- Provider handoff controls have clear labels.
- Touch targets meet mobile accessibility expectations.

## 8. International and Jurisdictional Readiness

Do not hardcode:

- Background-check types.
- Criminal-record terminology.
- Required checks.
- Consent wording.
- Validity periods.
- Provider names.
- Dispute deadlines.
- Retention periods.
- Employer access rules.
- Jurisdictional outcomes.

Keep configurable:

- Country, province, state, or region.
- Role.
- Employer.
- Assignment.
- Provider.
- Check type.
- Validity.
- Consent language.
- Disclosure rules.

## 9. Self Validation

| Check | Result |
| --- | --- |
| Architecture Freeze remains intact | Pass |
| Epic 3 Planning remains unchanged | Pass |
| Pages 016-020 remain unchanged | Pass |
| Consent is explicit and separate | Pass |
| Provider boundary is clear | Pass |
| Requirement, consent, process, and review states are independent | Pass |
| Status is not reduced to pass/fail | Pass |
| Detailed reports are not exposed unnecessarily | Pass |
| Employer visibility is restricted | Pass |
| Adverse/further-review language is non-accusatory | Pass |
| Dispute and correction path is present | Pass |
| Identity verification remains separate | Pass |
| Documents workflow remains separate | Pass |
| AI cannot assess criminality or approve workers | Pass |
| Assignment eligibility is not guaranteed | Pass |
| No implementation started | Pass |
| No Page 022 files created | Pass |

## 10. Governance Confirmation

This document is a low-fidelity wireframe only.

No React, frontend, backend, APIs, database models, background-check provider integrations,
verification implementation, deployment, or production data are introduced.
