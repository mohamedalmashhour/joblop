-- JobScanner: external job leads aggregated from legal partner feeds (Adzuna now; Talent.com later).
-- External hand-off leads only — NOT JobLop governed jobs; no money flows. Upserted by (source,
-- source_id) on each scan; first_seen_at/last_seen_at track freshness for the scheduled re-scan.
CREATE TABLE "external_job_leads" (
    "id" UUID NOT NULL,
    "source" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "employer" TEXT,
    "location_label" TEXT,
    "city" TEXT,
    "province" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "salary_min_minor" INTEGER,
    "salary_max_minor" INTEGER,
    "salary_period" TEXT,
    "contract_time" TEXT,
    "category" TEXT,
    "url" TEXT NOT NULL,
    "posted_at" TIMESTAMPTZ(3),
    "description" TEXT,
    "first_seen_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
    "last_seen_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
    CONSTRAINT "external_job_leads_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "external_job_leads_source_sourceid_key" ON "external_job_leads" ("source", "source_id");
CREATE INDEX "external_job_leads_province_city_idx" ON "external_job_leads" ("province", "city");
