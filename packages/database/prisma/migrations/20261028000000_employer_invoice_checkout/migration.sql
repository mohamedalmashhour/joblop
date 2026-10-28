-- Money-flow Phase 1 — employer invoice → Stripe TEST collection. One hosted Checkout per issued
-- invoice, mirroring cv_pro_orders. Persists the Stripe Checkout Session id and, on paid, the
-- PaymentIntent reference. TEST ONLY (INVOICE_TEST_MODE_ENABLED + STRIPE_TEST_*); FINANCE_LIVE stays
-- off and no money is moved by this table. No card data is ever stored here.
CREATE TABLE "employer_invoice_checkouts" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "amount_minor" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'CAD',
    "method" TEXT NOT NULL DEFAULT 'stripe',
    "status" TEXT NOT NULL,
    "checkout_session_id" TEXT,
    "payment_ref" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
    "paid_at" TIMESTAMPTZ(3),
    CONSTRAINT "employer_invoice_checkouts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "employer_invoice_checkouts_org_invoice_key" ON "employer_invoice_checkouts" ("organization_id", "invoice_id");
CREATE INDEX "employer_invoice_checkouts_org_status_idx" ON "employer_invoice_checkouts" ("organization_id", "status");

ALTER TABLE "employer_invoice_checkouts"
    ADD CONSTRAINT "employer_invoice_checkouts_invoice_id_organization_id_fkey"
    FOREIGN KEY ("invoice_id", "organization_id") REFERENCES "invoices" ("id", "organization_id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
