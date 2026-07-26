# Permission Matrix

Status: Draft complete, awaiting UX Foundation approval
Architecture baseline: Resident Job Architecture Phase 1 v1.0
Implementation: Not authorized

## Purpose

Define role access before UI and API implementation.

## Roles

- Guest
- Worker
- Employer
- Residence Manager
- Scheduler
- Recruiter
- Payroll
- Finance
- Support
- Administrator
- Super Administrator

## Matrix

- Guest: public pages, lead forms, account creation.
- Worker: own profile, own documents, own calendar, own applications, own earnings.
- Employer: own organization, residences, requests, attendance, invoices.
- Residence Manager: assigned residence operations and approvals.
- Scheduler: dispatch queues, worker availability snapshots, assignments.
- Recruiter: worker onboarding, profile review, documents review.
- Payroll: worker earnings and payout preparation.
- Finance: client billing, payment review, financial reporting.
- Support: tickets, communication support, non-financial issue resolution.
- Administrator: operational administration, no unrestricted financial bypass.
- Super Administrator: system settings and AI control, still audited.

## Rules

- Permissions are additive and explicit.
- Admin role does not bypass finance/compliance approval gates.
- Every protected approval records actor, time, decision, and evidence.
