import { describe, expect, it } from "vitest";
import { currentPayrollCalculations } from "./currentPayrollCalculations";

const NONE = "00000000-0000-0000-0000-000000000000";

describe("current payroll calculations", () => {
  it("keeps only the latest revision of an adjusted calculation", () => {
    const rows = [
      { id: "a", familyRootId: "f", revision: 1 },
      { id: "c", familyRootId: "f", revision: 3 },
      { id: "b", familyRootId: "f", revision: 2 }
    ];
    expect(currentPayrollCalculations(rows).map((c) => c.id)).toEqual(["c"]);
  });

  it("keeps separate families apart", () => {
    const rows = [
      { id: "a", familyRootId: "f", revision: 1 },
      { id: "b", familyRootId: "g", revision: 1 }
    ];
    expect(currentPayrollCalculations(rows).map((c) => c.id).sort()).toEqual(["a", "b"]);
  });

  it("never merges older rows that have no family recorded", () => {
    const rows = [
      { id: "a", familyRootId: NONE, revision: 1 },
      { id: "b", familyRootId: NONE, revision: 1 }
    ];
    expect(currentPayrollCalculations(rows)).toHaveLength(2);
  });
});
