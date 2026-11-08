-- Long-term job listings (paid in advance, Indeed model). Additive only: two new tables, two nullable
-- once-per-organization markers on employer_organizations (free trial used / 50%-off first month
-- used) and four nullable GST/QST breakdown columns on employer_plan_orders. Gated behind
-- EMPLOYER_PLANS_ENABLED (default off); with the flag off nothing reads or writes these tables or
-- columns and every worker job query is unchanged. The retired long-term plan rows/columns
-- (contract_plus / pay_per_contract) are left in place and simply no longer used.
-- AlterTable
ALTER TABLE "employer_organizations" ADD COLUMN     "job_listing_first_month_used_at" TIMESTAMPTZ(3),
ADD COLUMN     "job_listing_trial_used_at" TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "employer_plan_orders" ADD COLUMN     "gst_minor" INTEGER,
ADD COLUMN     "qst_minor" INTEGER,
ADD COLUMN     "subtotal_minor" INTEGER,
ADD COLUMN     "total_minor" INTEGER;

-- CreateTable
CREATE TABLE "job_listings" (
    "id" UUID NOT NULL,
    "job_request_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "trial_ends_at" TIMESTAMPTZ(3),
    "listed_until" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "job_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_listing_orders" (
    "id" UUID NOT NULL,
    "job_listing_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "months" INTEGER NOT NULL DEFAULT 1,
    "subtotal_minor" INTEGER NOT NULL,
    "gst_minor" INTEGER NOT NULL,
    "qst_minor" INTEGER NOT NULL,
    "total_minor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "discount_kind" TEXT NOT NULL DEFAULT 'none',
    "method" TEXT NOT NULL DEFAULT 'e_transfer',
    "status" TEXT NOT NULL,
    "payment_ref" TEXT,
    "paid_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "job_listing_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "job_listings_job_request_id_key" ON "job_listings"("job_request_id");

-- CreateIndex
CREATE INDEX "job_listings_organization_idx" ON "job_listings"("organization_id");

-- CreateIndex
CREATE INDEX "job_listings_listed_until_idx" ON "job_listings"("listed_until");

-- CreateIndex
CREATE INDEX "job_listing_orders_listing_status_idx" ON "job_listing_orders"("job_listing_id", "status");

-- CreateIndex
CREATE INDEX "job_listing_orders_org_status_idx" ON "job_listing_orders"("organization_id", "status");

-- CreateIndex
CREATE INDEX "job_listing_orders_status_created_idx" ON "job_listing_orders"("status", "created_at");

-- AddForeignKey
ALTER TABLE "job_listings" ADD CONSTRAINT "job_listings_job_request_id_fkey" FOREIGN KEY ("job_request_id") REFERENCES "job_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_listings" ADD CONSTRAINT "job_listings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "employer_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_listing_orders" ADD CONSTRAINT "job_listing_orders_job_listing_id_fkey" FOREIGN KEY ("job_listing_id") REFERENCES "job_listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_listing_orders" ADD CONSTRAINT "job_listing_orders_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "employer_organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

