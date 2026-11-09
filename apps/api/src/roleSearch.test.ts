import { describe, expect, it } from "vitest";
import { matchingRoleIds } from "./roleSearch";

const roles = [
  { id: "1", key: "psw", displayLabel: "Personal Support Worker" },
  { id: "2", key: "cook", displayLabel: "Cook" },
  { id: "3", key: "preposé", displayLabel: "Préposé aux bénéficiaires" },
  { id: "4", key: "nurse", displayLabel: "Nurse" }
];

describe("matchingRoleIds", () => {
  it("matches an exact key, or a word in the label, ignoring accents and case", () => {
    expect(matchingRoleIds(roles, "psw")).toEqual(["1"]);
    expect(matchingRoleIds(roles, "Personal Support")).toEqual(["1"]);
    expect(matchingRoleIds(roles, "prepose")).toEqual(["3"]);
    expect(matchingRoleIds(roles, "NURSE")).toEqual(["4"]);
  });

  it("matches nothing for an unknown role (the filter is applied, not dropped)", () => {
    expect(matchingRoleIds(roles, "astronaut")).toEqual([]);
    expect(matchingRoleIds(roles, "  ")).toEqual([]);
  });
});
