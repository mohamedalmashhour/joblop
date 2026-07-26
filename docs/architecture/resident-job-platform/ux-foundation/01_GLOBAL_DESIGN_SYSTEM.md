# Global Design System

Status: Draft complete, awaiting UX Foundation approval
Architecture baseline: Resident Job Architecture Phase 1 v1.0
Implementation: Not authorized

## Purpose

Define the visual and interaction language for Resident Job before wireframes or production UI work begins.

## Principles

- Operational clarity before decoration.
- Mobile-first worker flows and desktop command-center flows.
- Human approval gates must be visually obvious.
- AI recommendations must look advisory, not automatic.
- Client billing, worker pay, and platform margin use separate visual language.

## Foundations

- Primary color: dark blue operating-system palette.
- Accent colors: warning for urgent staffing, green for approved/ready, red for risk/blockers.
- Typography: readable sans-serif, no negative letter spacing.
- Radii: restrained 8-12px for operational cards, pill only for badges/tags.
- Minimum touch target: 44px; preferred action target: 56px.

## Components

- Top navigation and role switcher.
- Group selector: Kitchen, Care / Nurse, Helper, Maintenance.
- Status cards and KPI cards.
- Approval panel.
- AI recommendation card with evidence chips.
- Calendar and shift timeline.
- Audit and evidence summary.

## Guardrails

- Do not use consumer job-board styling.
- Do not hide approval requirements behind decorative UI.
- Do not visually merge worker earnings with client billing.
- Do not present demo data as live production data.
