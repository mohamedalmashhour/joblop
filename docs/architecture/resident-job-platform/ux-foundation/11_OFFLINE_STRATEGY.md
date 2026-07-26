# Offline Strategy

Status: Draft complete, awaiting UX Foundation approval
Architecture baseline: Resident Job Architecture Phase 1 v1.0
Implementation: Not authorized

## Purpose

Define how the platform behaves when network access is unreliable.

## Worker

- Show cached schedule
- Allow offline note draft
- Queue check-in/out only with explicit offline label
- Sync when online

## Employer

- Show cached request status
- Allow draft request editing
- Do not confirm dispatch offline

## Scheduler

- Offline mode is read-only except notes; dispatch decisions require connectivity

## Admin

- Offline mode is read-only

## Rules

- Offline actions must be visibly labeled.
- Financial, compliance, dispatch, and AI policy actions require online confirmation.
- Conflicts after sync require human review.
