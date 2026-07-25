import { describe, expect, it } from "vitest";
import {
  developmentWorkGroups,
  phase01AccessRoles,
  phase01PermissionKeys,
  phase01RolePermissionMappings
} from "./catalogue";

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
    expect(accessRoleKeys).toContain("ORGANIZATION_OWNER");
    expect(accessRoleKeys).toContain("PLATFORM_ADMINISTRATOR");
    expect(accessRoleKeys).not.toContain("cook");
  });

  it("declares only approved Phase 01 permissions", () => {
    expect(phase01PermissionKeys).toContain("job_request.approve_for_dispatch");
    expect(phase01PermissionKeys).toContain("audit.read");
    expect(phase01PermissionKeys).toContain("job_request.admin_review");
    expect(phase01PermissionKeys).not.toContain("job_request.admin_read");
    expect(phase01PermissionKeys).not.toContain("assignment.create");
    expect(phase01PermissionKeys).not.toContain("payment.execute");
  });

  it("declares explicit role-permission mappings without activating dispatcher", () => {
    const platformAdmin = phase01RolePermissionMappings.find(
      (mapping) => mapping.accessRoleKey === "PLATFORM_ADMINISTRATOR"
    );
    const dispatcher = phase01RolePermissionMappings.find((mapping) => mapping.accessRoleKey === "DISPATCHER");

    expect(platformAdmin?.permissionKeys).toContain("platform.supervise");
    expect(platformAdmin?.permissionKeys).toContain("job_request.approve_for_dispatch");
    expect(dispatcher?.permissionKeys).toEqual([]);
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
