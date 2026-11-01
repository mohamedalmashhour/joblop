-- R2-15: persist the worker's built CV to Joblop's DB when they generate it in the CV builder. One
-- current CV per worker (unique worker_ref → upsert). Stores both the rendered output (headline + CV
-- and cover-letter markdown) and the structured profile JSON it was built from, so it can be re-rendered
-- later with any JSON Resume theme. Advisory content the worker owns — no money, no governance.
-- NOTE: drafted to match repo conventions; verify with `prisma migrate` before merge.
CREATE TABLE "worker_cvs" (
    "id" UUID NOT NULL,
    "worker_ref" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "cv_markdown" TEXT NOT NULL,
    "cover_letter_markdown" TEXT NOT NULL,
    "tailored_to" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "profile_json" JSONB NOT NULL,
    "provider_kind" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "worker_cvs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "worker_cvs_worker_ref_key" ON "worker_cvs"("worker_ref");
