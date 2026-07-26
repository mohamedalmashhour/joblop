# Page 020 - Certifications Low-Fidelity Wireframe

Status: Product Design Review ready
Epic: Epic 3 - Worker Portal
Primary user: Authenticated worker
Architecture baseline: Resident Job Architecture Phase 1 v1.0
Epic planning baseline: Epic 3 Worker Portal Planning v1.0
Relationship reference: WORKER_COMPLIANCE_RELATIONSHIP_MAP.md
Implementation: Not authorized

## 1. Purpose

The Certifications page lets an authenticated worker manage certification and training records.

The page allows workers to:

- View certification records.
- Add certification information.
- Classify the certification source.
- Link supporting evidence through the Documents workflow.
- Track expiry and renewal.
- See review status.
- Respond to correction requests.
- Understand whether a certification is required, recommended, optional, or employer-specific.

The page must not:

- Issue certifications.
- Automatically verify certifications.
- Approve regulated professional practice.
- Approve the worker.
- Guarantee assignment eligibility.
- Replace issuing organizations.
- Expose admin-only review controls.
- Treat document upload as verification.
- Treat every training record as legally equivalent.

## 2. Core Boundary

Certification records, licences, documents, review states, validity, requirement state, worker
approval, and assignment eligibility are distinct.

```text
Certification record
≠
Licence

Evidence uploaded
≠
Evidence reviewed
≠
Certification verified

Certification verified
≠
Worker approved

Worker approved
≠
Eligible for every assignment
```

## 3. Information Hierarchy

Primary:

- Certification summary.
- Required/correction/expiry attention.
- Certification cards.
- Requirement explanation.

Secondary:

- Add certification.
- Category and source classification.
- Independent status dimensions.
- Evidence reference.

Tertiary:

- Employer visibility.
- Privacy and security.
- AI guidance.
- Related Documents link.

## 4. Desktop Wireframe

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Resident Job                               Certifications     Help Profile│
│ Worker: [Name]                         Page status: Saved / Review needed│
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ CERTIFICATION SUMMARY                                                      │
├────────────────────┬────────────────────┬────────────────────┬────────────┤
│ Total records      │ Required for role  │ Recommended        │ Optional   │
│ 6                  │ 2                  │ 2                  │ 2          │
├────────────────────┼────────────────────┼────────────────────┼────────────┤
│ Expiring soon      │ Expired            │ Under review       │ Correction │
│ 1                  │ 1                  │ 1                  │ 1          │
└────────────────────┴────────────────────┴────────────────────┴────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ ATTENTION REQUIRED                                                         │
│ [!] Expired: First Aid certificate                                         │
│ [!] Correction requested: issuing organization mismatch                    │
│ [!] Required for selected assignment: food-safety training                 │
│ [Renew] [Correct information] [Link evidence] [View review status]        │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ CERTIFICATION CATEGORIES - CONFIGURABLE AND JURISDICTION-NEUTRAL          │
├────────────────────────────┬────────────────────────────┬──────────────────┤
│ CLINICAL AND CARE          │ FOOD AND KITCHEN           │ WORKPLACE SAFETY │
│ CPR                        │ Food-handler certification │ WHMIS/equivalent │
│ First Aid                  │ Food-safety training       │ Fire safety      │
│ Basic Life Support         │ Allergen awareness         │ Workplace violence│
│ Dementia-care training     │ Special-diet training      │ Health and safety│
│ Infection prevention       │                            │ Emergency prep   │
├────────────────────────────┼────────────────────────────┼──────────────────┤
│ OPERATIONS                 │ EMPLOYER / PLATFORM        │ CONTINUING ED.   │
│ Housekeeping procedures    │ Employer-issued training   │ Optional courses │
│ Equipment training         │ Platform orientation       │ Workshops        │
│ Privacy training           │ Residence-specific training│ Continuing prof. │
│ Admin systems training     │ Internal competency modules│ education        │
│ These examples are not universal legal requirements.                       │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ CERTIFICATION RECORD CARD                                                  │
├──────────────────────────────────────┬─────────────────────────────────────┤
│ Certification name: Food safety      │ Category: Food and kitchen          │
│ Source type: Accredited provider     │ Issuing organization: [Name]        │
│ Jurisdiction: [Region]               │ Identifier: ending in 4821          │
│ Issue date: 2025-01-15               │ Expiry date: 2027-01-15             │
│ Completion date: 2025-01-15          │ Last reviewed: 2026-07-22           │
├──────────────────────────────────────┴─────────────────────────────────────┤
│ Worker record state: Submitted                                             │
│ Platform review state: Verified where applicable                           │
│ Validity state: Active                                                     │
│ Requirement state: Required for specific kitchen assignments               │
│ Assignment relevance: kitchen food-service roles where configured          │
│ Evidence reference: [Open Documents workflow]                              │
│ Worker notes: [Optional]                                                   │
│ [View details] [Renew] [Link evidence] [View review status]                │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ ADD CERTIFICATION                                                          │
│ Certification name: [Configurable]                                         │
│ Category: [Configurable]                                                   │
│ Source type: [Select source classification]                                │
│ Issuing organization: [Configurable]                                       │
│ Jurisdiction: [Configurable]                                               │
│ Certificate identifier: [Masked where appropriate after save]              │
│ Completion date: [Date]                                                    │
│ Issue date: [Date]                                                         │
│ Expiry date: [Date] / No expiry recorded where supported                   │
│ Supporting evidence: [Link through Documents workflow]                     │
│ Requirement state: [Required / Recommended / Optional / Employer-specific] │
│ [Save draft] [Submit for review]                                           │
│ Evidence uploaded does not verify the certification.                       │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ SOURCE CLASSIFICATION                                                      │
│ Government or regulator-issued                                             │
│ Accredited training provider                                               │
│ Employer-issued                                                            │
│ Platform-issued                                                            │
│ Educational institution                                                    │
│ Professional association                                                   │
│ Self-reported training                                                     │
│ Source unknown                                                             │
│ Verification unavailable                                                   │
│ Employer-issued, platform-issued, and regulator-issued records are not     │
│ treated as equivalent.                                                     │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ INDEPENDENT STATUS DIMENSIONS                                              │
├────────────────────┬────────────────────┬────────────────────┬────────────┤
│ WORKER RECORD      │ PLATFORM REVIEW    │ VALIDITY           │ REQUIREMENT│
│ Draft              │ Not reviewed       │ Active             │ Role/assign│
│ Submitted          │ Under review       │ Expiring soon      │ Recommended│
│                    │ Verified where app.│ Expired            │ Optional   │
│                    │ Correction required│ No expiry recorded │ Employer   │
│                    │ Rejected           │ Validity unknown   │ Jurisdiction│
│                    │ Verification unav. │                    │ Not current│
│ Do not collapse these dimensions into one generic status.                  │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ TRUTH STATEMENTS                                                           │
│ Submitted ≠ Reviewed                                                       │
│ Reviewed ≠ Verified                                                        │
│ Verified ≠ Currently valid                                                 │
│ Currently valid ≠ Required for every assignment                            │
│ Required for one assignment ≠ Required everywhere                          │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ EXPIRY AND RENEWAL                                                         │
│ Exact expiry date: shown where known                                      │
│ Expiring-soon warning: configurable threshold                              │
│ Expired state: clearly labeled                                             │
│ Renewal reminder: configurable                                             │
│ Renewed/replacement record: supported as a separate record path            │
│ Updated evidence link: [Open Documents workflow]                           │
│ No-expiry state: displayed where supported                                 │
│ Unknown-validity warning: shown when validity cannot be determined         │
│ No universal expiry period, renewal window, or grace period is invented.   │
│ Expired certification never appears active because it was previously reviewed.│
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ REQUIRED VS OPTIONAL EXPLANATION                                           │
│ Requirement source: approved policy / configuration / contract / regulator │
│ / employer rule.                                                           │
│ The worker can see why a certification is marked required.                 │
│ Requirement types: jurisdictional, role-required, assignment-required,     │
│ employer-required, platform-required, recommended, optional.               │
│ Do not claim a requirement without an approved source.                     │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ SUPPORTING DOCUMENT BOUNDARY                                               │
│ Certification record → Supporting evidence reference → Documents workflow  │
│ The Certifications page references evidence but does not store documents.  │
│ Evidence uploaded ≠ evidence reviewed                                      │
│ Evidence reviewed ≠ certification verified                                 │
│ Certification verified ≠ worker approved                                  │
│ Worker approved ≠ eligible for every assignment                            │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ EMPLOYER VISIBILITY AND PRIVACY                                            │
├────────────────────────────┬────────────────────────────┬──────────────────┤
│ WORKER ONLY                │ EMPLOYER VISIBLE WHEN      │ AUTHORIZED STAFF │
│ Drafts                     │ RELEVANT                   │ Supporting       │
│ Full certificate ID        │ Certification name         │ evidence         │
│ Private notes              │ Category                   │ Review history   │
│ Incomplete entries         │ Issuing source             │ Correction history│
│ Correction history         │ Validity state             │ Internal audit   │
│ Rejected evidence details  │ Review state where app.    │ information      │
│                            │ Assignment relevance       │                  │
│                            │ Expiry only when necessary │                  │
│ Employers do not receive unrestricted access to identifiers, evidence,     │
│ private notes, internal reviewer notes, or unrelated certifications.       │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ AI CERTIFICATION GUIDANCE - SUGGESTIONS ONLY                              │
│ AI may identify missing fields, detect inconsistent dates, suggest         │
│ standardized categories, flag possible duplicates, remind workers of       │
│ expiry, suggest potentially relevant training, and explain why a           │
│ certification may be relevant to a role.                                  │
│ AI must not invent certifications, verify authenticity, approve/reject,    │
│ determine legal requirements independently, infer professional authority,  │
│ guarantee assignment eligibility, edit without confirmation, or rank       │
│ workers using unsupported certification assumptions.                       │
└────────────────────────────────────────────────────────────────────────────┘
```

## 5. Mobile Wireframe

Mobile prioritizes certification cards, visible category/source, visible validity/review states,
visible required/optional status, and short add/edit flow.

```text
┌──────────────────────────────┐
│ Certifications        Help   │
│ Status: Action needed        │
└──────────────────────────────┘

┌──────────────────────────────┐
│ SUMMARY                      │
│ Required: 2                  │
│ Recommended: 2               │
│ Optional: 2                  │
│ Expiring soon: 1             │
│ Correction required: 1       │
└──────────────────────────────┘

┌──────────────────────────────┐
│ HIGH PRIORITY ACTIONS        │
│ [Add certification]          │
│ [Link evidence]              │
│ [Correct information]        │
│ [Renew]                      │
│ [View review status]         │
└──────────────────────────────┘

┌──────────────────────────────┐
│ CERTIFICATION CARD           │
│ Food safety                  │
│ Category: Food/kitchen       │
│ Source: Accredited provider  │
│ Validity: Active             │
│ Review: Verified where app.  │
│ Requirement: role-required   │
│ Expiry: 2027-01-15           │
│ Evidence: linked elsewhere   │
│ [View] [Renew]               │
└──────────────────────────────┘

┌──────────────────────────────┐
│ ADD / EDIT                   │
│ Short form                   │
│ Save and continue            │
│ Link evidence through docs   │
│ Upload ≠ verification        │
└──────────────────────────────┘

┌──────────────────────────────┐
│ REVIEW STATES                │
│ Record / Review / Validity   │
│ / Requirement are separate   │
└──────────────────────────────┘

┌──────────────────────────────┐
│ PRIVACY                      │
│ Worker only                  │
│ Employer-visible when needed │
│ Platform staff only          │
└──────────────────────────────┘
```

## 6. Error and Status States

Required states:

- No certifications.
- Draft record.
- Missing evidence.
- Duplicate certification.
- Conflicting dates.
- Invalid expiry date.
- Under review.
- Correction required.
- Rejected.
- Verification unavailable.
- Active.
- Expiring soon.
- Expired.
- No expiry.
- Unknown validity.
- Offline or interrupted save.
- Evidence unavailable.
- Read-only reviewed field.

## 7. Accessibility

- Use semantic forms.
- Support keyboard navigation.
- Use accessible date fields.
- Use accessible status labels.
- Announce status changes.
- Associate errors with fields.
- Manage focus after save, submit, correction, and validation failure.
- Maintain sufficient contrast.
- Never use color-only states.
- Keep masked identifiers readable.
- Use plain language.
- Make filters accessible.

## 8. International Readiness

Do not hardcode:

- Certification names.
- Issuing organizations.
- Expiry rules.
- Jurisdictional requirements.
- Legal equivalence.
- Language.
- Identifier formats.
- Renewal rules.

Support configurable country, province, state, region, employer, and role requirements.

## 9. Self Validation

| Check | Result |
| --- | --- |
| Architecture Freeze remains intact | Pass |
| Epic 3 Planning remains unchanged | Pass |
| Pages 016-019 remain unchanged | Pass |
| Certifications and licences remain distinct | Pass |
| Upload does not equal verification | Pass |
| Certification verification is not automatic | Pass |
| Expired certifications cannot appear active | Pass |
| Required and optional records are clear | Pass |
| Employer visibility is restricted | Pass |
| Identifiers and evidence are protected | Pass |
| AI cannot verify, approve, or create qualifications | Pass |
| Assignment eligibility is not guaranteed | Pass |
| No implementation started | Pass |
| No Page 021 files created | Pass |

## 10. Governance Confirmation

This document is a low-fidelity wireframe only.

No React, frontend, backend, APIs, database models, certification-verification implementation,
credential-verification implementation, deployment, or production data are introduced.
