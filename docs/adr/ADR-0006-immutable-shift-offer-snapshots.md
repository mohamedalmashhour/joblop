# ADR-0006 - Immutable Shift Offer Snapshots

**Status:** Accepted for RWO-G02  
**Date:** 2026-07-13

## Decision

Store both original and current worker-facing shift snapshots on every `ShiftOffer`.

## Reason

An offer may change the time window, estimated worker-facing total, cancellation wording, or other
worker-visible terms after the original application. The worker must review the final terms before
accepting.

## Consequences

- Offer Details can show changed terms without mutating the original shift discovery record.
- Worker-facing compensation stays separated from client billing and platform margin.
- G02 can validate changed offer terms without adding employer, admin, payroll, or payment logic.
- Future API repositories must preserve the snapshot contract when replacing the local mock adapter.
