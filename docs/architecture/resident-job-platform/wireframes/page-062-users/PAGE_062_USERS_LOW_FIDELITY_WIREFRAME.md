# Resident Job

## Page 062 - Users Low-Fidelity Wireframe

**Status:** Low-Fidelity Wireframe Complete  
**Owner review:** Required  
**Approval record:** Not created  
**Implementation:** Not Started  
**Frozen title:** Users  
**Page 063:** Workers blocked

---

## 1. Purpose

Page 062 designs governed user administration for Resident Job. It allows authorized administrators,
super administrators, and support reviewers to view and administer user records, account lifecycle state,
organizational membership, residence membership, department membership, role assignment, permission
assignment, MFA state, verification references, access review context, session overview, and audit history.

The page is an administrative governance surface. It is not the authentication system, not the worker
profile, not the employer profile, not a compliance review page, and not a payroll or operations page.

---

## 2. Ownership

Page 062 owns:

- user record administration
- invitation workflow visibility
- account lifecycle state
- activation, deactivation, suspension, restoration initiation
- organizational membership
- residence membership
- department membership
- role assignment overview
- permission assignment overview
- MFA state visibility
- verification status references
- access review workflow visibility
- session overview
- user audit history

Page 062 does not own:

- authentication credential verification
- password reset execution
- email delivery
- worker eligibility
- worker profile verification
- credential approval
- employer approval
- shift assignment
- attendance
- payroll
- invoicing
- payment
- support case resolution
- audit log source records

---

## 3. Core Boundary Statements

```text
User record != Authentication
Role != Permission
Invitation != Active account
Suspension != Deletion
User administration != Worker approval
Verification status displayed != Verification decision made here
Session overview != Session control engine
Audit history displayed != Audit record ownership
```

---

## 4. Primary Users

- Administrator
- Super Administrator
- Authorized Support Reviewer

Secondary stakeholders:

- Compliance reviewer, where verification status requires visibility
- Operations manager, where membership context affects workflow visibility
- Security reviewer, where account state or session status requires review

All access remains role-specific and permission-gated.

---

## 5. Desktop Wireframe

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Resident Workforce OS / Users                                                │
│ Role: Administrator | Scope: Authorized organization/residence/department    │
│ Data freshness: Current / Partial / Stale                                    │
├──────────────────────────────────────────────────────────────────────────────┤
│ Governed Search and Filters                                                  │
│ [Search name/email/user ID] [Account status] [Role] [Permission group]       │
│ [Organization] [Residence] [Department] [MFA state] [Verification reference] │
│ [Access review due] [Session state] [Created range]                          │
│ Restricted filters are hidden or marked unavailable.                         │
├──────────────────────────────┬───────────────────────────────────────────────┤
│ User List                    │ Selected User Governance Summary              │
│ ┌──────────────────────────┐ │ ┌───────────────────────────────────────────┐ │
│ │ Name / masked email      │ │ │ User ID / display name / account status   │ │
│ │ Account: Active          │ │ │ Invitation: Sent / Accepted / Expired     │ │
│ │ Role: Residence Manager  │ │ │ MFA: Enrolled / Not enrolled / Required   │ │
│ │ Membership: Residence A  │ │ │ Verification references: View only        │ │
│ │ Access review: Due       │ │ │ Session overview: Active / Revoked / N/A  │ │
│ └──────────────────────────┘ │ └───────────────────────────────────────────┘ │
├──────────────────────────────┼───────────────────────────────────────────────┤
│ Membership and Authority     │ Lifecycle Actions                             │
│ ┌──────────────────────────┐ │ ┌───────────────────────────────────────────┐ │
│ │ Organization membership  │ │ │ [Invite user]                              │ │
│ │ Residence membership     │ │ │ [Activate] [Deactivate]                    │ │
│ │ Department membership    │ │ │ [Suspend] [Restore]                        │ │
│ │ Role assignment          │ │ │ [Request access review]                    │ │
│ │ Permission assignment    │ │ │ Actions require permission + reason        │ │
│ └──────────────────────────┘ │ └───────────────────────────────────────────┘ │
├──────────────────────────────┼───────────────────────────────────────────────┤
│ Verification References      │ Audit and Access Review                       │
│ ┌──────────────────────────┐ │ ┌───────────────────────────────────────────┐ │
│ │ Email verified           │ │ │ Recent user admin events                   │ │
│ │ Identity review ref      │ │ │ Role changes                               │ │
│ │ Credential review ref    │ │ │ Membership changes                         │ │
│ │ Employer/worker approval │ │ │ Suspensions/restorations                   │ │
│ │ Source workflow links    │ │ │ Access review notes                        │ │
│ └──────────────────────────┘ │ └───────────────────────────────────────────┘ │
├──────────────────────────────┴───────────────────────────────────────────────┤
│ Navigation                                                                   │
│ [Workers -> Page 063] [Employers -> Page 064] [Residences -> Page 065]       │
│ [Audit Log -> Page 072] [Support -> Page 055]                                │
│                                                                              │
│ User admin actions require human authority, reason capture, and audit event. │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Mobile Wireframe

```text
┌──────────────────────────────┐
│ Users                        │
│ Scope: Authorized view       │
│ Freshness: Current / Stale   │
├──────────────────────────────┤
│ Search                       │
│ [Name / masked email / ID]   │
│ [Filter]                     │
├──────────────────────────────┤
│ User Results                 │
│ Name                         │
│ Account status               │
│ Role summary                 │
│ Membership summary           │
│ Access review status         │
├──────────────────────────────┤
│ Selected User                │
│ Lifecycle state              │
│ Invitation state             │
│ MFA state                    │
│ Verification references      │
├──────────────────────────────┤
│ Authority                    │
│ Role                         │
│ Permissions                  │
│ Memberships                  │
├──────────────────────────────┤
│ Actions                      │
│ Invite / Activate            │
│ Deactivate / Suspend         │
│ Restore / Review access      │
│ Reason required              │
├──────────────────────────────┤
│ Audit                        │
│ Recent changes               │
│ Access review history        │
└──────────────────────────────┘
```

Mobile avoids dense administration tables. It uses searchable lists, collapsible detail sections, visible
status labels, guarded actions, and large touch targets.

---

## 7. User Lifecycle

Represent lifecycle states:

- invited
- invitation expired
- account created
- email verification pending
- email verified
- active
- deactivated
- suspended
- restored
- closed

Clarify:

```text
Invitation != Active account
Active account != Approved worker
Active account != Approved employer
Suspension != Deletion
Closed account != Audit removal
```

---

## 8. Invitation Workflow

Represent:

- invitation created
- recipient contact destination, masked where appropriate
- invitation sent
- invitation pending
- invitation accepted
- invitation expired
- invitation revoked
- invitation resent

Invitation actions require:

- authorized actor
- invitation purpose
- target organization or residence scope
- role or membership proposal
- reason where required
- audit event

Do not allow invitation to create an active account without the governed acceptance and account setup flow.

---

## 9. Activation, Deactivation, Suspension, and Restoration

Represent governed lifecycle actions:

- activate
- deactivate
- suspend
- restore
- close

Each action should show:

- current status
- proposed status
- reason
- actor
- required authority
- user impact
- affected memberships
- session effect summary
- audit event

Clarify:

```text
Deactivate != Delete
Suspend != Delete
Restore != Automatic permission restoration
Close != Remove audit history
```

---

## 10. Membership Management

Represent membership in:

- organization
- residence
- department

Membership views include:

- current membership
- proposed membership
- membership role
- effective date
- status
- source
- review state
- audit history

Clarify:

```text
Organization membership != Residence membership
Residence membership != Department membership
Membership != Permission
Membership != Shift assignment
```

---

## 11. Role and Permission Assignment

Represent roles and permissions separately.

Roles may include:

- worker
- employer user
- residence manager
- department manager
- scheduler
- support
- compliance
- finance
- administrator
- super administrator
- read-only auditor

Permissions remain granular and policy-driven.

Clarify:

```text
Role != Permission
Assigned role != Unlimited authority
Permission displayed != Permission granted by this page without approval
Admin visibility != Permission to modify
```

Sensitive permissions require confirmation, reason capture, and audit visibility.

---

## 12. MFA State and Session Overview

Represent MFA state:

- not enrolled
- enrolled
- required
- reset requested
- recovery required
- unavailable

Represent session overview:

- active session count
- recent sign-in summary
- suspicious state flag, where authorized
- revoked session count
- session review status

Clarify:

```text
MFA state != Identity verification
Session overview != Authentication engine
Session visible != Permission to inspect protected activity
```

Do not expose tokens, secrets, device fingerprints, full IP histories, or implementation details.

---

## 13. Verification Status References

Page 062 may display references to:

- email verification
- identity verification
- credential review
- worker approval
- employer approval
- background check workflow

It must not approve or perform those workflows.

Clarify:

```text
Email verified != Identity verified
Identity verified != Credential approved
Credential approved != Worker approved
Worker approved != Shift eligibility
Employer user account != Employer organization approved
```

Verification decisions belong to their authoritative workflows.

---

## 14. Audit History and Access Review

Represent:

- user created
- invitation sent
- membership changed
- role changed
- permission changed
- account activated
- account deactivated
- account suspended
- account restored
- MFA state changed
- session review action
- access review completed
- access denied

Audit event concepts include:

- actor
- role
- timestamp
- organization
- residence or department scope
- action
- previous value
- new value
- reason
- authorization basis

Do not broadly display protected content inside audit summaries.

---

## 15. Source-of-Truth Boundary

Page 062 is the governed administration surface for user records and user authority context.

It is not authoritative for:

- password validation
- email delivery
- identity verification evidence
- credential evidence
- worker professional data
- employer company data
- shift eligibility
- operational assignments
- payroll
- invoices
- payments
- support case resolution
- immutable audit log storage

Where the page displays external status, it must show source workflow and freshness.

---

## 16. Human Authority

Every protected action requires:

- authorized human actor
- visible scope
- reason where required
- confirmation
- audit event
- destination workflow handoff where applicable

AI, dashboard suggestions, and system summaries never replace human authorization.

---

## 17. AI Boundary

AI may:

- summarize visible user administration context
- identify missing membership information
- identify inconsistent role and permission combinations
- explain access-review requirements
- draft an access-review summary
- suggest navigation to authoritative workflows

AI must never:

- create users
- invite users
- activate users
- deactivate users
- suspend users
- restore users
- assign roles
- grant permissions
- revoke permissions
- reset MFA
- control sessions
- approve identity
- approve credentials
- approve workers or employers
- expose restricted user data
- write authoritative user records

---

## 18. Privacy

Show minimum necessary user administration information.

Do not expose:

- passwords
- verification codes
- secrets
- tokens
- full banking information
- tax information
- health information
- identity-document images
- full private addresses unless specifically authorized
- private message bodies
- unrelated complaints
- investigation details
- internal fraud signals
- protected personal information outside authorized scope

Use masked identifiers where possible.

---

## 19. Filtering

Represent governed filters by:

- name, email, or user ID search
- account status
- invitation status
- organization
- residence
- department
- role
- permission group
- MFA state
- verification reference
- access review status
- session state
- created date
- last activity date

Represent:

- active filter
- unavailable filter
- restricted filter
- no matching results
- partial results due to authorization

Filters must not reveal restricted users or infer hidden memberships.

---

## 20. Security Considerations

The page must protect:

- privilege escalation controls
- least-privilege display
- role and permission separation
- sensitive action confirmation
- session overview privacy
- MFA state confidentiality
- access-review integrity
- audit trail integrity

Security-sensitive actions should avoid technical jargon while clearly stating user impact.

---

## 21. Empty States

Include:

- no users found
- no users in selected scope
- no pending invitations
- no suspended users
- no access reviews due
- no active sessions visible
- no audit events visible under current permission

Do not reveal whether restricted users exist outside the authorized scope.

---

## 22. Error States

Include:

- access denied
- restricted user
- stale user record
- membership conflict
- role conflict
- permission conflict
- invitation expired
- invitation already accepted
- lifecycle action unavailable
- MFA state unavailable
- session overview unavailable
- audit history unavailable
- source workflow unavailable

Errors should explain what happened and the next safe step without exposing protected details.

---

## 23. Accessibility

Review:

- semantic landmarks
- keyboard navigation
- focus management for guarded actions
- screen-reader labels for statuses
- accessible tables and list alternatives
- no color-only status indicators
- readable timestamps and timezones
- plain-language confirmations
- accessible error and empty states
- large touch targets on mobile

---

## 24. International Readiness

Do not hardcode:

- role labels
- permission names
- organization hierarchy
- residence hierarchy
- department hierarchy
- lifecycle terminology
- legal status terminology
- locale
- language
- timezone
- date format
- name format
- phone format
- address format
- right-to-left or left-to-right assumptions

Keep user administration policy, role policy, permission policy, membership policy, locale, timezone, and
language configurable.

---

## 25. Operational Risks

Risks to manage in future implementation:

- accidental privilege escalation
- user lockout
- cross-organization data exposure
- role and permission drift
- stale verification status
- unsafe bulk changes
- weak access-review process
- confusing suspension and deletion
- overexposed session details
- AI overreach

These are implementation and governance risks, not wireframe blockers when clearly bounded.

---

## 26. Future Boundaries

Future implementation may add:

- bulk access review
- saved admin views
- stricter permission-diff previews
- delegated admin flows
- export request workflow
- deeper security review workflows

These must remain separate from authentication, worker approval, employer approval, compliance decisioning,
and audit-log storage.

---

## 27. Next-Page Boundary

Page 063 - Workers owns worker record administration, worker verification context, worker groups,
documents, and support issues.

Page 062 must not become the worker management page.

Clarify:

```text
User account != Worker record
User account status != Worker eligibility
User role != Worker approval
User membership != Shift assignment
```

---

## 28. Validation

Confirmed:

- Governance stack unchanged.
- Pages 001-061 remain unchanged.
- Page 062 title remains Users.
- Page 063 title identified as Workers.
- No Page 063 files created.
- No approval record created.
- No implementation started.
- No React created.
- No frontend created.
- No backend created.
- No APIs created.
- No database changes created.
- No schema or migrations created.
- No user-management implementation created.
- No authentication implementation created.
- No commit, push, merge, or deployment performed.
- Existing unrelated files remain untouched.

---

## 29. Final Status

```text
Page 062 — Users
Wireframe: COMPLETE
Product Review: COMPLETE
Approval Record: NOT CREATED
Owner Review: REQUIRED

Page 063 — Workers
BLOCKED
```
