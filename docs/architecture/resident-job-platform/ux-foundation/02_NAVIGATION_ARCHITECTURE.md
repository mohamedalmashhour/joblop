# Navigation Architecture

Status: Draft complete, awaiting UX Foundation approval
Architecture baseline: Resident Job Architecture Phase 1 v1.0
Implementation: Not authorized

## Purpose

Define how public visitors, workers, employers, schedulers, and administrators move through the platform.

## Public

- Landing
- About
- How It Works
- Pricing
- FAQ
- Become a Worker
- Request Staff
- Sign In

## Worker

- Home
- Available
- My Shifts
- Calendar
- Billing
- Profile
- Notifications
- Documents
- Settings

## Employer

- Dashboard
- Residences
- Departments
- Create Shift
- Urgent Shift
- Applicants
- Attendance
- Invoices
- Reports
- Support

## Scheduler

- Operations Dashboard
- AI Dispatch
- Manual Assignment
- Conflict Resolution
- Replacement Engine

## Admin

- Dashboard
- Users
- Workers
- Employers
- Residences
- Shifts
- Finance
- Payroll
- Compliance
- Reports
- Audit Log
- AI Control Center

## Rules

- Role determines first landing screen after sign-in.
- Users must never see navigation entries they cannot access.
- Protected actions require approval screens, not direct execution.
- Emergency flows may be surfaced first but must retain required checks.
