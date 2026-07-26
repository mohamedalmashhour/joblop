# Page 040 - Departments Low-Fidelity Wireframe

Status: Initial wireframe complete
Epic: Epic 4 - Employer Portal
Primary users: Employer, Residence Manager, Scheduler
Secondary users: Support, Compliance, Administrator, Super Administrator where role-permitted
Architecture baseline: Resident Job Architecture Phase 1 v1.0
Frozen architecture source: pages/PAGE_040_DEPARTMENTS.md
Preceding baseline: Page 039 - Residences Approved Wireframe v1.0
Implementation: Not authorized

## 1. Frozen Page Confirmation

The frozen architecture page map defines:

| Page | Frozen title | Source |
| --- | --- | --- |
| 039 | Residences | pages/PAGE_039_RESIDENCES.md |
| 040 | Departments | pages/PAGE_040_DEPARTMENTS.md |
| 041 | Create Shift | pages/PAGE_041_CREATE_SHIFT.md |

Page 040 remains an Employer Portal page inside the residence-management domain. It does not
create staffing, scheduling, payroll, compliance, messaging, notification, analytics, or AI
integrations.

## 2. Page Purpose

Departments lets authorized employer-side users understand and manage permitted department
information inside a residence.

The page allows authorized users to:

- view departments within a residence;
- distinguish operational departments from physical locations;
- understand department staffing readiness;
- understand department ownership;
- understand department visibility;
- route to staffing and scheduling;
- manage permitted department information.

The page must not become:

- staffing engine;
- scheduling engine;
- payroll;
- HR;
- compliance adjudication;
- resident registry;
- clinical record;
- analytics.

## 3. Department Concepts

Departments are operational groupings inside a residence. They must remain separate from adjacent
concepts.

| Concept | Meaning | Boundary |
| --- | --- | --- |
| Residence | Employer operating facility or site | Owns site-level context, not department internals |
| Department | Operational unit inside a residence | Not a shift, worker, budget, or clinical unit |
| Unit | Local operational grouping where used | Not automatically a department |
| Service | Service category or work area | Not necessarily a department |
| Cost centre | Financial grouping where governed | Not the department record itself |
| Operational team | People or roles supporting work | Not worker assignment |
| Shift assignment | Confirmed staffing event | Owned by shift/assignment workflows |
| Worker | Individual worker profile and status | Not owned by department page |

Required distinctions:

```text
Residence
does not equal
Department

Department
does not equal
Shift

Department
does not equal
Worker

Department
does not equal
Budget
```

## 4. Department Types

Department type is configurable and must not hardcode a single care model.

Examples only:

- Nursing;
- Care;
- Kitchen;
- Housekeeping;
- Maintenance;
- Laundry;
- Recreation;
- Administration;
- Reception;
- Security;
- Other approved departments.

Department type must not imply active staffing need, payroll budget, worker eligibility, or
compliance approval.

## 5. Department Record

Each department record may conceptually include:

- department name;
- department type;
- residence;
- operational status;
- staffing summary;
- contact role;
- worker visibility;
- compliance summary;
- created date;
- effective date;
- pending changes.

Do not include resident/patient information, clinical notes, budgets, worker payroll, internal
metrics, or unrestricted compliance evidence.

## 6. Operational Status

Department operational states remain independent:

```text
Draft
↓
Planning
↓
Operational
↓
Restricted
↓
Suspended
↓
Inactive
↓
Closed
```

Do not collapse these into one "Active" status.

Required distinctions:

```text
Department created
does not equal
Department operational

Department operational
does not equal
Shift available

Department restricted
does not equal
Residence restricted

Department closed
does not equal
Historical shifts or audit records deleted
```

## 7. Desktop Wireframe

```text
HEADER
Resident Job | Departments | Organization: [Selected organization] | Residence: [Selected residence]
Role: [Employer / Residence Manager / Scheduler] | Support

GOVERNANCE NOTICE
Departments organize work areas inside a residence.
They do not own shifts, assignments, attendance, payroll, compliance decisions, budgets,
resident records, or clinical information.
AI cannot create, activate, suspend, staff, or approve departments.

FILTER AND SEARCH
Search departments
Filters: Department type | Operational status | Staffing attention | Compliance attention | Worker-visible

DEPARTMENT LIST
[Department card]
- Department name
- Department type
- Residence
- Operational status
- Staffing attention summary
- Contact role
- Worker visibility
- Compliance summary
- Pending change indicator

SELECTED DEPARTMENT DETAIL
Department identity
- Name
- Type
- Residence
- Created date
- Effective date
- Pending changes

Operational status
- Draft / Planning / Operational / Restricted / Suspended / Inactive / Closed
- Reason or support path where governed
- Last updated

Staffing readiness summary
- Open positions summary
- Workers assigned summary
- Workers expected summary
- Vacancies summary
- Staffing attention summary
- Route to staffing workflow

Contacts and ownership
- Department owner or manager role
- Scheduling contact role
- Operational contact role
- Compliance contact role where governed

Worker-facing preview
- Approved department name
- Assignment instructions
- Department visibility label

Compliance summary
- Compliance attention
- Document status
- Licence/requirement summary
- Action required

History and audit summary
- Creation
- Edits
- Operational status changes
- Contact changes
- Visibility changes
```

## 8. Mobile Wireframe

```text
TOP BAR
Departments | Residence selector | Support

RESIDENCE CONTEXT
Selected residence
Department count
Action-required summary

FILTERS
Search | Status | Type | Action required

DEPARTMENT CARDS
Name
Type
Operational status
Staffing attention
Worker visibility
Compliance summary

DETAIL VIEW
Identity
Operational status
Staffing readiness
Contacts
Worker-facing preview
Compliance summary
History/support
```

Mobile priorities:

- selected residence context;
- department list;
- operational status;
- staffing attention;
- action-required items;
- worker visibility;
- large touch targets;
- safe previews;
- plain-language restricted states.

## 9. Worker Visibility

Workers may only see:

- assigned department;
- approved department name;
- assignment instructions.

Workers must not see:

- department staffing strategy;
- budgets;
- internal metrics;
- internal compliance;
- private operational notes;
- unrestricted contact lists;
- unrelated department information;
- department-level risk indicators.

Required distinctions:

```text
Worker-visible department
does not equal
Public department profile

Assigned department
does not equal
Access to department staffing strategy
```

## 10. Staffing Boundary

Departments may summarize:

- open positions;
- workers assigned;
- workers expected;
- vacancies;
- staffing attention.

Departments must not own:

- shift creation;
- worker assignment;
- attendance;
- payroll;
- approvals;
- worker eligibility;
- replacement dispatch.

Every staffing summary must route to the authoritative staffing or shift workflow.

## 11. Compliance Boundary

Departments may summarize:

- compliance attention;
- document status;
- licence requirements;
- action required.

Departments must not own:

- compliance decisions;
- document verification;
- investigations;
- regulator integrations;
- suspension adjudication.

Required distinctions:

```text
Compliance attention
does not equal
Noncompliance

Document status
does not equal
Compliance approval

Department restriction
does not equal
Residence suspension
```

## 12. Role Separation

Role concepts:

- organization owner;
- residence manager;
- department manager;
- scheduler;
- operations contact;
- compliance contact;
- read-only observer.

Required distinctions:

```text
Residence manager
does not equal
Department manager for every department

Department manager
does not equal
Compliance authority

Scheduler
does not equal
Payroll authority
```

## 13. Empty and Error States

Required states:

- no departments configured;
- no active departments;
- department unavailable;
- access denied;
- edit unavailable;
- save failed;
- staffing summary unavailable;
- compliance summary unavailable;
- worker-facing preview unavailable;
- pending change;
- restricted department;
- support unavailable;
- service unavailable.

Do not fabricate department, staffing, compliance, or worker data.

## 14. Auditability

Conceptually preserve audit history for:

- department creation;
- department edits;
- operational status changes;
- contact changes;
- visibility changes.

Audit records should include:

- actor;
- role;
- timestamp;
- action;
- department reference;
- prior state;
- resulting state;
- reason or case reference where governed;
- result.

Do not log resident or patient information.

## 15. AI Boundary

AI may:

- summarize department status;
- explain operational states;
- identify visible action-required items;
- suggest navigation.

AI must never:

- create departments;
- activate departments;
- suspend departments;
- assign workers;
- create shifts;
- alter staffing;
- approve compliance;
- fabricate metrics.

The authoritative department and workflow records remain controlling.

## 16. Accessibility

The page must support:

- semantic department headings;
- keyboard navigation;
- screen-reader-friendly status labels;
- accessible filters;
- no color-only operational or compliance states;
- readable department cards;
- focus management;
- sufficient contrast;
- plain-language errors;
- accessible status-change confirmation.

## 17. International Readiness

The page must not hardcode:

- department type;
- healthcare department model;
- staffing role set;
- compliance terminology;
- licence terminology;
- cost-centre model;
- address or residence model;
- date format;
- language;
- timezone;
- worker-facing visibility rules.

Department taxonomy, staffing model, compliance policy, locale, and permission rules remain
configurable.

## 18. Future Boundary

Page 040 does not own:

- staffing engine;
- scheduling engine;
- shift creation;
- worker assignment;
- attendance;
- payroll;
- HR;
- compliance adjudication;
- document verification;
- messaging;
- notifications;
- analytics;
- resident registry;
- clinical records;
- AI integrations.

It provides governed visibility, controls, and routing only.

## 19. Self Validation

| Requirement | Result |
| --- | --- |
| Frozen title remains Departments | Pass |
| Architecture Freeze unchanged | Pass |
| Employer Portal scope unchanged | Pass |
| Pages 001-039 unchanged | Pass |
| No Page 041 files created | Pass |
| No approval record created | Pass |
| No implementation started | Pass |
| No React/frontend/backend/API/database work | Pass |
| No staffing or scheduling implementation created | Pass |
| No payroll implementation created | Pass |
| No compliance implementation created | Pass |
| No messaging or notification implementation created | Pass |
| No analytics implementation created | Pass |
| No AI integration created | Pass |
| Unrelated app changes untouched | Pass |

## 20. Final Wireframe Status

```text
Page 040 - Departments
Wireframe: COMPLETE
Product Review: REQUIRED
Approval Record: NOT CREATED

Page 041 - Create Shift
BLOCKED
```
