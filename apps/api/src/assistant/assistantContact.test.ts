// The assistant inside "Contact Joblop": off = exactly today's chat; on = AI reply plus action cards;
// any failure = today's hand-off to a person; safety, health and disputes never reach the assistant.
import { describe, expect, it, vi } from "vitest";
import {
  createContactService,
  fixedReply,
  type ContactAi,
  type ContactAssistant,
  type ContactNotices,
  type ContactStore,
  type ConversationRow,
  type MessageRow
} from "../instantContact";

function memoryStore() {
  const conversations = new Map<string, ConversationRow>();
  const messages: MessageRow[] = [];
  let next = 0;
  const store: ContactStore = {
    resolveRequester: async (userId, side) => ({ userId, side, name: "Sam", email: "sam@example.test", organizationId: side === "employer" ? "org-1" : null }),
    ownsRelated: async () => false,
    factsFor: async () => "facts",
    async createConversation({ requester, topic, relatedType, relatedId, urgent, now }) {
      const row: ConversationRow = {
        id: `c${++next}`, requesterUserId: requester.userId, requesterKind: requester.side, organizationId: requester.organizationId,
        topic, relatedType, relatedId, status: "ai", urgent, handoffReason: null, summary: null,
        assignedToUserId: null, lastMessageAt: now, requesterReadAt: null, adminReadAt: null, createdAt: now
      };
      conversations.set(row.id, row);
      return row;
    },
    async addMessage({ conversationId, authorKind, authorUserId, body, internal, now }) {
      const row = { id: `m${++next}`, conversationId, authorKind, authorUserId, body, internal, createdAt: now };
      messages.push(row);
      return row;
    },
    async updateConversation(id, patch) {
      const row = { ...conversations.get(id)!, ...patch };
      conversations.set(id, row);
      return row;
    },
    getConversation: async (id) => conversations.get(id) ?? null,
    listMessages: async (id) => messages.filter((m) => m.conversationId === id),
    listForRequester: async () => [...conversations.values()],
    listForAdmin: async () => [],
    countAiReplies: async () => 0,
    requesterContact: async () => ({ name: "Sam", email: null })
  };
  return { store, conversations, messages };
}

const plainAi: ContactAi = vi.fn(async () => ({ reply: "Plain answer.", handoff: false, urgent: false, summary: "s" }));
const card = { proposalId: "p1", token: "tok.sig", tool: "claim_open_job", card: { subject: "Kitchen helper" }, expiresAt: "2026-11-10T12:10:00Z" };

function setup(assistant: ContactAssistant | null) {
  const memory = memoryStore();
  const notices: ContactNotices = { adminNeeded: vi.fn(async () => {}), adminReplied: vi.fn(async () => {}) };
  const service = createContactService({ store: memory.store, ai: plainAi, notices, assistant });
  const start = (body: string, withSession = true) =>
    service.start({
      userId: "u1", side: "worker", topic: "shift", body, urgent: false, relatedType: undefined, relatedId: undefined, locale: "en",
      authorization: withSession ? "Bearer t" : undefined
    });
  return { ...memory, service, notices, start };
}

const assistantWith = (enabled: boolean, answer: Awaited<ReturnType<ContactAssistant["answer"]>>) => ({
  enabled: vi.fn(async () => enabled),
  answer: vi.fn(async () => answer)
});

describe("Contact Joblop with the role assistant", () => {
  it("switched off: exactly today's chat (plain AI reply, no cards, assistant never asked)", async () => {
    const assistant = assistantWith(false, null);
    const s = setup(assistant);
    const without = setup(null);
    await s.start("When is my shift?");
    await without.start("When is my shift?");
    expect(s.messages.map((m) => [m.authorKind, m.body])).toEqual(without.messages.map((m) => [m.authorKind, m.body]));
    expect(assistant.answer).not.toHaveBeenCalled();
    expect([...s.conversations.values()][0]!.status).toBe("ai");
  });

  it("without the person's own session header the assistant is not used", async () => {
    const assistant = assistantWith(true, { reply: "x", handoff: false, urgent: false, summary: "", cards: [] });
    const s = setup(assistant);
    await s.start("When is my shift?", false);
    expect(assistant.enabled).not.toHaveBeenCalled();
    expect(s.messages.at(-1)?.body).toBe("Plain answer.");
  });

  it("switched on: the AI reply plus one action card message; the person's bearer is passed through", async () => {
    const assistant = assistantWith(true, { reply: "Check the card and press Confirm.", handoff: false, urgent: false, summary: "Wants a job", cards: [card] });
    const s = setup(assistant);
    await s.start("Take the Laval job");
    expect(s.messages.map((m) => m.authorKind)).toEqual(["requester", "ai", "assistant_action"]);
    expect(JSON.parse(s.messages[2]!.body)).toMatchObject({ type: "assistant_action", proposalId: "p1", tool: "claim_open_job" });
    expect(assistant.answer).toHaveBeenCalledWith(expect.objectContaining({ role: "worker", userId: "u1", authorization: "Bearer t" }));
    expect(plainAi).not.toHaveBeenCalledWith(expect.objectContaining({ topic: "Take the Laval job" }));
  });

  it("any assistant failure falls back to today's hand-off to a person", async () => {
    const s = setup(assistantWith(true, null));
    await s.start("Take the Laval job");
    expect(s.messages.at(-1)).toMatchObject({ authorKind: "ai", body: fixedReply("ai_unavailable", "en") });
    expect([...s.conversations.values()][0]).toMatchObject({ status: "needs_admin", handoffReason: "ai_unavailable" });
  });

  it.each([
    ["I hurt my hand at work", "safety"],
    ["I am pregnant and need a lighter shift", "health"],
    ["I want to dispute my pay", "dispute"]
  ])("never sends %s to the assistant (%s goes to staff as today)", async (body, reason) => {
    const assistant = assistantWith(true, { reply: "x", handoff: false, urgent: false, summary: "", cards: [] });
    const s = setup(assistant);
    await s.start(body);
    expect(assistant.answer).not.toHaveBeenCalled();
    expect([...s.conversations.values()][0]).toMatchObject({ status: "needs_admin", handoffReason: reason });
  });

  it("feeds earlier cards and results back to the model as plain text, never the token", async () => {
    const assistant = assistantWith(true, { reply: "ok", handoff: false, urgent: false, summary: "", cards: [card] });
    const s = setup(assistant);
    const started = await s.start("Take the Laval job");
    const id = started.ok ? started.value.id : "";
    await s.service.addAssistantResult(id, { proposalId: "p1", status: "done", text: "Done. The job is yours." });
    await s.service.send({ userId: "u1", side: "worker", id, body: "Thanks, what time does it start?", locale: "en", authorization: "Bearer t" });
    const turns = (assistant.answer.mock.calls.at(-1) as unknown as [{ turns: { role: string; text: string }[] }])[0].turns;
    const joined = JSON.stringify(turns);
    expect(joined).toContain("I showed an action card: claim_open_job");
    expect(joined).toContain("Done. The job is yours.");
    expect(joined).not.toContain("tok.sig");
  });

  it("staff Ask: cards come back when the staff assistant is on; today's advice-only answer otherwise", async () => {
    const on = setup(assistantWith(true, { reply: "Approve it?", handoff: false, urgent: false, summary: "", cards: [card] }));
    expect(await on.service.adminAsk({ question: "Approve JR-1", conversationId: null, adminId: "s1", authorization: "Bearer s" })).toEqual({ ok: true, value: { answer: "Approve it?", cards: [card] } });
    const off = setup(assistantWith(false, null));
    expect(await off.service.adminAsk({ question: "Approve JR-1", conversationId: null, adminId: "s1", authorization: "Bearer s" })).toEqual({ ok: true, value: { answer: "Plain answer." } });
    const failed = setup(assistantWith(true, null));
    expect(await failed.service.adminAsk({ question: "Approve JR-1", conversationId: null, adminId: "s1", authorization: "Bearer s" })).toEqual({ ok: true, value: { answer: "Plain answer." } });
  });
});
