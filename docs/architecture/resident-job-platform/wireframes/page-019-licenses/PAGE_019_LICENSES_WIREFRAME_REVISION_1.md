# Page 019 - Licenses Wireframe Revision 1

Status: Approved wireframe candidate
Epic: Epic 3 - Worker Portal
Primary user: Authenticated worker
Architecture baseline: Resident Job Architecture Phase 1 v1.0
Epic planning baseline: Epic 3 Worker Portal Planning v1.0
Source: PAGE_019_LICENSES_LOW_FIDELITY_WIREFRAME.md
Implementation: Not authorized

## 1. Revision Summary

Revision 1 strengthens licence governance, validity, privacy, and verification transparency.

Changes are strictly limited to:

- Separating worker record state, platform review state, and licence validity.
- Strengthening expiry and unknown-validity handling.
- Protecting licence identifiers through default masking.
- Limiting employer visibility to assignment-relevant facts.
- Removing unsupported verification language.
- Clarifying jurisdiction and regulated-role boundaries.
- Strengthening supporting-document, correction, rejection, AI, mobile, and accessibility rules.

No architecture, Epic 3 Planning, UX Foundation, navigation, Pages 017 or 018, APIs, database, or
implementation changes are introduced.

## 2. Licence Governance Boundary

Every licence record must show three independent dimensions:

```text
Worker Record State
Draft / Submitted

Platform Review State
Not reviewed / Under review / Verified where applicable / Correction required / Rejected /
Verification unavailable

Licence Validity
Active / Expiring soon / Expired / Unknown where expiry date is unavailable
```

These dimensions must not be combined into one generic status.

## 3. Required Truth Statements

```text
Submitted
≠
Reviewed

Reviewed
≠
Verified

Verified
≠
Currently valid

Currently valid
≠
Worker approved for every assignment

Evidence uploaded
≠
Evidence reviewed

Evidence reviewed
≠
Licence verified

Licence verified
≠
Assignment approved
```

## 4. Desktop Wireframe

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Resident Job                                      Licenses     Help Profile│
│ Worker: [Name]                  Page status: Saved / Review needed        │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ LICENCE SUMMARY                                                            │
├────────────────────┬────────────────────┬────────────────────┬────────────┤
│ Total records      │ Active validity    │ Expiring soon      │ Expired    │
│ 3                  │ 1                  │ 1                  │ 1          │
├────────────────────┼────────────────────┼────────────────────┼────────────┤
│ Unknown validity   │ Under review       │ Correction required│ Rejected   │
│ 1                  │ 1                  │ 1                  │ 0          │
├────────────────────┴────────────────────┴────────────────────┴────────────┤
│ No generic "Licensed Worker" badge is displayed.                          │
│ Expired licences never appear active because an earlier review succeeded.  │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ CRITICAL LICENCE ATTENTION                                                 │
│ [!] Expired: [Licence category] - cannot appear operationally valid         │
│ [!] Unknown validity: expiry date unavailable                              │
│ [!] Correction requested: issuing authority mismatch                        │
│ [Renew] [Correct information] [Link evidence] [View review status]         │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ LICENCE RECORD CARD                                                        │
├──────────────────────────────────────┬─────────────────────────────────────┤
│ Licence category: Food safety        │ Issuing authority: [Configurable]   │
│ Jurisdiction: [Region]               │ Licence identifier: ending in 4821  │
│ Issue date: 2024-09-30               │ Expiry date: 2026-09-30             │
│ Last review date: 2026-07-22         │ Last update: 2026-07-22             │
├──────────────────────────────────────┴─────────────────────────────────────┤
│ Worker record state: Submitted                                             │
│ Platform review state: Verified where applicable                           │
│ Licence validity: Expiring soon                                            │
│ Warning: Verified review does not override expiry or jurisdiction limits.  │
├────────────────────────────────────────────────────────────────────────────┤
│ Supporting document reference: [Open Documents workflow]                   │
│ Evidence uploaded ≠ evidence reviewed ≠ licence verified                   │
│ [View details] [Renew] [Link evidence] [View review status]                │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ CORRECTION REQUIRED CARD                                                   │
│ Licence category: [Configurable]                                           │
│ Worker record state: Submitted                                             │
│ Platform review state: Correction required                                 │
│ Licence validity: Unknown                                                  │
│ Reason: Issuing authority could not be matched to the selected category.   │
│ Affected field/document: Issuing authority and supporting evidence          │
│ Requested action: Correct authority or link replacement evidence           │
│ Last update: 2026-07-22                                                    │
│ [Correct information] [Link evidence] [Contact support]                    │
│ Note: Plain language only. Do not expose internal reviewer notes.          │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ REJECTED RECORD CARD                                                       │
│ Platform review state: Rejected                                            │
│ Validity state: separate from rejection                                    │
│ Safe reason where permitted: record could not be accepted as submitted     │
│ Internal reviewer notes are not exposed                                    │
│ Record and audit history are preserved                                     │
│ Rejection ≠ expiry                                                         │
│ [View allowed details] [Contact support]                                   │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ EXPIRY AND RENEWAL                                                         │
│ Exact expiry date: shown where known                                      │
│ Expiring-soon status: configurable threshold                               │
│ Expired status: clearly labeled and never treated as active                │
│ Renewal action: [Renew]                                                    │
│ Replacement evidence: required through Documents workflow where applicable │
│ Last review date: visible separately from expiry date                      │
│ Unknown validity warning: shown when expiry cannot be determined           │
│ No universal grace period or universal renewal timeline is invented.       │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ LICENCE IDENTIFIER PRIVACY                                                 │
│ Default display: masked identifier                                         │
│ Examples: •••• 4821 / ending in 4821                                      │
│ Full licence numbers do not appear publicly, in worker lists, employer     │
│ search results, general assignment screens, or notifications.              │
│ Full identifiers are visible only to the worker, specifically authorized   │
│ review staff, or legally authorized operational users where required.      │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ EMPLOYER VISIBILITY                                                        │
│ Employer-visible information is role- and assignment-specific.             │
│ May include: licence category, jurisdiction, current validity state,       │
│ platform review state where appropriate, and relevant restrictions only    │
│ when operationally necessary.                                              │
│ Employers do not receive unrestricted access to full licence numbers,      │
│ uploaded evidence, private notes, rejection history, correction history,   │
│ or internal audit information.                                             │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ JURISDICTION AND REGULATED-ROLE BOUNDARY                                  │
│ Licence requirements vary by jurisdiction.                                │
│ A licence may be valid only for a specific region.                         │
│ One licence may not authorize every task.                                  │
│ Platform review does not replace the issuing authority.                    │
│ Assignment eligibility may require additional checks.                      │
│ Licence authorities, formats, terminology, and renewal rules are           │
│ configurable. No country is hardcoded as a universal model.                │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ SUPPORTING DOCUMENT BOUNDARY                                               │
│ Licence record → Supporting document reference → Documents workflow         │
│ The Licenses page may reference evidence but is not document storage.       │
│ Evidence uploaded ≠ evidence reviewed                                      │
│ Evidence reviewed ≠ licence verified                                      │
│ Licence verified ≠ assignment approved                                    │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ AI LICENCE GUIDANCE - SUGGESTIONS ONLY                                    │
│ AI may identify missing fields, flag inconsistent dates, detect possible  │
│ duplicates, remind the worker of upcoming expiry, and suggest a standard  │
│ licence category.                                                         │
│ AI must not verify authenticity, determine legal practice authority,       │
│ approve/reject a licence, infer jurisdictional eligibility, contact        │
│ regulators without an approved future workflow, edit licence data without  │
│ worker confirmation, or make final assignment decisions.                  │
└────────────────────────────────────────────────────────────────────────────┘
```

## 5. Mobile Wireframe

Mobile users must distinguish review state, validity state, expiry date, and required action
without relying on color alone.

```text
┌──────────────────────────────┐
│ Licenses              Help   │
│ Status: Action needed        │
└──────────────────────────────┘

┌──────────────────────────────┐
│ SUMMARY                      │
│ Active validity: 1           │
│ Expiring soon: 1             │
│ Expired: 1                   │
│ Unknown validity: 1          │
│ Correction required: 1       │
│ No "Licensed Worker" badge   │
└──────────────────────────────┘

┌──────────────────────────────┐
│ HIGH PRIORITY ACTIONS        │
│ [Renew]                      │
│ [Correct information]        │
│ [Link evidence]              │
│ [View review status]         │
└──────────────────────────────┘

┌──────────────────────────────┐
│ LICENCE CARD                 │
│ Category: Food safety        │
│ Identifier: ending in 4821   │
│ Jurisdiction: [Region]       │
│ Expiry: 2026-09-30           │
│ Last review: 2026-07-22      │
│ Record: Submitted            │
│ Review: Verified where       │
│ applicable                   │
│ Validity: Expiring soon      │
│ Verified ≠ currently valid   │
│ [Renew] [Review status]      │
└──────────────────────────────┘

┌──────────────────────────────┐
│ CORRECTION REQUIRED          │
│ Reason: authority mismatch   │
│ Field: issuing authority     │
│ Action: correct or link      │
│ replacement evidence         │
│ [Correct] [Support]          │
└──────────────────────────────┘

┌──────────────────────────────┐
│ PRIVACY                      │
│ Employer visibility is       │
│ assignment-specific          │
│ Full numbers are masked      │
│ Documents live elsewhere     │
└──────────────────────────────┘
```

## 6. Unsupported Verification Language

Avoid unsupported terms:

- Certified professional.
- Fully licensed.
- Legally approved.
- Platform-approved practitioner.
- Eligible for all work.

Use truthful states only:

- Draft.
- Submitted.
- Not reviewed.
- Under review.
- Verified where applicable.
- Correction required.
- Rejected.
- Verification unavailable.
- Active.
- Expiring soon.
- Expired.
- Unknown validity.

Verification unavailable must not be silently converted into rejection or approval.

## 7. Correction and Rejection Experience

Correction-required states show:

- Reason in plain language.
- Affected field or document.
- Requested action.
- Resubmission path.
- Support path.
- Last update.

Rejected states show:

- Safe, factual reason where permitted.
- No internal reviewer notes.
- Rejection distinct from expiry.
- Preserved record and audit history.

Language must not be punitive or accusatory.

## 8. Accessibility

- Review state, validity state, expiry date, and required action use clear text labels.
- Icons must have accessible labels.
- Status changes are announced to screen readers where appropriate.
- Errors are associated with affected fields.
- Actions are keyboard-accessible.
- Contrast is sufficient.
- High-priority mobile actions include Renew, Correct information, Link evidence, and View review
  status.

## 9. Self Validation

| Check | Result |
| --- | --- |
| Architecture unchanged | Pass |
| Epic 3 Planning unchanged | Pass |
| UX Foundation unchanged | Pass |
| Navigation unchanged | Pass |
| Pages 017 and 018 unchanged | Pass |
| Record state, review state, and validity are independent | Pass |
| Expired licence cannot appear operationally valid | Pass |
| Full licence identifiers are protected | Pass |
| Employer access is restricted | Pass |
| Upload cannot be mistaken for verification | Pass |
| Jurisdictional limits are clear | Pass |
| AI does not verify or approve licences | Pass |
| Correction and rejection experience is safe and factual | Pass |
| No new governance or legal-authority risk introduced | Pass |
| No implementation started | Pass |
| Page 020 remains blocked pending approval | Pass |

## 10. Governance Confirmation

This document is a controlled wireframe revision only.

No React, frontend, backend, APIs, database models, licence-verification implementation,
deployment, or production data are introduced.
