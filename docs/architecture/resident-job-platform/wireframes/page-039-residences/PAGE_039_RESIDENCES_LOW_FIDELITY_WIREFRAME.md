# Page 039 - Residences Low-Fidelity Wireframe

Status: Initial wireframe complete
Epic: Epic 4 - Employer Portal
Primary users: Employer, Residence Manager, Scheduler
Secondary users: Support, Finance, Compliance, Administrator, Super Administrator where role-permitted
Architecture baseline: Resident Job Architecture Phase 1 v1.0
Frozen architecture source: pages/PAGE_039_RESIDENCES.md
Preceding baseline: Page 038 - Company Profile Approved Wireframe v1.0
Implementation: Not authorized

## 1. Frozen Page Confirmation

The frozen architecture page map defines:

| Page | Frozen title | Source |
| --- | --- | --- |
| 038 | Company Profile | pages/PAGE_038_COMPANY_PROFILE.md |
| 039 | Residences | pages/PAGE_039_RESIDENCES.md |
| 040 | Departments | pages/PAGE_040_DEPARTMENTS.md |

Page 039 remains an Employer Portal page. It must not become a clinical record, resident registry,
or unrestricted location-management system.

## 2. Page Purpose

Residences lets authorized employer users view and manage permitted residence or operating-facility
information while preserving strict boundaries around residents, patients, worker visibility,
staffing, compliance, documents, billing, safety, and auditability.

The page allows authorized users to:

- view the employer's residences or operating facilities;
- distinguish headquarters, residences, facilities, sites, and inactive locations;
- understand each residence's operational status;
- view staffing and compliance summaries;
- manage permitted residence information;
- understand which residence information is visible to workers;
- access governed shift, staffing, document, compliance, contact, and support workflows;
- distinguish organization-level settings from residence-level settings;
- understand pending changes, restrictions, verification, and action-required states.

The page must not:

- expose resident or patient information;
- become a clinical record;
- become the source of truth for shifts, staffing, payroll, billing, compliance, documents, or users;
- permit every employer user to edit every residence;
- treat a listed residence as verified or operationally approved;
- silently overwrite historical location information;
- expose restricted operational, safety, legal, or financial information;
- allow AI to approve, suspend, activate, or alter residence status.

## 3. Residence Domains

The page separates residence information into governed domains.

| Domain | Examples | Boundary |
| --- | --- | --- |
| Residence identity | Display name, legal/registered site name where applicable, residence type, organization relationship, governed site identifier | Type does not equal licence or service permission |
| Location and contact | Address, timezone, main contact role, scheduling contact, compliance contact, emergency operational contact where governed | Does not expose sensitive access details broadly |
| Worker-facing information | Residence name, assignment location, arrival instructions, parking/entrance guidance, accessibility information, approved workplace description | Minimum necessary for assignment readiness |
| Operational information | Active/inactive status, staffing status, operating hours, service categories, shift readiness, temporary restrictions | Does not own scheduling or staffing engine |
| Compliance | Site verification, required documents, licence/permit summaries, expiry/renewal, restrictions | Does not adjudicate compliance |
| Restricted administration | Billing relationship, internal operational notes, legal status, safety incidents, staff roles, closure/deactivation workflow | Permission-gated and not worker-visible |

## 4. Source-of-Truth Boundary

Page 039 is a governed control surface. It may route to authoritative workflows including:

- residence verification;
- staffing and shifts;
- compliance;
- document management;
- location management;
- contacts;
- billing;
- support;
- closure or deactivation.

Required distinctions:

```text
Displayed on Page 039
does not equal
Owned by Page 039

Residence created
does not equal
Residence verified

Residence verified
does not equal
Operationally active

Operationally active
does not equal
Ready for every staffing category
```

## 5. Independent Residence States

Page 039 must not collapse residence status into one generic "Active" badge.

| State dimension | States |
| --- | --- |
| Record state | Draft, submitted, active record, archived, superseded, unavailable |
| Verification state | Not started, required, submitted, under review, more information required, verified, failed, expired, unavailable |
| Operational state | Planning, pending activation, active, temporarily restricted, suspended, inactive, deactivation requested, closed, status unavailable |
| Publication state | Private, worker-visible, assignment-visible only, restricted, publication pending, removed from worker view |
| Compliance state | Compliant, attention required, action required, restricted, suspended, unknown |

## 6. Desktop Wireframe

```text
HEADER
Resident Job | Residences | Organization: [Selected organization]
Role: [Employer / Residence Manager / Scheduler] | Support

GOVERNANCE NOTICE
Residences manages operating sites, not resident or patient records.
Residence listed does not mean verified, active, worker-visible, or shift-ready.
AI cannot activate, suspend, verify, publish, assign staffing, or infer resident needs.

FILTER AND SEARCH BAR
Search residences
Filters: Active / Inactive | Verification | Compliance | Location | Type | Staffing attention | Worker-visible

LEFT PANEL - RESIDENCE LIST
[Residence card]
- Residence display name
- Residence type
- Municipality / region
- Record state
- Verification state
- Operational state
- Compliance state
- Staffing attention summary
- Worker-facing visibility
- Action required indicator

MAIN PANEL - SELECTED RESIDENCE DETAIL
Residence summary
- Residence name
- Organization relationship
- Address and timezone
- Primary operational contact
- Scheduling contact
- Compliance contact
- Created / effective / last updated
- Pending change
- Support path

Operational summary
- Active/inactive/restricted state
- Today's scheduled shifts summary
- Open shifts summary
- Filled shifts summary
- Urgent vacancies summary
- Workers expected / checked in summary
- Staffing attention required

Compliance and documents
- Verification state
- Permit/licence summary where governed
- Required documents status
- Expiry / renewal attention
- Temporary restrictions

Worker-facing preview
- Approved residence name
- Assignment location visibility
- Arrival instructions
- Parking or entrance guidance where safe
- Approved contact role
- Accessibility information

Restricted administration links
- Billing relationship
- Legal status
- Safety or incident workflow link
- Closure/deactivation request
- History/audit summary
```

## 7. Mobile Wireframe

```text
TOP BAR
Residences | Organization selector | Support

FILTERS
Search | Status | Compliance | Action required

RESIDENCE CARDS
Residence name
Operational state
Verification state
Compliance state
Staffing attention
Worker-visible status
Action required

DETAIL VIEW
Summary
Staffing summary
Contacts
Compliance
Worker-facing preview
Restricted links
History/support
```

Mobile priorities:

- residence list;
- operational status;
- verification and compliance;
- staffing attention;
- action-required items;
- worker-facing visibility;
- key contacts;
- large touch targets;
- safe previews;
- clear restricted states.

Avoid dense tables.

## 8. Residence Record

Each residence record should support safe placeholders:

- residence name;
- residence type;
- organization;
- address;
- timezone;
- status;
- verification state;
- compliance state;
- worker-facing visibility;
- primary operational contact;
- scheduling contact;
- compliance contact;
- created date;
- effective date;
- last updated;
- pending change;
- action required;
- support path.

Do not expose confidential resident-level information.

## 9. Residence Types

Residence or facility type remains configurable.

Conceptual types may include:

- seniors' residence;
- assisted-living residence;
- long-term-care facility;
- private care residence;
- rehabilitation facility;
- community residence;
- temporary care facility;
- other approved workplace type.

Required distinctions:

```text
Residence type
does not equal
Licence status

Residence type
does not equal
Permission to offer every service
```

Do not hardcode one legal or regulatory classification.

## 10. Role-Based Access

Conceptual employer roles:

- organization owner;
- administrator;
- operations manager;
- residence manager;
- scheduler;
- HR;
- compliance;
- finance;
- read-only observer.

Required distinctions:

```text
Organization membership
does not equal
Access to every residence

Residence visibility
does not equal
Edit authority

Dashboard access
does not equal
Authority to activate, suspend, or close a residence
```

## 11. Residence Creation Lifecycle

Residence creation is a future governed workflow. Page 039 may represent the lifecycle:

```text
Draft started
↓
Basic information entered
↓
Location entered
↓
Contacts assigned
↓
Documents requested
↓
Verification submitted
↓
Review pending
↓
Additional information required
↓
Approved for activation
↓
Active
```

Required distinctions:

```text
Draft saved
does not equal
Residence created

Residence created
does not equal
Worker-visible

Worker-visible
does not equal
Shift-ready
```

No residence creation implementation is designed.

## 12. Address and Location Governance

Represent:

- street address;
- municipality;
- province, state, or region;
- postal code;
- country;
- timezone;
- latitude/longitude only where governed;
- entrance guidance;
- parking guidance;
- worker arrival instructions.

Do not expose:

- resident room numbers;
- private resident entrances;
- medical unit details;
- security codes;
- sensitive access instructions in broad previews.

High-impact address changes require conceptual review and historical preservation.

## 13. Worker-Facing Visibility

Workers may see only approved, minimum-necessary operational information:

- approved residence name;
- assignment location;
- shift-specific arrival guidance;
- approved contact role;
- workplace type;
- accessibility information;
- parking or entrance information where safe;
- applicable operational instructions.

Workers must not see:

- resident names;
- patient information;
- diagnoses;
- medication information;
- internal safety incidents;
- legal disputes;
- billing information;
- internal staffing strategy;
- fraud or risk signals;
- private staff contact details.

## 14. Staffing Summary Boundary

Page 039 may summarize:

- today's scheduled shifts;
- open shifts;
- filled shifts;
- urgent vacancies;
- workers expected;
- workers checked in;
- pending applications;
- staffing attention required.

Required distinctions:

```text
Open shift
does not equal
Staffing failure

Worker assigned
does not equal
Worker checked in

Worker checked in
does not equal
Shift completed
```

Page 039 must not own the staffing or scheduling engine.

## 15. Service and Role Coverage

Represent conceptual role/service coverage:

- nursing;
- beneficiary support;
- kitchen;
- cleaning;
- maintenance;
- administration;
- other approved roles.

Required distinctions:

```text
Role listed
does not equal
Role currently required

Role required
does not equal
Worker assigned

Residence service category
does not equal
Professional authorization
```

Do not infer staffing demand.

## 16. Compliance and Documents Boundary

Page 039 may show:

- residence verification;
- permit or licence summary;
- required documents;
- expiry dates;
- action required;
- temporary restriction;
- support path;
- requested/uploaded/under review/accepted/rejected/expired/action-required document status.

It must not own:

- regulatory verification;
- licence adjudication;
- document review engine;
- legal compliance decision;
- suspension decision;
- regulator integration;
- document storage;
- document retention;
- legal holds.

Do not expose restricted evidence, legal notes, or full sensitive documents.

## 17. Contacts

Residence contacts remain role-specific:

- residence manager;
- scheduling contact;
- compliance contact;
- operational contact;
- finance contact;
- emergency operational contact where governed.

Required distinctions:

```text
Contact listed
does not equal
Authorized to perform every action

Scheduling contact
does not equal
Compliance authority

Finance contact
does not equal
Worker-management authority
```

Do not expose personal contact details beyond minimum necessary visibility.

## 18. Residence Status Changes

High-impact status changes include:

- activation;
- temporary restriction;
- suspension;
- deactivation;
- closure;
- address change;
- ownership or organization reassignment;
- worker-facing publication;
- service-category change.

These changes conceptually require:

- authorized role;
- reason;
- supporting evidence where required;
- effective date;
- prior-state preservation;
- audit event;
- support or review path.

Required distinctions:

```text
Status change requested
does not equal
Status effective

Suspended
does not equal
Fraud proven

Closed
does not equal
Historical shifts, invoices, or compliance records deleted
```

## 19. Versioning and Multi-Residence Isolation

Preserve conceptually:

- current residence record;
- prior address;
- prior name;
- prior organization relationship;
- pending change;
- effective date;
- actor;
- reason;
- superseded state;
- audit history.

Multi-residence isolation must ensure:

- one residence cannot access another residence's private operational data without authorization;
- residence managers see only permitted sites;
- organization-wide roles remain governed;
- switching residences does not leak data;
- filters and search stay within authorization scope.

Required distinction:

```text
Same organization
does not equal
Same permission for every residence
```

## 20. Resident and Patient Information Boundary

Page 039 must not store or display:

- resident names;
- health-card information;
- diagnoses;
- medication lists;
- care plans;
- room assignments;
- clinical notes;
- family contacts;
- personal support needs;
- protected health information.

Required distinction:

```text
Residence management
does not equal
Clinical documentation
```

Do not create a resident registry.

## 21. Safety, Incident, and Billing Boundaries

Page 039 may show only high-level operational safety status:

- safety review active;
- temporary restriction;
- support required;
- incident workflow available.

Do not expose:

- incident details;
- victim or reporter identity;
- medical information;
- investigative notes;
- internal risk scores.

Page 039 must not own incident investigation or emergency response.

Billing may route to governed cost-center or billing workflows. Do not display or edit:

- full payment methods;
- banking details;
- tax credentials;
- worker payroll details;
- platform margin;
- internal accounting configuration.

Residence staffing costs and employer billing remain governed elsewhere.

## 22. Search and Filters

Conceptual filters:

- active or inactive;
- verification state;
- compliance state;
- location;
- residence type;
- staffing attention;
- action required;
- worker-visible or private.

Search must stay inside the user's authorized organization and residences. Restricted information
must not appear in previews.

## 23. Auditability

Audit history is conceptually required for:

- residence creation;
- address changes;
- contact changes;
- verification actions;
- status changes;
- publication changes;
- compliance acknowledgements;
- organization reassignment;
- staff-assisted corrections.

Audit records should include:

- actor;
- role;
- action;
- residence reference;
- prior state;
- resulting state;
- reason or case reference;
- timestamp;
- result.

Do not log resident or patient information.

## 24. AI Boundary

AI may:

- summarize visible residence status;
- explain residence states;
- help draft approved worker-facing descriptions;
- identify visible action-required items;
- suggest navigation;
- help draft support or correction requests.

AI must never:

- activate or suspend residences;
- verify residences;
- approve compliance;
- assign workers;
- create shifts;
- alter location or legal identity;
- infer resident needs;
- expose protected information;
- fabricate staffing metrics;
- determine fraud;
- publish changes without explicit authorized action.

The authoritative residence and workflow records remain controlling.

## 25. Empty and Error States

Required states:

- no residences;
- no active residences;
- residence unavailable;
- access denied;
- edit unavailable;
- save failed;
- verification pending;
- compliance status unavailable;
- staffing summary unavailable;
- pending change;
- residence restricted;
- support unavailable;
- service unavailable.

Do not fabricate residence or staffing data.

## 26. Accessibility

The page must support:

- semantic residence headings;
- keyboard navigation;
- screen-reader-friendly status labels;
- accessible filters;
- no color-only verification or compliance states;
- clear worker-facing visibility labels;
- accessible contact controls;
- readable addresses and timezones;
- focus management;
- sufficient contrast;
- plain-language errors;
- accessible status-change confirmation.

## 27. International Readiness

The page must not hardcode:

- residence type;
- legal classification;
- address model;
- municipality structure;
- licence or permit model;
- compliance terminology;
- staffing roles;
- operating hours;
- timezone;
- language;
- date format;
- worker-facing visibility rules;
- closure rules;
- emergency contact model;
- retention obligations.

Jurisdiction, organization, residence type, locale, access policy, compliance policy, and staffing
model remain configurable.

## 28. Future Boundary

Page 039 does not own:

- clinical records;
- resident registry;
- scheduling engine;
- staffing engine;
- shift creation;
- compliance adjudication;
- document storage;
- billing;
- payroll;
- notifications;
- incident investigation;
- emergency dispatch;
- location-management engine;
- organization verification;
- fraud engine;
- legal-hold engine.

It provides governed visibility, controls, and routing only.

## 29. Self Validation

| Requirement | Result |
| --- | --- |
| Frozen title remains Residences | Pass |
| Architecture Freeze unchanged | Pass |
| Employer Portal scope unchanged | Pass |
| Pages 001-038 unchanged | Pass |
| No Page 040 files created | Pass |
| No approval record created | Pass |
| No implementation started | Pass |
| No React/frontend/backend/API/database work | Pass |
| No residence-management implementation created | Pass |
| No location-management implementation created | Pass |
| No staffing or scheduling implementation created | Pass |
| No compliance implementation created | Pass |
| No clinical or resident-record implementation created | Pass |
| No billing implementation created | Pass |
| No AI residence implementation created | Pass |
| Unrelated app changes untouched | Pass |

## 30. Final Wireframe Status

```text
Page 039 - Residences
Wireframe: COMPLETE
Product Review: REQUIRED
Approval Record: NOT CREATED

Page 040 - Departments
BLOCKED
```
