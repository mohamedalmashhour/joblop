# Stripe Test-Mode Foundation

Status: **IMPLEMENTED LOCALLY — NETWORK TESTS AND ACCOUNT ACCESS DISABLED**

The API package contains the official Stripe SDK and a provider adapter that supports:

- test-mode Customer creation;
- SetupIntent creation for card/Mastercard-first presentation and optional Canadian ACSS Debit;
- manual-capture PaymentIntent authorization and capture;
- cancellation/void and refund;
- raw-body signed webhook construction with an injected durable replay store;
- deterministic idempotency keys scoped to operation, organization, payment, and caller key;
- PaymentIntent retrieval for unknown-outcome reconciliation;
- rejection of live keys and live-mode Stripe objects;
- opaque provider references only, with no raw card or bank details persisted.

The local fake provider remains the default for deterministic offline tests. The Stripe adapter is
not connected to an API route or payment account at this checkpoint. Networked tests require the
explicit opt-in configuration and a separately approved test account.

Environment variable names:

- `STRIPE_TEST_MODE_ENABLED`
- `STRIPE_TEST_SECRET_KEY`
- `STRIPE_TEST_WEBHOOK_SECRET`
- `STRIPE_TEST_ACCOUNT_REFERENCE`
- `STRIPE_ACSS_DEBIT_ENABLED`

`STRIPE_TEST_MODE_ENABLED` defaults to `disabled` and is rejected outside `test` or `staging`.
Secrets must be injected into the API through approved secret references. Never place values in an
environment example, source file, client bundle, terminal transcript, or evidence artifact.

Before a networked staging test, owners must approve the legal merchant model, test account,
PaymentIntent/SetupIntent lifecycle, ACSS mandate text and verification flow, webhook events,
durable event storage, reconciliation ownership, refund/dispute authority, PCI scope, and retention.
No Québec card/Stripe surcharge may be introduced.
