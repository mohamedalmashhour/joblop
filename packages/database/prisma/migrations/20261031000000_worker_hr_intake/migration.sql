-- Seeded #5: worker-editable HR intake (personal + driving licence + vehicle/transport).
-- Distinct from hr_profiles (HR-authority standing) and hr_credentials/hr_documents (governed
-- pointers). All fields nullable; an incomplete intake must not block offers. Certificate files are
-- NOT stored here (they remain hr_documents / uploaded_documents pointers). Country-neutral: no
-- province/licence lists are encoded in the schema.
-- NOTE: drafted to match the repo migration conventions; regenerate/verify with `prisma migrate`
-- (prisma migrate diff) in a build environment before merge.
CREATE TABLE "worker_hr_intakes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "worker_identity_id" UUID NOT NULL,
    "legal_first_name" TEXT,
    "legal_last_name" TEXT,
    "phone" TEXT,
    "address_line" TEXT,
    "city" TEXT,
    "province" TEXT,
    "postal_code" TEXT,
    "has_driving_licence" BOOLEAN NOT NULL DEFAULT false,
    "licence_class" TEXT,
    "licence_expiry" DATE,
    "has_vehicle" BOOLEAN NOT NULL DEFAULT false,
    "vehicle_type" TEXT,
    "can_travel_km" INTEGER,
    "transport_notes" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "worker_hr_intakes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "worker_hr_intakes_worker_identity_id_key" ON "worker_hr_intakes" ("worker_identity_id");

ALTER TABLE "worker_hr_intakes" ADD CONSTRAINT "worker_hr_intakes_worker_identity_id_fkey" FOREIGN KEY ("worker_identity_id") REFERENCES "worker_identities" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
