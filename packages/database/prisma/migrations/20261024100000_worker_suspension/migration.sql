-- Worker late-cancellation suspension: time-boxed account suspension needs an expiry so it can be
-- auto-lifted at sign-in. `suspended_until` is set when an admin applies a 7-day suspension (with
-- status='disabled'); a permanent close uses status='closed' + closed_at and leaves this null.
ALTER TABLE "users" ADD COLUMN "suspended_until" TIMESTAMPTZ(3);
