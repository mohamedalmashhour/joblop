# ADR-0003 - Shift Discovery Repository Pattern

**Status:** Accepted for RWO-G01  
**Date:** 2026-07-13

## Decision

Use a `ShiftDiscoveryRepository` interface between mobile feature code and shift data.

The G01 implementation uses `MockShiftDiscoveryRepository`, backed by local synthetic data. A future API repository must implement the same interface before replacing the mock adapter.

## Reason

The prototype needs functional shift discovery without pretending to be connected to production services. A repository boundary keeps mock data out of visual components and gives G02+ a clean integration point.

## Consequences

- Visual screens do not import mock arrays directly.
- Repository tests validate filtering behavior before API integration exists.
- Future API work can be reviewed against the same contract.
- G01 does not add production business endpoints.
