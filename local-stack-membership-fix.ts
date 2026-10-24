// LOCAL in-place repair: ensure employer-a's membership(s) in Org A carry the
// ORGANIZATION_OWNER access role (which holds job_request.create) and are active +
// unexpired. Diagnoses first (prints every membership + its roles), then repairs.
// The API re-evaluates authz on every request, so no reboot is needed afterward.
//   Run on the Mac:  cd "/Volumes/Danny SSD/Codex/resident-workforce-os" \
//     && DATABASE_URL="postgresql://$USER@localhost:5432/$(sed -n 's/^DB: //p' local-stack-info.txt)" \
//        node --import tsx local-stack-membership-fix.ts
import { createPrismaClient } from "@rwos/database";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error("MEMBERSHIP_FIX_FAIL no DATABASE_URL"); process.exit(1); }
  const c: any = createPrismaClient(url);

  const employer = await c.user.findFirst({ where: { emailNormalized: { contains: "employer-a" } } });
  if (!employer) { console.log("MEMBERSHIP_FIX no employer-a user"); return; }

  const residence = await c.residence.findFirst({ where: { name: { contains: "Sunrise of Oak Hill" } } });
  const orgId: string | undefined = residence?.organizationId;
  console.log("CONTEXT", JSON.stringify({ employer: employer.id, org: orgId, residence: residence?.id }));

  const before = await c.organizationMembership.findMany({
    where: { userId: employer.id },
    include: { membershipRoles: { include: { accessRole: true } } }
  });
  for (const m of before) {
    console.log("MEMBERSHIP_BEFORE", JSON.stringify({
      id: m.id, org: m.organizationId, status: m.status,
      expiredAt: m.expiredAt, revokedAt: m.revokedAt, suspendedAt: m.suspendedAt, acceptedAt: m.acceptedAt,
      roles: m.membershipRoles.map((r: any) => r.accessRole.key)
    }));
  }

  const owner = await c.accessRoleDefinition.findUnique({ where: { key: "ORGANIZATION_OWNER" } });
  if (!owner) { console.log("MEMBERSHIP_FIX no ORGANIZATION_OWNER role def (run rbac seed first)"); return; }

  const inOrg = before.filter((m: any) => m.organizationId === orgId);
  if (inOrg.length === 0) { console.log("MEMBERSHIP_FIX no membership for employer-a in org", orgId); return; }

  // Make EVERY membership for this user+org valid and owner-roled, so whichever row
  // findFirst(userId, organizationId) returns in the create path has the role.
  for (const m of inOrg) {
    await c.organizationMembership.update({
      where: { id: m.id },
      data: { status: "active", acceptedAt: m.acceptedAt ?? new Date(), revokedAt: null, expiredAt: null, suspendedAt: null }
    });
    await c.membershipAccessRole.upsert({
      where: { membershipId_accessRoleDefinitionId: { membershipId: m.id, accessRoleDefinitionId: owner.id } },
      update: {},
      create: { membershipId: m.id, accessRoleDefinitionId: owner.id }
    });
  }

  if (orgId) {
    await c.employerOrganization.update({ where: { id: orgId }, data: { status: "active" } })
      .catch((e: any) => console.log("ORG_UPDATE_SKIP", e.message));
  }

  const after = await c.organizationMembership.findMany({
    where: { userId: employer.id, organizationId: orgId },
    include: { membershipRoles: { include: { accessRole: true } } }
  });
  console.log("MEMBERSHIP_AFTER", JSON.stringify(after.map((m: any) => ({
    id: m.id, status: m.status, expiredAt: m.expiredAt,
    roles: m.membershipRoles.map((r: any) => r.accessRole.key)
  }))));
  console.log("MEMBERSHIP_FIX_DONE");
}

main().catch((e) => { console.error("MEMBERSHIP_FIX_ERROR", e); process.exit(1); });
