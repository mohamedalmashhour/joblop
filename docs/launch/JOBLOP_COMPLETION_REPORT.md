# JobLop — Completion Report (no-credential runway)

*What is DONE and PROVEN vs what is externally gated. This is the honest "100% of what code can
reach without provider keys, counsel, or infra" record. Pairs with the live Launch Readiness Tracker.*

## Proven (re-runnable evidence)
| Area | Proof | Command |
|------|-------|---------|
| Money close — engine | 6 scenarios (clean / short / no-show / dispute / refund / partial-capture) all reconcile to **$0.00** on the real `@rwos/shared` engine | `pnpm test tests/finance` |
| Money close — persisted DB | invoice → payment → **capture settles `succeeded`**, captured amount == issued invoice, then **full refund → `refunded`** (5/5) | `pnpm test tests/integration/postgres-close-e2e.test.ts` (RWOS_TEST_DATABASE_URL + LOCAL_PAYMENT_ENABLED=enabled) |
| Dispute hold/release — persisted DB | dispute **PAUSES** payout (`held`, reason `dispute`), duplicate refused (409), withdraw **RELEASES** to `pending` (4/4) | `pnpm test tests/integration/postgres-dispute-hold.test.ts` (RWOS_TEST_DATABASE_URL) |
| Lifecycle — persisted DB | dispatch → offer → assignment against real Postgres | `pnpm test tests/integration/postgres-interest-e2e.test.ts` |
| Country activation | synthetic `canada-test` activates in local/test (CAD + America/Toronto injected), fail-closed elsewhere | `RWOS_COUNTRY_TEST_MODE=1 RWOS_COUNTRY=canada-test` boot |
| Typecheck | `apps/api` + `apps/admin` zero errors with all additions | `tsc --noEmit` per app |

## Built this session (committed, in PR #22)
- **Transaction Control Room** + per-transaction **audit report** (printable), party-scoped **worker/client** report views.
- **Signed share links** — HMAC, fail-closed secret, expiry, per-link revocation (jti denylist), mint audit log; `/s/{token}` public page verifies server-side, no data fetch. Security review: `docs/launch/SHARE_LINKS_SECURITY_REVIEW.md`.
- **Live indexes** — Transactions index on the Control Room landing; real Dispatch-reviews index (was a stub).
- **Prod hardening** — `/control-room` auth-gated in production middleware; added to the route allowlist.
- **Local stack** now boots with the fake payment provider on, so the full capture/close is clickable in the running apps.
- Both apps' lifecycle UIs confirmed real (admin dispatch→offer→assignment ~1,400 lines; worker offers/accept, schedule check-in/out, pay).

## Externally gated — NOT closable by code (by design: fail-closed)
| Gate | Owner | Unblocks |
|------|-------|----------|
| **Stripe test keys** (`STRIPE_TEST_SECRET_KEY`, `STRIPE_TEST_WEBHOOK_SECRET`, …) | YOU / provider | the real-provider persisted close (`docs/launch/STRIPE_TEST_CLOSE_RUNBOOK.md`) — then Workstream D is fully green |
| Google Maps + SMS keys | YOU / provider | live worker search + offer delivery |
| Counsel's finalized legal + privacy versions | COUNSEL | opening a real country activation gate |
| GCP / CI / managed Postgres / deploy target | YOU | staging/production deploy + CI validation |

## The one next unlock
Drop Stripe **test** keys in the env, run `pnpm test:stripe:network` to confirm them, and say go — the
real-provider close test gets written from the runbook and closed out in a couple of runs, exactly like
the local one. Everything else above is already done and re-runnable.
