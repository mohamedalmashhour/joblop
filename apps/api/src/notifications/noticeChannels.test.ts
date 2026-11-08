import { describe, expect, it } from "vitest";
import { NOTICE_CHANNELS, sendsEmail, sendsText } from "./noticeChannels";

describe("notice channels", () => {
  it("texts only codes, confirmed, upcoming, cancelled and changed shifts, and urgent staff alerts", () => {
    const texted = (Object.keys(NOTICE_CHANNELS) as (keyof typeof NOTICE_CHANNELS)[]).filter((kind) => sendsText(kind, { urgent: true }));
    expect(texted.sort()).toEqual(["email_confirmation_code", "shift_cancelled", "shift_changed", "shift_confirmed", "shift_reminder", "sign_in_code", "staff_needed"]);
    expect(sendsText("staff_needed")).toBe(false);
    expect(sendsText("staff_needed", { urgent: true })).toBe(true);
  });

  it("always texts and emails a worker whose shift is cancelled or changed", () => {
    for (const kind of ["shift_cancelled", "shift_changed"] as const) {
      expect(sendsText(kind)).toBe(true);
      expect(sendsEmail(kind)).toBe(true);
    }
  });

  it("sends documents and information by email, and never emails a sign-in code", () => {
    expect(sendsEmail("invoice_sent")).toBe(true);
    expect(sendsText("invoice_sent", { urgent: true })).toBe(false);
    expect(sendsEmail("sign_in_code")).toBe(false);
  });
});
