# ADR-0004 - Mobile State Management

**Status:** Accepted for RWO-G01  
**Date:** 2026-07-13

## Decision

Use local React state for G01 mobile shift discovery.

## Reason

G01 has one functional vertical slice with local filters, loading, empty, error, and details states. Adding a global state library now would create architecture before the product has cross-feature state pressure.

## Consequences

- `AvailableShiftsScreen` owns discovery filters and loading state.
- Shared state remains unnecessary until applications, offers, attendance, or notifications are authorized.
- G02 may revisit this decision if worker applications introduce shared workflow state.
