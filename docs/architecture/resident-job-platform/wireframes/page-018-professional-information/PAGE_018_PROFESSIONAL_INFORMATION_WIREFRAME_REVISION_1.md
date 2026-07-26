# Page 018 - Professional Information Wireframe Revision 1

Status: Approved wireframe candidate
Epic: Epic 3 - Worker Portal
Primary user: Authenticated worker
Architecture baseline: Resident Job Architecture Phase 1 v1.0
Epic planning baseline: Epic 3 Worker Portal Planning v1.0
Source: PAGE_018_PROFESSIONAL_INFORMATION_LOW_FIDELITY_WIREFRAME.md
Implementation: Not authorized

## 1. Revision Summary

Revision 1 strengthens professional-information governance and verification transparency.

Changes are strictly limited to:

- Making the professional-information hierarchy explicit and sequential.
- Adding review-state labels to every professional section.
- Separating self-reported, awaiting review, verified where applicable, verification unavailable,
  and correction-requested states.
- Clarifying employer visibility.
- Clarifying professional preferences as non-binding recommendation inputs.
- Reinforcing AI and privacy boundaries.

No architecture, Epic 3 Planning, UX Foundation, navigation, permissions, APIs, database, or
implementation changes are introduced.

## 2. Required Professional Information Hierarchy

The page follows this order and must not visually merge the sections:

```text
Professional Summary
↓
Work Experience
↓
Education
↓
Skills & Specialties
↓
Languages
↓
Work Preferences
↓
Verification Status
```

Each section has its own content, status, visibility, and next action.

## 3. Desktop Wireframe

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Resident Job                    Professional Information       Help Profile│
│ Worker: [Name]                  Page status: Saved / Draft / Review needed│
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ PROFESSIONAL SUMMARY                                                       │
│ Review state: Self-reported / Awaiting review / Correction requested       │
├────────────────────────────────────────┬───────────────────────────────────┤
│ Preferred role: Chef                   │ Profile completeness: 76%         │
│ Years of experience: self-reported     │ Missing: work preferences,        │
│ Introduction: [Worker-written text]    │ education document link           │
│ Primary categories: Kitchen, Care      │ Professional profile complete     │
│ [Edit summary]                         │ ≠ Credentials verified            │
│                                        │ ≠ Worker approved                 │
└────────────────────────────────────────┴───────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ WORK EXPERIENCE                                                            │
│ Review state per entry: Self-reported / Awaiting review / Verified where   │
│ applicable / Verification unavailable / Correction requested                │
├──────────────┬──────────────┬──────────────┬──────────────┬────────────────┤
│ Role title   │ Organization │ Type         │ Dates        │ Review state   │
│ Chef         │ [Name]       │ Residence    │ 2023-current │ Self-reported  │
│ Duties: menu prep, special diets, kitchen coordination                     │
│ Location: [Country/region placeholder]                                     │
│ Self-reported experience ≠ verified employment history                     │
│ [Edit] [Add experience]                                                    │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ EDUCATION                                                                  │
│ Review state per entry: Self-reported / Awaiting review / Verified where   │
│ applicable / Verification unavailable / Correction requested                │
├────────────────────────────────────────┬───────────────────────────────────┤
│ Institution: [Name]                    │ Program / qualification: [Name]   │
│ Field: [Configurable]                  │ Completion status: Complete       │
│ Completion date: [Date]                │ Country or region: [Placeholder]  │
│ Supporting document: [Open Documents workflow]                             │
│ Self-reported education ≠ verified qualification                           │
└────────────────────────────────────────┴───────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ SKILLS & SPECIALTIES                                                       │
│ Review state per item: Self-reported / Awaiting review / Verified where    │
│ applicable / Verification unavailable / Correction requested                │
│ [ ] Dementia care experience       [x] Food safety                         │
│ [ ] Medication-support experience  [x] Special diets                       │
│ [ ] Mobility assistance            [ ] Infection-control training          │
│ [x] Housekeeping procedures        [ ] Scheduling / admin skills           │
│ Selected skill ≠ approved eligibility                                      │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ LANGUAGES                                                                  │
│ Review state: Worker-confirmed / Verification unavailable where applicable │
├────────────────────────────────────────┬───────────────────────────────────┤
│ Language: French                       │ Preferred working language: French│
│ Speaking: Advanced                     │ Reading: Advanced                 │
│ Writing: Intermediate                  │ [Edit languages]                  │
│ Language must not be used as a discriminatory ranking signal.              │
└────────────────────────────────────────┴───────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ WORK PREFERENCES                                                           │
│ Review state: Worker preference / Not an approval / Not an assignment      │
├────────────────────────────┬────────────────────────────┬──────────────────┤
│ Preferred role             │ Preferred location         │ Preferred schedule│
│ Preferred shift length     │ Desired compensation range │ Travel willingness│
│ Preferences influence recommendations only.                                │
│ They are NOT guarantees, approvals, assignments, or pay commitments.        │
└────────────────────────────┴────────────────────────────┴──────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ VERIFICATION STATUS                                                        │
│ Self-reported: entered by worker                                           │
│ Awaiting review: submitted but not decided                                 │
│ Verified where applicable: confirmed through approved workflow              │
│ Verification unavailable: no approved verification workflow exists          │
│ Correction requested: worker must update or clarify information             │
│                                                                            │
│ Self-reported experience ≠ verified employment history                     │
│ Self-reported education ≠ verified qualification                           │
│ Selected role ≠ approved eligibility                                       │
│ No generic "Professional Verified" badge is used.                          │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ EMPLOYER VISIBILITY AND PRIVACY                                            │
├────────────────────────────┬────────────────────────────┬──────────────────┤
│ WORKER ONLY                │ EMPLOYER VISIBLE ONLY WHEN │ PLATFORM STAFF   │
│ Draft entries              │ RELEVANT TO STAFFING       │ ONLY             │
│ Private notes              │ Relevant role              │ Review status    │
│ Incomplete entries         │ Approved experience summary│ Supporting       │
│ Sensitive support notes    │ Relevant skills            │ evidence status  │
│                            │ Assignment qualifications  │ Correction       │
│                            │ Not all professional data  │ history          │
│ Supporting documents live in Documents workflow, not here.                 │
└────────────────────────────┴────────────────────────────┴──────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ AI PROFESSIONAL GUIDANCE - SUGGESTIONS ONLY                               │
│ AI may recommend standardized role names, identify missing information,    │
│ detect inconsistent dates, and suggest profile improvements.               │
│ AI must not invent experience, invent education, verify credentials,       │
│ approve regulated professions, approve employment, or change information   │
│ without worker confirmation.                                               │
└────────────────────────────────────────────────────────────────────────────┘
```

## 4. Mobile Wireframe

Mobile keeps every professional section separated and labels the review state inside each card.

```text
┌──────────────────────────────┐
│ Professional Info      Help  │
│ Status: Saved / Draft        │
└──────────────────────────────┘

┌──────────────────────────────┐
│ PROFESSIONAL SUMMARY         │
│ Review state: Self-reported  │
│ Profile complete             │
│ ≠ credentials verified       │
│ ≠ worker approved            │
│ [Edit summary]               │
└──────────────────────────────┘

┌──────────────────────────────┐
│ WORK EXPERIENCE              │
│ Review state shown per entry │
│ Self-reported experience     │
│ ≠ verified employment        │
│ [Add / edit experience]      │
└──────────────────────────────┘

┌──────────────────────────────┐
│ EDUCATION                    │
│ Review state shown per entry │
│ Self-reported education      │
│ ≠ verified qualification     │
│ [Edit] [Open Documents]      │
└──────────────────────────────┘

┌──────────────────────────────┐
│ SKILLS & SPECIALTIES         │
│ Review state shown per item  │
│ Selected skill               │
│ ≠ approved eligibility       │
│ [Edit skills]                │
└──────────────────────────────┘

┌──────────────────────────────┐
│ LANGUAGES                    │
│ Worker-confirmed             │
│ Not a discriminatory ranking │
│ signal                       │
│ [Edit languages]             │
└──────────────────────────────┘

┌──────────────────────────────┐
│ WORK PREFERENCES             │
│ Recommendations only         │
│ Not guarantees, approvals,   │
│ assignments, or pay commits  │
│ [Edit preferences]           │
└──────────────────────────────┘

┌──────────────────────────────┐
│ VERIFICATION STATUS          │
│ Self-reported                │
│ Awaiting review              │
│ Verified where applicable    │
│ Verification unavailable     │
│ Correction requested         │
└──────────────────────────────┘

┌──────────────────────────────┐
│ PRIVACY VISIBILITY           │
│ Worker only                  │
│ Employer-visible when needed │
│ Platform staff only          │
│ Documents live elsewhere     │
└──────────────────────────────┘
```

## 5. Section-Level Review States

Every professional section must show one of the approved review states:

- Self-reported.
- Awaiting review.
- Verified where applicable.
- Verification unavailable.
- Correction requested.

Do not invent custom review states for professional information.

## 6. Self-Reported vs Verified Rules

The page must preserve these distinctions:

```text
Self-reported experience
≠
Verified employment history

Self-reported education
≠
Verified qualification

Selected role
≠
Approved eligibility
```

Any supporting evidence belongs in the Documents workflow. Page 018 may link to the evidence
workflow, but it does not store, review, or verify documents.

## 7. Employer Visibility Rules

Professional information is categorized as:

Worker only:

- Draft entries.
- Private notes.
- Incomplete entries.
- Sensitive support notes.

Visible to employers only when relevant to staffing:

- Relevant role.
- Approved experience summary.
- Relevant skills.
- Assignment-related qualifications.

Visible only to authorized platform staff:

- Review status.
- Supporting evidence status.
- Correction history.
- Internal review context.

The page must not imply employers have unrestricted access to the worker's professional profile.

## 8. Professional Preference Rules

Professional preferences influence recommendations only.

Examples:

- Preferred role.
- Preferred location.
- Preferred schedule.
- Preferred shift length.
- Desired compensation range.

Preferences are not:

- Guarantees.
- Approvals.
- Assignments.
- Pay commitments.
- Employer billing.
- Final compensation.

## 9. AI Boundary

AI may:

- Recommend standardized role names.
- Identify missing information.
- Detect inconsistent dates.
- Suggest profile improvements.

AI must not:

- Invent work experience.
- Invent education.
- Verify credentials.
- Approve regulated professions.
- Approve employment.
- Determine worker eligibility.
- Rank workers using protected characteristics.
- Change professional information without worker confirmation.

## 10. Privacy Boundary

Sensitive supporting documents belong in the Documents workflow, not on Page 018.

Professional Information may show:

- A link to Documents.
- A document-submitted status.
- A review-state label.

It must not expose:

- Full sensitive document contents.
- Internal reviewer notes to employers.
- Private worker notes to employers.
- Platform-only correction history to employers.

## 11. Accessibility

- Review states must use text labels, not color alone.
- Each card must have a semantic heading.
- Screen-reader labels must include section name, review state, and next action.
- Keyboard focus follows the required hierarchy from Professional Summary through Verification
  Status.
- Errors must describe what needs correction.
- Mobile cards must keep status text visible without horizontal scrolling.

## 12. Self Validation

| Check | Result |
| --- | --- |
| Architecture Freeze unchanged | Pass |
| Epic 3 Planning unchanged | Pass |
| UX Foundation unchanged | Pass |
| Navigation unchanged | Pass |
| Worker Profile unchanged | Pass |
| Required hierarchy is explicit | Pass |
| Every professional section has a review-state model | Pass |
| Self-reported cannot be mistaken for verified | Pass |
| Employer visibility is explicit and limited | Pass |
| Preferences are non-binding | Pass |
| AI cannot invent, verify, or approve | Pass |
| Sensitive documents remain in Documents workflow | Pass |
| No new governance risks introduced | Pass |
| No implementation started | Pass |
| Page 019 remains blocked pending approval | Pass |

## 13. Governance Confirmation

This document is a controlled wireframe revision only.

No React, frontend, backend, APIs, database models, credential-verification implementation,
deployment, or production data are introduced.
