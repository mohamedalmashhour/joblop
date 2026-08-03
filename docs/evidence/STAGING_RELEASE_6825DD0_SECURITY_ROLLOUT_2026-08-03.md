# Staging release `6825dd0` security rollout evidence — 2026-08-03

Status: **SECURITY-PATCHED RUNTIME ROLLOUT VERIFIED — OVERALL LAUNCH NOT READY**

Environment: isolated Google Cloud staging in Toronto (`northamerica-northeast2`)

Release: `6825dd060da595fc56e9250e50457fa14c01f94a`

Image publication approval: `RWOS-IMAGE-PUBLISH-2026-08-03-002`

Production access, production data, payment execution, real communications and production
deployment were excluded.

## Security and publication evidence

The release updates the two supported `fast-uri` override lines to the patched `3.1.5` and `4.1.2`
versions. Local full and production dependency audits reported zero known vulnerabilities. GitHub
Foundation Validation run `30851184940` passed the repository validation, dependency audit,
container definition checks, Terraform checks and eight container runtime probes.

GitHub publication run `30851647060` published exactly eight immutable images and assembled the
retained publication manifest for this release. The manifest records `deployed: false` because
publication and runtime rollout remain separate controlled actions.

## Reviewed Terraform rollout

The saved runtime plan had SHA-256:

`4d6ae9775e8fad89b18318d61dbe29f035b77028cb5950998c8b11b37e5b20e0`

Reviewed inventory: `0` additions, `10` in-place changes and `0` deletions. The changes were limited
to the nine existing Cloud Run service definitions, the existing migration-job definition, four
service release-SHA bindings and the image-publication approval reference. The migration job was
not executed.

After apply, a fresh remote-state plan reported **No changes**. No database, Redis, network, IAM,
DNS, secret container, monitoring or billing resource changed.

## Runtime verification

All nine Cloud Run services reported ready latest revisions on the reviewed immutable digests:

- `rwos-stg-api`;
- `rwos-stg-employer`;
- `rwos-stg-admin`;
- `rwos-stg-worker`;
- `rwos-stg-worker-api` using the API image;
- `rwos-stg-auth-limiter`;
- `rwos-stg-candidate-source`;
- `rwos-stg-offer-delivery`;
- `rwos-stg-qa-reset`.

The Employer, Admin, Worker and API custom-domain `/health` endpoints returned HTTPS status `200`
with successful certificate verification. API `/ready` returned `200`. A post-rollout Cloud Run
error-log query returned no error entries.

The migration execution list remained unchanged, with its latest execution dated 2026-08-02. The
2026-08-03 rollout updated only the job definition and did not execute a migration.

## Synthetic authentication verification

Existing staging-only synthetic passwords were read directly from Secret Manager into process
memory. Secret values and session tokens were not printed, written to repository files or retained.

Status-only probes passed:

- Test Employer Organization A sign-in: `200`;
- staging administrator sign-in: `200`;
- Test Employer Organization A worker sign-in through the dedicated Worker API: `200`;
- revoked Test Employer Organization B sign-in: generic `401`.

The first worker probe was incorrectly sent to the static Worker web server and returned method not
allowed. The corrected probe used the configured dedicated Worker API origin and passed. This was a
probe-target correction, not a runtime failure.

## Remaining evidence boundary

This rollout does not add browser, accessibility or native-device E2E credit. Those gates retain
their previously recorded status and require release-bound result artifacts. Legal/privacy,
operational drill, external-provider and other authoritative launch gates also remain separate.

## Verdict

The security-patched release is published, deployed to isolated staging, ready on all nine Cloud Run
services, dependency-ready and synthetically authentication-verified. Staging completion and
production launch remain **NOT READY** until all mandatory launch gates are independently satisfied.
