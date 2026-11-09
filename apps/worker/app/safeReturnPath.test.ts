import { describe, expect, it } from "vitest";
import { publicJobPath, safeReturnPath, signUpReturningTo } from "./safeReturnPath";

describe("safeReturnPath (no open redirect)", () => {
  it("keeps paths on this site", () => {
    expect(safeReturnPath("/job/JR-2026-000123")).toBe("/job/JR-2026-000123");
    expect(safeReturnPath("/jobs/abc?place=Laval#top")).toBe("/jobs/abc?place=Laval#top");
    expect(safeReturnPath("/job-scanner?q=cook")).toBe("/job-scanner?q=cook");
  });

  it("refuses anything that could leave the site", () => {
    for (const bad of [
      "https://evil.example/x",
      "//evil.example/x",
      "/\\evil.example/x",
      "\\\\evil.example",
      "/%5Cevil.example".replace("%5C", "\\"),
      " /job/1",
      "/job/1\n",
      "/\tjob",
      "javascript:alert(1)",
      "job/1",
      "",
      null,
      42,
      `/${"a".repeat(600)}`
    ]) {
      expect(safeReturnPath(bad)).toBeNull();
    }
  });

  it("normalizes dot segments without leaving the site", () => {
    expect(safeReturnPath("/a/../job/1")).toBe("/job/1");
    expect(safeReturnPath("/..//evil.example")).toBeNull();
  });

  it("builds the public job path and the sign-up link back to it", () => {
    expect(publicJobPath("JR-2026-000123")).toBe("/job/JR-2026-000123");
    expect(signUpReturningTo("/job/JR-2026-000123")).toBe("/?next=%2Fjob%2FJR-2026-000123#auth-card");
    expect(signUpReturningTo("/job/JR-2026-000123", "signin")).toBe("/?next=%2Fjob%2FJR-2026-000123&tab=signin#auth-card");
    expect(signUpReturningTo("https://evil.example")).toBe("/?next=%2F#auth-card");
  });
});
