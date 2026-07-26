# Page 018 - Professional Information Low-Fidelity Wireframe

Status: Product Design Review ready
Epic: Epic 3 - Worker Portal
Primary user: Authenticated worker
Architecture baseline: Resident Job Architecture Phase 1 v1.0
Epic planning baseline: Epic 3 Worker Portal Planning v1.0
Implementation: Not authorized

## 1. Purpose

The Professional Information page lets an authenticated worker present and manage professional
background information.

The page allows the worker to:

- Present professional background.
- Record work experience.
- Record preferred roles.
- Record skills and specialties.
- Record education and training.
- Record employment preferences.
- Understand which information is editable, reviewed, or verified elsewhere.

The page must not:

- Approve credentials.
- Verify licences.
- Verify identity.
- Approve worker eligibility.
- Approve employment.
- Expose employer-only or admin-only controls.
- Calculate pay or payroll.

## 2. Core Boundary

Professional information is not the same as credential verification or worker approval.

```text
Professional profile complete
≠
Credentials verified
≠
Worker approved
```

Role selection, skill selection, and experience entry are profile inputs only. They do not prove
eligibility for regulated roles or guarantee assignments.

## 3. Information Hierarchy

Primary:

- Professional summary.
- Role categories.
- Verification and review states.
- Profile completeness indicator.

Secondary:

- Work experience.
- Education and training.
- Skills and specialties.
- Languages.
- Work preferences.

Tertiary:

- Availability boundary.
- Compensation preferences.
- Privacy boundaries.
- AI suggestions.
- Related workflow links.

## 4. Desktop Wireframe

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Resident Job                    Professional Information       Help Profile│
│ Worker: [Name]                  Page status: Draft / Saved / Review needed│
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ PROFESSIONAL SUMMARY                                                       │
├─────────────────────────────────────────┬──────────────────────────────────┤
│ Current or preferred role: [Configurable]│ Profile completeness: 76%        │
│ Years of experience: [Self-reported]     │ Missing: work preferences,       │
│ Short introduction:                      │ education document link          │
│ [Worker-written summary]                 │                                  │
│ Primary categories: Kitchen, Care         │ Professional profile complete    │
│                                          │ ≠ Credentials verified           │
│ [Edit summary]                           │ ≠ Worker approved                │
└─────────────────────────────────────────┴──────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ ROLE CATEGORIES - CONFIGURABLE AND COUNTRY-NEUTRAL                         │
├────────────────────────────┬────────────────────────────┬──────────────────┤
│ CARE                       │ KITCHEN                    │ OPERATIONS       │
│ [ ] Nurse                  │ [x] Chef                   │ [ ] Housekeeping │
│ [ ] Practical nurse        │ [ ] Sous-chef              │ [ ] Cleaning     │
│ [ ] Personal support/care  │ [x] Cook                   │ [ ] Maintenance  │
│ [ ] Beneficiary attendant  │ [ ] Kitchen helper         │ [ ] Reception    │
│ where applicable           │ [ ] Dishwasher             │ [ ] Admin        │
│                            │ [ ] Dietary aide           │                  │
│ Note: role selection does not prove eligibility.                           │
└────────────────────────────┴────────────────────────────┴──────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ VERIFICATION AND REVIEW STATES                                             │
│ Self-reported: professional summary, experience, preferences                │
│ Worker-confirmed: saved by worker                                          │
│ Document submitted: evidence sent through Documents workflow                │
│ Under review: platform review in progress where applicable                  │
│ Verified where applicable: only after approved workflow                     │
│ Correction required: worker action needed                                  │
│ Verification unavailable: no verification workflow available                │
│                                                                            │
│ No generic "Professional Verified" badge is used.                           │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ WORK EXPERIENCE                                                            │
├──────────────┬──────────────┬──────────────┬──────────────┬────────────────┤
│ Role title   │ Organization │ Type         │ Dates        │ Review status  │
│ Chef         │ [Name]       │ Residence    │ 2023-current │ Self-reported  │
│ Duties: menu prep, special diets, kitchen coordination                     │
│ Location: [Country/region placeholder]                                     │
│ Reference status: Optional / not required here                             │
│ [Edit] [Add experience]                                                    │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ EDUCATION AND TRAINING                                                     │
├─────────────────────────────────────────┬──────────────────────────────────┤
│ Institution: [Name]                     │ Program / qualification: [Name]  │
│ Field: [Configurable]                   │ Completion status: Complete      │
│ Completion date: [Date]                 │ Country or region: [Placeholder] │
│ Supporting document: [Open Documents workflow]                             │
│ Self-reported education ≠ Verified credential                              │
└─────────────────────────────────────────┴──────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ SKILLS AND SPECIALTIES                                                     │
│ [ ] Dementia care experience       [x] Food safety                         │
│ [ ] Medication-support experience  [x] Special diets                       │
│ [ ] Mobility assistance            [ ] Infection-control training          │
│ [x] Housekeeping procedures        [ ] Scheduling / admin skills           │
│ [x] Language skills                                                        │
│ Avoid clinical-scope claims unless reviewed and legally appropriate.        │
└────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────┬─────────────────────────────────────┐
│ LANGUAGES                            │ WORK PREFERENCES                    │
│ Language: French                     │ Preferred roles: Chef, Cook         │
│ Proficiency: Advanced                │ Departments: Kitchen                │
│ Speaking: Yes                        │ Shifts: day/evening                 │
│ Reading: Yes                         │ Weekdays/weekends: flexible         │
│ Writing: Yes                         │ Travel willingness: 30 minutes      │
│ Preferred working language: French   │ Recurring shifts: interested        │
│ Do not use language as a             │ Preferences guide recommendations.  │
│ discriminatory ranking signal.       │ They do not guarantee assignments.  │
└──────────────────────────────────────┴─────────────────────────────────────┘

┌──────────────────────────────────────┬─────────────────────────────────────┐
│ AVAILABILITY BOUNDARY                │ COMPENSATION PREFERENCES            │
│ Summary only: availability managed   │ Desired rate range: preference only │
│ in the dedicated Availability        │ Travel expectations: configurable   │
│ Calendar page.                       │ Preferred shift duration: optional │
│ [Open Availability Calendar]         │ Preference ≠ guaranteed pay         │
│                                      │ ≠ employer billing ≠ final comp.    │
└──────────────────────────────────────┴─────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ FIELD EDITABILITY                                                          │
├────────────────────────────┬────────────────────────────┬──────────────────┤
│ EDITABLE BY WORKER         │ MAY REQUIRE REVIEW         │ READ-ONLY STATUS │
│ Professional summary       │ Education claims           │ Review state     │
│ Preferences                │ Role qualifications        │ Approval state   │
│ Experience descriptions    │ Regulated-role claims      │ Audit metadata   │
│ Skills                     │ Supporting documents       │ System history   │
│ Languages                  │ Licences                   │                  │
└────────────────────────────┴────────────────────────────┴──────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ PRIVACY AND EMPLOYER VISIBILITY                                            │
├────────────────────────────┬────────────────────────────┬──────────────────┤
│ WORKER ONLY                │ EMPLOYER VISIBLE WHEN      │ AUTHORIZED STAFF │
│ Draft entries              │ OPERATIONALLY REQUIRED     │ Review status    │
│ Private notes              │ Relevant role              │ Evidence links   │
│ Incomplete entries         │ Approved experience summary│ Correction history│
│                            │ Relevant skills            │                  │
│                            │ Assignment qualifications  │                  │
│ Employers do not see all professional records.                             │
└────────────────────────────┴────────────────────────────┴──────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ AI PROFESSIONAL GUIDANCE - SUGGESTIONS ONLY                               │
│ AI may suggest missing fields, standardized role labels, inconsistent date │
│ warnings, relevant skills, and formatting improvements to worker text.     │
│ AI does not invent experience, add qualifications, verify credentials,     │
│ approve regulated roles, determine eligibility, rank using protected       │
│ characteristics, or change information without worker confirmation.        │
└────────────────────────────────────────────────────────────────────────────┘
```

## 5. Mobile Wireframe

Mobile editing is section-by-section with short forms and clear review states.

```text
┌──────────────────────────────┐
│ Professional Info      Help  │
│ Status: Saved / Draft        │
└──────────────────────────────┘

┌──────────────────────────────┐
│ PROFESSIONAL SUMMARY         │
│ Preferred role: Chef         │
│ Experience: self-reported    │
│ 76% complete                 │
│ Profile complete             │
│ ≠ credentials verified       │
│ ≠ worker approved            │
│ [Edit summary]               │
└──────────────────────────────┘

┌──────────────────────────────┐
│ ROLE CATEGORIES              │
│ Care / Kitchen / Operations  │
│ Selection does not prove     │
│ eligibility                  │
│ [Edit roles]                 │
└──────────────────────────────┘

┌──────────────────────────────┐
│ REVIEW STATES                │
│ Self-reported                │
│ Worker-confirmed             │
│ Document submitted           │
│ Under review                 │
│ Verified where applicable    │
│ Correction required          │
└──────────────────────────────┘

┌──────────────────────────────┐
│ WORK EXPERIENCE              │
│ 2 entries                    │
│ [Add / edit experience]      │
└──────────────────────────────┘

┌──────────────────────────────┐
│ EDUCATION AND TRAINING       │
│ Self-reported education      │
│ ≠ verified credential        │
│ [Edit] [Open documents]      │
└──────────────────────────────┘

┌──────────────────────────────┐
│ SKILLS AND SPECIALTIES       │
│ Food safety, special diets   │
│ [Edit skills]                │
└──────────────────────────────┘

┌──────────────────────────────┐
│ LANGUAGES                    │
│ Language / proficiency       │
│ [Edit languages]             │
└──────────────────────────────┘

┌──────────────────────────────┐
│ WORK PREFERENCES             │
│ Preferences guide            │
│ recommendations only         │
│ [Edit preferences]           │
└──────────────────────────────┘

┌──────────────────────────────┐
│ AVAILABILITY                 │
│ Summary only                 │
│ [Open Availability Calendar] │
└──────────────────────────────┘

┌──────────────────────────────┐
│ COMPENSATION PREFERENCES     │
│ Preference only              │
│ Not guaranteed pay           │
│ [Edit preferences]           │
└──────────────────────────────┘

┌──────────────────────────────┐
│ PRIVACY VISIBILITY           │
│ Worker only                  │
│ Employer-visible when needed │
│ Authorized staff only        │
└──────────────────────────────┘
```

## 6. Role Category Rules

Role names are configurable and country-neutral.

Examples:

- Care: Nurse, practical nurse, personal support or care worker, beneficiary attendant where
  applicable.
- Kitchen: Chef, sous-chef, cook, kitchen helper, dishwasher, dietary aide.
- Operations: housekeeping, cleaning, maintenance, reception, administration.

Selecting a role does not:

- Prove eligibility.
- Verify credentials.
- Approve regulated-role work.
- Guarantee assignments.

## 7. Work Experience Fields

Each work experience entry may include:

- Role title.
- Organization.
- Organization type.
- Start date.
- End date or current.
- Employment type.
- Key duties.
- Location.
- Optional supervisor or reference status.

The form must not require unnecessary personal details about former employers.

## 8. Education and Training Fields

Each education or training entry may include:

- Institution.
- Program or qualification.
- Field.
- Completion status.
- Completion date.
- Country or region.
- Supporting-document link to the separate Documents workflow.

Self-reported education does not equal verified credential.

## 9. Skills and Specialties Guidance

Examples may include:

- Dementia care experience.
- Medication-support experience.
- Food safety.
- Special diets.
- Mobility assistance.
- Housekeeping procedures.
- Infection-control training.
- Scheduling or administrative skills.
- Language skills.

Avoid clinical-scope claims unless later verified and legally appropriate.

## 10. Availability Boundary

Professional Information may summarize availability preferences only.

Actual availability management belongs to:

```text
Page 022 - Availability Calendar
```

Do not duplicate full availability workflow on Page 018.

## 11. Compensation Boundary

Compensation preferences are non-binding and configurable.

Examples:

- Desired rate range.
- Travel expectations.
- Preferred shift duration.

Clarify:

```text
Preference
≠
Guaranteed pay
≠
Employer billing
≠
Final compensation
```

This section must follow the Financial UX Standard.

## 12. Error and Status States

Required states:

- Empty profile.
- Partially complete.
- Saved.
- Unsaved changes.
- Validation error.
- Duplicate experience entry.
- Conflicting dates.
- Review pending.
- Correction requested.
- Offline or interrupted save.
- Read-only reviewed field.

## 13. Accessibility

- Use semantic form structure.
- Support keyboard navigation.
- Use accessible date fields.
- Associate errors with fields.
- Announce save, error, review, and correction states.
- Manage focus after save or validation failure.
- Never rely on color-only review states.
- Use plain language.
- Maintain sufficient contrast.
- Use large touch targets for mobile section editing.

## 14. International Readiness

- Keep role names configurable.
- Keep regulated-role labels configurable by jurisdiction.
- Avoid hardcoded legal, clinical, payroll, or licensing claims.
- Support future localization and right-to-left layouts.
- Keep dates, locations, credentials, and language labels localization-ready.

## 15. Self Validation

| Check | Result |
| --- | --- |
| Architecture Freeze unchanged | Pass |
| Epic 3 Planning unchanged | Pass |
| UX Foundation unchanged | Pass |
| Navigation unchanged | Pass |
| Page 017 My Profile consistency preserved | Pass |
| Self-reported and verified information separated | Pass |
| Role selection does not prove eligibility | Pass |
| Employer visibility is limited | Pass |
| Professional information and credentials remain separate | Pass |
| Pay preferences are not guaranteed | Pass |
| AI cannot invent or approve qualifications | Pass |
| Mobile-first layout included | Pass |
| Accessibility considerations included | Pass |
| No implementation introduced | Pass |
| Page 019 not created | Pass |

## 16. Governance Confirmation

This document is a low-fidelity wireframe only.

No React, frontend, backend, APIs, database models, credential-verification implementation,
licence-verification implementation, payroll logic, deployment, or production data are introduced.
