import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ar } from "./messages";
import { WEB_COPY } from "../../../mobile/src/i18n/webCopy";
import { attendanceCopyFor, attendanceStatusLabel } from "../../../mobile/src/features/worker-attendance/attendanceScheduleContent";

// Arabic attendance words: "Check in" is تسجيل الوصول and "Check out" is تسجيل المغادرة. تسجيل الدخول /
// تسجيل الخروج mean signing in to / out of an account, and الانصراف is not the word the owner chose.

const SIGN_IN_WORDS = /تسجيل الدخول|تسجيل الخروج|الانصراف|انصراف|سجّلت وصولك/;
const ATTENDANCE_KEYS = [
  "sched.checkIn",
  "sched.checkOut",
  "sched.checkInOpensAt",
  "sched.checkInTooEarly",
  "sched.statusCheckedIn",
  "sched.statusCheckedOut",
  "sched.checkedInNotice",
  "sched.checkedOutNotice",
  "sched.intro",
  "sched.footer",
  "sched.waitingBody",
  "checkin.opensAt",
  "checkin.checkedInAt",
  "checkin.bothTimes",
  "offers.rightRecorded",
  "land.step3Title",
  "land.step3Body"
] as const;

describe("Arabic check-in / check-out words", () => {
  it("the website uses تسجيل الوصول / تسجيل المغادرة", () => {
    expect(ar["sched.checkIn"]).toBe("تسجيل الوصول");
    expect(ar["sched.checkOut"]).toBe("تسجيل المغادرة");
    expect(ar["checkin.checkedInAt"]).toBe("وصلت الساعة {time}");
    expect(ar["checkin.bothTimes"]).toBe("وصلت الساعة {inTime} · غادرت الساعة {outTime}");
    for (const key of ATTENDANCE_KEYS) expect(ar[key] ?? "", key).not.toMatch(SIGN_IN_WORDS);
  });

  it("the phone app says the same", () => {
    expect(WEB_COPY["sched.checkIn"]?.ar).toBe("تسجيل الوصول");
    expect(WEB_COPY["sched.checkOut"]?.ar).toBe("تسجيل المغادرة");
    const copy = attendanceCopyFor("ar");
    expect(copy.checkInCta).toBe("تسجيل الوصول");
    expect(copy.checkOutCta).toBe("تسجيل المغادرة");
    expect(attendanceStatusLabel("checked_out", "ar")).toBe("تم تسجيل المغادرة");
    for (const text of [copy.intro, copy.checkInCta, copy.checkOutCta]) expect(text).not.toMatch(SIGN_IN_WORDS);
  });

  it("no attendance text in the worker calendar, employer pages or Brain uses the sign-in words", () => {
    const files = [
      "../jobs-calendar/JobsCalendar.tsx",
      "../how-it-works/HowItWorks.tsx",
      "../../../employer/app/how-it-works/howItWorksContent.ts",
      "../../../employer/app/contact/contactContent.ts",
      "../../../employer/app/PlatformLoopMovie.tsx",
      "../../../api/src/brain/brainText.ts"
    ];
    for (const file of files) expect(readFileSync(new URL(file, import.meta.url), "utf8"), file).not.toMatch(/الانصراف|انصرافك|وانصراف/);
  });

  it("keeps تسجيل الدخول where it really means signing in", () => {
    expect(ar["auth.signIn"]).toBe("تسجيل الدخول");
  });
});
