# Resident Job Work Groups Foundation Report

## 1. Starting HEAD

`c7bcd90` — `docs(resident-job): department foundation report`

## 2. Final HEAD

Pending local commits at the time this report was authored.

## 3. WorkGroup Model

The Work Groups Foundation uses the existing approved Phase 01 `WorkGroup` entity.

Implemented fields:

- WorkGroup ID
- stable internal key
- public slug derived from the stable key
- display label
- catalogue status
- display order
- icon key
- qualification summary
- safety requirement summary
- default template key
- created timestamp
- updated timestamp
- version derived from `updatedAt`

No schema fields were added.

## 4. Global Catalogue Governance

Work Groups are global platform-managed catalogue records.

They are not:

- Departments
- Role Definitions
- Employer Organizations
- Residences
- Job Requests
- Access Roles
- authorization permissions

Ordinary organization users may read active Work Groups. They cannot create, update, activate, deactivate, or delete global catalogue records.

Platform administrators may manage approved presentation fields and lifecycle state only through explicit `platform.supervise` authority.

## 5. Initial Catalogue

The approved public catalogue slugs are exposed as:

- `kitchen`
- `care-nursing`
- `housekeeping-support`
- `maintenance`

The existing database stores stable internal keys using the approved historical seed format:

- `kitchen`
- `care_nursing`
- `housekeeping_support`
- `maintenance`

The service derives the public slug from the internal key by replacing underscores with hyphens. This preserves the existing database baseline while exposing owner-approved slug language to API consumers.

## 6. Lifecycle

The approved `CatalogueStatus` values are:

- `active`
- `inactive`
- `retired`

Implemented lifecycle management supports:

- `active -> inactive`
- `inactive -> active`

Retired records are preserved as historical catalogue records and are not reactivated through ordinary lifecycle APIs.

Inactive Work Groups:

- remain visible to Platform Administrators
- are hidden from ordinary active catalogue reads
- are preserved for existing references
- are not physically deleted

## 7. Authorization

Activated permission:

- `work_group.read`

Ordinary read behavior:

- requires authenticated session
- requires `work_group.read`
- organization users may resolve this through active organization membership
- only active Work Groups are returned

Platform management behavior:

- requires authenticated session
- requires explicit `PLATFORM_ADMINISTRATOR` role or equivalent role containing `platform.supervise`
- does not infer platform authority from organization ownership

## 8. API/Service Boundary

Implemented API routes:

- `GET /work-groups`
- `GET /work-groups/:slug`
- `GET /platform/work-groups`
- `GET /platform/work-groups/:slug`
- `PATCH /platform/work-groups/:slug`
- `POST /platform/work-groups/:slug/status`

Not implemented:

- RoleDefinition APIs
- organization-specific WorkGroup creation
- public catalogue mutation
- Job Request APIs
- frontend capsule integration

Create WorkGroup was not exposed in this phase. The initial global catalogue remains seeded through the approved seed boundary.

## 9. Seed Behavior

The seed remains idempotent.

Implemented seed behavior:

- first run creates the approved four Work Groups
- second run creates no duplicates
- stable internal keys remain unchanged
- deterministic display order is preserved for newly created records
- existing owner-edited WorkGroup presentation fields are not overwritten
- inactive WorkGroups are not reactivated by seed
- no users, credentials, Job Requests, assignments, attendance, finance, or business workflow records are seeded

The existing RoleDefinition seed remains present but Role Definitions were not implemented as services or APIs in this phase.

## 10. Localization Boundary

No translation subsystem was added.

Current behavior:

- default display label remains authoritative
- public slug remains stable
- localization is left as a future catalogue presentation layer

Future support can map stable slugs/keys to English, French, and Arabic labels without changing WorkGroup identity or business logic.

## 11. Audit Events

Implemented WorkGroup audit actions:

- `work_group.updated`
- `work_group.activated`
- `work_group.deactivated`
- `work_group.access_denied`

Audit records conceptually include:

- actor
- WorkGroup
- prior state
- new state
- reason
- timestamp
- correlation identifier
- source

No secrets or tenant-owned operational data are logged.

## 12. Concurrency

Optimistic concurrency uses the approved version mechanism derived from `updatedAt`.

Implemented behavior:

- valid version succeeds
- stale version fails safely
- invalid version fails safely
- slug/key cannot be modified through the API
- WorkGroup ID cannot be modified through the API

## 13. Tests

Focused tests cover:

- initial four Work Groups present
- stable internal keys
- public slugs
- deterministic order
- active-only ordinary list
- inactive visible to Platform Admin
- read by slug
- unknown slug handled safely
- anonymous read denied
- ordinary employer read allowed
- ordinary employer update denied
- Organization Owner cannot manage global catalogue
- Platform Administrator update allowed
- Platform Administrator activate/deactivate allowed
- active to inactive
- inactive to active
- stale update rejected
- inactive record preserved
- seed first run
- seed second run idempotency
- no duplicate WorkGroups
- seed preserves owner-edited presentation fields and inactive lifecycle state

## 14. Security Validation

Security controls preserved:

- safe authorization errors
- no public unrestricted mutation
- no tenant-owned catalogue duplication
- no organization-owner catalogue-management authority
- no platform-supervision inference from organization ownership
- no secrets logged
- no role, permission, Job Request, or workflow state changes

## 15. Deferred Role Definitions

Role Definitions remain deferred.

This phase does not:

- implement RoleDefinition services
- expose RoleDefinition APIs
- create organization-specific roles
- map WorkGroups to Job Requests
- implement qualification logic
- implement safety rules

## 16. Remaining Risks

Remaining implementation risks:

- The current schema uses `key` rather than a separate `slug` column; the public slug is derived from the stable key.
- Existing RoleDefinition seed data remains in the shared seed file from the approved database foundation, but no RoleDefinition service/API was implemented in this phase.
- Localization remains a documented boundary rather than an implemented translation system.

## 17. Readiness Verdict

WORK GROUPS FOUNDATION READY FOR OWNER REVIEW
