import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { createPrismaClient } from "@rwos/database";

// Stage 2b.3c-B: the legacy DEFAULT 'CAD' was dropped from three currency columns
// (employer_contracts, employer_cancellation_obligations, payroll_worked_time_references) now that the
// governed runtime always supplies an explicit currency. This suite asserts the DB-level effect:
// those columns are NOT NULL with NO default (so an omitted currency is rejected), while
// employer_capacity_reductions.currency deliberately KEEPS its default (out of scope). Explicit CAD/USD
// still persist verbatim at the DB layer (the DB never enforced country policy — the runtime does).
const databaseUrl = process.env.RWOS_TEST_DATABASE_URL;
const suite = databaseUrl ? describe : describe.skip;

suite("CAD DB default cleanup (Stage 2b.3c-B)", () => {
  const prisma = createPrismaClient(databaseUrl!);
  afterAll(async () => { await prisma.$disconnect(); });

  const defaultOf = async (table: string) => {
    const rows = await prisma.$queryRawUnsafe<{ column_default: string | null; is_nullable: string }[]>(
      `SELECT column_default, is_nullable FROM information_schema.columns WHERE table_name = $1 AND column_name = 'currency'`,
      table
    );
    return rows[0]!;
  };

  it("all four cleaned columns are NOT NULL with NO default → an omitted currency is rejected", async () => {
    // Stage 2b.3c-C added employer_capacity_reductions once its writer became explicit. No non-payment
    // currency column now carries a DB default.
    for (const table of ["employer_contracts", "employer_cancellation_obligations", "payroll_worked_time_references", "employer_capacity_reductions"]) {
      const col = await defaultOf(table);
      expect(col.column_default).toBeNull(); // default removed
      expect(col.is_nullable).toBe("NO"); // still NOT NULL → omitting currency fails
    }
  });

  it("employer_contracts: omitted currency now fails; explicit CAD and USD still persist verbatim", async () => {
    const userId = randomUUID();
    const tag = userId.slice(0, 12);
    await prisma.user.create({ data: { id: userId, publicId: `USR-CAD-${tag}`, emailNormalized: `cad-${userId}@e2e.local`, displayName: "Cad", status: "active" } });
    const org = await prisma.employerOrganization.create({ data: { publicId: `ORG-CAD-${tag}`, legalName: "L", displayName: "CadOrg", status: "active", createdByUserId: userId } });
    const now = new Date().toISOString();

    // Omitted currency → rejected (NOT NULL, no default fills it anymore).
    await expect(
      prisma.$executeRawUnsafe(
        `INSERT INTO employer_contracts (id, organization_id, version, status, activated_at, effective_from, created_by_user_id, created_at, updated_at)
         VALUES ($1,$2,'v-omit','active',$3,$3,$4,$3,$3)`,
        randomUUID(), org.id, now, userId
      )
    ).rejects.toThrow();

    // Explicit CAD → persists "CAD" (unchanged).
    const cadId = randomUUID();
    await prisma.$executeRawUnsafe(
      `INSERT INTO employer_contracts (id, organization_id, version, status, currency, activated_at, effective_from, created_by_user_id, created_at, updated_at)
       VALUES ($1,$2,'v-cad','superseded','CAD',$3,$3,$4,$3,$3)`,
      cadId, org.id, now, userId
    );
    // Explicit USD → the DB accepts and persists it verbatim (no CHECK on this column; policy lives in
    // the governed runtime, which is unchanged by this migration).
    const usdId = randomUUID();
    await prisma.$executeRawUnsafe(
      `INSERT INTO employer_contracts (id, organization_id, version, status, currency, activated_at, effective_from, created_by_user_id, created_at, updated_at)
       VALUES ($1,$2,'v-usd','active','USD',$3,$3,$4,$3,$3)`,
      usdId, org.id, now, userId
    );

    const cad = await prisma.employerContract.findUniqueOrThrow({ where: { id: cadId } });
    const usd = await prisma.employerContract.findUniqueOrThrow({ where: { id: usdId } });
    expect(cad.currency).toBe("CAD");
    expect(usd.currency).toBe("USD");
  });
});
