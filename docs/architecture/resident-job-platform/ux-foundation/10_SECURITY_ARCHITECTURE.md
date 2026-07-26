# Security Architecture

Status: Draft complete, awaiting UX Foundation approval
Architecture baseline: Resident Job Architecture Phase 1 v1.0
Implementation: Not authorized

## Purpose

Define security posture before UX and engineering implementation.

## Identity

- Role-based access control
- MFA for protected roles
- Session expiration
- Account recovery controls

## Data Protection

- Tenant isolation
- Field-level permissions
- No secrets in client bundles
- Sensitive data minimization

## Protected Actions

- Dispatch approval
- Financial adjustment
- Payroll approval
- Compliance exception
- AI policy change

## Audit

- Actor
- timestamp
- entity
- decision
- evidence
- before/after state where applicable

## Rules

- Administrator cannot bypass finance or compliance controls.
- AI cannot grant itself permissions.
- Production data must never be exposed in demo/prototype modes.
