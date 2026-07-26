# Entity Relationship Overview

Status: Draft complete, awaiting UX Foundation approval
Architecture baseline: Resident Job Architecture Phase 1 v1.0
Implementation: Not authorized

## Purpose

Create a conceptual data overview for UX and future technical design.

## Core Entities

- User
- WorkerProfile
- EmployerAccount
- Residence
- Department
- StaffGroup
- ShiftRequest
- Shift
- WorkerApplication
- ShiftOffer
- Assignment
- CheckInEvent
- CheckOutEvent
- Timesheet
- ClientInvoice
- WorkerEarning
- Document
- Credential
- Notification
- Message
- AiRecommendation
- AuditEvent

## Relationships

- EmployerAccount owns Residences.
- Residence owns Departments.
- ShiftRequest belongs to EmployerAccount, Residence, Department, and StaffGroup.
- WorkerProfile has StaffGroup memberships and Credentials.
- AIRecommendation references ShiftRequest and eligible WorkerProfiles.
- Assignment connects Shift, WorkerProfile, EmployerAccount, and Residence.
- Timesheet derives from Assignment and time clock events.
- ClientInvoice and WorkerEarning derive from approved timesheet data but remain separate.
