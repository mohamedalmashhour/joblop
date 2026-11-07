import { describe, expect, it } from "vitest";
import { appendDictation, dictationErrorKey } from "./dictation";

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
