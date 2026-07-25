import { describe, expect, it } from "vitest";
import {
  developmentWorkGroups,
  phase01AccessRoles,
  phase01PermissionKeys,
  phase01RolePermissionMappings
} from "./catalogue";
import { seedDevelopmentCatalogue } from "../prisma/seed";

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
    expect(phase01PermissionKeys).toContain("dispatch.prepare_offer");
    expect(phase01PermissionKeys).toContain("worker_offer.create");
    expect(phase01PermissionKeys).toContain("worker_offer.respond");
    expect(phase01PermissionKeys).toContain("assignment.create");
    expect(phase01PermissionKeys).toContain("assignment.worker_acknowledge");
    expect(phase01PermissionKeys).toContain("audit.read");
    expect(phase01PermissionKeys).toContain("job_request.admin_review");
    expect(phase01PermissionKeys).not.toContain("job_request.admin_read");
    expect(phase01PermissionKeys).not.toContain("attendance.create");
    expect(phase01PermissionKeys).not.toContain("payment.execute");
  });

  it("declares explicit role-permission mappings for dispatch and worker offer boundaries", () => {
    const platformAdmin = phase01RolePermissionMappings.find(
      (mapping) => mapping.accessRoleKey === "PLATFORM_ADMINISTRATOR"
    );
    const dispatcher = phase01RolePermissionMappings.find(
      (mapping) => mapping.accessRoleKey === "DISPATCHER"
    );
    const worker = phase01RolePermissionMappings.find(
      (mapping) => mapping.accessRoleKey === "WORKER_ACCESS"
    );

    expect(platformAdmin?.permissionKeys).toContain("platform.supervise");
    expect(platformAdmin?.permissionKeys).toContain("job_request.approve_for_dispatch");
    expect(platformAdmin?.permissionKeys).toContain("worker_offer.approve");
    expect(platformAdmin?.permissionKeys).toContain("assignment.create");
    expect(dispatcher?.permissionKeys).toContain("dispatch.prepare_offer");
    expect(dispatcher?.permissionKeys).toContain("worker_offer.send");
    expect(dispatcher?.permissionKeys).toContain("assignment.attendance_handoff");
    expect(dispatcher?.permissionKeys).not.toContain("worker_offer.supervise");
    expect(dispatcher?.permissionKeys).not.toContain("assignment.supervise");
    expect(worker?.permissionKeys).toEqual([
      "worker_offer.respond",
      "assignment.worker_read",
      "assignment.worker_acknowledge",
      "assignment.worker_withdraw"
    ]);
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

  it("seeds WorkGroups idempotently without overwriting owner-edited presentation or inactive state", async () => {
    const client = new FakeCatalogueClient();

    await seedDevelopmentCatalogue(client as never);
    await seedDevelopmentCatalogue(client as never);

    expect(client.workGroups).toHaveLength(4);
    expect(client.workGroups.map((workGroup) => workGroup.key)).toEqual([
      "kitchen",
      "care_nursing",
      "housekeeping_support",
      "maintenance"
    ]);
    expect(client.workGroups.map((workGroup) => workGroup.displayOrder)).toEqual([10, 20, 30, 40]);
    expect(client.createdWorkGroups).toBe(4);
  });

  it("preserves existing WorkGroup labels, order, and inactive lifecycle state during seed", async () => {
    const client = new FakeCatalogueClient();
    client.workGroups.push({
      id: "existing-kitchen",
      key: "kitchen",
      displayLabel: "Owner Edited Kitchen",
      displayOrder: 99,
      iconKey: "custom-icon",
      qualificationSummary: "Owner edited summary",
      safetyRequirementSummary: "Owner edited safety",
      defaultTemplateKey: "owner_template",
      status: "inactive"
    });

    await seedDevelopmentCatalogue(client as never);

    expect(client.workGroups.find((workGroup) => workGroup.key === "kitchen")).toMatchObject({
      displayLabel: "Owner Edited Kitchen",
      displayOrder: 99,
      iconKey: "custom-icon",
      status: "inactive"
    });
    expect(client.workGroups).toHaveLength(4);
  });

  it("seeds RoleDefinitions idempotently without duplicates and keeps WorkGroup mapping stable", async () => {
    const client = new FakeCatalogueClient();

    await seedDevelopmentCatalogue(client as never);
    await seedDevelopmentCatalogue(client as never);

    expect(client.roleDefinitionList()).toHaveLength(17);
    expect(client.createdRoleDefinitions).toBe(17);
    expect(client.roleDefinitionList().map((roleDefinition) => roleDefinition.key)).toEqual([
      "chef",
      "sous_chef",
      "cook",
      "kitchen_helper",
      "dishwasher",
      "nurse",
      "licensed_practical_nurse",
      "personal_support_worker",
      "care_aide",
      "housekeeper",
      "laundry_worker",
      "dining_room_aide",
      "general_support",
      "general_maintenance",
      "repair_technician",
      "facility_support",
      "emergency_maintenance"
    ]);
    expect(
      client.roleDefinitionList().find((roleDefinition) => roleDefinition.key === "chef")
        ?.workGroupId
    ).toBe("work-group-1");
  });

  it("preserves owner-edited RoleDefinition presentation, inactive lifecycle, and WorkGroup relationship during seed", async () => {
    const client = new FakeCatalogueClient();
    client.workGroups.push({
      id: "existing-kitchen",
      key: "kitchen",
      displayLabel: "Kitchen",
      displayOrder: 10,
      iconKey: "utensils",
      qualificationSummary: null,
      safetyRequirementSummary: null,
      defaultTemplateKey: null,
      status: "active"
    });
    client.addRoleDefinition({
      id: "existing-chef",
      key: "chef",
      workGroupId: "legacy-work-group",
      displayLabel: "Owner Edited Chef",
      displayOrder: 99,
      localizedLabelKey: "owner.role.chef",
      qualificationSummary: "Owner edited qualification",
      safetyRequirementSummary: "Owner edited safety",
      adminConfigurable: true,
      status: "inactive"
    });

    await seedDevelopmentCatalogue(client as never);

    expect(
      client.roleDefinitionList().find((roleDefinition) => roleDefinition.key === "chef")
    ).toMatchObject({
      workGroupId: "legacy-work-group",
      displayLabel: "Owner Edited Chef",
      displayOrder: 99,
      status: "inactive"
    });
  });
});

type FakeWorkGroup = {
  id: string;
  key: string;
  displayLabel: string;
  displayOrder: number;
  iconKey: string | null;
  qualificationSummary: string | null;
  safetyRequirementSummary: string | null;
  defaultTemplateKey: string | null;
  status: "active" | "inactive";
};

class FakeCatalogueClient {
  workGroups: FakeWorkGroup[] = [];
  createdWorkGroups = 0;
  createdRoleDefinitions = 0;
  private roleDefinitions = new Map<
    string,
    {
      id: string;
      key: string;
      workGroupId: string;
      displayLabel: string;
      displayOrder: number;
      localizedLabelKey: string | null;
      qualificationSummary: string | null;
      safetyRequirementSummary: string | null;
      adminConfigurable: boolean;
      status: "active" | "inactive";
    }
  >();
  private accessRoles = new Map<string, { id: string; key: string }>();
  private permissions = new Map<string, { id: string; key: string }>();
  private rolePermissions = new Set<string>();

  workGroup = {
    findUnique: async (input: { where: { key: string } }) =>
      this.workGroups.find((workGroup) => workGroup.key === input.where.key) ?? null,
    create: async (input: { data: Omit<FakeWorkGroup, "id"> }) => {
      const workGroup = {
        id: `work-group-${this.workGroups.length + 1}`,
        ...input.data
      };

      this.createdWorkGroups += 1;
      this.workGroups.push(workGroup);

      return workGroup;
    }
  };

  roleDefinition = {
    findUnique: async (input: { where: { key: string } }) =>
      this.roleDefinitions.get(input.where.key) ?? null,
    create: async (input: {
      data: {
        key: string;
        workGroupId: string;
        displayLabel: string;
        displayOrder: number;
        localizedLabelKey: string | null;
        qualificationSummary: string | null;
        safetyRequirementSummary: string | null;
        adminConfigurable: boolean;
        status: "active";
      };
    }) => {
      const roleDefinition = {
        id: `role-definition-${this.roleDefinitions.size + 1}`,
        ...input.data
      };

      this.createdRoleDefinitions += 1;
      this.roleDefinitions.set(roleDefinition.key, roleDefinition);

      return roleDefinition;
    }
  };

  addRoleDefinition(roleDefinition: ReturnType<FakeCatalogueClient["roleDefinitionList"]>[number]) {
    this.roleDefinitions.set(roleDefinition.key, roleDefinition);
  }

  roleDefinitionList() {
    return [...this.roleDefinitions.values()];
  }

  accessRoleDefinition = {
    upsert: async (input: { where: { key: string }; create: { key: string } }) => {
      const existing = this.accessRoles.get(input.where.key);

      if (existing) return existing;

      const accessRole = { id: `access-role-${this.accessRoles.size + 1}`, key: input.create.key };
      this.accessRoles.set(accessRole.key, accessRole);

      return accessRole;
    },
    findUniqueOrThrow: async (input: { where: { key: string } }) => {
      const accessRole = this.accessRoles.get(input.where.key);

      if (!accessRole) throw new Error("TEST_ACCESS_ROLE_NOT_FOUND");

      return accessRole;
    }
  };

  permissionDefinition = {
    upsert: async (input: { where: { key: string }; create: { key: string } }) => {
      const existing = this.permissions.get(input.where.key);

      if (existing) return existing;

      const permission = { id: `permission-${this.permissions.size + 1}`, key: input.create.key };
      this.permissions.set(permission.key, permission);

      return permission;
    },
    findUniqueOrThrow: async (input: { where: { key: string } }) => {
      const permission = this.permissions.get(input.where.key);

      if (!permission) throw new Error("TEST_PERMISSION_NOT_FOUND");

      return permission;
    }
  };

  accessRolePermission = {
    upsert: async (input: {
      where: {
        accessRoleDefinitionId_permissionDefinitionId: {
          accessRoleDefinitionId: string;
          permissionDefinitionId: string;
        };
      };
      create: { accessRoleDefinitionId: string; permissionDefinitionId: string };
    }) => {
      const key = `${input.where.accessRoleDefinitionId_permissionDefinitionId.accessRoleDefinitionId}:${input.where.accessRoleDefinitionId_permissionDefinitionId.permissionDefinitionId}`;
      this.rolePermissions.add(key);

      return input.create;
    }
  };
}
