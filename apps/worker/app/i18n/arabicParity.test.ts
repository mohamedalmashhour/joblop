import { describe, expect, it } from "vitest";
import { dictionaries, en } from "./messages";

// Arabic is typed as Partial so a missing key falls back to English instead of breaking the build.
// That fallback is how English kept showing to Arabic readers before launch, so this test makes every
// English key need an Arabic line too (French is already forced by the type system).
describe("worker Arabic dictionary", () => {
  it("has every English key", () => {
    const ar = dictionaries.ar;
    const missing = (Object.keys(en) as (keyof typeof en)[]).filter((key) => !ar[key]);
    expect(missing).toEqual([]);
  });

  it("keeps every {placeholder} the English line uses", () => {
    const ar = dictionaries.ar;
    const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort();
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      const line = ar[key];
      if (!line) continue;
      // A singular line may say "one" in words instead of {count} (e.g. "وظيفة واحدة"); every other
      // value (a date, an amount, a place) must appear, and Arabic may not add placeholders.
      const expected = placeholders(en[key]).filter((p) => !(p === "{count}" && !line.includes("{count}")));
      expect(placeholders(line), key).toEqual(expected);
    }
  });
});
