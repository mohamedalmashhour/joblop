-- Dynamic offer engine P3: the learning loop's model store. Each retrain fits on the whole
-- offer/outcome history and appends a version; one active per model type. Additive; no money flows.
CREATE TABLE "matching_model_versions" (
    "id" UUID NOT NULL,
    "model_type" TEXT NOT NULL,
    "weights" JSONB NOT NULL,
    "feature_dim" INTEGER NOT NULL,
    "sample_size" INTEGER NOT NULL,
    "log_loss" DOUBLE PRECISION NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "trained_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
    CONSTRAINT "matching_model_versions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "mmv_type_active_idx" ON "matching_model_versions" ("model_type", "is_active");
-- At most one active version per model type.
CREATE UNIQUE INDEX "mmv_one_active_per_type" ON "matching_model_versions" ("model_type") WHERE "is_active" = true;
