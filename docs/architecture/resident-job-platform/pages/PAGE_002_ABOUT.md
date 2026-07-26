# Page 002 - About

Status: Draft complete, awaiting approval
Section: Public Website
Users: Guest, Worker, Employer, Residence Manager, Agency operator, Investor, Partner
Implementation: Not authorized

## 1. Purpose

The About page explains why Resident Job exists, what problem it solves, and why it is different
from a generic job board or simple staffing marketplace.

The page should establish that Resident Job is an operational workforce platform for senior
residences, healthcare facilities, retirement homes, clinics, and long-term care organizations.

It should communicate:

- The platform exists because staffing shortages are operational emergencies, not only hiring needs.
- Workers must be verified before being offered sensitive residence and healthcare shifts.
- Clients need reliable workflows for urgent requests, recurring coverage, approvals, attendance,
  billing, and service follow-up.
- AI supports matching and decision preparation, but humans remain responsible for approvals,
  dispatch, financial commitments, and compliance decisions.

## 2. Users

Primary users:

- Guest evaluating trustworthiness
- Employer evaluating whether to request staff
- Worker deciding whether to register
- Residence manager comparing options
- Agency operator evaluating enterprise fit

Secondary users:

- Investor or strategic partner
- Recruiter
- Scheduler
- Finance stakeholder
- Support stakeholder

## 3. UI Layout

Recommended layout:

1. Header
   - Same public navigation as Page 001
   - CTAs: Request staff / Become a worker

2. Mission Hero
   - Short mission statement
   - Supporting paragraph about senior living and healthcare staffing operations
   - Visual: operations or workforce command-style image, clearly labeled if synthetic

3. Problem Section
   - Staffing shortages affect meals, care, housekeeping, maintenance, and resident safety.
   - Generic job boards do not manage urgent dispatch, verification, calendars, time clock,
     client billing, worker pay, or evidence.

4. What Resident Job Does
   - Worker intake
   - Client request intake
   - Group-based staffing categories
   - AI-assisted matching
   - Human approval
   - Attendance tracking
   - Billing and worker pay separation
   - Documentation and audit trail

5. Who It Serves
   - Senior residences
   - Healthcare facilities
   - Retirement homes
   - Clinics
   - Long-term care organizations
   - Staffing agencies serving these organizations

6. Operating Philosophy
   - Verify first
   - Match carefully
   - Approve before dispatch
   - Track work
   - Separate client billing from worker compensation
   - Preserve records

7. AI Philosophy
   - AI recommends
   - Humans approve
   - Every important action is reviewable

8. Trust and Safety
   - Worker verification
   - Document controls
   - Compliance posture
   - No hidden automatic dispatch

9. CTA Band
   - Request staff
   - Become a worker
   - Contact us

10. Footer
    - Same public footer as Page 001

## 4. Components

Required components:

- Mission hero
- Platform positioning card
- Problem cards
- Service audience cards
- Operating philosophy timeline
- AI advisory explanation panel
- Trust and safety section
- CTA band
- Footer

Optional components:

- Founder story excerpt, only if approved
- Real customer logos, only if approved
- Real testimonials, only if approved
- Public metrics, only if verified and date-stamped

## 5. Business Rules

- The About page must not claim guaranteed staffing unless an approved contract and service-level
  policy supports that claim.
- The page must not represent demo data, projections, or aspirational features as live production
  capability.
- The page may describe intended platform modules, but future or staged modules must be clearly
  described as roadmap or planned if they are not live.
- No worker, client, healthcare, billing, payroll, or compliance data may appear on the public page.
- AI must be described as advisory, not autonomous.
- Any statements about verification, credentials, or compliance must match approved operating policy.

## 6. Data Model

Potential public content entities:

- AboutPageContent
- PlatformMissionStatement
- ServiceAudience
- OperatingPrinciple
- PublicTrustStatement
- PublicRoadmapDisclosure
- PublicCTAEvent

Potential internal source entities that inform copy but are not directly exposed:

- WorkerVerificationPolicy
- ClientApprovalPolicy
- AIAdvisoryPolicy
- BillingSeparationPolicy
- ComplianceReviewPolicy

## 7. APIs

Potential API requirements:

- `GET /public/content/about`
- `GET /public/service-audiences`
- `GET /public/operating-principles`
- `POST /analytics/public-event`
- `POST /leads/contact`

API rules:

- Public API only exposes approved content.
- Content may be cached.
- Lead capture must be rate-limited and validated.
- No internal policy documents are exposed unless approved for public publication.

## 8. Permissions

Public read:

- About page content
- Mission statement
- Service audiences
- Approved public principles

Public submit:

- Contact form
- Worker interest
- Employer interest

Restricted:

- Worker records
- Client records
- Financial data
- Compliance files
- AI matching logic
- Internal dispatch rules
- Internal audit logs

## 9. Validation

Content validation:

- Claims are marked as live, planned, demo, or future where needed.
- No false guarantee of worker availability.
- No implication that AI dispatches autonomously.
- No unapproved legal, healthcare, accounting, payroll, or compliance claim.
- No fabricated testimonials.

UX validation:

- Mission is understood in five seconds.
- Worker and employer paths remain visually distinct.
- Mobile copy is readable without dense paragraphs.
- CTA buttons are reachable on mobile and desktop.
- Trust and safety content is visible before final CTA.

Technical validation:

- Page loads without authentication.
- Lead/contact submission validates required fields.
- No sensitive data appears in HTML, API response, logs, or analytics payloads.

## 10. AI Features

Allowed on this page:

- Explain Resident Job in plain language.
- Help a visitor decide whether they are a worker, employer, residence, agency, or partner.
- Suggest which public page to visit next.
- Identify missing information in a contact or lead form.

Not allowed on this page:

- Match named workers.
- Evaluate worker eligibility.
- Confirm staffing availability.
- Quote binding prices.
- Create shifts.
- Approve dispatch.
- Make compliance determinations.

AI posture:

AI can guide public visitors and summarize platform purpose. It cannot commit the business.

## 11. Mobile Design

Mobile priorities:

1. Mission statement
2. What problem Resident Job solves
3. Worker / employer CTAs
4. Who the platform serves
5. AI advisory posture
6. Trust and safety

Mobile behavior:

- Use short sections and expandable details.
- Avoid dense policy copy in the first viewport.
- Keep CTA buttons large and separated.
- Ensure users can quickly choose Worker or Employer path.
- Use simple cards for audiences and principles.

## 12. Desktop Design

Desktop priorities:

1. Mission and positioning
2. Problem and solution side by side
3. Operating philosophy
4. AI and human approval model
5. Trust and safety
6. CTA band

Desktop behavior:

- Use a composed, executive-grade layout.
- Avoid a generic startup landing-page feel.
- Present the platform as operations infrastructure.
- Use calm enterprise styling, not playful consumer styling.

## 13. Future Expansion

Future additions:

- Founder story page linked from About
- Verified case studies
- Partner and agency pages
- Compliance overview
- Careers / worker community page
- Region-specific operating pages
- Public trust center

Future dependencies:

- Approved public brand narrative
- Approved legal and compliance language
- Approved AI advisory language
- Approved data honesty policy
- Approved testimonial and case-study policy

## Page Gate

This page should be reviewed before Page 003 begins.

Review outcomes:

- Approved
- Approved with conditions
- Remediation required

