# Target-Environment E2E Contract

Status: **BLOCKED — executable Playwright runner/configuration is implemented; approved staging
inputs and target-environment evidence are absent.** Repository unit/integration fixtures must
never be presented as target-environment evidence.

The runner uses Playwright with Chromium, WebKit and Firefox projects, fails closed without a full
release SHA and approved staging inputs, exercises visible sign-in surfaces, retains failure
traces/screenshots/video for privacy review, includes axe checks, and invokes the QA reset service
before and after execution. Execute it non-interactively with `pnpm test:e2e:browser`. Runner
implementation alone does not make this gate GREEN.

## Required inputs

- employer, administrator, worker, revoked, expired, inactive and cross-tenant test accounts;
- two isolated staging organizations and owned Worker Identities;
- staging employer/admin URLs and production-mode mobile API origin;
- candidate-source and delivery test records whose provider references are safe to retain;
- a reset procedure owned by QA that affects only the isolated staging tenant.

Credentials must enter through the approved test secret store, never source control or command
history.

Required variable names and validation rules are implemented in
`tests/e2e/e2e-environment-policy.ts`. `RWOS_E2E_CONFIRMATION` must equal
`authorized-staging-browser-e2e`. All origins must be remote HTTPS, tenant IDs must differ, and
`RWOS_RELEASE_SHA` must be the exact full release commit.

The approved reset service must implement authenticated `POST /v1/reset`. The runner sends only the
action (`prepare` or `cleanup`), the two isolated tenant IDs, release SHA, and confirmation. Any
non-success response aborts the run. The token is read from the secret store and is never emitted.

## Employer journey

Sign in, select organization, create and save a request, edit it, submit it, receive a correction
request, correct and resubmit, then verify staffing progress and confirmed Assignment visibility.

## Administrator journey

Sign in, open intake, review the request, request information, approve for dispatch, start candidate
review, select a candidate, create/approve/send an offer, observe the worker response, and create the
Assignment. Verify every version and audit-safe error boundary.

## Worker journey

Sign in, list only owned offers, read terms, accept one offer, decline another, submit a stale
version, and verify only owned Assignments are visible.

## Security journey

Prove generic denial or not-found behavior for cross-tenant identifiers, revoked and expired
memberships, inactive organizations, unknown roles, missing Worker Identity, blocked direct URLs,
and identifier enumeration. Retain response codes and correlation IDs, not secrets or personal
data.

## Acceptance

Run on the exact release commit against real staging services and PostgreSQL. Retain runner/browser
versions, timestamps, screenshots/traces with privacy review, seeded-record identifiers, pass/fail
results, and cleanup evidence. Any fixture repository, local mock, or unsigned session invalidates
the run.
