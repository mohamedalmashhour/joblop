// The proposal / confirm flow, the switches, the bounded model loop and the privacy filter on tool
// results. The model is always a scripted fake: no real outside-AI call happens in these tests.
import { createMemoryBrainStore } from "@rwos/brain";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetOutsideAiCircuits } from "../outsideAi";
import { ASSISTANT_MAX_STEPS, runAssistantLoop, type LoopFailure } from "./assistantLoop";
import { ASSISTANT_TOOLS, assistantSwitchKeys, createAssistantService } from "./assistantService";
import type { ApiCaller, ReadTool } from "./assistantTypes";
import { createProposalSigner, PROPOSAL_TTL_MS } from "./proposalToken";
import { EMPLOYER_ID, JOB_ID, ORG_ID, OTHER_ORG_ID, WORKER_ID, context, fakeApi, fakeModel, ok, text, thinking, toolUse } from "./assistantTestKit";

beforeEach(() => resetOutsideAiCircuits());

const ALL_ON = Object.fromEntries(assistantSwitchKeys().map((k) => [k, true]));
const JOB = { job: { role: "Kitchen helper", startAt: "2026-11-12T13:00:00.000Z", endAt: "2026-11-12T19:00:00.000Z", areaLabel: "Laval, QC", claimable: true, employerHourlyRateMinor: 4500 } };

function setup(options: { switches?: Record<string, boolean>; script?: Parameters<typeof fakeModel>[0]; apiKey?: string | null } = {}) {
  const store = createMemoryBrainStore({ switches: options.switches ?? ALL_ON });
  let nowMs = Date.parse("2026-11-10T12:00:00Z");
  const api = fakeApi({
    [`GET /marketplace/jobs/${JOB_ID}`]: () => ok(JOB),
    [`POST /marketplace/jobs/${JOB_ID}/claim`]: () => ok({ status: "assigned" }, 201),
    "GET /worker/attendance": () => ok({ items: [{ attendanceRecordId: "a1", status: "scheduled", scheduledStartAt: "2026-11-12T13:00:00Z", scheduledEndAt: "2026-11-12T19:00:00Z", employerName: "Bistro", areaLabel: "Laval, QC", worksiteAddress: "4500 rue Principale" }] })
  });
  const authorizations: string[] = [];
  const callerFor = (authorization: string): ApiCaller => {
    authorizations.push(authorization);
    return api.call;
  };
  const model = fakeModel(options.script ?? [
    { stop: "tool_use", content: [thinking(), toolUse("t1", "claim_open_job", { jobRequestId: JOB_ID })] },
    { stop: "end_turn", content: [text("Check the card and press Confirm.")] }
  ]);
  const logger = { info: vi.fn() };
  const service = createAssistantService({
    store,
    signer: createProposalSigner("x".repeat(40)),
    apiKey: () => (options.apiKey === undefined ? "test-key" : options.apiKey),
    model: "claude-opus-5-5",
    guideFor: () => "GUIDE",
    callerFor,
    now: () => new Date(nowMs),
    fetchImpl: model.fetchImpl,
    logger,
    env: {}
  });
  const worker = { role: "worker" as const, userId: WORKER_ID, organizationId: null, locale: "en" as const };
  return { store, api, model, service, worker, logger, authorizations, advance: (ms: number) => (nowMs += ms) };
}

async function proposeClaim(s: ReturnType<typeof setup>) {
  const answer = await s.service.answer({ ...s.worker, turns: [{ role: "user", text: "Take the Laval kitchen job for me" }], authorization: "Bearer worker-token" });
  expect(answer).not.toBeNull();
  expect(answer!.cards).toHaveLength(1);
  return answer!.cards[0]!;
}

describe("proposal and confirm", () => {
  it("only proposes; the action runs after Confirm, as the person, once, and is audit-logged", async () => {
    const s = setup();
    const card = await proposeClaim(s);
    expect(card.tool).toBe("claim_open_job");
    expect(card.card).toMatchObject({ subject: "Kitchen helper", place: "Laval, QC" });
    expect(JSON.stringify(card.card)).not.toContain("4500");
    // Proposing never called the claim route.
    expect(s.api.calls.some((c) => c.method === "POST")).toBe(false);
    // The proposal is recorded but is not an open problem.
    expect(await s.store.openIssues()).toHaveLength(0);

    const confirmed = await s.service.confirm({ ...s.worker, token: card.token, authorization: "Bearer worker-token" });
    expect(confirmed).toMatchObject({ status: "done", code: "claimed", tool: "claim_open_job" });
    expect(s.api.calls.filter((c) => c.method === "POST").map((c) => c.url)).toEqual([`/marketplace/jobs/${JOB_ID}/claim`]);
    expect(s.authorizations.every((a) => a === "Bearer worker-token")).toBe(true);
    const [logged] = await s.store.listActions(10);
    expect(logged).toMatchObject({ actionKey: "assistant.claim_open_job", status: "done", actor: { type: "user", userId: WORKER_ID } });
    expect(logged!.detail).toContain("Undo:");

    // Replay: the same card again is refused and nothing runs twice.
    const replay = await s.service.confirm({ ...s.worker, token: card.token, authorization: "Bearer worker-token" });
    expect(replay).toMatchObject({ status: "rejected", reason: "already_used" });
    expect(s.api.calls.filter((c) => c.method === "POST")).toHaveLength(1);
  });

  it("rejects a tampered proposal (changed args or forged signature)", async () => {
    const s = setup();
    const card = await proposeClaim(s);
    const [body, signature] = card.token.split(".") as [string, string];
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Record<string, unknown>;
    const changed = Buffer.from(JSON.stringify({ ...payload, args: { jobRequestId: "00000000-0000-4000-8000-000000000000" } })).toString("base64url");
    expect(await s.service.confirm({ ...s.worker, token: `${changed}.${signature}`, authorization: "Bearer worker-token" })).toMatchObject({ status: "rejected", reason: "invalid" });
    const otherKey = createProposalSigner("y".repeat(40)).sign(payload as never);
    expect(await s.service.confirm({ ...s.worker, token: otherKey, authorization: "Bearer worker-token" })).toMatchObject({ status: "rejected", reason: "invalid" });
    expect(await s.service.confirm({ ...s.worker, token: "garbage", authorization: "Bearer worker-token" })).toMatchObject({ status: "rejected", reason: "invalid" });
    expect(s.api.calls.some((c) => c.method === "POST")).toBe(false);
  });

  it("rejects an expired proposal", async () => {
    const s = setup();
    const card = await proposeClaim(s);
    s.advance(PROPOSAL_TTL_MS + 1);
    expect(await s.service.confirm({ ...s.worker, token: card.token, authorization: "Bearer worker-token" })).toMatchObject({ status: "rejected", reason: "expired" });
    expect(s.api.calls.some((c) => c.method === "POST")).toBe(false);
  });

  it("rejects a proposal used by someone else, from another side, or another company", async () => {
    const s = setup();
    const card = await proposeClaim(s);
    expect(await s.service.confirm({ ...s.worker, userId: EMPLOYER_ID, token: card.token, authorization: "Bearer x" })).toMatchObject({ reason: "not_yours" });
    expect(await s.service.confirm({ ...s.worker, role: "employer", organizationId: ORG_ID, token: card.token, authorization: "Bearer x" })).toMatchObject({ reason: "not_yours" });
    expect(await s.service.confirm({ ...s.worker, role: "staff", token: card.token, authorization: "Bearer x" })).toMatchObject({ reason: "not_yours" });
    expect(s.api.calls.some((c) => c.method === "POST")).toBe(false);

    const signer = createProposalSigner("x".repeat(40));
    const employerToken = signer.sign({ v: 1, pid: "p", iid: "i", uid: EMPLOYER_ID, role: "employer", org: ORG_ID, tool: "submit_draft", args: { jobRequestId: JOB_ID }, exp: Date.parse("2026-11-10T12:05:00Z") });
    expect(await s.service.confirm({ role: "employer", userId: EMPLOYER_ID, organizationId: OTHER_ORG_ID, locale: "en", token: employerToken, authorization: "Bearer x" })).toMatchObject({ reason: "not_yours" });
  });

  it("Cancel is logged and the card can no longer be confirmed", async () => {
    const s = setup();
    const card = await proposeClaim(s);
    expect(await s.service.cancel({ ...s.worker, token: card.token })).toMatchObject({ status: "cancelled" });
    expect(await s.service.confirm({ ...s.worker, token: card.token, authorization: "Bearer worker-token" })).toMatchObject({ status: "rejected", reason: "already_used" });
    const [logged] = await s.store.listActions(10);
    expect(logged).toMatchObject({ status: "skipped", actionKey: "assistant.claim_open_job" });
    expect(s.api.calls.some((c) => c.method === "POST")).toBe(false);
  });

  it("re-checks the switches at Confirm", async () => {
    const s = setup();
    const card = await proposeClaim(s);
    await s.store.saveSwitch("assistant.worker.claim_job", false, null, new Date());
    expect(await s.service.confirm({ ...s.worker, token: card.token, authorization: "Bearer worker-token" })).toMatchObject({ status: "rejected", reason: "switched_off" });
    await s.store.saveSwitch("assistant.worker.claim_job", true, null, new Date());
    await s.store.saveSwitch("assistant", false, null, new Date());
    expect(await s.service.confirm({ ...s.worker, token: card.token, authorization: "Bearer worker-token" })).toMatchObject({ status: "rejected", reason: "switched_off" });
    expect(s.api.calls.some((c) => c.method === "POST")).toBe(false);
  });

  it("an action whose own switch is off is never proposed", async () => {
    const s = setup({ switches: { ...ALL_ON, "assistant.worker.claim_job": false } });
    const answer = await s.service.answer({ ...s.worker, turns: [{ role: "user", text: "Take it" }], authorization: "Bearer worker-token" });
    expect(answer?.cards).toEqual([]);
    const secondCall = JSON.stringify(s.model.bodies[1]);
    expect(secondCall).toContain("switched_off");
  });

  it("rate-limits confirms per person", async () => {
    const s = setup();
    const service = createAssistantService({
      store: s.store, signer: createProposalSigner("x".repeat(40)), apiKey: () => "k", model: "m", guideFor: () => "", callerFor: () => s.api.call,
      confirmsPerTenMinutes: 1, now: () => new Date("2026-11-10T12:00:00Z")
    });
    await service.confirm({ ...s.worker, token: "bad.token", authorization: "Bearer a" });
    const card = await proposeClaim(s);
    expect((await service.confirm({ ...s.worker, token: card.token, authorization: "Bearer a" })).status).toBe("done");
    const second = await proposeClaim(s);
    expect(await service.confirm({ ...s.worker, token: second.token, authorization: "Bearer a" })).toMatchObject({ reason: "rate_limited" });
  });
});

describe("switches: off means today's behaviour", () => {
  it("is off by default (every switch starts off) and without an AI key", async () => {
    const off = setup({ switches: {} });
    expect(await off.service.enabled("worker")).toBe(false);
    expect(await off.service.answer({ ...off.worker, turns: [{ role: "user", text: "hi" }], authorization: "Bearer a" })).toBeNull();
    expect(off.model.calls()).toBe(0);
    const masterOnly = setup({ switches: { assistant: true } });
    expect(await masterOnly.service.enabled("worker")).toBe(false);
    const roleOnly = setup({ switches: { "assistant.worker": true } });
    expect(await roleOnly.service.enabled("worker")).toBe(false);
    const noKey = setup({ apiKey: null });
    expect(await noKey.service.enabled("worker")).toBe(false);
    const on = setup({ switches: { assistant: true, "assistant.worker": true } });
    expect(await on.service.enabled("worker")).toBe(true);
    expect(await on.service.enabled("employer")).toBe(false);
  });
});

describe("the model loop", () => {
  const readTool: ReadTool = {
    kind: "read", name: "my_profile_test", role: "worker", description: "d", inputSchema: { type: "object", properties: {}, additionalProperties: false },
    run: async () => ({ email: "sam@example.com", note: "call me at 514-555-0199", employerHourlyRateMinor: 4500, ok: true })
  };
  const base = (script: Parameters<typeof fakeModel>[0], over: Partial<Parameters<typeof runAssistantLoop>[0]> = {}) => {
    const model = fakeModel(script);
    const failures: LoopFailure[] = [];
    const logger = { info: vi.fn() };
    const run = runAssistantLoop({
      apiKey: "k", model: "claude-opus-5-5", role: "worker", system: "S", context: "C",
      turns: [{ role: "user", text: "What is on my profile? my email is me@example.org" }],
      tools: new Map([[readTool.name, readTool]]), actionAllowed: () => true,
      ctx: context({ call: fakeApi({}).call }), fetchImpl: model.fetchImpl, logger, env: {},
      onFailure: (r) => failures.push(r), ...over
    });
    return { model, failures, run, logger };
  };

  it("runs read tools, passes thinking blocks back unchanged, and filters tool results before they leave", async () => {
    const t = base([
      { stop: "tool_use", content: [thinking(), toolUse("a", "my_profile_test", {})] },
      { stop: "end_turn", content: [text("Your profile is fine.")] }
    ]);
    const answer = await t.run;
    expect(answer).toMatchObject({ reply: "Your profile is fine.", proposals: [], handoff: false });
    expect(t.model.calls()).toBe(2);
    const second = t.model.bodies[1] as { messages: { role: string; content: unknown }[]; tools: { name: string }[]; model: string; fallbacks: string };
    expect(second.model).toBe("claude-opus-5-5");
    expect(second.fallbacks).toBe("default");
    expect(second.tools.map((x) => x.name)).toEqual(["my_profile_test", "hand_to_staff"]);
    expect(second.messages[1]).toEqual({ role: "assistant", content: [thinking(), toolUse("a", "my_profile_test", {})] });
    const sent = JSON.stringify(second);
    // The person's own text and the tool result both passed the privacy filter.
    expect(sent).not.toContain("me@example.org");
    expect(sent).not.toContain("sam@example.com");
    expect(sent).not.toContain("514-555-0199");
    expect(sent).toContain("[phone]");
    expect(sent).not.toContain("employerHourlyRateMinor");
    expect(t.logger.info).toHaveBeenCalledWith("ai.privacy_filter", expect.objectContaining({ feature: "role_assistant_tool" }));
  });

  it("hand_to_staff marks the turn for a person", async () => {
    const t = base([
      { stop: "tool_use", content: [toolUse("h", "hand_to_staff", { urgent: true, summary: "Pay dispute" })] },
      { stop: "end_turn", content: [text("The Joblop team will reply here.")] }
    ]);
    expect(await t.run).toMatchObject({ handoff: true, urgent: true, summary: "Pay dispute" });
  });

  it(`stops after ${ASSISTANT_MAX_STEPS} model calls`, async () => {
    const t = base([{ stop: "tool_use", content: [toolUse("a", "my_profile_test", {})] }]);
    expect(await t.run).toBeNull();
    expect(t.model.calls()).toBe(ASSISTANT_MAX_STEPS);
    expect(t.failures).toEqual(["too_many_steps"]);
  });

  it("stops at the overall deadline", async () => {
    let nowMs = 0;
    const model = fakeModel([{ stop: "tool_use", content: [toolUse("a", "my_profile_test", {})] }]);
    const slowFetch = (async (...args: Parameters<typeof fetch>) => {
      nowMs += 20_000;
      return (model.fetchImpl as (...a: Parameters<typeof fetch>) => Promise<Response>)(...args);
    }) as typeof fetch;
    const t = base([], { fetchImpl: slowFetch, clock: () => nowMs, deadlineMs: 45_000 });
    expect(await t.run).toBeNull();
    expect(model.calls()).toBe(3);
    expect(t.failures).toEqual(["deadline"]);
  });

  it.each([
    [[{ stop: "refusal", content: [] }], "refusal"],
    [[{ stop: "max_tokens", content: [text("cut")] }], "cut_off"],
    [[{ stop: "pause_turn", content: [] }], "unexpected_stop"],
    [[{ status: 500 }], "ai_failed"],
    [[{ stop: "end_turn", content: [] }], "empty_reply"]
  ] as const)("returns null (falls back) on %j", async (script, reason) => {
    const t = base(script as never);
    expect(await t.run).toBeNull();
    expect(t.failures).toEqual([reason]);
  });

  it("never sends a request when the outside-AI kill switch is on", async () => {
    const t = base([{ stop: "end_turn", content: [text("x")] }], { env: { AI_OUTSIDE_CALLS: "disabled" } });
    expect(await t.run).toBeNull();
    expect(t.model.calls()).toBe(0);
  });

  it("allows one proposal per turn and returns an error for unknown tools", async () => {
    const s = setup({
      script: [
        { stop: "tool_use", content: [toolUse("1", "claim_open_job", { jobRequestId: JOB_ID }), toolUse("2", "claim_open_job", { jobRequestId: JOB_ID }), toolUse("3", "pay_me_now", {})] },
        { stop: "end_turn", content: [text("ok")] }
      ]
    });
    const answer = await s.service.answer({ ...s.worker, turns: [{ role: "user", text: "go" }], authorization: "Bearer a" });
    expect(answer?.cards).toHaveLength(1);
    const results = JSON.stringify(s.model.bodies[1]);
    expect(results).toContain("one_action_at_a_time");
    expect(results).toContain("unknown_tool");
  });

  it("every registered tool definition is valid for the Messages API", () => {
    for (const map of Object.values(ASSISTANT_TOOLS)) {
      for (const tool of map.values()) {
        expect(tool.inputSchema.type).toBe("object");
        expect(tool.inputSchema.additionalProperties).toBe(false);
        for (const key of tool.inputSchema.required ?? []) expect(Object.keys(tool.inputSchema.properties)).toContain(key);
        expect(tool.description.length).toBeGreaterThan(20);
      }
    }
  });
});
