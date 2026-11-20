import { describe, expect, it } from "vitest";
import {
  availableJobItem,
  buildEmployerToday,
  buildStaffToday,
  buildWorkerToday,
  firstName,
  formatBonus,
  formatMoney,
  jobCoverage,
  jobItem,
  parseHubWindow,
  payoutDate,
  reviewRequestItem,
  sortToday,
  toHubBonus,
  whenLabel,
  type HubItem,
  type TodayItem
} from "./calendarHubRoutes";

const DAY = 86_400_000;
const HOUR = 3_600_000;
const TZ = "America/Toronto";
// Wednesday 2026-11-11 15:00 UTC = 10:00 in Toronto.
const NOW = new Date("2026-11-11T15:00:00.000Z");

const item = (over: Partial<HubItem>): HubItem => ({
  id: "x:1",
  type: "my_shift",
  startAt: new Date(NOW.getTime() + 5 * HOUR).toISOString(),
  endAt: null,
  title: "Cook",
  subtitle: "Laval, QC",
  status: "confirmed",
  amountMinor: null,
  bonus: null,
  placesLeft: null,
  placesAsked: null,
  placesTaken: null,
  jobRequestId: "job-1",
  refId: "ref-1",
  ...over
});

const job = {
  id: "job-1",
  title: "Kitchen help",
  status: "approved_for_dispatch",
  numberOfWorkers: 3,
  startAt: new Date("2026-11-12T13:00:00.000Z"),
  endAt: new Date("2026-11-12T21:00:00.000Z"),
  roleDefinition: { displayLabel: "Cook" },
  residence: { city: "Laval", province: "QC" }
};

describe("parseHubWindow", () => {
  it("defaults to 7 days back and 45 days ahead", () => {
    const w = parseHubWindow({}, NOW);
    expect(w.from.toISOString()).toBe(new Date(NOW.getTime() - 7 * DAY).toISOString());
    expect(w.to.toISOString()).toBe(new Date(NOW.getTime() + 45 * DAY).toISOString());
  });
  it("reads from/to and caps the window at 93 days", () => {
    const w = parseHubWindow({ from: "2026-11-01T00:00:00.000Z", to: "2027-06-01T00:00:00.000Z" }, NOW);
    expect(w.from.toISOString()).toBe("2026-11-01T00:00:00.000Z");
    expect(w.to.getTime() - w.from.getTime()).toBe(93 * DAY);
  });
  it("ignores invalid dates and a to before from", () => {
    expect(parseHubWindow({ from: "nope" }, NOW).from.toISOString()).toBe(new Date(NOW.getTime() - 7 * DAY).toISOString());
    const w = parseHubWindow({ from: "2026-11-10T00:00:00.000Z", to: "2026-11-01T00:00:00.000Z" }, NOW);
    expect(w.to.getTime() - w.from.getTime()).toBe(45 * DAY);
    expect(parseHubWindow(null, NOW).to.getTime()).toBe(NOW.getTime() + 45 * DAY);
  });
});

describe("small helpers", () => {
  it("formats money, bonuses and first names", () => {
    expect(formatMoney(375)).toBe("$3.75");
    expect(formatMoney(-1000)).toBe("-$10.00");
    expect(formatBonus({ kind: "hourly", amountMinor: 375 })).toBe("+$3.75/h bonus");
    expect(formatBonus({ kind: "transport", amountMinor: 1500 })).toBe("+$15.00 transport bonus");
    expect(formatBonus({ kind: "one_time", amountMinor: 2000 })).toBe("+$20.00 bonus");
    expect(firstName("  Sara  Ben Ali ")).toBe("Sara");
    expect(firstName(null)).toBeNull();
    expect(firstName("   ")).toBeNull();
  });
  it("keeps only known bonus kinds, with no funding information", () => {
    expect(toHubBonus({ kind: "hourly", amountMinor: 100, fundedBy: "platform" } as never)).toEqual({ kind: "hourly", amountMinor: 100 });
    expect(toHubBonus({ kind: "weird", amountMinor: 100 })).toBeNull();
    expect(toHubBonus(undefined)).toBeNull();
  });
  it("labels the day in the local timezone", () => {
    expect(whenLabel(new Date(NOW.getTime() + 2 * HOUR), NOW, TZ)).toBe("today 12:00");
    expect(whenLabel(new Date("2026-11-12T13:00:00.000Z"), NOW, TZ)).toBe("tomorrow 8:00");
    expect(whenLabel(new Date("2026-11-10T13:00:00.000Z"), NOW, TZ)).toBe("yesterday 8:00");
    expect(whenLabel(new Date("2026-11-16T13:00:00.000Z"), NOW, TZ)).toMatch(/^Mon.* 8:00$/);
  });
  it("coverage and payout dates", () => {
    expect(jobCoverage(2, 0)).toBe("open");
    expect(jobCoverage(2, 1)).toBe("partly_filled");
    expect(jobCoverage(2, 2)).toBe("full");
    const hold = new Date("2026-11-20T00:00:00.000Z");
    expect(payoutDate({ paidAt: null, holdUntil: hold })).toBe(hold);
    const paid = new Date("2026-11-18T00:00:00.000Z");
    expect(payoutDate({ paidAt: paid, holdUntil: hold })).toBe(paid);
  });
  it("sorts today by severity then time, and caps it", () => {
    const t = (severity: TodayItem["severity"], startAt: string | null): TodayItem => ({ type: "x", title: "t", detail: null, severity, startAt, jobRequestId: null, refId: null });
    const sorted = sortToday([t("info", "2026-11-11T00:00:00Z"), t("urgent", "2026-11-12T00:00:00Z"), t("attention", null), t("urgent", "2026-11-11T00:00:00Z")]);
    expect(sorted.map((s) => `${s.severity}:${s.startAt}`)).toEqual([
      "urgent:2026-11-11T00:00:00Z",
      "urgent:2026-11-12T00:00:00Z",
      "attention:null",
      "info:2026-11-11T00:00:00Z"
    ]);
    expect(sortToday(Array.from({ length: 100 }, () => t("info", null)))).toHaveLength(40);
  });
});

describe("item mapping", () => {
  it("an available job carries worker pay, places left and the bonus", () => {
    const a = availableJobItem(job, 2, 2500, { kind: "hourly", amountMinor: 375 });
    expect(a).toMatchObject({
      id: "available:job-1",
      type: "available_job",
      title: "Cook",
      subtitle: "Laval, QC",
      amountMinor: 2500,
      placesLeft: 2,
      placesAsked: 3,
      placesTaken: 1,
      jobRequestId: "job-1",
      bonus: { kind: "hourly", amountMinor: 375 }
    });
  });
  it("a job's status is its coverage once approved, otherwise the request status", () => {
    expect(jobItem(job, 1, "Sara", null, null)).toMatchObject({ type: "job", status: "partly_filled", placesLeft: 2, placesTaken: 1, subtitle: "Sara" });
    expect(jobItem(job, 3, null, null, null).status).toBe("full");
    expect(jobItem({ ...job, status: "admin_review" }, 0, null, null, null).status).toBe("admin_review");
    expect(jobItem({ ...job, status: "cancelled" }, 0, null, null, null)).toMatchObject({ type: "cancelled_job", status: "cancelled", id: "cancelled_job:job-1", placesLeft: null });
  });
});

describe("today lists", () => {
  it("worker: shifts soon, cancelled shifts, bonus jobs and pay day", () => {
    const today = buildWorkerToday(
      [
        item({ id: "shift:1", startAt: "2026-11-12T13:00:00.000Z" }),
        item({ id: "shift:far", startAt: new Date(NOW.getTime() + 5 * DAY).toISOString() }),
        item({ id: "c:1", type: "cancelled_shift", status: "cancelled" }),
        item({ id: "a:1", type: "available_job", bonus: { kind: "hourly", amountMinor: 375 } }),
        item({ id: "a:2", type: "available_job" }),
        item({ id: "p:1", type: "pay_day", status: "pending", amountMinor: 12345, startAt: new Date(NOW.getTime() + 2 * DAY).toISOString() })
      ],
      NOW,
      TZ
    );
    expect(today.map((t) => t.type)).toEqual(["cancelled_shift", "my_shift", "bonus_job", "pay_day"]);
    expect(today[1]).toMatchObject({ title: "Shift tomorrow 8:00 — Cook, Laval, QC", severity: "attention" });
    expect(today[2]?.detail).toContain("+$3.75/h bonus");
    expect(today[3]?.title).toContain("$123.45");
  });
  it("employer: who is coming, jobs not filled, bonus offers and invoices", () => {
    const today = buildEmployerToday(
      [
        item({ id: "job:1", type: "job", status: "full", placesLeft: 0, subtitle: "Sara, Ali" }),
        item({ id: "job:2", type: "job", status: "open", placesLeft: 2, subtitle: null }),
        item({ id: "b:1", type: "bonus_offer", bonus: { kind: "one_time", amountMinor: 2000 } }),
        item({ id: "i:1", type: "invoice_due", amountMinor: 50000, startAt: new Date(NOW.getTime() + 3 * DAY).toISOString() }),
        item({ id: "i:2", type: "invoice_due", amountMinor: 100, startAt: new Date(NOW.getTime() - DAY).toISOString() }),
        item({ id: "i:3", type: "invoice_due", amountMinor: 100, startAt: new Date(NOW.getTime() + 20 * DAY).toISOString() })
      ],
      NOW,
      TZ
    );
    expect(today.map((t) => `${t.type}:${t.severity}`)).toEqual([
      "invoice_due:urgent",
      "job_not_filled:urgent",
      "bonus_offer:attention",
      "invoice_due:attention",
      "job:info"
    ]);
    expect(today.find((t) => t.type === "job")?.detail).toBe("Coming: Sara, Ali");
    expect(today.find((t) => t.type === "job_not_filled")?.title).toContain("Still needs 2 workers");
  });
  it("staff: needs workers, payouts due, pending cancellations, bonus offers and disputes", () => {
    const today = buildStaffToday(
      [
        item({ id: "job:1", type: "job", status: "open", placesLeft: 1, startAt: new Date(NOW.getTime() + 30 * HOUR).toISOString() }),
        item({ id: "job:2", type: "job", status: "full", placesLeft: 0 }),
        item({ id: "po:1", type: "payout", status: "released", amountMinor: 9000 }),
        item({ id: "po:2", type: "payout", status: "paid", amountMinor: 9000 }),
        item({ id: "c:1", type: "cancellation", status: "requires_reconciliation" }),
        item({ id: "c:2", type: "cancellation", status: "completed" })
      ],
      { openDisputes: [item({ id: "d:1", type: "dispute", status: "open" })], bonusOffersWaiting: [item({ id: "b:1", type: "bonus_offer" })] },
      NOW,
      TZ
    );
    expect(today.map((t) => `${t.type}:${t.severity}`)).toEqual([
      "cancellation:urgent",
      "payout:attention",
      "bonus_offer:attention",
      "dispute:attention",
      "needs_workers:attention"
    ]);
  });

  it("staff: requests waiting for review are listed with a link target, urgent when they start within 48 h", () => {
    const soon = reviewRequestItem({
      ...job,
      id: "job-soon",
      status: "submitted",
      startAt: new Date(NOW.getTime() + 20 * HOUR),
      endAt: new Date(NOW.getTime() + 28 * HOUR),
      organization: { displayName: "Ferme Laval" }
    });
    const later = reviewRequestItem({
      ...job,
      id: "job-later",
      status: "admin_review",
      startAt: new Date(NOW.getTime() + 10 * DAY),
      endAt: new Date(NOW.getTime() + 10 * DAY + 8 * HOUR),
      organization: null
    });
    expect(soon).toMatchObject({ type: "review_request", title: "Cook", subtitle: "Ferme Laval", jobRequestId: "job-soon", amountMinor: null });
    const today = buildStaffToday([], { openDisputes: [], bonusOffersWaiting: [], waitingForReview: [later, soon] }, NOW, TZ);
    expect(today.map((t) => `${t.type}:${t.severity}:${t.jobRequestId}`)).toEqual([
      "review_request:urgent:job-soon",
      "review_request:attention:job-later"
    ]);
    expect(today[0]).toMatchObject({ title: "Cook", detail: "Ferme Laval" });
  });
});
