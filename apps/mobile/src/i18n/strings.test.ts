import { describe, expect, it } from "vitest";
import { dictionaries, isRtlLocale, LOCALES, translate } from "./strings";

describe("mobile i18n", () => {
  it("translates per locale and falls back to English then the key", () => {
    expect(translate("en", "home.title")).toBe("Welcome to JobLop");
    expect(translate("fr", "nav.home")).toBe("Accueil");
    expect(translate("ar", "nav.home")).toBe("الرئيسية");
    expect(translate("ar", "totally.missing.key")).toBe("totally.missing.key");
  });

  it("marks Arabic (only) as right-to-left", () => {
    expect(isRtlLocale("ar")).toBe(true);
    expect(isRtlLocale("en")).toBe(false);
    expect(isRtlLocale("fr")).toBe(false);
  });

  it("every locale defines the same keys (no missing translations)", () => {
    const base = Object.keys(dictionaries.en).sort();
    for (const l of LOCALES) {
      expect(Object.keys(dictionaries[l]).sort()).toEqual(base);
    }
  });
});
