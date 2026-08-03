# Workstream A — Browser E2E Scope Freeze

Date: 2026-08-03

Roadmap checkpoint: `f019aef37868ce1cd2f51f4e3aefa2905a56c896`

Immutable staging release under test: `6825dd060da595fc56e9250e50457fa14c01f94a`

Foundation Validation: [run 30853465981](https://github.com/drmmashhour-ux/resident-workforce-os/actions/runs/30853465981) — **PASS** for roadmap tip

Production status: **NO-GO**

Recorded readiness: **32%**

Workstream A execution status: **BLOCKED — protected staging E2E inputs are absent**

This document freezes the first executable browser validation scope. It does not authorize
production, migration execution, provider operations, payment execution, IAM changes,
infrastructure changes, real data or a staging release change.

## 1. Environment and release inventory

| Surface  | Approved staging origin                                               | Read-only status on 2026-08-03        |
| -------- | --------------------------------------------------------------------- | ------------------------------------- |
| Employer | `https://employer.staging.sybnb.app`                                  | `/health` returned `200`              |
| Admin    | `https://admin.staging.sybnb.app`                                     | `/health` returned `200`              |
| Worker   | `https://worker.staging.sybnb.app`                                    | `/health` returned `200`              |
| API      | `https://api.staging.sybnb.app`                                       | `/health` and `/ready` returned `200` |
| QA Reset | protected Cloud Run origin supplied only through approved local input | Not called in this checkpoint         |

The web and API status checks are availability inventory only. They do not count as authenticated
browser evidence. The runtime release remains `6825dd0`; documentation commits do not promote or
replace it.

## 2. Synthetic identity and fixture inventory

Values remain in the approved secret/input mechanism and must never be copied into this document,
Git, command history, screenshots or reports.

Required identities:

- Test Employer Organization A employer user;
- Test Employer Organization A platform administrator;
- Test Employer Organization A Worker Identity;
- revoked Test Employer Organization B account;
- expired membership account;
- inactive organization account;
- wrong-role/unknown-role account;
- worker without an eligible Worker Identity.

Required deterministic records:

- distinct Tenant A and Tenant B identifiers;
- employer staffing request in Draft, Submitted, Needs Information and Approved states;
- dispatch review and candidate records owned by Tenant A;
- two Tenant A offers: one acceptable and one declineable;
- confirmed Tenant A Assignment;
- staffing/calendar records covering normal and urgent presentation;
- attendance record covering arrival, clock-in, in-progress and clock-out presentation;
- unlocked and locked timesheet fixtures;
- issued synthetic invoice, bilingual document, delivery record and eligible credit note;
- fake/local payment attempt presentation only, with live collection disabled;
- cross-organization identifiers for every supported denial path.

The QA Reset dry-run, prepare and cleanup requests must bind the exact staging project, cluster,
database, authority, namespace, manifest/checksum, release SHA, operator, caller and separate
approval references. Cleanup is mandatory even when browser assertions fail.

## 3. Protected inputs

The accepted runner requires the following categories without displaying their values:

- exact release SHA and four HTTPS origins;
- employer/admin/worker/revoked synthetic account references and passwords;
- QA Reset origin, short-lived caller credential and application credential;
- QA Reset service/operator/project/cluster/database/authority identities;
- namespace, manifest ID/checksum and dry-run/prepare/cleanup approvals;
- distinct Tenant A/B IDs;
- exact confirmation `authorized-staging-browser-e2e`.

The existing validator in `tests/e2e/e2e-environment-policy.ts` is authoritative. It rejects local
origins, incomplete release SHAs, equal tenant IDs, mutable external identities, wrong caller class,
wrong namespace and malformed manifest checksums.

## 4. Route and scenario matrix

### A1 — Employer authentication and session

- `/signin`: valid Organization A sign-in and generic invalid-credential response.
- sign-out, session expiry and direct protected-route access after expiry.
- forgot/reset password only if the synthetic email-token fixture is already approved; otherwise
  classify it as governed and do not fake success.
- `/employer/dashboard` and `/employer/calendar`: correct organization context and persisted data.

### A2 — Admin authentication and authorization

- `/signin`: valid staging administrator sign-in.
- `/calendar`, `/dispatches`, `/finance` and `/audit-log`: role-appropriate read access.
- restricted action/direct-route checks return generic denial without entity existence leakage.
- no Admin or Worker self-registration path becomes enabled.

### A3 — Worker authentication and authorization

- production-mode Worker entry signs in through the dedicated Worker API.
- only owned offers, Assignments and calendar records are visible.
- missing Worker Identity, stale offer version and wrong-role paths fail closed.
- no fixture/debug label or privileged platform data appears in the Worker surface.

### A4 — Revocation and organization isolation

- revoked Organization B sign-in returns generic `401` without revealing revocation, membership or
  account existence.
- Tenant A cannot read or mutate Tenant B workers, memberships, requests, calendars, candidates,
  dispatches, offers, delivery attempts, Assignments, attendance, timesheets, invoices, payments,
  documents or administrative records.
- Tenant B cannot read or mutate the corresponding Tenant A records.
- enumeration by replaced route ID returns the approved generic denial/not-found shape.

### A5 — Staffing request lifecycle

- Employer creates and saves a draft, edits it and submits it.
- Admin opens intake, requests information, reviews the correction and approves dispatch.
- persisted versions and safe errors are visible after each step.
- duplicate or stale submission does not create a second request or misleading success.

### A6 — Candidate, offer and Assignment lifecycle

- Admin starts candidate review, selects an eligible synthetic worker, prepares and sends a fake
  offer through the local/staging-safe adapter.
- Worker sees only the owned offer, accepts one and declines the other.
- stale-version and replay attempts fail closed.
- Admin creates the Assignment only from an accepted eligible offer.

### A7 — Scheduling and calendar

- Employer/Admin calendar requests load from durable staging APIs.
- request and Assignment details navigate without unexpected `404`.
- pagination, Back/Next, tabs, date controls and retry/error behavior are verified.
- desktop and tablet viewports have no horizontal page overflow or obscured critical controls.

### A8 — Attendance and timesheet

- show approved arrival, clock-in, in-progress and clock-out synthetic states without real location
  tracking.
- create the timesheet boundary after punch-out, review it, lock it and reject unauthorized/stale
  updates.
- cross-organization attendance/timesheet access is denied generically.

### A9 — Invoice and payment presentation

- Employer/Admin can view the durable issued invoice, bilingual PDF/document linkage, delivery
  record, balance and allowed credit-note/payment-test status.
- no button implies a real charge, card capture, email delivery, refund or provider success.
- provider-dependent or policy-governed actions remain disabled and clearly explained.
- no raw payment credential, provider token, tax identifier or secret appears in DOM, URL, trace or
  screenshot.

### A10 — Critical accessibility and dependency failure

- keyboard-only sign-in and critical journey controls; visible focus and meaningful names.
- automated axe scan on stable authenticated Employer/Admin/Worker pages.
- tablet portrait/landscape and supported desktop layouts.
- API/readiness or adapter-unavailable conditions show retryable, fail-closed states without fake
  success or information leakage.

## 5. Evidence capture requirements

For every scenario retain:

- full release SHA and immutable Cloud Run revision/image identities;
- UTC start/end, runner and browser versions, project name and viewport;
- scenario ID, synthetic actor class and Tenant A/B classification without credentials;
- pass/fail, safe response status, route template and correlation ID where available;
- Playwright trace, screenshot and video only on failure, followed by privacy review;
- axe results and keyboard/viewport results;
- QA Reset dry-run, prepare and cleanup receipt references without tokens or record contents;
- defect commit/release and rerun evidence where a correction is necessary;
- QA executor, Security reviewer and independent evidence reviewer acceptance.

Artifacts must be stored in the existing ignored E2E artifact directories until reviewed. Only
redacted, non-sensitive evidence summaries may enter Git.

## 6. Exact pass/fail criteria

Workstream A passes only when all mandatory scenarios execute against the exact immutable staging
release and:

1. supported Chromium, Firefox and WebKit projects pass with zero unexplained skips;
2. no unexpected `404`, dead control, fake success or ambiguous governed action remains;
3. every A↔B cross-organization path returns the approved generic denial/not-found behavior;
4. all authorized state transitions persist exactly once and stale/replayed operations fail;
5. no credential, token, secret, personal information or cross-organization content is captured;
6. critical keyboard paths pass and axe reports no unaccepted violations;
7. desktop/tablet layouts show no critical overflow or inaccessible control;
8. unavailable dependencies fail closed;
9. QA Reset cleanup succeeds and an independent reviewer accepts the artifact set;
10. the exact E2E commit/release Foundation Validation passes.

Any missing protected input, failed cleanup, unexpected mutation, cross-organization exposure,
credential leak, live provider call, IAM request, migration request or release mismatch is an
immediate **NO-GO** for Workstream A.

## 7. Protected files and change boundary

During evidence execution, no application, database, Terraform, IAM, migration, provider, payment
or production file may change. The existing runner/configuration and security contracts are
read-only unless a reproducible test defect is independently reviewed.

If implementation is required, changes must be limited to the approved E2E runner/specs, safe
evidence validators or a separately reviewed application defect. A defect requiring a new staging
release must be committed, validated, published and reviewed independently before E2E restarts.

Pre-existing user-owned files remain excluded.

## 8. Preflight execution result

`pnpm test:e2e:browser` stopped in the accepted input validator before browser launch or any network
mutation. All protected E2E inputs were absent from the process environment, including the release,
origins, synthetic identities, Tenant A/B IDs and QA Reset authority/approval inputs. The exact
confirmation was also absent.

This is the expected fail-closed outcome. No QA Reset request, browser sign-in, record mutation,
provider call, migration, IAM change, infrastructure change or production action occurred.

Public read-only health inventory passed, and Foundation Validation run `30853465981` passed for
the roadmap tip. Neither result substitutes for authenticated browser E2E evidence.

The full repository validation passed after rerunning with local loopback-listener permission:

- lint and typecheck passed;
- 1,185 tests passed and 13 policy/PostgreSQL tests remained intentionally skipped;
- environment, workspace-boundary and migration-integrity validation passed;
- secret scan passed;
- all production builds passed;
- public-bundle scan passed across 534 artifacts and 167 classified environment names.

The first sandboxed test attempt could not bind local loopback test servers and reported `EPERM`;
the unchanged suite was rerun with local listener permission and passed. This was an execution
environment restriction, not a product correction. No external resource or staging state changed.

## 9. Independent review decision

**Workstream A: NO-GO / BLOCKED before execution.**

Required unblock evidence:

1. QA, Security and Release owners approve the exact immutable release and scenario matrix.
2. The protected local/secret mechanism supplies all validator-required names without exposing
   values.
3. QA Reset authority, manifest, caller and dry-run/prepare/cleanup approvals are current and bound
   to the exact release.
4. Two distinct synthetic tenants and all required synthetic identities are confirmed.
5. An independent evidence reviewer is named.

Recorded readiness remains **32%**. No percentage increase is permitted until the complete browser
matrix executes, cleanup succeeds and independent review accepts the evidence.
