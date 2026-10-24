-- Worker Pro purchase orders. Subscribe records a PENDING order with the displayed price; the charge
-- is GATED OFF (payments frozen) and no money moves. Completing (when the gate opens) marks paid and
-- grants the entitlement. Design-for-real, execution frozen.
CREATE TABLE "cv_pro_orders" (
    "id" UUID NOT NULL,
    "worker_ref" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "price_minor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "period_months" INTEGER NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'e_transfer',
    "status" TEXT NOT NULL,
    "payment_ref" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
    "paid_at" TIMESTAMPTZ(3),
    CONSTRAINT "cv_pro_orders_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "cv_pro_orders_worker_status_idx" ON "cv_pro_orders" ("worker_ref", "status");
