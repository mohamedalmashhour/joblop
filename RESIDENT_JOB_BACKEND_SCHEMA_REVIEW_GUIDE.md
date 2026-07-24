# Resident Job Backend Schema Review Guide

Audience: Owner review
Companion document: `RESIDENT_JOB_BACKEND_FOUNDATION_SCHEMA_PROPOSAL.md`
Current approved proposal commit: `04cb956`
Status: REVIEW SUPPORT ONLY

This guide explains the schema proposal in plain language. It does not change the proposal, expand scope, authorize implementation, create a schema, create migrations, or approve backend work.

## Owner Summary

The proposed backend foundation is the minimum data structure needed before Resident Workforce OS can safely support real sign-in, organization ownership, memberships, roles, permissions, residences, and departments.

The proposal intentionally does not include staffing workflows yet. Shifts, applications, assignments, attendance, invoices, payments, payroll, messages, support, AI matching, reporting, and full audit persistence remain outside this phase.

The key design principle is separation:

- A user account is not the same as a worker profile.
- Authentication is not the same as authorization.
- Organization membership is not the same as platform administration.
- A residence is not a department.
- A role is not a permission.
- An audit actor reference is not a full audit log.

## Entity Review

### `users`

Purpose: Stores the account-level person who can sign in or be invited.

Why it exists: Every worker, employer user, and admin needs one common account record before the system can decide what they are allowed to access.

Frontend workflows that use it:

- Employer sign up and sign in
- Worker sign up and sign in
- Admin user administration
- Account status messaging

Future workflows that depend on it:

- Applications
- Assignments
- Attendance
- Timesheets
- Messages
- Support
- Audit logs
- Notifications

Mandatory for Phase 01: Yes.

Privacy considerations: Contains personal information such as email and display name. It should be exposed only where needed.

Security considerations: Account status controls whether access is allowed. Disabled or closed accounts must not continue using the platform.

Stores personal information: Yes.

References another entity: No. Other entities reference `users`.

Deletion: Should usually not be physically deleted. Use disabled, closed, or archived status so governance history is preserved.

Authorization boundary:

| Action | Who may do it |
| --- | --- |
| Read | The user themself, authorized organization admins where membership requires it, authorized platform admins |
| Create | Sign-up flow or authorized invitation flow |
| Update | The user for basic self fields; authorized admins for governed account state |
| Delete | Generally no direct delete; closure/retention process only |
| Approve | Platform or organization review workflows only where applicable |
| Supervise | Authorized platform admin or auditor |

### `user_identities`

Purpose: Stores the authentication identity connected to a user account.

Why it exists: A user account may sign in through a password, a development test provider, or a future external provider. This separates account ownership from the method used to authenticate.

Frontend workflows that use it:

- Sign up
- Sign in
- Email verification
- Password or provider login
- MFA state display

Future workflows that depend on it:

- Password reset
- Two-factor authentication
- Account security review
- Session validation
- Security audit

Mandatory for Phase 01: Yes, unless the owner chooses a fully external provider before implementation.

Privacy considerations: Highly sensitive authentication data. Password hashes and provider identifiers should never be shown in the UI.

Security considerations: Must never store plaintext credentials. Must not reveal whether an email or account exists through unsafe errors.

Stores personal information: Yes. It stores identity-provider references and may include an email verification state.

References another entity: Yes, it references `users`.

Deletion: Should not be casually deleted. Remove or invalidate identities only through account security or closure workflows.

Authorization boundary:

| Action | Who may do it |
| --- | --- |
| Read | Authentication service and tightly authorized security/admin workflows |
| Create | Sign-up or approved identity-linking process |
| Update | Authentication/security workflows only |
| Delete | Account closure or security process only |
| Approve | Not applicable; email verification is not identity approval |
| Supervise | Authorized security/platform admin |

### `sessions`

Purpose: Stores active, expired, or revoked sign-in sessions.

Why it exists: The platform needs a way to know whether a user is currently authenticated and whether a session has expired or been revoked.

Frontend workflows that use it:

- Sign in
- Sign out
- Remember-me behavior
- Expired-session messaging
- Account-disabled handling

Future workflows that depend on it:

- Remote session revocation
- Account security dashboard
- Suspicious activity review
- Audit trails

Mandatory for Phase 01: Owner decision required. It is mandatory only if the platform owns sessions instead of delegating them to an external auth provider.

Privacy considerations: Uses hashed references only. It should not expose raw session IDs, tokens, IP addresses, or device secrets.

Security considerations: Raw session secrets must never be stored or returned. Revoked and expired sessions must not grant access.

Stores personal information: Indirectly, because it references a user and may contain hashed device/network references.

References another entity: Yes, it references `users`.

Deletion: Expired session records may be pruned according to a retention policy, but revocation/security history may need short-term retention.

Authorization boundary:

| Action | Who may do it |
| --- | --- |
| Read | Authentication service; user may see safe session summaries later |
| Create | Authentication service after successful sign-in |
| Update | Authentication service for last seen, expiration, or revocation |
| Delete | Retention/security maintenance only |
| Approve | Not applicable |
| Supervise | Authorized security/platform admin |

### `employer_organizations`

Purpose: Stores the employer company or organization that uses Resident Workforce OS.

Why it exists: Employer users need a tenant boundary so their residences, departments, users, and future shifts do not mix with another employer.

Frontend workflows that use it:

- Employer organization creation
- Company profile
- Employer dashboard organization context
- Admin employer management

Future workflows that depend on it:

- Shift creation
- Applicants
- Assignments
- Attendance monitoring
- Invoices
- Reports
- Support

Mandatory for Phase 01: Yes.

Privacy considerations: Business confidential. It may include legal name and operational identity, but no resident or clinical data.

Security considerations: Strong tenant isolation depends on this entity. Cross-organization access must be denied.

Stores personal information: Usually no, except creator/reviewer references point to users.

References another entity: Yes, creator and reviewer may reference `users`.

Deletion: Should not usually be deleted. Use restricted, suspended, closed, or archived state so future records remain attributable.

Authorization boundary:

| Action | Who may do it |
| --- | --- |
| Read | Active organization members with permission; authorized platform admins |
| Create | Employer onboarding flow or authorized admin |
| Update | Authorized organization owner/admin; platform admin for governed status |
| Delete | No direct delete; closure/archive process only |
| Approve | Authorized platform review role |
| Supervise | Authorized platform admin or auditor |

### `organization_memberships`

Purpose: Connects a user to an employer organization.

Why it exists: A person can have an account without belonging to a company, and a company can have multiple users. This table decides who belongs to which organization.

Frontend workflows that use it:

- Employer invitations
- Employer dashboard access
- Organization member management
- Residence and department access

Future workflows that depend on it:

- Shift management
- Applicant review
- Assignment creation
- Attendance visibility
- Invoice access
- Reports

Mandatory for Phase 01: Yes.

Privacy considerations: Contains personal and organizational access information. It should not be broadly visible.

Security considerations: Suspended, revoked, and expired memberships must not grant access.

Stores personal information: Yes, indirectly through the user reference and invited-by reference.

References another entity: Yes, it references `users` and `employer_organizations`.

Deletion: Should not usually be deleted because membership history supports accountability. Use revoked or expired states.

Authorization boundary:

| Action | Who may do it |
| --- | --- |
| Read | Authorized organization owner/admin; authorized platform admin |
| Create | Authorized organization owner/admin or platform admin |
| Update | Authorized organization owner/admin for invites and membership state; platform admin for supervision |
| Delete | No direct delete; revoke or expire instead |
| Approve | Organization owner/admin for organization membership; platform admin where policy requires |
| Supervise | Authorized platform admin or auditor |

### `residences`

Purpose: Stores a staffing location under an employer organization.

Why it exists: Shifts and departments need to belong to a specific operating location. This avoids mixing staffing needs across facilities.

Frontend workflows that use it:

- Employer residence setup
- Employer dashboard context
- Admin residence review

Future workflows that depend on it:

- Department setup
- Shift creation
- Urgent staffing
- Attendance context
- Invoices and reports by location

Mandatory for Phase 01: Yes.

Privacy considerations: Business operational information only. It must not include resident clinical data.

Security considerations: Must be scoped to one organization so another employer cannot see or modify it.

Stores personal information: No, unless creator references are considered indirect personal data.

References another entity: Yes, it references `employer_organizations` and optionally `users` as creator.

Deletion: Should be archived, not physically deleted, once future shifts or records may depend on it.

Authorization boundary:

| Action | Who may do it |
| --- | --- |
| Read | Authorized members of the owning organization; authorized platform admins |
| Create | Authorized organization users with residence creation permission |
| Update | Authorized organization users with residence update permission |
| Delete | No direct delete after use; archive/inactivate instead |
| Approve | Not normally applicable in Phase 01 unless platform policy requires location review |
| Supervise | Authorized platform admin or auditor |

### `departments`

Purpose: Stores work areas inside a residence.

Why it exists: A residence may need staffing for kitchen, care, housekeeping, maintenance, or other operational areas. Departments keep shift context clear.

Frontend workflows that use it:

- Department setup
- Employer dashboard setup status
- Admin organization visibility

Future workflows that depend on it:

- Shift creation
- Worker qualification matching
- Assignment context
- Attendance reporting
- Department-level invoices and reports

Mandatory for Phase 01: Yes if department setup remains part of employer onboarding.

Privacy considerations: Business operational information only. It should not contain resident, health, payroll, or worker private data.

Security considerations: Must belong to the correct residence and organization. Cross-organization department access must be denied.

Stores personal information: No, except optional creator reference.

References another entity: Yes, it references `employer_organizations`, `residences`, and optionally `users`.

Deletion: Should be archived/inactivated after use. Physical deletion risks breaking future shift history.

Authorization boundary:

| Action | Who may do it |
| --- | --- |
| Read | Authorized members of the owning organization; authorized platform admins |
| Create | Authorized organization users with department creation permission |
| Update | Authorized organization users with department update permission |
| Delete | No direct delete after use; archive/inactivate instead |
| Approve | Not normally applicable in Phase 01 |
| Supervise | Authorized platform admin or auditor |

### `role_definitions`

Purpose: Defines the named roles used by the platform.

Why it exists: Roles such as `WORKER`, `EMPLOYER_OWNER`, and `PLATFORM_ADMIN` need one canonical list so every app means the same thing.

Frontend workflows that use it:

- Admin user management
- Employer membership role display
- Access-denied messaging

Future workflows that depend on it:

- All permission checks
- Admin operations
- Worker/employer portal access
- Auditing

Mandatory for Phase 01: Yes.

Privacy considerations: Not personal data, but it is security governance data.

Security considerations: Role definitions must not drift between frontend, API, and admin tools.

Stores personal information: No.

References another entity: No. Other entities reference roles.

Deletion: System roles should not be deleted. Retire roles instead.

Authorization boundary:

| Action | Who may do it |
| --- | --- |
| Read | Authorized admins; limited safe display where needed |
| Create | Platform admin only, usually through migration/seed |
| Update | Platform admin only through governed change |
| Delete | No direct delete; retire instead |
| Approve | Platform governance |
| Supervise | Authorized platform admin or auditor |

### `permission_definitions`

Purpose: Defines the exact actions a role may be allowed to perform.

Why it exists: Permissions give precise control. For example, reading a residence is different from creating one.

Frontend workflows that use it:

- Admin access display
- Employer membership access control
- Access-denied states

Future workflows that depend on it:

- All employer, worker, admin, finance, support, AI, and audit workflows

Mandatory for Phase 01: Yes.

Privacy considerations: Not personal data, but it reveals platform security structure and should be treated as internal.

Security considerations: Future permissions may be declared but must not authorize unimplemented workflows.

Stores personal information: No.

References another entity: No. Role-permission mappings reference it.

Deletion: Should not be deleted if used historically. Retire or mark unimplemented instead.

Authorization boundary:

| Action | Who may do it |
| --- | --- |
| Read | Authorized admins; limited safe display where needed |
| Create | Platform admin/governed migration only |
| Update | Platform admin/governed migration only |
| Delete | No direct delete; retire/deactivate instead |
| Approve | Platform governance |
| Supervise | Authorized platform admin or auditor |

### `role_permissions`

Purpose: Connects roles to permissions.

Why it exists: A role has no real power until it is mapped to specific permissions. This table keeps those mappings explicit.

Frontend workflows that use it:

- Admin access review
- Employer membership access enforcement
- Access-denied messaging

Future workflows that depend on it:

- All workflow authorization
- Security reviews
- Audit explanations

Mandatory for Phase 01: Yes.

Privacy considerations: No personal data, but security sensitive.

Security considerations: Wrong mappings can grant too much access. Changes require governance.

Stores personal information: No.

References another entity: Yes, it references `role_definitions` and `permission_definitions`.

Deletion: Should be revoked or superseded with auditability, not casually removed.

Authorization boundary:

| Action | Who may do it |
| --- | --- |
| Read | Authorized platform admins and auditors |
| Create | Platform admin/governed seed or migration |
| Update | Platform admin/governed change |
| Delete | Use revoke/supersede pattern where possible |
| Approve | Platform governance |
| Supervise | Authorized platform admin or auditor |

### `membership_roles`

Purpose: Assigns roles to a user's organization membership.

Why it exists: A user can belong to an organization and still need a specific role, such as owner or scheduler.

Frontend workflows that use it:

- Employer membership management
- Role assignment
- Employer dashboard authorization

Future workflows that depend on it:

- Shift creation
- Applicant review
- Attendance viewing
- Timesheet review
- Invoice access
- Report access

Mandatory for Phase 01: Yes.

Privacy considerations: Links a person to an access role in an organization.

Security considerations: This is one of the main access-control tables. Revoked roles must stop granting permissions.

Stores personal information: Yes, indirectly through membership and assigned-by user references.

References another entity: Yes, it references `organization_memberships`, `role_definitions`, and optionally `users`.

Deletion: Should generally be revoked with timestamp, not physically deleted.

Authorization boundary:

| Action | Who may do it |
| --- | --- |
| Read | Authorized organization owner/admin; platform admin |
| Create | Authorized organization owner/admin or platform admin |
| Update | Authorized organization owner/admin or platform admin |
| Delete | Prefer revoke timestamp; no casual delete |
| Approve | Organization owner/admin or platform governance depending on role |
| Supervise | Authorized platform admin or auditor |

### `worker_profiles`

Purpose: Stores the boundary that says a user has a worker profile.

Why it exists: A worker profile is different from a user account. This table lets the platform recognize worker context without storing licenses, certifications, background checks, or payroll data in Phase 01.

Frontend workflows that use it:

- Worker sign-up profile boundary
- Worker profile completion indicator
- Admin user management visibility

Future workflows that depend on it:

- Professional information
- Licenses
- Certifications
- Background checks
- Availability
- Shift discovery
- Applications
- Assignments
- Attendance
- Earnings

Mandatory for Phase 01: Yes if worker sign-up uses the same identity foundation; otherwise it can be created when worker identity is enabled.

Privacy considerations: Personal worker data, but intentionally minimal.

Security considerations: Profile completion must not imply worker approval, credential approval, or assignment eligibility.

Stores personal information: Yes.

References another entity: Yes, it references `users`.

Deletion: Should follow account closure and retention policy. Do not delete if future operational history depends on it.

Authorization boundary:

| Action | Who may do it |
| --- | --- |
| Read | The worker themself; authorized platform admin with reason |
| Create | Worker sign-up/profile creation flow |
| Update | Worker for allowed basic fields; platform review for status where applicable |
| Delete | Account closure/retention process only |
| Approve | Not in Phase 01; worker approval is a future workflow |
| Supervise | Authorized platform admin or auditor |

### `audit_actor_references`

Purpose: Creates a safe reference for who performed an action later.

Why it exists: Future audit logs need to point to users, systems, or services without copying sensitive account details into every audit event.

Frontend workflows that use it:

- Admin audit visibility later
- Safe actor display in future audit summaries

Future workflows that depend on it:

- Audit log
- Security review
- Compliance review
- Support investigation
- Financial review
- AI governance review

Mandatory for Phase 01: Owner decision required. It is useful now because many foundation records need actor attribution, but full audit event persistence remains out of scope.

Privacy considerations: Should contain safe labels only, not secrets or sensitive personal details.

Security considerations: It must not become an editable substitute for audit logs.

Stores personal information: It may indirectly reference personal information through `user_id`.

References another entity: Yes, it may reference `users` and `employer_organizations`.

Deletion: Should not be deleted while audit records may reference it.

Authorization boundary:

| Action | Who may do it |
| --- | --- |
| Read | Authorized platform admin/auditor; limited internal system use |
| Create | System when needed for governed actor attribution |
| Update | Rare; only safe label correction through governed process |
| Delete | No, unless retention policy allows and no audit reference depends on it |
| Approve | Platform governance |
| Supervise | Authorized platform admin or auditor |

## Relationship Review

### User -> User Identities

Why it exists: One account may authenticate through one or more identity methods.

Why not model differently: Putting authentication provider details directly on `users` would mix account identity with login method and make future provider support harder.

### User -> Sessions

Why it exists: A user can sign in on multiple devices or sessions, and each session must be independently revocable.

Why not model differently: Storing one session field on `users` would make sign-out, expiration, and security review too coarse.

### User -> Worker Profile

Why it exists: Worker profile is optional and separate from account creation.

Why not model differently: If worker fields are stored directly on `users`, the platform could accidentally treat every account as a worker or confuse profile completion with worker approval.

### Employer Organization -> Organization Memberships -> Users

Why it exists: Organizations have many users, and users may belong to more than one organization.

Why not model differently: A single `organization_id` on `users` would block multi-organization membership and make invitations, revocation, and suspension unclear.

### Employer Organization -> Residences -> Departments

Why it exists: The operating structure is company first, then residence/location, then department/work area.

Why not model differently: Placing departments directly under organizations would weaken the residence boundary unless explicitly approved. Placing residences under departments would reverse the real operating hierarchy.

### Role Definitions -> Role Permissions -> Permission Definitions

Why it exists: Roles are convenient labels, while permissions are exact actions. The mapping lets roles change without rewriting every workflow.

Why not model differently: Hardcoding permissions in app code only would make admin visibility, testing, and governance weaker.

### Organization Memberships -> Membership Roles -> Role Definitions

Why it exists: A user receives roles in the context of a specific organization membership.

Why not model differently: A global employer role on the user record could grant accidental access across organizations.

### Users / Organizations -> Audit Actor References

Why it exists: Future audit events need stable actor references.

Why not model differently: Copying user names or organization names into every future audit event would create stale, duplicated, and privacy-risky data.

## Index Review

| Index | Why it exists | Expected query | Expected scale | Performance value |
| --- | --- | --- | --- | --- |
| `users(email_normalized)` | Fast sign-in and uniqueness checks | Find account by email | High as users grow | Avoids full user-table scans |
| `users(status)` | Fast account-state filtering | List disabled/restricted users | Medium | Helps admin review queues |
| `user_identities(user_id)` | Load login identities for account | Get providers for user | Medium | Speeds account security views |
| `user_identities(provider, provider_subject)` | Fast provider login lookup | Find identity by provider subject | High | Required for sign-in performance |
| `sessions(user_id, status)` | Show/revoke current sessions | List active sessions for user | Medium/high | Supports safe session management |
| `sessions(expires_at)` | Clean expired sessions | Find expired sessions | High | Supports retention and cleanup |
| `sessions(session_hash)` | Validate session quickly | Lookup session from presented secret hash | Very high | Critical for auth performance |
| `employer_organizations(status)` | Admin review queues | List pending/restricted organizations | Medium | Speeds supervision screens |
| `employer_organizations(display_name)` | Organization search | Search/list companies | Medium | Improves admin/employer lookup |
| `organization_memberships(organization_id, status)` | Organization access and member list | List active members | High | Supports tenant access checks |
| `organization_memberships(user_id, status)` | User access resolution | List user's active memberships | High | Supports login/dashboard routing |
| `residences(organization_id, status)` | Residence list by company | List active residences | Medium/high | Supports employer onboarding/dashboard |
| `residences(organization_id, name)` | Residence search/uniqueness | Find residence by org/name | Medium | Prevents slow organization searches |
| `departments(organization_id, status)` | Department list by company | List active departments | Medium/high | Supports dashboard/setup views |
| `departments(residence_id, status)` | Department list by residence | List active departments at a location | Medium/high | Supports shift setup later |
| `departments(residence_id, name)` | Department search/uniqueness | Find department by residence/name | Medium | Prevents slow location-level searches |
| `role_permissions(permission_definition_id)` | Permission-to-role review | Find roles with a permission | Low/medium | Helps access review |
| `membership_roles(role_definition_id)` | Role assignment review | List members with a role | Medium | Helps security/access review |
| `worker_profiles(user_id)` | Load worker context | Get worker profile for account | High | Supports worker sign-in routing |
| `worker_profiles(status)` | Worker status review | List pending/restricted worker profiles | Medium | Helps future admin review |
| `audit_actor_references(user_id)` | Audit actor lookup | Find actor reference for user | Medium | Supports future audit records |
| `audit_actor_references(organization_id)` | Organization audit context | Find organization-scoped actors | Medium | Supports future audit filtering |

## Constraint Review

| Constraint | Problem it prevents | Corruption avoided | Risk if removed |
| --- | --- | --- | --- |
| Unique `users.public_id` | Duplicate external account references | Links or APIs pointing to wrong user | Security and identity confusion |
| Unique `users.email_normalized` | Multiple accounts with same canonical email | Login ambiguity | Account takeover and support risk |
| Unique provider identity | Same provider account linked twice | Duplicate authentication identity | Login and audit confusion |
| Unique `sessions.session_hash` | Session collision | One session validating as another | Critical security risk |
| Unique organization public ID | Duplicate external organization references | Wrong tenant routing | Cross-organization security risk |
| One non-terminal membership per user/org | Conflicting active memberships | Duplicate roles/statuses | Authorization inconsistency |
| Unique residence public ID | Duplicate location references | Wrong residence display/API routing | Tenant confusion |
| Unique active residence name per organization | Duplicate active locations | User selection ambiguity | Operational errors |
| Unique department public ID | Duplicate department references | Wrong department display/API routing | Operational confusion |
| Unique active department name per residence | Duplicate active work areas | Shift setup ambiguity | Staffing mistakes |
| Unique role key | Duplicate role meanings | Inconsistent access rules | Security drift |
| Unique permission key | Duplicate permission meanings | Unclear authorization checks | Security drift |
| Composite role-permission primary key | Duplicate permission mappings | Repeated grants | Review noise and drift |
| One active membership-role assignment | Conflicting active role grants | Duplicate access paths | Authorization confusion |
| Unique worker profile per user | Multiple worker identities for one user | Conflicting worker status | Eligibility confusion |
| Status value constraints | Invalid lifecycle states | Unreviewable records | Workflow and security errors |
| Profile completion 0-100 | Impossible completion values | Misleading worker status | UX and approval confusion |
| Department organization matches residence organization | Cross-tenant department linkage | Department under wrong employer | Critical tenant isolation risk |

## Migration Review

No migration exists or is authorized yet.

Why migration will be required if approved:

- The current repository has no business persistence schema.
- The proposed tables are needed before real authentication, organization onboarding, residences, departments, memberships, and authorization can move off fixtures.

Whether it changes existing data:

- In the current repo state, no production business tables exist.
- The first migration would create new tables only.
- It should not modify existing business records because none are currently present in this schema area.

Rollback strategy:

- Before production, tables can be dropped in reverse dependency order in local/test environments.
- After production, rollback should prefer forward corrective migrations to avoid data loss.
- User, membership, role, and actor records should be preserved unless a retention/legal process authorizes removal.

Production impact:

- No production impact until the owner approves the schema, migration tool, environment, and rollout.
- Production credentials must not be used during this review.
- Any production rollout needs backup, migration dry run, monitoring, and rollback plan.

## Privacy Classification Review

| Entity | Classification | Why |
| --- | --- | --- |
| `users` | Restricted | Contains personal account identifiers such as email |
| `user_identities` | Restricted | Contains authentication-provider and password-hash data |
| `sessions` | Restricted | Contains security-sensitive session references |
| `employer_organizations` | Confidential | Business identity and operational tenant information |
| `organization_memberships` | Restricted | Links people to organization access rights |
| `residences` | Confidential | Business operating locations; no clinical records |
| `departments` | Internal | Work-area structure under a residence |
| `role_definitions` | Internal | Security vocabulary; not public marketing content |
| `permission_definitions` | Internal | Security action vocabulary |
| `role_permissions` | Confidential | Defines who can do what by role |
| `membership_roles` | Restricted | Grants access to people in organizations |
| `worker_profiles` | Restricted | Personal worker boundary data |
| `audit_actor_references` | Confidential | Audit display references that may identify actors |

Classification meanings:

- Public: Safe for unauthenticated public display.
- Internal: Safe only inside authorized platform operations.
- Confidential: Business-sensitive or governance-sensitive information.
- Restricted: Personal, authentication, access-control, or security-sensitive information requiring strongest controls.

## Authorization Boundary Review

The foundation must use deny-by-default authorization.

Rules for all entities:

- Unauthenticated users cannot read, create, update, delete, approve, or supervise protected records.
- Authentication alone does not grant permissions.
- Active organization membership is required for employer organization access.
- Role assignment is required for specific organization actions.
- Platform admin access must not be inferred from organization owner access.
- Worker access must not grant employer management access.
- Employer access must not grant worker private-profile access.

Summary boundary:

| Entity | Read | Create | Update | Delete | Approve | Supervise |
| --- | --- | --- | --- | --- | --- | --- |
| `users` | Self or authorized admin | Sign-up/invite | Self basic or admin state | Closure only | Review workflow where applicable | Platform admin/auditor |
| `user_identities` | Auth/security only | Auth flow | Auth/security only | Security/closure only | Not identity approval | Security/platform admin |
| `sessions` | Auth/security only | Auth service | Auth service | Retention only | Not applicable | Security/platform admin |
| `employer_organizations` | Members/admins | Onboarding/admin | Org owner/admin | Close/archive only | Platform review | Platform admin/auditor |
| `organization_memberships` | Org owner/admin | Org owner/admin | Org owner/admin | Revoke/expire | Org/platform policy | Platform admin/auditor |
| `residences` | Org members/admins | Authorized org users | Authorized org users | Archive only | Usually not applicable | Platform admin/auditor |
| `departments` | Org members/admins | Authorized org users | Authorized org users | Archive only | Usually not applicable | Platform admin/auditor |
| `role_definitions` | Admin/limited display | Platform governance | Platform governance | Retire only | Platform governance | Platform admin/auditor |
| `permission_definitions` | Admin/limited display | Platform governance | Platform governance | Retire only | Platform governance | Platform admin/auditor |
| `role_permissions` | Platform admin/auditor | Platform governance | Platform governance | Revoke/supersede | Platform governance | Platform admin/auditor |
| `membership_roles` | Org owner/admin | Org owner/admin | Org owner/admin | Revoke only | Org/platform policy | Platform admin/auditor |
| `worker_profiles` | Worker self/admin reason | Worker flow | Worker basic/admin state | Closure only | Not Phase 01 | Platform admin/auditor |
| `audit_actor_references` | Platform audit/admin | System | Governed correction only | Retention only | Platform governance | Platform admin/auditor |

## Questions For Owner Approval

1. Is the proposed foundation schema approved as the minimum Phase 01 persistence boundary?
2. Is PostgreSQL approved as the persistence target?
3. Which migration/database tool is approved: raw SQL migrations, Prisma, Drizzle, Knex, or another option?
4. Should Phase 01 include application-owned session persistence, or should sessions be delegated to a future authentication provider?
5. Should Phase 01 include local password authentication, or should password/provider selection be decided before implementation?
6. Are departments strictly residence-scoped for Phase 01?
7. Should organization-wide departments be deferred unless an Architecture Change Request approves them?
8. Is `audit_actor_references` approved without full audit event persistence?
9. Are the proposed role keys approved?
10. Are the proposed Phase 01 permission keys approved?
11. May future permissions be seeded as disabled/unimplemented placeholders, or should they be omitted until their workflow phase?
12. Are the proposed local/test seed users and organization records approved?
13. Should physical deletion be prohibited for all foundation business records after production use?
14. Are the privacy classifications acceptable for owner review?
15. Is worker profile boundary persistence approved while detailed worker compliance data remains deferred?
16. Should employer onboarding connect to persistence before worker onboarding, or should both identity flows be implemented together?
17. What environment may be used first for migration validation: local only, local plus test, or staging after local/test pass?

## Recommended Implementation Order

1. Approve the schema and migration tool.

Why: Without this, implementation would either invent persistence details or create migration churn.

2. Add the first database migration and database package connection helpers.

Why: The foundation tables must exist before authentication, membership, and organization APIs can be honest.

3. Seed role and permission definitions.

Why: Authorization must be deny-by-default from the first working backend slice.

4. Implement authentication foundation.

Why: API access needs a trustworthy user/session boundary before organization data can be protected.

5. Implement membership and permission resolution.

Why: Organization, residence, and department APIs must know who may access what.

6. Implement employer organization persistence.

Why: Residence and department records need an owning organization first.

7. Implement residence persistence.

Why: Departments belong under residences in the proposed model.

8. Implement department persistence.

Why: Department setup completes the approved employer onboarding foundation.

9. Connect approved frontend surfaces.

Why: The UI should move from fixture-backed to persisted data only after backend authorization exists.

10. Add security, authorization, integration, and regression tests.

Why: The most important risk in this phase is not data entry; it is incorrect access across users, organizations, and roles.

This order is chosen because each layer depends on the previous one. User identity comes before sessions. Sessions come before authorization. Authorization comes before organization access. Organizations come before residences. Residences come before departments. Frontend integration comes last so the UI does not claim persistence before the backend is actually authoritative.

## Final Review Position

The proposal is ready for owner review.

No backend implementation should begin until the owner answers the approval questions and explicitly authorizes the next implementation step.
