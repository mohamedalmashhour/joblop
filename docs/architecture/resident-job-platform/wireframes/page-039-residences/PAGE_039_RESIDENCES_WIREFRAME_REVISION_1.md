# Page 039 - Residences Wireframe Revision 1

Status: Revision 1 complete
Epic: Epic 4 - Employer Portal
Primary users: Employer, Residence Manager, Scheduler
Baseline wireframe: PAGE_039_RESIDENCES_LOW_FIDELITY_WIREFRAME.md
Owner decision: Approved with documented conditions
Implementation: Not authorized

## 1. Revision Summary

Revision 1 strengthens residence governance without redesigning Page 039 or modifying approved
Pages 001-038.

The revision focuses on:

- residence identity governance;
- organization-versus-residence boundaries;
- multi-residence authorization;
- operational-state truthfulness;
- worker-facing visibility;
- location and contact governance;
- compliance boundaries;
- safety and privacy;
- auditability;
- AI boundaries;
- readiness for Page 040 - Departments.

## 2. Organization vs Residence Boundary

Page 039 must distinguish the operating structures used by employers.

| Concept | Meaning | Boundary |
| --- | --- | --- |
| Organization | Employer legal/business entity or account context | Not automatically every residence |
| Residence | Managed operating facility or care/workplace site | Not a department and not a clinical record |
| Facility | Physical operating site category | Not necessarily legal entity |
| Site | Location record or workplace address | Not necessarily shift-ready |
| Department | Internal operating unit inside a residence | Owned by Page 040 |
| Operating location | Place where work may occur | Not full residence record |
| Cost center | Financial/billing grouping where governed | Not legal billing entity |
| Assignment location | Minimum location needed for a confirmed shift | Not full residence record |

Required distinctions:

```text
Organization
does not equal
Residence

Residence
does not equal
Department

Operating site
does not equal
Legal entity

Assignment location
does not equal
Full residence record
```

Page 039 must not absorb Page 040 - Departments.

## 3. Residence Ownership

Residence ownership and access remain role-specific.

| Role concept | Meaning |
| --- | --- |
| Residence record owner | Accountable owner of the residence record where governed |
| Organization owner | Organization-level authority, not automatic field-level authority |
| Residence manager | Residence-specific operational authority where granted |
| Operational contact | Day-to-day contact for operational coordination |
| Compliance authority | Compliance-focused authority where granted |
| Scheduler | Staffing and scheduling authority where granted |
| Viewing user | User with read-only or limited visibility |

Required distinctions:

```text
Organization membership
does not equal
Residence ownership

Residence ownership
does not equal
Permission to edit every field

Residence visibility
does not equal
Operational authority
```

## 4. Independent Operational Lifecycles

No lifecycle state may imply another.

| Lifecycle | States |
| --- | --- |
| Record lifecycle | Draft, submitted, current, superseded, archived, unavailable |
| Verification lifecycle | Not started, required, submitted, under review, additional information required, verified, failed, expired, unavailable |
| Operational lifecycle | Planning, pending activation, active, temporarily restricted, suspended, inactive, deactivation requested, deactivated, closure requested, closed, status unavailable |
| Worker-publication lifecycle | Private, assignment-visible, worker-visible, publication pending, restricted, removed from view, unavailable |
| Compliance lifecycle | Compliant, attention required, action required, restricted, suspended, unknown |

Do not use one "Active" label for all meanings.

## 5. Operational Truthfulness

Required distinctions:

```text
Residence record created
does not equal
Residence verified

Residence verified
does not equal
Residence activated

Residence active
does not equal
Every department active

Residence active
does not equal
Every role permitted

Shift posted
does not equal
Residence fully staffed

Worker assigned
does not equal
Worker checked in

Worker checked in
does not equal
Shift completed
```

Each status label must show which lifecycle it belongs to.

## 6. Multi-Residence Authorization

Multi-residence authorization must represent:

- organization-wide role;
- residence-specific role;
- assigned residences;
- pending access;
- revoked access;
- temporary access;
- read-only access;
- access unavailable.

Required distinctions:

```text
Same organization
does not equal
Same access to every residence

Organization administrator
does not equal
Residence compliance authority unless explicitly granted

Scheduler
does not equal
Legal or billing authority
```

Residence switching must not leak staffing information, contacts, compliance status, incidents,
documents, billing summaries, or worker details across unauthorized residences.

## 7. Worker-Facing Visibility

Worker-facing information must be minimum necessary.

Workers may see only where governed:

- approved residence display name;
- assignment-specific address;
- safe arrival guidance;
- permitted parking information;
- authorized contact role;
- workplace type;
- shift-specific accessibility information;
- operational instructions necessary for the assignment.

Workers must not see:

- resident or patient data;
- private staff contact details;
- internal staffing shortages;
- internal compliance notes;
- legal disputes;
- incident details;
- billing or finance data;
- internal risk signals;
- security codes in broad previews.

Required distinctions:

```text
Worker-visible
does not equal
Public

Assignment-visible
does not equal
Visible to every worker
```

## 8. Address and Location Changes

High-impact location changes must conceptually preserve:

- prior address;
- new address;
- requested by;
- authorized role;
- reason;
- supporting evidence where required;
- effective date;
- verification impact;
- worker-notification requirement;
- audit history.

Required distinctions:

```text
Address entered
does not equal
Address verified

Address verified
does not equal
Residence operationally approved

Pending address
does not equal
Current assignment location
```

Do not silently overwrite historical location data.

## 9. Contact Governance

Residence contacts must remain role-bound:

- residence manager;
- scheduling contact;
- operational contact;
- compliance contact;
- finance contact;
- support contact;
- emergency operational contact.

For each contact, define:

- role;
- visibility;
- action authority;
- residence scope;
- effective period;
- replacement state.

Required distinctions:

```text
Contact listed
does not equal
Authorized for every residence function

Emergency operational contact
does not equal
Emergency dispatch service
```

Do not expose private personal details unnecessarily.

## 10. Staffing Summary Boundary

Residence staffing widgets are high-level and non-authoritative.

They may summarize:

- shifts today;
- open shifts;
- urgent vacancies;
- filled shifts;
- workers expected;
- workers checked in;
- pending applications;
- staffing attention required.

They must not own:

- shift creation;
- assignment;
- attendance;
- approval;
- payroll;
- worker eligibility;
- department staffing rules.

Every summary routes to the authoritative staffing workflow.

## 11. Department Boundary for Page 040

Page 039 may show only high-level department presence:

- departments configured;
- departments active;
- department attention required;
- department unavailable.

Page 039 must not define:

- department structure;
- department managers;
- department roles;
- department staffing templates;
- department budgets;
- department-specific compliance;
- department-level shift rules.

Those belong to Page 040 or later governed workflows.

## 12. Compliance Boundary

Compliance concepts remain separate:

- residence verification;
- site compliance;
- licence or permit summary;
- document status;
- restriction;
- suspension;
- operational eligibility.

Required distinctions:

```text
Document accepted
does not equal
Residence compliant

Compliance attention
does not equal
Residence suspended

Restriction
does not equal
Fraud proven
```

Page 039 must not own compliance adjudication.

## 13. Resident and Patient Privacy

Page 039 must never store, display, search, preview, or export:

- resident names;
- patient names;
- room assignments;
- care plans;
- diagnoses;
- medication information;
- family contacts;
- health-card information;
- clinical notes;
- personal support needs;
- protected health information.

Required distinction:

```text
Residence operations
does not equal
Resident records
```

Do not introduce a resident registry or clinical-document concept.

## 14. Safety and Incident Boundary

Page 039 may show only governed high-level indicators:

- operational review active;
- temporary restriction;
- support required;
- incident workflow available.

It must not show:

- detailed allegation;
- reporter identity;
- victim identity;
- medical information;
- investigative notes;
- evidence;
- internal risk score.

Required distinctions:

```text
Incident reported
does not equal
Misconduct proven

Temporary restriction
does not equal
Permanent closure
```

Page 039 must not own incident adjudication or emergency dispatch.

## 15. Residence Status Changes

High-impact residence changes include:

- activation;
- temporary restriction;
- suspension;
- reactivation;
- deactivation;
- closure;
- publication change;
- organization reassignment;
- service-category change.

Each high-impact change conceptually requires:

- authorized role;
- reason;
- evidence where required;
- requested state;
- effective state;
- review;
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
Historical records deleted
```

## 16. Versioning and Billing Boundary

Conceptually preserve:

- residence name history;
- address history;
- organization relationship history;
- contact history;
- operational-state history;
- publication-state history;
- pending changes;
- superseded values;
- effective dates;
- actor;
- reason.

Do not silently overwrite historically relevant residence information.

Page 039 may show only high-level billing or cost-center links where governed.

Required distinctions:

```text
Residence cost center
does not equal
Legal billing entity

Billing relationship
does not equal
Payment completed
```

Do not expose full payment method, bank information, tax credentials, worker payroll details,
invoices from unrelated residences, platform margin, or accounting configuration.

## 17. Auditability

Audit history is conceptually required for:

- residence creation;
- address changes;
- contact changes;
- verification actions;
- publication changes;
- status changes;
- organization reassignment;
- compliance acknowledgements;
- staff-assisted corrections;
- residence-access changes.

Audit records should include:

- actor;
- role;
- action;
- residence reference;
- prior state;
- requested state;
- resulting state;
- reason or case reference;
- timestamp;
- result.

Do not log resident, patient, or protected health information.

## 18. AI Boundary

AI may:

- summarize visible residence status;
- explain state terminology;
- identify visible action-required items;
- help draft safe worker-facing descriptions;
- suggest navigation;
- help draft support or correction requests.

AI must never:

- activate, suspend, reactivate, deactivate, or close a residence;
- verify a residence;
- approve compliance;
- assign workers;
- create shifts;
- define departments;
- alter addresses or organization relationships;
- expose protected information;
- infer resident needs;
- fabricate staffing or compliance metrics;
- determine fraud;
- publish changes without explicit authorized action.

## 19. Approval Criteria Resolution

| Approval criterion | Resolution |
| --- | --- |
| Organization, residence, facility, and department concepts remain separate | Satisfied. |
| Lifecycle states remain independent | Satisfied. |
| Multi-residence permissions are governed | Satisfied. |
| Worker-facing visibility is minimum necessary | Satisfied. |
| Resident and patient information is excluded | Satisfied. |
| Address and contact changes preserve history | Satisfied. |
| Staffing summaries remain non-authoritative | Satisfied. |
| Page 040 department ownership is preserved | Satisfied. |
| Compliance and incident boundaries remain separate | Satisfied. |
| High-impact status changes are governed | Satisfied. |
| Auditability is complete | Satisfied at wireframe level. |
| AI cannot make operational or compliance decisions | Satisfied. |
| No governance, privacy, safety, or operational risk remains | Satisfied at wireframe level. |

## 20. Validation

| Requirement | Result |
| --- | --- |
| Frozen title remains Residences | Pass |
| Architecture Freeze unchanged | Pass |
| Employer Portal scope unchanged | Pass |
| Pages 001-038 unchanged | Pass |
| No Page 040 files created | Pass |
| No implementation started | Pass |
| No React/frontend/backend/API/database work | Pass |
| No residence-management implementation created | Pass |
| No department implementation created | Pass |
| No location-management implementation created | Pass |
| No staffing or scheduling implementation created | Pass |
| No compliance implementation created | Pass |
| No clinical or resident-record implementation created | Pass |
| No billing implementation created | Pass |
| No AI residence implementation created | Pass |
| Unrelated app changes untouched | Pass |

## 21. Final Revision Status

```text
Page 039 - Residences
Revision 1: COMPLETE
Approval conditions: SATISFIED

Page 040 - Departments
UNBLOCKED
NOT CREATED
```
