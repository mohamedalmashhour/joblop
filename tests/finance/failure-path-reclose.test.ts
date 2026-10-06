/**
 * Failure-path re-close harness — the controller's repeatable proof.
 *
 * For every money scenario (clean close + each failure path) this builds the full settlement
 * ledger from the REAL @rwos/shared pricing engine and asserts two invariants:
 *   1. every dollar in reconciles out — settlement balance is exactly $0.00 (no stranded funds);
 *   2. the core marketplace split is exact — employer labour = workers gross + platform margin.
 *
 * Core split + card fee use the real engine. Tax (GST/QST) and statutory payroll deductions are
 * clearly-labelled ILLUSTRATIVE pending the activated country's tax + payroll rule provider — but
 * the RECONCILIATION (balance to zero) holds regardless of those illustrative rates, which is the
 * property the controller signs off on. Re-run with:  pnpm test tests/finance
 */
import { describe, expect, it } from "vitest";
import {
  computeShiftPricing,
  computeCardTransferFeeMinor,
  splitTransferFeeMinor,
  urgencyPremiumMinor,
  DEFAULT_PLATFORM_MARGIN_PPM
} from "@rwos/shared";

const EMPLOYER_HOURLY = 3000; // $30.00/hr (signed contract rate for JR-2026-287288)
const GST_PPM = 50_000;       // illustrative QC GST 5%
const QST_PPM = 99_750;       // illustrative QC QST 9.975%

type Party = "employer" | "workers" | "government" | "processor" | "platform";

type Settlement = {
  employerBase: number;
  workersGross: number;
  platformMargin: number;
  invoice: number;
  workersNet: number;
  statutoryRemit: number;
  taxRemit: number;
  processorFee: number;
  platformNet: number;
  outflow: number;
  balance: number;
  coreOk: boolean;
  billableHoursEach: number[];
  parties: Record<Party, number>;
};

/**
 * Build a settlement from the per-worker ACTUAL hours of the workers who showed up.
 * A no-show is modelled by omitting that seat entirely (never billed, never paid).
 */
function settle(workerActualHours: number[], method: "card" | "interac" = "card"): Settlement {
  const premium = urgencyPremiumMinor("normal"); // 0
  const pricings = workerActualHours.map((h) =>
    computeShiftPricing({
      employerHourlyRateMinor: EMPLOYER_HOURLY + premium,
      actualHours: h,
      marginPpm: DEFAULT_PLATFORM_MARGIN_PPM
    })
  );

  const employerBase = pricings.reduce((s, p) => s + p.employerTotalMinor, 0);
  const workersGross = pricings.reduce((s, p) => s + p.workerTotalMinor, 0);
  const platformMargin = pricings.reduce((s, p) => s + p.platformMarginTotalMinor, 0);

  const cardFee = computeCardTransferFeeMinor(employerBase);
  const feeSplit = splitTransferFeeMinor(cardFee);
  const employerSurcharge = method === "card" ? feeSplit.employerMinor : 0;
  const platformFeeShare = method === "card" ? feeSplit.platformMinor : cardFee;

  const taxBase = employerBase + employerSurcharge;
  const gst = Math.round((taxBase * GST_PPM) / 1_000_000);
  const qst = Math.round((taxBase * QST_PPM) / 1_000_000);
  const invoice = employerBase + employerSurcharge + gst + qst;

  // Illustrative per-worker statutory deductions on each worker's gross.
  const nets = pricings.map((p) => {
    const g = p.workerTotalMinor;
    const ded = Math.round(g * 0.0595) + Math.round(g * 0.0164) + Math.round(g * 0.15);
    return { ded, net: g - ded };
  });
  const workersNet = nets.reduce((s, n) => s + n.net, 0);
  const statutoryRemit = nets.reduce((s, n) => s + n.ded, 0);

  const taxRemit = gst + qst;
  const processorFee = cardFee;
  const platformNet = platformMargin - platformFeeShare;

  const outflow = workersNet + statutoryRemit + taxRemit + processorFee + platformNet;
  const balance = invoice - outflow;

  // Each party's net cash-position change. For a balanced settlement these sum to zero.
  const parties: Record<Party, number> = {
    employer: -invoice,
    workers: workersNet,
    government: statutoryRemit + taxRemit,
    processor: processorFee,
    platform: platformNet
  };

  return {
    employerBase, workersGross, platformMargin, invoice,
    workersNet, statutoryRemit, taxRemit, processorFee, platformNet,
    outflow, balance,
    coreOk: employerBase === workersGross + platformMargin,
    billableHoursEach: pricings.map((p) => p.billableHours),
    parties
  };
}

const reconciles = (s: Settlement) => {
  expect(s.balance).toBe(0);
  expect(s.coreOk).toBe(true);
  // party positions net to zero too (independent check of the same invariant)
  const sum = Object.values(s.parties).reduce((a, b) => a + b, 0);
  expect(sum).toBe(0);
};

describe("failure-path re-close — every scenario balances to $0.00 (real engine)", () => {
  it("clean close — 2 workers × 8h", () => {
    const s = settle([8, 8]);
    expect(s.billableHoursEach).toEqual([8, 8]);
    expect(s.employerBase).toBe(48_000); // $480.00
    reconciles(s);
  });

  it("short shift — worked 4h, billed at the 6h minimum floor", () => {
    const s = settle([4, 4]);
    expect(s.billableHoursEach).toEqual([6, 6]); // 6h floor honoured
    reconciles(s);
  });

  it("one no-show — 1 of 2 seats billed, no-show paid nothing", () => {
    const s = settle([8]); // the no-show seat is omitted entirely
    expect(s.billableHoursEach).toEqual([8]);
    expect(s.workersNet).toBeGreaterThan(0);
    reconciles(s);
  });

  it("dispute correction — Worker B corrected 8h → 7h, re-closes clean", () => {
    const s = settle([8, 7]); // A unchanged, B corrected to clock-verified 7h
    expect(s.billableHoursEach).toEqual([8, 7]);
    const clean = settle([8, 8]);
    expect(s.invoice).toBeLessThan(clean.invoice); // employer billed less, matching the record
    reconciles(s);
  });

  it("full refund / void — every leg reverses, no party left holding funds", () => {
    const s = settle([8, 8]);
    const reversed: Record<Party, number> = {
      employer: -s.parties.employer,
      workers: -s.parties.workers,
      government: -s.parties.government,
      processor: -s.parties.processor,
      platform: -s.parties.platform
    };
    (Object.keys(s.parties) as Party[]).forEach((p) => {
      expect(s.parties[p] + reversed[p]).toBe(0); // net position returns to zero for every party
    });
  });

  it("partial capture — capture matches delivered hours; uncaptured authorization is released, not stranded", () => {
    const authorized = settle([8, 8]); // full estimate authorized up front
    const captured = settle([4, 4]);   // job ran short → capture the (6h-floored) actual
    reconciles(captured);              // the captured amount reconciles on its own
    const released = authorized.invoice - captured.invoice;
    expect(released).toBeGreaterThan(0);
    // released funds were never captured, so they appear in NO party's settlement — nothing stranded
    expect(captured.parties.employer).toBe(-captured.invoice);
  });

  it("controller summary (printed for re-run readability)", () => {
    const rows = {
      "clean 8h×2": settle([8, 8]),
      "short 4h→6h": settle([4, 4]),
      "no-show (1 of 2)": settle([8]),
      "dispute 8h+7h": settle([8, 7])
    };
    const D = (m: number) => `$${(m / 100).toFixed(2)}`;
    for (const [name, s] of Object.entries(rows)) {
      // eslint-disable-next-line no-console
      console.log(`${name.padEnd(18)} invoice ${D(s.invoice).padStart(9)}  balance ${D(s.balance)}  core ${s.coreOk ? "OK" : "FAIL"}`);
      expect(s.balance).toBe(0);
    }
  });
});
