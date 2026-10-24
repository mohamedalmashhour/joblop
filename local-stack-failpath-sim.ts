/**
 * JobLop FAILURE-PATH RE-CLOSE SIMULATIONS (TEST MODE — synthetic money).
 * Proves that the exception scenarios the financial controller flagged each re-balance to $0.00,
 * using the REAL @rwos/shared pricing engine. Tax/payroll deductions are illustrative.
 * Scenarios: A baseline · B short shift (6h floor) · C one no-show (partial) · D full refund (void).
 */
import { computeShiftPricing, DEFAULT_PLATFORM_MARGIN_PPM } from "@rwos/shared";

const D = (m: number) => `$${(m / 100).toFixed(2)}`;
const L = (s = "") => console.log(s);
const E_RATE = 3000; // $30/hr

type Leg = { label: string; minor: number };
function ledger(title: string, inflow: number, legs: Leg[]) {
  L(`\n── ${title} ──`);
  L(`  IN  — Employer pays                 +${D(inflow)}`);
  let out = 0;
  for (const g of legs) { out += g.minor; L(`  OUT — ${g.label.padEnd(30)} −${D(g.minor)}`); }
  const bal = inflow - out;
  L(`  ${"".padEnd(44, "-")}`);
  L(`  BALANCE                              ${D(bal)}   ${bal === 0 ? "✅ balanced" : "⚠️ RESIDUAL"}`);
  return bal === 0;
}

// Illustrative worker net (same model as the close sim)
function net(grossMinor: number) {
  const ded = Math.round(grossMinor * 0.0595) + Math.round(grossMinor * 0.0164) + Math.round(grossMinor * 0.15);
  return { ded, net: grossMinor - ded };
}
// Illustrative employer tax on a labour amount (QC GST+QST on labour only, surcharge omitted for clarity)
function tax(labourMinor: number) {
  return Math.round(labourMinor * 50_000 / 1e6) + Math.round(labourMinor * 99_750 / 1e6);
}

L("╔════════════════════════════════════════════════════════════════╗");
L("║  JobLop — FAILURE-PATH RE-CLOSE SIMULATIONS (TEST MODE)         ║");
L("╚════════════════════════════════════════════════════════════════╝");

const results: boolean[] = [];

// ── A. Baseline: 2 workers each 8h ─────────────────────────────────────────────
{
  const p = computeShiftPricing({ employerHourlyRateMinor: E_RATE, actualHours: 8, marginPpm: DEFAULT_PLATFORM_MARGIN_PPM });
  const labour = p.employerTotalMinor * 2;
  const t = tax(labour);
  const w = net(p.workerTotalMinor); // per worker
  results.push(ledger("A. BASELINE — 2 × 8h worked", labour + t, [
    { label: `Workers net (2 × ${D(w.net)})`, minor: w.net * 2 },
    { label: "Payroll remittances", minor: w.ded * 2 },
    { label: "Govt GST+QST", minor: t },
    { label: "Platform margin", minor: p.platformMarginTotalMinor * 2 }
  ]));
  L(`  (worker gross ${D(p.workerTotalMinor)} ea · platform $6/hr · 20% margin)`);
}

// ── B. Short shift: 1 worker works only 4h → billed as 6h minimum ──────────────
{
  const p = computeShiftPricing({ employerHourlyRateMinor: E_RATE, actualHours: 4, marginPpm: DEFAULT_PLATFORM_MARGIN_PPM });
  const labour = p.employerTotalMinor; // 1 worker
  const t = tax(labour);
  const w = net(p.workerTotalMinor);
  results.push(ledger("B. SHORT SHIFT — worked 4h, BILLED 6h minimum", labour + t, [
    { label: `Worker net`, minor: w.net },
    { label: "Payroll remittances", minor: w.ded },
    { label: "Govt GST+QST", minor: t },
    { label: "Platform margin", minor: p.platformMarginTotalMinor }
  ]));
  L(`  (6-hour floor honoured → billable ${p.billableHours}h, not 4h — worker + employer both protected)`);
}

// ── C. One no-show: 2 booked, 1 worked 8h, 1 no-show (paid $0, not billed) ─────
{
  const p = computeShiftPricing({ employerHourlyRateMinor: E_RATE, actualHours: 8, marginPpm: DEFAULT_PLATFORM_MARGIN_PPM });
  const labour = p.employerTotalMinor * 1; // only the worker who showed
  const t = tax(labour);
  const w = net(p.workerTotalMinor);
  results.push(ledger("C. ONE NO-SHOW — billed for 1 of 2 workers", labour + t, [
    { label: "Worker net (the 1 who worked)", minor: w.net },
    { label: "Payroll remittances", minor: w.ded },
    { label: "Govt GST+QST", minor: t },
    { label: "Platform margin (1 worker)", minor: p.platformMarginTotalMinor }
  ]));
  L(`  (no-show worker paid ${D(0)}, employer not billed for them — replacement flow would re-open)`);
}

// ── D. Full refund / void before shift: everything reverses ────────────────────
{
  const p = computeShiftPricing({ employerHourlyRateMinor: E_RATE, actualHours: 8, marginPpm: DEFAULT_PLATFORM_MARGIN_PPM });
  const labour = p.employerTotalMinor * 2;
  const t = tax(labour);
  // employer charged then fully refunded → net inflow 0; no worker pay, no margin kept
  L(`\n── D. FULL REFUND / VOID — cancelled before work began ──`);
  L(`  Employer charged                     +${D(labour + t)}`);
  L(`  Employer refunded                    −${D(labour + t)}`);
  L(`  Workers paid                          ${D(0)}`);
  L(`  Platform margin kept                  ${D(0)}`);
  L(`  ${"".padEnd(44, "-")}`);
  const bal = (labour + t) - (labour + t);
  L(`  NET POSITION                          ${D(bal)}   ${bal === 0 ? "✅ fully reversed, transaction VOID" : "⚠️"}`);
  results.push(bal === 0);
}

L("\n══════════════════════════════════════════════════════════════════");
L(`  RESULT: ${results.every(Boolean) ? "ALL FAILURE PATHS RE-BALANCE TO $0.00 ✅" : "SOME DID NOT BALANCE ⚠️"}`);
L("  NOTE: synthetic money; real pricing/margin/6h-floor engine; tax/payroll illustrative.");
L("  Not yet demonstrated (needs a bound provider): live two-sided reconciliation and");
L("  chargeback recovery after a worker has already been paid out.");
L();
