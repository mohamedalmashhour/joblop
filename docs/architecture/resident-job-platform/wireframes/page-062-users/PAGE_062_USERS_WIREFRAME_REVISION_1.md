# Resident Job

## Page 062 - Users Wireframe Revision 1

**Status:** Approved Wireframe v1.0 candidate  
**Revision:** 1  
**Owner decision:** Approved with documented conditions  
**Implementation:** Not Started  
**Approval record:** Created only after all conditions are satisfied  
**Frozen title:** Users  
**Page 063:** Workers unblocked, not created

---

## 1. Revision Summary

Revision 1 strengthens Page 062 as a governed user administration page. It refines user lifecycle,
invitations, activation and deactivation, suspension and restoration, membership, role and permission
separation, authentication boundaries, MFA state, verification references, session governance, access
reviews, auditability, privacy, security boundaries, AI boundaries, accessibility, international readiness,
and the Page 063 Workers handoff.

No redesign is introduced.

---

## 2. Governed User Lifecycle

Represent these states independently:

- invitation
- pending activation
- active
- suspended
- deactivated
- locked
- archived

Clarify:

```text
Invitation != Active account
Pending activation != Active account
Active account != Worker approval
Active account != Employer approval
Suspension != Deletion
Deactivation != Deletion
Locked != Suspended
Archived != Audit removal
```

Each lifecycle state should show:

- current status
- source
- actor where applicable
- effective date
- reason where required
- policy version
- audit history link

---

## 3. Invitation Workflow

Invitation workflow states:

- drafted
- sent
- pending
- accepted
- expired
- revoked
- resent

Invitation governance requires:

- authorized actor
- intended user type
- organization scope
- residence scope where applicable
- department scope where applicable
- proposed role
- proposed permission set where applicable
- reason where required
- expiration status
- audit event

```text
Invitation sent != Account active
Invitation accepted != All permissions active
Invitation resent != New authority granted
Invitation revoked != User deleted
```

---

## 4. Activation, Deactivation, Suspension, Restoration, Locking, and Archive

Represent protected lifecycle actions:

- activate
- deactivate
- suspend
- restore
- lock
- unlock
- archive

Each action displays:

- current state
- proposed state
- user impact
- scope impact
- role impact
- permission impact
- session impact summary
- required authority
- reason
- confirmation
- audit event

Page 062 must not silently alter worker eligibility, employer approval, scheduling access, payroll, payments,
or compliance decisions.

---

## 5. Membership Governance

Represent membership independently across:

- organization
- residence
- department

Each membership area includes:

- current membership
- proposed change
- membership status
- effective date
- source
- review state
- authorization requirement
- audit history

Clarify:

```text
Organization membership != Residence membership
Residence membership != Department membership
Membership != Role
Membership != Permission
Membership != Shift assignment
```

---

## 6. Role vs Permission vs Authority

Roles and permissions must be visually and conceptually separate.

```text
Role != Permission
Permission != Authority
Authority != Visibility
Visibility != Permission to act
```

Represent:

- assigned role
- proposed role
- current permission set
- proposed permission change
- inherited permission source
- direct permission source
- restricted permission
- pending permission review
- access-review status

High-risk permission changes require reason capture, confirmation, and audit visibility.

---

## 7. Authentication Boundary

Page 062 is not the authentication provider.

It may display authentication-related administration context, such as:

- account status
- email verification reference
- MFA state
- session overview
- locked state
- password reset required state

It must not:

- validate passwords
- reveal credentials
- expose tokens
- expose recovery codes
- act as identity provider
- define authentication policy
- implement password reset
- complete email verification

```text
Authentication != User management
Email verified != Identity verified
MFA enrolled != Identity approved
Session overview != Session control engine
```

---

## 8. MFA and Verification States

MFA states:

- not enrolled
- enrolled
- required
- reset requested
- recovery required
- unavailable

Verification references:

- email verification
- identity verification
- credential review
- worker approval
- employer approval

Clarify:

```text
Verification reference displayed != Verification performed here
Identity verification != Credential approval
Credential approval != Worker approval
Employer account active != Employer organization approved
```

---

## 9. Session Governance

Represent session overview as limited security context:

- active session count
- recent sign-in summary
- locked state
- revoked session count
- session review required
- suspicious-state flag where authorized

Do not expose:

- tokens
- secrets
- recovery codes
- full device fingerprints
- detailed IP history
- exploitable telemetry

Session action visibility must remain permission-gated and auditable.

---

## 10. Access Reviews

Represent access-review lifecycle:

- not due
- due
- overdue
- under review
- approved
- corrected
- revoked
- archived

Access review should show:

- user
- scope
- current role
- current permissions
- membership context
- reviewer
- review reason
- last reviewed
- next review
- policy version
- audit history

Access review must not silently grant new authority.

---

## 11. Desktop Wireframe Revision

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Resident Workforce OS / Users                                                │
│ Scope: Authorized org/residence/department | Freshness: Current / Stale      │
├──────────────────────────────────────────────────────────────────────────────┤
│ Filters                                                                      │
│ [Search user] [Lifecycle] [Invitation] [Role] [Permission] [Membership]      │
│ [MFA] [Verification reference] [Session state] [Access review] [Created]     │
├──────────────────────────────┬───────────────────────────────────────────────┤
│ Governed User List           │ Selected User Summary                         │
│ Name / masked email / ID     │ Lifecycle: Active / Suspended / Locked        │
│ Invitation: Pending/Accepted │ Invitation state: Sent / Accepted / Expired   │
│ Role summary                 │ MFA: Enrolled / Required / Recovery needed    │
│ Permission summary           │ Verification refs: Email / identity / role    │
│ Membership summary           │ Session overview: Active count / review flag  │
│ Access review status         │ Source freshness: Current / Partial / Stale   │
├──────────────────────────────┼───────────────────────────────────────────────┤
│ Membership                   │ Role and Permission Governance                │
│ Organization                 │ Assigned role                                 │
│ Residence                    │ Permission set                                │
│ Department                   │ Inherited vs direct permission                 │
│ Effective status             │ Restricted permission warning                 │
│ Audit trail                  │ Review required before high-risk change       │
├──────────────────────────────┼───────────────────────────────────────────────┤
│ Lifecycle Actions            │ Access Review and Audit                       │
│ Invite                       │ Access review state                           │
│ Activate / Deactivate        │ Role changes                                  │
│ Suspend / Restore            │ Permission changes                            │
│ Lock / Unlock                │ MFA and session review events                 │
│ Archive                      │ Lifecycle event history                       │
│ Reason + confirmation needed │ Actor / role / timestamp / org / reason       │
├──────────────────────────────┴───────────────────────────────────────────────┤
│ Navigation                                                                   │
│ [Workers -> Page 063] [Employers -> Page 064] [Audit Log -> Page 072]        │
│ [Support -> Page 055]                                                        │
│                                                                              │
│ User account administration only. Worker management is Page 063.             │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 12. Mobile Wireframe Revision

```text
┌──────────────────────────────┐
│ Users                        │
│ Scope + freshness            │
├──────────────────────────────┤
│ Search and Filter            │
│ Lifecycle / Role / MFA       │
│ Membership / Access review   │
├──────────────────────────────┤
│ User Results                 │
│ Masked identity              │
│ Lifecycle status             │
│ Role + permission summary    │
│ Access review status         │
├──────────────────────────────┤
│ Selected User                │
│ Invitation state             │
│ Account state                │
│ MFA state                    │
│ Session overview             │
│ Verification references      │
├──────────────────────────────┤
│ Membership                   │
│ Organization                 │
│ Residence                    │
│ Department                   │
├──────────────────────────────┤
│ Role and Permissions         │
│ Role != Permission           │
│ Permission != Authority      │
├──────────────────────────────┤
│ Guarded Actions              │
│ Invite / Activate            │
│ Suspend / Restore            │
│ Lock / Archive               │
│ Reason required              │
├──────────────────────────────┤
│ Audit                        │
│ Recent protected events      │
└──────────────────────────────┘
```

---

## 13. Source-of-Truth Boundary

Page 062 owns governed user administration.

It must not become:

- authentication provider
- identity provider
- payroll
- scheduling
- worker management
- attendance
- reporting
- compliance decision engine
- audit-log storage engine

Where it displays external status, it must show source workflow and freshness.

---

## 14. AI Boundary

AI may:

- summarize user status
- explain permission models
- identify inconsistent assignments
- draft audit summaries
- suggest access-review questions
- suggest navigation to source workflows

AI must never:

- assign permissions
- activate users
- suspend users
- elevate privileges
- change authoritative state
- invite users
- deactivate users
- restore users
- lock or unlock users
- archive users
- reset MFA
- control sessions
- approve identity
- approve credentials
- approve workers
- approve employers

---

## 15. Auditability

Represent audit events for:

- user created
- invitation sent
- activation
- deactivation
- suspension
- restoration
- locked state change
- archive
- role change
- permission change
- MFA change
- session review
- access review
- deletion request

Audit context includes:

- actor
- role
- timestamp
- organization
- reason
- policy version
- previous value
- new value
- scope
- authorization basis

Do not broadly log protected displayed content.

---

## 16. Privacy

Expose minimum necessary information only.

Never expose:

- passwords
- secrets
- recovery codes
- authentication tokens
- financial information
- health information
- protected personal information outside authorized scope
- identity-document images
- private message bodies
- unrelated complaints
- investigation details

Use masked identifiers and role-appropriate summaries.

---

## 17. Security Boundaries

Protect against:

- privilege escalation
- cross-organization access
- accidental lockout
- unsafe role assignment
- unsafe permission assignment
- stale access reviews
- sensitive session exposure
- MFA reset abuse
- hidden authority changes

Every protected action requires human authority, scope confirmation, reason capture, and audit event.

---

## 18. Accessibility

Review:

- keyboard navigation
- semantic headings
- screen-reader compatibility
- accessible role tables
- accessible permission matrices
- plain-language errors
- focus management
- non-color-only status labels
- readable timestamps and timezones
- mobile touch targets

---

## 19. International Readiness

Do not hardcode:

- role hierarchy
- organization structure
- residence structure
- department structure
- authentication policy
- permission model
- locale
- timezone
- language
- name format
- date format
- directionality

Keep user administration policy, access-review policy, role policy, permission policy, organization policy,
locale, timezone, and language configurable.

---

## 20. Empty and Error States

Empty states:

- no users found
- no users in authorized scope
- no pending invitations
- no suspended users
- no access reviews due
- no visible sessions
- no audit events visible under current permission

Error states:

- access denied
- restricted user
- stale user record
- invitation expired
- role conflict
- permission conflict
- membership conflict
- MFA state unavailable
- session overview unavailable
- access review unavailable
- audit history unavailable
- source workflow unavailable

Errors explain the next safe step without revealing protected information.

---

## 21. Page 063 Boundary

Prepare explicitly for Page 063 - Workers.

Page 062 owns:

- User Administration

Page 063 owns:

- Worker Management

Clarify:

```text
User account != Worker record
User account status != Worker eligibility
User role != Worker approval
User permission != Worker qualification
User membership != Shift assignment
```

Do not create Page 063 files.

---

## 22. Validation

Confirmed:

- Governance stack unchanged.
- Pages 001-061 unchanged.
- Page 062 remains Users.
- Page 063 remains Workers.
- No Page 063 files created.
- No implementation started.
- No React created.
- No frontend created.
- No backend created.
- No APIs created.
- No database changes created.
- No schema or migrations created.
- No commit, push, merge, or deployment performed.
- Existing unrelated files remain untouched.

---

## 23. Final Status

```text
Page 062 — Users
APPROVED WIREFRAME v1.0

Page 063 — Workers
UNBLOCKED
NOT CREATED
```
