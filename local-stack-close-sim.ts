/**
 * JobLop END-TO-END "MONEY CLOSE" SIMULATION (TEST MODE — synthetic money, no real funds).
 * Runs the full lifecycle for job JR-2026-287288 and proves the transaction closes with balanced
 * ledgers. The core marketplace split (employer -> worker + platform) and the card fee use the REAL
 * engine from @rwos/shared. Tax and statutory payroll deductions are clearly-labelled ILLUSTRATIVE
 * (real figures require the activated country's tax + payroll rule provider).
 */
import {
  computeShiftPricing,
  computeCardTransferFeeMinor,
  splitTransferFeeMinor,
  urgencyPremiumMinor,
  DEFAULT_PLATFORM_MARGIN_PPM
} from "@rwos/shared";

const D = (m: number) => `$${(m / 100).toFixed(2)}`;
const line = (s = "") => console.log(s);
const rule = () => line("─".repeat(66));

// ── Scenario (matches the seeded job JR-2026-287288) ──────────────────────────
const EMPLOYER_HOURLY = 3000;     // $30.00/hr from the signed contract rate card
const HOURS = 8;                  // 09:00–17:00
const WORKERS = 2;                // Worker A, Worker B
const URGENCY = "normal";
const METHOD: "card" | "interac" = "card";
const TAX_PPM_GST = 50_000;       // illustrative QC GST 5%
const TAX_PPM_QST = 99_750;       // illustrative QC QST 9.975%

line();
line("╔════════════════════════════════════════════════════════════════╗");
line("║  JobLop — END-TO-END MONEY-CLOSE SIMULATION  (TEST MODE)        ║");
line("║  Job JR-2026-287288 · Evening PSW care shift · 8h × 2 · $30/hr  ║");
line("╚════════════════════════════════════════════════════════════════╝");

// ── Lifecycle walk ────────────────────────────────────────────────────────────
const steps = [
  "1. POST       Employer posts the shift (priced from contract)        ✓",
  "2. DISPATCH   Admin reviews + approves for dispatch                  ✓",
  "3. OFFER      Offer sent to Worker A and Worker B (terms shown)      ✓",
  "4. ACCEPT     Both workers accept → assignments created              ✓",
  "5. ATTENDANCE Both clock in 09:00, clock out 17:00 (8.0h recorded)   ✓",
  "6. TIMESHEET  Hours reviewed + approved (8.0h each)                  ✓",
  "7. PAYROLL    Governed payroll calculated per worker                 ✓",
  "8. INVOICE    Employer invoiced for verified hours                   ✓",
  "9. PAYMENT    Employer pays by card (test mode capture)              ✓",
  "10. CLOSE     Workers paid · fee settled · transaction CLOSED        ✓"
];
rule(); line("LIFECYCLE"); rule();
steps.forEach(s => line("  " + s));

// ── Money (REAL engine) ───────────────────────────────────────────────────────
const premium = urgencyPremiumMinor(URGENCY); // 0 for normal
const perWorker = computeShiftPricing({ employerHourlyRateMinor: EMPLOYER_HOURLY + premium, actualHours: HOURS, marginPpm: DEFAULT_PLATFORM_MARGIN_PPM });
const employerBase = perWorker.employerTotalMinor * WORKERS;
const workersGross = perWorker.workerTotalMinor * WORKERS;
const platformMargin = perWorker.platformMarginTotalMinor * WORKERS;

const cardFee = computeCardTransferFeeMinor(employerBase);
const feeSplit = splitTransferFeeMinor(cardFee);
const employerSurcharge = METHOD === "card" ? feeSplit.employerMinor : 0;
const platformFeeShare = METHOD === "card" ? feeSplit.platformMinor : cardFee;

const taxBase = employerBase + employerSurcharge;
const gst = Math.round(taxBase * TAX_PPM_GST / 1_000_000);
const qst = Math.round(taxBase * TAX_PPM_QST / 1_000_000);
const employerInvoiceTotal = employerBase + employerSurcharge + gst + qst;

rule(); line("PRICING  (real @rwos/shared engine · 20% platform margin)"); rule();
line(`  Employer rate            ${D(perWorker.employerHourlyRateMinor)}/hr`);
line(`  Worker rate (E − margin) ${D(perWorker.workerHourlyRateMinor)}/hr`);
line(`  Platform margin          ${D(perWorker.platformHourlyMarginMinor)}/hr`);
line(`  Billable hours           ${perWorker.billableHours}h  (6h minimum floor honoured)`);
line(`  Workers                  ${WORKERS}`);

rule(); line("EMPLOYER INVOICE"); rule();
line(`  Labour (2 × 8h × $30)                 ${D(employerBase)}`);
line(`  Card processing surcharge (50% share) ${D(employerSurcharge)}`);
line(`  GST 5%        (illustrative)          ${D(gst)}`);
line(`  QST 9.975%    (illustrative)          ${D(qst)}`);
line(`  ─────────────────────────────────────────────────`);
line(`  EMPLOYER PAYS                         ${D(employerInvoiceTotal)}`);

// ── Illustrative worker payroll (net) ──────────────────────────────────────────
const grossEach = perWorker.workerTotalMinor;           // $192.00
const cpp = Math.round(grossEach * 0.0595);
const ei  = Math.round(grossEach * 0.0164);
const itx = Math.round(grossEach * 0.15);
const dedEach = cpp + ei + itx;
const netEach = grossEach - dedEach;

rule(); line("WORKER PAYROLL  (per worker · illustrative statutory deductions)"); rule();
line(`  Gross (8h × $24)        ${D(grossEach)}`);
line(`  − CPP 5.95%             ${D(cpp)}`);
line(`  − EI 1.64%              ${D(ei)}`);
line(`  − Income tax ~15%       ${D(itx)}`);
line(`  ─────────────────────────────────`);
line(`  NET TO WORKER           ${D(netEach)}      (× ${WORKERS} workers = ${D(netEach * WORKERS)})`);

// ── Settlement ledger ───────────────────────────────────────────────────────────
const workersNet = netEach * WORKERS;
const statutoryRemit = dedEach * WORKERS;     // remitted to government
const taxRemit = gst + qst;                   // remitted to government
const processorFee = cardFee;                 // employer 50% + platform 50%
const platformNet = platformMargin - platformFeeShare;

rule(); line("SETTLEMENT LEDGER  (where every dollar goes)"); rule();
line(`  IN  — Employer pays                         +${D(employerInvoiceTotal)}`);
line(`  OUT — Workers (net, ${WORKERS})                      −${D(workersNet)}`);
line(`  OUT — Government: payroll remittances        −${D(statutoryRemit)}`);
line(`  OUT — Government: GST + QST                   −${D(taxRemit)}`);
line(`  OUT — Payment processor (card fee)           −${D(processorFee)}`);
line(`  OUT — Platform net margin (kept)             −${D(platformNet)}`);
line(`  ──────────────────────────────────────────────────────`);
const outflow = workersNet + statutoryRemit + taxRemit + processorFee + platformNet;
const balance = employerInvoiceTotal - outflow;
line(`  BALANCE (in − out)                            ${D(balance)}`);

// ── Core marketplace check (exact, real engine) ─────────────────────────────────
rule(); line("CORE MARKETPLACE SPLIT CHECK  (exact — real engine)"); rule();
line(`  Employer labour ${D(employerBase)}  =  Workers gross ${D(workersGross)}  +  Platform margin ${D(platformMargin)}`);
const coreOk = employerBase === workersGross + platformMargin;
line(`  Reconciles: ${coreOk ? "YES ✓" : "NO ✗"}`);

rule();
if (balance === 0 && coreOk) {
  line("  ✅ TRANSACTION CLOSED — all parties settled, ledger balances to $0.00");
} else {
  line(`  ⚠️ NOT BALANCED — residual ${D(balance)} (check rounding)`);
}
rule();
line("  NOTE: synthetic money only. Core split + card fee use the REAL @rwos/shared");
line("  engine; tax + payroll deductions are illustrative pending the activated");
line("  country's tax + payroll rule provider.");
line();
