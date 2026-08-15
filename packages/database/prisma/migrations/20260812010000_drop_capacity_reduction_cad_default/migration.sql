-- Stage 2b.3c-C: drop the last non-payment legacy DEFAULT 'CAD'. The capacity-reduction writer
-- (createReduction) now ALWAYS supplies an explicit currency — the governed rate currency when an
-- obligation applies, else the active countryCurrency (fail-closed if unavailable) — so this column's
-- DB default is no longer load-bearing. Column stays NOT NULL; existing rows are NOT modified; NO
-- replacement default is added. No column/table drop, no row deletion, no data alteration — only the
-- future-insert default is removed. Forward-only; documented rollback is `SET DEFAULT 'CAD'`.
--
-- OUT OF SCOPE (untouched): the five invoice/payment currency defaults + their CHECK(currency='CAD').
ALTER TABLE "employer_capacity_reductions" ALTER COLUMN "currency" DROP DEFAULT;
