# Staging release `148d1ba` rollout evidence — 2026-08-03

Status: **RUNTIME ROLLOUT VERIFIED — BROWSER E2E BLOCKED**

Environment: isolated Google Cloud staging in Toronto (`northamerica-northeast2`)

Release: `148d1ba75fe56b6df63f83683513a317e304b215`

Image publication approval: `RWOS-IMAGE-PUBLISH-2026-08-03-001`

Production access, production data, payment execution, real communications and deployment to
production were excluded.

## Immutable publication

GitHub Actions run `30844985874` published exactly eight immutable images and assembled a retained
publication manifest. The manifest records `deployed: false` because publication and deployment are
separate controlled actions.

The manifest contained one digest for each approved image:

- API;
- Employer;
- Admin;
- Worker;
- authentication limiter;
- candidate-source adapter;
- offer-delivery adapter;
- QA-reset.

## Reviewed Terraform rollout

The saved runtime plan had SHA-256:

`62c0324b5aabbfdb20a738ef606f6a87271dfccbc1ac8d01772bddb826f9c785`

Reviewed inventory: `0` additions, `10` in-place changes and `0` deletions. The changes updated the
nine existing Cloud Run service definitions and the existing migration-job definition to the
reviewed image digests and release bindings. The migration job was not executed.

After apply, a fresh remote-state plan reported **No changes**. No database, Redis, network, IAM,
DNS, secret-container, monitoring or billing resource changed.

## Runtime verification

All nine Cloud Run services reported a ready latest revision on the intended immutable digest:

- `rwos-stg-api`;
- `rwos-stg-employer`;
- `rwos-stg-admin`;
- `rwos-stg-worker`;
- `rwos-stg-worker-api` using the API image;
- `rwos-stg-auth-limiter`;
- `rwos-stg-candidate-source`;
- `rwos-stg-offer-delivery`;
- `rwos-stg-qa-reset`.

The four reviewed custom domains returned HTTPS `/health` status `200` with successful certificate
verification. API `/ready` returned `200` and dependency-aware readiness. No new migration execution
was present after the rollout. A post-rollout Cloud Run error-log query returned no error entries.

## Synthetic authentication verification

Staging-only synthetic passwords were read directly from Secret Manager into process memory. Secret
values and session tokens were not printed or committed. The exact synthetic identities used the
reserved `rwos-staging.invalid` domain.

Status-only probes passed:

- Test Employer Organization A sign-in: `200`;
- staging administrator sign-in: `200`;
- Test Employer Organization A worker sign-in: `200`;
- revoked Test Employer Organization B sign-in: generic `401`;
- authenticated Employer persisted-calendar API: `200`;
- authenticated Admin persisted-calendar API: `200`.

Temporary response and cookie files were deleted immediately after verification.

## Browser E2E limitation

The repository Playwright invocation first failed while loading the root TypeScript project
references. A temporary, non-repository Playwright configuration bypassed that loader issue, but the
local runner subsequently exceeded the expected bounded test duration and left cycling worker
processes. Those local processes were stopped. This is **not** recorded as a browser, accessibility
or end-to-end pass.

Before the release can receive browser-E2E or accessibility credit, the exact four-test authenticated
Chromium suite must complete normally and retain its result artifact for this release. Native-device
validation also remains external and incomplete.

## Verdict

The immutable image rollout, runtime health, dependency readiness and status-only synthetic
authentication checks passed for this staging release. Overall staging readiness and production
readiness remain **NOT READY** because browser/native E2E and the remaining authoritative launch
gates are not complete.
