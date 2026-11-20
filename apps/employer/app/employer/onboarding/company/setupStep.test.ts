import { describe, expect, it } from "vitest";
import { resumeStep } from "./setupStep";

describe("resumeStep", () => {
  it("starts a new account at the company step", () => {
    expect(resumeStep(false, 0)).toBe("company");
  });

  it("returns someone with a company but no site to the site step", () => {
    expect(resumeStep(true, 0)).toBe("residence");
  });

  it("treats a company with a site as set up", () => {
    expect(resumeStep(true, 1)).toBe("done");
  });
});
