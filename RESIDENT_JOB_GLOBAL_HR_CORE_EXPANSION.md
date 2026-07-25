# Resident Job Global HR Core Expansion

Status: Owner approval draft

Verdict: GLOBAL HR CORE EXPANSION READY FOR OWNER APPROVAL

## 1. Global Platform Vision

Resident Workforce OS should become a global, multi-industry workforce and HR operating system.

Resident Job remains the first operational vertical, but the shared foundation must support additional industries, countries, worker types, company structures, labour models, compliance rules, and employment relationships without forcing every future workflow into the senior-residence staffing model.

The global platform should support:

- temporary staffing
- permanent recruitment
- internal HR operations
- contractor engagement
- workforce dispatch
- compliance tracking
- candidate management
- employee lifecycle management
- country-specific labour and qualification rules

The governing principle is:

Global workforce core

then

industry verticals

then

country packs

then

organization-specific operating models.

## 2. Resident Job as the First Industry Vertical

Resident Job is the first vertical implementation of the platform. It focuses on senior living and care-community operations, including employers, residences, departments, work groups, role definitions, job requests, dispatch, worker offers, attendance, timesheets, invoices, and payments.

Resident Job should remain valid as a vertical. It should not be erased or silently renamed. The completed foundations remain preserved:

- Database Foundation
- Authentication Foundation
- Authorization Foundation
- Organization Membership Foundation
- Employer Organization Foundation
- Residence Foundation
- Department Foundation
- Work Groups Foundation

Future global HR expansion should add shared abstractions above or beside the vertical, not replace approved foundations without a governed Architecture Change Request.

## 3. Recruitment Workflow Versus Temporary Staffing Workflow

The global HR core must distinguish recruitment from temporary staffing.

Recruitment workflow:

Candidate applies or is sourced

then

screening

then

interview

then

offer

then

hire

then

employee or contractor onboarding.

Temporary staffing workflow:

Employer creates a job request

then

admin dispatch

then

worker offer

then

worker acceptance

then

assignment

then

attendance

then

timesheet

then

invoice and payable.

Recruitment produces a longer-term employment or contractor relationship. Temporary staffing produces a time-bound assignment. These workflows may share people, occupations, skills, qualifications, employers, and compliance records, but they must not share state machines without explicit governance.

## 4. Global Occupation Model

Global Occupation should represent a normalized cross-country occupation concept.

Examples:

- Nurse
- Cook
- Electrician
- Plumber
- Housekeeper
- Waiter
- Painter
- Care Aide
- Maintenance Technician

Global Occupation is not a job posting, access role, worker skill, local licence, pay rate, assignment, or department.

Global Occupation should own:

- stable global occupation code
- global display label
- global description
- broad occupation family
- skill taxonomy links
- common aliases
- international classification references where approved
- active/inactive lifecycle

It should not own:

- country licence rules
- local wage rules
- organization-specific job title
- worker eligibility
- staffing request state
- permanent vacancy state

## 5. Country Occupation Profile Model

Country Occupation Profile should localize a Global Occupation for a specific country or jurisdiction.

Examples:

- Nurse in Canada
- Licensed Practical Nurse in Quebec
- Cook in France
- Electrician in Ontario

Country Occupation Profile should own:

- country or jurisdiction
- localized occupation label
- common local aliases
- regulatory classification
- licence or certification expectation summary
- labour classification boundary
- country-specific compliance notes
- country-specific wage intelligence references where approved

It should not own a worker's personal credential approval or an organization's custom job title.

## 6. Organization Job Position Model

Organization Job Position should represent how a specific employer names and uses a role internally.

Examples:

- Sunrise Montreal: Evening Cook
- Belmont Village: Dining Room Aide
- Hospital Network: Weekend LPN
- Property Group: Emergency Plumber

Organization Job Position should reference:

- EmployerOrganization
- optional Residence or future Worksite/Location
- optional Department
- Global Occupation
- Country Occupation Profile where applicable
- organization-specific title
- organization-specific description
- required skills and qualifications
- internal reporting structure where approved

It should not replace Global Occupation. It is tenant-owned configuration, while Global Occupation is platform-managed catalogue data.

## 7. Skills and Competency Model

Skills and competencies should become reusable global or regional capability records.

Examples:

- food preparation
- dementia care
- medication assistance
- electrical troubleshooting
- plumbing repair
- painting
- customer service
- cleaning and sanitation
- bilingual communication

Worker Skill is not the same as Global Occupation. A worker may have many skills, and one occupation may require many skills.

The future skill model should support:

- global skill catalogue
- country or industry-specific competency mapping
- worker self-reported skills
- verified skills where applicable
- organization-required skills
- AI-assisted skill normalization

AI may suggest skill normalization. AI must not invent worker skills or verify competencies.

## 8. Qualifications, Licences, and Certifications

Qualifications, licences, and certifications should remain independent concepts.

Qualification:

General evidence of education, training, or capability.

Licence:

Government, regulator, or authorized body permission to perform regulated work.

Certification:

Training or assessment credential from a recognized issuer.

These records may relate to Global Occupation or Country Occupation Profile, but they are not the occupation itself. They also must not automatically prove eligibility without the appropriate review workflow.

## 9. Country Pack Architecture

Country Packs should provide jurisdiction-specific configuration without hardcoding one country's labour model into the global core.

A Country Pack may define:

- languages
- currency defaults
- wage guidance sources
- labour law summaries
- overtime policy references
- tax and invoicing boundaries
- licence and certification registries
- identity verification rules
- privacy and retention rules
- regional occupation aliases
- date, time, address, and phone formats

Country Packs should be configuration and policy references, not hidden workflow engines. Any rule that changes workflow authority requires governance.

## 10. Multi-Country Labour and Compliance Boundary

The platform should support multiple countries without making global records responsible for local law.

Global core owns shared structure.

Country Pack owns jurisdiction-specific defaults and policy references.

Organization configuration owns employer-specific requirements.

Human review remains authoritative where compliance, eligibility, regulated work, or legal classification is involved.

AI may explain rules and highlight gaps. AI must not decide legal compliance, employment classification, worker eligibility, or disciplinary outcomes.

## 11. Candidate and Worker Identity Model

Candidate and worker identity should share the same user identity foundation while preserving lifecycle distinctions.

Candidate:

Someone applying for a permanent vacancy, contractor role, or worker pool.

Worker:

Someone eligible or potentially eligible for assignments or work offers.

Employee:

Someone employed by an organization under an employment relationship.

Contractor:

Someone engaged under a contractor relationship.

Applicant:

Someone who has applied to a specific vacancy, job request, or work opportunity.

One person may move between these states over time. The identity record should not collapse all states into one "worker" status.

## 12. Permanent Employee, Contractor, Temporary Worker, and Applicant Distinctions

Permanent Employee is not Contractor.

Contractor is not Temporary Worker.

Temporary Worker is not Applicant.

Applicant is not Assignment.

Candidate profile is not Employee record.

These distinctions matter for privacy, payroll, compliance, legal classification, reporting, and permissions.

The platform should preserve separate lifecycle states for each relationship type instead of treating every person as a temporary worker.

## 13. Company HR Operating Model

The future company HR model should support:

- organization structure
- worksites or locations
- departments
- job positions
- hiring workflows
- employee records
- contractor records
- temporary staffing requests
- compliance tracking
- time and attendance
- HR documents
- reporting
- integrations

Resident Job's EmployerOrganization, Residence, and Department can serve the first vertical, but the global HR platform should eventually introduce generic Worksite/Location concepts for non-residence industries.

## 14. AI Workforce Brain Boundaries

AI workforce intelligence may:

- normalize occupation names
- suggest skill matches
- explain job requirements
- compare candidates using approved evidence
- highlight missing qualifications
- detect schedule conflicts
- recommend workers for human review
- explain wage guidance sources
- suggest country pack policy references

AI must not:

- create authoritative occupations without approval
- verify qualifications
- approve licences
- determine legal employment classification
- assign workers automatically
- hire candidates automatically
- approve payroll
- set final wages
- make disciplinary decisions
- use protected characteristics
- infer sensitive traits

The core principle remains:

AI recommends

then

Human reviews

then

Authoritative workflow executes.

## 15. Enterprise Integrations

Future integrations may include:

- HRIS
- ATS
- payroll systems
- accounting systems
- identity providers
- background-check providers
- credential verification providers
- calendar systems
- messaging providers
- document storage
- analytics platforms

Integration records should reference authoritative platform entities. They should not become the source of truth for core workflow state unless explicitly approved.

## 16. Multi-Language and Localization Model

The global core should support localization for:

- occupation labels
- role labels
- skills
- job descriptions
- country pack policy text
- worker-facing messages
- employer-facing messages
- accessibility text

Initial language priorities remain English, French, and Arabic. Default labels remain authoritative when translations are unavailable.

Localization must not change business identity. Codes, slugs, and IDs remain stable across languages.

## 17. Multi-Currency Boundary

The global HR platform will need multi-currency support, but currency must remain separate from occupation identity.

Currency may affect:

- wage guidance
- job request estimates
- invoices
- payments
- worker payables
- reports

Currency must not be stored inside Global Occupation. Country Occupation Profile may reference wage intelligence, but final pay, billing, payroll, and payment execution remain separate governed workflows.

## 18. Global Reporting and Analytics

Global reporting should aggregate governed source records without owning or changing them.

Reporting may analyze:

- occupations
- country profiles
- job positions
- applications
- assignments
- attendance
- compliance
- invoices
- payables
- hiring funnel

Reports must remain read-only. Analytics should not rewrite classifications, change worker status, approve qualifications, or modify financial records.

## 19. Privacy and Tenant Isolation

Global catalogue data can be shared across tenants.

Tenant data must remain isolated.

Worker and candidate personal information must be exposed only through governed access paths.

Employers should see only the minimum information required for the relevant workflow.

Platform staff access must remain role-based, audited, and purpose-limited.

Sensitive records include:

- identity documents
- health-related information
- disability information
- investigation material
- background checks
- banking
- tax identifiers
- protected characteristics
- private candidate notes

Global occupation and skill catalogues should not contain personal information.

## 20. Existing Residence Vertical Mapping

The current Residence vertical maps into the global core as follows:

EmployerOrganization:

Global tenant or company account.

Residence:

Industry-specific worksite/location for senior living.

Department:

Organization or residence-specific operational unit.

WorkGroup:

Resident Job operational staffing category.

RoleDefinition:

Resident Job operational role under WorkGroup.

Future Worksite/Location:

Generic location model that can support hospitals, hotels, factories, offices, construction sites, restaurants, and other industries.

Residence and Department should not be silently replaced. A future Worksite/Location layer can coexist by allowing Residence to become a vertical subtype or mapped profile of a generic location.

## 21. Entity Impact on RoleDefinition

The current RoleDefinition entity was approved as an operational staffing role under WorkGroup for Resident Job Phase 01.

The global HR expansion introduces a broader hierarchy:

Global Occupation

not equal to

Country Occupation Profile

not equal to

Organization Job Position

not equal to

Worker Skill

not equal to

Access Role

not equal to

Job Request

not equal to

Permanent Vacancy.

RoleDefinition now needs a compatibility decision.

### Option A: RoleDefinition becomes GlobalOccupation

Benefits:

- Reuses existing table name for the global occupation concept.
- Avoids adding another catalogue layer immediately.
- Makes current role catalogue feel more global.

Risks:

- Breaks the approved meaning of RoleDefinition as a WorkGroup child.
- Forces senior-residence operational roles to carry global semantics.
- Creates migration risk because RoleDefinition currently belongs to exactly one WorkGroup.
- Could confuse occupation identity with vertical staffing role.
- Would likely require schema and migration changes.

Assessment:

Not recommended.

### Option B: RoleDefinition remains operational role and references a new GlobalOccupation

Benefits:

- Preserves current approved RoleDefinition meaning.
- Adds a clean global HR abstraction above vertical roles.
- Allows multiple RoleDefinitions to map to one GlobalOccupation.
- Supports country profiles and organization job positions later.
- Keeps Resident Job stable while enabling multi-industry expansion.

Risks:

- Requires future schema additions.
- Requires mapping governance between vertical roles and global occupations.
- Requires migration planning for existing seeded roles.

Assessment:

Best long-term model.

### Option C: RoleDefinition remains unchanged for Phase 01 with future compatibility layer

Benefits:

- Preserves all completed foundations.
- Avoids immediate schema change.
- Allows Job Request Foundation to proceed if owner wants Phase 01 continuity.
- Defers global HR entities until their model is fully approved.
- Can later evolve into Option B through an Architecture Change Request.

Risks:

- Current RoleDefinition remains Resident Job-specific for now.
- Future global occupation search and AI matching must wait for the compatibility layer.
- Additional mapping work will be required later.

Assessment:

Recommended immediate path.

Recommendation:

Choose Option C for Phase 01, with an explicit future target of Option B.

RoleDefinition should remain unchanged for Phase 01. It should not become GlobalOccupation. A future ACR should introduce GlobalOccupation, CountryOccupationProfile, and mapping fields that allow RoleDefinition to reference GlobalOccupation without breaking the Resident Job vertical.

## 22. Recommended Revised Implementation Order

Recommended order after this addendum:

1. Preserve completed foundations.
2. Pause Role Definitions implementation until owner confirms compatibility strategy.
3. Approve this global HR core expansion addendum.
4. Decide whether Phase 01 continues with current RoleDefinition unchanged.
5. If yes, implement Role Definitions Foundation as operational Resident Job role catalogue only.
6. Implement Job Request Foundation using current WorkGroup and RoleDefinition boundaries.
7. Defer GlobalOccupation, CountryOccupationProfile, OrganizationJobPosition, skill catalogue, permanent vacancy, and recruitment workflow to a governed future phase.
8. Create an ACR before adding global HR schema entities.
9. Create country pack architecture before country-specific wage or compliance automation.
10. Add AI workforce brain only after source-of-truth entities and human approval boundaries are approved.

## 23. Migration Risks

Key risks:

- Renaming RoleDefinition to GlobalOccupation would create semantic drift.
- Adding GlobalOccupation too early could destabilize Phase 01.
- Country-specific compliance rules may be mistaken for global truth.
- Residence may be incorrectly replaced by generic Worksite without preserving vertical behavior.
- Worker profiles may incorrectly merge candidate, applicant, employee, contractor, and temporary worker states.
- Wage intelligence may be mistaken for payroll calculation.
- AI recommendations may be mistaken for authority.
- Permanent vacancy workflows may be accidentally mixed with temporary staffing workflows.

Migration controls:

- Use ACR for global HR schema additions.
- Preserve RoleDefinition for Phase 01.
- Add mapping fields rather than destructive renames.
- Maintain stable codes and slugs.
- Keep country pack policy separate from workflow authority.
- Keep financial workflows separate from wage guidance.

## 24. Owner Decisions Required

The owner must decide:

1. Whether to approve the global HR core expansion vision.
2. Whether RoleDefinition should follow Option C immediately and Option B later.
3. Whether Phase 01 should continue with current RoleDefinition unchanged.
4. When to introduce GlobalOccupation.
5. When to introduce CountryOccupationProfile.
6. When to introduce OrganizationJobPosition.
7. Whether permanent recruitment belongs in the same product phase as temporary staffing.
8. Which countries are first supported beyond Canada.
9. Which country pack rules are required for Quebec and Canada.
10. Whether wage intelligence is advisory only or governed by a future policy service.
11. Which global occupation taxonomy should be referenced, if any.
12. Which industries follow Resident Job as the next vertical.
13. Whether Residence becomes a subtype of future Worksite/Location or remains a parallel vertical entity.
14. Which AI workforce brain capabilities are permitted in Phase 01 versus future phases.
15. Which enterprise integrations are priority targets.

## Final Recommendation

Approve this addendum as a strategic architecture guide.

Do not change the existing schema yet.

Do not rename RoleDefinition.

For Phase 01, keep RoleDefinition unchanged as a Resident Job operational role under WorkGroup.

For the global HR future, introduce GlobalOccupation, CountryOccupationProfile, and OrganizationJobPosition through a separate ACR and migration plan.

Verdict: GLOBAL HR CORE EXPANSION READY FOR OWNER APPROVAL
