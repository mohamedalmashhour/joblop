# RWO-G01 Visual Review Package

## Status

`RWO-G01` is visually reviewable after a narrow web-render correction.

Recommendation: `APPROVE G01`

## Baseline

- Repository: `/Users/mohamedalmashhour/Documents/RESIDENT_WORKFORCE_OS_WORKSPACE/resident-workforce-os`
- Branch: `foundation/repository-foundation`
- Starting HEAD: `a41842d019b259cac138136abe9cb087db868b3b`
- Scope: Worker Identity and Shift Discovery Foundation only.
- Non-scope preserved: G02, shift applications, employer workflows, admin workflows, billing, payroll, production APIs, production authentication, database migrations, notifications, attendance, deployment.

## Review Environment

- Mobile app build: Expo web static export from `apps/mobile/dist`
- Local preview: `http://127.0.0.1:4199`
- Capture method: in-app browser viewport screenshots
- Evidence directory: `docs/milestones/rwo-g01-visual-review/screenshots`

## Viewports

| Viewport       |        Size | Purpose                             |
| -------------- | ----------: | ----------------------------------- |
| iPhone review  | `390 x 844` | Primary mobile review               |
| Android review | `412 x 915` | Secondary mobile-width sanity check |

## Evidence Index

| File                                   | View                                       |
| -------------------------------------- | ------------------------------------------ |
| `iphone-home-placeholder.jpg`          | Home placeholder                           |
| `iphone-filters-screen.jpg`            | Available filters section                  |
| `iphone-available-populated.jpg`       | Available populated results                |
| `iphone-available-filtered.jpg`        | Available filtered to one shift            |
| `iphone-available-empty.jpg`           | Available empty state                      |
| `iphone-shift-details-immediate.jpg`   | Shift Details, immediate chef shift        |
| `iphone-shift-details-urgent.jpg`      | Shift Details, urgent care shift           |
| `iphone-shift-details-normal.jpg`      | Shift Details, normal housekeeping shift   |
| `iphone-applications-not-enabled.jpg`  | G01 action boundary, applications disabled |
| `iphone-my-shifts-placeholder.jpg`     | My Shifts placeholder                      |
| `iphone-billing-placeholder.jpg`       | Billing placeholder                        |
| `iphone-profile-placeholder.jpg`       | Profile placeholder                        |
| `iphone-notifications-placeholder.jpg` | Notifications placeholder                  |
| `android-home-placeholder.jpg`         | Android-width Home placeholder             |
| `android-available-populated.jpg`      | Android-width Available results            |

## Reviewed Surfaces

| Surface                                    | Result | Notes                                                                                                                                                           |
| ------------------------------------------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home                                       | Passed | Placeholder clearly states route-only status for future milestones.                                                                                             |
| Available populated                        | Passed | Three mock shifts render with role, residence, urgency, location, schedule, worker-facing compensation, experience, certifications, languages, and open status. |
| Available filtered                         | Passed | Filtered state visibly narrows the result set.                                                                                                                  |
| Available empty                            | Passed | Empty copy explains no shifts match and instructs reset.                                                                                                        |
| Filters                                    | Passed | Current G01 exposes filters in the Available screen, not as a separate route.                                                                                   |
| Shift Details normal                       | Passed | Normal priority shift details render.                                                                                                                           |
| Shift Details urgent                       | Passed | Urgent priority shift details render.                                                                                                                           |
| Shift Details immediate                    | Passed | Immediate chef shift details render.                                                                                                                            |
| Applications disabled                      | Passed | G01 action boundary is explicit; applications are not enabled.                                                                                                  |
| My Shifts, Billing, Profile, Notifications | Passed | Placeholder routes are preserved and clearly scoped to future milestones.                                                                                       |

## Narrow Corrections Applied

### Web render blocker

The static Expo web export initially rendered a blank page. The mobile package did not declare a direct `react-dom` dependency, so `react-native-web` resolved through `react-dom@19.2.7` while the Expo mobile shell uses `react@19.0.0`.

Resolution:

- Added direct `react-dom@19.0.0` to `apps/mobile`.
- Preserved `react@19.0.0` and Expo 53 compatibility.
- Rebuilt the static export successfully.

### Mobile-width visual blocker

The mobile web screenshot initially collapsed the header and navigation when captured at phone width.

Resolution:

- Added web-safe header text rendering for the Expo web review target.
- Added full-width layout constraints to the mobile shell.
- Updated the review palette from teal to approved dark blue.
- Added a design-system token test for the approved dark-blue foundation palette.

## Visual QA Checklist

| Check                      | Result | Notes                                                                               |
| -------------------------- | ------ | ----------------------------------------------------------------------------------- |
| First impression           | Passed | Screen communicates worker shift discovery, not employer/admin operations.          |
| G01 scope clarity          | Passed | G01 discovery-only and applications-disabled boundaries are visible.                |
| Worker-facing compensation | Passed | Shift cards and details show worker-facing hourly/estimated amounts only.           |
| Commercial separation      | Passed | Client billing and platform margin are not shown in the worker app.                 |
| Urgency labels             | Passed | Normal, urgent, and immediate labels are visible as text badges.                    |
| Touch targets              | Passed | Primary controls meet the 44px minimum target rule.                                 |
| Information hierarchy      | Passed | Header, filters, results, cards, and details are understandable at phone width.     |
| Dark-blue design request   | Passed | Foundation palette now uses dark blue for header and active tabs.                   |
| Synthetic data honesty     | Passed | Available screen identifies G01 mock/demo data as local and future-API replaceable. |

## Accessibility Checklist

| Check                                | Result             | Notes                                                         |
| ------------------------------------ | ------------------ | ------------------------------------------------------------- |
| Button roles                         | Passed             | Tab buttons and shift cards use interactive roles.            |
| Text labels                          | Passed             | Urgency and status are textual, not color-only.               |
| Color contrast                       | Passed             | Dark-blue header/active tab with cream text is high contrast. |
| Touch size                           | Passed             | Shared touch token remains `44`.                              |
| Keyboard and screen-reader full pass | Not fully verified | Requires native-device or emulator review after G01 approval. |

## Localization

Localization was not implemented in G01. The available data model includes language information for shifts, but the UI copy is English-only in this review package.

No French, Arabic, or RTL visual review was claimed.

## Dependency Review

Observed:

- `react@19.0.0`
- `react-dom@19.2.7` was being selected transitively before correction.
- `react-native-web@0.20.0` consumes `react-dom`.
- Expo 53 is aligned with React 19.0.0.

Decision:

- Pinning `react-dom@19.0.0` is the smallest safe correction because it aligns the web renderer with the installed React version and fixes the blank static export.
- Upgrading React to `19.2.7` was rejected because it would move away from the Expo-supported React baseline.
- Expo CLI also reported `react-native@0.79.6` and `@types/react@~19.0.10` expectations during the attempted dev-server run. Those were not changed because the static export and validation passed after the direct `react-dom` correction, and they were not necessary for G01 visual review.

## Defects

### Blocking defects fixed

1. Static Expo web export rendered blank because of the React/React DOM mismatch.
2. Phone-width screenshot evidence collapsed visually before the web-safe header/layout correction.

### Non-blocking observations

1. The bottom tab bar wraps into two rows at phone width. It remains readable and touchable, but future native design may prefer icons or a compressed five-tab pattern.
2. Loading, error, and retry states are covered by state/model tests but are not directly reachable in the current production-like static UI without a test harness.
3. Filters are embedded in the Available screen; there is no standalone Filters route in G01.
4. Expo dev server was blocked by local watcher limits on macOS. Static export review remained available and passed.

## Final Review Recommendation

`APPROVE G01`

Reason:

- G01 scope is intact.
- Worker discovery and details are visually reviewable.
- Applications remain disabled.
- Client billing, platform margin, employer/admin operations, live APIs, auth, database, and G02 work were not introduced.
- The required dark-blue visual adjustment is applied and covered.
