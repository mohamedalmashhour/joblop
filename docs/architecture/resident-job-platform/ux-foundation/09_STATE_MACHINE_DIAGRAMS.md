# State Machine Diagrams

Status: Draft complete, awaiting UX Foundation approval
Architecture baseline: Resident Job Architecture Phase 1 v1.0
Implementation: Not authorized

## Purpose

Define state transitions that UX must reflect.

## Shift Request

- draft
- submitted
- missing_information
- estimating
- pending_approval
- approved
- dispatching
- filled
- cancelled
- closed

## Worker Application

- draft
- submitted
- under_review
- offered
- accepted
- declined
- expired
- cancelled

## Shift Assignment

- assigned
- confirmed
- en_route
- checked_in
- in_progress
- checked_out
- completed
- exception
- cancelled

## Timesheet

- pending
- worker_submitted
- client_review
- approved
- disputed
- corrected
- closed

## Invoice

- draft
- issued
- pending_payment
- paid
- overdue
- disputed
- credited
- closed

## Worker Credential

- missing
- uploaded
- under_review
- verified
- rejected
- expired

## Ai Recommendation

- requested
- generated
- insufficient_evidence
- reviewed
- approved_by_human
- rejected_by_human
- expired

## Audit Event

- created
- sealed
- verified
- integrity_failed
