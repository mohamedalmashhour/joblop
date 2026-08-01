# Native Functional E2E Requirements

An executable Maestro entry point and fail-closed input policy are implemented. Signed builds,
physical-device execution, approved staging inputs, retained artifacts, and Mobile QA approval are
still absent. Unit tests, Expo web export, fixture journeys, simulators and accessibility checks do
not satisfy this gate.

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

Run only after the approved secret store supplies all values:

```sh
RWOS_NATIVE_E2E_CONFIRMATION=authorized-staging-native-e2e \
RWOS_RELEASE_SHA='<full lowercase 40-character release SHA>' \
RWOS_NATIVE_PLATFORM='<ios-or-android>' \
RWOS_NATIVE_BUILD_ID='<provider/platform/immutable-build-id>' \
RWOS_NATIVE_DEVICE_ID='<physical-device-id>' \
RWOS_NATIVE_APP_ID='<signed-application-id>' \
RWOS_NATIVE_API_ORIGIN='<HTTPS staging API origin>' \
RWOS_NATIVE_RESET_AUTHORITY_ID='<provider/qa/immutable-reset-authority>' \
RWOS_NATIVE_RESET_ORIGIN='<HTTPS QA reset service origin>' \
RWOS_NATIVE_RESET_APP_CREDENTIAL='<server-side application credential>' \
RWOS_NATIVE_TENANT_ID='<isolated staging tenant>' \
RWOS_NATIVE_DEVICE_MODEL='<physical device manufacturer/model>' \
RWOS_NATIVE_OS_VERSION='<exact device OS version>' \
RWOS_NATIVE_ARTIFACT_DIR='<non-secret retained artifact directory>' \
RWOS_NATIVE_SIGNED_BUILD=true \
RWOS_NATIVE_PHYSICAL_DEVICE=true \
pnpm test:e2e:native
```

Worker credentials must also be injected as `RWOS_NATIVE_WORKER_EMAIL` and
`RWOS_NATIVE_WORKER_PASSWORD`, the Google identity token as `RWOS_NATIVE_RESET_TOKEN`, and the
server-side application credential as `RWOS_NATIVE_RESET_APP_CREDENTIAL`; never place them
in command history or source control. The reset service must accept authenticated `POST /v1/reset`
for `prepare` and `cleanup`. The runner writes JUnit output into the declared artifact directory.
Run once on a signed iOS build and once on a signed Android build, then validate the combined
non-secret record:

```sh
RWOS_EVIDENCE_GATE=native_e2e \
RWOS_EVIDENCE_PATH='<approved iOS and Android evidence JSON>' \
RWOS_RELEASE_SHA='<full lowercase 40-character release SHA>' \
pnpm validate:evidence
```

The record must identify both signed builds, physical devices, models, OS versions, Maestro
version, retained artifact paths, pass results, cleanup results, and named Mobile QA approval.
