# Resident Job Role-Permission Matrix

## Scope

This matrix defines the Authorization Foundation only. It does not assign users to roles, create organization membership, or activate organization, residence, department, job request, dispatch, audit, or worker workflow APIs.

## Dispatcher Decision

Dispatcher is declared as a reserved role with no active permissions in this phase.

Reason: dispatch authority belongs to a later dispatch implementation phase. Granting dispatch permissions now would imply operational workflow authority before Job Request Foundation, Admin Intake, and Dispatch are implemented.

## Roles

| Role | Context | Phase 01 status | Boundary |
| --- | --- | --- | --- |
| Platform Administrator | Platform | Active for `platform.supervise` probe only | Explicit platform supervision. Does not imply organization ownership. |
| Organization Owner | Organization | Catalogue defined, workflow permissions reserved | Future broad authority inside own organization only. |
| Organization Administrator | Organization | Catalogue defined, workflow permissions reserved | Future organization operations without ownership-only powers. |
| Organization Staff | Organization | Catalogue defined, workflow permissions reserved | Future limited organization reads and job request drafting. |
| Worker Access | Worker | Defined with no employer-management permissions | Worker-specific backend permissions deferred. |
| Dispatcher | Platform | Reserved with no permissions | Deferred until dispatch phase. |

## Role-Permission Mapping

| Permission | Platform Administrator | Organization Owner | Organization Administrator | Organization Staff | Worker Access | Dispatcher |
| --- | --- | --- | --- | --- | --- | --- |
| `organization.read` | No | Yes | Yes | Yes | No | No |
| `organization.update` | No | Yes | No | No | No | No |
| `residence.read` | No | Yes | Yes | Yes | No | No |
| `residence.create` | No | Yes | Yes | No | No | No |
| `residence.update` | No | Yes | Yes | No | No | No |
| `department.read` | No | Yes | Yes | Yes | No | No |
| `department.create` | No | Yes | Yes | No | No | No |
| `department.update` | No | Yes | Yes | No | No | No |
| `work_group.read` | No | Yes | Yes | Yes | No | No |
| `role_definition.read` | No | Yes | Yes | Yes | No | No |
| `job_request.create` | No | Yes | Yes | Yes | No | No |
| `job_request.read` | No | Yes | Yes | Yes | No | No |
| `job_request.update_draft` | No | Yes | Yes | Yes | No | No |
| `job_request.submit` | No | Yes | Yes | Yes | No | No |
| `job_request.cancel` | No | Yes | Yes | Yes | No | No |
| `job_request.admin_review` | Yes | No | No | No | No | No |
| `job_request.request_information` | Yes | No | No | No | No | No |
| `job_request.approve_for_dispatch` | Yes | No | No | No | No | No |
| `audit.read` | Yes | No | No | No | No | No |
| `platform.supervise` | Yes | No | No | No | No | No |

## Permission Details

| Permission | Purpose | Receives Permission | Organization Context Required | Platform Context Required | Status | Security Risk | Test Requirement |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `organization.read` | Read future organization summaries. | Organization Owner, Organization Administrator, Organization Staff | Yes | No | Reserved | Organization information exposure without context. | Deny without organization context. |
| `organization.update` | Update future organization summaries. | Organization Owner | Yes | No | Reserved | Unauthorized organization changes. | Staff and worker denied. |
| `residence.read` | Read future residence summaries. | Organization Owner, Organization Administrator, Organization Staff | Yes | No | Reserved | Facility information exposure. | Deny without organization context. |
| `residence.create` | Create future residences. | Organization Owner, Organization Administrator | Yes | No | Reserved | Operational locations could be created prematurely. | Staff and worker denied. |
| `residence.update` | Update future residences. | Organization Owner, Organization Administrator | Yes | No | Reserved | Residence details could be changed prematurely. | Staff and worker denied. |
| `department.read` | Read future department summaries. | Organization Owner, Organization Administrator, Organization Staff | Yes | No | Reserved | Operating structure exposure. | Deny without organization context. |
| `department.create` | Create future departments. | Organization Owner, Organization Administrator | Yes | No | Reserved | Operating units could be created prematurely. | Staff and worker denied. |
| `department.update` | Update future departments. | Organization Owner, Organization Administrator | Yes | No | Reserved | Operating units could be changed prematurely. | Staff and worker denied. |
| `work_group.read` | Read future work group catalogue. | Organization Owner, Organization Administrator, Organization Staff | No | No | Reserved | Low risk but no active catalogue API yet. | Does not activate endpoint. |
| `role_definition.read` | Read future role definition catalogue. | Organization Owner, Organization Administrator, Organization Staff | No | No | Reserved | Low risk but no active catalogue API yet. | Does not activate endpoint. |
| `job_request.create` | Create future job requests. | Organization Owner, Organization Administrator, Organization Staff | Yes | No | Reserved | Commercial demand could be created before workflow exists. | Reserved permission denies active workflow. |
| `job_request.read` | Read future job requests. | Organization Owner, Organization Administrator, Organization Staff | Yes | No | Reserved | Commercial staffing demand exposure. | Deny without organization context. |
| `job_request.update_draft` | Update future draft job requests. | Organization Owner, Organization Administrator, Organization Staff | Yes | No | Reserved | Commercial demand could be altered prematurely. | Reserved until Job Request Foundation. |
| `job_request.submit` | Submit future job requests. | Organization Owner, Organization Administrator, Organization Staff | Yes | No | Reserved | Could trigger operational review too early. | Reserved until Job Request Foundation. |
| `job_request.cancel` | Cancel future job requests. | Organization Owner, Organization Administrator, Organization Staff | Yes | No | Reserved | Could alter commercial demand prematurely. | Reserved until Job Request Foundation. |
| `job_request.admin_review` | Future platform admin review. | Platform Administrator | No | Yes | Reserved | Could approve operations before admin intake exists. | Organization roles denied. |
| `job_request.request_information` | Future platform request for more information. | Platform Administrator | No | Yes | Reserved | Could alter employer workflow before intake exists. | Platform context required. |
| `job_request.approve_for_dispatch` | Future approval for dispatch. | Platform Administrator | No | Yes | Reserved | Could enter dispatch before workflow exists. | Platform context required. |
| `audit.read` | Future audit summary read. | Platform Administrator | No | Yes | Reserved | Sensitive audit history exposure. | Platform context required. |
| `platform.supervise` | Explicit platform supervision probe. | Platform Administrator | No | Yes | Active | High privilege; must never be inferred. | Platform Administrator allowed; Organization Owner denied. |

## Boundary Notes

- No role means no permission.
- Unknown permissions deny.
- Missing required context denies.
- Development mode grants no authority.
- Email domain grants no authority.
- First registered user is not automatically Platform Administrator.
- Reserved permissions do not activate unimplemented workflows.
- Organization Membership remains deferred.
