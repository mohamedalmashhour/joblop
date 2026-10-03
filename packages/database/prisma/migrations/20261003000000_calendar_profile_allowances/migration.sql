-- CreateEnum: how an allowance is provided for a shift
CREATE TYPE "AllowanceProvision" AS ENUM ('none', 'provided', 'allowance');

-- AlterTable: structured per-shift allowances (transport / meal / lodging) so the agreement is
-- clear for all sides. Each category: how it is provided, an optional monetary amount (minor units),
-- and an optional note. All default to 'none' / NULL so existing rows and writers are unaffected.
ALTER TABLE "staffing_request_calendar_profiles"
    ADD COLUMN "transport_provision"    "AllowanceProvision" NOT NULL DEFAULT 'none',
    ADD COLUMN "transport_amount_minor" INTEGER,
    ADD COLUMN "transport_note"         TEXT,
    ADD COLUMN "meal_provision"         "AllowanceProvision" NOT NULL DEFAULT 'none',
    ADD COLUMN "meal_amount_minor"      INTEGER,
    ADD COLUMN "meal_note"              TEXT,
    ADD COLUMN "lodging_provision"      "AllowanceProvision" NOT NULL DEFAULT 'none',
    ADD COLUMN "lodging_amount_minor"   INTEGER,
    ADD COLUMN "lodging_note"           TEXT;
