import { describe, expect, it } from "vitest";
import { attendanceCopyFor } from "../../../mobile/src/features/worker-attendance/attendanceScheduleContent";
import { dictionaries } from "../i18n/messages";
import { reportErrorKey, reportHoursView, shiftClock } from "./reportHoursView";

// "Report my hours" on the website schedule card, and the phone app using the same words.

const NOW = Date.parse("2027-02-18T20:00:00.000Z"); // 15:00 in Toronto, an hour after an 08:00–14:00 shift
const until = "2027-02-20T19:00:00.000Z";

describe("report my hours on the schedule card", () => {
  it("shows the form while the API allows it and until the deadline; then the report's state", () => {
    expect(reportHoursView({ canReportHours: true, reportHoursUntil: until, hoursReport: null }, NOW)).toBe("form");
    expect(reportHoursView({ canReportHours: true, reportHoursUntil: until, hoursReport: null }, Date.parse("2027-02-20T19:00:01.000Z"))).toBeNull();
    expect(reportHoursView({ canReportHours: false, hoursReport: { status: "pending" } }, NOW)).toBe("waiting");
    expect(reportHoursView({ canReportHours: false, hoursReport: { status: "rejected" } }, NOW)).toBe("rejected");
    expect(reportHoursView({ canReportHours: false, hoursReport: { status: "approved" } }, NOW)).toBeNull();
    expect(reportHoursView({}, NOW)).toBeNull();
  });

  it("starts the time inputs on the scheduled times in the shift's zone", () => {
    expect(shiftClock("2027-02-18T13:00:00.000Z", "America/Toronto")).toBe("08:00");
    expect(shiftClock("2027-02-18T19:00:00.000Z", "America/Toronto")).toBe("14:00");
  });

  it("maps every refusal the API gives to a message", () => {
    expect(reportErrorKey("end_before_start")).toBe("sched.reportErrEndBeforeStart");
    expect(reportErrorKey("in_future")).toBe("sched.reportErrFuture");
    expect(reportErrorKey("reason_required")).toBe("sched.reportErrReason");
    expect(reportErrorKey("window_closed")).toBe("sched.reportErrClosed");
    expect(reportErrorKey("already_pending")).toBe("sched.reportWaiting");
  });

  it("has every line in English, French and Arabic, and the phone app uses the same words", () => {
    const pairs = [
      ["sched.reportHours", "reportCta"],
      ["sched.reportHoursIntro", "reportIntro"],
      ["sched.reportArrival", "reportArrival"],
      ["sched.reportDeparture", "reportDeparture"],
      ["sched.reportReason", "reportReason"],
      ["sched.reportSubmit", "reportSubmit"],
      ["sched.reportClose", "reportClose"],
      ["sched.reportWaiting", "reportWaiting"],
      ["sched.reportSentNotice", "reportSentNotice"],
      ["sched.reportRejected", "reportRejected"],
      ["sched.reportErrTimes", "reportErrTimes"],
      ["sched.reportErrEndBeforeStart", "reportErrEndBeforeStart"],
      ["sched.reportErrFuture", "reportErrFuture"],
      ["sched.reportErrReason", "reportErrReason"],
      ["sched.reportErrClosed", "reportErrClosed"]
    ] as const;
    const webLocale = { en: "en-CA", fr: "fr-CA", ar: "ar" } as const;
    for (const locale of ["en", "fr", "ar"] as const) {
      const web = dictionaries[webLocale[locale]];
      const app = attendanceCopyFor(locale);
      for (const [webKey, appKey] of pairs) {
        expect(web[webKey], `${locale} ${webKey}`).toBeTruthy();
        expect(app[appKey], `${locale} ${appKey}`).toBe(web[webKey]);
      }
    }
    expect(dictionaries["en-CA"]["sched.reportWaiting"]).toBe("Waiting for Joblop to approve");
    expect(dictionaries.ar["sched.reportWaiting"]).toMatch(/[؀-ۿ]/);
  });
});
