# Resident Job Authorization Foundation Report

## Starting HEAD

`e29b1c9` — `docs(resident-job): authentication foundation report`

## Final HEAD

Final HEAD is the local documentation commit that contains this report. The exact hash is reported in the owner-review response after commit creation.

## Roles

Canonical Phase 01 authorization roles:

- Platform Administrator
- Organization Owner
- Organization Administrator
- Organization Staff
- Worker Access
- Dispatcher

Dispatcher is declared as reserved with no active permissions until the dispatch phase.

## Permissions

Phase 01 permission catalogue:

- `organization.read`
- `organization.update`
- `residence.read`
- `residence.create`
- `residence.update`
- `department.read`
- `department.create`
- `department.update`
- `work_group.read`
- `role_definition.read`
- `job_request.create`
- `job_request.read`
- `job_request.update_draft`
- `job_request.submit`
- `job_request.cancel`
- `job_request.admin_review`
- `job_request.request_information`
- `job_request.approve_for_dispatch`
- `audit.read`
- `platform.supervise`

Only `platform.supervise` is active at API level in this phase. Other permissions are catalogue-ready but reserved until their owning services are implemented.

## Role-Permission Matrix

See `RESIDENT_JOB_ROLE_PERMISSION_MATRIX.md`.

## Authorization Decision Flow

The canonical decision service evaluates:

1. Valid authenticated session.
2. Active account status.
3. Known permission.
4. Explicit role presence.
5. Required organization or platform context.
6. Role-to-permission mapping.
7. Permission lifecycle.

Outputs:

- Allow
- Deny
- Context Required
- Permission Missing
- Account Inactive
- Session Invalid

External responses are generic. Internal diagnostics retain exact denial reason for audit and tests.

## Deny-By-Default Behavior

The service denies when:

- no role is present
- permission is unknown
- required context is missing
- session is invalid
- session is expired or revoked
- account is disabled
- account is closed
- role lacks the requested permission
- permission is reserved for a future service

Development mode, email domain, and first registered user status do not grant authority.

## Platform-Admin Boundary

Platform Administrator is explicit only.

It is never inferred from:

- Organization Owner
- Organization Administrator
- Worker Access
- account age
- email address
- development mode
- membership count

Platform Administrator may pass the `platform.supervise` probe. Supervision does not create Organization Membership.

## Reserved Permissions

Reserved permissions are present in the catalogue and matrix but do not activate unimplemented workflows.

Reserved examples:

- organization management permissions
- residence permissions
- department permissions
- catalogue read permissions
- job request permissions
- audit read
- dispatcher role permissions

## API/Service Guards

Implemented API guard probes:

- `POST /authz/check`
- `POST /authz/platform-admin/probe`

These endpoints:

- require a valid authenticated session
- use a server-side role resolver
- do not accept client-supplied role authority
- return safe generic denial responses
- do not expose a full internal permission catalogue
- do not implement organization, residence, department, job request, audit, dispatch, or business CRUD APIs

## Audit Behavior

Authorization audit hooks are available for:

- sensitive authorization denial
- platform supervision allowance

The implementation does not audit every ordinary read.

The implementation does not log:

- passwords
- session tokens
- secrets
- full sensitive payloads

## Tests

Tests cover:

- no role denied
- unknown permission denied
- invalid session denied
- disabled account denied
- closed account denied
- Platform Administrator allowed for `platform.supervise`
- Organization Owner denied `platform.supervise`
- Worker Access denied organization management
- Organization Staff limited to approved permissions
- missing required context denied
- development/email/first-user assumptions grant no authority
- safe external denial response
- internal denial reason retained
- reserved permission does not activate unimplemented workflow
- audit hook for sensitive denial
- Dispatcher declared without active permissions
- duplicate role-permission mapping handled by seed upsert
- API deny-by-default guard
- API platform-admin probe
- API check permission guard

## Deferred Organization Membership Work

Deferred to the next approved phase:

- assigning users to organization roles
- organization membership lifecycle
- membership acceptance
- membership revocation
- organization-scoped role resolution
- residence membership
- department membership
- ownership transfer
- organization-specific authorization data loading

## Remaining Risks

- Authorization role assignment is intentionally not implemented.
- Reserved permissions require revalidation when their owning services are implemented.
- API guards currently depend on an injected role resolver; production role resolution awaits Organization Membership.
- Platform admin provisioning remains a future explicit administrative process.

## Readiness Verdict

**AUTHORIZATION FOUNDATION READY FOR OWNER REVIEW**

Authorization is implemented as a deny-by-default foundation with explicit roles, explicit permissions, context requirements, safe external errors, internal denial diagnostics, audit hooks, and minimal API guards. Organization Membership and all business workflows remain deferred.
