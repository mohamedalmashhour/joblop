# Native Functional E2E Requirements

No executable native E2E runner is currently implemented. Unit tests, Expo web export, fixture
journeys, simulators and accessibility checks do not satisfy this gate.

The runner must support signed production-mode iOS and Android builds and must fail closed unless it
receives the full 40-character release SHA, immutable build identifiers, staging API origin,
secret-store account references, isolated tenant/provider records, physical device identifiers and
QA-owned reset authority.

Required journeys are authenticated calendar/offer discovery, owned offer detail, accept/decline and
stale-version conflict, owned Assignment visibility, cross-account/cross-tenant denial, session
expiry, network/dependency failure and proof that production fixture paths remain unavailable.

Retain runner/version, device/model, OS, build/SHA, UTC timestamps, privacy-reviewed screenshots or
video, safe record identifiers, pass/fail results and cleanup evidence. A named Mobile QA owner must
approve the exact runner and device matrix before execution.
