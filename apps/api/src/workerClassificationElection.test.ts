import { describe, expect, it } from "vitest";
import {
  WORKER_AGREEMENT_VERSIONS,
  electClassification,
  getActiveElection
} from "./workerClassificationElection";

// In-memory fake of the one Prisma surface the election module uses: the append-only
// worker_classification_elections table plus a no-op worker_identities sync. $transaction runs the
// callback against the same store so supersede + insert are observed atomically.
function makeFakePrisma() {
  type Row = {
    id: string;
    workerIdentityId: string;
    classification: string;
    status: string;
    agreementVersion: string | null;
    agreementDocumentId: string | null;
    determinationRef: string | null;
    reason: string | null;
    effectiveFrom: Date;
    effectiveTo: Date | null;
    electedByUserId: string;
    approvedByUserId: string | null;
    createdAt: Date;
  };
  const rows: Row[] = [];
  let seq = 0;
  const table = {
    async findFirst({ where }: { where: { workerIdentityId: string; status: string } }) {
      return (
        rows.find(
          (r) => r.workerIdentityId === where.workerIdentityId && r.status === where.status
        ) ?? null
      );
    },
    async update({ where, data }: { where: { id: string }; data: Partial<Row> }) {
      const row = rows.find((r) => r.id === where.id)!;
      Object.assign(row, data);
      return row;
    },
    async create({ data }: { data: Partial<Row> }) {
      const row: Row = {
        id: `election-${++seq}`,
        agreementDocumentId: null,
        agreementVersion: null,
        determinationRef: null,
        reason: null,
        effectiveTo: null,
        approvedByUserId: null,
        createdAt: new Date(1_700_000_000_000 + seq),
        ...(data as Row)
      };
      rows.push(row);
      return row;
    }
  };
  const client = {
    workerClassificationElection: table,
    workerIdentity: { async updateMany() { return { count: 1 }; } },
    async $transaction<T>(fn: (tx: typeof client) => Promise<T>) {
      return fn(client);
    }
  };
  return { prisma: client as never, rows };
}

const W = "11111111-1111-4111-8111-111111111111";
const empV = WORKER_AGREEMENT_VERSIONS.employee;
const conV = WORKER_AGREEMENT_VERSIONS.contractor;

describe("worker classification election", () => {
  it("rejects an unknown classification", async () => {
    const { prisma } = makeFakePrisma();
    const r = await electClassification(prisma, {
      workerIdentityId: W,
      classification: "freelancer" as never,
      electedByUserId: "u1",
      agreementVersion: empV
    });
    expect(r).toEqual({ ok: false, reason: "invalid_classification" });
  });

  it("rejects a stale agreement version", async () => {
    const { prisma } = makeFakePrisma();
    const r = await electClassification(prisma, {
      workerIdentityId: W,
      classification: "employee",
      electedByUserId: "u1",
      agreementVersion: "worker-employee-agreement-2019.01"
    });
    expect(r).toEqual({ ok: false, reason: "stale_agreement_version" });
  });

  it("records a first election as active", async () => {
    const { prisma } = makeFakePrisma();
    const r = await electClassification(prisma, {
      workerIdentityId: W,
      classification: "employee",
      electedByUserId: "u1",
      agreementVersion: empV
    });
    expect(r.ok).toBe(true);
    const active = await getActiveElection(prisma, W);
    expect(active?.classification).toBe("employee");
    expect(active?.status).toBe("active");
  });

  it("treats re-electing the same classification as unchanged (no new row)", async () => {
    const { prisma, rows } = makeFakePrisma();
    await electClassification(prisma, { workerIdentityId: W, classification: "employee", electedByUserId: "u1", agreementVersion: empV });
    const again = await electClassification(prisma, { workerIdentityId: W, classification: "employee", electedByUserId: "u1", agreementVersion: empV });
    expect(again).toEqual({ ok: false, reason: "unchanged" });
    expect(rows.length).toBe(1);
  });

  it("supersedes the prior election and appends a new active one on reclassify", async () => {
    const { prisma, rows } = makeFakePrisma();
    await electClassification(prisma, { workerIdentityId: W, classification: "employee", electedByUserId: "u1", agreementVersion: empV });
    const re = await electClassification(prisma, { workerIdentityId: W, classification: "contractor", electedByUserId: "admin-1", approvedByUserId: "admin-1", agreementVersion: conV, reason: "registered a business" });
    expect(re.ok).toBe(true);
    // history is append-only: one superseded employee row + one active contractor row.
    expect(rows.length).toBe(2);
    expect(rows.filter((r) => r.status === "active")).toHaveLength(1);
    const active = await getActiveElection(prisma, W);
    expect(active?.classification).toBe("contractor");
    expect(rows.find((r) => r.classification === "employee")?.status).toBe("superseded");
    expect(rows.find((r) => r.classification === "employee")?.effectiveTo).not.toBeNull();
  });
});
