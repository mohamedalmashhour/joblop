# Capsule catalog

Capsules are **isolated, named, reusable feature units**. A finished section becomes a
capsule with a clear public surface and minimal coupling, so the **next platform is
assembled by collecting capsules** rather than rewriting.

Portable logic lives in `packages/shared` (framework-agnostic); the platform-specific
wiring (HTTP endpoints, BFF routes, UI) is thin adapter code at the edges. To lift a
capsule into a new platform you copy the core and re-write only the adapters.

## Capsules in this platform (RESIDENT JOB / JobLop)

| Capsule | What it is | Core (portable) | Adapters (per-platform) |
|---|---|---|---|
| **Contract Capsule** | Employer↔platform contract + per-role rate card; requests read the **governed** pay rate (never invent one). See [CONTRACT_CAPSULE.md](./CONTRACT_CAPSULE.md). | `packages/shared` pricing domain + `packages/auth` service; two DB models | API endpoints, request-context BFF, create-request UI |
| **Map Capsule** | Free OpenStreetMap location map (no API key, no billing). | `apps/*/app/shared/maps/` (self-describing) | import-path change per app; native equivalent for React Native |

## Related capsules in sibling platforms

- **Email-OTP Capsule** (`EmailOtpCapsule`) — reusable email one-time-code verification, from the SYBNB platform. Same isolation intent; lift into any platform needing email OTP.

## Adding a capsule

When a section is finished: give it a capsule name, keep its portable core in
`packages/shared` (or a self-contained folder), document its **public surface**,
**dependencies**, and **lift instructions** in a `*_CAPSULE.md`, and add a row here.
