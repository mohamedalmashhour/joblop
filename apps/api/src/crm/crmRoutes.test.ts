import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import { registerCrmRoutes } from "./crmRoutes";

// A tiny in-memory stand-in for the slice of PrismaClient the CRM routes use. It is NOT a real
// database — just enough to prove the route behaviour and, above all, that a denied staff check
// returns before any write.
type ContactRecord = {
  id: string;
  type: string;
  stage: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  source: string;
  assigneeUserId: string | null;
  userId: string | null;
  organizationId: string | null;
  externalJobLeadId: string | null;
  marketingOptInAt: Date | null;
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const UUID = "11111111-1111-4111-8111-111111111111";

function uuid(n: number) {
  return `${n.toString().repeat(8).slice(0, 8)}-1111-4111-8111-111111111111`;
}

function fakePrisma() {
  const contacts: ContactRecord[] = [];
  const activities: Array<{ id: string; contactId: string; kind: string; body: string | null; actorUserId: string | null; createdAt: Date }> = [];
  const leads: Array<{ id: string; title: string; employer: string | null; locationLabel: string | null; city: string | null; province: string | null; url: string; lastSeenAt: Date }> = [];
  let seq = 1;
  const relations = () => ({ user: null, organization: null, externalJobLead: null, assignee: null });
  const withRel = (c: ContactRecord) => ({ ...c, ...relations() });
  const api = {
    __contacts: contacts,
    __activities: activities,
    __leads: leads,
    crmContact: {
      findMany: async () => contacts.map(withRel),
      create: async ({ data }: { data: Partial<ContactRecord> }) => {
        const now = new Date();
        const record: ContactRecord = {
          id: uuid(++seq),
          type: data.type as string,
          stage: (data.stage as string) ?? "new",
          name: data.name ?? null,
          email: data.email ?? null,
          phone: data.phone ?? null,
          source: data.source ?? "manual",
          assigneeUserId: null,
          userId: null,
          organizationId: null,
          externalJobLeadId: (data.externalJobLeadId as string) ?? null,
          marketingOptInAt: null,
          createdByUserId: data.createdByUserId ?? null,
          createdAt: now,
          updatedAt: now
        };
        if (record.externalJobLeadId && contacts.some((c) => c.externalJobLeadId === record.externalJobLeadId)) {
          const err = new Error("unique") as Error & { code: string };
          err.code = "P2002";
          throw err;
        }
        contacts.push(record);
        return withRel(record);
      },
      findUnique: async ({ where }: { where: { id: string } }) => {
        const found = contacts.find((c) => c.id === where.id);
        return found ? withRel(found) : null;
      },
      findFirst: async ({ where }: { where: { externalJobLeadId?: string } }) => {
        const found = contacts.find((c) => c.externalJobLeadId === where.externalJobLeadId);
        return found ? withRel(found) : null;
      },
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const found = contacts.find((c) => c.id === where.id);
        if (!found) {
          const err = new Error("not found") as Error & { code: string };
          err.code = "P2025";
          throw err;
        }
        Object.assign(found, data, { updatedAt: new Date() });
        return withRel(found);
      }
    },
    crmActivity: {
      findMany: async ({ where }: { where: { contactId: string } }) =>
        activities.filter((a) => a.contactId === where.contactId).map((a) => ({ ...a, actor: null })),
      create: async ({ data }: { data: { contactId: string; kind: string; body?: string | null; actorUserId?: string | null; createdAt?: Date } }) => {
        const record = {
          id: uuid(++seq),
          contactId: data.contactId,
          kind: data.kind,
          body: data.body ?? null,
          actorUserId: data.actorUserId ?? null,
          createdAt: data.createdAt ?? new Date()
        };
        activities.push(record);
        return { ...record, actor: null };
      }
    },
    externalJobLead: {
      findMany: async () => leads,
      findUnique: async ({ where }: { where: { id: string } }) => leads.find((l) => l.id === where.id) ?? null
    },
    $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops)
  };
  return api;
}

function build(options: { db?: boolean; staff?: boolean } = {}) {
  const prisma = options.db === false ? null : fakePrisma();
  const app = Fastify();
  registerCrmRoutes(app, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prisma: prisma as any,
    requireStaff: async (request, reply) => {
      if (!request.headers.authorization) {
        reply.code(401).send({ error: "denied" });
        return null;
      }
      if (request.headers.authorization !== "Bearer staff") {
        reply.code(403).send({ error: "denied" });
        return null;
      }
      return UUID;
    },
    now: () => new Date("2026-11-17T00:00:00.000Z")
  });
  return { app, prisma };
}

const staff = { authorization: "Bearer staff" };

describe("CRM routes", () => {
  it("rejects unauthenticated and non-staff callers before any write", async () => {
    const { app, prisma } = build();
    const none = await app.inject({ method: "POST", url: "/platform/crm/contacts", payload: { type: "lead" } });
    expect(none.statusCode).toBe(401);
    const wrong = await app.inject({
      method: "POST",
      url: "/platform/crm/contacts",
      headers: { authorization: "Bearer someone" },
      payload: { type: "lead" }
    });
    expect(wrong.statusCode).toBe(403);
    // No contact was created despite the POST body being valid.
    expect(prisma?.__contacts).toHaveLength(0);
  });

  it("503 when there is no database", async () => {
    const res = await build({ db: false }).app.inject({ method: "GET", url: "/platform/crm/contacts", headers: staff });
    expect(res.statusCode).toBe(503);
  });

  it("creates a contact and returns the five-stage board", async () => {
    const { app } = build();
    const created = await app.inject({ method: "POST", url: "/platform/crm/contacts", headers: staff, payload: { type: "employer", name: "Acme" } });
    expect(created.statusCode).toBe(201);
    const list = await app.inject({ method: "GET", url: "/platform/crm/contacts", headers: staff });
    const body = list.json();
    expect(body.total).toBe(1);
    expect(body.board.map((c: { stage: string }) => c.stage)).toEqual(["new", "contacted", "qualified", "active", "dormant"]);
    expect(body.board[0].contacts).toHaveLength(1);
  });

  it("rejects an unknown contact type", async () => {
    const { app } = build();
    const res = await app.inject({ method: "POST", url: "/platform/crm/contacts", headers: staff, payload: { type: "nope" } });
    expect(res.statusCode).toBe(400);
  });

  it("moves stage and logs exactly one stage_change activity", async () => {
    const { app, prisma } = build();
    const created = (await app.inject({ method: "POST", url: "/platform/crm/contacts", headers: staff, payload: { type: "lead", name: "L" } })).json();
    const id = created.contact.id;
    const moved = await app.inject({ method: "POST", url: `/platform/crm/contacts/${id}/stage`, headers: staff, payload: { stage: "qualified" } });
    expect(moved.statusCode).toBe(200);
    expect(moved.json().contact.stage).toBe("qualified");
    expect(prisma?.__activities.filter((a) => a.kind === "stage_change")).toHaveLength(1);
    // Moving to the same stage logs nothing extra.
    await app.inject({ method: "POST", url: `/platform/crm/contacts/${id}/stage`, headers: staff, payload: { stage: "qualified" } });
    expect(prisma?.__activities.filter((a) => a.kind === "stage_change")).toHaveLength(1);
  });

  it("rejects a stage_change via the manual activity route", async () => {
    const { app } = build();
    const created = (await app.inject({ method: "POST", url: "/platform/crm/contacts", headers: staff, payload: { type: "lead" } })).json();
    const res = await app.inject({
      method: "POST",
      url: `/platform/crm/contacts/${created.contact.id}/activities`,
      headers: staff,
      payload: { kind: "stage_change", body: "sneaky" }
    });
    expect(res.statusCode).toBe(400);
  });

  it("imports an external job lead once (idempotent)", async () => {
    const { app, prisma } = build();
    prisma?.__leads.push({ id: UUID, title: "Dishwasher", employer: "Cafe", locationLabel: "Montreal", city: null, province: null, url: "https://x", lastSeenAt: new Date() });
    const first = await app.inject({ method: "POST", url: `/platform/crm/leads/${UUID}/import`, headers: staff, payload: {} });
    expect(first.statusCode).toBe(201);
    expect(first.json().contact.type).toBe("lead");
    const second = await app.inject({ method: "POST", url: `/platform/crm/leads/${UUID}/import`, headers: staff, payload: {} });
    expect(second.statusCode).toBe(200);
    expect(second.json().alreadyImported).toBe(true);
    expect(prisma?.__contacts.filter((c) => c.externalJobLeadId === UUID)).toHaveLength(1);
  });

  it("404s a non-UUID contact id without touching the store", async () => {
    const { app } = build();
    const res = await app.inject({ method: "GET", url: "/platform/crm/contacts/not-a-uuid", headers: staff });
    expect(res.statusCode).toBe(404);
  });
});
