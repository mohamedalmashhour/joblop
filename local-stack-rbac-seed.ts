import { readFileSync } from "node:fs";
import { createPrismaClient } from "@rwos/database";
import { phase01AccessRoles, phase01PermissionKeys, phase01RolePermissionMappings } from "./packages/database/src/catalogue";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error("RBAC_SEED_FAIL no DATABASE_URL"); process.exit(1); }
  const client = createPrismaClient(url);

  for (const accessRole of phase01AccessRoles) {
    await client.accessRoleDefinition.upsert({
      where: { key: accessRole.key },
      create: { key: accessRole.key, scope: accessRole.scope, status: "active", description: accessRole.description, isSystem: true },
      update: { scope: accessRole.scope, status: "active", description: accessRole.description, isSystem: true }
    });
  }
  for (const permissionKey of phase01PermissionKeys) {
    await client.permissionDefinition.upsert({
      where: { key: permissionKey },
      create: { key: permissionKey, phase: "foundation_phase_01", implemented: true, description: `Phase 01 permission: ${permissionKey}` },
      update: { phase: "foundation_phase_01", implemented: true, description: `Phase 01 permission: ${permissionKey}` }
    });
  }
  for (const mapping of phase01RolePermissionMappings) {
    const accessRole = await client.accessRoleDefinition.findUniqueOrThrow({ where: { key: mapping.accessRoleKey } });
    for (const permissionKey of mapping.permissionKeys) {
      const permission = await client.permissionDefinition.findUniqueOrThrow({ where: { key: permissionKey } });
      await client.accessRolePermission.upsert({
        where: { accessRoleDefinitionId_permissionDefinitionId: { accessRoleDefinitionId: accessRole.id, permissionDefinitionId: permission.id } },
        create: { accessRoleDefinitionId: accessRole.id, permissionDefinitionId: permission.id },
        update: {}
      });
    }
  }
  // Grant employer-a ORGANIZATION_OWNER in Org A so the "Create staffing request" flow authorizes.
  // Without an active membership + an org-owner access role (which holds job_request.create),
  // createDraft returns 403. Org A also starts pending_review, so activate it (the authorization
  // resolver only counts memberships whose organization.status is active).
  const seed = JSON.parse(readFileSync("local-stack-seed.json", "utf8"));
  const orgAId: string | undefined = seed.orgAId;
  const employer = await client.user.findFirst({ where: { emailNormalized: { contains: "employer-a" } } });
  if (orgAId && employer) {
    await client.employerOrganization.update({ where: { id: orgAId }, data: { status: "active" } });
    const ownerRole = await client.accessRoleDefinition.findUnique({ where: { key: "ORGANIZATION_OWNER" } });
    let membership = await client.organizationMembership.findFirst({ where: { organizationId: orgAId, userId: employer.id } });
    if (!membership) {
      membership = await client.organizationMembership.create({ data: { organizationId: orgAId, userId: employer.id, status: "active", acceptedAt: new Date() } });
    } else {
      membership = await client.organizationMembership.update({ where: { id: membership.id }, data: { status: "active", acceptedAt: membership.acceptedAt ?? new Date(), revokedAt: null, expiredAt: null } });
    }
    if (ownerRole) {
      await client.membershipAccessRole.upsert({
        where: { membershipId_accessRoleDefinitionId: { membershipId: membership.id, accessRoleDefinitionId: ownerRole.id } },
        create: { membershipId: membership.id, accessRoleDefinitionId: ownerRole.id },
        update: { revokedAt: null }
      });
    }
    console.log("MEMBERSHIP_GRANT_OK", JSON.stringify({ org: orgAId, user: employer.id, role: "ORGANIZATION_OWNER" }));
  } else {
    console.log("MEMBERSHIP_GRANT_SKIPPED", JSON.stringify({ orgAId, employer: !!employer }));
  }

  const geo = await client.residence.updateMany({
    where: { name: { contains: "Sunrise of Oak Hill" } },
    data: { latitude: 45.5617, longitude: -73.7120, postalCode: "H7V1A1", geocodePrecision: "rooftop", geocodeProvider: "seed", geocodeResolvedAt: new Date() }
  });
  await client.$disconnect();
  console.log("RBAC_SEED_OK geocoded=" + geo.count);
}
main().catch((e) => { console.error("RBAC_SEED_FAIL", e); process.exit(1); });
