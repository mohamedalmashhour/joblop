import { describe, expect, it } from "vitest";
import { draftEditExtras, readDraftCertificatesUpdate } from "./draftEditExtras";

describe("draftEditExtras", () => {
  it("returns the employer's certificates and allowances for the edit form", () => {
    const extras = draftEditExtras({
      requiredCertificates: ["other", "whmis", "unknown"],
      requiredCertificateOther: " Forklift ",
      calendarProfile: {
        transportProvision: "allowance",
        transportAmountMinor: 2000,
        transportNote: "Bus fare",
        mealProvision: "provided",
        mealAmountMinor: null,
        mealNote: null,
        lodgingProvision: "none",
        lodgingAmountMinor: null,
        lodgingNote: null
      }
    });
    expect(extras.requiredCertificates).toEqual(["whmis", "other"]);
    expect(extras.requiredCertificateOther).toBe("Forklift");
    expect(extras.allowances?.transport).toEqual({ provision: "allowance", amountMinor: 2000, note: "Bus fare" });
    expect(extras.allowances?.meal.provision).toBe("provided");
  });

  it("returns empty values when nothing was stored", () => {
    expect(draftEditExtras({})).toEqual({ requiredCertificates: [], requiredCertificateOther: null, allowances: null });
  });
});

describe("readDraftCertificatesUpdate", () => {
  it("leaves certificates alone when the body does not mention them", () => {
    expect(readDraftCertificatesUpdate({ title: "x" })).toEqual({ status: "absent" });
  });

  it("clears certificates with an empty list", () => {
    expect(readDraftCertificatesUpdate({ requiredCertificates: [] })).toEqual({
      status: "ok",
      data: { requiredCertificates: [], requiredCertificateOther: null }
    });
  });

  it("refuses unknown keys and an 'other' without text", () => {
    expect(readDraftCertificatesUpdate({ requiredCertificates: ["nope"] })).toEqual({ status: "invalid" });
    expect(readDraftCertificatesUpdate({ requiredCertificates: ["other"] })).toEqual({ status: "invalid" });
  });

  it("keeps the 'other' text", () => {
    expect(readDraftCertificatesUpdate({ requiredCertificates: ["other"], requiredCertificateOther: "Forklift" })).toEqual({
      status: "ok",
      data: { requiredCertificates: ["other"], requiredCertificateOther: "Forklift" }
    });
  });
});
