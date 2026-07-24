# Resident Job Design System

Status: Approved design-system baseline
Version: RJDS v1.0
Architecture reference: Resident Job Architecture Freeze v1.0
Implementation status: Reference only; production changes require page-level implementation approval

## Purpose

The Resident Job Design System (RJDS) defines the permanent product UI standard for Resident Job. It turns the approved architecture, wireframes, UX Foundation, and implementation governance into reusable design rules for future product work.

RJDS is not a redesign of approved pages. It is the source of truth for implementing and extending approved screens without inventing new visual, interaction, accessibility, privacy, security, or AI patterns.

## Document Set

- [RESIDENT_JOB_DESIGN_SYSTEM_V1_0.md](./RESIDENT_JOB_DESIGN_SYSTEM_V1_0.md) - master design-system standard.
- [RJDS_DESIGN_TOKENS_AND_RESPONSIVE_RULES_V1_0.md](./RJDS_DESIGN_TOKENS_AND_RESPONSIVE_RULES_V1_0.md) - color, spacing, typography, layout, density, and responsive rules.
- [RJDS_COMPONENT_SPECIFICATIONS_V1_0.md](./RJDS_COMPONENT_SPECIFICATIONS_V1_0.md) - reusable component families, states, accessibility, and usage boundaries.
- [RJDS_DASHBOARD_AND_PAGE_TEMPLATES_V1_0.md](./RJDS_DASHBOARD_AND_PAGE_TEMPLATES_V1_0.md) - page templates for public, worker, employer, admin, financial, policy, AI, messaging, and support surfaces.
- [RJDS_CODEX_IMPLEMENTATION_CONTRACT_V1_0.md](./RJDS_CODEX_IMPLEMENTATION_CONTRACT_V1_0.md) - binding implementation rules for Codex and future contributors.

## Authority Order

When implementing Resident Job UI, apply documents in this order:

1. Architecture Freeze v1.0
2. Approved page wireframe and approval record
3. UX Foundation
4. RJDS v1.0
5. Existing implementation patterns

If documents conflict, stop and request owner direction. Do not silently reconcile frozen artifacts.

## Core Rule

No new UI pattern, component category, state model, visual language, AI behavior, privacy disclosure, financial treatment, or operational workflow may be invented during implementation without an approved governance update or Architecture Change Request.
