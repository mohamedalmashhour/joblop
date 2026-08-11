-- AlterTable: normalized worksite location on residences
ALTER TABLE "residences"
    ADD COLUMN "province" CHAR(2),
    ADD COLUMN "postal_code" TEXT,
    ADD COLUMN "address_line1" TEXT,
    ADD COLUMN "address_line2" TEXT,
    ADD COLUMN "latitude" DOUBLE PRECISION,
    ADD COLUMN "longitude" DOUBLE PRECISION,
    ADD COLUMN "geocode_precision" TEXT,
    ADD COLUMN "geocode_provider" TEXT,
    ADD COLUMN "geocode_provider_ref" TEXT,
    ADD COLUMN "geocode_resolved_at" TIMESTAMPTZ(3);

-- CreateIndex: bounding-box pre-filter + province filter
CREATE INDEX "residences_latitude_longitude_idx" ON "residences"("latitude", "longitude");
CREATE INDEX "residences_province_idx" ON "residences"("province");
