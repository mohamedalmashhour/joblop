# Resident Job Role Definitions Foundation Report

Verdict: ROLE DEFINITIONS FOUNDATION READY FOR OWNER REVIEW

## 1. Starting HEAD

Starting HEAD:

`f9b265a` — `docs(resident-job): define global hr core expansion`

The accepted Global HR Core Expansion decision preserves Option C for Phase 01:

- RoleDefinition remains unchanged.
- RoleDefinition stays an operational Resident Job role under WorkGroup.
- No GlobalOccupation is introduced in this phase.
- Future GlobalOccupation support requires a separate Architecture Change Request.

## 2. Final HEAD

Final HEAD will be the documentation commit created after implementation and validation.

## 3. RoleDefinition Model

RoleDefinition is implemented as the approved global platform-managed operational staffing role catalogue under WorkGroup.

Examples:

- Chef
- Sous-chef
- Cook
- Kitchen Helper
- Dishwasher
- Nurse
- Licensed Practical Nurse
- Personal Support Worker
- Care Aide
- Housekeeper
- Laundry Worker
- Dining-room Aide
- General Support
- General Maintenance
- Repair Technician
- Facility Support
- Emergency Maintenance

RoleDefinition remains distinct from:

- AccessRoleDefinition
- authorization permission
- Department
- Worker Profile
- qualification record
- safety record
- pay rate
- Job Request
- Assignment
- GlobalOccupation
- Permanent Vacancy

## 4. WorkGroup Relationship

Each RoleDefinition belongs to exactly one WorkGroup through the existing schema relationship.

Implemented behavior:

- RoleDefinitions are listed in deterministic WorkGroup order.
- Ordinary reads only expose active RoleDefinitions under active WorkGroups.
- Platform administrators may inspect inactive RoleDefinitions and roles under inactive WorkGroups.
- Ordinary APIs do not support moving a RoleDefinition between WorkGroups.
- Seed behavior does not overwrite an existing RoleDefinition WorkGroup relationship.

## 5. Role Code Strategy

The existing immutable internal key is exposed as a stable operational role code.

Examples:

- `chef` -> `CHEF`
- `sous_chef` -> `SOUS_CHEF`
- `licensed_practical_nurse` -> `LICENSED_PRACTICAL_NURSE`
- `personal_support_worker` -> `PERSONAL_SUPPORT_WORKER`

Role codes are:

- backend-managed
- stable across label changes
- stable across localization
- not editable through ordinary APIs
- not derived from sensitive information
- suitable for reporting and integration references

## 6. Public Slug Strategy

Public slugs are derived from existing internal keys by converting underscores to hyphens.

Examples:

- `sous_chef` -> `sous-chef`
- `kitchen_helper` -> `kitchen-helper`
- `licensed_practical_nurse` -> `licensed-practical-nurse`
- `personal_support_worker` -> `personal-support-worker`

This preserves the approved database key strategy while exposing URL-safe public identifiers.

No existing keys were silently changed.

## 7. Initial Catalogue

The approved initial catalogue remains:

Kitchen:

- CHEF
- SOUS_CHEF
- COOK
- KITCHEN_HELPER
- DISHWASHER

Care / Nursing:

- NURSE
- LICENSED_PRACTICAL_NURSE
- PERSONAL_SUPPORT_WORKER
- CARE_AIDE

Housekeeping / Support:

- HOUSEKEEPER
- LAUNDRY_WORKER
- DINING_ROOM_AIDE
- GENERAL_SUPPORT

Maintenance:

- GENERAL_MAINTENANCE
- REPAIR_TECHNICIAN
- FACILITY_SUPPORT
- EMERGENCY_MAINTENANCE

No users, credentials, workers, qualifications, rates, assignments, Job Requests, or payment records are seeded.

## 8. Lifecycle

Implemented lifecycle:

- active
- inactive

Retired remains recognized as a historical schema status, but no ordinary reactivation from retired is allowed.

Active RoleDefinitions:

- visible in ordinary catalogue reads
- usable by future Job Requests
- usable by future worker profiles

Inactive RoleDefinitions:

- retained for history
- excluded from ordinary new-selection reads
- visible to Platform Administrator
- not physically deleted

## 9. Authorization

Ordinary authenticated organization users may read active RoleDefinitions through:

`role_definition.read`

Platform administrators may manage catalogue presentation and lifecycle through:

`platform.supervise`

The implementation does not infer Platform Administrator authority from:

- Organization Owner
- Organization Administrator
- email domain
- development mode
- first account
- membership count

## 10. API and Service Boundary

Implemented ordinary consumption endpoints:

- `GET /role-definitions`
- `GET /role-definitions/:identifier`

Implemented platform-supervised catalogue endpoints:

- `GET /platform/role-definitions`
- `GET /platform/role-definitions/:identifier`
- `PATCH /platform/role-definitions/:identifier`
- `POST /platform/role-definitions/:identifier/status`

Not implemented:

- create RoleDefinition endpoint
- delete RoleDefinition endpoint
- organization-specific role creation
- qualification APIs
- pricing APIs
- Job Request APIs
- GlobalOccupation APIs
- frontend role-selector integration

## 11. Seed Behavior

Seed behavior now:

- creates missing approved RoleDefinitions
- creates no duplicates on repeated runs
- preserves stable role codes
- preserves stable public slug source keys
- preserves owner-edited labels
- preserves owner-edited display order
- preserves inactive lifecycle state
- preserves existing WorkGroup relationships
- creates no unrelated records

This mirrors the WorkGroup foundation seed behavior.

## 12. Localization Boundary

RoleDefinition supports the existing `localizedLabelKey` boundary.

Future localization may include:

- English
- French
- Arabic

Default display label remains authoritative when translation is unavailable.

No translation platform, locale-specific business logic, or GlobalOccupation localization was introduced.

## 13. Audit Events

Audit hooks were added for:

- `role_definition.updated`
- `role_definition.activated`
- `role_definition.deactivated`
- `role_definition.access_denied`

Audit events include:

- actor reference
- RoleDefinition ID
- WorkGroup ID
- prior state
- new state
- reason where applicable
- timestamp
- correlation identifier
- source

No secrets or unrelated tenant data are logged.

## 14. Concurrency

Optimistic concurrency uses the approved `updatedAt` version mechanism.

Implemented behavior:

- valid version succeeds
- stale version is rejected
- invalid version is rejected
- status updates require current version
- presentation updates require current version

Immutable fields remain unchanged:

- RoleDefinition ID
- role code source key
- public slug source key
- WorkGroup ID

## 15. Tests

Focused tests cover:

- approved initial roles
- WorkGroup mapping
- stable role codes
- stable public slugs
- deterministic ordering
- active-only ordinary list
- inactive visible to Platform Admin
- filtering by WorkGroup
- read by code
- read by slug
- unknown identifier handling
- anonymous denial
- ordinary employer read
- ordinary employer management denial
- Organization Owner management denial
- Platform Administrator update
- Platform Administrator activate/deactivate
- stale update rejection
- inactive parent WorkGroup hiding for ordinary reads
- seed idempotency
- no duplicate role creation
- owner-managed seed preservation
- WorkGroup regression
- authorization regression

## 16. Security Validation

Security boundaries preserved:

- RoleDefinition is global catalogue data, not tenant-owned data.
- Ordinary users can only read active roles through authorized organization context.
- Platform catalogue management requires explicit platform supervision.
- Management denials use safe authorization responses.
- No sensitive worker, credential, payroll, health, banking, or investigation data is exposed.

## 17. Deferred Job Request Work

Job Request Foundation remains deferred.

This phase does not implement:

- Job Request creation
- dispatch
- worker offers
- assignment
- attendance
- timesheets
- finance
- notifications
- AI
- reporting

## 18. Remaining Risks

Remaining risks:

- Future GlobalOccupation mapping must be introduced through a governed ACR.
- Future organization-specific aliases require a separate model and owner decision.
- Future qualification and safety requirements must not be added to RoleDefinition without governance.
- Future Job Request Foundation must respect inactive WorkGroup and inactive RoleDefinition selection boundaries.

## 19. Readiness Verdict

Role Definitions Foundation is ready for owner review.

Verdict: ROLE DEFINITIONS FOUNDATION READY FOR OWNER REVIEW
