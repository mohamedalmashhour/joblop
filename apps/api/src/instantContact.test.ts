import { describe, expect, it, vi } from "vitest";
import {
  createClaudeContactAi,
  createContactService,
  fixedReply,
  personNeeded,
  type AiAnswer,
  type ContactAi,
  type ContactNotices,
  type ContactSide,
  type ContactStore,
  type ConversationRow,
  type MessageRow
} from "./instantContact";

const WORKER = "worker-user";
const OTHER = "other-user";

function memoryStore() {
  const conversations = new Map<string, ConversationRow>();
  const messages: MessageRow[] = [];
  let next = 0;
  const store: ContactStore = {
    resolveRequester: async (userId, side) => ({ userId, side, name: "Sam", email: "sam@example.test", organizationId: null }),
    ownsRelated: async (requester, _type, id) => id === `owned-by-${requester.userId}`,
    factsFor: async () => "facts",
    async createConversation({ requester, topic, relatedType, relatedId, urgent, now }) {
      const row: ConversationRow = {
        id: `c${++next}`, requesterUserId: requester.userId, requesterKind: requester.side, organizationId: null,
        topic, relatedType, relatedId, status: "ai", urgent, handoffReason: null, summary: null,
        assignedToUserId: null, lastMessageAt: now, requesterReadAt: null, adminReadAt: null, createdAt: now
      };
      conversations.set(row.id, row);
      return row;
    },
    async addMessage({ conversationId, authorKind, authorUserId, body, internal, now, touchConversation }) {
      const row = { id: `m${++next}`, conversationId, authorKind, authorUserId, body, internal, createdAt: now };
      messages.push(row);
      if (touchConversation) await store.updateConversation(conversationId, {});
      return row;
    },
    async updateConversation(id, patch) {
      const row = { ...conversations.get(id)!, ...patch };
      conversations.set(id, row);
      return row;
    },
    getConversation: async (id) => conversations.get(id) ?? null,
    listMessages: async (id, includeInternal) => messages.filter((m) => m.conversationId === id && (includeInternal || !m.internal)),
    listForRequester: async (userId, side) => [...conversations.values()].filter((c) => c.requesterUserId === userId && c.requesterKind === side),
    listForAdmin: async () => [...conversations.values()].map((c) => ({ ...c, requesterName: "Sam" })),
    countAiReplies: async (_since, userId) => messages.filter((m) => m.authorKind === "ai" && (!userId || conversations.get(m.conversationId)?.requesterUserId === userId)).length,
    requesterContact: async () => ({ name: "Sam", email: "sam@example.test" })
  };
  return { store, conversations, messages };
}

function setup(ai: ContactAi | null, limit?: number) {
  const memory = memoryStore();
  const notices: ContactNotices = { adminNeeded: vi.fn(async () => {}), adminReplied: vi.fn(async () => {}) };
  const service = createContactService({ store: memory.store, ai, notices, ...(limit === undefined ? {} : { aiRepliesPerMonth: limit }) });
  return { ...memory, notices, service };
}

const answering = (over: Partial<AiAnswer> = {}): ContactAi =>
  vi.fn(async () => ({ reply: "Your shift starts at 9.", handoff: false, urgent: false, summary: "Asked about a shift.", ...over }));

const start = (service: ReturnType<typeof setup>["service"], body: string, over: Record<string, unknown> = {}) =>
  service.start({ userId: WORKER, side: "worker" as ContactSide, topic: "shift", body, urgent: false, relatedType: undefined, relatedId: undefined, locale: "en", ...over });

describe("instant contact: who gets a person", () => {
  it.each([
    ["I hurt my back at the shift", "safety"],
    ["Je suis blessé", "safety"],
    ["هناك خطر هنا", "safety"],
    ["I want to dispute this pay", "dispute"],
    ["delete my account please", "account"],
    ["let me talk to a human", "person_requested"],
    ["I am pregnant, can I still do the warehouse shift?", "health"],
    ["J'ai un billet médical pour lundi", "health"],
    ["أنا حامل ولا أستطيع العمل", "health"],
    ["I can do medication reminders and first aid", null],
    ["What time is my shift?", null]
  ])("%s -> %s", (text, reason) => {
    expect(personNeeded(text)).toBe(reason);
  });

  it("answers ordinary questions with AI and leaves them with AI", async () => {
    const { service, conversations, messages, notices } = setup(answering());
    await start(service, "What time is my shift?");
    expect(conversations.get("c1")).toMatchObject({ status: "ai", summary: "Asked about a shift." });
    expect(messages.map((m) => m.authorKind)).toEqual(["requester", "ai"]);
    expect(notices.adminNeeded).not.toHaveBeenCalled();
  });

  it("never sends a safety message to the model and marks it urgent", async () => {
    const ai = answering();
    const { service, conversations, messages, notices } = setup(ai);
    await start(service, "I was injured at work");
    expect(ai).not.toHaveBeenCalled();
    expect(conversations.get("c1")).toMatchObject({ status: "needs_admin", urgent: true, handoffReason: "safety" });
    expect(messages.at(-1)?.body).toBe(fixedReply("safety", "en"));
    expect(notices.adminNeeded).toHaveBeenCalledOnce();
  });

  it("hands off when AI is missing, fails, or says it is unsure", async () => {
    const none = setup(null);
    await start(none.service, "What time is my shift?");
    expect(none.conversations.get("c1")).toMatchObject({ status: "needs_admin", handoffReason: "ai_unavailable" });

    const broken = setup(vi.fn(async () => null));
    await start(broken.service, "What time is my shift?");
    expect(broken.conversations.get("c1")).toMatchObject({ status: "needs_admin", handoffReason: "ai_unavailable" });

    const unsure = setup(answering({ handoff: true }));
    await start(unsure.service, "What time is my shift?");
    expect(unsure.conversations.get("c1")).toMatchObject({ status: "needs_admin", handoffReason: "ai_unsure" });
  });

  it("sends urgent messages to admin even when AI can answer", async () => {
    const { service, conversations } = setup(answering());
    await start(service, "I cannot check in", { urgent: true });
    expect(conversations.get("c1")).toMatchObject({ status: "needs_admin", urgent: true, handoffReason: "urgent" });
  });

  it("stops calling AI past the monthly limit and goes to a person", async () => {
    const ai = answering();
    const { service, conversations } = setup(ai, 0);
    await start(service, "What time is my shift?");
    expect(ai).not.toHaveBeenCalled();
    expect(conversations.get("c1")).toMatchObject({ status: "needs_admin", handoffReason: "ai_limit" });
  });

  it("does not let AI answer once a conversation is with admin", async () => {
    const ai = answering();
    const { service, conversations } = setup(ai);
    await start(service, "let me talk to a human");
    expect(ai).toHaveBeenCalledTimes(1);
    await service.send({ userId: WORKER, side: "worker", id: "c1", body: "Are you there?", locale: "en" });
    expect(ai).toHaveBeenCalledTimes(1);
    expect(conversations.get("c1")?.status).toBe("needs_admin");
  });
});

describe("instant contact: privacy", () => {
  it("treats another person's conversation as not found", async () => {
    const { service } = setup(answering());
    await start(service, "What time is my shift?");
    await expect(service.getMine(OTHER, "worker", "c1")).resolves.toEqual({ ok: false, error: "not_found" });
    await expect(service.send({ userId: OTHER, side: "worker", id: "c1", body: "hi", locale: "en" })).resolves.toEqual({ ok: false, error: "not_found" });
    await expect(service.askForPerson(OTHER, "worker", "c1", "en")).resolves.toEqual({ ok: false, error: "not_found" });
    await expect(service.getMine(WORKER, "employer", "c1")).resolves.toEqual({ ok: false, error: "not_found" });
  });

  it("refuses a related item the person does not own", async () => {
    const { service } = setup(answering());
    await expect(start(service, "About this shift", { relatedType: "assignment", relatedId: "owned-by-someone-else" })).resolves.toEqual({ ok: false, error: "not_found" });
    await expect(start(service, "About this shift", { relatedType: "order", relatedId: `owned-by-${WORKER}` })).resolves.toEqual({ ok: false, error: "invalid" });
    await expect(start(service, "About this shift", { relatedType: "assignment", relatedId: `owned-by-${WORKER}` })).resolves.toMatchObject({ ok: true });
  });

  it("hides internal notes from the requester but shows them to admin", async () => {
    const { service } = setup(answering());
    await start(service, "What time is my shift?");
    await service.adminSend({ adminId: "admin", id: "c1", body: "Note for staff", internal: true });
    const mine = await service.getMine(WORKER, "worker", "c1");
    const desk = await service.adminGet("c1");
    expect(mine.ok && JSON.stringify(mine.value)).not.toContain("Note for staff");
    expect(desk.ok && JSON.stringify(desk.value)).toContain("Note for staff");
  });

  it("rejects an empty or oversized message and an unknown topic", async () => {
    const { service } = setup(answering());
    await expect(start(service, "   ")).resolves.toEqual({ ok: false, error: "invalid" });
    await expect(start(service, "x".repeat(2001))).resolves.toEqual({ ok: false, error: "invalid" });
    await expect(start(service, "hello", { topic: "invoice" })).resolves.toEqual({ ok: false, error: "invalid" });
  });
});

describe("instant contact: admin", () => {
  it("replies, marks unread for the requester, and sends an alert", async () => {
    const { service, conversations, notices } = setup(answering());
    await start(service, "let me talk to a human");
    await service.adminSend({ adminId: "admin", id: "c1", body: "Hello, I can help", internal: false });
    expect(conversations.get("c1")).toMatchObject({ status: "admin_replied", assignedToUserId: "admin" });
    expect(notices.adminReplied).toHaveBeenCalledOnce();
    await expect(service.unreadCount(WORKER, "worker")).resolves.toBe(1);
  });

  it("only accepts solved or reopen, and a new message reopens a solved conversation", async () => {
    const { service, conversations } = setup(answering());
    await start(service, "What time is my shift?");
    await expect(service.adminSetStatus("admin", "c1", "ai")).resolves.toEqual({ ok: false, error: "invalid" });
    await service.adminSetStatus("admin", "c1", "solved");
    expect(conversations.get("c1")?.status).toBe("solved");
    await service.send({ userId: WORKER, side: "worker", id: "c1", body: "One more question", locale: "en" });
    expect(conversations.get("c1")?.status).toBe("needs_admin");
  });
});

describe("staff assistant", () => {
  it("answers staff without saving anything or changing the conversation", async () => {
    const ai = vi.fn(async () => ({ reply: "Open /timesheets.", handoff: false, urgent: false, summary: "" }));
    const { service, conversations, messages } = setup(ai);
    await start(service, "let me talk to a human");
    const before = messages.length;
    const status = conversations.get("c1")?.status;
    await expect(service.adminAsk({ question: "Draft a reply", conversationId: "c1" })).resolves.toEqual({ ok: true, value: { answer: "Open /timesheets." } });
    expect(ai).toHaveBeenLastCalledWith(expect.objectContaining({ audience: "admin" }));
    expect(messages).toHaveLength(before);
    expect(conversations.get("c1")?.status).toBe(status);
  });

  it("leaves internal notes out of what it reads", async () => {
    const ai = vi.fn(async () => ({ reply: "ok", handoff: false, urgent: false, summary: "" }));
    const { service } = setup(ai);
    await start(service, "What time is my shift?");
    await service.adminSend({ adminId: "admin", id: "c1", body: "Staff secret", internal: true });
    await service.adminAsk({ question: "Summarize", conversationId: "c1" });
    expect(JSON.stringify(ai.mock.calls.at(-1))).not.toContain("Staff secret");
  });

  it("returns no answer without AI and rejects an empty question", async () => {
    const { service } = setup(null);
    await expect(service.adminAsk({ question: "Help", conversationId: null })).resolves.toEqual({ ok: true, value: { answer: null } });
    await expect(service.adminAsk({ question: " ", conversationId: null })).resolves.toEqual({ ok: false, error: "invalid" });
  });
});

describe("Claude contact AI", () => {
  const input = { audience: "worker" as const, topic: "pay", facts: "{}", turns: [{ role: "user" as const, text: "hi" }] };
  const reply = (body: unknown, status = 200) => vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
  const content = (value: unknown) => [{ type: "text", text: JSON.stringify(value) }];

  it("sends no tools, asks for structured output, and reads the answer", async () => {
    const fetchImpl = reply({ stop_reason: "end_turn", content: content({ reply: "Hello", handoff: false, urgent: false, summary: "Greeting" }) });
    const answer = await createClaudeContactAi({ apiKey: "key", fetchImpl })(input);
    expect(answer).toEqual({ reply: "Hello", handoff: false, urgent: false, summary: "Greeting" });
    const sent = JSON.parse(String((fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[1]?.body));
    expect(sent.tools).toBeUndefined();
    expect(sent.model).toBe("claude-opus-5-5");
    expect(sent.output_config.format.type).toBe("json_schema");
  });

  it("gives each audience only its own guide", async () => {
    const systemFor = async (audience: "worker" | "employer" | "admin") => {
      const fetchImpl = reply({ stop_reason: "end_turn", content: content({ reply: "Hi", handoff: false, urgent: false, summary: "" }) });
      await createClaudeContactAi({ apiKey: "key", fetchImpl })({ ...input, audience });
      return String(JSON.parse(String((fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[1]?.body)).system[0].text);
    };
    const [worker, employer, staff] = await Promise.all([systemFor("worker"), systemFor("employer"), systemFor("admin")]);
    expect(worker).toContain("/schedule");
    expect(worker).not.toContain("defaults to 20%");
    expect(worker).not.toContain("KNOWN GAPS");
    expect(employer).toContain("/employer/calendar/create");
    expect(employer).not.toContain("defaults to 20%");
    expect(employer).not.toContain("FINANCE JOURNEY");
    expect(staff).toContain("FINANCE JOURNEY");
  });

  it.each([
    ["a refusal", { stop_reason: "refusal", content: [] }, 200],
    ["a cut-off reply", { stop_reason: "max_tokens", content: content({ reply: "He" }) }, 200],
    ["bad JSON", { stop_reason: "end_turn", content: [{ type: "text", text: "not json" }] }, 200],
    ["an empty reply", { stop_reason: "end_turn", content: content({ reply: "  " }) }, 200],
    ["a server error", { error: "x" }, 500]
  ])("returns nothing on %s", async (_name, body, status) => {
    await expect(createClaudeContactAi({ apiKey: "key", fetchImpl: reply(body, status) })(input)).resolves.toBeNull();
  });

  it("returns nothing when the network fails", async () => {
    const fetchImpl = vi.fn(async () => { throw new Error("offline"); }) as unknown as typeof fetch;
    await expect(createClaudeContactAi({ apiKey: "key", fetchImpl })(input)).resolves.toBeNull();
  });
});
