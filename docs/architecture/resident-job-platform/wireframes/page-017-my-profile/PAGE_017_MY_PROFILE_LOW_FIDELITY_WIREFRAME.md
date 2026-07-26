# Page 017 - My Profile Low-Fidelity Wireframe

Status: Product Design Review ready
Epic: Epic 3 - Worker Portal
Primary user: Authenticated worker
Architecture baseline: Resident Job Architecture Phase 1 v1.0
Epic planning baseline: Epic 3 Worker Portal Planning v1.0
Implementation: Not authorized

## 1. Purpose

The My Profile page lets an authenticated worker view and manage permitted profile information.

The page supports:

- Viewing profile information.
- Updating permitted personal information.
- Reviewing profile completeness.
- Seeing truthful verification status labels.
- Accessing related profile workflows.

The page does not:

- Approve credentials.
- Approve identity.
- Approve employment.
- Approve worker eligibility.
- Expose employer-only information.
- Expose administrative controls.

## 2. Profile Boundaries

Profile completeness must not be presented as operational approval.

```text
Complete Profile
≠
Approved Worker
```

The page must also separate:

- Email verified.
- Identity verification.
- Credential review.
- Worker approval.

Each status must be visible as its own item with its own label and next step.

## 3. Information Hierarchy

Primary:

- Profile summary.
- Account status.
- Profile completeness.
- Verification status.

Secondary:

- Personal information.
- Contact information.
- Emergency contact placeholder.
- Preferred language.
- Preferred communication methods.

Tertiary:

- Privacy controls.
- Security messaging.
- Quick links to Documents, Availability, and Settings.
- AI profile guidance.

## 4. Desktop Wireframe

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Resident Job                              My Profile          Help Settings│
│ Worker: [Name]                           Account access: Active           │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ PROFILE SUMMARY                                                           │
├──────────────────────────────────────┬─────────────────────────────────────┤
│ [Avatar placeholder]                 │ PROFILE COMPLETENESS                │
│ Name: [Worker name]                  │ Status: 82% complete                │
│ Worker group: Kitchen                │ Missing: emergency contact,         │
│ Preferred language: [Language]       │ credential renewal detail           │
│                                      │ Complete Profile ≠ Approved Worker  │
│ [Edit permitted fields]              │ [Review missing items]              │
└──────────────────────────────────────┴─────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ ACCOUNT AND VERIFICATION STATUS                                           │
│ Email verified: Yes                                                       │
│ Identity verification: Pending / Not started / Verified                   │
│ Credential review: Pending / Needs update / Reviewed where applicable     │
│ Worker approval: Pending / Active / Restricted                            │
│ Note: Each status is separate and may change independently.                │
└────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────┬─────────────────────────────────────┐
│ PERSONAL INFORMATION                 │ CONTACT INFORMATION                 │
│ Legal/preferred display name         │ Email address                       │
│ Date-of-birth field, if required     │ Phone number                        │
│ Address fields, if required          │ Mailing address, if required        │
│ [Edit permitted personal info]       │ [Update contact info]               │
└──────────────────────────────────────┴─────────────────────────────────────┘

┌──────────────────────────────────────┬─────────────────────────────────────┐
│ EMERGENCY CONTACT                    │ PREFERENCES                         │
│ Placeholder only                     │ Preferred language                  │
│ Not verified by this page            │ Communication methods               │
│ [Add / update emergency contact]     │ Email / SMS / in-app preferences    │
│                                      │ [Update preferences]                │
└──────────────────────────────────────┴─────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ PRIVACY CONTROLS                                                           │
│ Manage what is visible for operational staffing purposes.                  │
│ Profile data is not employer billing data and is not administrator notes.  │
│ [Review privacy controls] [Open privacy requests]                          │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ AI PROFILE GUIDANCE - SUGGESTIONS ONLY                                    │
│ AI may highlight incomplete sections and recommend next steps.             │
│ AI does not edit profile information, verify identity, approve credentials,│
│ or change worker status.                                                   │
│ [Review suggestions]                                                       │
└────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────┬──────────────────────────────┬──────────────┐
│ QUICK LINKS                  │ SECURITY MESSAGE             │ RECENT ACTIVITY│
│ [Documents]                  │ Keep profile information      │ Profile update│
│ [Availability]               │ current. Never share codes.   │ requested     │
│ [Settings]                   │ [Security settings]           │ [View history]│
└──────────────────────────────┴──────────────────────────────┴──────────────┘
```

## 5. Mobile Wireframe

Mobile order must keep profile status and required actions above lower-priority profile details.

```text
┌──────────────────────────────┐
│ My Profile            Help   │
│ Account access: Active       │
└──────────────────────────────┘

┌──────────────────────────────┐
│ PROFILE SUMMARY              │
│ [Worker name]                │
│ Group: Kitchen               │
│ [Edit permitted fields]      │
└──────────────────────────────┘

┌──────────────────────────────┐
│ PROFILE COMPLETENESS         │
│ 82% complete                 │
│ Complete Profile             │
│ ≠ Approved Worker            │
│ [Review missing items]       │
└──────────────────────────────┘

┌──────────────────────────────┐
│ VERIFICATION STATUS          │
│ Email verified: Yes          │
│ Identity: Pending            │
│ Credentials: Needs review    │
│ Worker approval: Pending     │
└──────────────────────────────┘

┌──────────────────────────────┐
│ PERSONAL INFORMATION         │
│ [View / edit permitted]      │
└──────────────────────────────┘

┌──────────────────────────────┐
│ CONTACT INFORMATION          │
│ Email, phone, address        │
│ [Update contact info]        │
└──────────────────────────────┘

┌──────────────────────────────┐
│ EMERGENCY CONTACT            │
│ Placeholder only             │
│ [Add / update]               │
└──────────────────────────────┘

┌──────────────────────────────┐
│ LANGUAGE / COMMUNICATION     │
│ [Update preferences]         │
└──────────────────────────────┘

┌──────────────────────────────┐
│ PRIVACY CONTROLS             │
│ [Review privacy controls]    │
└──────────────────────────────┘

┌──────────────────────────────┐
│ QUICK LINKS                  │
│ Documents                    │
│ Availability                 │
│ Settings                     │
└──────────────────────────────┘
```

## 6. Verification Status Rules

The page must present each status separately.

```text
Email Verified
Confirms the account email was verified.
Does not verify identity, credentials, employment, or eligibility.

Identity Verification
Indicates identity-review workflow status where applicable.
Does not approve credentials or employment.

Credential Review
Indicates document or credential-review workflow status where applicable.
Does not automatically approve a worker for every shift.

Worker Approval
Indicates operational worker status.
Does not guarantee shifts, earnings, or assignments.
```

## 7. Editable and Non-Editable Fields

Editable by worker, when permitted:

- Preferred display name.
- Phone number.
- Address or contact information.
- Preferred language.
- Communication preferences.
- Emergency contact placeholder.
- Some profile details that do not require review.

May require review or support:

- Legal name changes.
- Identity-related details.
- Credential details.
- Worker group or qualification changes.
- Restricted account status.

Not editable from this page:

- Worker approval status.
- Credential approval decisions.
- Identity verification decision.
- Employer feedback.
- Administrative notes.
- Payroll or billing records.

## 8. Account Status States

Active:

- Worker can access permitted worker features.
- Operational eligibility still depends on approval, credentials, availability, and shift rules.

Profile incomplete:

- Worker can see missing items.
- The page explains next steps.
- The page must not imply approval is automatic after completion.

Pending review:

- Worker can see which category is pending.
- The page avoids internal review details.

Restricted:

- Operational actions may be limited.
- The page explains support path without exposing internal security or admin details.

Closed:

- Profile access is limited according to approved policies.
- Support and privacy request pathways remain visible where appropriate.

## 9. Privacy Controls

The privacy section should explain:

- Profile data is used for operational staffing purposes.
- Only necessary information should be visible for each workflow.
- Employer-visible profile information is separate from internal administrative notes.
- Worker profile data is separate from employer data and platform financial data.
- Privacy requests route to the approved privacy workflow.

No legal promises or jurisdiction-specific rights should be finalized in this wireframe.

## 10. AI Boundaries

AI may:

- Suggest missing profile information.
- Highlight incomplete sections.
- Recommend next steps.

AI must not:

- Edit profile information automatically.
- Approve credentials.
- Verify identity.
- Change worker status.
- Decide worker eligibility.
- Expose hidden administrative records.

AI suggestions must always be labeled as suggestions.

## 11. Security Messaging

Include concise, truthful reminders:

- Keep profile information current.
- Protect account credentials.
- Never share verification codes.
- Review contact information if account notices are not received.
- Use support for suspicious account activity.

Do not expose internal security mechanisms.

## 12. Loading, Empty, Error, and Success States

Loading:

- Load profile summary and account status first.
- Use compact skeletons for lower-priority sections.

Empty:

- Missing emergency contact.
- No preferred communication method selected.
- No profile suggestions.

Error:

- Cannot load profile.
- Cannot update permitted field.
- Review-required field cannot be changed directly.
- Connectivity required to save changes.

Success:

- Contact information updated.
- Preference saved.
- Emergency contact updated.
- Profile item submitted for review.

## 13. Accessibility

- Forms use visible labels.
- Required, optional, pending, and read-only fields are clearly marked.
- Screen-reader order follows profile summary, completeness, status, personal info, contact info.
- Errors identify the field and next action.
- Focus moves to confirmation or error summary after save.
- Touch targets are at least 44px.
- Status labels do not rely on color alone.
- The page remains usable with keyboard navigation.

## 14. International Readiness

- Avoid country-specific identity, credential, employment, payroll, or healthcare claims.
- Keep address, phone, date, language, and name formats configurable.
- Support future localization and right-to-left layouts.
- Do not hardcode legal review wording or jurisdictional obligations.

## 15. Self Validation

| Check | Result |
| --- | --- |
| Architecture Freeze unchanged | Pass |
| Epic 3 Planning unchanged | Pass |
| UX Foundation unchanged | Pass |
| Navigation unchanged | Pass |
| Worker-only profile experience preserved | Pass |
| Email, identity, credential, and worker approval statuses separated | Pass |
| Complete Profile does not imply Approved Worker | Pass |
| No admin controls exposed | Pass |
| No employer-only information exposed | Pass |
| AI remains advisory | Pass |
| Mobile-first layout included | Pass |
| Accessibility considerations included | Pass |
| No implementation introduced | Pass |
| Page 018 not created | Pass |

## 16. Governance Confirmation

This document is a low-fidelity wireframe only.

No React, frontend, backend, APIs, database models, identity verification implementation,
credential-review implementation, deployment, or production data are introduced.
