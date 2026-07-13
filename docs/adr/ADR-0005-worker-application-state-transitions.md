# ADR-0005 - Worker Application State Transitions

**Status:** Accepted for RWO-G02  
**Date:** 2026-07-13

## Decision

Model worker applications, offers, and final confirmations as separate state machines.

The G02 domain layer defines:

- `WorkerApplication`
- `ShiftOffer`
- `WorkerConfirmation`
- `canTransitionApplication`
- `canTransitionOffer`
- `canTransitionConfirmation`

## Reason

Applying for a shift, accepting an offer, and confirming final commitment are different decisions.
Combining them would make the worker flow ambiguous and could accidentally imply that an
application creates a confirmed shift.

## Consequences

- A submitted application is not a confirmed shift.
- An accepted offer is not a completed final confirmation.
- Final confirmation is explicit and separately auditable.
- Attendance, punch-in, punch-out, post-shift work logs, payroll, and payment remain outside G02.
