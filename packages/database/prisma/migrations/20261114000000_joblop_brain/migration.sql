-- Joblop Brain phase 1. Additive only: five new tables; no existing table, column, row or constraint
-- is changed. Every switch defaults OFF because a missing brain_settings row means OFF, so applying
-- this migration changes nothing a running API does.
--   brain_settings            master mode (off | watch | live) and the per-action switches
--   brain_issues              one row per issue a rule found (unique fingerprint = handled once)
--   brain_actions             the audit log: what, why, when, result, how to undo; unique
--                             (issue, action, kind) means the same issue is never acted on twice
--   brain_markers             once-only markers (one daily summary email per day)
--   message_delivery_failures email/SMS sends that failed, so they can be found and re-sent

-- CreateTable
CREATE TABLE "brain_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_by_user_id" UUID,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "brain_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "brain_issues" (
    "id" UUID NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "rule_key" TEXT NOT NULL,
    "subject_type" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "inputs" JSONB NOT NULL,
    "recommended_action" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "resolution" TEXT,
    "detected_at" TIMESTAMPTZ(3) NOT NULL,
    "last_seen_at" TIMESTAMPTZ(3) NOT NULL,
    "resolved_at" TIMESTAMPTZ(3),

    CONSTRAINT "brain_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brain_actions" (
    "id" UUID NOT NULL,
    "issue_id" UUID NOT NULL,
    "action_key" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "actor_type" TEXT NOT NULL,
    "actor_user_id" UUID,
    "rule_key" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "inputs" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "detail" TEXT,
    "undo_kind" TEXT,
    "undo_data" JSONB,
    "undo_hint" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL,
    "finished_at" TIMESTAMPTZ(3),
    "undone_at" TIMESTAMPTZ(3),
    "undone_by_user_id" UUID,

    CONSTRAINT "brain_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brain_markers" (
    "marker" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brain_markers_pkey" PRIMARY KEY ("marker")
);

-- CreateTable
CREATE TABLE "message_delivery_failures" (
    "id" UUID NOT NULL,
    "channel" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT,
    "retryable" BOOLEAN NOT NULL DEFAULT false,
    "failed_at" TIMESTAMPTZ(3) NOT NULL,
    "resent_at" TIMESTAMPTZ(3),
    "resend_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "message_delivery_failures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "brain_issues_fingerprint_key" ON "brain_issues"("fingerprint");

-- CreateIndex
CREATE INDEX "brain_issues_status_detected_at_idx" ON "brain_issues"("status", "detected_at");

-- CreateIndex
CREATE INDEX "brain_issues_rule_key_status_idx" ON "brain_issues"("rule_key", "status");

-- CreateIndex
CREATE INDEX "brain_issues_detected_at_idx" ON "brain_issues"("detected_at");

-- CreateIndex
CREATE INDEX "brain_actions_action_kind_created_at_idx" ON "brain_actions"("action_key", "kind", "created_at");

-- CreateIndex
CREATE INDEX "brain_actions_created_at_idx" ON "brain_actions"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "brain_actions_issue_action_kind_key" ON "brain_actions"("issue_id", "action_key", "kind");

-- CreateIndex
CREATE INDEX "message_delivery_failures_failed_at_idx" ON "message_delivery_failures"("failed_at");

-- AddForeignKey
ALTER TABLE "brain_actions" ADD CONSTRAINT "brain_actions_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "brain_issues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
