# Page 027 - GPS Check In Low-Fidelity Wireframe

Status: Initial wireframe complete
Epic: Epic 3 - Worker Portal
Primary user: Authenticated worker
Secondary visibility: Scheduler, Employer, Support, and Platform staff where role-permitted
Architecture baseline: Resident Job Architecture Phase 1 v1.0
Epic planning baseline: Epic 3 Worker Portal Planning v1.0
Frozen architecture source: pages/PAGE_027_GPS_CHECK_IN.md
Implementation: Not authorized

## 1. Frozen Page Confirmation

The frozen architecture page map defines:

| Page | Frozen title | Source |
| --- | --- | --- |
| 026 | Accepted Shift | pages/PAGE_026_ACCEPTED_SHIFT.md |
| 027 | GPS Check-In / GPS Check In | pages/PAGE_027_GPS_CHECK_IN.md |
| 028 | GPS Check Out | pages/PAGE_028_GPS_CHECK_OUT.md |

No title inference, rename, or architecture amendment is introduced.

## 2. Page Purpose

GPS Check In is the authenticated worker page for initiating a governed check-in event for the
correct accepted shift.

It allows the worker to:

- understand when check-in becomes available;
- review the exact assignment before acting;
- grant location permission where needed;
- confirm arrival intent;
- understand the location or proximity result;
- use an approved fallback when GPS is unavailable;
- report a check-in problem;
- understand whether check-in was recorded or needs review.

The page must not:

- track the worker continuously;
- access location before informed worker action;
- mark the worker present automatically;
- approve worked hours;
- create payroll;
- expose exact worker location to employers unnecessarily;
- infer misconduct from failed or inconclusive GPS;
- allow check-in for an unrelated shift;
- allow AI to decide attendance.

## 3. Attendance Lifecycle Boundary

```text
Accepted shift
↓
Arrival window opens
↓
Worker initiates check-in
↓
Location permission and location reading
↓
Check-in validation
↓
Check-in recorded or review required
↓
Attendance in progress
↓
Future check-out
↓
Attendance review
↓
Approved hours
↓
Payroll
```

Required boundaries:

```text
GPS detected
does not equal
Worker checked in

Check-in submitted
does not equal
Check-in accepted

Check-in accepted
does not equal
All hours approved

Hours approved
does not equal
Paid
```

## 4. Information Ownership

Page 027 owns:

- selected assignment identity;
- check-in availability;
- worker-initiated location permission explanation;
- location/device result presentation;
- proximity result presentation;
- check-in submission and confirmation states at wireframe level;
- fallback check-in concepts;
- review-required paths;
- duplicate/conflicting check-in handling;
- privacy and visibility boundaries;
- safety reminders.

Page 027 does not own:

- accepted-shift commitment management;
- continuous location tracking;
- check-out;
- attendance review;
- approved hours;
- timesheet approval;
- payroll;
- employer billing;
- worker discipline;
- fraud determination;
- geofence implementation.

## 5. Desktop Wireframe

```text
HEADER
Resident Job | GPS Check In | Worker: [Name] | Help | Notifications

BOUNDARY NOTICE
GPS Check In records a specific check-in event only.
It is not continuous tracking, hours approval, payroll, payment, or a misconduct decision.

ATTENDANCE LIFECYCLE
Accepted shift -> Arrival window -> Worker starts check-in -> Permission/location
-> Validation -> Recorded or review required -> Future check-out -> Review -> Payroll

SHIFT IDENTITY
- Role: [role]
- Employer / residence: [approved operational name]
- Date: [date]
- Scheduled start: [time + timezone]
- Approved location: [approved location summary]
- Accepted-shift status: [confirmed / changed / cancelled / reconfirmation required]
- Check-in window: [state]
- Assignment reference: [user-friendly identifier]
- Last material update: [timestamp placeholder]

CHECK-IN WINDOW
- State: Too early / Available / Late / Closed / Cancelled / Changed / Reconfirm / Unavailable
- Config source: employer, site, assignment, jurisdiction, or approved platform policy
- Action available: wait, check in, provide late reason, review change, contact support
- No universal early or late threshold is hardcoded

LOCATION PERMISSION
- Why: confirm arrival for this specific attendance event
- What: timestamp, validation result, approximate distance, accuracy range, review status
- When: only after the worker starts check-in
- Who may see: role-limited operational status
- Retention: governed separately by future policy
- Decline path: fallback or support
- Consent: explicit, not preselected, not bundled

PRIMARY CHECK-IN ACTION
[I am at the workplace - start check-in]
[Review shift again]
[Use approved fallback]
[Contact support]

LOCATION RESULT PANEL
Device result:
- Permission not requested / granted / denied / blocked
- Location available / unavailable
- Accuracy sufficient / low / insufficient
- Location services off / timeout / device error / browser unsupported

Proximity result:
- Within approved area
- Near boundary
- Outside approved area
- Site location unavailable
- Result inconclusive

Review state:
- Not submitted
- Submitted
- Recorded
- Review required
- Correction requested
- Rejected where governed
- Verification unavailable

GEOFENCE FAIRNESS NOTICE
Outside configured area does not automatically mean absent or misconduct.
It may reflect wrong entrance, poor GPS accuracy, inaccurate site coordinates,
parking area, device issue, or a legitimate exception.

FALLBACK CHECK-IN
- Site QR code concept
- Employer-issued code concept
- Supervisor confirmation concept
- Support-assisted check-in
- Manual review request
- Approved kiosk/device concept
- Documented exception

Fallback submitted does not equal automatically approved.

QR / CODE SAFETY
- Assignment-specific or one-time concept
- Expiry / invalid state shown
- Cannot be used for another shift or site
- No reusable static secrets shown
- No token algorithm or security implementation defined

WORKER CONFIRMATION
Worker confirms:
- correct shift
- correct location
- arrival intent
- permission for this check-in location event
- fallback explanation where required

SUCCESSFUL CHECK-IN
- Check-in recorded
- Timestamp and timezone
- Assignment reference
- Validation method
- Review still pending? yes/no
- Next operational step
- Support route

Truthful language only:
Recorded check-in is not attendance approval, approved hours, payroll, or guaranteed payment.

REVIEW REQUIRED
- Location could not be confirmed / additional information needed / fallback submitted
- Retry
- Use fallback
- Contact support
- Request correction
- Timestamp
- Current commitment status

Avoid: fraud detected, false location, worker absent, misconduct.

LATE CHECK-IN
- Scheduled start
- Current time
- Late status
- Required action
- Optional reason where governed
- Support path
- Approved operational contact
- No automatic penalty or no-show conclusion

PRIVACY AND VISIBILITY
Worker sees:
- selected assignment
- check-in availability
- permission explanation
- status/result
- fallback/support paths

Employer may see:
- check-in recorded
- check-in time
- review required
- worker action pending
- approved method
- arrival exception status

Employer does not generally see:
- precise coordinates
- continuous location
- device details
- private explanation
- unrelated location history
- detailed GPS diagnostics
- support notes
- fraud-risk signals

Platform/support role-based view:
- assignment
- timestamp
- configured site location
- proximity result
- accuracy
- validation method
- fallback evidence
- audit/support history

PRIVACY / RETENTION NOTICE
Location is collected for a specific attendance event.
Continuous tracking is not part of this page.
Retention and deletion are governed separately; legal hold or dispute rules may apply.

DEVICE / PERMISSION STATES
- permission not requested / granted / denied / blocked permanently
- location services off
- browser or device unsupported
- offline / weak connection
- GPS timeout / repeated failure
- app backgrounded
- understandable next action for each state

OFFLINE / CONNECTIVITY
- no connection
- unstable connection
- location obtained but submission unavailable
- pending local submission, not confirmed
- duplicate submission risk
- stale check-in state
- reconnect and retry

Do not claim recorded until the authoritative system confirms.

DUPLICATE / CONFLICTING CHECK-IN
- already checked in
- duplicate submission
- recorded on another device
- check-in for another shift
- cancelled assignment
- check-in after check-out
- overlapping accepted shifts
- stale assignment version

MATERIAL SHIFT CHANGES
- block or pause check-in where acknowledgement is required
- show changed fields
- require review
- provide support or permitted decline path
- do not check worker into unreviewed terms

SAFETY
- safe arrival reminder
- do not use device while driving
- emergency support path
- workplace safety contact
- report unsafe access conditions
- no clinical or workplace task instructions

AI ASSISTANCE
AI may explain permission states, check-in status, review-required reasons,
fallback options, non-sensitive attendance steps, and support routing.
AI must not infer fraud, decide presence, approve/reject attendance, alter timestamps,
fabricate location, submit without confirmation, start tracking, expose location,
penalize workers, or create payroll records.
```

## 6. Mobile Wireframe

Mobile must prioritize:

1. Correct shift identity.
2. Check-in availability.
3. Current time and timezone.
4. Location-permission explanation.
5. Primary check-in action.
6. GPS/status result.
7. Fallback action.
8. Support.
9. Confirmation state.
10. Safe-driving reminder.

```text
MOBILE TOP
GPS Check In
[Role] at [Residence]
[Date] [Start time] [Timezone]

CHECK-IN STATUS
[Too early / Available / Late / Review required / Recorded]
Next action: [wait / check in / review change / use fallback / contact support]

SHIFT CONFIRMATION
[Assignment reference]
[Location summary]
[Last material update]
[Cancelled or changed warning if active]

LOCATION PERMISSION
Why we ask
What is collected
Who may see the status
[Allow for this check-in] [Use fallback] [Not now]

PRIMARY ACTION
[Start check-in]

STATUS RESULT
Device: [available / denied / low accuracy / timeout]
Proximity: [within area / near boundary / outside / inconclusive]
Review: [not submitted / recorded / review required]

FALLBACK
[QR/code] [Supervisor confirmation] [Support-assisted] [Manual review]

SUPPORT AND SAFETY
[Report issue] [Contact support]
Do not interact while driving.
For immediate danger, use local emergency services.

CONFIRMATION
Recorded at [time + timezone]
Method: [GPS / fallback / review pending]
Next: future check-out
```

Avoid dense maps. A simple status presentation is preferred over unnecessary map detail.

## 7. State and Edge Cases

Required states:

- Too early.
- Check-in available.
- Late check-in.
- Window closed.
- Shift cancelled.
- Shift changed.
- Reconfirmation required.
- Status unavailable.
- Permission not requested.
- Permission granted.
- Permission denied.
- Permission blocked permanently.
- Location services off.
- Browser unsupported.
- Device unsupported.
- Offline.
- Weak connection.
- GPS timeout.
- Repeated failure.
- App backgrounded.
- Location available.
- Location unavailable.
- Accuracy insufficient.
- Within approved area.
- Near boundary.
- Outside approved area.
- Site location unavailable.
- Result inconclusive.
- Not submitted.
- Submitted.
- Recorded.
- Review required.
- Correction requested.
- Rejected where governed.
- Verification unavailable.
- Pending submission, not confirmed.
- Already checked in.
- Duplicate submission.
- Check-in recorded on another device.
- Check-in for another shift.
- Check-in after check-out.
- Overlapping accepted shifts.
- Stale assignment version.

Each state must explain what happened and what the worker can do next.

## 8. Accessibility

The page must support:

- keyboard navigation;
- screen-reader check-in state announcements;
- accessible permission explanation;
- no color-only proximity states;
- status announcements;
- focus management after permission, retry, fallback, and success states;
- accessible fallback controls;
- clear error association;
- plain-language GPS guidance;
- sufficient contrast;
- accessible QR/code alternative;
- clear time and timezone labels;
- large mobile touch targets.

## 9. International Readiness

The page must not hardcode:

- geofence radius;
- check-in window;
- late threshold;
- timezone;
- date or time format;
- distance unit;
- location provider;
- privacy language;
- consent wording;
- retention period;
- employer access rules;
- fallback method;
- emergency number;
- attendance law;
- labour policy.

Jurisdiction, employer, site, assignment, locale, and policy configuration remain separate.

## 10. Self Validation

| Requirement | Result |
| --- | --- |
| Frozen title remains GPS Check In | Pass |
| Architecture Freeze unchanged | Pass |
| Epic 3 Planning unchanged | Pass |
| Pages 016-026 unchanged | Pass |
| No Page 028 created | Pass |
| No implementation started | Pass |
| No React/frontend/backend/API/database work | Pass |
| No GPS integration created | Pass |
| No geofence implementation created | Pass |
| No attendance implementation created | Pass |
| No payroll implementation created | Pass |

## 11. Final Wireframe Status

```text
Page 027 - GPS Check In
Wireframe: COMPLETE
Product Review: REQUIRED
Approval Record: NOT CREATED

Page 028
BLOCKED
```
