# Notification Matrix

Status: Draft complete, awaiting UX Foundation approval
Architecture baseline: Resident Job Architecture Phase 1 v1.0
Implementation: Not authorized

## Purpose

Define what notifications exist, who receives them, and whether action is required.

## Worker

- New matching offer.
- Application submitted.
- Offer accepted or rejected.
- Upcoming shift.
- Check-in reminder.
- Timesheet ready.
- Payment status.

## Employer

- Request submitted.
- Missing operational information.
- AI/scheduler recommendation ready.
- Worker accepted.
- Shift started.
- Shift completed.
- Timesheet approval required.
- Invoice ready.

## Scheduler

- Emergency request
- Worker conflict
- Replacement needed
- Missing data
- Offer expired

## Admin

- Compliance issue
- Credential expiry
- Financial approval
- Audit integrity issue
- AI policy warning

## Rules

- Notifications that create obligations must route to approval screens.
- Users can control non-critical notification preferences.
- Critical compliance/security notifications cannot be fully disabled.
