-- Shift-reminder notification support. Adds a nullable marker recording when a pre-shift reminder
-- was sent for an assignment, so the reminder sweep never double-sends. Non-destructive: one new
-- nullable column + one partial index to keep the sweep's "not yet reminded, upcoming" scan cheap.
ALTER TABLE "assignments" ADD COLUMN "shift_reminder_sent_at" TIMESTAMPTZ;

CREATE INDEX "assignments_shift_reminder_due_idx"
  ON "assignments" ("confirmed_start_at")
  WHERE "shift_reminder_sent_at" IS NULL;
