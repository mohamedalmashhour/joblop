import { describe, expect, it } from "vitest";
import { formatReferralCode, normalizeReferralCode } from "./referrals";

describe("formatReferralCode", () => {
  it("produces an 8-char code from the unambiguous alphabet", () => {
    const code = formatReferralCode(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]));
    expect(code).toBe("ABCDEFGH");
    expect(code).toMatch(/^[A-Z2-9]{8}$/);
  });
  it("is deterministic and avoids 0/O/1/I", () => {
    const code = formatReferralCode(new Uint8Array([25, 26, 27, 28, 29, 30, 31, 0]));
    expect(code).not.toMatch(/[01OI]/);
    expect(code).toHaveLength(8);
  });
});

describe("normalizeReferralCode", () => {
  it("upper-cases, strips punctuation/spaces, and accepts a valid 8-char code", () => {
    expect(normalizeReferralCode(" abcd-efgh ")).toBe("ABCDEFGH");
    expect(normalizeReferralCode("ABCDEFGH")).toBe("ABCDEFGH");
  });
  it("rejects wrong-length / empty input", () => {
    expect(normalizeReferralCode("")).toBeNull();
    expect(normalizeReferralCode(null)).toBeNull();
    expect(normalizeReferralCode("SHORT")).toBeNull();
    expect(normalizeReferralCode("WAYTOOLONGCODE")).toBe("WAYTOOLO"); // capped to 8 of the alphabet chars
  });
});
