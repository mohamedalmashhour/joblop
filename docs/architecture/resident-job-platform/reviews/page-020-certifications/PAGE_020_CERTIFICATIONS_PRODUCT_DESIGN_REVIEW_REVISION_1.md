# Page 020 - Certifications Product Design Review Revision 1

Status: Complete - approval rule satisfied
Epic: Epic 3 - Worker Portal
Page: 020 - Certifications
Reviewed artifact: PAGE_020_CERTIFICATIONS_WIREFRAME_REVISION_1.md
Relationship reference: WORKER_COMPLIANCE_RELATIONSHIP_MAP.md
Implementation: Not authorized

## 1. Executive Summary

Page 020 Revision 1 resolves the documented owner conditions by making certification classification,
source authority, requirement transparency, validity, privacy, and assignment-eligibility boundaries
explicit.

The revised wireframe clearly separates certifications from licences and prevents users from
mistaking training completion, document upload, platform review, worker approval, or assignment
eligibility for the same workflow.

Recommendation: APPROVE PAGE 020 AS APPROVED WIREFRAME v1.0.

## 2. Conditions Resolved

| Condition | Result |
| --- | --- |
| Strengthen licence vs certification separation | Resolved |
| Show independent certification dimensions | Resolved |
| Explain required-certification source | Resolved |
| Clarify certification source trust | Resolved |
| Strengthen expiry and validity safety | Resolved |
| Clarify employer/platform-issued training scope | Resolved |
| Restrict employer visibility | Resolved |
| Preserve supporting evidence boundary | Resolved |
| Improve correction, rejection, and verification-unavailable states | Resolved |
| Strengthen assignment eligibility boundary | Resolved |
| Clarify AI boundaries | Resolved |
| Align Compliance Relationship Map | Resolved |
| Strengthen mobile/accessibility communication | Resolved |

## 3. Strengths

- Licence, certification, evidence, verification, worker approval, and assignment eligibility remain
  separate.
- Source classification is explicit and does not treat all authorities as equivalent.
- Review state, validity state, requirement state, source classification, and worker record state
  remain independent.
- Required certifications must show a why-required explanation from an approved configurable source.
- Expired and unknown-validity records cannot appear operationally active.
- Employer-issued and platform-issued training are scoped and not regulator-equivalent.
- Employer visibility is limited to relevant operational facts.
- Supporting evidence remains in the Documents workflow.
- Correction, rejection, and verification-unavailable states use safe, non-accusatory language.
- AI is limited to suggestions and cannot verify, approve, reject, invent, or decide eligibility.

## 4. Risks

| Risk | Severity | Resolution |
| --- | --- | --- |
| Certification appears equivalent to licence | High | Revision 1 adds explicit boundary and source trust model. |
| Training appears to grant legal authority | High | Revision 1 states training completion does not grant authority to practise. |
| Required certifications appear invented | High | Requirement explanation requires approved configurable source. |
| Expired record appears valid | High | Expiry safety block prevents previous review from preserving active status. |
| Employer sees too much information | High | Employer visibility is role-, employer-, and assignment-specific. |
| Upload appears to verify certification | High | Evidence boundary distinguishes upload, review, verification, requirement, and assignment. |
| AI appears to make compliance decisions | High | AI prohibitions are explicit and repeated in card-level guidance. |
| Certification appears to approve assignment eligibility | High | Assignment eligibility boundary lists multiple required inputs and forbids universal badge. |

## 5. Scorecard

| Category | Score | Notes |
| --- | ---: | --- |
| Licence/certification separation | 10.0 | Explicit boundary and definitions included. |
| Source classification | 9.9 | Source authority and non-equivalence are clear. |
| Independent status dimensions | 10.0 | Five dimensions are visible and cannot collapse into one badge. |
| Requirement transparency | 9.9 | Required items must show why and source. |
| Expiry safety | 9.9 | Expired, no-expiry, and unknown-validity states are safer. |
| Employer/platform-issued training scope | 9.8 | Internal training is scoped and non-equivalent to regulator-issued records. |
| Employer visibility | 9.9 | Sensitive records and histories remain restricted. |
| Supporting evidence boundary | 10.0 | Evidence remains outside certification storage and does not equal verification. |
| Correction/rejection UX | 9.8 | Non-punitive, factual states are defined. |
| Assignment-eligibility boundary | 10.0 | No universal eligibility badge or automatic assignment approval. |
| AI transparency | 10.0 | AI cannot create, verify, approve, reject, rank, or decide eligibility. |
| Accessibility | 9.8 | Mobile cards use text labels and accessible state communication. |
| International readiness | 9.8 | Requirements, sources, expiry, jurisdiction, and role context are configurable. |
| Consistency with Pages 017-019 | 9.9 | Profile, professional, licence, and certification boundaries remain intact. |
| Overall | 9.9 | Approved-condition revision is complete. |

## 6. Review Findings

### Licence and Certification Separation

Pass.

The revised page explains that licences normally relate to regulated authority, while
certifications record training, competency, completion, or qualification. The terms are not used
interchangeably.

### Source Authority Transparency

Pass.

The revised page distinguishes government/regulator sources, accredited providers, educational
institutions, professional associations, employer-issued training, platform-issued training,
self-reported training, unknown sources, and verification-unavailable states.

### Requirement Transparency

Pass.

Any required certification must show why it is required and where that requirement comes from.
Required for one employer or assignment does not become a universal requirement.

### Expiry and Validity Safety

Pass.

Expired certifications cannot remain active because they were previously reviewed. No-expiry and
unknown-validity states are not treated as permanent validity.

### Employer Visibility and Privacy

Pass.

Employer visibility is limited to relevant assignment facts. Full identifiers, evidence, private
notes, internal reviewer notes, rejection/correction history, unrelated certifications, and full
audit trail remain restricted.

### Supporting Evidence Boundary

Pass.

The revised page preserves the chain:

```text
Certification record
-> Evidence reference
-> Documents workflow
```

Upload, review, certification verification, requirement satisfaction, and assignment approval remain
separate.

### Assignment Eligibility Boundary

Pass.

The revised page treats certification status as one possible input only. It does not create a
universal eligibility badge.

### AI Boundary

Pass.

AI can suggest and explain, but cannot create records, verify authenticity, determine legal
equivalence, create mandatory requirements, approve/reject records, decide eligibility, guarantee
assignments, rank workers on unsupported assumptions, or modify records without confirmation.

### Accessibility and Mobile

Pass.

Mobile cards expose category, source, review state, validity state, requirement state, expiry date,
and required action through text labels, not color alone.

## 7. Remaining Risks

No wireframe-blocking risks remain.

Future implementation and launch governance will still require:

- Approved certification requirement configuration.
- Jurisdiction-specific legal/compliance review where applicable.
- Permission implementation for employer visibility.
- Documents workflow implementation.
- Audit logging implementation.
- Review-team operating procedures.

These are not Page 020 wireframe defects.

## 8. Approval Rule Check

| Approval Rule | Result |
| --- | --- |
| Licence and certification concepts remain separate | Pass |
| Source authority is clear | Pass |
| Review, validity, requirement, and source states are independent | Pass |
| Expired records cannot appear operationally valid | Pass |
| Internal training is not regulator-equivalent | Pass |
| Required certifications always have explainable source | Pass |
| Employer access is restricted | Pass |
| Upload cannot be mistaken for verification | Pass |
| Certification cannot be mistaken for assignment approval | Pass |
| AI cannot verify, approve, or create qualifications | Pass |
| Compliance Relationship Map is consistent | Pass |
| No new governance or compliance risk remains | Pass |

## 9. Confirmation

- Architecture Freeze unchanged.
- Epic 3 Planning unchanged.
- Pages 016-019 unchanged.
- Approved Page 019 licence governance unchanged.
- No implementation started.
- No Page 021 files created.
- Unrelated app changes untouched.
- No React created.
- No frontend created.
- No backend created.
- No APIs created.
- No database created.
- No certification-verification implementation created.
- No background-check implementation created.
- No deployment performed.
- No production data introduced.

## 10. Recommendation

Create PAGE_020_APPROVAL_RECORD_V1_0.md and mark:

```text
Page 020 - Certifications
APPROVED WIREFRAME v1.0
```

Then unblock Page 021 - Background Check as the next controlled gate, but do not create Page 021.
