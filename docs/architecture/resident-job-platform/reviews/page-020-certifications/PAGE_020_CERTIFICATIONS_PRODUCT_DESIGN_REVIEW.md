# Page 020 - Certifications Product Design Review

Status: Complete - owner review required
Epic: Epic 3 - Worker Portal
Page: 020 - Certifications
Reviewed artifact: PAGE_020_CERTIFICATIONS_LOW_FIDELITY_WIREFRAME.md
Relationship reference: WORKER_COMPLIANCE_RELATIONSHIP_MAP.md
Implementation: Not authorized

## 1. Executive Summary

Page 020 defines the authenticated worker certification-management experience with clear
separation between certification records, licences, supporting documents, review state, validity,
requirement state, worker approval, and assignment eligibility.

The wireframe is suitable for owner review. It does not issue certifications, automatically verify
certifications, approve regulated practice, approve workers, guarantee assignments, replace issuing
organizations, expose admin-only controls, or treat every training record as legally equivalent.

Recommendation: APPROVE FOR OWNER REVIEW.

No approval record has been created because the owner review gate remains active.

## 2. Strengths

- Certification and licence concepts remain separate.
- Source classification is explicit.
- Requirement state is independent from review and validity.
- Required, recommended, optional, employer-specific, jurisdiction-specific, and not-currently
  required states are distinguishable.
- Evidence remains in the Documents workflow.
- Employer visibility is limited to relevant assignment needs.
- Privacy, identifier masking, and evidence exposure boundaries are clear.
- AI boundaries prevent invented certifications, automatic verification, and eligibility decisions.
- The page aligns with the Worker Compliance Relationship Map.

## 3. Weaknesses

- Exact requirement sources require future policy/configuration/contract/regulator/employer inputs.
- Certification verification process details require future compliance workflow design.
- Employer-visible certification detail requires future permission implementation.

These are not Page 020 wireframe defects.

## 4. Risks

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Certifications and licences treated as the same thing | High | Core boundary and compliance map separate them. |
| Upload appears to equal verification | High | Evidence uploaded/reviewed/verified distinctions are explicit. |
| Verification appears automatic | High | Review states use "verified where applicable" and require approved workflow. |
| Expired certifications appear active | High | Validity states include expired and unknown validity. |
| Training records appear legally equivalent | High | Source classification separates regulator, employer, platform, provider, and self-reported. |
| Required and optional records are unclear | High | Requirement state is independent and explained. |
| Employer visibility is unrestricted | High | Employer visibility is relevant-only and assignment-specific. |
| Identifiers or evidence are overexposed | High | Masking and Documents workflow boundary are specified. |
| AI appears to verify, approve, or create qualifications | High | AI boundary prohibits those actions. |
| Assignment eligibility appears guaranteed | High | Certification verified, worker approved, and assignment eligible remain separate. |

## 5. Scorecard

| Category | Score | Notes |
| --- | ---: | --- |
| Certification-category clarity | 9.7 | Categories are clear and configurable. |
| Source classification | 9.8 | Source types are independent and non-equivalent. |
| Certification/licence separation | 9.9 | Certifications and licences are not merged. |
| Review/validity/requirement separation | 9.9 | Four independent dimensions are visible. |
| Expiry handling | 9.7 | Exact expiry, no-expiry, unknown validity, renewal, and replacement evidence are covered. |
| Required vs optional clarity | 9.8 | Requirement source and why-required explanation are included. |
| Employer visibility | 9.7 | Employer visibility is relevant-only. |
| Privacy and security | 9.7 | Masking, evidence references, audit, and limited visibility are specified. |
| Correction experience | 9.6 | Correction and rejected-state expectations are included. |
| AI transparency | 9.9 | AI cannot invent, verify, approve, rank, or guarantee eligibility. |
| Mobile usability | 9.6 | Mobile prioritizes cards, category/source, status, and actions. |
| Accessibility | 9.6 | Forms, filters, date fields, labels, focus, and announcements are covered. |
| International readiness | 9.7 | Requirements, sources, names, identifiers, and rules are configurable. |
| Assignment-eligibility boundaries | 9.9 | Eligibility is future governed evaluation, not a badge. |
| Consistency with Pages 017-019 | 9.8 | Preserves approved profile, professional, licence, and document boundaries. |
| Overall | 9.8 | Ready for owner review. |

## 6. Review Criteria

### Certification-Category Clarity

Pass.

The page supports clinical/care, food/kitchen, workplace/safety, operations, employer/platform
training, and continuing education while keeping names configurable and jurisdiction-neutral.

### Source Classification

Pass.

Every record identifies source type independently. Employer-issued, platform-issued,
regulator-issued, provider-issued, institution-issued, association-issued, self-reported, unknown,
and verification-unavailable records are not treated as equivalent.

### Separation of Certification and Licence

Pass.

Certification record and licence remain distinct concepts, consistent with the compliance
relationship map.

### Review, Validity, and Requirement States

Pass.

The page shows four independent dimensions:

- Worker record state.
- Platform review state.
- Validity state.
- Requirement state.

### Expiry Handling

Pass.

The page covers exact expiry date, expiring soon, expired, renewal reminders, renewed/replacement
record, updated evidence links, no-expiry, and unknown-validity warnings without inventing universal
rules.

### Required Versus Optional Clarity

Pass.

The page distinguishes legally/jurisdictionally required, role-required, assignment-required,
employer-required, platform-required, recommended, optional, and not-currently-required records.

### Employer Visibility

Pass.

Employers do not receive unrestricted access to full identifiers, evidence, private notes, internal
reviewer notes, or unrelated certifications.

### Privacy and Security

Pass.

The page includes masked identifiers, role-based access, secure evidence references, audit trail,
review history, correction history, limited employer visibility, and no public display by default.

### AI Transparency

Pass.

AI cannot invent certifications, verify authenticity, approve/reject records, determine legal
requirements independently, infer professional authority, guarantee assignment eligibility, edit
without confirmation, or rank using unsupported assumptions.

### Consistency With WORKER_COMPLIANCE_RELATIONSHIP_MAP.md

Pass.

The wireframe follows the map by preserving separate concepts and avoiding prohibited shortcuts.

## 7. Required Improvements

No required wireframe improvements are identified at this review stage.

Owner review is still required before Page 020 may become Approved Wireframe v1.0.

## 8. Non-Blocking Design Debt

Potential future enhancements:

- Employer-facing certification visibility preview.
- Jurisdiction-specific certification templates after legal/compliance review.
- Training recommendation marketplace after strategy approval.
- Evidence-to-certification audit timeline after Documents workflow approval.
- Requirement-source explanations tied to approved configuration.

These are not blockers for Page 020.

## 9. Confirmation

- Architecture Freeze remains intact.
- Epic 3 Planning remains unchanged.
- Pages 016-019 remain unchanged.
- No implementation started.
- No Page 021 files created.
- No React created.
- No frontend created.
- No backend created.
- No APIs created.
- No database changes created.
- Unrelated app changes remain untouched.
- No certification-verification implementation created.
- No deployment performed.
- No production data introduced.

## 10. Owner Decision Required

Valid next owner decisions:

- APPROVE PAGE 020 AS APPROVED WIREFRAME v1.0.
- APPROVE WITH DOCUMENTED CONDITIONS.
- REMEDIATION REQUIRED.

Page 021 remains blocked until Page 020 reaches Approved Wireframe v1.0.
