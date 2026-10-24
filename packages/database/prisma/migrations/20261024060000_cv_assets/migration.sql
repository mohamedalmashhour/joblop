-- JobScanner CV builder: worker CV attachments (certificates + optional photo). Worker-owned, referenced
-- on the CV. Bytes stored inline (small, type/size-validated). Distinct from the HR compliance document
-- store. No money, no governance workflow.
CREATE TABLE "cv_assets" (
    "id" UUID NOT NULL,
    "worker_ref" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "label" TEXT,
    "filename" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
    CONSTRAINT "cv_assets_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "cv_assets_worker_ref_idx" ON "cv_assets" ("worker_ref");
