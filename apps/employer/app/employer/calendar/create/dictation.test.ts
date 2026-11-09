import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { appendDictation, dictationErrorKey, speechLanguage } from "./dictation";
import { ar, en, fr } from "../../../i18n/messages";

describe("appendDictation", () => {
  it("fills an empty box", () => {
    expect(appendDictation("", " harvest the greenhouse ")).toBe("harvest the greenhouse");
  });

  it("adds a space before new words", () => {
    expect(appendDictation("Day shift", "in Laval")).toBe("Day shift in Laval");
    expect(appendDictation("Day shift ", "in Laval")).toBe("Day shift in Laval");
  });

  it("leaves the text alone when nothing was heard", () => {
    expect(appendDictation("Day shift", "   ")).toBe("Day shift");
  });

  it("keeps to the box's length limit", () => {
    expect(appendDictation("abcd", "efgh", 6)).toBe("abcd e");
  });
});

describe("dictationErrorKey", () => {
  it("tells the user when the microphone is blocked", () => {
    expect(dictationErrorKey("not-allowed")).toBe("create.dictateBlocked");
    expect(dictationErrorKey("service-not-allowed")).toBe("create.dictateBlocked");
  });

  it("stays quiet when the user stops or says nothing", () => {
    expect(dictationErrorKey("aborted")).toBeNull();
    expect(dictationErrorKey("no-speech")).toBeNull();
  });

  it("gives a general message for anything else", () => {
    expect(dictationErrorKey("network")).toBe("create.dictateFailed");
  });
});

describe("speech language and privacy notice", () => {
  it("asks the browser for Canadian English or French, never a bare en/fr", () => {
    expect(speechLanguage("en-CA")).toBe("en-CA");
    expect(speechLanguage("fr-CA")).toBe("fr-CA");
    expect(speechLanguage("fr")).toBe("fr-CA");
    expect(speechLanguage("en")).toBe("en-CA");
    expect(speechLanguage("ar")).toBe("ar");
  });

  it("shows the speech-service notice next to the Speak button in all three languages", () => {
    expect(en["create.dictatePrivacy"]).toBe("Your browser's speech service (Google or Apple) hears what you say.");
    expect(fr["create.dictatePrivacy"]).toMatch(/Google ou Apple/);
    expect(ar["create.dictatePrivacy"]).toMatch(/Google أو Apple/);
    const button = readFileSync(join(__dirname, "DictationButton.tsx"), "utf8");
    expect(button).toContain('t("create.dictatePrivacy")');
    expect(button).toContain("session.lang = speechLanguage(locale)");
  });
});
