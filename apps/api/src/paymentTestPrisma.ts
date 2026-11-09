import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@rwos/database";

// TEST ONLY: a small in-memory stand-in for the Prisma models used by the plan, listing, receipt and
// reminder code, so the money rules can be tested without a database. Transactions run one at a
// time (like the company-row lock does in Postgres), and a failed transaction rolls every table back.

export type Row = Record<string, unknown>;

const OPS = new Set(["in", "notIn", "not", "gt", "gte", "lt", "lte", "increment"]);

function isOpObject(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    !(value instanceof Date) &&
    !Array.isArray(value) &&
    Object.keys(value).length > 0 &&
    Object.keys(value).every((key) => OPS.has(key))
  );
}

function same(a: unknown, b: unknown): boolean {
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  if (a === undefined) return b === null || b === undefined;
  return a === b;
}

function time(value: unknown): number {
  return value instanceof Date ? value.getTime() : Number.NaN;
}

export function matches(row: Row, where: Row | undefined): boolean {
  if (!where) return true;
  return Object.entries(where).every(([key, condition]) => {
    if (key === "OR") return (condition as Row[]).some((part) => matches(row, part));
    if (key === "AND") return (condition as Row[]).every((part) => matches(row, part));
    const value = row[key];
    if (isOpObject(condition)) {
      if ("in" in condition && !(condition.in as unknown[]).some((item) => same(value, item))) return false;
      if ("notIn" in condition && (condition.notIn as unknown[]).some((item) => same(value, item))) return false;
      if ("not" in condition && same(value, condition.not)) return false;
      if ("gt" in condition && !(time(value) > time(condition.gt))) return false;
      if ("gte" in condition && !(time(value) >= time(condition.gte))) return false;
      if ("lt" in condition && !(time(value) < time(condition.lt))) return false;
      if ("lte" in condition && !(time(value) <= time(condition.lte))) return false;
      return true;
    }
    return same(value, condition);
  });
}

function applyData(row: Row, data: Row) {
  for (const [key, value] of Object.entries(data)) {
    if (isOpObject(value) && "increment" in value) row[key] = Number(row[key] ?? 0) + Number(value.increment);
    else row[key] = value;
  }
}

type Tables = {
  organizations: Row[];
  users: Row[];
  memberships: Row[];
  plans: Row[];
  planOrders: Row[];
  jobs: Row[];
  listings: Row[];
  listingOrders: Row[];
  receipts: Row[];
  sequences: Row[];
};

export function createPaymentTestPrisma(seed: Partial<Tables> = {}) {
  const t: Tables = {
    organizations: [],
    users: [],
    memberships: [],
    plans: [],
    planOrders: [],
    jobs: [],
    listings: [],
    listingOrders: [],
    receipts: [],
    sequences: [],
    ...seed
  };
  // Real-looking ids, so the routes' id checks accept them.
  const nextId = (_prefix: string) => randomUUID();
  let clock = 0;
  const stamp = () => new Date(Date.UTC(2026, 0, 1) + ++clock);

  const unique = (table: Row[], row: Row, keys: string[]) => {
    for (const key of keys) {
      if (row[key] !== null && row[key] !== undefined && table.some((other) => other !== row && other[key] === row[key])) {
        throw Object.assign(new Error(`unique ${key}`), { code: "P2002" });
      }
    }
  };

  const org = (id: unknown) => t.organizations.find((o) => o.id === id);
  const user = (id: unknown) => t.users.find((u) => u.id === id);

  const withPlanOrderIncludes = (o: Row) => ({
    ...o,
    organization: { displayName: org(o.organizationId)?.displayName ?? "Acme" },
    receipt: t.receipts.find((r) => r.employerPlanOrderId === o.id) ?? null
  });
  const withListingOrderIncludes = (o: Row) => {
    const listing = t.listings.find((l) => l.id === o.jobListingId);
    const job = t.jobs.find((j) => j.id === listing?.jobRequestId);
    return {
      ...o,
      organization: { displayName: org(o.organizationId)?.displayName ?? "Acme" },
      jobListing: { jobRequestId: listing?.jobRequestId, jobRequest: { title: job?.title } },
      receipt: t.receipts.find((r) => r.jobListingOrderId === o.id) ?? null
    };
  };
  const listingSelect = (l: Row | undefined) => (l ? { id: l.id, listedUntil: l.listedUntil ?? null, trialEndsAt: l.trialEndsAt ?? null } : null);

  function model(table: () => Row[], decorate: (row: Row) => Row = (row) => ({ ...row }), uniqueKeys: string[] = [], idPrefix = "row") {
    return {
      async findFirst(args: { where?: Row } = {}) {
        const hit = table().filter((row) => matches(row, args.where)).at(-1);
        return hit ? decorate(hit) : null;
      },
      async findUnique(args: { where: Row }) {
        const hit = table().find((row) => matches(row, args.where));
        return hit ? decorate(hit) : null;
      },
      async findUniqueOrThrow(args: { where: Row }) {
        const hit = table().find((row) => matches(row, args.where));
        if (!hit) throw new Error("missing");
        return decorate(hit);
      },
      async findMany(args: { where?: Row; take?: number } = {}) {
        return table()
          .filter((row) => matches(row, args.where))
          .slice(0, args.take ?? 1000)
          .map(decorate);
      },
      async create(args: { data: Row }) {
        const now = stamp();
        const row: Row = { id: nextId(idPrefix), createdAt: now, updatedAt: now, paymentRef: null, paidAt: null, ...args.data };
        unique(table(), row, uniqueKeys);
        table().push(row);
        return decorate(row);
      },
      async update(args: { where: Row; data: Row }) {
        const hit = table().find((row) => matches(row, args.where));
        if (!hit) throw new Error("missing");
        applyData(hit, { ...args.data, updatedAt: stamp() });
        return decorate(hit);
      },
      async updateMany(args: { where: Row; data: Row }) {
        const hits = table().filter((row) => matches(row, args.where));
        hits.forEach((row) => applyData(row, { ...args.data, updatedAt: stamp() }));
        return { count: hits.length };
      },
      async upsert(args: { where: Row; create: Row; update: Row }) {
        const hit = table().find((row) => matches(row, args.where));
        if (hit) {
          applyData(hit, { ...args.update, updatedAt: stamp() });
          return decorate(hit);
        }
        const now = stamp();
        const row: Row = { id: nextId(idPrefix), createdAt: now, updatedAt: now, ...args.create };
        table().push(row);
        return decorate(row);
      }
    };
  }

  const planWhere = (where: Row) => {
    const compound = where.organizationId_track as Row | undefined;
    return compound ? { organizationId: compound.organizationId, track: compound.track } : where;
  };
  const planModel = model(() => t.plans, (row) => ({ ...row }), [], "plan");

  let chain: Promise<unknown> = Promise.resolve();
  const prisma: Record<string, unknown> = {
    employerOrganization: {
      ...model(() => t.organizations),
      async findUnique(args: { where: Row }) {
        const o = org(args.where.id);
        if (!o) return null;
        const creator = user(o.createdByUserId);
        return { ...o, createdBy: creator ? { ...creator } : null };
      }
    },
    organizationMembership: {
      async findFirst(args: { where: Row }) {
        const m = t.memberships.filter((row) => matches(row, args.where))[0];
        return m ? { ...m, user: user(m.userId) ?? null } : null;
      }
    },
    employerPlan: {
      ...planModel,
      async findUnique(args: { where: Row }) {
        return planModel.findUnique({ where: planWhere(args.where) });
      },
      async update(args: { where: Row; data: Row }) {
        return planModel.update({ where: planWhere(args.where), data: args.data });
      },
      async upsert(args: { where: Row; create: Row; update: Row }) {
        return planModel.upsert({ where: planWhere(args.where), create: args.create, update: args.update });
      }
    },
    employerPlanOrder: model(() => t.planOrders, withPlanOrderIncludes, ["shortRef"], "plan-order"),
    jobRequest: {
      async findFirst(args: { where: Row }) {
        const job = t.jobs.find((j) => j.id === args.where.id && (args.where.organizationId === undefined || j.organizationId === args.where.organizationId));
        if (!job) return null;
        if (args.where.status && !matches(job, { status: args.where.status as Row })) return null;
        return { ...job, jobListing: listingSelect(t.listings.find((l) => l.jobRequestId === job.id)) };
      },
      async findMany() {
        return t.jobs.filter((j) => j.jobLength === "long_term").map((j) => ({ ...j, jobListing: listingSelect(t.listings.find((l) => l.jobRequestId === j.id)) }));
      }
    },
    jobListing: {
      ...model(() => t.listings, (row) => ({ ...row, jobRequest: { ...(t.jobs.find((j) => j.id === row.jobRequestId) ?? {}) } }), [], "listing"),
      async upsert(args: { where: { jobRequestId: string }; create: Row; update: Row }) {
        let l = t.listings.find((x) => x.jobRequestId === args.where.jobRequestId);
        if (l) applyData(l, args.update);
        else {
          l = { id: nextId("listing"), reminder7SentFor: null, reminder1SentFor: null, ...args.create };
          t.listings.push(l);
        }
        return listingSelect(l);
      },
      async findUniqueOrThrow(args: { where: { id: string } }) {
        const l = t.listings.find((x) => x.id === args.where.id);
        if (!l) throw new Error("missing");
        return listingSelect(l);
      }
    },
    jobListingOrder: model(() => t.listingOrders, withListingOrderIncludes, ["shortRef"], "listing-order"),
    paymentReceipt: model(() => t.receipts, (row) => ({ ...row }), ["receiptNumber", "employerPlanOrderId", "jobListingOrderId"], "receipt"),
    paymentReceiptSequence: model(() => t.sequences),
    async $queryRaw() {
      return [];
    }
  };
  // One transaction at a time; a throw restores every table as it was.
  prisma.$transaction = (fn: (tx: unknown) => Promise<unknown>) => {
    const run = chain.then(async () => {
      const snapshot = structuredClone(t);
      try {
        return await fn(prisma);
      } catch (error) {
        Object.assign(t, snapshot);
        throw error;
      }
    });
    chain = run.catch(() => undefined);
    return run;
  };
  return { prisma: prisma as unknown as PrismaClient, tables: t };
}
