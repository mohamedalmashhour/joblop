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
