-- Stage 2b.3c-B: drop the now-redundant legacy `DEFAULT 'CAD'` on three currency columns. Under the
-- active-country-currency policy (2b.3b-3) the governed runtime always supplies an explicit currency
-- for these columns, so their DB defaults are architectural residue. Columns stay NOT NULL; existing
-- rows are NOT modified; NO replacement default is added. This is the standard "drop the temporary
-- insert default so future inserts must supply the value" cleanup — no column/table drop, no row
-- deletion, no data alteration. Forward-only; documented rollback is `SET DEFAULT 'CAD'` per column.
--
-- `payroll_worked_time_references.currency` additionally carried a DB-only default (added in
-- 20260811140000 and, unlike its sibling columns, never dropped) that schema.prisma did not declare;
-- dropping it here realigns the DB with the schema.
--
-- OUT OF SCOPE (deliberately untouched): employer_capacity_reductions.currency (its no-obligation
-- writer still relies on the DB default), and all invoice/payment tables + their CHECK(currency='CAD').
ALTER TABLE "employer_contracts" ALTER COLUMN "currency" DROP DEFAULT;
ALTER TABLE "employer_cancellation_obligations" ALTER COLUMN "currency" DROP DEFAULT;
ALTER TABLE "payroll_worked_time_references" ALTER COLUMN "currency" DROP DEFAULT;
