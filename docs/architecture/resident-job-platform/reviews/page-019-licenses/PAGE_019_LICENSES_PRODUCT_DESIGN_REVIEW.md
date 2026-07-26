# Page 019 - Licenses Product Design Review

Status: Complete - owner review required
Epic: Epic 3 - Worker Portal
Page: 019 - Licenses
Reviewed artifact: PAGE_019_LICENSES_LOW_FIDELITY_WIREFRAME.md
Implementation: Not authorized

## 1. Executive Summary

Page 019 defines the authenticated worker licence-management experience with clear separation
between licence records, supporting evidence, review state, validity, and operational eligibility.

The wireframe is suitable for owner review. It does not issue licences, verify licences
automatically, approve regulated practice, grant eligibility, replace regulators, expose admin
review controls, or claim that upload equals verification.

Recommendation: APPROVE FOR OWNER REVIEW.

No approval record has been created because the owner review gate remains active.

## 2. Strengths

- Licence added, document uploaded, licence reviewed, licence verified, worker approved, and shift
  eligibility are kept separate.
- Summary counts prioritize expiring, expired, under-review, and correction-required records.
- No generic "Licensed Worker" badge is used.
- Licence lifecycle is explicit.
- Worker record, review state, and validity are independent status models.
- Jurisdiction handling is configurable and avoids hardcoded legal assumptions.
- Supporting documents remain in the Documents workflow.
- Employer visibility is limited and licence numbers are masked where appropriate.
- AI boundaries prevent automated verification, regulator contact, eligibility approval, or
  rejection decisions.

## 3. Weaknesses

- Exact renewal, grace-period, and jurisdiction rules require future approved business/legal rules.
- Licence verification process details require future compliance workflow design.
- Supporting-document details are intentionally deferred to the Documents page.

These are not Page 019 wireframe defects.

## 4. Risks

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Upload appears to equal verification | High | Explicit Document uploaded ≠ Document reviewed ≠ Licence verified labels. |
| Licence verification appears automatic | High | Review workflow and "verified where applicable" labels are used. |
| Expired records appear valid | High | Independent validity states include expired and expiring soon. |
| Employer visibility is unrestricted | High | Employer visibility limited to assignment-relevant details. |
| Full licence numbers exposed unnecessarily | High | Masking is required where appropriate. |
| Worker approval appears to equal legal eligibility | High | Worker approved ≠ eligible for every shift is explicit. |
| AI appears to verify or approve licences | High | AI cannot verify, approve, contact regulators, or decide rejection. |

## 5. Scorecard

| Category | Score | Notes |
| --- | ---: | --- |
| Licence-status clarity | 9.7 | Summary, lifecycle, review state, and validity are separated. |
| Self-reported vs verified separation | 9.8 | Upload and review are clearly distinct from verification. |
| Expiry handling | 9.6 | Expiring soon, expired, renewal reminders, and replacement prompts are included. |
| Jurisdiction neutrality | 9.7 | Authorities, formats, renewal, expiry, and legal requirements are configurable. |
| Employer visibility | 9.7 | Employer access is limited to relevant details. |
| Privacy | 9.7 | Masking, secure references, audit trail, and limited visibility are specified. |
| AI transparency | 9.8 | AI cannot verify or approve licences. |
| Mobile usability | 9.5 | Mobile prioritizes licence cards and expiry/correction visibility. |
| Accessibility | 9.5 | Semantic forms, date fields, focus, announcements, and non-color statuses covered. |
| Legal-authority risk control | 9.8 | Page avoids regulator replacement and practice-right claims. |
| Consistency with Pages 017 and 018 | 9.7 | Preserves profile, professional, verification, and privacy boundaries. |
| Overall | 9.7 | Ready for owner review. |

## 6. Review Criteria

### Licence-Status Clarity

Pass.

The wireframe separates worker record, review state, and validity. It does not collapse them into
one misleading status.

### Self-Reported Versus Verified Separation

Pass.

The page makes clear that adding a licence record or uploading a document does not equal
verification.

### Expiry Handling

Pass.

The page includes expiry warnings, renewal reminders, expired states, replacement-document prompts,
and grace-period placeholders only where future approved rules exist.

### Jurisdiction Neutrality

Pass.

The wireframe avoids hardcoded licence authorities, formats, renewal rules, expiry rules, practice
rights, legal requirements, and universal grace periods.

### Employer Visibility

Pass.

Employers may see only assignment-relevant details when applicable. Full licence numbers are not
exposed unnecessarily.

### Privacy

Pass.

The page includes masked identifiers, role-based access, secure document references, audit trail,
correction history, and no public display by default.

### AI Transparency

Pass.

AI can help detect missing fields, expiry dates, standard categories, inconsistent dates, and
renewal reminders, but cannot verify, contact regulators, approve eligibility, infer practice
authority, alter records without confirmation, or decide rejection.

### Mobile Usability

Pass.

Mobile cards prioritize summary, correction, expiry, licence records, document links, and privacy.

### Accessibility

Pass.

The wireframe covers semantic forms, keyboard navigation, accessible dates, status announcements,
non-color validity states, readable masked identifiers, focus management, plain language, contrast,
and touch targets.

### Risk of Implying Legal Authority

Pass.

The page avoids claims that the platform issues licences, replaces regulators, or grants practice
rights.

### Consistency With Pages 017 and 018

Pass.

Page 019 continues the approved pattern of separating profile records, professional claims,
supporting evidence, review states, verification, privacy, and operational eligibility.

## 7. Required Improvements

No required wireframe improvements are identified at this review stage.

Owner review is still required before Page 019 may become Approved Wireframe v1.0.

## 8. Non-Blocking Design Debt

Potential future enhancements:

- Jurisdiction-specific licence templates after legal and compliance review.
- Licence renewal timeline detail after approved business rules exist.
- Regulator lookup or validation integration after engineering and legal approval.
- Employer-facing licence visibility preview.
- Licence evidence audit timeline after Documents workflow approval.

These are not blockers for Page 019.

## 9. Confirmation

- Architecture Freeze unchanged.
- Epic 3 Planning unchanged.
- UX Foundation unchanged.
- Navigation unchanged.
- Consistency with Pages 017 and 018 preserved.
- No Page 020 created.
- No approval record created.
- No React created.
- No frontend implementation started.
- No backend started.
- No APIs created.
- No database models created.
- No credential-verification implementation created.
- No licence-verification implementation created.
- No regulator integration created.
- No deployment performed.
- No production data introduced.

## 10. Owner Decision Required

Valid next owner decisions:

- APPROVE PAGE 019 AS APPROVED WIREFRAME v1.0.
- APPROVE WITH DOCUMENTED CONDITIONS.
- REMEDIATION REQUIRED.

Page 020 remains blocked until Page 019 reaches Approved Wireframe v1.0.
