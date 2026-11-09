-- Step 3 payments: GST/QST receipts for paid plan and listing orders (own RCPT-YYYY-NNNNNN sequence),
-- short Interac references, claim/cancel/confirm details for staff, and renewal-reminder markers.
-- Additive only: new nullable columns and two new tables. Nothing is dropped or rewritten.
-- AlterTable
ALTER TABLE "employer_plans" ADD COLUMN     "reminder1_sent_for" TIMESTAMPTZ(3),
ADD COLUMN     "reminder7_sent_for" TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "employer_plan_orders" ADD COLUMN     "amount_received_minor" INTEGER,
ADD COLUMN     "cancel_reason" TEXT,
ADD COLUMN     "canceled_at" TIMESTAMPTZ(3),
ADD COLUMN     "claimed_at" TIMESTAMPTZ(3),
ADD COLUMN     "short_ref" TEXT,
ADD COLUMN     "staff_note" TEXT;

-- AlterTable
ALTER TABLE "job_listings" ADD COLUMN     "reminder1_sent_for" TIMESTAMPTZ(3),
ADD COLUMN     "reminder7_sent_for" TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "job_listing_orders" ADD COLUMN     "amount_received_minor" INTEGER,
ADD COLUMN     "cancel_reason" TEXT,
ADD COLUMN     "canceled_at" TIMESTAMPTZ(3),
ADD COLUMN     "claimed_at" TIMESTAMPTZ(3),
ADD COLUMN     "short_ref" TEXT,
ADD COLUMN     "staff_note" TEXT;

-- CreateTable
CREATE TABLE "payment_receipts" (
    "id" UUID NOT NULL,
    "receipt_number" TEXT NOT NULL,
    "organization_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "employer_plan_order_id" UUID,
    "job_listing_order_id" UUID,
    "item_code" TEXT NOT NULL,
    "item_label" TEXT NOT NULL,
    "discount_kind" TEXT NOT NULL DEFAULT 'none',
    "period_start" TIMESTAMPTZ(3) NOT NULL,
    "period_end" TIMESTAMPTZ(3) NOT NULL,
    "subtotal_minor" INTEGER NOT NULL,
    "gst_minor" INTEGER NOT NULL,
    "qst_minor" INTEGER NOT NULL,
    "total_minor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "payment_method" TEXT NOT NULL,
    "payment_ref" TEXT,
    "paid_at" TIMESTAMPTZ(3) NOT NULL,
    "billed_to_name" TEXT NOT NULL,
    "billed_to_legal_name" TEXT,
    "issuer_legal_name" TEXT NOT NULL,
    "issuer_address" TEXT NOT NULL,
    "issuer_gst_number" TEXT NOT NULL,
    "issuer_qst_number" TEXT NOT NULL,
    "emailed_at" TIMESTAMPTZ(3),
    "email_status" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_receipt_sequences" (
    "scope_year" INTEGER NOT NULL,
    "last_value" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "payment_receipt_sequences_pkey" PRIMARY KEY ("scope_year")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_receipts_receipt_number_key" ON "payment_receipts"("receipt_number");

-- CreateIndex
CREATE UNIQUE INDEX "payment_receipts_employer_plan_order_key" ON "payment_receipts"("employer_plan_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_receipts_job_listing_order_key" ON "payment_receipts"("job_listing_order_id");

-- CreateIndex
CREATE INDEX "payment_receipts_org_paid_idx" ON "payment_receipts"("organization_id", "paid_at");

-- CreateIndex
CREATE UNIQUE INDEX "employer_plan_orders_short_ref_key" ON "employer_plan_orders"("short_ref");

-- CreateIndex
CREATE UNIQUE INDEX "job_listing_orders_short_ref_key" ON "job_listing_orders"("short_ref");

-- AddForeignKey
ALTER TABLE "payment_receipts" ADD CONSTRAINT "payment_receipts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "employer_organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_receipts" ADD CONSTRAINT "payment_receipts_employer_plan_order_id_fkey" FOREIGN KEY ("employer_plan_order_id") REFERENCES "employer_plan_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_receipts" ADD CONSTRAINT "payment_receipts_job_listing_order_id_fkey" FOREIGN KEY ("job_listing_order_id") REFERENCES "job_listing_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

