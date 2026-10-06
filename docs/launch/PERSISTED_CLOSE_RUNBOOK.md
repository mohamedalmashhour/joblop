# JobLop — Persisted End-to-End Close (local, no Stripe) — Build Runbook

*Reverse-engineered from the real source. This is the exact chain to drive ONE transaction to a
persisted, settled close against a real Postgres using the LOCAL FAKE payment provider — no Stripe,
no external credentials. It is the blueprint for the `postgres-*` integration test that proves a
closed transaction exists in the DB (not just a computation).*

## Preconditions (env)
- `RWOS_TEST_DATABASE_URL=postgresql://$USER@localhost:5432/<throwaway>` — presence switches the
  `postgres-*` suites from `describe.skip` to `describe` (see `postgres-payroll.test.ts`).
- `LOCAL_PAYMENT_ENABLED=enabled` — required, or `buildApi` does NOT register the payment routes
  (`runtimeConfig.localPaymentEnabled`, config/src/index.ts:321). Without it there is no payment repo.
- The app must be built with a `localWebhookSecret` (payment routes option) to accept the settle
  webhook; the test should pass the same secret into `buildApi` options and sign with it.
- Local invoice + payment providers: `createPrismaInvoiceRepository(prisma)` and
  `createPrismaPaymentRepository(prisma, createLocalFakePaymentProvider())` wire automatically when
  `prisma` is present and `localPaymentEnabled` is true (app.ts:824–830).

## Harness (model on apps/.../tests/integration/postgres-payroll.test.ts)
1. `const prisma = createPrismaClient(RWOS_TEST_DATABASE_URL)`, `app = buildApi({...})`.
2. `POST /auth/register` to mint platform-admin / payroll / employer / worker tokens.
3. Seed an **approved/locked timesheet** via raw SQL (copy `seedApprovedTimesheet` verbatim): inserts
   `attendance_records` (status checked_out) + `timesheets` (status approved, payable_minutes set,
   version 1). Capture `{ attId, tsId, assignmentId }`.

## The close chain (HTTP, in order)
1. **Invoice** — `POST /organizations/:orgId/invoices`
   body `{ idempotencyKey, calculation }` where `calculation` =
   ```
   {
     source: { type:"locked_timesheet", organizationId, timesheetId, timesheetVersion:1,
               assignmentId, attendanceRecordId },
     occurredAt: <ISO>,
     regularLabour:      { amountMinor, currency:"CAD" },
     urgentLabour:       { amountMinor:0, currency:"CAD" },
     approvedTravelTime: { amountMinor:0, currency:"CAD" },
     mileage:            { amountMinor:0, currency:"CAD" },
     adjustments:        { amountMinor:0, currency:"CAD" },
     marketplaceFees:    { amountMinor:0, currency:"CAD" },
     lineRuleVersions: { regular_labour:"<v>", urgent_labour:"<v>", approved_travel_time:"<v>",
                         mileage:"<v>", adjustment:"<v>", marketplace_fee:"<v>" },
     paymentMethodKind: "card"        // card => 50% surcharge line added server-side
     // issuer + tax are injected server-side from PLATFORM_INVOICE_ISSUER / PLATFORM_INVOICE_TAX
   }
   ```
   Server computes the snapshot with the authoritative engine (`calculateInvoiceSnapshot`), derives
   the card surcharge itself, and returns `201 { invoice }`. Assert the persisted invoice total =
   labour + surcharge + GST + QST.
   > OPEN ITEM: the exact `lineRuleVersions` id strings and the `occurredAt` effective-dating must be
   > read from `PLATFORM_INVOICE_*` in @rwos/shared (invoice.ts) so `assertEffective` passes.
2. **Payment method** — `POST /organizations/:orgId/payment-methods/local-fake`
   `{ methodKind:"mastercard", providerCustomerReference, providerMethodReference, displayAlias }`
   → `201 { paymentMethod }` (provider boundary `local_fake`, productionReady:false).
3. **Payment attempt** — `POST /organizations/:orgId/payments`
   `{ assignmentId, timesheetId, invoiceId, paymentMethodId, policyVersion, policyMode,
      amountMinor, idempotencyKey }` → `201 { payment }`.
   > OPEN ITEM: valid `policyMode` values from `paymentPolicyMode()` (paymentRoutes.ts:253) and the
   > current `policyVersion` (PaymentPolicyVersion row / default).
4. **Settle webhook** — `POST /payments/webhooks/local-fake`
   header `x-rwos-payment-signature: <HMAC>`, body
   `{ eventId, paymentId, organizationId, expectedVersion, amountMinor, newState,
      occurredAtEpochSeconds }`.
   - `occurredAtEpochSeconds` within ±300s of now (else 401).
   - canonical = `eventId:organizationId:paymentId:expectedVersion:amountMinor:newState:occurredAtEpochSeconds`
   - signature = `validSignature(localWebhookSecret, canonical, sig)` — HMAC with the app's secret.
   - `newState` ∈ provider states (`providerState()` — read for the terminal "captured/settled" value).
   Returns `{ payment }` advanced to the settled state.
5. **Assertions (the proof):**
   - persisted `Payment` row reaches the terminal captured/settled state;
   - `Invoice` row transitions toward `paid` (status machine: issued→…→paid, invoice.ts transitions);
   - `WorkerPayout` row(s) created/disbursed;
   - money reconciles: employer-in = worker net + remittances + taxes + processor fee + platform net
     (reuse the `tests/finance` reconciliation).

## Why this can't be finished from the cloud sandbox
Driving + iterating this needs a live Postgres on the Mac (`RWOS_TEST_DATABASE_URL`); the cloud
sandbox cannot reach `localhost`. Build it as a `postgres-*` integration test and run on the Mac:
`RWOS_TEST_DATABASE_URL=… LOCAL_PAYMENT_ENABLED=enabled pnpm --filter @rwos/api test <file>`.

## Open items to resolve while building (each is a quick source read)
1. `lineRuleVersions` id strings + `occurredAt` window (PLATFORM_INVOICE_ISSUER/TAX effective dates).
2. `policyMode` enum + current `policyVersion`.
3. `providerState` terminal value for a captured/settled payment.
4. `localWebhookSecret` wiring into `buildApi` options in the test.
