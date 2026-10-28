# Employer invoice → Stripe TEST collection (Money-flow Phase 1)

**Status:** TEST ONLY. No real money moves. `FINANCE_LIVE_ENABLED` is untouched and stays **off**.

This is Phase 1 of the four-phase money/transaction program for JobLop (the employer app of Resident
Workforce OS). It wires the **employer side** only: taking a locked-timesheet invoice and collecting it
via a Stripe **test-mode** hosted Checkout. There is **no worker payout** in this phase (that is Phase 2).

It deliberately mirrors the one Stripe integration already proven end-to-end on the SYBNB Stripe sandbox
account: the Worker Pro (CV Pro) subscription checkout (`apps/api/src/cvProStripeCheckout.ts`).

## Hard rules

- **TEST ONLY.** `createStripeTestClient` rejects any non-`sk_test_` secret; that guard is unchanged.
- **Never** enable `FINANCE_LIVE_ENABLED`; this path never reads it. The two gates are independent.
- **No card data touches JobLop.** The employer is redirected to Stripe's hosted test page.
- Real payouts / tax remittance need CPA sign-off + PCI + money-transmitter licensing — **out of scope**.

## Gating

A new, independent flag controls the whole feature. It fail-closes at every layer.

| Gate | Where | Effect |
| --- | --- | --- |
| `INVOICE_TEST_MODE_ENABLED` (`disabled` default) | `packages/config/src/index.ts` | Feature off unless `enabled`. Refused in production. Requires `STRIPE_TEST_MODE_ENABLED=enabled`. Refused together with live finance. |
| `STRIPE_TEST_*` keys | repo-root `.env.local` | `isStripeTestConfigured()` must pass or every endpoint returns `423`. |
| `RWOS_ENV` | config `superRefine` | `INVOICE_TEST_MODE_ENABLED=enabled` is allowed only in `test`/`staging`. |

Derived config: `invoiceTestModeEnabled = rwosEnv !== "production" && INVOICE_TEST_MODE_ENABLED === "enabled" && STRIPE_TEST_MODE_ENABLED === "enabled"`.

## Flow

1. **Invoice** — a locked timesheet already produces a persisted **draft** invoice
   (`autoGenerateInvoiceForLockedTimesheet`), which an admin/finance reviewer approves and **issues**
   (invoice number assigned). Collection only applies to an *issued* invoice (`issued|sent|viewed|overdue`).
2. **Start checkout** — `POST /organizations/:orgId/invoices/:invoiceId/checkout` creates/reuses one
   `employer_invoice_checkouts` row and opens a Stripe TEST hosted Checkout Session for the invoice
   total, returning the redirect URL. (Employer BFF: `POST /api/invoices/:invoiceId/checkout`.)
3. **Pay** — the employer pays on Stripe's hosted test page (card `4242 4242 4242 4242`).
4. **Complete (verify-with-Stripe)** — `POST .../checkout/complete` **retrieves** the session from
   Stripe and confirms `payment_status === "paid"` *and* the `employerInvoiceId` metadata matches before
   transitioning the invoice to `paid` through the governed, version-guarded invoice state machine. The
   client is never trusted. Idempotent.
5. **Webhook reconcile** — `POST /payments/webhooks/stripe/employer-invoices` ingests Stripe's own
   `checkout.session.completed` / `checkout.session.async_payment_succeeded`, verifies the signature +
   test-mode, correlates via **our** metadata, requires `payment_status === "paid"`, and reconciles the
   invoice to `paid` idempotently. Duplicate/out-of-order deliveries can never reopen a settled invoice.

The invoice reaching `paid` moves **no** money — it records that Stripe (test) collected the amount and
flips the governed invoice status. The settlement amount feeds Phases 2–4 (worker payout, reconciliation,
two-channel tax) without any of those being enabled here.

## Code

- `packages/config/src/index.ts` — `INVOICE_TEST_MODE_ENABLED` flag + refinements + `invoiceTestModeEnabled`.
- `packages/database/prisma/schema.prisma` + migration `20261028000000_employer_invoice_checkout` — the
  `employer_invoice_checkouts` table (one hosted checkout per invoice; stores the session id and, on paid,
  the PaymentIntent ref — never any card data).
- `apps/api/src/employerInvoiceStripeCheckout.ts` — create + verify the Stripe TEST Checkout Session.
- `apps/api/src/employerInvoiceCollection.ts` — start / complete / reconcile orchestration + gating.
- `apps/api/src/employerInvoiceWebhook.ts` + `stripeWebhookRoute.ts` (`registerEmployerInvoiceWebhookRoute`).
- `apps/api/src/app.ts` — the two employer/finance-scoped endpoints + webhook wiring.
- `apps/employer/app/api/invoices/[invoiceId]/checkout/{route,complete/route}.ts` — employer BFF.

## Tests

- Unit: `employerInvoiceCollection.test.ts`, `employerInvoiceWebhook.test.ts` (Stripe mocked).
- Route/crypto: `employerInvoiceWebhookRoute.test.ts` (real Stripe SDK signature crypto, no network).
- Config: `packages/config/src/index.test.ts`.
- Networked REAL Stripe test round-trip: `tests/integration/postgres-employer-invoice-stripe-e2e.test.ts`
  — gated behind `RWOS_TEST_DATABASE_URL` + `STRIPE_TEST_MODE_ENABLED=enabled` +
  `RWOS_STRIPE_NETWORK_TEST_CONFIRMATION=authorized-stripe-test-mode` (skipped otherwise), same as the
  existing `postgres-close-stripe-e2e` suite.
