-- Phase 2b of the two-channel pay design: a contractor's GST/QST registration. Mutable, independent
-- of the immutable signed classification election. Additive only; no existing data changed.
CREATE TABLE "worker_tax_profiles" (
    "worker_identity_id" UUID NOT NULL,
    "gst_qst_registered" BOOLEAN NOT NULL DEFAULT false,
    "gst_number" TEXT,
    "qst_number" TEXT,
    "updated_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
    CONSTRAINT "worker_tax_profiles_pkey" PRIMARY KEY ("worker_identity_id")
);

ALTER TABLE "worker_tax_profiles"
    ADD CONSTRAINT "wtp_worker_fk" FOREIGN KEY ("worker_identity_id") REFERENCES "worker_identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
