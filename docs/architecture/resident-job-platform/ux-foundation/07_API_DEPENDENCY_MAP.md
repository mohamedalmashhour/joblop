# API Dependency Map

Status: Draft complete, awaiting UX Foundation approval
Architecture baseline: Resident Job Architecture Phase 1 v1.0
Implementation: Not authorized

## Purpose

Map screen families to API families before implementation.

## Public

- public content
- lead capture
- worker interest
- analytics event

## Authentication

- session
- account creation
- email verification
- MFA
- password recovery

## Worker

- profile
- documents
- availability
- shift discovery
- applications
- offers
- earnings

## Employer

- organization
- residences
- departments
- shift requests
- approvals
- attendance
- invoices

## Scheduler

- operations board
- dispatch queue
- AI recommendations
- manual assignment
- replacement cases

## Admin

- users
- workers
- employers
- shifts
- finance
- payroll
- compliance
- audit
- AI control
- analytics

## Rules

- API dependencies must be role-gated.
- No page may call finance, payroll, or compliance APIs without explicit permission.
- AI APIs return recommendations and evidence, not autonomous decisions.
