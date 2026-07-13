import { describe, expect, it } from "vitest";
import { mobileTabs } from "./routes";

describe("mobile foundation navigation", () => {
  it("preserves the approved worker mobile tabs", () => {
    expect(mobileTabs.map((tab) => tab.id)).toEqual([
      "home",
      "available",
      "my-shifts",
      "billing",
      "profile",
      "notifications"
    ]);
  });
});
