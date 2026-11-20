import { randomUUID } from "node:crypto";
import { normalizeEmail } from "@rwos/auth";

export type FirstStaffAdminOutcome =
  | "granted"
  | "production_refused"
  | "invalid_release"
  | "admin_exists"
  | "account_not_found"
  | "account_not_active"
  | "role_missing";

type GrantTransaction = {
  $executeRaw(strings: TemplateStringsArray, ...values: unknown[]): Promise<number>;
  platformAccessGrant: {
    findFirst(args: unknown): Promise<{ userId: string } | null>;
    create(args: unknown): Promise<unknown>;
  };
  accessRoleDefinition: {
    findUnique(args: unknown): Promise<{ id: string; scope: string; status: string } | null>;
  };
  user: { findUnique(args: unknown): Promise<{ id: string; status: string } | null> };
  auditActorReference: { create(args: unknown): Promise<{ id: string }> };
  auditEvent: { create(args: unknown): Promise<unknown> };
};
type GrantClient = { $transaction<T>(work: (transaction: GrantTransaction) => Promise<T>): Promise<T> };

// Gives staff access to one account that already exists. This is the separately designed recovery
// route in docs/runbooks/FIRST_PLATFORM_ADMIN_BOOTSTRAP.md: it creates no account and sets no
// password, works only while no staff administrator exists, and is run by the owner from the host.
export async function grantFirstStaffAdmin(
  prismaClient: unknown,
  input: { email: string; environment: string; releaseSha: string; now: Date }
): Promise<FirstStaffAdminOutcome> {
  if (input.environment === "production") return "production_refused";
  if (!/^[0-9a-f]{40}$/.test(input.releaseSha)) return "invalid_release";
  const prisma = prismaClient as GrantClient;
  return prisma.$transaction(async (transaction) => {
    await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended('rwos:first-staff-admin-grant', 0))`;
    const existing = await transaction.platformAccessGrant.findFirst({
      where: { accessRole: { key: "PLATFORM_ADMINISTRATOR" } },
      select: { userId: true }
    });
    if (existing) return "admin_exists";
    const role = await transaction.accessRoleDefinition.findUnique({
      where: { key: "PLATFORM_ADMINISTRATOR" },
      select: { id: true, scope: true, status: true }
    });
    if (!role || role.scope !== "platform" || role.status !== "active") return "role_missing";
    const user = await transaction.user.findUnique({
      where: { emailNormalized: normalizeEmail(input.email) },
      select: { id: true, status: true }
    });
    if (!user) return "account_not_found";
    if (user.status !== "active") return "account_not_active";
    await transaction.platformAccessGrant.create({
      data: {
        userId: user.id,
        accessRoleDefinitionId: role.id,
        releaseSha: input.releaseSha,
        grantedAt: input.now
      }
    });
    const actor = await transaction.auditActorReference.create({
      data: { actorType: "system", displayLabel: "First staff administrator grant" }
    });
    await transaction.auditEvent.create({
      data: {
        actorReferenceId: actor.id,
        entityType: "platform_admin_bootstrap",
        entityId: user.id,
        entityPublicReference: null,
        action: "platform_admin.first_grant",
        priorState: null,
        newState: "granted",
        reason: `environment=${input.environment};release=${input.releaseSha}`,
        source: "system",
        correlationId: randomUUID(),
        policyVersion: "first-staff-admin-grant-v1",
        createdAt: input.now
      }
    });
    return "granted";
  });
}
