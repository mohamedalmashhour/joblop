# Resident Job Epic Review Model

Status: Active design governance control
Architecture baseline: Resident Job Architecture Phase 1 v1.0
UX baseline: Resident Job UX Foundation
Implementation: Not authorized

## Purpose

The 75 pages are reviewed one page at a time, but they also belong to functional epics. Each epic
must receive an Epic Review after all pages in that epic are approved as wireframes.

The Epic Review confirms that individually approved pages still work together as a coherent
workflow.

## Epic Map

| Epic | Pages | Focus |
| --- | ---: | --- |
| EPIC 1 | 001-010 | Public website |
| EPIC 2 | 011-015 | Authentication |
| EPIC 3 | 016-036 | Worker Portal |
| EPIC 4 | 037-055 | Employer Portal |
| EPIC 5 | 056-060 | Scheduler Console |
| EPIC 6 | 061-075 | Administration |

## Epic Review Gate

An Epic Review is created only after every page in the epic has:

- Initial low-fidelity wireframe.
- Product Design Review.
- Required revision, if any.
- Approval record.
- Design Status Matrix update.

For EPIC 1, after Page 010 reaches Approved Wireframe v1.0, work must stop automatically and an
Epic 1 Review must be completed before Page 011 begins.

## Epic Review Criteria

Each Epic Review must evaluate:

- End-to-end workflow clarity.
- Navigation consistency across pages.
- Terminology consistency.
- Reuse of approved interaction patterns.
- Mobile continuity.
- Accessibility continuity.
- Permission consistency.
- AI transparency consistency.
- Security and privacy consistency.
- Commercial separation where relevant.
- State and error handling consistency.

## Epic Review Outcomes

Valid outcomes:

- Epic approved.
- Epic approved with documented conditions.
- Epic remediation required.

No high-fidelity UI or frontend implementation may begin for an epic until its Epic Review gate is
closed.

## Current Epic Status

| Epic | Pages | Status |
| --- | ---: | --- |
| EPIC 1 - Public Website | 001-010 | APPROVED v1.0 (WITH CONDITIONS) |
| EPIC 2 - Authentication | 011-015 | APPROVED v1.0 (WITH CONDITIONS) |
| EPIC 3 - Worker Portal | 016-036 | Pages 016-025 APPROVED v1.0 - Page 026 next controlled gate |
| EPIC 4 - Employer Portal | 037-055 | Blocked |
| EPIC 5 - Scheduler Console | 056-060 | Blocked |
| EPIC 6 - Administration | 061-075 | Blocked |

Epic 1 launch-governance conditions:

- Privacy requires qualified legal review before publication.
- Terms requires qualified legal review before publication.
- Terms acknowledgement, applicability, and version management require operational configuration before launch.
- Public-facing legal and policy pages require final content review before production release.

These are launch-governance conditions, not architecture defects, UX defects, or implementation
defects. They do not block Epic 2 planning, but they do block public production launch.

Current page gate:

```text
Page 016 - Worker Dashboard
APPROVED WIREFRAME v1.0

Page 017 - My Profile
APPROVED WIREFRAME v1.0

Page 018 - Professional Information
APPROVED WIREFRAME v1.0

Page 019 - Licenses
APPROVED WIREFRAME v1.0

Page 020 - Certifications
APPROVED WIREFRAME v1.0

Page 021 - Background Check
APPROVED WIREFRAME v1.0

Page 022 - Availability Calendar
APPROVED WIREFRAME v1.0

Page 023 - Search Shifts
APPROVED WIREFRAME v1.0

Page 024 - Shift Details
APPROVED WIREFRAME v1.0

Page 025 - Apply
APPROVED WIREFRAME v1.0

Page 026
Next controlled wireframe gate
Owner authorization required before creating Page 026
```

Do not revisit Epic 1 unless a formal architecture change request is approved.
