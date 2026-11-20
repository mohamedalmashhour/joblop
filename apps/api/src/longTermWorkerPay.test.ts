import { afterEach, describe, expect, it } from "vitest";
import { availableJobItem } from "./calendarHubRoutes";
import { jobAlertDigestEmail, type AlertOpenJob } from "./jobAlerts";
import { longTermJobRequestInput } from "./longTermJobRequestInput";
import { isLongTermListingJob, longTermPaySentence, payOfferedViewOf, workerPay } from "./longTermWorkerPay";

// Long-term jobs (employer plans flag) are paid listings: the pricing snapshot holds zero money, so a
// worker must see the employer's own pay offer ("paid directly by the employer"), never "$0/h", never
// Joblop's share or the employer's contract rate. Flag off: responses are byte-identical to today.

const LONG = { jobLength: "long_term", payOfferedMinMinor: 2_200, payOfferedMaxMinor: 2_500, payOfferedUnit: "hour" };
const LONG_NO_PAY = { jobLength: "long_term", payOfferedMinMinor: null, payOfferedMaxMinor: null, payOfferedUnit: null };
const SHORT = { jobLength: "short_term", payOfferedMinMinor: null, payOfferedMaxMinor: null, payOfferedUnit: null };

const previousFlag = process.env.EMPLOYER_PLANS_ENABLED;
afterEach(() => {
  if (previousFlag === undefined) delete process.env.EMPLOYER_PLANS_ENABLED;
  else process.env.EMPLOYER_PLANS_ENABLED = previousFlag;
});

describe("worker pay for long-term listing jobs", () => {
  it("flag OFF: the rate passes through untouched and nothing is added (byte-identical JSON)", () => {
    for (const row of [LONG, LONG_NO_PAY, SHORT]) {
      const pay = workerPay(row, 0, false);
      expect(pay).toEqual({ rateMinor: 0, extra: {} });
      const before = JSON.stringify({ workerRateMinor: 0, currency: "CAD" });
      const after = JSON.stringify({ workerRateMinor: pay.rateMinor, ...pay.extra, currency: "CAD" });
      expect(after).toBe(before);
    }
    expect(isLongTermListingJob(LONG, false)).toBe(false);
  });

  it("reads the flag from the environment by default (off unless enabled)", () => {
    delete process.env.EMPLOYER_PLANS_ENABLED;
    expect(workerPay(LONG, 0).extra).toEqual({});
    process.env.EMPLOYER_PLANS_ENABLED = "enabled";
    expect(workerPay(LONG, 0).extra).toHaveProperty("payOffered");
  });

  it("flag ON + short-term: unchanged", () => {
    expect(workerPay(SHORT, 2_150, true)).toEqual({ rateMinor: 2_150, extra: {} });
  });

  it("flag ON + long-term: no $0 rate, the employer's pay offer marked as paid by the employer", () => {
    const pay = workerPay(LONG, 0, true);
    expect(pay.rateMinor).toBeNull();
    expect(pay.extra).toEqual({
      payOffered: { minMinor: 2_200, maxMinor: 2_500, unit: "hour", currency: "CAD", paidBy: "employer" }
    });
    expect(workerPay(LONG_NO_PAY, 0, true)).toEqual({ rateMinor: null, extra: { payOffered: null } });
  });

  it("never exposes Joblop's share or employer rates, even if the row carries them", () => {
    const row = { ...LONG, platformHourlyMarginMinor: 900, employerHourlyRateMinor: 3_900 } as typeof LONG;
    const json = JSON.stringify(workerPay(row, 0, true));
    expect(json).not.toContain("900");
    expect(json).not.toContain("3900");
    expect(Object.keys(payOfferedViewOf(row)!).sort()).toEqual(["currency", "maxMinor", "minMinor", "paidBy", "unit"]);
  });

  it("writes a plain sentence for offer emails and offer terms", () => {
    expect(longTermPaySentence(LONG, "en")).toBe("$22–$25/h, paid directly by the employer");
    expect(longTermPaySentence(LONG_NO_PAY, "en")).toBe("Pay agreed and paid directly by the employer");
    expect(longTermPaySentence(LONG, "fr").replace(/[\u00a0\u202f]/g, " ")).toBe("22 $–25 $/h, payé directement par l'employeur");
  });

  it("calendar hub: an available long-term job carries the pay offer, a short-term one is unchanged", () => {
    const job = {
      id: "job-1",
      title: "Caregiver",
      status: "approved_for_dispatch",
      numberOfWorkers: 1,
      startAt: new Date("2026-12-01T13:00:00.000Z"),
      endAt: new Date("2026-12-01T21:00:00.000Z"),
      roleDefinition: { displayLabel: "Caregiver" },
      residence: { city: "Laval", province: "QC" }
    };
    const short = availableJobItem(job, 1, 2_150, null);
    expect(short.amountMinor).toBe(2_150);
    expect("payOffered" in short).toBe(false);
    const pay = workerPay(LONG, 0, true);
    const long = availableJobItem(job, 1, pay.rateMinor, null, pay.extra);
    expect(long.amountMinor).toBeNull();
    expect(long.payOffered).toEqual({ minMinor: 2_200, maxMinor: 2_500, unit: "hour", currency: "CAD", paidBy: "employer" });
  });

  it("job alert digest: a long-term job states the employer's pay, never $0", () => {
    const base: AlertOpenJob = {
      jobRequestId: "job-1",
      role: "Caregiver",
      title: "Caregiver",
      city: "Laval",
      province: "QC",
      startAt: new Date("2026-12-01T13:00:00.000Z"),
      workerRateMinor: null,
      freshAt: new Date("2026-11-08T12:00:00.000Z")
    };
    const pay = workerPay(LONG, 0, true);
    const longJob: AlertOpenJob = { ...base, workerRateMinor: pay.rateMinor, ...pay.extra };
    const email = jobAlertDigestEmail({
      to: "pat@example.com",
      language: "en",
      items: [{ kind: "job", job: longJob }],
      criteria: { roleKeywords: null, province: null },
      workerWebOrigin: "https://joblop.example",
      unsubscribeToken: "tok"
    });
    const text = email.text;
    expect(text).toContain("$22–$25/h, paid directly by the employer");
    expect(text).not.toMatch(/\$0(\.00)?\/h/);
  });
});

describe("long-term job request input (create path)", () => {
  it("flag OFF: always short-term, nothing written, no pay offer required", () => {
    expect(longTermJobRequestInput({ jobLength: "long_term" }, false)).toEqual({ status: "short_term" });
  });

  it("flag ON: short-term needs no pay offer; long-term needs no contract rate but a valid pay offer", () => {
    expect(longTermJobRequestInput({ jobLength: "short_term" }, true)).toEqual({ status: "short_term" });
    expect(longTermJobRequestInput({}, true)).toEqual({ status: "short_term" });
    expect(longTermJobRequestInput({ jobLength: "long_term" }, true)).toEqual({ status: "invalid_pay_offered" });
    expect(longTermJobRequestInput({ jobLength: "long_term", payOffered: { minMinor: 0, unit: "hour" } }, true)).toEqual({
      status: "invalid_pay_offered"
    });
    const ok = longTermJobRequestInput({ jobLength: "long_term", payOffered: { minMinor: 4_500_000, unit: "year" } }, true);
    expect(ok).toMatchObject({
      status: "long_term",
      data: { jobLength: "long_term", payOfferedMinMinor: 4_500_000, payOfferedMaxMinor: null, payOfferedUnit: "year" }
    });
  });
});
