-- Shift conditions the employer can state on a request (all optional): the unpaid break, dress code,
-- equipment to bring, arrival instructions and notes for workers. Shown to workers in "Before you go".
-- Additive only: five nullable columns on the existing request profile; no existing row, column or
-- constraint changes. NULL means "not stated"; break_minutes 0 means "no break". The break is
-- information only for now (the timesheet engine does not deduct breaks yet).

-- AlterTable
ALTER TABLE "staffing_request_calendar_profiles"
    ADD COLUMN "break_minutes" INTEGER,
    ADD COLUMN "dress_code" TEXT,
    ADD COLUMN "equipment_to_bring" TEXT,
    ADD COLUMN "arrival_instructions" TEXT,
    ADD COLUMN "worker_notes" TEXT;

-- A break is 0 to 240 minutes; the texts have the same limits as the API.
ALTER TABLE "staffing_request_calendar_profiles"
    ADD CONSTRAINT "staffing_request_calendar_profiles_break_minutes_check"
        CHECK ("break_minutes" IS NULL OR ("break_minutes" >= 0 AND "break_minutes" <= 240)),
    ADD CONSTRAINT "staffing_request_calendar_profiles_conditions_length_check"
        CHECK (
            ("dress_code" IS NULL OR char_length("dress_code") <= 120)
            AND ("equipment_to_bring" IS NULL OR char_length("equipment_to_bring") <= 300)
            AND ("arrival_instructions" IS NULL OR char_length("arrival_instructions") <= 500)
            AND ("worker_notes" IS NULL OR char_length("worker_notes") <= 500)
        );
