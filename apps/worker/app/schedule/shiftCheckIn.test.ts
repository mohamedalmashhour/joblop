import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { checkInView, type CheckInShift } from "./ShiftCheckIn";
import { en, fr, ar } from "../i18n/messages";
import { shiftPageHref } from "../shiftPage";

// Owner rule: as soon as a worker has a job, they see Check in / Check out where the job shows (the
// job page, right after claiming, accepted offers), not only on My schedule. And every booked shift
// in a calendar opens one shift page: the job page.

const START = "2027-02-11T13:00:00.000Z"; // 08:00 Toronto
const shift = (over: Partial<CheckInShift> = {}): CheckInShift => ({
  attendanceRecordId: "a1",
  jobRequestId: "job-1",
  status: "pending_start",
  scheduledStartAt: START,
  scheduledEndAt: "2027-02-11T19:00:00.000Z",
  timezone: "America/Toronto",
  checkInAt: null,
  checkOutAt: null,
  version: 1,
  ...over
});
const at = (iso: string) => new Date(iso).getTime();

describe("the Check in / Check out box", () => {
  it("is disabled until 30 minutes before the start, then turns on", () => {
    const before = checkInView(shift(), at("2027-02-11T12:29:00.000Z"));
    expect(before).toEqual({ kind: "opens_later", opensAt: new Date("2027-02-11T12:30:00.000Z") });
    expect(checkInView(shift(), at("2027-02-11T12:30:00.000Z"))).toEqual({ kind: "check_in" });
    expect(checkInView(shift(), at("2027-02-11T14:00:00.000Z"))).toEqual({ kind: "check_in" });
  });

  it("shows the check-in time and Check out, then both times", () => {
    expect(checkInView(shift({ status: "checked_in", checkInAt: "2027-02-11T12:58:00.000Z" }))).toEqual({ kind: "checked_in", inAt: "2027-02-11T12:58:00.000Z" });
    expect(checkInView(shift({ status: "checked_out", checkInAt: "2027-02-11T12:58:00.000Z", checkOutAt: "2027-02-11T19:02:00.000Z" }))).toEqual({
      kind: "done", inAt: "2027-02-11T12:58:00.000Z", outAt: "2027-02-11T19:02:00.000Z"
    });
  });

  it("shows nothing for a cancelled or missed shift, or a long-term job", () => {
    expect(checkInView(shift({ status: "cancelled" }))).toEqual({ kind: "none" });
    expect(checkInView(shift({ status: "missed" }))).toEqual({ kind: "none" });
    expect(checkInView(shift({ clockInAllowed: false }))).toEqual({ kind: "none" });
  });

  it("has every line in English, French and Arabic", () => {
    for (const key of ["checkin.opensAt", "checkin.checkedInAt", "checkin.bothTimes", "checkin.hoursSent", "checkin.assignedBody", "sched.openShift"] as const) {
      for (const [lang, dict] of [["en", en], ["fr", fr], ["ar", ar]] as const) expect((dict as Record<string, string | undefined>)[key]?.trim(), `${lang}:${key}`).toBeTruthy();
    }
    expect(en["checkin.opensAt"]).toContain("(Toronto time)");
    expect(en["checkin.hoursSent"]).toBe("Hours sent for confirmation");
  });
});

describe("where the box shows", () => {
  const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

  it("the job page shows a booked worker's shift box (also right after claiming), with Ask Joblop and Cancel", () => {
    const page = read("../jobs/[jobRequestId]/JobDetail.tsx");
    expect(page).toContain("<ShiftCheckIn shift={myRecord} onChanged={loadMine} />");
    expect(page).toContain("}, [loadMine, claimOutcome.state]);");
    expect(page).toContain('t("sched.askJoblop")');
    expect(page).toContain("<CancelShiftControl");
    expect(page).toContain("Report my hours");
  });

  it("accepted offers show it", () => {
    expect(read("../offers/Offers.tsx")).toContain("<ShiftCheckIn shift={myShiftsByJob.get(o.jobRequestId)!} onChanged={reloadMyShifts} />");
  });
});

describe("every calendar's booked shift opens the shift page", () => {
  const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

  it("is the job page", () => {
    expect(shiftPageHref("11111111-1111-4111-8111-111111111111")).toBe("/jobs/11111111-1111-4111-8111-111111111111");
  });

  it("My calendar (jobs calendar): a booked shift's card links to it", () => {
    const cal = read("../jobs-calendar/JobsCalendar.tsx");
    const shiftCard = cal.slice(cal.indexOf('  if (layer === "shift") {'), cal.indexOf('  if (layer === "pay") {'));
    expect(shiftCard).toContain("shiftPageHref(item.jobRequestId)");
    expect(shiftCard).not.toContain('href="/schedule">');
  });

  it("My schedule's calendar view: each booked shift links to it", () => {
    const sched = read("./MySchedule.tsx");
    const calendar = sched.slice(sched.indexOf("function CalendarView("));
    expect(calendar).toContain("href={shiftPageHref(s.jobRequestId)}");
  });

  it("the phone app's month calendar and schedule open the job screen", () => {
    const month = read("../../../mobile/src/features/calendar-month/MonthCalendarScreen.tsx");
    expect(month).toContain("onOpenJob(r.jobRequestId!)");
    const schedule = read("../../../mobile/src/features/worker-attendance/WorkerScheduleScreen.tsx");
    expect(schedule).toContain("onOpenJob(r.jobRequestId!)");
    const nav = read("../../../mobile/src/navigation/WorkerNavigator.tsx");
    expect(nav.match(/onOpenJob=\{\(jobRequestId\) => push\(\{ name: "marketplaceJob", jobRequestId, postalCode: null \}\)\}/g)?.length).toBeGreaterThanOrEqual(2);
    expect(nav).toContain('<MonthCalendarScreen\n            transport={transport}\n            onOpenOffers={() => push({ name: "offers" })}\n            onOpenJob=');
  });
});
