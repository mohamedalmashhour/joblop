# ADR-0001 - Engineering Foundation

**Status:** Accepted for scaffold  
**Date:** 2026-07-13

## Decision

Create a dedicated Resident Workforce OS engineering repository as a TypeScript monorepo with separate mobile, employer, admin, API, and shared package boundaries.

## Reason

Discovery confirmed there was no production Resident Workforce OS app repository. Building inside the prototype package would create disconnected implementation debt.

## Consequences

- Foundation is explicit and reviewable.
- G01 can start from a clean baseline.
- Prototype remains a reference, not a production app.
