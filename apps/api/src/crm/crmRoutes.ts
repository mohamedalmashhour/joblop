import type { Prisma, PrismaClient } from "@rwos/database";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

// CRM core (phase 1): a dedicated, staff-only pipeline + contacts surface. Every route is gated by
// `requireStaff` (platform administrators only), which sends 401/403 itself and returns null; each
// handler returns before any write when it does. Nothing here sends marketing email or moves money —
// consent is read-only and the marketing phase is separate.
//
//   GET    /platform/crm/contacts                 board + list (filter by stage/type/assignee/q)
//   POST   /platform/crm/contacts                 create a contact
//   GET    /platform/crm/contacts/:id             contact detail + activity timeline
//   PATCH  /platform/crm/contacts/:id             edit name/email/phone/type/source
//   POST   /platform/crm/contacts/:id/stage       move pipeline stage (logs a stage_change activity)
//   POST   /platform/crm/contacts/:id/assign      assign/unassign to a staff user
//   POST   /platform/crm/contacts/:id/activities  add an activity (note/call/email/task)
//   GET    /platform/crm/leads                     ExternalJobLead rows not yet imported
//   POST   /platform/crm/leads/:id/import          import one ExternalJobLead into a CrmContact

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CONTACT_TYPES = ["worker", "employer", "lead"] as const;
const CONTACT_STAGES = ["new", "contacted", "qualified", "active", "dormant"] as const;
// Staff may log these by hand; `stage_change` is written only by the stage route, never freely.
const MANUAL_ACTIVITY_KINDS = ["note", "call", "email", "task"] as const;

type ContactType = (typeof CONTACT_TYPES)[number];
type ContactStage = (typeof CONTACT_STAGES)[number];
type ActivityKind = "note" | "call" | "email" | "stage_change" | "task";

type CrmPrisma = Pick<PrismaClient, "crmContact" | "crmActivity" | "externalJobLead" | "$transaction">;

export type CrmRouteDeps = Readonly<{
  /** Null when there is no database: every route answers 503. */
  prisma: CrmPrisma | null;
  /** Platform administrators only. Sends the 401/403 itself and returns null (the staff user id). */
  requireStaff(request: FastifyRequest, reply: FastifyReply): Promise<string | null>;
  now?: () => Date;
}>;

// CASL marketing consent lives on WorkerHrIntake (users.workerIdentity.hrIntake.marketingEmailOptInAt),
// not directly on the user. We read it here for a display-only badge; this phase never sends.
const contactInclude = {
  user: {
    select: {
      displayName: true,
      emailNormalized: true,
      phone: true,
      workerIdentity: { select: { hrIntake: { select: { marketingEmailOptInAt: true } } } }
    }
  },
  organization: { select: { displayName: true, legalName: true } },
  externalJobLead: { select: { title: true, employer: true, url: true } },
  assignee: { select: { displayName: true, emailNormalized: true } }
} satisfies Prisma.CrmContactInclude;

type ContactRow = Prisma.CrmContactGetPayload<{ include: typeof contactInclude }>;
type ActivityRow = Prisma.CrmActivityGetPayload<{ include: { actor: { select: { displayName: true } } } }>;

// Live consent wins over the cached mirror: when the contact is linked to a real user, the current
// users.marketing_email_opt_in_at is authoritative; otherwise fall back to the stored mirror. This
// is display only — no route in this phase sends anything.
const consentOptedIn = (contact: ContactRow): boolean =>
  (contact.user?.workerIdentity?.hrIntake?.marketingEmailOptInAt ?? contact.marketingOptInAt) !== null;

const serializeContact = (contact: ContactRow) => ({
  id: contact.id,
  type: contact.type,
  stage: contact.stage,
  name: contact.name,
  email: contact.email,
  phone: contact.phone,
  source: contact.source,
  assigneeUserId: contact.assigneeUserId,
  assigneeName: contact.assignee?.displayName ?? null,
  userId: contact.userId,
  organizationId: contact.organizationId,
  externalJobLeadId: contact.externalJobLeadId,
  linkedUserName: contact.user?.displayName ?? null,
  linkedUserEmail: contact.user?.emailNormalized ?? null,
  linkedOrganizationName: contact.organization?.displayName ?? null,
  linkedLeadTitle: contact.externalJobLead?.title ?? null,
  consentOptedIn: consentOptedIn(contact),
  createdAt: contact.createdAt.toISOString(),
  updatedAt: contact.updatedAt.toISOString()
});

const serializeActivity = (activity: ActivityRow) => ({
  id: activity.id,
  kind: activity.kind,
  body: activity.body,
  actorUserId: activity.actorUserId,
  actorName: activity.actor?.displayName ?? null,
  createdAt: activity.createdAt.toISOString()
});

export function registerCrmRoutes(app: FastifyInstance, deps: CrmRouteDeps) {
  const now = deps.now ?? (() => new Date());
  const unavailable = (reply: FastifyReply) =>
    reply.code(503).send({ error: "RWOS_CRM_UNAVAILABLE", message: "Database unavailable." });
  const param = (params: unknown, key: string) => {
    const v = params && typeof params === "object" ? (params as Record<string, unknown>)[key] : undefined;
    return typeof v === "string" ? v : "";
  };
  const body = (request: FastifyRequest): Record<string, unknown> =>
    request.body && typeof request.body === "object" && !Array.isArray(request.body)
      ? (request.body as Record<string, unknown>)
      : {};
  const query = (request: FastifyRequest): Record<string, unknown> =>
    request.query && typeof request.query === "object" ? (request.query as Record<string, unknown>) : {};
  // Optional free-text field. Returns the trimmed string, or null when absent/empty (both treated as
  // "not set"), or undefined ONLY when the value is invalid (non-string or over the limit) so callers
  // can tell "cleared" from "rejected".
  const optText = (value: unknown, max: number): string | null | undefined => {
    if (value === undefined || value === null) return null;
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    if (trimmed.length === 0) return null;
    return trimmed.length <= max ? trimmed : undefined;
  };
  const badRequest = (reply: FastifyReply, message: string) =>
    reply.code(400).send({ error: "RWOS_CRM_INVALID", message });

  // ── Pipeline board + list ──────────────────────────────────────────────────────────────────────
  app.get("/platform/crm/contacts", async (request, reply) => {
    const actor = await deps.requireStaff(request, reply);
    if (!actor) return;
    if (!deps.prisma) return unavailable(reply);
    const q = query(request);
    const stage = typeof q.stage === "string" && (CONTACT_STAGES as readonly string[]).includes(q.stage) ? (q.stage as ContactStage) : undefined;
    const type = typeof q.type === "string" && (CONTACT_TYPES as readonly string[]).includes(q.type) ? (q.type as ContactType) : undefined;
    const assignee = typeof q.assignee === "string" && UUID.test(q.assignee) ? q.assignee : undefined;
    const search = typeof q.q === "string" ? q.q.trim().slice(0, 120) : "";
    const where: Prisma.CrmContactWhereInput = {
      ...(stage ? { stage } : {}),
      ...(type ? { type } : {}),
      ...(assignee ? { assigneeUserId: assignee } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } }
            ]
          }
        : {})
    };
    const contacts = await deps.prisma.crmContact.findMany({
      where,
      include: contactInclude,
      orderBy: { updatedAt: "desc" },
      take: 500
    });
    const serialized: ReturnType<typeof serializeContact>[] = contacts.map((c: ContactRow) => serializeContact(c));
    const board = CONTACT_STAGES.map((s) => ({
      stage: s,
      contacts: serialized.filter((c: ReturnType<typeof serializeContact>) => c.stage === s)
    }));
    return reply
      .code(200)
      .header("cache-control", "no-store")
      .send({ contacts: serialized, board, total: serialized.length });
  });

  // ── Create ─────────────────────────────────────────────────────────────────────────────────────
  app.post("/platform/crm/contacts", async (request, reply) => {
    const actor = await deps.requireStaff(request, reply);
    if (!actor) return;
    if (!deps.prisma) return unavailable(reply);
    const b = body(request);
    const type = typeof b.type === "string" && (CONTACT_TYPES as readonly string[]).includes(b.type) ? (b.type as ContactType) : null;
    if (!type) return badRequest(reply, "type must be worker, employer or lead.");
    const name = optText(b.name, 160);
    const email = optText(b.email, 200);
    const phone = optText(b.phone, 40);
    const source = optText(b.source, 60);
    if (name === undefined || email === undefined || phone === undefined || source === undefined) {
      return badRequest(reply, "name, email, phone and source must be short text.");
    }
    const stage =
      typeof b.stage === "string" && (CONTACT_STAGES as readonly string[]).includes(b.stage) ? (b.stage as ContactStage) : "new";
    const created = await deps.prisma.crmContact.create({
      data: {
        type,
        stage,
        name: name ?? null,
        email: email ?? null,
        phone: phone ?? null,
        source: source ?? "manual",
        createdByUserId: actor
      },
      include: contactInclude
    });
    return reply.code(201).send({ contact: serializeContact(created) });
  });

  // ── Detail + timeline ──────────────────────────────────────────────────────────────────────────
  app.get("/platform/crm/contacts/:id", async (request, reply) => {
    const actor = await deps.requireStaff(request, reply);
    if (!actor) return;
    if (!deps.prisma) return unavailable(reply);
    const id = param(request.params, "id");
    if (!UUID.test(id)) return reply.code(404).send({ error: "RWOS_CRM_NOT_FOUND", message: "Contact not found." });
    const contact = await deps.prisma.crmContact.findUnique({ where: { id }, include: contactInclude });
    if (!contact) return reply.code(404).send({ error: "RWOS_CRM_NOT_FOUND", message: "Contact not found." });
    const activities = await deps.prisma.crmActivity.findMany({
      where: { contactId: id },
      include: { actor: { select: { displayName: true } } },
      orderBy: { createdAt: "desc" },
      take: 200
    });
    return reply
      .code(200)
      .header("cache-control", "no-store")
      .send({ contact: serializeContact(contact), activities: activities.map(serializeActivity) });
  });

  // ── Edit fields ────────────────────────────────────────────────────────────────────────────────
  app.patch("/platform/crm/contacts/:id", async (request, reply) => {
    const actor = await deps.requireStaff(request, reply);
    if (!actor) return;
    if (!deps.prisma) return unavailable(reply);
    const id = param(request.params, "id");
    if (!UUID.test(id)) return reply.code(404).send({ error: "RWOS_CRM_NOT_FOUND", message: "Contact not found." });
    const b = body(request);
    const name = optText(b.name, 160);
    const email = optText(b.email, 200);
    const phone = optText(b.phone, 40);
    const source = optText(b.source, 60);
    if (name === undefined && b.name !== undefined) return badRequest(reply, "name must be short text.");
    if (email === undefined && b.email !== undefined) return badRequest(reply, "email must be short text.");
    if (phone === undefined && b.phone !== undefined) return badRequest(reply, "phone must be short text.");
    if (source === undefined && b.source !== undefined) return badRequest(reply, "source must be short text.");
    const type =
      b.type === undefined
        ? undefined
        : typeof b.type === "string" && (CONTACT_TYPES as readonly string[]).includes(b.type)
          ? (b.type as ContactType)
          : null;
    if (type === null) return badRequest(reply, "type must be worker, employer or lead.");
    const data: Prisma.CrmContactUpdateInput = {
      ...(b.name !== undefined ? { name: name ?? null } : {}),
      ...(b.email !== undefined ? { email: email ?? null } : {}),
      ...(b.phone !== undefined ? { phone: phone ?? null } : {}),
      ...(b.source !== undefined ? { source: source ?? "manual" } : {}),
      ...(type !== undefined ? { type } : {})
    };
    try {
      const updated = await deps.prisma.crmContact.update({ where: { id }, data, include: contactInclude });
      return reply.code(200).send({ contact: serializeContact(updated) });
    } catch (error) {
      if (isNotFound(error)) return reply.code(404).send({ error: "RWOS_CRM_NOT_FOUND", message: "Contact not found." });
      throw error;
    }
  });

  // ── Move stage (logs a stage_change activity) ────────────────────────────────────────────────────
  app.post("/platform/crm/contacts/:id/stage", async (request, reply) => {
    const actor = await deps.requireStaff(request, reply);
    if (!actor) return;
    if (!deps.prisma) return unavailable(reply);
    const prisma = deps.prisma;
    const id = param(request.params, "id");
    if (!UUID.test(id)) return reply.code(404).send({ error: "RWOS_CRM_NOT_FOUND", message: "Contact not found." });
    const b = body(request);
    const stage = typeof b.stage === "string" && (CONTACT_STAGES as readonly string[]).includes(b.stage) ? (b.stage as ContactStage) : null;
    if (!stage) return badRequest(reply, "stage must be new, contacted, qualified, active or dormant.");
    const current = await prisma.crmContact.findUnique({ where: { id }, select: { stage: true } });
    if (!current) return reply.code(404).send({ error: "RWOS_CRM_NOT_FOUND", message: "Contact not found." });
    const [updated] = await prisma.$transaction([
      prisma.crmContact.update({ where: { id }, data: { stage }, include: contactInclude }),
      ...(current.stage === stage
        ? []
        : [
            prisma.crmActivity.create({
              data: { contactId: id, kind: "stage_change", body: `${current.stage} → ${stage}`, actorUserId: actor, createdAt: now() }
            })
          ])
    ]);
    return reply.code(200).send({ contact: serializeContact(updated) });
  });

  // ── Assign / unassign ────────────────────────────────────────────────────────────────────────────
  app.post("/platform/crm/contacts/:id/assign", async (request, reply) => {
    const actor = await deps.requireStaff(request, reply);
    if (!actor) return;
    if (!deps.prisma) return unavailable(reply);
    const id = param(request.params, "id");
    if (!UUID.test(id)) return reply.code(404).send({ error: "RWOS_CRM_NOT_FOUND", message: "Contact not found." });
    const b = body(request);
    const raw = b.assigneeUserId;
    const assigneeUserId = raw === null || raw === "" ? null : typeof raw === "string" && UUID.test(raw) ? raw : undefined;
    if (assigneeUserId === undefined) return badRequest(reply, "assigneeUserId must be a user id or null.");
    try {
      const updated = await deps.prisma.crmContact.update({
        where: { id },
        data: { assigneeUserId },
        include: contactInclude
      });
      return reply.code(200).send({ contact: serializeContact(updated) });
    } catch (error) {
      if (isNotFound(error)) return reply.code(404).send({ error: "RWOS_CRM_NOT_FOUND", message: "Contact not found." });
      if (isForeignKey(error)) return badRequest(reply, "assigneeUserId is not a known user.");
      throw error;
    }
  });

  // ── Add an activity (note / call / email / task) ────────────────────────────────────────────────
  app.post("/platform/crm/contacts/:id/activities", async (request, reply) => {
    const actor = await deps.requireStaff(request, reply);
    if (!actor) return;
    if (!deps.prisma) return unavailable(reply);
    const id = param(request.params, "id");
    if (!UUID.test(id)) return reply.code(404).send({ error: "RWOS_CRM_NOT_FOUND", message: "Contact not found." });
    const b = body(request);
    const kind =
      typeof b.kind === "string" && (MANUAL_ACTIVITY_KINDS as readonly string[]).includes(b.kind) ? (b.kind as ActivityKind) : null;
    if (!kind) return badRequest(reply, "kind must be note, call, email or task.");
    const bodyText = optText(b.body, 4000);
    if (bodyText === undefined) return badRequest(reply, "body must be text up to 4000 characters.");
    const exists = await deps.prisma.crmContact.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return reply.code(404).send({ error: "RWOS_CRM_NOT_FOUND", message: "Contact not found." });
    const activity = await deps.prisma.crmActivity.create({
      data: { contactId: id, kind, body: bodyText ?? null, actorUserId: actor, createdAt: now() },
      include: { actor: { select: { displayName: true } } }
    });
    // Touch the contact so the board re-sorts it to the top (activity counts as movement).
    await deps.prisma.crmContact.update({ where: { id }, data: { updatedAt: now() } }).catch(() => undefined);
    return reply.code(201).send({ activity: serializeActivity(activity) });
  });

  // ── Importable leads (ExternalJobLead rows not yet imported) ─────────────────────────────────────
  app.get("/platform/crm/leads", async (request, reply) => {
    const actor = await deps.requireStaff(request, reply);
    if (!actor) return;
    if (!deps.prisma) return unavailable(reply);
    const leads = await deps.prisma.externalJobLead.findMany({
      where: { crmContacts: { none: {} } },
      orderBy: { lastSeenAt: "desc" },
      take: 200,
      select: { id: true, title: true, employer: true, locationLabel: true, city: true, province: true, url: true, lastSeenAt: true }
    });
    return reply
      .code(200)
      .header("cache-control", "no-store")
      .send({
        leads: leads.map((l: (typeof leads)[number]) => ({
          id: l.id,
          title: l.title,
          employer: l.employer,
          location: l.locationLabel ?? ([l.city, l.province].filter(Boolean).join(", ") || null),
          url: l.url,
          lastSeenAt: l.lastSeenAt.toISOString()
        }))
      });
  });

  // ── Import one lead into a contact (read-only on the lead; idempotent via the unique FK) ──────────
  app.post("/platform/crm/leads/:id/import", async (request, reply) => {
    const actor = await deps.requireStaff(request, reply);
    if (!actor) return;
    if (!deps.prisma) return unavailable(reply);
    const id = param(request.params, "id");
    if (!UUID.test(id)) return reply.code(404).send({ error: "RWOS_CRM_NOT_FOUND", message: "Lead not found." });
    const lead = await deps.prisma.externalJobLead.findUnique({
      where: { id },
      select: { id: true, title: true, employer: true }
    });
    if (!lead) return reply.code(404).send({ error: "RWOS_CRM_NOT_FOUND", message: "Lead not found." });
    try {
      const created = await deps.prisma.crmContact.create({
        data: {
          type: "lead",
          stage: "new",
          name: lead.employer ?? lead.title,
          source: "external_job_lead",
          externalJobLeadId: lead.id,
          createdByUserId: actor
        },
        include: contactInclude
      });
      return reply.code(201).send({ contact: serializeContact(created) });
    } catch (error) {
      if (isUniqueViolation(error)) {
        const existing = await deps.prisma.crmContact.findFirst({ where: { externalJobLeadId: id }, include: contactInclude });
        if (existing) return reply.code(200).send({ contact: serializeContact(existing), alreadyImported: true });
      }
      throw error;
    }
  });
}

const errorCode = (error: unknown): string | undefined =>
  typeof error === "object" && error !== null ? ((error as { code?: unknown }).code as string | undefined) : undefined;
const isNotFound = (error: unknown) => errorCode(error) === "P2025";
const isUniqueViolation = (error: unknown) => errorCode(error) === "P2002";
const isForeignKey = (error: unknown) => errorCode(error) === "P2003";
