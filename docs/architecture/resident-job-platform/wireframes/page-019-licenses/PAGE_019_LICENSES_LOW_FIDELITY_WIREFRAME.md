# Page 019 - Licenses Low-Fidelity Wireframe

Status: Product Design Review ready
Epic: Epic 3 - Worker Portal
Primary user: Authenticated worker
Architecture baseline: Resident Job Architecture Phase 1 v1.0
Epic planning baseline: Epic 3 Worker Portal Planning v1.0
Implementation: Not authorized

## 1. Purpose

The Licenses page lets an authenticated worker view and manage recorded licence information.

The page allows workers to:

- View recorded licences.
- Add a licence record.
- Upload supporting evidence through the separate Documents workflow.
- Track expiry.
- See review status.
- Respond to correction requests.

The page must not:

- Issue licences.
- Verify a licence automatically.
- Approve regulated practice.
- Grant worker eligibility.
- Replace a regulator.
- Expose admin-only review controls.
- Claim that upload equals verification.

## 2. Core Boundary

Licence records, supporting documents, review state, validity, and worker eligibility are separate.

```text
Licence added
≠
Licence verified

Document uploaded
≠
Document reviewed
≠
Licence verified

Licence verified
≠
Worker approved

Worker approved
≠
Eligible for every shift
```

Do not show a generic "Licensed Worker" badge.

## 3. Information Hierarchy

Primary:

- Licence summary.
- Expiry and renewal warnings.
- Correction required items.

Secondary:

- Licence records.
- Licence lifecycle.
- Independent status model.
- Supporting-document references.

Tertiary:

- Jurisdiction guidance.
- Privacy and employer visibility.
- AI reminders and suggestions.
- Related workflow links.

## 4. Desktop Wireframe

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Resident Job                                      Licenses     Help Profile│
│ Worker: [Name]                  Page status: Saved / Review needed        │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ LICENCE SUMMARY                                                            │
├────────────────────┬────────────────────┬────────────────────┬────────────┤
│ Total licences     │ Active records     │ Expiring soon      │ Expired    │
│ 3                  │ 1                  │ 1                  │ 1          │
├────────────────────┴────────────────────┴────────────────────┴────────────┤
│ Under review: 1        Correction required: 1                             │
│ No generic "Licensed Worker" badge is displayed.                          │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ CRITICAL LICENCE ATTENTION                                                 │
│ [!] Correction requested: Practical nursing licence record                 │
│ [!] Expiring soon: Food safety licence / permit                            │
│ [Review correction] [Add replacement document through Documents]           │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ LICENCE RECORDS                                                            │
├──────────────┬──────────────┬──────────────┬──────────────┬────────────────┤
│ Type         │ Authority    │ Jurisdiction │ Expiry       │ Status         │
│ Food safety  │ [Authority]  │ [Region]     │ 2026-09-30   │ Expiring soon  │
│ Licence no.  │ ***-***-1234 │ Issue date   │ 2024-09-30   │ Review: verified where applicable |
│ Document ref │ [Open Documents workflow]     Last update: 2026-07-22       │
│ Correction   │ None                                                         │
│ [View details] [Update record] [Link supporting document]                  │
├──────────────┬──────────────┬──────────────┬──────────────┬────────────────┤
│ Practical role licence      │ [Authority]  │ [Region]     │ [Date]         │
│ Licence no. masked where appropriate                 Review: correction required |
│ Correction request: confirm issuing authority and replacement document     │
│ [Respond to correction] [Open Documents workflow]                          │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ ADD LICENCE RECORD                                                         │
│ Licence type: [Configurable]                                               │
│ Issuing authority: [Configurable]                                          │
│ Jurisdiction: [Configurable]                                               │
│ Licence number: [Masked where appropriate after save]                      │
│ Issue date: [Date]                                                         │
│ Expiry date: [Date]                                                        │
│ Supporting evidence: [Link via Documents workflow]                         │
│ [Save draft] [Submit for review]                                           │
│ Uploading or linking evidence does not verify the licence.                 │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ LICENCE LIFECYCLE                                                          │
│ Added by worker                                                            │
│ ↓                                                                          │
│ Evidence linked                                                            │
│ ↓                                                                          │
│ Submitted for review                                                       │
│ ↓                                                                          │
│ Under review                                                               │
│ ↓                                                                          │
│ Verified where applicable                                                  │
│ OR Correction required / Rejected / Expired                                │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ INDEPENDENT STATUS MODEL                                                   │
├────────────────────────────┬────────────────────────────┬──────────────────┤
│ WORKER RECORD              │ REVIEW STATE               │ VALIDITY         │
│ Draft                      │ Not reviewed               │ Active           │
│ Submitted                  │ Under review               │ Expiring soon    │
│                            │ Verified where applicable  │ Expired          │
│                            │ Correction required        │                  │
│                            │ Rejected                   │                  │
│                            │ Verification unavailable   │                  │
│ Do not collapse these into one status.                                      │
└────────────────────────────┴────────────────────────────┴──────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ JURISDICTION HANDLING                                                      │
│ Fields are configurable by role and jurisdiction.                           │
│ Do not hardcode licence authorities, licence formats, renewal rules,       │
│ expiry rules, practice rights, legal requirements, or grace periods.        │
│ Requirements may vary by jurisdiction and role.                            │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ EXPIRY AND RENEWAL                                                         │
│ Expiry warning: visible before expiry where configured                     │
│ Renewal reminder: configurable                                             │
│ Expired state: clearly labeled                                             │
│ Replacement-document prompt: links to Documents workflow                   │
│ Grace-period placeholder: shown only if future approved rules exist        │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ PRIVACY AND EMPLOYER VISIBILITY                                            │
├────────────────────────────┬────────────────────────────┬──────────────────┤
│ WORKER ONLY                │ EMPLOYER VISIBLE WHEN      │ AUTHORIZED STAFF │
│ Drafts                     │ RELEVANT                   │ Evidence         │
│ Full licence number        │ Licence type               │ Review history   │
│ Private notes              │ Jurisdiction               │ Audit trail      │
│ Correction history         │ Validity status            │                  │
│                            │ Verified review state      │                  │
│                            │ Assignment-relevant only   │                  │
│ Do not expose full licence numbers unnecessarily.                           │
└────────────────────────────┴────────────────────────────┴──────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ AI LICENCE GUIDANCE - SUGGESTIONS ONLY                                    │
│ AI may detect missing fields, flag expiry dates, suggest standard licence  │
│ categories, detect inconsistent dates, and remind the worker to renew.     │
│ AI must not verify a licence, contact a regulator automatically, approve   │
│ eligibility, infer legal authority to practise, alter licence records      │
│ without confirmation, or decide rejection.                                 │
└────────────────────────────────────────────────────────────────────────────┘
```

## 5. Mobile Wireframe

Mobile design prioritizes licence cards, expiry visibility, short add/edit flow, and clear review
states.

```text
┌──────────────────────────────┐
│ Licenses              Help   │
│ Status: Review needed        │
└──────────────────────────────┘

┌──────────────────────────────┐
│ SUMMARY                      │
│ Total: 3                     │
│ Active: 1                    │
│ Expiring soon: 1             │
│ Expired: 1                   │
│ Under review: 1              │
│ Correction required: 1       │
│ No "Licensed Worker" badge   │
└──────────────────────────────┘

┌──────────────────────────────┐
│ NEEDS ATTENTION              │
│ Correction requested         │
│ Expiring soon                │
│ [Review now]                 │
└──────────────────────────────┘

┌──────────────────────────────┐
│ LICENCE CARD                 │
│ Type: Food safety            │
│ Jurisdiction: [Region]       │
│ Number: ***-***-1234         │
│ Validity: Expiring soon      │
│ Review: verified where       │
│ applicable                   │
│ Document: linked elsewhere   │
│ [View] [Update]              │
└──────────────────────────────┘

┌──────────────────────────────┐
│ ADD LICENCE                  │
│ Short form                   │
│ Link evidence through        │
│ Documents workflow           │
│ Upload ≠ verification        │
│ [Save] [Submit for review]   │
└──────────────────────────────┘

┌──────────────────────────────┐
│ LICENCE LIFECYCLE            │
│ Added                        │
│ Evidence linked              │
│ Submitted                    │
│ Under review                 │
│ Verified where applicable    │
│ or correction / rejected /   │
│ expired                      │
└──────────────────────────────┘

┌──────────────────────────────┐
│ PRIVACY                      │
│ Worker only                  │
│ Employer visible when        │
│ relevant                     │
│ Platform staff only          │
│ [Review visibility]          │
└──────────────────────────────┘
```

## 6. Licence Record Fields

Each licence record includes placeholders for:

- Licence type.
- Issuing authority.
- Jurisdiction.
- Licence number, masked where appropriate.
- Issue date.
- Expiry date.
- Status.
- Supporting-document reference.
- Review state.
- Last update.
- Correction request where applicable.

## 7. Independent Status Model

Worker record states:

- Draft.
- Submitted.

Review states:

- Not reviewed.
- Under review.
- Verified where applicable.
- Correction required.
- Rejected.
- Verification unavailable.

Validity states:

- Active.
- Expiring soon.
- Expired.

These states must not be collapsed into one badge.

## 8. Supporting Documents Boundary

Supporting documents belong to the separate Documents workflow.

Page 019 may show:

- Document reference.
- Link to Documents workflow.
- Document missing state.
- Document linked state.

Page 019 must not duplicate document storage or expose sensitive document contents.

## 9. Privacy and Security

The page must include:

- Masked identifiers.
- Role-based access.
- Secure document references.
- Audit trail reference.
- Correction history.
- Limited employer visibility.
- No public display by default.

## 10. AI Boundary

AI may:

- Detect missing fields.
- Flag expiry dates.
- Suggest standard licence categories.
- Detect inconsistent dates.
- Remind the worker to renew.

AI must not:

- Verify a licence.
- Contact a regulator automatically.
- Approve eligibility.
- Infer legal authority to practise.
- Alter licence records without confirmation.
- Decide rejection.

## 11. Error and Status States

Required states:

- No licences.
- Draft record.
- Missing evidence.
- Validation error.
- Duplicate licence.
- Conflicting dates.
- Under review.
- Correction required.
- Verified where applicable.
- Rejected.
- Expiring soon.
- Expired.
- Offline or interrupted save.
- Secure-document unavailable.

## 12. Accessibility

- Use semantic form structure.
- Support keyboard navigation.
- Use accessible date fields.
- Announce status changes.
- Do not rely on color-only validity states.
- Keep masked identifiers readable.
- Manage focus after save, submit, or correction response.
- Use plain language.
- Maintain sufficient contrast.
- Use large touch targets on mobile.

## 13. International Readiness

- Keep licence authorities configurable.
- Keep licence formats configurable.
- Keep renewal and expiry rules configurable.
- Avoid hardcoded practice rights or legal requirements.
- Avoid universal grace periods.
- Support future localization and right-to-left layouts.

## 14. Self Validation

| Check | Result |
| --- | --- |
| Architecture Freeze unchanged | Pass |
| Epic 3 Planning unchanged | Pass |
| UX Foundation unchanged | Pass |
| Navigation unchanged | Pass |
| Consistency with Pages 017 and 018 preserved | Pass |
| No generic "Licensed Worker" badge | Pass |
| Upload does not equal verification | Pass |
| Licence verification is not automatic | Pass |
| Expired records cannot appear valid | Pass |
| Employer visibility is limited | Pass |
| Full licence numbers are masked where appropriate | Pass |
| Worker approval does not equal legal eligibility | Pass |
| AI cannot verify or approve licences | Pass |
| Mobile-first layout included | Pass |
| Accessibility considerations included | Pass |
| No implementation introduced | Pass |
| Page 020 not created | Pass |

## 15. Governance Confirmation

This document is a low-fidelity wireframe only.

No React, frontend, backend, APIs, database models, credential-verification implementation,
licence-verification implementation, regulator integration, deployment, or production data are
introduced.
