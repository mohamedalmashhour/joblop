import { describe, expect, it } from "vitest";
import { developmentWorkGroups, phase01AccessRoles, phase01PermissionKeys } from "./catalogue";

describe("Phase 01 development catalogue", () => {
  it("keeps the approved global WorkGroup catalogue stable", () => {
    expect(developmentWorkGroups.map((group) => group.key)).toEqual([
      "kitchen",
      "care_nursing",
      "housekeeping_support",
      "maintenance"
    ]);
  });

  it("separates operational roles from authorization roles", () => {
    const operationalRoleKeys = developmentWorkGroups.flatMap((group) =>
      group.roles.map((roleDefinition) => roleDefinition.key)
    );
    const accessRoleKeys = phase01AccessRoles.map((accessRole) => accessRole.key);

    expect(operationalRoleKeys).toContain("cook");
    expect(operationalRoleKeys).toContain("personal_support_worker");
    expect(accessRoleKeys).toContain("EMPLOYER_OWNER");
    expect(accessRoleKeys).not.toContain("cook");
  });

  it("declares only approved Phase 01 permissions", () => {
    expect(phase01PermissionKeys).toContain("job_request.approve_for_dispatch");
    expect(phase01PermissionKeys).toContain("audit_event.read");
    expect(phase01PermissionKeys).not.toContain("assignment.create");
    expect(phase01PermissionKeys).not.toContain("payment.execute");
  });

  it("keeps catalogue keys unique and deterministic", () => {
    const roleKeys = developmentWorkGroups.flatMap((group) =>
      group.roles.map((roleDefinition) => roleDefinition.key)
    );
    const workGroupOrders = developmentWorkGroups.map((group) => group.displayOrder);

    expect(new Set(developmentWorkGroups.map((group) => group.key)).size).toBe(
      developmentWorkGroups.length
    );
    expect(new Set(roleKeys).size).toBe(roleKeys.length);
    expect(workGroupOrders).toEqual([...workGroupOrders].sort((left, right) => left - right));
  });
});
