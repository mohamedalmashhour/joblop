# Page 021 - Background Check Product Design Review

Status: Complete - owner review required
Epic: Epic 3 - Worker Portal
Page: 021 - Background Check
Reviewed artifact: PAGE_021_BACKGROUND_CHECK_LOW_FIDELITY_WIREFRAME.md
Relationship reference: WORKER_COMPLIANCE_RELATIONSHIP_MAP.md
Implementation: Not authorized

## 1. Executive Summary

Page 021 defines the authenticated worker background-check experience with strong consent,
privacy, third-party provider, and assignment-eligibility boundaries.

The page is suitable for owner review. It does not run background checks, expose detailed reports,
determine guilt or innocence, make employment decisions, guarantee worker approval, guarantee
assignment eligibility, or reduce status to a simplistic pass/fail label.

Recommendation: APPROVE FOR OWNER REVIEW.

No approval record has been created because the owner review gate remains active.

## 2. Strengths

- Consent is explicit, informed, and separate from account acceptance.
- Requirement source is configurable and visible.
- Requirement, consent, process, and review states are independent.
- The third-party provider boundary is clear.
- Result privacy and employer visibility are tightly limited.
- Further-review and adverse states use neutral language.
- Dispute and correction pathways are visible.
- Expiry and renewal are handled without invented universal rules.
- Identity verification, background check, documents, worker approval, and assignment eligibility
  remain separate.
- AI is limited to help, routing, reminders, and non-sensitive explanations.

## 3. Weaknesses

- Final consent wording requires legal/compliance review before publication.
- Provider-specific handoff and status language requires future provider selection.
- Retention wording requires future jurisdiction, provider, contract, and policy configuration.
- Employer-visible status rules require future permission implementation.

These are not Page 021 wireframe defects.

## 4. Risks

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Consent appears bundled or implied | High | Consent panel is explicit, separate, and not preselected. |
| Platform appears to run checks directly | High | Third-party provider boundary is visible. |
| Employers see sensitive report details | High | Employer visibility is status-limited and permission-bound. |
| Background check becomes pass/fail | High | Four independent status dimensions avoid pass/fail simplification. |
| Further-review language becomes accusatory | High | Neutral states and plain-language explanations are required. |
| Dispute process is unclear | High | Dedicated correction/dispute panel is included. |
| Identity and background check merge | High | Core boundary keeps identity verification separate. |
| Expiry is ignored | Medium | Completion, valid-until, renewal, expiring, and expired states are included. |
| AI appears to assess criminality | High | AI prohibitions are explicit. |
| Requirement satisfaction guarantees assignments | High | Assignment-eligibility boundary remains explicit. |

## 5. Scorecard

| Category | Score | Notes |
| --- | ---: | --- |
| Informed consent | 9.8 | Consent is explicit, separate, and not preselected. |
| Requirement transparency | 9.7 | Requirement source and limited scope are visible. |
| Provider boundary | 9.8 | Resident Job and provider roles are separated. |
| Independent status dimensions | 9.9 | Requirement, consent, process, and review states remain distinct. |
| Privacy and data minimization | 9.8 | Full reports and sensitive details are not exposed by default. |
| Employer visibility | 9.8 | Employer status access is relevant-only and permission-bound. |
| Further-review language | 9.7 | Avoids accusatory wording. |
| Dispute/correction experience | 9.7 | Safe dispute, correction, provider, and support paths are present. |
| Expiry and renewal | 9.6 | Covers validity without invented universal periods. |
| Identity separation | 9.9 | Identity verification is explicitly separate. |
| Documents separation | 9.8 | Documents workflow remains the evidence boundary. |
| AI transparency | 10.0 | AI cannot assess criminality, decide eligibility, or approve workers. |
| Accessibility | 9.7 | Consent, timeline, status, and errors are accessible. |
| Mobile usability | 9.7 | Mobile focuses on why, consent, status, next action, and privacy. |
| International readiness | 9.8 | Provider, check type, consent, retention, and disclosure are configurable. |
| Assignment-eligibility boundaries | 9.9 | Requirement satisfaction does not guarantee assignment eligibility. |
| Consistency with Pages 017-020 | 9.8 | Preserves profile, professional, licence, certification, and documents boundaries. |
| Overall | 9.8 | Ready for owner review. |

## 6. Review Criteria

### Informed Consent

Pass.

Consent is explicit, informed, separate from general account acceptance, not preselected, and not
hidden in unrelated terms.

### Requirement Transparency

Pass.

The page explains why the check is requested and clarifies that requirements can be role-specific,
employer-specific, assignment-specific, jurisdiction-specific, residence-policy-based, or
platform-policy-based.

### Third-Party Provider Boundary

Pass.

The wireframe shows provider name, provider status, handoff, return status, and support path while
avoiding provider integration details.

### Independent Status Dimensions

Pass.

Requirement state, consent state, process state, and review/disposition state are separated and not
collapsed into pass/fail.

### Result Privacy

Pass.

The worker-facing page does not expose unnecessary detailed background-check content. Employer
visibility is limited to specific status facts only when legally and operationally appropriate.

### Further Review and Dispute Experience

Pass.

The page avoids accusatory terms and provides a plain-language explanation, affected requirement,
next action, correction/dispute path, provider contact, platform support, last update, and
configured deadlines where legitimate.

### Expiry and Renewal

Pass.

Completion date, valid-until, renewal requirement, upcoming-expiry, expired state, source, and last
review date are represented without universal validity assumptions.

### Identity and Documents Separation

Pass.

Identity verification does not equal background check. Background-check supporting evidence remains
linked through the Documents workflow.

### AI Boundaries

Pass.

AI can explain, remind, route, detect incomplete consent, and summarize non-sensitive status. AI
cannot analyze criminal-record content, infer risk, approve/reject workers, decide legal
eligibility, assign risk scores, alter consent, or submit screening without confirmation.

### Consistency With WORKER_COMPLIANCE_RELATIONSHIP_MAP.md

Pass.

The map was updated to include the background-check consent, provider authority, privacy, dispute,
and audit boundaries without introducing implementation logic.

## 7. Required Improvements

No required wireframe improvements are identified at this review stage.

Owner review is still required before Page 021 may become Approved Wireframe v1.0.

## 8. Non-Blocking Design Debt

Potential future enhancements:

- Provider-specific status templates after provider selection.
- Jurisdiction-specific consent wording after legal review.
- Worker-facing dispute evidence timeline after Documents workflow approval.
- Employer-facing status preview after permission model approval.
- Renewal notification templates after notification architecture approval.

These are not blockers for Page 021.

## 9. Confirmation

- Architecture Freeze remains intact.
- Epic 3 Planning remains unchanged.
- Pages 016-020 remain unchanged.
- No implementation started.
- No Page 022 files created.
- No React created.
- No frontend created.
- No backend created.
- No APIs created.
- No database changes created.
- No background-check provider integration created.
- Unrelated app changes remain untouched.
- No deployment performed.
- No production data introduced.

## 10. Owner Decision Required

Valid next owner decisions:

- APPROVE PAGE 021 AS APPROVED WIREFRAME v1.0.
- APPROVE WITH DOCUMENTED CONDITIONS.
- REMEDIATION REQUIRED.

Page 022 remains blocked until Page 021 reaches Approved Wireframe v1.0.
