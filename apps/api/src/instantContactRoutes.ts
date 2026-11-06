import type { PrismaClient } from "@rwos/database";
import { workerProfileRating } from "@rwos/shared";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  createClaudeContactAi,
  createContactService,
  syntheticContactAi,
  type AdminFilter,
  type ContactAi,
  type ContactNotices,
  type ContactSide,
  type ContactStore,
  type ConversationRow
} from "./instantContact";
import type { EmailSender } from "./mailer/emailSender";
import type { SmsSender } from "./mailer/smsSender";
import { formatWorksiteAddress, isWorksiteAddressVisible, WORKSITE_ADDRESS_SELECT } from "./worksiteAddress";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** The facts AI may use: this person's own records only, and nothing about anyone else. */
async function workerFacts(prisma: PrismaClient, userId: string): Promise<string> {
  const identity = await prisma.workerIdentity.findFirst({
    where: { userId },
    select: { id: true, displayName: true, classification: true }
  });
  if (!identity) return "No worker profile.";
  const [attendance, timesheets, pay, documents] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where: { workerIdentityId: identity.id },
      orderBy: { scheduledStartAt: "desc" },
      take: 5,
      select: {
        status: true, scheduledStartAt: true, scheduledEndAt: true, timezone: true, checkInAt: true, checkOutAt: true,
        assignment: { select: { confirmedTitle: true } },
        residence: { select: { ...WORKSITE_ADDRESS_SELECT } }
      }
    }),
    prisma.timesheet.findMany({
      where: { workerIdentityId: identity.id },
      orderBy: { scheduledStartAt: "desc" },
      take: 5,
      select: { status: true, scheduledStartAt: true, payableMinutes: true }
    }),
    prisma.payrollCalculation.findMany({
      where: { workerIdentityId: identity.id, status: { in: ["approved", "locked"] } },
      orderBy: { calculatedAt: "desc" },
      take: 3,
      select: { currency: true, grossPayMinor: true, totalDeductionsMinor: true, netPayMinor: true, payrollPeriod: { select: { periodStart: true, periodEnd: true } } }
    }),
    prisma.hrDocument.findMany({
      where: { workerIdentityId: identity.id },
      select: { documentType: true, status: true }
    })
  ]);
  return JSON.stringify({
    name: identity.displayName,
    workType: identity.classification,
    shifts: attendance.map((a) => ({
      title: a.assignment.confirmedTitle,
      attendanceStatus: a.status,
      scheduledStart: a.scheduledStartAt,
      scheduledEnd: a.scheduledEndAt,
      timezone: a.timezone,
      checkedInAt: a.checkInAt,
      checkedOutAt: a.checkOutAt,
      exactAddress: isWorksiteAddressVisible(a.status) ? formatWorksiteAddress(a.residence) : null
    })),
    timesheets,
    payStatements: pay.map((p) => ({
      periodStart: p.payrollPeriod.periodStart,
      periodEnd: p.payrollPeriod.periodEnd,
      currency: p.currency,
      gross: p.grossPayMinor / 100,
      deductions: p.totalDeductionsMinor / 100,
      net: p.netPayMinor / 100
    })),
    documents,
    profileRating: (({ score, tier, jobLimit }) => ({ score, tier, jobsShownPerSearch: jobLimit ?? "all" }))(
      workerProfileRating(documents.map((d) => ({ documentType: d.documentType, effectiveStatus: d.status })))
    )
  });
}

async function employerFacts(prisma: PrismaClient, organizationId: string | null): Promise<string> {
  if (!organizationId) return "No employer organization.";
  const [organization, requests, orders, timesheets, invoices] = await Promise.all([
    prisma.employerOrganization.findUnique({ where: { id: organizationId }, select: { displayName: true, status: true } }),
    prisma.jobRequest.findMany({
      where: { organizationId },
      orderBy: { startAt: "desc" },
      take: 5,
      select: { jobRequestNumber: true, title: true, status: true, numberOfWorkers: true, startAt: true, endAt: true, timezone: true }
    }),
    prisma.employerOrder.findMany({
      where: { organizationId },
      orderBy: { startAt: "desc" },
      take: 5,
      select: { orderNumber: true, title: true, startAt: true, endAt: true, timezone: true, status: true }
    }),
    prisma.timesheet.findMany({
      where: { organizationId },
      orderBy: { scheduledStartAt: "desc" },
      take: 5,
      select: { status: true, scheduledStartAt: true, scheduledEndAt: true }
    }),
    prisma.invoice.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { invoiceNumber: true, status: true, currency: true, totalMinor: true }
    })
  ]);
  return JSON.stringify({
    organization,
    requests,
    orders,
    timesheets,
    invoices: invoices.map((i) => ({ ...i, total: Number(i.totalMinor) / 100, totalMinor: undefined }))
  });
}

export function createPrismaContactStore(prisma: PrismaClient): ContactStore {
  const requesterName = async (userId: string): Promise<{ name: string; email: string | null }> => {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { displayName: true, emailNormalized: true } });
    return { name: user?.displayName ?? "Unknown", email: user?.emailNormalized ?? null };
  };
  return {
    async resolveRequester(userId, side) {
      const contact = await requesterName(userId);
      if (side === "worker") {
        const identity = await prisma.workerIdentity.findFirst({ where: { userId }, select: { displayName: true } });
        if (!identity) return null;
        return { userId, side, name: identity.displayName ?? contact.name, email: contact.email, organizationId: null };
      }
      const membership = await prisma.organizationMembership.findFirst({
        where: { userId, status: "active" },
        orderBy: { createdAt: "asc" },
        select: { organizationId: true }
      });
      if (!membership) return null;
      return { userId, side, name: contact.name, email: contact.email, organizationId: membership.organizationId };
    },
    async ownsRelated(requester, type, id) {
      if (!UUID.test(id)) return false;
      if (type === "assignment") {
        return Boolean(await prisma.assignment.findFirst({ where: { id, workerIdentity: { userId: requester.userId } }, select: { id: true } }));
      }
      if (type === "pay") {
        const identity = await prisma.workerIdentity.findFirst({ where: { userId: requester.userId }, select: { id: true } });
        if (!identity) return false;
        return Boolean(await prisma.payrollCalculation.findFirst({
          where: { id, workerIdentityId: identity.id, status: { in: ["approved", "locked"] } },
          select: { id: true }
        }));
      }
      if (type === "order" && requester.organizationId) {
        return Boolean(await prisma.employerOrder.findFirst({ where: { id, organizationId: requester.organizationId }, select: { id: true } }));
      }
      return false;
    },
    factsFor(requester) {
      return requester.side === "worker" ? workerFacts(prisma, requester.userId) : employerFacts(prisma, requester.organizationId);
    },
    createConversation({ requester, topic, relatedType, relatedId, urgent, now }) {
      return prisma.supportConversation.create({
        data: {
          requesterUserId: requester.userId,
          requesterKind: requester.side,
          organizationId: requester.organizationId,
          topic, relatedType, relatedId, urgent,
          lastMessageAt: now
        }
      });
    },
    async addMessage({ conversationId, authorKind, authorUserId, body, internal, now, touchConversation }) {
      const message = await prisma.supportMessage.create({
        data: { conversationId, authorKind, authorUserId, body, internal, createdAt: now }
      });
      if (touchConversation) {
        await prisma.supportConversation.update({ where: { id: conversationId }, data: { lastMessageAt: now } });
      }
      return message;
    },
    updateConversation(id, patch) {
      return prisma.supportConversation.update({ where: { id }, data: patch });
    },
    getConversation(id) {
      if (!UUID.test(id)) return Promise.resolve(null);
      return prisma.supportConversation.findUnique({ where: { id } });
    },
    listMessages(conversationId, includeInternal) {
      return prisma.supportMessage.findMany({
        where: { conversationId, ...(includeInternal ? {} : { internal: false }) },
        orderBy: { createdAt: "asc" }
      });
    },
    listForRequester(userId, side) {
      return prisma.supportConversation.findMany({
        where: { requesterUserId: userId, requesterKind: side },
        orderBy: { lastMessageAt: "desc" },
        take: 50
      });
    },
    async listForAdmin(filter, side) {
      const statuses: Record<AdminFilter, readonly string[] | null> = {
        needs_admin: ["needs_admin", "admin_replied"],
        ai: ["ai"],
        solved: ["solved"],
        all: null
      };
      const wanted = statuses[filter];
      const rows = await prisma.supportConversation.findMany({
        where: { ...(wanted ? { status: { in: [...wanted] } } : {}), ...(side ? { requesterKind: side } : {}) },
        orderBy: [{ urgent: "desc" }, { lastMessageAt: "asc" }],
        take: 100,
        include: { requester: { select: { displayName: true, emailNormalized: true } } }
      });
      return rows.map(({ requester, ...row }) => ({ ...row, requesterName: requester.displayName ?? requester.emailNormalized }));
    },
    countAiReplies(since, userId) {
      return prisma.supportMessage.count({
        where: {
          authorKind: "ai",
          createdAt: { gte: since },
          ...(userId ? { conversation: { requesterUserId: userId } } : {})
        }
      });
    },
    requesterContact: requesterName
  };
}

/** Best-effort alerts. They name no message content, so nothing private sits in an inbox or a text. */
export function createContactNotices(deps: {
  emailSender: EmailSender;
  smsSender: SmsSender;
  adminEmail: string | undefined;
  adminPhone: string | undefined;
}): ContactNotices {
  const describe = (c: ConversationRow) => `${c.requesterKind === "worker" ? "A worker" : "An employer"} (topic: ${c.topic})`;
  return {
    async adminNeeded({ conversation, urgent }) {
      const label = urgent ? "URGENT: " : "";
      if (deps.adminEmail) {
        await deps.emailSender.send({
          to: deps.adminEmail,
          subject: `${label}Joblop contact desk: a person is needed`,
          text: `${describe(conversation)} needs a person. Open the Contact desk in Joblop admin.`
        });
      }
      if (urgent && deps.adminPhone) {
        await deps.smsSender.send({ to: deps.adminPhone, text: `Joblop URGENT: ${describe(conversation)} needs a person. Open the Contact desk.` });
      }
    },
    async adminReplied({ email }) {
      if (!email) return;
      await deps.emailSender.send({
        to: email,
        subject: "Joblop replied to your message",
        text: "The Joblop team replied to your message. Sign in to Joblop and open Contact Joblop to read it."
      });
    }
  };
}

function chooseAi(isLocal: boolean): ContactAi | null {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (apiKey) {
    const model = process.env.CONTACT_AI_MODEL?.trim();
    return createClaudeContactAi({ apiKey, ...(model ? { model } : {}) });
  }
  return isLocal ? syntheticContactAi : null;
}

const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const readParam = (request: FastifyRequest, name: string): string => {
  const value = asObject(request.params)[name];
  return typeof value === "string" ? value : "";
};

const readSide = (request: FastifyRequest): ContactSide | null => {
  const side = readParam(request, "side");
  return side === "worker" || side === "employer" ? side : null;
};

function sendResult(reply: FastifyReply, result: { ok: true; value: unknown } | { ok: false; error: string }) {
  if (result.ok) return reply.code(200).send(result.value);
  const code = result.error === "not_found" ? 404 : 400;
  return reply.code(code).send({ error: "RWOS_CONTACT_REJECTED", message: result.error });
}

export function registerInstantContactRoutes(
  app: FastifyInstance,
  deps: {
    prisma: PrismaClient;
    emailSender: EmailSender;
    smsSender: SmsSender;
    isLocal: boolean;
    requireUser(request: FastifyRequest, reply: FastifyReply): Promise<{ id: string } | null>;
    requireAdmin(request: FastifyRequest, reply: FastifyReply): Promise<{ id: string } | null>;
  }
) {
  const monthly = Number(process.env.CONTACT_AI_MONTHLY_LIMIT);
  const service = createContactService({
    store: createPrismaContactStore(deps.prisma),
    ai: chooseAi(deps.isLocal),
    notices: createContactNotices({
      emailSender: deps.emailSender,
      smsSender: deps.smsSender,
      adminEmail: process.env.CONTACT_ADMIN_EMAIL?.trim() || undefined,
      adminPhone: process.env.CONTACT_ADMIN_PHONE?.trim() || undefined
    }),
    ...(Number.isInteger(monthly) && monthly >= 0 && process.env.CONTACT_AI_MONTHLY_LIMIT ? { aiRepliesPerMonth: monthly } : {})
  });

  const requester = async (request: FastifyRequest, reply: FastifyReply) => {
    const side = readSide(request);
    if (!side) {
      reply.code(404).send({ error: "RWOS_CONTACT_REJECTED", message: "not_found" });
      return null;
    }
    const user = await deps.requireUser(request, reply);
    return user ? { userId: user.id, side } : null;
  };

  app.get("/contact/:side/conversations", async (request, reply) => {
    const who = await requester(request, reply);
    if (!who) return;
    const [conversations, unread] = await Promise.all([
      service.listMine(who.userId, who.side),
      service.unreadCount(who.userId, who.side)
    ]);
    return reply.code(200).send({ conversations, unread });
  });

  app.post("/contact/:side/conversations", async (request, reply) => {
    const who = await requester(request, reply);
    if (!who) return;
    const body = asObject(request.body);
    return sendResult(reply, await service.start({
      ...who, topic: body.topic, body: body.body, urgent: body.urgent,
      relatedType: body.relatedType, relatedId: body.relatedId, locale: body.locale
    }));
  });

  app.get("/contact/:side/conversations/:id", async (request, reply) => {
    const who = await requester(request, reply);
    if (!who) return;
    return sendResult(reply, await service.getMine(who.userId, who.side, readParam(request, "id")));
  });

  app.post("/contact/:side/conversations/:id/messages", async (request, reply) => {
    const who = await requester(request, reply);
    if (!who) return;
    const body = asObject(request.body);
    return sendResult(reply, await service.send({ ...who, id: readParam(request, "id"), body: body.body, locale: body.locale }));
  });

  app.post("/contact/:side/conversations/:id/person", async (request, reply) => {
    const who = await requester(request, reply);
    if (!who) return;
    return sendResult(reply, await service.askForPerson(who.userId, who.side, readParam(request, "id"), asObject(request.body).locale));
  });

  app.get("/platform/contact/conversations", async (request, reply) => {
    const admin = await deps.requireAdmin(request, reply);
    if (!admin) return;
    const query = asObject(request.query);
    const filter: AdminFilter = query.filter === "ai" || query.filter === "solved" || query.filter === "all" ? query.filter : "needs_admin";
    const side = query.side === "worker" || query.side === "employer" ? query.side : null;
    return reply.code(200).send({ conversations: await service.adminList(filter, side) });
  });

  app.post("/platform/contact/ask", async (request, reply) => {
    const admin = await deps.requireAdmin(request, reply);
    if (!admin) return;
    const body = asObject(request.body);
    return sendResult(reply, await service.adminAsk({ question: body.question, conversationId: body.conversationId }));
  });

  app.get("/platform/contact/conversations/:id", async (request, reply) => {
    const admin = await deps.requireAdmin(request, reply);
    if (!admin) return;
    return sendResult(reply, await service.adminGet(readParam(request, "id")));
  });

  app.post("/platform/contact/conversations/:id/messages", async (request, reply) => {
    const admin = await deps.requireAdmin(request, reply);
    if (!admin) return;
    const body = asObject(request.body);
    return sendResult(reply, await service.adminSend({ adminId: admin.id, id: readParam(request, "id"), body: body.body, internal: body.internal }));
  });

  app.post("/platform/contact/conversations/:id/assign", async (request, reply) => {
    const admin = await deps.requireAdmin(request, reply);
    if (!admin) return;
    return sendResult(reply, await service.adminAssign(admin.id, readParam(request, "id")));
  });

  app.post("/platform/contact/conversations/:id/status", async (request, reply) => {
    const admin = await deps.requireAdmin(request, reply);
    if (!admin) return;
    return sendResult(reply, await service.adminSetStatus(admin.id, readParam(request, "id"), asObject(request.body).status));
  });
}
