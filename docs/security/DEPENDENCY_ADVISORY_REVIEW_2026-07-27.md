# Dependency Advisory Review — 2026-07-27

Command: `pnpm audit --prod --audit-level=moderate`

## Remediation result

The initial network-backed npm advisory scan reported 23 findings: 13 high and 10 moderate.
Direct dependencies were upgraded and patched transitive versions were pinned. Next.js, Fastify,
Expo, Prisma, `fast-uri`, `find-my-way`, Sharp, PostCSS, Tar, UUID, Valibot, and their lockfile
entries were updated and validated through the repository tests and production builds.

The final scan reports one high advisory:

- `GHSA-mh99-v99m-4gvg` in `brace-expansion`;
- path:
  `expo > @expo/cli > @react-native/dev-middleware > chromium-edge-launcher > rimraf > glob > minimatch > brace-expansion`;
- the path is Expo development tooling for launching a local Chromium/Edge process. It is not
  imported by the worker application runtime or the generated static web bundle;
- Resident Workforce OS does not pass tenant, worker, employer, request, archive, or other
  untrusted values into this launcher/glob path.

## Temporary exception

Risk disposition: time-bounded build-tool exception, not a production-runtime acceptance.

Reason: forcing `brace-expansion@5.0.8` across legacy `minimatch@3` was tested and broke ESLint with
`TypeError: expand is not a function`. Shipping that override would make validation unreliable.
The compatible upstream chain currently has no patched release in Expo SDK 53.

Controls:

- the affected launcher is not installed or executed in the deployed API, admin, or employer
  server images;
- mobile production artifacts are generated in a controlled build environment with repository-owned
  patterns only;
- no runtime feature exposes filesystem glob expansion;
- the advisory scan remains a release gate, and any new runtime-path finding blocks release.

Owner: engineering/security owner must be named before deployment.

Expiry: before the next production release or 2026-08-10, whichever occurs first. Required action:
upgrade the Expo/React Native toolchain to a release that removes the legacy
`chromium-edge-launcher > rimraf > glob > minimatch` branch, rerun the scan, and remove this
exception. Security approval is external and remains required.
