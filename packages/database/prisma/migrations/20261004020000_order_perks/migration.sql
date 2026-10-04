-- AlterTable: optional perks note for an order (e.g. "Taxi to site provided"), shown for urgent
-- orders. Nullable, additive. Informational only — it never prices, pays, or bills.
ALTER TABLE "employer_orders" ADD COLUMN "perks" TEXT;
