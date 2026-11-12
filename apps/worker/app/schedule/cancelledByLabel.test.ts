import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { attendanceCopyFor } from "../../../mobile/src/features/worker-attendance/attendanceScheduleContent";

// A cancelled shift on My schedule shows who cancelled it, never the internal reason text (a live
// card once showed "JR-2026-000004 was cancelled (below minimum wage)… Owner approved.").

const messages = readFileSync(new URL("../i18n/messages.ts", import.meta.url), "utf8");
const card = readFileSync(new URL("./MySchedule.tsx", import.meta.url), "utf8");
const KEYS = ["sched.cancelledByJoblop", "sched.cancelledByEmployer", "sched.cancelledByWorker"];

describe("cancelled shift label on the worker schedule", () => {
  it("has each label in English, French and Arabic", () => {
    for (const key of KEYS) expect(messages.split(`"${key}":`).length - 1, key).toBe(3);
    expect(messages).toContain('"sched.cancelledByJoblop": "Cancelled by Joblop"');
    expect(messages).toContain('"sched.cancelledByEmployer": "Cancelled by the employer"');
    expect(messages).toContain('"sched.cancelledByWorker": "You cancelled this shift"');
  });

  it("the card shows the label, never the reason field", () => {
    expect(card).not.toContain("exceptionCategory");
    expect(card).toContain("t(CANCELLED_BY_KEY[s.cancelledBy])");
  });

  it("the phone app uses the website's words", () => {
    const en = attendanceCopyFor("en").cancelledBy;
    expect(en).toEqual({ joblop: "Cancelled by Joblop", employer: "Cancelled by the employer", worker: "You cancelled this shift" });
    for (const locale of ["fr", "ar"] as const) {
      const copy = attendanceCopyFor(locale).cancelledBy;
      for (const [who, key] of [["joblop", KEYS[0]], ["employer", KEYS[1]], ["worker", KEYS[2]]] as const) {
        expect(messages, `${locale}:${who}`).toContain(`"${key}": "${copy[who]}"`);
      }
    }
  });
});
