import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { EmployerContractDto } from "@rwos/shared";
import { withKnownRoleLabels } from "./ContractSignPanel";

const rate = (roleDefinitionId: string, roleLabel: string | null) => ({
  roleDefinitionId,
  roleLabel,
  hourlyRateMinor: 3000,
  currency: "CAD"
});

const contract = (roleRates: ReturnType<typeof rate>[], signedAt: string | null) =>
  ({ version: "2026-Q4", currency: "CAD", effectiveFrom: null, signedAt, roleRates }) as unknown as EmployerContractDto;

describe("contract role names after signing", () => {
  it("keeps the role names the page already showed when the sign response has none", () => {
    const before = contract([rate("r1", "Farm worker"), rate("r2", "Cook")], null);
    const signed = contract([rate("r1", null), rate("r2", null)], "2026-11-11T12:00:00Z");
    const merged = withKnownRoleLabels(signed, before);
    expect(merged?.roleRates.map((r) => r.roleLabel)).toEqual(["Farm worker", "Cook"]);
    expect(merged?.signedAt).toBe("2026-11-11T12:00:00Z");
  });

  it("prefers a name the response does carry, and leaves unknown roles empty", () => {
    const before = contract([rate("r1", "Farm worker")], null);
    const signed = contract([rate("r1", "Farmhand"), rate("r9", null)], "2026-11-11T12:00:00Z");
    expect(withKnownRoleLabels(signed, before)?.roleRates.map((r) => r.roleLabel)).toEqual(["Farmhand", null]);
  });

  it("uses the merge when the sign succeeds", () => {
    const source = readFileSync(join(__dirname, "ContractSignPanel.tsx"), "utf8");
    expect(source).toContain("withKnownRoleLabels(payload.contract ?? null");
  });
});

describe("assigned workers, attendance and timesheets", () => {
  it("no longer link to the assignment-detail page the live site blocks", () => {
    for (const file of [
      ["..", "assignments", "EmployerAssignmentsPanel.tsx"],
      ["..", "attendance", "EmployerAttendancePanel.tsx"],
      ["..", "timesheets", "EmployerTimesheetsPanel.tsx"]
    ]) {
      expect(readFileSync(join(__dirname, ...file), "utf8")).not.toContain("/employer/assignments/detail");
    }
  });
});

describe("request detail after a cancel", () => {
  it("refreshes quietly and shows the request as cancelled", () => {
    const detail = readFileSync(join(__dirname, "..", "calendar", "request", "ClientRequestDetailPanel.tsx"), "utf8");
    expect(detail).toContain("setCancelledHere(true);");
    expect(detail).toContain("void load(true);");
    expect(detail).toContain('{ ...state.data, status: "cancelled" }');
    const cancel = readFileSync(join(__dirname, "..", "calendar", "request", "CancelRequestPanel.tsx"), "utf8");
    expect(cancel).toContain("onCancelled?.();");
  });
});
