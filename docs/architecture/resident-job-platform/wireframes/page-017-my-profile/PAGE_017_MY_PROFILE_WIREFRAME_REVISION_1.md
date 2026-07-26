# Page 017 - My Profile Wireframe Revision 1

Status: Approved wireframe candidate
Epic: Epic 3 - Worker Portal
Primary user: Authenticated worker
Architecture baseline: Resident Job Architecture Phase 1 v1.0
Epic planning baseline: Epic 3 Worker Portal Planning v1.0
Source: PAGE_017_MY_PROFILE_LOW_FIDELITY_WIREFRAME.md
Implementation: Not authorized

## 1. Revision Summary

Revision 1 strengthens profile clarity, verification transparency, privacy boundaries, and
editable/read-only distinction.

Changes are strictly limited to:

- Separating Identity Information, Professional Information, Verification Status, and Operational
  Status.
- Making verification states independent and visually distinct.
- Clarifying who can see which profile information.
- Marking profile sections as editable, operational-review required, or read-only system fields.
- Reinforcing AI as advisory only.

No architecture, Epic 3 Planning, UX Foundation, navigation, permissions, APIs, database, or
implementation changes are introduced.

## 2. Profile Structure

The page must never use one combined "profile status" to summarize different workflows.

Profile information is organized into four separate areas:

```text
Identity Information
↓
Professional Information
↓
Verification Status
↓
Operational Status
```

These areas may appear near each other, but their labels, meanings, and actions must remain
distinct.

## 3. Desktop Wireframe

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Resident Job                              My Profile          Help Settings│
│ Worker: [Name]                           Account access: Active           │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ PROFILE OVERVIEW                                                           │
├──────────────────────────────────────┬─────────────────────────────────────┤
│ Identity Information                 │ Profile Completeness                │
│ Name: [Worker name]                  │ 82% complete                        │
│ Preferred language: [Language]       │ Missing: emergency contact,         │
│ Account ID: [Read-only system field] │ credential renewal detail           │
│                                      │ Complete Profile ≠ Approved Worker  │
└──────────────────────────────────────┴─────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ FOUR SEPARATE PROFILE AREAS                                                │
├──────────────────────┬──────────────────────┬──────────────────────────────┤
│ IDENTITY INFO       │ PROFESSIONAL INFO     │ OPERATIONAL STATUS           │
│ Personal/contact    │ Worker group, skills, │ Worker approval: Pending     │
│ fields              │ experience, docs link │ Account state: Active        │
│ [Edit permitted]    │ [Open professional]   │ [View status details]        │
└──────────────────────┴──────────────────────┴──────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ VERIFICATION TRANSPARENCY                                                  │
│ Email verified: Yes                                                        │
│ Identity verification: Pending                                             │
│ Credential review: Needs review                                            │
│ Worker approval: Pending                                                   │
│ Profile completeness: 82%                                                   │
│                                                                            │
│ Email Verified ≠ Identity Verified                                         │
│ Credential Reviewed ≠ Operationally Approved                               │
│ Profile Complete ≠ Approved Worker                                         │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ PRIVACY VISIBILITY                                                         │
├──────────────────────────────┬──────────────────────────────┬──────────────┤
│ WORKER ONLY                  │ SHARED WHEN REQUIRED          │ PLATFORM STAFF│
│ Private contact controls     │ Assignment-relevant profile   │ Review notes  │
│ Privacy preferences          │ details for confirmed work    │ Audit history │
│ Some personal details        │ Limited credential indicators │ Approval state│
│                              │ Not the entire profile        │ Authorized    │
│                              │                              │ staff only    │
└──────────────────────────────┴──────────────────────────────┴──────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ EDITABILITY MAP                                                            │
├──────────────────────────────┬──────────────────────────────┬──────────────┤
│ EDITABLE BY WORKER           │ REQUIRES OPERATIONAL REVIEW   │ READ-ONLY    │
│ Phone                        │ Identity documents            │ Account ID   │
│ Preferred language           │ Credentials                   │ Approval state│
│ Communication preferences    │ Licences                      │ Audit history│
│ Emergency contact placeholder│ Qualification changes         │ System status│
└──────────────────────────────┴──────────────────────────────┴──────────────┘

┌──────────────────────────────────────┬─────────────────────────────────────┐
│ PERSONAL / CONTACT INFORMATION       │ LANGUAGE / COMMUNICATION            │
│ Phone, email, address fields         │ Preferred language                   │
│ Field labels show editable/review    │ Email / SMS / in-app preferences     │
│ status                               │ [Update preferences]                 │
│ [Edit permitted fields]              │                                     │
└──────────────────────────────────────┴─────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ AI PROFILE GUIDANCE - SUGGESTIONS ONLY                                    │
│ AI may suggest missing information, highlight incomplete sections, and      │
│ recommend profile improvements.                                            │
│ AI does not change profile data, approve identity, approve credentials,     │
│ approve workers, or modify operational status.                             │
│ [Review suggestions]                                                       │
└────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────┬──────────────────────────────┬──────────────┐
│ QUICK LINKS                  │ PRIVACY CONTROLS             │ SECURITY     │
│ [Documents]                  │ [Review visibility]          │ Never share  │
│ [Availability]               │ [Privacy requests]           │ codes        │
│ [Settings]                   │                              │ [Settings]   │
└──────────────────────────────┴──────────────────────────────┴──────────────┘
```

## 4. Mobile Wireframe

Mobile order must preserve the separation between identity, professional information,
verification, and operational status.

```text
┌──────────────────────────────┐
│ My Profile            Help   │
│ Account access: Active       │
└──────────────────────────────┘

┌──────────────────────────────┐
│ PROFILE COMPLETENESS         │
│ 82% complete                 │
│ Profile Complete             │
│ ≠ Approved Worker            │
│ [Review missing items]       │
└──────────────────────────────┘

┌──────────────────────────────┐
│ IDENTITY INFORMATION         │
│ Name, contact basics         │
│ Some fields editable         │
│ [Edit permitted fields]      │
└──────────────────────────────┘

┌──────────────────────────────┐
│ PROFESSIONAL INFORMATION     │
│ Worker group, skills, docs   │
│ Some items require review    │
│ [Open professional info]     │
└──────────────────────────────┘

┌──────────────────────────────┐
│ VERIFICATION STATUS          │
│ Email verified: Yes          │
│ Identity: Pending            │
│ Credentials: Needs review    │
│ All statuses are separate    │
└──────────────────────────────┘

┌──────────────────────────────┐
│ OPERATIONAL STATUS           │
│ Worker approval: Pending     │
│ Account state: Active        │
│ [View status details]        │
└──────────────────────────────┘

┌──────────────────────────────┐
│ PRIVACY VISIBILITY           │
│ Worker only                  │
│ Shared when required         │
│ Platform staff only          │
│ [Review visibility]          │
└──────────────────────────────┘

┌──────────────────────────────┐
│ EDITABILITY MAP              │
│ Editable                     │
│ Requires review              │
│ Read-only system field       │
└──────────────────────────────┘

┌──────────────────────────────┐
│ AI SUGGESTIONS               │
│ Missing information only     │
│ AI does not approve or edit  │
│ [Review suggestions]         │
└──────────────────────────────┘

┌──────────────────────────────┐
│ QUICK LINKS                  │
│ Documents                    │
│ Availability                 │
│ Settings                     │
└──────────────────────────────┘
```

## 5. Independent Verification States

Each status must have its own visible label, explanation, and next step.

```text
Email Verified
Confirms account email control only.
Does not confirm identity or worker approval.

Identity Verification
Confirms identity-review workflow status where applicable.
Does not confirm credentials or operational approval.

Credential Review
Confirms document or credential-review workflow status where applicable.
Does not confirm shift eligibility for every assignment.

Worker Approval
Confirms operational worker status.
Does not guarantee shifts, earnings, or assignments.

Profile Completeness
Shows whether required profile fields are filled.
Does not approve the worker.
```

Do not merge these states into one badge or one progress score.

## 6. Privacy Visibility Rules

Profile information must be categorized by visibility:

Worker only:

- Privacy preferences.
- Personal account controls.
- Some contact and personal details.
- Sensitive support request paths.

May be shared with employers when required for an assignment:

- Assignment-relevant name or display name.
- Role or worker group.
- Relevant approved credential indicators.
- Operational contact path, where permitted.

Visible only to authorized platform staff:

- Review notes.
- Audit history.
- Approval state details.
- Internal operational status details.

The page must not imply employers can view the entire worker profile.

## 7. Editable vs Read-Only Rules

Editable by worker:

- Phone.
- Preferred language.
- Communication preferences.
- Emergency contact placeholder.
- Some non-reviewed profile details.

Requires operational review:

- Identity documents.
- Credentials.
- Licences.
- Professional qualification changes.
- Worker group changes.

Read-only system fields:

- Account ID.
- Approval state.
- Audit history.
- System status.
- Review decision history.

Read-only fields may explain the support or review path, but the worker cannot directly edit them.

## 8. AI Boundary

AI may:

- Suggest missing information.
- Highlight incomplete sections.
- Recommend profile improvements.

AI must not:

- Change profile data automatically.
- Approve identity.
- Approve credentials.
- Approve workers.
- Modify operational status.
- Expose hidden review notes or audit details.

AI suggestions are guidance only and require worker action or authorized human review where
applicable.

## 9. Accessibility

- Section headings must make the four profile areas clear.
- Editable, review-required, and read-only fields must have text labels.
- Visibility categories must not rely on color alone.
- Mobile order must preserve meaning and not collapse statuses into one badge.
- Keyboard focus follows profile completeness, identity, professional information, verification,
  operational status, privacy, editability, AI, quick links.
- Screen-reader labels must include status meaning and next step.

## 10. Self Validation

| Check | Result |
| --- | --- |
| Architecture Freeze unchanged | Pass |
| Epic 3 Planning unchanged | Pass |
| UX Foundation unchanged | Pass |
| Navigation unchanged | Pass |
| Worker Dashboard unchanged | Pass |
| Identity / Professional / Verification / Operational areas separated | Pass |
| Verification states are independent | Pass |
| Profile Complete ≠ Approved Worker | Pass |
| Email Verified ≠ Identity Verified | Pass |
| Credential Reviewed ≠ Operationally Approved | Pass |
| Privacy visibility categories are explicit | Pass |
| Editable / review-required / read-only fields are labeled | Pass |
| AI remains advisory | Pass |
| No implementation started | Pass |
| Page 018 remains blocked pending approval | Pass |

## 11. Governance Confirmation

This document is a controlled wireframe revision only.

No React, frontend, backend, APIs, database models, identity verification implementation,
credential review implementation, deployment, or production data are introduced.
