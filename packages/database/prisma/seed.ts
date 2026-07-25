import {
  developmentWorkGroups,
  phase01AccessRoles,
  phase01PermissionKeys,
  phase01RolePermissionMappings
} from "../src/catalogue";
import { createPrismaClient } from "../src/foundation";

const prisma = createPrismaClient();

export async function seedDevelopmentCatalogue(client = prisma) {
  for (const workGroup of developmentWorkGroups) {
    const storedWorkGroup = await client.workGroup.upsert({
      where: { key: workGroup.key },
      create: {
        key: workGroup.key,
        displayLabel: workGroup.displayLabel,
        displayOrder: workGroup.displayOrder,
        iconKey: workGroup.iconKey,
        qualificationSummary: workGroup.qualificationSummary,
        safetyRequirementSummary: workGroup.safetyRequirementSummary,
        defaultTemplateKey: workGroup.defaultTemplateKey,
        status: "active"
      },
      update: {
        displayLabel: workGroup.displayLabel,
        displayOrder: workGroup.displayOrder,
        iconKey: workGroup.iconKey,
        qualificationSummary: workGroup.qualificationSummary,
        safetyRequirementSummary: workGroup.safetyRequirementSummary,
        defaultTemplateKey: workGroup.defaultTemplateKey,
        status: "active"
      }
    });

    for (const roleDefinition of workGroup.roles) {
      await client.roleDefinition.upsert({
        where: { key: roleDefinition.key },
        create: {
          key: roleDefinition.key,
          displayLabel: roleDefinition.displayLabel,
          displayOrder: roleDefinition.displayOrder,
          localizedLabelKey: roleDefinition.localizedLabelKey,
          qualificationSummary: roleDefinition.qualificationSummary,
          safetyRequirementSummary: roleDefinition.safetyRequirementSummary,
          adminConfigurable: false,
          status: "active",
          workGroupId: storedWorkGroup.id
        },
        update: {
          displayLabel: roleDefinition.displayLabel,
          displayOrder: roleDefinition.displayOrder,
          localizedLabelKey: roleDefinition.localizedLabelKey,
          qualificationSummary: roleDefinition.qualificationSummary,
          safetyRequirementSummary: roleDefinition.safetyRequirementSummary,
          adminConfigurable: false,
          status: "active",
          workGroupId: storedWorkGroup.id
        }
      });
    }
  }

  for (const accessRole of phase01AccessRoles) {
    await client.accessRoleDefinition.upsert({
      where: { key: accessRole.key },
      create: {
        key: accessRole.key,
        scope: accessRole.scope,
        status: "active",
        description: accessRole.description,
        isSystem: true
      },
      update: {
        scope: accessRole.scope,
        status: "active",
        description: accessRole.description,
        isSystem: true
      }
    });
  }

  for (const permissionKey of phase01PermissionKeys) {
    await client.permissionDefinition.upsert({
      where: { key: permissionKey },
      create: {
        key: permissionKey,
        phase: "foundation_phase_01",
        implemented: true,
        description: `Phase 01 permission: ${permissionKey}`
      },
      update: {
        phase: "foundation_phase_01",
        implemented: true,
        description: `Phase 01 permission: ${permissionKey}`
      }
    });
  }

  for (const mapping of phase01RolePermissionMappings) {
    const accessRole = await client.accessRoleDefinition.findUniqueOrThrow({
      where: { key: mapping.accessRoleKey }
    });

    for (const permissionKey of mapping.permissionKeys) {
      const permission = await client.permissionDefinition.findUniqueOrThrow({
        where: { key: permissionKey }
      });

      await client.accessRolePermission.upsert({
        where: {
          accessRoleDefinitionId_permissionDefinitionId: {
            accessRoleDefinitionId: accessRole.id,
            permissionDefinitionId: permission.id
          }
        },
        create: {
          accessRoleDefinitionId: accessRole.id,
          permissionDefinitionId: permission.id
        },
        update: {}
      });
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await seedDevelopmentCatalogue();
  await prisma.$disconnect();
}
