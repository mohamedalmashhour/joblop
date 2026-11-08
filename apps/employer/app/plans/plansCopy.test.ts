import { describe, expect, it } from "vitest";
import { ar, en, fr } from "../i18n/messages";

const planKeys = Object.keys(en).filter(
  (key) => key.startsWith("plans.") || key.startsWith("listing.") || key.startsWith("create.jobLength")
);

describe("employer plans copy", () => {
  it("is translated in French and Arabic", () => {
    expect(planKeys.length).toBeGreaterThan(40);
    for (const key of planKeys) {
      expect(fr[key as keyof typeof fr], key).toBeTruthy();
      expect(ar[key as keyof typeof ar], key).toBeTruthy();
    }
  });

  it("never reveals Joblop's share or margin to employers", () => {
    const text = planKeys.flatMap((key) => [en[key as keyof typeof en], fr[key as keyof typeof fr], ar[key as keyof typeof ar] ?? ""]).join(" ");
    expect(text).not.toMatch(/margin|marge|commission|joblop keeps|platform share|part de joblop|ppm/i);
  });

  it("says no hidden fees and shows prices before taxes", () => {
    expect(en["plans.noHidden"]).toBe("No hidden fees. Cancel anytime.");
    expect(en["plans.perMonth"]).toContain("+ taxes");
    expect(en["plans.trial"]).toBe("Start 2-week free trial — no card needed");
  });

  it("explains the long-term listing exactly as the owner decided", () => {
    expect(en["create.jobLengthHintLong"]).toBe(
      "Long-term job: C$99/month listing, paid in advance. First 2 weeks free, then 50% off your first month. You hire and pay the worker directly."
    );
    expect(en["listing.status.not_listed"]).toBe("Not listed — payment needed");
    expect(en["listing.status.trial"]).toBe("Free trial until {date}");
    expect(en["listing.status.listed"]).toBe("Listed until {date}");
    expect(en["listing.renew"]).toBe("Renew 1 month");
    expect(Object.keys(en).some((key) => key.includes("contract_plus"))).toBe(false);
  });
});
