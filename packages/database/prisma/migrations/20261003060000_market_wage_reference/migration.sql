-- CreateTable: market_wage_references — admin-maintained indicative market hourly rate per role per
-- province, shown to employers beside their own contract rate. Reference data only: it never feeds
-- pricing, payroll or invoices.
CREATE TABLE "market_wage_references" (
    "id" UUID NOT NULL,
    "role_definition_id" UUID NOT NULL,
    "province" TEXT NOT NULL,
    "median_hourly_rate_minor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "source" TEXT,
    "effective_from" TIMESTAMPTZ(3),
    "updated_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "market_wage_references_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "market_wage_references_role_province_key" ON "market_wage_references"("role_definition_id", "province");

-- CreateIndex
CREATE INDEX "market_wage_references_province_idx" ON "market_wage_references"("province");

-- AddForeignKey
ALTER TABLE "market_wage_references" ADD CONSTRAINT "market_wage_references_role_definition_id_fkey" FOREIGN KEY ("role_definition_id") REFERENCES "role_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
