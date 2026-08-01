# Staging authenticated smoke evidence — 2026-08-01

Release checkpoint: `7119ed88bc561a74e51aaa4800e8e337fd7b02fa`

Environment: `resident-workforce-os-staging`, Toronto

Data boundary: synthetic Test Employer Organization A/B only

## Result

The deployed runtime, managed PostgreSQL restore path, and strict authenticated browser smoke are
**GREEN for continued synthetic staging evaluation on the Cloud Run `run.app` endpoints**. This is
not production approval and does not activate live payments, real email, real data, or public
registration.

Production and public-domain launch remain **NO-GO** until the remaining external and policy gates
listed below are closed.

## Immutable runtime inventory

| Service                   | Ready revision                      | Image digest                                                              |
| ------------------------- | ----------------------------------- | ------------------------------------------------------------------------- |
| rwos-stg-employer         | rwos-stg-employer-00003-dt2         | `sha256:75d7d3ccfaf77d70b049e1d18cab57946f2728340065e35cdd9b05bcd85d432d` |
| rwos-stg-admin            | rwos-stg-admin-00003-vbl            | `sha256:af8dc857df7304cb02aea26718106181d3ddef77a0b3b5b22d84dcaeb8f31414` |
| rwos-stg-worker           | rwos-stg-worker-00004-klt           | `sha256:756ea94cce0f9c16bb0021cb6de48a385f521e56d292531a65499f37472337e6` |
| rwos-stg-api              | rwos-stg-api-00004-tpx              | `sha256:66eb89e4665e598836b5f2305faf823ecd1295153d6d48c6e5b2631a2e560534` |
| rwos-stg-worker-api       | rwos-stg-worker-api-00004-f6r       | `sha256:66eb89e4665e598836b5f2305faf823ecd1295153d6d48c6e5b2631a2e560534` |
| rwos-stg-auth-limiter     | rwos-stg-auth-limiter-00001-sc8     | `sha256:caaba66628acc27cf9df50562f8e2670e85a1deeff30acf4812fa07e283b1a33` |
| rwos-stg-candidate-source | rwos-stg-candidate-source-00001-kpn | `sha256:5669c009a54e2f62dcf842037055d4d06c09f4a7888f20b83e2c94356e0e44f0` |
| rwos-stg-offer-delivery   | rwos-stg-offer-delivery-00001-ms9   | `sha256:545e077a07e66e1fff34230fbf434cdfc5e328317f318d60fc7e4a9625aced99` |
| rwos-stg-qa-reset         | rwos-stg-qa-reset-00003-2d9         | `sha256:e5997bdb197368b4988e0a651f683fcc6068a08f109f4011111133519a50ae3e` |

All five public health endpoints returned `200`. All four internal-service anonymous health probes
returned `403`, preserving the IAM boundary.

## Authenticated browser evidence

Playwright Chromium ran against the deployed production builds with synthetic identities. The test
requires the actual sign-in and calendar API responses; rendered page chrome cannot satisfy it.

- Employer sign-in plus persisted calendar API: PASS.
- Platform Admin sign-in plus persisted calendar API: PASS.
- Worker sign-in through the dedicated public Worker API: PASS.
- Revoked Organization B account generic `401` denial: PASS.
- Automated accessibility scan on Employer, Admin, and Worker authenticated surfaces: PASS.
- New Cloud Run HTTP `5xx` entries after the final run: zero.

The run exposed and corrected two deployment defects before becoming green:

1. Employer/Admin were misclassified as `RWOS_ENV=production`; both now use `staging`, matching the
   reviewed Terraform contract.
2. Worker browser ingress required both exact-origin CORS on Worker API and an exact HTTPS
   `connect-src` CSP allowance on Worker web. Other browser origins remain denied.

## Managed database recovery evidence

- Source: `rwos-stg-ca-tor-pg`, PostgreSQL 16, private IP, Toronto.
- Automated backups: enabled; PITR: enabled; transaction-log retention: seven days.
- On-demand backup `1785612875730`: successful.
- PITR target: `2026-08-01T22:11:58.000Z`.
- Clone operation `51e26f65-a53c-48fa-9f5a-d9ed00000048`: successful.
- Restored migration-status check: successful.
- Restored data assertions: both synthetic organizations, 49 prepared QA-owned records, and the
  complete migration set were present.
- Verification execution: `rwos-stg-pitr-verify-once-5fmt7`, successful.
- Disposable job, derived temporary secret, and clone were deleted after verification.
- Clone deletion operation `871f7cb7-6c8e-4c69-b693-830500000048`: successful.

No production or customer database was accessed.

## CI evidence

- Foundation Validation for `e094eddc8f5c57cef5768c8b84c679070f0cf673`: PASS,
  run `30721399753`.
- Foundation Validation for `7119ed88bc561a74e51aaa4800e8e337fd7b02fa`: PASS,
  run `30721858640`.
- Focused API ingress tests: 49 passed.
- Focused Worker server tests: 5 passed.
- API and Worker lint/typecheck: PASS.

## Remaining gates

- Confirm receipt/verification of the Cloud Monitoring message sent to `info@sybnb.app` and perform
  the approved incident-notification drill.
- Configure and verify staging DNS/TLS. The authorized names currently resolve through Vercel but
  do not complete TLS; `run.app` remains the only verified endpoint.
- Complete native-device evidence if native launch is in the staging acceptance scope.
- Keep Stripe test mode and synthetic external email disabled until their separate references and
  owner approvals exist.
- Resolve D1–D9 and Terms, Privacy, Québec tax, contract, retention/legal-hold, and specialist-owner
  approvals before production or governed financial activation.
- Reconcile the remaining Terraform metadata drift before the next infrastructure apply. The latest
  read-only plan proposed zero additions and zero deletions; no plan was applied.

Live Stripe, ACSS, real email, real data, production DNS, `joblop.com`, `rezekme.com`, and production
deployment remain prohibited.
