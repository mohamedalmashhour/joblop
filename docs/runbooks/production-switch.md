# Production switch: the live API from RWOS_ENV=test to RWOS_ENV=production

Scope: the **Render API service only**. The worker, employer and admin web services keep their own
settings and are not part of this switch (see "Not in this switch" below).

Today the live API runs `RWOS_ENV=test` with `NODE_ENV=production` and `RENDER=true`. The code in
the `feat/production-readiness` change makes production mode workable:

- **Country.** A real, activatable Canada/Québec profile, selected with `RWOS_COUNTRY=canada-quebec`
  (`countries/canada/src/quebecLaunchProfile.ts`): CAD, `America/Toronto`, `+1`, EN/FR/AR, GST + QST,
  and the same Canadian address adapter the soft launch uses. Syria is unchanged (gate closed).
- **Job flow and sign-up.** The blanket production 404s are replaced by two flags,
  `RWOS_JOB_FLOW_ENABLED` and `RWOS_PUBLIC_SIGNUP_ENABLED` (`apps/api/src/productionRoutePolicy.ts`).
  Both default **ON** for Canada/Québec. They are read only when `RWOS_ENV=production`.
- **Sign-in rate limiter.** `AUTH_RATE_LIMITER_BACKEND=postgres` keeps the limiter in the API's own
  database (table `auth_rate_limit_buckets`, migration `20261113000000_auth_rate_limit_buckets`).
  No separate limiter service, no Redis.

## Before the switch (no live change)

1. Merge and deploy the change to the API while it is still on `RWOS_ENV=test`. Nothing changes for
   live: every new setting is unset, test mode never reads the new flags, and the new table is unused.
   Make sure the migration ran with the deploy (the usual
   `pnpm --filter @rwos/database exec prisma migrate deploy` step).
2. Generate the limiter key secret on your own machine and keep it out of chat and the repository:
   `openssl rand -base64 36` (48 characters).
3. Prove the planned env offline:
   - `pnpm validate:production-switch` checks the planned settings with placeholder secrets.
   - For the real settings: copy the API's env into a local file **outside the repository**, apply the
     changes below, and run `pnpm validate:production-switch -- /path/to/api.env`. It prints names and
     a summary only, never values. It must end with `PRODUCTION_SWITCH_VALIDATION_PASS`. Delete the
     file afterwards.
4. Optional rehearsal while still in test mode: set `RWOS_COUNTRY=canada-quebec` and remove
   `RWOS_COUNTRY_TEST_MODE`, deploy, and check the logs show `api.country.selected`
   `country=canada-quebec`. Timezone, currency and address behaviour are identical to `canada-test`.
   Roll this back by restoring the two settings.

## Env changes on the Render API service

Names only. Secret values come from the owner or are generated at switch time.

**Change**

| Name | From | To |
|---|---|---|
| `RWOS_ENV` | `test` | `production` |
| `RWOS_COUNTRY` | `canada-test` (check the current value) | `canada-quebec` |

**Add** (or confirm)

| Name | Value |
|---|---|
| `INTERNAL_API_ORIGIN` | the public HTTPS base URL of the API (must start with `https://`; the default `http://127.0.0.1:4100` makes startup fail in production) |
| `AUTH_RATE_LIMITER_BACKEND` | `postgres` |
| `AUTH_RATE_LIMITER_KEY_SECRET` | the generated secret (32+ characters) |
| `AUTH_RATE_LIMITER_NAMESPACE` | `rwos:authrl:production:v1` |

**Remove** (each one either crashes startup in production or is a test-only switch)

- `RWOS_COUNTRY_TEST_MODE`
- `STRIPE_TEST_MODE_ENABLED`
- `INVOICE_TEST_MODE_ENABLED`
- `PAYOUT_TEST_MODE_ENABLED`
- `LOCAL_PAYMENT_ENABLED`
- `DOCUMENT_LOCAL_UPLOAD_ENABLED`
- `ASSIGNMENT_HANDOFF_ENABLED`
- `PAYROLL_AI_EXTERNAL_ENABLED`
- `RWOS_PUBLIC_WORKER_INGRESS_ONLY`
- `RWOS_LOCAL_E2E`
- `AUTH_RATE_LIMITER_ORIGIN`, `AUTH_RATE_LIMITER_TOKEN`, `AUTH_RATE_LIMITER_KEY_ID` if present (unused
  with the Postgres limiter; a leftover `AUTH_RATE_LIMITER_NAMESPACE=rwos:authrl:test:v1` must become
  the production value above)

The `STRIPE_TEST_SECRET_KEY` / `STRIPE_TEST_WEBHOOK_SECRET` / `STRIPE_TEST_ACCOUNT_REFERENCE` values
are ignored once `STRIPE_TEST_MODE_ENABLED` is gone; removing them too is tidier.

**Leave unset** (defaults ON from the Canada/Québec profile; set to `disabled` only as a kill switch)

- `RWOS_JOB_FLOW_ENABLED`
- `RWOS_PUBLIC_SIGNUP_ENABLED`

**Check if set**

- `PASSWORD_RESET_PUBLIC_ORIGIN` must be `https://`.
- `CANDIDATE_SOURCE_ORIGIN` / `_TOKEN` and `OFFER_DELIVERY_ORIGIN` / `_TOKEN`: each pair complete and
  HTTPS, or both absent (absent is fine: Joblop's own interested workers and Brevo email are used).
- `DATABASE_URL` and `NODE_ENV=production` stay as they are.

## Order of steps

1. Steps 1 to 3 of "Before the switch" are done and the offline check passes on the real env copy.
2. Pick a quiet time. Tell staff that sign-in may refuse for a minute during the restart.
3. In one Render env edit, apply all the changes above, then save and deploy (Render restarts the API).
4. Watch the deploy logs (smoke checks below). If any check fails, roll back immediately.

## Smoke checks

1. Logs show `api.country.selected` with `country=canada-quebec`, `timezone=America/Toronto`,
   `currency=CAD`, and **not** `api.country.fail_closed_liveness_only`. Then `api.started` with
   `environment=production`.
2. `GET /ready` returns **200**. A 503 with log `api.readiness.failed dependency=auth_rate_limiter` means
   the limiter table is missing: the migration did not run.
3. `GET /health` returns 200.
4. Sign-up: create a new worker account on the worker site (phone-code sign-up) and an employer account
   on the employer site. Both succeed (no "Resource unavailable").
5. Sign-in by phone code with an existing account succeeds. Several wrong codes in a row are refused
   with "too many attempts" (the limiter works).
6. Claim: as a worker, claim an open job from the jobs calendar. It appears in My schedule.
7. Check-in and check-out on that shift (worker site or phone app) succeed.
8. Staff: in the admin console, prepare the timesheet for the finished shift, then approve and lock it
   once the worker and employer have confirmed.
9. Staff dispatch: open a dispatch and run one action (for example, shortlist) without
   "Resource unavailable".

## Rollback

Set `RWOS_ENV=test` again (and, if you changed them, restore `RWOS_COUNTRY=canada-test` and
`RWOS_COUNTRY_TEST_MODE=1`, plus any test switches you removed), then deploy. No schema or data depends
on the mode; the limiter table can stay. In test mode the API goes back to the in-memory limiter.

## What production mode still changes (by design)

- Stripe TEST invoice collection, TEST worker payouts and Worker Pro / employer plan TEST card checkout
  are off in production. Money runs through the existing manual Interac e-transfer flows;
  `FINANCE_LIVE_ENABLED` stays off until a CPA sign-off exists.
- The email sign-in code is never shown on screen (already the case with Brevo email configured).
- `scripts/grant-first-staff-admin.ts` refuses to run against production. Run any staff-admin recovery
  before the switch, or roll back to test for it.

## Routes kept blocked in production

Even with `RWOS_JOB_FLOW_ENABLED` on (see `JOB_FLOW_ROUTES_KEPT_BLOCKED` in
`apps/api/src/productionRoutePolicy.ts`):

- `POST /platform/assignments/:assignmentId/attendance-window`: no caller; the handoff moves straight
  from ready-for-attendance.
- `POST /platform/timesheets` (bare create): the admin console uses `/platform/timesheets/prepare`,
  which also completes the attendance and calculates the timesheet.
- Any future route under the job-flow groups until it is reviewed and added to `JOB_FLOW_ROUTES`.
- Test-only routes, always: `/platform/worker-payouts/:id/execute-test-payout`,
  `/organizations/:id/payment-methods/local-fake`, `/payments/webhooks/local-fake`.

## Not in this switch

The web services keep their own `RWOS_ENV`. Setting `RWOS_ENV=production` on the employer or admin site
adds route allowlists and, on the employer site, replaces self sign-up with "Request access". Review
those allowlists before any such change; it is a separate decision.
