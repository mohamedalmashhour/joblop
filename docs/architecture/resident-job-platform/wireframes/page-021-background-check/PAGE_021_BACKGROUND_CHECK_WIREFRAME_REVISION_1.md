# Page 021 - Background Check Wireframe Revision 1

Status: Approved-condition revision complete
Epic: Epic 3 - Worker Portal
Primary user: Authenticated worker
Architecture baseline: Resident Job Architecture Phase 1 v1.0
Epic planning baseline: Epic 3 Worker Portal Planning v1.0
Source wireframe: PAGE_021_BACKGROUND_CHECK_LOW_FIDELITY_WIREFRAME.md
Relationship reference: ../WORKER_COMPLIANCE_RELATIONSHIP_MAP.md
Implementation: Not authorized

## 1. Revision Scope

This controlled revision strengthens consent governance, privacy, third-party screening boundaries,
worker rights, employer visibility, fair-decision boundaries, expiry handling, and AI prohibitions.

This revision does not redesign the page and does not modify:

- Architecture Freeze.
- Epic 3 Planning.
- UX Foundation.
- Navigation.
- Pages 016-020.

## 2. Core Boundary

Background screening must never be presented as identity verification, worker approval, employment
approval, or universal assignment eligibility.

```text
Identity verification
!=
Background screening

Resident Job
!=
Background screening provider

Consent granted
!=
Screening completed

Screening completed
!=
Requirement satisfied

Requirement satisfied
!=
Worker approval

Worker approval
!=
Assignment eligibility
```

Resident Job coordinates the governed workflow. The approved provider performs screening where an
approved provider process exists. Resident Job must not appear to issue reports, investigate
workers, determine criminal findings, or certify provider information accuracy.

## 3. Four Independent States

The page must show four independent states. They must not collapse into one badge or a pass/fail
label.

```text
A. Requirement
   Not required
   Required
   Employer-required
   Assignment-required
   Jurisdiction-required

B. Consent
   Not requested
   Requested
   Granted
   Declined
   Withdrawn where applicable

C. Screening Process
   Not started
   Waiting for worker
   In progress
   Waiting for provider
   Completed
   Unable to complete
   Cancelled

D. Platform Review
   Not reviewed
   Requirement satisfied
   Further review required
   Correction required
   Verification unavailable
```

## 4. Worker Rights and Expectation Messaging

The page must visibly explain worker rights in configurable, non-jurisdiction-specific language:

- Informed consent.
- Right to ask questions.
- Right to dispute information.
- Right to request correction where applicable.
- Right to understand why screening is requested.
- Right to know who performs the screening.
- Right to understand employer visibility.
- Right to contact support.

The page must not promise legal rights, deadlines, appeal outcomes, or correction results that vary
by jurisdiction, provider, contract, or approved policy.

## 5. Desktop Wireframe Revision

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Resident Job                            Background Check     Help Profile  │
│ Worker: [Name]                       Status: Action needed / Up to date   │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ BACKGROUND SCREENING BOUNDARY                                              │
│ Resident Job coordinates the workflow.                                     │
│ The approved screening provider performs the screening.                    │
│ Screening does not equal identity verification, worker approval, or         │
│ assignment eligibility.                                                    │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ WHY THIS IS REQUESTED                                                      │
├──────────────────────────────────────┬─────────────────────────────────────┤
│ Requirement: Assignment-required      │ Source: Approved employer policy    │
│ Applies to: [Specific assignment]     │ Jurisdiction: [Configurable]        │
│ Requirement reason: [Plain language] │ Provider: [Approved provider]       │
│ Required for one employer != required by all employers.                    │
│ Required for one assignment != permanent universal requirement.             │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ YOUR RIGHTS AND CHOICES                                                    │
│ You can ask questions before consenting.                                   │
│ You can decline; declining may affect this specific role or assignment.     │
│ You can dispute information or request correction where applicable.         │
│ You can ask who performs the screening and who may see status information.  │
│ You can contact support. Rights and available options may depend on         │
│ jurisdiction, provider, contract, and approved policy.                      │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ CONSENT GOVERNANCE                                                         │
│ Purpose: [Why this screening is requested]                                 │
│ Performed by: [Approved third-party provider / approved source]             │
│ Categories that may be checked: [Configurable summary]                     │
│ Information that may be shared: [Safe summary]                             │
│ Who may receive status: Worker / authorized platform staff / permitted     │
│ employer status only where relevant                                        │
│ Retention boundary: configurable; no exact legal period invented            │
│ [ ] I understand and consent to this specific screening request             │
│ [Continue with provider] [Decline] [Ask support]                           │
│ Consent is never preselected, hidden, bundled, implied, or altered by AI.   │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ STATUS DIMENSIONS                                                          │
├────────────────────┬────────────────────┬────────────────────┬────────────┤
│ REQUIREMENT        │ CONSENT            │ SCREENING PROCESS  │ REVIEW     │
│ Not required       │ Not requested      │ Not started        │ Not review │
│ Required           │ Requested          │ Waiting worker     │ Satisfied  │
│ Employer-required  │ Granted            │ In progress        │ Further rev│
│ Assignment-required│ Declined           │ Waiting provider   │ Correction │
│ Jurisdiction-req.  │ Withdrawn where app│ Completed          │ Verif unav │
│                    │                    │ Unable to complete │            │
│                    │                    │ Cancelled          │            │
│ Do not use Passed, Failed, Criminal, Unsafe, or Blacklisted.               │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ THIRD-PARTY SCREENING PROVIDER BOUNDARY                                    │
│ Provider: [Approved provider name placeholder]                             │
│ Provider status: [Safe non-sensitive status only]                          │
│ Start/continue link: [Provider handoff]                                    │
│ Return status: [Received / pending / unavailable]                          │
│ Support path: [Provider support] [Resident Job support]                    │
│ Resident Job does not issue reports, investigate workers, determine         │
│ criminal findings, or certify provider information accuracy.               │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ PRIVACY AND EMPLOYER VISIBILITY                                            │
├────────────────────────────┬────────────────────────────┬──────────────────┤
│ WORKER ONLY                │ EMPLOYER VISIBLE ONLY      │ AUTHORIZED STAFF │
│ Consent history            │ WHEN RELEVANT/PERMITTED    │ Requirement state│
│ Provider process details   │ Requirement satisfied      │ Screening process│
│ Full report where legally  │ Additional action required │ Authorized review│
│ available                  │ Validity where applicable  │ Dispute workflow │
│ Disputes                   │ Assignment impact          │ Audit trail      │
│ Correction requests        │                            │ Provider ref.    │
│ Provider communications    │                            │                  │
│ Internal/private notes     │                            │                  │
│ Employers do not automatically see criminal-record details, provider       │
│ reports, disputes, correction requests, internal notes, consent history,    │
│ or provider communications.                                                │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ FURTHER REVIEW / WORKER ACTION                                             │
│ State: Further review required                                             │
│ Affected requirement: [Specific requirement]                               │
│ Explanation: [Plain-language neutral explanation]                          │
│ Next action: [Correct information] [Contact provider] [Contact support]    │
│ Dispute/correction: [Open path]                                            │
│ Last update: [Placeholder]                                                 │
│ Deadline: [Only where legitimately configured]                             │
│ Resident Job may not be able to modify provider-controlled records.         │
│ A dispute or correction request does not guarantee a changed outcome.       │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ EXPIRY AND RENEWAL                                                         │
│ Completion date: [Where available]                                         │
│ Valid until: [Where applicable]                                            │
│ Renewal required: [Configurable]                                           │
│ Expiring soon: [Configurable notice]                                       │
│ Expired: [Clear state]                                                     │
│ Different employers, roles, assignments, and jurisdictions may require      │
│ different screening periods. No screening is presented as permanently       │
│ valid by default.                                                          │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ IDENTITY, DOCUMENTS, AND ASSIGNMENT BOUNDARIES                             │
│ Identity verification != background screening                              │
│ Background screening != worker approval                                    │
│ Worker approval != assignment eligibility                                  │
│ Background-check process -> supporting-document reference -> Documents      │
│ workflow                                                                   │
│ Document uploaded != provider accepted it                                  │
│ Requirement satisfied != universal assignment eligibility                   │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ AI BOUNDARY                                                                │
│ AI may explain process steps, identify missing fields, remind workers of   │
│ required actions, summarize non-sensitive status, route workers to support,│
│ and explain process versus review states.                                  │
│ AI must never infer criminality, estimate risk, rank workers using          │
│ screening information, summarize sensitive findings for employers, make     │
│ hiring recommendations from protected information, automate adverse         │
│ decisions, alter consent, or submit screening without confirmation.         │
└────────────────────────────────────────────────────────────────────────────┘
```

## 6. Mobile Wireframe Revision

Mobile focuses on the worker's immediate comprehension and choice.

```text
┌──────────────────────────────┐
│ Background Check      Help   │
│ Status: Action needed        │
└──────────────────────────────┘

┌──────────────────────────────┐
│ WHY THIS IS REQUESTED        │
│ Requirement: Assignment req. │
│ Source: approved employer    │
│ Not universal                │
└──────────────────────────────┘

┌──────────────────────────────┐
│ YOUR RIGHTS                  │
│ Ask questions                │
│ Decline                      │
│ Dispute / request correction │
│ Understand visibility        │
│ Contact support              │
└──────────────────────────────┘

┌──────────────────────────────┐
│ CONSENT                      │
│ Provider: [Name]             │
│ Purpose: [Summary]           │
│ Shared status: limited       │
│ [ ] I consent                │
│ [Continue] [Decline]         │
└──────────────────────────────┘

┌──────────────────────────────┐
│ STATUS                       │
│ Requirement: required        │
│ Consent: requested           │
│ Process: waiting worker      │
│ Review: not reviewed         │
│ No pass/fail labels          │
└──────────────────────────────┘

┌──────────────────────────────┐
│ PRIVACY                      │
│ Employer sees permitted      │
│ status only when relevant.   │
│ Full reports are not shared  │
│ by default.                  │
└──────────────────────────────┘
```

## 7. Neutral Language Standard

Avoid:

- Passed.
- Failed.
- Criminal.
- Unsafe.
- Blacklisted.

Use:

- Requirement satisfied.
- Further review required.
- Worker action required.
- Verification unavailable.
- Provider process incomplete.

## 8. Accessibility

- Consent controls are semantic and never preselected.
- Status dimensions use text labels and do not rely on color.
- Timeline and status changes are screen-reader friendly.
- Error and correction messages are associated with the affected action.
- Focus moves to consent, provider handoff, support, or dispute path after relevant state changes.
- Touch targets are large enough for mobile use.
- Sensitive notices use plain language.

## 9. International Readiness

Do not hardcode:

- Consent wording.
- Provider names.
- Background-check terminology.
- Required check types.
- Employer access rules.
- Screening validity periods.
- Dispute deadlines.
- Retention periods.
- Legal outcomes.

All wording, visibility, expiry, provider, dispute, and consent details remain configurable by
jurisdiction, employer, provider, contract, and approved policy.

## 10. Self Validation

| Check | Result |
| --- | --- |
| Architecture unchanged | Pass |
| Epic unchanged | Pass |
| Pages 016-020 unchanged | Pass |
| Requirement, consent, process, and review states independent | Pass |
| Worker rights are clearly explained | Pass |
| Provider authority is separate from platform authority | Pass |
| Employer visibility is restricted | Pass |
| Identity and background screening are separate | Pass |
| Expiry is handled without permanent-validity claims | Pass |
| AI cannot evaluate or approve workers | Pass |
| Neutral operational language is used | Pass |
| No governance or privacy risk remains | Pass |
| No implementation started | Pass |
| No Page 022 files created | Pass |
| Unrelated app changes untouched | Pass |

## 11. Governance Confirmation

This document is a low-fidelity wireframe revision only.

No React, frontend, backend, APIs, database models, provider integration, background-check
implementation, deployment, production data, commit, push, or merge is introduced.
