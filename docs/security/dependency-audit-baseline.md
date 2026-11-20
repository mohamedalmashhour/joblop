# Dependency advisory baseline

This repo enforces a **blocking** dependency-audit gate in CI
(`.github/workflows/validation.yml` → `dependency-audit` job):

```
pnpm audit --prod --audit-level=high
```

The gate fails a PR on **any HIGH or CRITICAL advisory in a production
(runtime-reachable) dependency**. A separate informational step runs the full
`pnpm audit` (all severities, including dev deps) but never blocks.

## What is baselined and why

`package.json → pnpm.auditConfig.ignoreGhsas` holds a small allowlist of GHSA
ids that the gate ignores. Everything on it is here for one of two reasons:

1. **Not in any deployed server image.** The advisory is reachable only through
   the mobile app's build/runtime chain (`apps/mobile` → `expo` / `@expo/cli` /
   `react-native` / `metro` and their transitive deps). None of these ship in
   the Render-deployed services (`api`, `employer`, `admin`, `worker`,
   `auth-limiter`, `candidate-source`, `offer-delivery`, `qa-reset`). The mobile
   app is distributed separately; its dependency hygiene is tracked on its own
   track, not through the server release gate.
2. **Pre-existing non-mobile entries** (`GHSA-w3rx-r6r6-pgpr`,
   `GHSA-5p2g-fcmc-qvqq`) that predate this baseline.

As of **2026-10-31** (commit baseline: `main` after the Next.js RCE remediation),
**zero** high/critical advisories remain in any *server-runtime* dependency —
every server-reachable one was fixed, not ignored:

| Package | Fix | Advisory class |
|---------|-----|----------------|
| `next` (admin/employer/worker) | `^15.5.22` → `^15.5.28` | Unauthenticated RCE (3×) |
| `fastify` (apps/api) | `^5.10.0` → `^5.12.7` | request body replacement |
| `fast-uri` (fastify chain) | override `3.1.5`→`3.1.9`, `4.1.2`→`4.2.3` | host confusion |
| `sharp` (next) | override `0.35.0` → `0.35.5` | libheif CVEs |
| `source-map-js` (next→postcss) | override → `1.2.2` | ReDoS/DoS |
| `mysql2` (prisma optional driver) | override → `3.24.6` | auth-plugin downgrade |
| `zod` (packages/config, validation) | `^4.0.5` → `^4.6.7` | memory exhaustion |

## Re-triage rule

Treat the allowlist as a live backlog, not a mute button:

- **Any dependency change** (lockfile churn, new package, Expo/RN upgrade) →
  re-run `pnpm audit --prod --audit-level=high`. If it fails on a *new* GHSA,
  **fix it** (upgrade / add a `pnpm.overrides` pin). Only add a GHSA to the
  allowlist after confirming it is genuinely not in a deployed server image, and
  record it here with the reason.
- When the mobile app's toolchain is upgraded, prune ids that no longer appear.
- Never add a server-runtime GHSA to the allowlist to make CI green. Fix it.
