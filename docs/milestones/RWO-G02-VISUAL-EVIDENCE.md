# RWO-G02 - Visual Evidence

**Status:** Captured locally  
**Date:** 2026-07-13

## Evidence Source

The mobile app was built with:

```text
pnpm --filter @rwos/mobile build
```

The exported web shell was served locally from:

```text
apps/mobile/dist
```

Screenshots are viewport captures from the local Expo web export. They are visual evidence only; all
data remains synthetic and local.

## Screenshots

```text
docs/milestones/rwo-g02-visual-evidence/screenshots/iphone-home.png
docs/milestones/rwo-g02-visual-evidence/screenshots/iphone-available.png
docs/milestones/rwo-g02-visual-evidence/screenshots/iphone-shift-details.png
docs/milestones/rwo-g02-visual-evidence/screenshots/iphone-application-review.png
docs/milestones/rwo-g02-visual-evidence/screenshots/iphone-application-final-review.png
docs/milestones/rwo-g02-visual-evidence/screenshots/iphone-application-duplicate-blocked.png
docs/milestones/rwo-g02-visual-evidence/screenshots/iphone-my-shifts.png
docs/milestones/rwo-g02-visual-evidence/screenshots/iphone-offer-details.png
docs/milestones/rwo-g02-visual-evidence/screenshots/iphone-confirmation-details.png
docs/milestones/rwo-g02-visual-evidence/screenshots/android-my-shifts.png
```

## Observations

- G02 header renders as `Worker app foundation - G02 applications and offers`.
- Available shifts remain visible from the worker app.
- Shift Details now exposes the application review entry point.
- Application review requires a second final review action.
- The seeded emergency chef duplicate application correctly blocks repeat submission.
- My Shifts shows applications, offers, and confirmations.
- Offer Details shows original/current worker-facing term comparison.
- Confirmation Details keeps final human confirmation separate from offer acceptance.
- Android-width My Shifts renders without crashing.

## Limitations

- Screenshots are Expo web viewport captures, not native device screenshots.
- The application-success state is covered by tests and reachable when no duplicate application
  exists; the seeded visual path intentionally captured the duplicate guard because that is the
  default local state.
- No production API, database, notification, attendance, payroll, billing, payment, or deployment
  behavior is represented.
