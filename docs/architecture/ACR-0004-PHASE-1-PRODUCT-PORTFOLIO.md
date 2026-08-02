# ACR-0004 — Phase 1 Product Portfolio

Status: **APPROVED — PRODUCT DIRECTION**

Record date: 2026-08-02

Owner: Mohamed Almashhour

## Decision

The Resident Workforce OS repository implements Phase 1 of a three-product information-technology
portfolio:

1. **Resident Workforce OS** is the shared multi-organization B2B SaaS platform.
2. **JobLop** is the employer-facing workforce and staffing product.
3. **RezekMe** is the worker-facing marketplace product, beginning with its workforce vertical.

The three products share governed platform capabilities while retaining distinct audiences,
navigation, branding, authorization and data-exposure boundaries. One platform administration
plane governs JobLop and the Phase 1 RezekMe workforce vertical.

This record does not rename the internal `tenant` security concept. Test and human-facing evidence
continues to use **Test Employer Organization A** and **Test Employer Organization B**.

## Product responsibilities

### Resident Workforce OS

Resident Workforce OS owns the reusable B2B SaaS foundation:

- HR and workforce administration;
- scheduling and staffing orchestration;
- attendance and timesheet boundaries;
- payroll preparation and governed provider handoffs;
- a human-supervised AI manager;
- operational and financial reporting;
- compliance, authorization and audit controls;
- organization isolation, configuration, integrations and platform administration.

Senior residences are the initial operating market, but organization, role, policy and terminology
configuration must not make the core platform dependent on one industry. Future supported sectors
may include hospitals, hotels, restaurants, factories and other organizations with temporary or
scheduled workforce needs.

### JobLop

JobLop is the employer/client experience for organizations searching for and managing workers.

Initial target customers:

- hospitals;
- senior residences and retirement homes;
- hotels;
- restaurants;
- factories;
- temporary staffing agencies.

Planned revenue models:

- employer subscriptions;
- contractually approved placement or marketplace fees;
- AI-assisted scheduling tools;
- payroll-preparation and integration tools.

Phase 1 JobLop functionality is implemented through the Employer application and the authorized
shared API/platform services. Revenue rules must be versioned by contract and effective date. No
fee, subscription, placement charge or payroll behavior becomes live merely because it appears in
this portfolio record.

### RezekMe

RezekMe is a broader marketplace or “super app.” Its long-term service categories are:

- freelancers and job opportunities;
- local businesses;
- used products;
- professional services;
- delivery;
- local shopping;
- classified advertisements.

Future capabilities may include marketplace payments, a wallet and rewards.

Phase 1 implements only the workforce/job vertical through the Worker web/mobile experience. The
other marketplace categories, commerce transactions, delivery, wallet, stored value and rewards
are future phases and are not authorized by this record.

## Phase 1 implementation map

| Repository boundary                  | Phase 1 product responsibility                                 |
| ------------------------------------ | -------------------------------------------------------------- |
| `apps/employer`                      | JobLop employer/client experience                              |
| `apps/mobile` and Worker web ingress | RezekMe workforce/job experience                               |
| `apps/admin`                         | Shared Resident Workforce OS administration plane              |
| `apps/api`                           | Shared authorized workflow and data boundary                   |
| Internal adapters and QA reset       | Resident Workforce OS platform operations                      |
| Shared packages and database         | Reusable platform contracts with strict organization isolation |

Phase 1 covers:

- secure authentication and role-appropriate onboarding;
- employer staffing requests and calendars;
- candidate, offer, dispatch and assignment workflows;
- Worker acceptance and calendar workflows;
- attendance, punch-in/out evidence and timesheets;
- employer invoices, documents and fake/test payment orchestration where already approved;
- administration, audit, compliance and reporting foundations;
- deterministic synthetic fixtures and cross-organization denial evidence.

## Domain boundary

- `joblop.com` is reserved for the future production JobLop employer experience.
- `rezekme.com` is reserved for the future production RezekMe experience.
- The current approved staging hosts remain under `staging.sybnb.app`.

This record does not authorize DNS changes, production deployment or public launch on either new
domain. Those actions require a separate reviewed production release and explicit authorization.

## AI boundary

“AI manager” and “AI scheduling” mean explainable, human-supervised assistance. AI may summarize,
identify conflicts, suggest schedules or workers, and explain recommendations where the existing
contracts permit it.

AI must not independently:

- hire, reject, rank or discipline a worker;
- assign or remove a worker from authoritative employment or marketplace state;
- approve attendance, timesheets, invoices, payroll, payments or refunds;
- determine compensation, worker classification, tax or legal status;
- send external communications or modify authoritative records without an authorized human action.

## Payroll and financial boundary

The Phase 1 product may expose payroll-readiness status, approved-timesheet handoff, provider-neutral
preparation, documents and exports. Statutory payroll execution, deductions, remittances, tax filing,
worker payout and real provider activation remain separately governed.

Likewise, future RezekMe wallet, stored value, rewards, seller settlement and money transmission
require separate legal, accounting, security, privacy and provider architecture changes.

Invoice issuance and employer payment collection remain separate auditable operations under
ACR-0001 and ACR-0002. Worker payable and payout remain governed by ACR-0003.

## Security and data isolation

All products must enforce the existing organization-isolation model. Neither organization may
access the other organization's workers, memberships, staffing requests, calendars, candidates,
dispatch records, offers, delivery attempts, assignments, attendance, timesheets, invoices,
payments, documents, audit records or internal administrative records.

Cross-product reuse occurs through authorized platform contracts, never through an implicit shared
frontend session, unrestricted database query or broad administrative access.

## Relationship to frozen architecture

This record is the approved portfolio and naming overlay for the frozen Resident Job Phase 1
architecture. It does not silently modify the 75 frozen page specifications, weaken their human
approval requirements or authorize future RezekMe verticals.

When a frozen artifact says “Resident Job”:

- employer-facing behavior maps to JobLop;
- worker-facing workforce behavior maps to the RezekMe workforce vertical;
- shared administration, security and infrastructure map to Resident Workforce OS.

Any page-level semantic change beyond this mapping requires the existing architecture-change
process.

## Explicitly deferred

- RezekMe commerce, delivery, local shopping, used products and classifieds;
- RezekMe wallet, stored value, rewards and real marketplace payments;
- live Stripe, ACSS, cards, bank accounts or worker payouts;
- statutory payroll, tax filing, T4A filing and government remittance;
- autonomous AI employment or financial decisions;
- production DNS and deployment for `joblop.com` or `rezekme.com`;
- real employers, workers, personal information or production traffic.
