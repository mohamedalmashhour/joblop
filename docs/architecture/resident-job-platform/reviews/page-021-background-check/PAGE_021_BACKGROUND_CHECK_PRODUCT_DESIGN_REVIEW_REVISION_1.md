# Page 021 - Background Check Product Design Review Revision 1

Status: Complete - approval rule satisfied
Epic: Epic 3 - Worker Portal
Page: 021 - Background Check
Reviewed artifact: PAGE_021_BACKGROUND_CHECK_WIREFRAME_REVISION_1.md
Relationship reference: WORKER_COMPLIANCE_RELATIONSHIP_MAP.md
Implementation: Not authorized

## 1. Executive Summary

Page 021 Revision 1 resolves the documented owner conditions by strengthening consent governance,
privacy, third-party screening boundaries, worker rights, employer visibility, fair-decision
boundaries, expiry handling, neutral language, and AI prohibitions.

The revised wireframe makes clear that Resident Job coordinates the workflow, the provider performs
screening, and background screening does not equal identity verification, worker approval, or
assignment eligibility.

Recommendation: APPROVE PAGE 021 AS APPROVED WIREFRAME v1.0.

## 2. Conditions Resolved

| Condition | Result |
| --- | --- |
| Separate four independent states | Resolved |
| Strengthen worker-right messaging | Resolved |
| Clarify third-party authority | Resolved |
| Strengthen employer visibility boundaries | Resolved |
| Use neutral sensitive language | Resolved |
| Reinforce identity boundary | Resolved |
| Clarify expiry and non-permanent validity | Resolved |
| Strengthen AI prohibitions | Resolved |
| Strengthen compliance relationship map | Resolved |

## 3. Strengths

- Requirement, consent, screening process, and platform review remain independent.
- Consent is explicit, informed, unbundled, and not preselected.
- Worker rights are visible without hardcoding jurisdiction-specific legal promises.
- Resident Job is separated from the screening provider.
- Employer visibility is limited to permitted operational status.
- Sensitive report details, disputes, correction materials, consent history, provider
  communications, and internal notes are not employer-visible by default.
- Neutral language avoids pass/fail and stigmatizing labels.
- Identity verification, background screening, worker approval, and assignment eligibility remain
  separate governed decisions.
- Expiry and renewal do not imply permanent validity.
- AI cannot infer criminality, estimate risk, rank workers, summarize sensitive findings for
  employers, recommend hiring from protected information, or automate adverse decisions.

## 4. Risks

| Risk | Severity | Resolution |
| --- | --- | --- |
| Status collapses into pass/fail | High | Revision 1 requires four independent states and neutral language. |
| Consent appears implied or bundled | High | Consent is explicit, separate, and not preselected. |
| Platform appears to perform screening | High | Revision 1 states provider performs screening and platform coordinates workflow. |
| Employers receive too much information | High | Employer visibility excludes reports, disputes, corrections, internal notes, consent history, and provider communications by default. |
| Worker rights are unclear | High | Worker-rights panel lists questions, dispute, correction, visibility, and support paths. |
| Identity and screening merge | High | Revision 1 repeats identity/screening/approval/eligibility separation. |
| Screening appears permanently valid | Medium | Expiry section clarifies employer, role, assignment, and jurisdiction variability. |
| AI appears to assess criminality | High | AI prohibitions are explicit and strong. |

## 5. Scorecard

| Category | Score | Notes |
| --- | ---: | --- |
| Consent transparency | 10.0 | Consent is explicit, unbundled, configurable, and never preselected. |
| Worker rights | 9.9 | Rights are clear without unsupported legal guarantees. |
| Provider separation | 10.0 | Provider authority and platform coordination are distinct. |
| Independent state model | 10.0 | Requirement, consent, process, and review remain separate. |
| Employer visibility | 10.0 | Sensitive detail is excluded by default. |
| Privacy | 9.9 | Minimal disclosure and data-boundary language are strong. |
| Neutral language | 10.0 | Pass/fail and stigmatizing terms are prohibited. |
| Identity boundary | 10.0 | Identity, screening, approval, and eligibility remain separate. |
| Expiry handling | 9.8 | No permanent validity or universal period is implied. |
| AI boundaries | 10.0 | AI cannot evaluate, approve, rank, infer risk, or automate adverse decisions. |
| Accessibility | 9.8 | Consent, status, focus, and mobile labels are accessible. |
| International readiness | 9.8 | Legal wording, provider, validity, disputes, and retention remain configurable. |
| Assignment-boundary clarity | 10.0 | No screening status guarantees assignments. |
| Consistency with Pages 017-020 | 9.9 | Preserves worker profile, professional, licence, certification, and document boundaries. |
| Overall | 9.9 | Approved-condition revision is complete. |

## 6. Product Review Findings

### Consent Transparency

Pass.

Consent is separate from general account acceptance, visible, informed, configurable, and not
preselected. AI cannot alter consent or submit screening without confirmation.

### Worker Rights

Pass.

The wireframe includes the right to ask questions, dispute information, request correction where
applicable, understand why screening is requested, know who performs screening, understand employer
visibility, and contact support.

### Provider Separation

Pass.

Resident Job coordinates workflow. The provider performs screening. Resident Job does not issue
reports, investigate workers, determine criminal findings, or certify provider information
accuracy.

### Employer Visibility

Pass.

Employers generally see only permitted status such as requirement satisfied, additional action
required, validity where applicable, and assignment impact. They do not automatically see criminal
details, reports, disputes, correction requests, internal notes, consent history, or provider
communications.

### Neutral Language

Pass.

The revised wireframe avoids Passed, Failed, Criminal, Unsafe, and Blacklisted. It uses operational
states such as Requirement satisfied, Further review required, Worker action required, Verification
unavailable, and Provider process incomplete.

### Identity Boundary

Pass.

Identity verification, background screening, worker approval, and assignment eligibility are
independent governed decisions with no automatic transitions.

### Expiry Handling

Pass.

The revision clarifies that completed screening may expire and that different employers, roles,
assignments, and jurisdictions may require different screening periods.

### AI Boundaries

Pass.

AI cannot infer criminality, estimate risk, rank workers using screening information, summarize
sensitive findings for employers, make hiring recommendations from protected information, automate
adverse decisions, alter consent, or submit screening without confirmation.

### Compliance Relationship Map

Pass.

The map already contains the background-check separations required by the owner decision and remains
consistent with Revision 1.

## 7. Remaining Risks

No wireframe-blocking risks remain.

Future implementation and launch governance will still require:

- Qualified legal/compliance review of consent wording.
- Provider selection and provider-specific status mapping.
- Permission implementation for employer visibility.
- Retention and deletion configuration.
- Dispute/correction operating procedures.
- Audit logging implementation.
- Security and privacy review before launch.

These are not Page 021 wireframe defects.

## 8. Approval Rule Check

| Approval Rule | Result |
| --- | --- |
| Requirement, consent, process, and review remain independent | Pass |
| Worker rights are clearly explained | Pass |
| Provider authority is separate from platform authority | Pass |
| Employer visibility is appropriately restricted | Pass |
| Identity and background screening remain separate | Pass |
| Expiry is handled correctly | Pass |
| AI cannot evaluate or approve workers | Pass |
| Neutral operational language is used throughout | Pass |
| No governance or privacy risk remains | Pass |

## 9. Confirmation

- Architecture unchanged.
- Epic unchanged.
- Pages 016-020 unchanged.
- No implementation started.
- No Page 022 files created.
- Unrelated app changes untouched.
- No React created.
- No frontend created.
- No backend created.
- No APIs created.
- No database created.
- No provider integration created.
- No deployment performed.
- No production data introduced.

## 10. Recommendation

Create PAGE_021_APPROVAL_RECORD_V1_0.md and mark:

```text
Page 021 - Background Check
APPROVED WIREFRAME v1.0
```

Then unblock Page 022 as the next controlled gate, but do not create Page 022.
