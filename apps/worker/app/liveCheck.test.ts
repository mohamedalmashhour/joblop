import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ar, en, fr } from "./i18n/messages";
import { groupLeads, leadGroupKey, normaliseLeadText } from "./find-work/groupLeads";
import { QUEBEC_BOUNDS, boundsFor, osmView, projectX, projectY, zoomFor } from "./find-work/osmMap";

// Fixes from the live check of joblop.com after the simple design shipped (items 89-93; 88 is in the API).
const src = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("89. outside listings with the same title + company become one card", () => {
  const lead = (title: string, employer: string | null, areaLabel: string, url = `https://example.com/${areaLabel}`) => ({
    title,
    employer,
    areaLabel,
    source: "jobbank",
    url
  });

  it("normalises case, accents, punctuation and spaces", () => {
    expect(normaliseLeadText("  Préposé(e) à l'entretien  ")).toBe("prepose e a l entretien");
    expect(leadGroupKey({ title: "Cook - Line", employer: "Café Ami" })).toBe(leadGroupKey({ title: "cook line", employer: "CAFE AMI" }));
    expect(leadGroupKey({ title: "Cook", employer: null })).toBe("cook|");
  });

  it("groups by title + company, keeping each city's own link, in arrival order", () => {
    const groups = groupLeads([
      lead("Cleaner", "Acme", "Laval, QC"),
      lead("Cook", "Bistro", "Montréal, QC"),
      lead("CLEANER", "acme", "Longueuil, QC"),
      lead("Cleaner", "Other Co", "Laval, QC"),
      lead("Cleaner!", "Acme.", "Québec, QC")
    ]);
    expect(groups.map((g) => [g.lead.title, g.locations.length])).toEqual([
      ["Cleaner", 3],
      ["Cook", 1],
      ["Cleaner", 1]
    ]);
    expect(groups[0]!.locations.map((l) => [l.areaLabel, l.url])).toEqual([
      ["Laval, QC", "https://example.com/Laval, QC"],
      ["Longueuil, QC", "https://example.com/Longueuil, QC"],
      ["Québec, QC", "https://example.com/Québec, QC"]
    ]);
  });

  it("the same city twice in one group is listed once", () => {
    const groups = groupLeads([lead("Driver", "Go", "Laval, QC", "https://a"), lead("Driver", "Go", "laval qc", "https://b")]);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.locations).toHaveLength(1);
    expect(groups[0]!.locations[0]!.url).toBe("https://a");
  });

  it("the card says 'N locations' in every language and folds long city lists", () => {
    expect(en["fw.locations"]).toBe("{count} locations");
    expect(fr["fw.locations"]).toBe("{count} lieux");
    expect(ar["fw.locations"]).toBe("{count} مواقع");
    for (const m of [en, fr, ar]) expect(m["fw.moreLocations"]).toContain("{count}");
    const page = src("./find-work/FindWork.tsx");
    expect(page).toContain("groupLeads(leads ?? [])");
    expect(page).toContain('t("fw.locations", { count: locations.length })');
    expect(page).toContain("<details");
    expect(page).toContain("<LeadApply lead={l} arrow={arrow} />");
  });
});

describe("90. the Map tab is a real map of Québec with city pins (no 'You' radar)", () => {
  it("projects like standard web map tiles", () => {
    expect(projectX(-180, 0)).toBe(0);
    expect(projectX(180, 0)).toBe(256);
    expect(projectY(0, 0)).toBeCloseTo(128, 6);
    expect(projectX(0, 3)).toBe(1024);
  });

  it("with no pins it shows southern Québec; one city still shows its surroundings", () => {
    expect(boundsFor([])).toEqual(QUEBEC_BOUNDS);
    const one = boundsFor([{ latitude: 45.5, longitude: -73.57 }]);
    expect(one.north - one.south).toBeGreaterThan(0.8);
    expect(one.east - one.west).toBeGreaterThan(1.2);
    const withQc = boundsFor([{ latitude: 45.5, longitude: -73.57 }], true);
    expect(withQc).toEqual(QUEBEC_BOUNDS);
  });

  it("picks a zoom that fits every pin and places pins inside the view", () => {
    const pins = [
      { id: "Montréal", latitude: 45.5019, longitude: -73.5674 },
      { id: "Québec", latitude: 46.8139, longitude: -71.208 },
      { id: "Gatineau", latitude: 45.4765, longitude: -75.7013 }
    ];
    const view = osmView(pins, { withQuebec: false });
    expect(view.zoom).toBe(zoomFor(boundsFor(pins)));
    expect(view.zoom).toBeGreaterThanOrEqual(5);
    for (const p of view.pins) {
      expect(p.leftPct).toBeGreaterThan(0);
      expect(p.leftPct).toBeLessThan(100);
      expect(p.topPct).toBeGreaterThan(0);
      expect(p.topPct).toBeLessThan(100);
    }
    // Gatineau is west of Montréal, which is west of Québec City; Québec City is the northernmost.
    const at = (id: string) => view.pins.find((p) => p.pin.id === id)!;
    expect(at("Gatineau").leftPct).toBeLessThan(at("Montréal").leftPct);
    expect(at("Montréal").leftPct).toBeLessThan(at("Québec").leftPct);
    expect(at("Québec").topPct).toBeLessThan(at("Montréal").topPct);
    expect(view.tiles.length).toBeGreaterThan(0);
    expect(view.tiles.every((t) => t.url.startsWith(`https://tile.openstreetmap.org/${view.zoom}/`))).toBe(true);
  });

  it("Find work uses the Québec map with OpenStreetMap credit, not the radar around 'You'", () => {
    const page = src("./find-work/FindWork.tsx");
    expect(page).toContain("<QuebecJobsMap");
    expect(page).not.toContain("MarketplaceMap");
    const map = src("./find-work/QuebecJobsMap.tsx");
    expect(map).toContain("openstreetmap.org/copyright");
    expect(map).not.toContain("map.you");
    for (const m of [en, fr, ar]) {
      expect(m["fw.mapAria"]).toContain("{count}");
      expect(m["fw.mapPinAria"]).toContain("{city}");
    }
  });
});

describe("91. the SMS consent no longer mentions password resets (passwords were removed)", () => {
  it("in English, French and Arabic", () => {
    expect(en["hr.smsConsent"]).not.toMatch(/password/i);
    expect(fr["hr.smsConsent"]).not.toMatch(/mot de passe/i);
    expect(ar["hr.smsConsent"]).not.toContain("كلمة المرور");
    expect(en["hr.smsConsent"]).toContain("(verification codes, job offers and shift reminders)");
  });

  it("the mobile app says the same", () => {
    const mobile = readFileSync(new URL("../../mobile/src/i18n/strings.ts", import.meta.url), "utf8");
    const web = readFileSync(new URL("../../mobile/src/i18n/webCopy.ts", import.meta.url), "utf8");
    for (const text of [mobile, web]) {
      expect(text).not.toContain("password resets");
      expect(text).not.toContain("réinitialisation de mot de passe");
      expect(text).not.toContain("إعادة تعيين كلمة المرور،");
    }
    expect(mobile).toContain(en["hr.smsConsent"]!);
  });
});

describe("92. the 'What work?' placeholder fits a 375px phone", () => {
  it("is short in every language", () => {
    expect(en["home.whatPh"]).toBe("What work? e.g. kitchen");
    expect(fr["home.whatPh"]).toBe("Quel travail? ex. cuisine");
    expect(ar["home.whatPh"]).toBe("أي عمل؟ مثل مطبخ");
    for (const m of [en, fr, ar]) expect((m["home.whatPh"] ?? "").length).toBeLessThanOrEqual(26);
  });
});

describe("93. links show plain text (no logo letters inside a link)", () => {
  it("'Hire on Joblop' is plain text so its underline does not break", () => {
    const landing = src("./LandingPanel.tsx");
    expect(landing).toContain('<a href={EMPLOYER_URL}>{t("home.empLink")}</a>');
    // No link anywhere on the landing wraps the logo-styled wordmark.
    expect(landing).not.toMatch(/<a [^>]*>\{withBrand\(/);
  });
});
