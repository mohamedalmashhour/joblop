# Page 020 - Certifications Wireframe Revision 1

Status: Approved-condition revision complete
Epic: Epic 3 - Worker Portal
Primary user: Authenticated worker
Architecture baseline: Resident Job Architecture Phase 1 v1.0
Epic planning baseline: Epic 3 Worker Portal Planning v1.0
Source wireframe: PAGE_020_CERTIFICATIONS_LOW_FIDELITY_WIREFRAME.md
Relationship reference: ../WORKER_COMPLIANCE_RELATIONSHIP_MAP.md
Implementation: Not authorized

## 1. Revision Scope

This controlled revision strengthens certification classification, requirement transparency,
validity, privacy, and assignment-eligibility boundaries.

This revision does not redesign the page and does not modify:

- Architecture Freeze.
- Epic 3 Planning.
- UX Foundation.
- Navigation.
- Pages 016-019.
- Approved Page 019 licence governance.

## 2. Core Boundary

Certifications must never be presented as licences, legal authority, worker approval, or universal
assignment eligibility.

```text
Certification
!=
Licence

Training completed
!=
Legal authority to practise

Certification verified
!=
Worker approved

Worker approved
!=
Eligible for every assignment
```

Licence:

- Normally grants or records regulated authority from an external authority.
- May be jurisdiction-specific.
- May affect whether regulated work can legally be performed.

Certification:

- Records training, competency, completion, or qualification.
- May be regulator-issued, provider-issued, employer-issued, platform-issued, educational,
  association-issued, self-reported, or optional.
- Does not automatically grant regulated authority.

The page must not use licence and certification language interchangeably.

## 3. Revised Information Hierarchy

Primary:

- Certification attention and required actions.
- Licence-vs-certification boundary.
- Certification cards with independent dimensions.
- Requirement explanation.
- Expiry and validity safety.

Secondary:

- Add certification.
- Source classification.
- Evidence reference.
- Correction and rejection experience.
- Employer visibility and privacy.

Tertiary:

- AI guidance.
- Accessibility support.
- International readiness.
- Related Documents workflow.

## 4. Desktop Wireframe Revision

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Resident Job                               Certifications     Help Profile │
│ Worker: [Name]                         Page status: Saved / Review needed │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ CERTIFICATION SAFETY NOTICE                                                │
│ Certifications record training or competency information.                   │
│ Licences record regulated authority where applicable.                       │
│ Certification verified does not mean worker approved or assignment-ready.   │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ CERTIFICATION SUMMARY                                                      │
├────────────────────┬────────────────────┬────────────────────┬────────────┤
│ Records            │ Required           │ Recommended        │ Optional   │
│ 6                  │ 2                  │ 2                  │ 2          │
├────────────────────┼────────────────────┼────────────────────┼────────────┤
│ Expiring soon      │ Expired            │ Under review       │ Correction │
│ 1                  │ 1                  │ 1                  │ 1          │
└────────────────────┴────────────────────┴────────────────────┴────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ ATTENTION REQUIRED                                                         │
│ [Expired] First Aid training - renewal or replacement evidence required    │
│ [Correction] Issuing organization mismatch - update source or evidence     │
│ [Assignment requirement] Food-safety training required for selected shift   │
│ [Renew] [Correct information] [Link evidence in Documents] [Get support]   │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ CERTIFICATION RECORD                                                       │
├──────────────────────────────────────┬─────────────────────────────────────┤
│ Name: Food safety training           │ Category: Food and kitchen          │
│ Source: Accredited training provider │ Issuer: [Organization name]         │
│ Source authority: External provider  │ Scope: Kitchen food-service roles   │
│ Jurisdiction: [Region/configurable]  │ Identifier: ending in 4821          │
│ Issue/completion date: 2025-01-15    │ Expiry date: 2027-01-15             │
│ Last reviewed: 2026-07-22 placeholder│ Evidence: Documents reference       │
├──────────────────────────────────────┴─────────────────────────────────────┤
│ Independent dimensions                                                     │
│ A. Worker record state: Submitted                                          │
│ B. Source classification: Accredited training provider                     │
│ C. Platform review state: Verified where applicable                        │
│ D. Validity state: Active                                                  │
│ E. Requirement state: Assignment-required                                  │
│ Why required: Required for this configured kitchen assignment.             │
│ Assignment eligibility: Not determined on this page.                       │
│ [View details] [Renew] [Link evidence] [Respond to correction]             │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ INDEPENDENT CERTIFICATION DIMENSIONS                                       │
├────────────────────┬────────────────────┬────────────────────┬────────────┤
│ WORKER RECORD      │ SOURCE             │ PLATFORM REVIEW    │ VALIDITY   │
│ Draft              │ Government/reg.    │ Not reviewed       │ Active     │
│ Submitted          │ Accredited provider│ Under review       │ Expiring   │
│                    │ Education inst.    │ Verified where app.│ Expired    │
│                    │ Professional assoc.│ Correction required│ No expiry  │
│                    │ Employer-issued    │ Rejected           │ Unknown    │
│                    │ Platform-issued    │ Verification unav. │            │
│                    │ Self-reported      │                    │            │
│                    │ Source unknown     │                    │            │
├────────────────────┴────────────────────┴────────────────────┴────────────┤
│ REQUIREMENT STATE                                                          │
│ Jurisdiction-required / Role-required / Assignment-required /              │
│ Employer-required / Platform-required / Recommended / Optional /           │
│ Not currently required                                                     │
│ These dimensions cannot collapse into one generic badge.                   │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ WHY IS THIS REQUIRED?                                                      │
│ Requirement source: [Approved configurable source]                         │
│ Possible sources: jurisdiction, role, assignment, employer policy,          │
│ approved platform policy.                                                  │
│ Required for one employer != required by all employers.                    │
│ Required for one assignment != required for every assignment.               │
│ Recommended != mandatory. Optional != irrelevant.                          │
│ Requirements are not invented on this page.                                │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ SOURCE TRUST AND SCOPE                                                     │
│ Regulator/government source: external regulated authority where applicable. │
│ Recognized external provider: training or competency source.                │
│ Employer-issued training: may be limited to one employer/residence/role.    │
│ Platform-issued training: may be limited to one platform workflow.          │
│ Self-reported training: worker-provided and not independently verified.     │
│ Unknown/unverifiable source: cannot become automatic approval.              │
│ Avoid labels such as "fully certified" or "certified worker" unless every  │
│ supporting condition is proven and specifically scoped.                    │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ EXPIRY AND VALIDITY SAFETY                                                 │
│ Issue/completion date: shown where known.                                  │
│ Expiry date: exact date where applicable.                                  │
│ No expiry recorded: not automatically permanent validity.                  │
│ Validity unknown: warning shown until clarified.                           │
│ Expired: cannot appear active because it was previously reviewed.           │
│ Renewal action: configurable; no universal grace period is invented.        │
│ Replacement evidence: linked through Documents workflow.                    │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ SUPPORTING EVIDENCE BOUNDARY                                               │
│ Certification record -> Evidence reference -> Documents workflow           │
│ Evidence uploaded != evidence reviewed                                     │
│ Evidence reviewed != certification verified                                │
│ Certification verified != requirement satisfied                            │
│ Requirement satisfied != assignment approved                               │
│ Document-management controls remain outside this page.                     │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ CORRECTION, REJECTION, AND VERIFICATION UNAVAILABLE                        │
│ Correction required shows: reason, affected field/evidence, requested      │
│ action, resubmission path, support path, and last update.                  │
│ Rejected remains separate from expired and verification unavailable.        │
│ Rejection uses safe factual wording where allowed and hides reviewer notes. │
│ Verification unavailable is not automatic approval or automatic rejection.  │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ EMPLOYER VISIBILITY AND PRIVACY                                            │
├────────────────────────────┬────────────────────────────┬──────────────────┤
│ WORKER ONLY                │ EMPLOYER VISIBLE WHEN      │ AUTHORIZED STAFF │
│ Drafts                     │ RELEVANT TO ASSIGNMENT     │ Evidence review  │
│ Full identifier            │ Certification name         │ Correction       │
│ Private notes              │ Category                   │ Review history   │
│ Uploaded evidence          │ Issuing source             │ Audit details    │
│ Correction history         │ Validity state             │ Internal notes   │
│ Rejection details          │ Review state where app.    │                  │
│ Unrelated certifications   │ Requirement state          │                  │
│ Full audit trail           │ Assignment relevance       │                  │
│ Employer visibility is role-, employer-, and assignment-specific.          │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ ASSIGNMENT ELIGIBILITY BOUNDARY                                            │
│ Certification status may be one input only. Assignment eligibility may also │
│ depend on identity, worker approval, professional information, applicable  │
│ licence, current validity, jurisdiction, employer requirements, assignment │
│ requirements, availability, and other approved compliance conditions.       │
│ This page must not create a universal eligibility badge.                   │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ AI CERTIFICATION GUIDANCE - SUGGESTIONS ONLY                              │
│ AI may identify missing fields, inconsistent dates, possible duplicates,   │
│ standard categories, upcoming expiry, relevant training, and possible gaps │
│ for a selected role.                                                       │
│ AI must not invent records, verify authenticity, determine legal           │
│ equivalence, create mandatory requirements, approve/reject records, decide │
│ eligibility, guarantee assignments, rank workers on unsupported compliance │
│ assumptions, or modify records without confirmation.                       │
└────────────────────────────────────────────────────────────────────────────┘
```

## 5. Mobile Wireframe Revision

Mobile certification cards must communicate all independent dimensions without relying on color
alone.

```text
┌──────────────────────────────┐
│ Certifications        Help   │
│ Action needed: 2             │
└──────────────────────────────┘

┌──────────────────────────────┐
│ SAFETY NOTICE                │
│ Certification != licence     │
│ Verified != assignment-ready │
└──────────────────────────────┘

┌──────────────────────────────┐
│ FOOD SAFETY TRAINING         │
│ Category: Food/kitchen       │
│ Source: Accredited provider  │
│ Review: Verified where app.  │
│ Validity: Active             │
│ Requirement: Assignment req. │
│ Why: configured kitchen role │
│ Expiry: 2027-01-15           │
│ Action: none                 │
│ [View] [Renew] [Evidence]    │
└──────────────────────────────┘

┌──────────────────────────────┐
│ FIRST AID TRAINING           │
│ Source: External provider    │
│ Review: Reviewed             │
│ Validity: Expired            │
│ Requirement: Recommended     │
│ Action: renewal needed       │
│ [Renew] [Get support]        │
└──────────────────────────────┘

┌──────────────────────────────┐
│ ADD CERTIFICATION            │
│ Save draft                   │
│ Submit for review            │
│ Link evidence in Documents   │
│ Upload != verification       │
└──────────────────────────────┘
```

Mobile requirements:

- Text labels for category, source, review, validity, requirement, expiry, and required action.
- Accessible icons may supplement but not replace labels.
- Screen-reader announcements for correction, expired, and verification-unavailable states.
- Keyboard-accessible actions.
- Accessible error association.
- Sufficient contrast.
- Clear focus behavior.
- Plain-language explanations.

## 6. Error and Status States

Required states:

- No certifications.
- Draft record.
- Submitted record.
- Missing evidence.
- Duplicate possible.
- Conflicting dates.
- Invalid expiry date.
- Under review.
- Correction required.
- Rejected.
- Verification unavailable.
- Active.
- Expiring soon.
- Expired.
- No expiry recorded.
- Validity unknown.
- Required source unavailable.
- Employer-issued scope unclear.
- Platform-issued scope unclear.
- Assignment relevance unknown.
- Offline or interrupted save.
- Evidence unavailable.
- Read-only reviewed field.

## 7. Self Validation

| Check | Result |
| --- | --- |
| Architecture Freeze remains unchanged | Pass |
| Epic 3 Planning remains unchanged | Pass |
| Pages 016-019 remain unchanged | Pass |
| Approved Page 019 licence governance remains unchanged | Pass |
| Licence and certification concepts remain separate | Pass |
| Source authority is clear | Pass |
| Review, validity, requirement, and source states are independent | Pass |
| Expired records cannot appear operationally valid | Pass |
| Internal training is not regulator-equivalent | Pass |
| Required certifications have an explainable source | Pass |
| Employer access is restricted | Pass |
| Upload cannot be mistaken for verification | Pass |
| Certification cannot be mistaken for assignment approval | Pass |
| AI cannot verify, approve, create, or rank qualifications | Pass |
| Compliance Relationship Map remains consistent | Pass |
| No implementation started | Pass |
| No Page 021 files created | Pass |

## 8. Governance Confirmation

This document is a low-fidelity wireframe revision only.

No React, frontend, backend, APIs, database models, certification-verification implementation,
background-check implementation, deployment, production data, commit, push, or merge is introduced.
