# Page 010 - Request Staff Wireframe Revision 1

Status: Controlled Revision 1 complete
Page: 010 - Request Staff
Architecture reference: `docs/architecture/resident-job-platform/pages/PAGE_010_REQUEST_STAFF.md`
Architecture baseline: Resident Job Architecture Phase 1 v1.0
UX baseline: Resident Job UX Foundation
Design system reference: `docs/architecture/resident-job-platform/ux-foundation/01_GLOBAL_DESIGN_SYSTEM.md`
Navigation reference: `docs/architecture/resident-job-platform/ux-foundation/02_NAVIGATION_ARCHITECTURE.md`
Financial UX reference: `docs/architecture/resident-job-platform/wireframes/FINANCIAL_UX_STANDARD_V1_0.md`
Implementation: Not authorized
Authenticated shift-creation workflow: Not included
Staffing request integration: Not authorized
Matching engine: Not authorized
Billing integration: Not authorized
Production data: Not used

## Summary Of Changes

Revision 1 is strictly limited to urgent staffing and same-day request clarity.

Added:

- Urgent staffing messaging that explains operational priority without guaranteeing coverage.
- Explicit factors that affect urgent staffing outcomes.
- Staffing Lifecycle state model.
- Replacement request clarification.
- Mobile urgent-staffing clarification.

Not changed:

- Architecture Freeze v1.0.
- UX Foundation.
- Navigation.
- Design System.
- Page purpose.
- Public intake boundary.
- AI advisory boundary.
- Financial UX boundary.
- Worker-data privacy boundary.

## A. Revised Urgent Staffing Messaging

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ URGENT STAFFING                                                              │
│                                                                              │
│ Urgent requests receive operational priority. They do not guarantee worker    │
│ availability, same-day coverage, replacement, or response time.               │
│                                                                              │
│ Staffing depends on factors such as:                                          │
│ - qualified worker availability                                               │
│ - location                                                                    │
│ - required credentials                                                        │
│ - scheduling conflicts                                                        │
│ - timing                                                                      │
│ - approved business rules                                                     │
│                                                                              │
│ Submitting an urgent request is not confirmation that coverage has been       │
│ secured.                                                                      │
│                                                                              │
│ AI may suggest possible candidates. Authorized personnel confirm final         │
│ assignments after operational review and worker acceptance.                    │
│                                                                              │
│ Active medical or public-safety emergencies belong with local emergency       │
│ services. No emergency numbers are hardcoded.                                 │
└──────────────────────────────────────────────────────────────────────────────┘
```

## B. Revised Staffing Lifecycle

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ STAFFING LIFECYCLE                                                           │
│                                                                              │
│ Requested                                                                    │
│ Request Submitted                                                            │
│        ↓                                                                     │
│ In Review                                                                    │
│ Operational Review                                                           │
│        ↓                                                                     │
│ Candidate Suggested                                                          │
│ AI-Assisted Candidate Suggestions                                            │
│        ↓                                                                     │
│ Employer Review                                                              │
│ Authorized employer reviews relevant candidates                              │
│        ↓                                                                     │
│ Awaiting Acceptance                                                          │
│ Worker receives the assignment opportunity                                   │
│        ↓                                                                     │
│ Confirmed                                                                    │
│ Worker accepts and authorized assignment is confirmed                         │
│        ↓                                                                     │
│ Shift Begins                                                                 │
│ Attendance workflow begins                                                    │
│                                                                              │
│ State indicators must remain distinct. Requested, In Review, Candidate        │
│ Suggested, Awaiting Acceptance, and Confirmed must never be collapsed into    │
│ one confirmed state.                                                          │
└──────────────────────────────────────────────────────────────────────────────┘
```

## C. Revised Replacement Requests

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ REPLACEMENT REQUESTS                                                         │
│                                                                              │
│ Replacement requests enter the same operational review process.               │
│                                                                              │
│ Issue reported                                                               │
│        ↓                                                                     │
│ Operational Review                                                           │
│        ↓                                                                     │
│ AI may recommend candidates                                                  │
│        ↓                                                                     │
│ Authorized personnel review options                                          │
│        ↓                                                                     │
│ Worker acceptance where applicable                                           │
│        ↓                                                                     │
│ Final assignment confirmed by authorized personnel                            │
│                                                                              │
│ Replacement is subject to availability. Do not promise a replacement.         │
│ The original issue remains unresolved until a replacement is confirmed or     │
│ another operational resolution is recorded.                                   │
└──────────────────────────────────────────────────────────────────────────────┘
```

## D. Mobile Revision

```text
┌──────────────────────────────┐
│ URGENT STAFFING              │
│ Urgent = operational priority│
│ Not guaranteed coverage      │
│ Not guaranteed same-day      │
│ Not guaranteed replacement   │
│ Not guaranteed response time │
│ Depends on worker, location, │
│ credentials, conflicts, time,│
│ and approved business rules. │
└──────────────────────────────┘

┌──────────────────────────────┐
│ STAFFING LIFECYCLE           │
│ Requested                    │
│ In Review                    │
│ Candidate Suggested          │
│ Employer Review              │
│ Awaiting Acceptance          │
│ Confirmed                    │
│ Shift Begins                 │
└──────────────────────────────┘

┌──────────────────────────────┐
│ REPLACEMENT REQUESTS         │
│ Operational review first.    │
│ AI may recommend candidates. │
│ Authorized people confirm.   │
│ Replacement depends on       │
│ availability.                │
└──────────────────────────────┘
```

## E. Confirmation

- Architecture unchanged.
- UX Foundation unchanged.
- Navigation unchanged.
- Design System unchanged.
- No guarantee of staffing or response time introduced.
- No guaranteed worker availability introduced.
- No guaranteed same-day coverage introduced.
- No guaranteed replacement introduced.
- No AI final-assignment authority introduced.
- Page 011 remains blocked.
- Epic 1 Review has not started inside this Page 010 revision.
- No implementation work began.
- No React work began.
- No frontend work began.
- No backend work began.
- No database work began.
- No deployment work began.
- No production data was used.

## F. Audit Notes

- Urgent requests do not guarantee worker availability, same-day coverage, replacement, or response time.
- Submitting an urgent request is not confirmation that coverage has been secured.
- Requested, In Review, Candidate Suggested, Awaiting Acceptance, and Confirmed must never be collapsed into one confirmed state.
