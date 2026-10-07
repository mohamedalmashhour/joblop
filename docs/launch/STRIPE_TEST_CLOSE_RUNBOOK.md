# JobLop — Real-Provider (Stripe test-mode) Close — Execute-on-Keys Runbook

*Item #2. The local-fake persisted close is green (`tests/integration/postgres-close-e2e`). This is the
exact path to prove the SAME close through the real Stripe test API. Everything here is build-ready;
the only thing missing is the keys, which gate build-and-iterate (as the local close did).*

## What already exists (no new foundation needed)
- `apps/api/src/stripeTestProvider.ts` — `createStripeTestClient(env)` + `createStripeTestPaymentProvider(...)`:
  authorize (PaymentIntent, `capture_method: "manual"`), capture (`paymentIntents.capture`), refund.
  Rejects any live-mode object (`assertTestObject`) — test-mode only, fail-closed.
- `apps/api/src/stripeTestProvider.network.test.ts` — proves the provider primitives against real
  Stripe test (createCustomer, authorize a Mastercard test method). Skips unless authorized (below).
- `buildApi` accepts `options.paymentRepository`, so the Stripe provider swaps straight into the repo:
  `createPrismaPaymentRepository(prisma, createStripeTestPaymentProvider({ client, webhookSecret, replayStore }))`.

## Keys + env (you provide; never commit)
```
STRIPE_TEST_MODE_ENABLED=enabled
STRIPE_TEST_SECRET_KEY=sk_test_...
STRIPE_TEST_WEBHOOK_SECRET=whsec_...
STRIPE_TEST_ACCOUNT_REFERENCE=acct_...        # the test connected account / platform ref
RWOS_STRIPE_NETWORK_TEST_CONFIRMATION=authorized-stripe-test-mode
```
Validate first: `pnpm test:stripe:network` (runs the existing provider boundary test) — green here
means the keys + account are good before we touch the full close.

## The Stripe close test (mirror of postgres-close-e2e, provider swapped)
New gated suite `tests/integration/postgres-close-stripe-e2e.test.ts`:
1. Gate: `RWOS_TEST_DATABASE_URL` && `STRIPE_TEST_MODE_ENABLED==="enabled"` &&
   `RWOS_STRIPE_NETWORK_TEST_CONFIRMATION==="authorized-stripe-test-mode"` (else `describe.skip`).
2. `buildApi({ countryCurrency:"CAD", env:{...,RWOS_ENV:"local"},
   resolveAuthorizationRoles: () => ["PLATFORM_ADMINISTRATOR"],
   localPaymentWebhookSecret: <32+ chars>,
   paymentRepository: createPrismaPaymentRepository(prisma,
     createStripeTestPaymentProvider({ client: createStripeTestClient({...STRIPE_TEST_*}),
       webhookSecret: STRIPE_TEST_WEBHOOK_SECRET, replayStore })) })`.
3. Reuse the exact beforeAll from the local close (WorkGroup/RoleDefinition, governed
   accepted-offer→assignment, locked timesheet).
4. Invoice (identical to local close) → issue in DB (invoice_number + issued_at).
5. **Payment method — DIVERGES from local-fake.** There is no `/payment-methods/local-fake` for
   Stripe. Register via the provider's customer + setup-intent path (provider.createCustomer +
   setupIntents), or the Stripe payment-method route if present, to get a reusable method id.
   *(This is the one spot to resolve against the live keys — it surfaces as a clear error, exactly
   like the local close's iteration items did.)*
6. Payment attempt → `authorize` (Stripe manual capture) → `capture`. Terminal state `succeeded`;
   assert `allocatedMinor === invoiceTotalMinor` (money tie-out), same as the local close.
7. Stripe may finalize capture via a webhook rather than synchronously — if so, drive the recovery
   path / `processProviderEvent` with the Stripe event (the provider returns `webhookExpected`).

## Expected iteration (same shape as the local close)
Two likely spots need one run each against the keys to nail: (A) Stripe payment-method registration,
(B) whether capture settles synchronously or needs the webhook event. Both show as explicit errors,
not guesswork — paste them and the loop closes fast.

## Done = 
`pnpm test tests/integration/postgres-close-stripe-e2e.test.ts` green: a real Stripe test-mode
capture, persisted, tied to the issued invoice. That turns Workstream D fully green.

## Deployed-stack activation (server.ts composition root) — verified gap

*Verified against the code this session. The section above wires Stripe into `buildApi` for the
**close test**. The **running API** (the deployed Mac/Docker stack) is wired separately and does NOT
yet select Stripe from env alone — setting `STRIPE_TEST_*` in `deploy/.env` is currently inert until
the wiring below is added. Safety is unaffected: `validateStripeTestEnvironment` already rejects any
non-`sk_test_` / `sk_live_` key (proven), so nothing can go live by accident.*

What the code does today:
- `apps/api/src/app.ts` (~L918): `paymentRepository = options.paymentRepository ?? (localPaymentEnabled
  ? createPrismaPaymentRepository(prisma, createLocalFakePaymentProvider()) : null)`. In **staging**
  `LOCAL_PAYMENT_ENABLED` is off (only allowed in local/test), so the default is `null`.
- Payment routes mount only when `paymentRepository && localPaymentWebhookSecret` (~L954).
- The Stripe webhook route mounts only when `options.stripeWebhookRecovery` is injected (~L986).
- `apps/api/src/server.ts` calls `buildApi({ countryTimezone, countryCurrency, countryAddress })` —
  it passes **none** of `paymentRepository`, `localPaymentWebhookSecret`, or `stripeWebhookRecovery`.

To light up Stripe test mode on the deployed stack (do this WITH the test keys so the close test
validates it end-to-end in the same pass — build-and-iterate, like the local close):
1. In `app.ts`, extend the `paymentRepository` default: when `runtimeConfig.stripeTestModeEnabled`
   and `validateStripeTestEnvironment({enabled, secretKey, webhookSecret, accountReference})` passes
   and `prisma` is present, build
   `createPrismaPaymentRepository(prisma, createStripeTestPaymentProvider({ client:
   createStripeTestClient(env), webhookSecret: env.webhookSecret, replayStore }))` where `replayStore`
   is a Prisma-backed `StripeWebhookReplayStore` (idempotent `recordOnce`).
2. Enable the payment routes in staging: when Stripe test mode is on, pass the Stripe webhook secret
   as the route-enable gate (the `localPaymentWebhookSecret` param name is just the route-mount gate;
   the local webhook route it also registers is unused under Stripe and can be left or gated off).
3. Inject `stripeWebhookRecovery` (built from the same client + replay store) so
   `registerStripeWebhookRoute` mounts and Stripe can finalize captures asynchronously.
4. Keep it fail-closed: the entire branch is guarded by `stripeTestModeEnabled` + the key validator,
   so with no keys the stack behaves exactly as today (no payment provider in staging).

Verification once keys are set: `pnpm test:stripe:network` (provider boundary) → then the gated
close test above → then a smoke on the running stack (invoice → authorize → capture → webhook).
