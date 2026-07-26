# Page 040 - Departments Wireframe Revision 1

Status: Revision 1 complete
Epic: Epic 4 - Employer Portal
Primary users: Employer, Residence Manager, Scheduler
Baseline wireframe: PAGE_040_DEPARTMENTS_LOW_FIDELITY_WIREFRAME.md
Owner decision: Approved with documented conditions
Implementation: Not authorized

## 1. Revision Summary

Revision 1 strengthens department governance without redesigning Page 040 or modifying approved
Pages 001-039.

The revision focuses on:

- department hierarchy;
- residence-versus-department boundaries;
- department lifecycle;
- role and permission governance;
- staffing and scheduling boundaries;
- worker-facing visibility;
- compliance and financial boundaries;
- auditability;
- AI boundaries;
- readiness for Page 041 - Create Shift.

## 2. Department Hierarchy

Departments must remain separate from adjacent organization, residence, staffing, and financial
concepts.

| Concept | Meaning | Boundary |
| --- | --- | --- |
| Organization | Employer account or business context | Not a department |
| Residence | Operating site or facility | Parent context for departments |
| Department | Operational work area inside a residence | Not a shift, budget, worker group, or physical unit by default |
| Unit | Local grouping where used | Not automatically a department |
| Service | Service category | Not necessarily a department |
| Operational team | People supporting work | Not the department record |
| Cost centre | Financial grouping where governed | Not the department itself |
| Shift | Scheduled work need | Owned by Page 041 and shift workflows |
| Assignment | Worker assigned to a shift | Owned by assignment workflow |

Required distinctions:

```text
Residence
does not equal
Department

Department
does not equal
Physical unit

Department
does not equal
Shift

Department
does not equal
Cost centre

Department
does not equal
Worker group
```

Page 040 must not absorb Page 041 - Create Shift.

## 3. Department Ownership and Permissions

Department access must remain role-specific.

Roles and contacts:

- organization owner;
- residence manager;
- department manager;
- scheduler;
- compliance contact;
- finance contact;
- operational contact;
- read-only user.

Required distinctions:

```text
Organization membership
does not equal
Access to every department

Residence access
does not equal
Department edit authority

Department manager
does not equal
Payroll or compliance authority

Dashboard visibility
does not equal
Permission to change department status
```

## 4. Independent Department Lifecycles

No lifecycle state may imply another.

| Lifecycle | States |
| --- | --- |
| Record lifecycle | Draft, submitted, current, superseded, archived, unavailable |
| Operational lifecycle | Planning, pending activation, operational, temporarily restricted, suspended, inactive, deactivation requested, deactivated, closure requested, closed, status unavailable |
| Worker-visibility lifecycle | Private, assignment-visible, worker-visible, publication pending, restricted, removed from view, unavailable |
| Compliance lifecycle | Compliant, attention required, action required, restricted, suspended, unknown |

Do not use one generic "Active" label for every state.

## 5. Operational Truthfulness

Required distinctions:

```text
Department created
does not equal
Department operational

Department operational
does not equal
Fully staffed

Role listed
does not equal
Shift required

Shift required
does not equal
Shift created

Worker assigned
does not equal
Worker checked in

Worker checked in
does not equal
Shift completed
```

## 6. Configurable Department Types

Department types remain configurable.

Examples only:

- Nursing;
- Care;
- Kitchen;
- Housekeeping;
- Laundry;
- Maintenance;
- Recreation;
- Reception;
- Administration;
- Security;
- Other approved type.

Required distinctions:

```text
Department type
does not equal
Legal classification

Department type
does not equal
Professional authorization

Department type
does not equal
Current staffing demand
```

## 7. Department Record

Each department record may conceptually include:

- department name;
- configurable department type;
- parent residence;
- operational status;
- worker-facing label;
- department manager or contact role;
- timezone inherited or overridden where governed;
- staffing summary;
- compliance summary;
- created date;
- effective date;
- pending changes;
- action required;
- support path.

Do not expose confidential staffing strategy or employee records in list previews.

## 8. Worker-Facing Visibility

Workers may see only where governed:

- approved department name;
- assignment-specific department;
- safe arrival or reporting instructions;
- authorized contact role;
- role-specific operational instructions.

Workers must not see:

- department budget;
- internal staffing targets;
- other workers' assignments;
- private management notes;
- internal compliance findings;
- incident details;
- legal or financial records;
- performance rankings;
- internal vacancy strategy.

Required distinctions:

```text
Worker-visible
does not equal
Public

Assignment-visible
does not equal
Visible to every worker
```

## 9. Staffing Summary Boundary

Page 040 may summarize:

- shifts today;
- open shifts;
- urgent vacancies;
- filled shifts;
- workers expected;
- workers checked in;
- pending applications;
- staffing attention required.

It must not own:

- shift creation;
- shift publication;
- worker assignment;
- application approval;
- attendance;
- payroll;
- rate calculation;
- worker eligibility;
- staffing optimization.

Every summary routes to the authoritative staffing or shift workflow.

## 10. Page 041 - Create Shift Boundary

Page 040 may provide a governed "Create Shift" entry point only where the user is authorized.

Page 040 must not define:

- shift dates or times;
- pay rates;
- break rules;
- role requirements;
- worker quantity;
- urgency pricing;
- cancellation rules;
- assignment logic;
- notification delivery;
- shift publication states.

Those belong to Page 041 and later governed workflows.

Required distinctions:

```text
Department selected
does not equal
Shift created

Create Shift action available
does not equal
User authorized to publish
```

## 11. Role and Service Coverage

Page 040 may show configurable role or service coverage, such as:

- nursing;
- beneficiary support;
- kitchen;
- cleaning;
- maintenance;
- administration.

Required distinctions:

```text
Role supported
does not equal
Role currently needed

Role needed
does not equal
Open shift exists

Open shift
does not equal
Worker assigned

Department coverage
does not equal
Professional credential verification
```

## 12. Compliance Boundary

Page 040 may summarize:

- department-level compliance attention;
- role-specific licence requirements;
- required training;
- document status;
- temporary restrictions.

It must not own:

- credential verification;
- legal compliance decisions;
- document review;
- investigations;
- suspension adjudication;
- worker eligibility decisions.

Required distinctions:

```text
Requirement configured
does not equal
Worker compliant

Compliance attention
does not equal
Department suspended

Restriction
does not equal
Misconduct proven
```

## 13. Financial Boundary

Page 040 may route to a governed cost-centre or billing workflow where approved.

It must not display or edit:

- worker pay rates;
- payroll details;
- bank information;
- tax information;
- employer payment methods;
- platform margin;
- invoices;
- accounting configuration;
- department budgets unless a future approved page owns them.

Required distinctions:

```text
Department
does not equal
Cost centre

Cost centre linked
does not equal
Budget approved
```

## 14. Contact Governance

Department contacts:

- department manager;
- scheduler;
- operational contact;
- compliance contact;
- support contact.

For each contact, define:

- role;
- department scope;
- residence scope;
- visibility;
- action authority;
- effective period;
- replacement state.

Required distinctions:

```text
Contact listed
does not equal
Authorized for every action

Scheduler
does not equal
Compliance authority

Department manager
does not equal
Payroll authority
```

## 15. Department Status Changes

High-impact changes include:

- activation;
- temporary restriction;
- suspension;
- reactivation;
- deactivation;
- closure;
- residence reassignment;
- department-type change;
- worker-visibility change;
- manager replacement.

Each change conceptually requires:

- authorized role;
- reason;
- evidence where required;
- requested state;
- review;
- effective state;
- effective date;
- prior-state preservation;
- audit event;
- support or appeal path where governed.

Required distinctions:

```text
Requested
does not equal
Approved

Approved
does not equal
Effective

Suspended
does not equal
Closed

Closed
does not equal
Historical shifts or records deleted
```

## 16. Versioning and Multi-Department Isolation

Conceptually preserve:

- department name history;
- type history;
- residence relationship history;
- contact history;
- operational-state history;
- visibility history;
- pending changes;
- superseded values;
- effective dates;
- actor;
- reason.

Multi-department isolation must ensure:

- department managers see only authorized departments;
- residence-wide roles remain governed;
- department switching does not leak data;
- search and filters remain inside authorization scope;
- staffing and compliance summaries are isolated by department.

Required distinctions:

```text
Same residence
does not equal
Same permission for every department

Organization administrator
does not equal
Department operational authority unless explicitly granted
```

## 17. Resident and Patient Information Boundary

Page 040 must never store, display, search, preview, or export:

- resident names;
- patient names;
- room assignments;
- care plans;
- diagnoses;
- medications;
- health-card information;
- clinical notes;
- personal support needs;
- protected health information.

Required distinction:

```text
Department operations
does not equal
Clinical documentation
```

Do not create a patient, resident, ward, or clinical-record system.

## 18. Auditability

Audit history is conceptually required for:

- department creation;
- department edits;
- residence reassignment;
- type changes;
- contact changes;
- operational-state changes;
- worker-visibility changes;
- staffing-workflow entry;
- compliance acknowledgements;
- department-access changes;
- staff-assisted corrections.

Audit records should include:

- actor;
- role;
- action;
- department reference;
- residence reference;
- prior state;
- requested state;
- resulting state;
- reason or case reference;
- timestamp;
- result.

Do not log resident, patient, or protected health information.

## 19. AI Boundary

AI may:

- summarize visible department status;
- explain lifecycle terminology;
- identify visible action-required items;
- suggest navigation;
- help draft safe department descriptions;
- help draft support or correction requests.

AI must never:

- create departments;
- activate, suspend, reactivate, deactivate, or close departments;
- create or publish shifts;
- assign workers;
- alter staffing;
- approve compliance;
- set pay rates;
- infer resident needs;
- expose restricted information;
- fabricate staffing or compliance metrics;
- determine fraud or misconduct;
- publish changes without explicit authorized action.

## 20. Approval Criteria Resolution

| Approval criterion | Resolution |
| --- | --- |
| Organization, residence, department, unit, service, and shift concepts remain separate | Satisfied. |
| Department lifecycle states remain independent | Satisfied. |
| Multi-department permissions are governed | Satisfied. |
| Worker-facing visibility is minimum necessary | Satisfied. |
| Staffing summaries remain non-authoritative | Satisfied. |
| Page 041 owns shift creation | Satisfied. |
| Compliance and financial boundaries remain separate | Satisfied. |
| Resident and patient information is excluded | Satisfied. |
| High-impact status changes are governed | Satisfied. |
| Version history is preserved | Satisfied. |
| Auditability is complete | Satisfied at wireframe level. |
| AI cannot create shifts or make operational decisions | Satisfied. |
| No governance, privacy, safety, financial, or operational risk remains | Satisfied at wireframe level. |

## 21. Validation

| Requirement | Result |
| --- | --- |
| Frozen title remains Departments | Pass |
| Architecture Freeze unchanged | Pass |
| Employer Portal scope unchanged | Pass |
| Pages 001-039 unchanged | Pass |
| No Page 041 files created | Pass |
| No implementation started | Pass |
| No React/frontend/backend/API/database work | Pass |
| No department implementation created | Pass |
| No shift-creation implementation created | Pass |
| No staffing or scheduling implementation created | Pass |
| No payroll implementation created | Pass |
| No compliance implementation created | Pass |
| No clinical or resident-record implementation created | Pass |
| No analytics implementation created | Pass |
| No AI department implementation created | Pass |
| Unrelated app changes untouched | Pass |

## 22. Final Revision Status

```text
Page 040 - Departments
Revision 1: COMPLETE
Approval conditions: SATISFIED

Page 041 - Create Shift
UNBLOCKED
NOT CREATED
```
