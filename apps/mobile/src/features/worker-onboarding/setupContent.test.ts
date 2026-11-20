import { describe, expect, it } from "vitest";
import { agreementVersionFor, classificationLabel, classificationOptions } from "./setupContent";

describe("worker setup content", () => {
  it("offers exactly the two real pay channels", () => {
    expect(classificationOptions.map((o) => o.id)).toEqual(["employee", "contractor"]);
  });

  it("picks the right agreement version per channel", () => {
    const versions = { employee: "emp-9", contractor: "con-9" };
    expect(agreementVersionFor("employee", versions)).toBe("emp-9");
    expect(agreementVersionFor("contractor", versions)).toBe("con-9");
  });

  it("labels the classification with its tax slip", () => {
    expect(classificationLabel("employee")).toBe("Employee (T4)");
    expect(classificationLabel("contractor")).toBe("Independent contractor (T4A)");
    expect(classificationLabel("other")).toBe("other");
  });
});
