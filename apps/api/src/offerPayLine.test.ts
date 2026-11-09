import { afterEach, describe, expect, it } from "vitest";
import { defaultOfferCompensationLine, offerPayLine } from "./offerPayLine";
import { normalizeLanguagePreference, resolveWorkerLanguage } from "./notifications/workerLanguage";

const previousFlag = process.env.EMPLOYER_PLANS_ENABLED;
afterEach(() => {
  if (previousFlag === undefined) delete process.env.EMPLOYER_PLANS_ENABLED;
  else process.env.EMPLOYER_PLANS_ENABLED = previousFlag;
});

const plain = (s: string | null) => (s ?? "").replace(/[\u00a0\u202f]/g, " ");
const SHORT = {
  jobLength: "short_term",
  payOfferedMinMinor: null,
  payOfferedMaxMinor: null,
  payOfferedUnit: null,
  pricingSnapshot: { workerHourlyRateMinor: 2_500, currency: "CAD", jobLength: "short_term" }
};
const LONG = {
  jobLength: "long_term",
  payOfferedMinMinor: 2_200,
  payOfferedMaxMinor: null,
  payOfferedUnit: "hour",
  pricingSnapshot: { workerHourlyRateMinor: 0, currency: "CAD", jobLength: "long_term" }
};
const PLACE = { organization: { displayName: "Résidence Soleil" }, residence: { city: "Laval", province: "QC" } };

describe("worker language", () => {
  it("reads the stored choice, French when nothing is stored", () => {
    expect(resolveWorkerLanguage(null, "ar")).toBe("ar");
    expect(resolveWorkerLanguage("en", "ar")).toBe("en");
    expect(resolveWorkerLanguage(undefined, "en-CA")).toBe("en");
    expect(resolveWorkerLanguage(null, null)).toBe("fr");
    expect(resolveWorkerLanguage("klingon")).toBe("fr");
    expect(normalizeLanguagePreference("fr-CA")).toBe("fr");
    expect(normalizeLanguagePreference("de")).toBeNull();
  });
});

describe("offer pay line in the worker's language", () => {
  it("short-term: the worker's own hourly pay in EN / FR / AR", () => {
    expect(offerPayLine(SHORT, "en")).toBe("$25.00/h");
    expect(plain(offerPayLine(SHORT, "fr"))).toBe("25,00 $/h");
    expect(offerPayLine(SHORT, "ar")).toBe("$25.00/h");
  });

  it("long-term listing: the employer's pay offer, never $0", () => {
    process.env.EMPLOYER_PLANS_ENABLED = "enabled";
    expect(offerPayLine(LONG, "en")).toBe("$22/h, paid directly by the employer");
    expect(plain(offerPayLine(LONG, "fr"))).toBe("22 $/h, payé directement par l'employeur");
    expect(offerPayLine(LONG, "ar")).toBe("$22/h، يدفعه صاحب العمل مباشرة");
  });

  it("long-term with the flag off still never shows $0", () => {
    delete process.env.EMPLOYER_PLANS_ENABLED;
    expect(offerPayLine(LONG, "ar")).toBe("أجر متفق عليه يدفعه صاحب العمل مباشرة");
    expect(offerPayLine(LONG, "en")).not.toContain("$0");
  });

  it("the default offer compensation names the employer and area in that language", () => {
    expect(defaultOfferCompensationLine({ ...SHORT, ...PLACE }, "en")).toBe("$25.00/h at Résidence Soleil, Laval, QC");
    expect(plain(defaultOfferCompensationLine({ ...SHORT, ...PLACE }, "fr"))).toBe("25,00 $/h chez Résidence Soleil, Laval, QC");
    expect(defaultOfferCompensationLine({ ...SHORT, ...PLACE }, "ar")).toBe("$25.00/h لدى Résidence Soleil, Laval, QC");
    expect(defaultOfferCompensationLine({ ...SHORT, pricingSnapshot: null, ...PLACE }, "en")).toBeNull();
  });
});
