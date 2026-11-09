// CV builder safety (launch step 6): hard timeout, friendly fallback to the basic CV in EN/FR/AR, input
// size limits, per-person daily and monthly limits, no retry, and the kill switch.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@rwos/database";
import { createClaudeCvProvider, CV_FALLBACK_NOTICES, CV_INPUT_LIMITS, generateCvSafely, getClaudeCvProvider, limitCvInput } from "./cvBuilderClaude";
import type { WorkerCvProfile } from "./cvBuilder";
import { resetOutsideAiCircuits } from "./outsideAi";
import { claimAiUse, createPrismaAiUsageStore, CV_WORKER_LIMITS, type AiUsageStore } from "./outsideAiUsage";

beforeEach(() => resetOutsideAiCircuits());

const silent = { info: vi.fn() };
const profile: WorkerCvProfile = { fullName: "Sam Tremblay", headline: "Cook", skills: ["Grill"], language: "en" };
const goodReply = { stop_reason: "end_turn", content: [{ type: "text", text: "## Profile\nCook.\n===COVER LETTER===\nHello,\n[CANDIDATE_NAME]" }] };
const respond = (body: unknown, status = 200) => vi.fn(async () => new Response(JSON.stringify(body), { status }));
const claude = (fetchImpl: unknown, timeoutMs?: number) =>
  createClaudeCvProvider({ apiKey: "k", fetchImpl: fetchImpl as typeof fetch, logger: silent, ...(timeoutMs ? { timeoutMs } : {}) });

function memoryUsage(): AiUsageStore & { rows: { feature: string; actorRef: string; at: Date }[] } {
  const rows: { feature: string; actorRef: string; at: Date }[] = [];
  return {
    rows,
    count: async (feature, actorRef, since) => rows.filter((r) => r.feature === feature && (!actorRef || r.actorRef === actorRef) && r.at >= since).length,
    record: async (feature, actorRef, at) => { rows.push({ feature, actorRef, at }); }
  };
}

describe("generateCvSafely", () => {
  it("returns the AI CV when the call works, with no note", async () => {
    const r = await generateCvSafely({ profile, job: null, ai: claude(respond(goodReply)) });
    expect(r.providerKind).toMatch(/^claude:/);
    expect(r.fallback).toBeNull();
    expect(r.cv.cvMarkdown).toContain("# Sam Tremblay");
  });

  it.each([
    ["an HTTP error", respond({ error: "x" }, 529)],
    ["a cut-off reply", respond({ stop_reason: "max_tokens", content: [{ type: "text", text: "## Profile\nCo" }] })],
    ["a refusal", respond({ stop_reason: "refusal", content: [] })],
    ["a reply without the letter", respond({ stop_reason: "end_turn", content: [{ type: "text", text: "## Profile" }] })],
    ["a network error", vi.fn(async () => { throw new TypeError("fetch failed"); })]
  ])("falls back to the basic CV with a friendly note on %s, and tries once only", async (_label, fetchImpl) => {
    const r = await generateCvSafely({ profile, job: { title: "Cook" }, ai: claude(fetchImpl) });
    expect(r.providerKind).toBe("synthetic-offline");
    expect(r.fallback?.reason).toBe("ai_unavailable");
    expect(r.fallback?.message).toEqual(CV_FALLBACK_NOTICES.ai_unavailable);
    expect(r.cv.cvMarkdown).toContain("Sam Tremblay");
    expect(JSON.stringify(r)).not.toContain("RWOS_");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("gives up after the timeout instead of keeping the worker waiting", async () => {
    const hanging = vi.fn((_url: string, init: RequestInit) =>
      new Promise<Response>((_resolve, reject) => init.signal?.addEventListener("abort", () => reject(init.signal?.reason)))
    );
    const started = Date.now();
    const r = await generateCvSafely({ profile, job: null, ai: claude(hanging, 30) });
    expect(Date.now() - started).toBeLessThan(2000);
    expect(r.fallback?.reason).toBe("ai_unavailable");
  });

  it("has the friendly notes in English, French and Arabic", () => {
    for (const notice of Object.values(CV_FALLBACK_NOTICES)) {
      expect(notice.en.length).toBeGreaterThan(20);
      expect(notice.fr.length).toBeGreaterThan(20);
      expect(notice.ar).toMatch(/[؀-ۿ]/);
    }
  });

  it("allows 10 AI CVs a day per worker, then the basic CV with the daily note", async () => {
    const usage = memoryUsage();
    const fetchImpl = respond(goodReply);
    const now = new Date("2026-11-09T12:00:00.000Z");
    const run = () =>
      generateCvSafely({ profile, job: null, ai: claude(fetchImpl), now: () => now, usage: { store: usage, feature: "cv_builder_worker", actorRef: "w1", limits: CV_WORKER_LIMITS } });
    for (let i = 0; i < 10; i++) expect((await run()).fallback).toBeNull();
    const eleventh = await run();
    expect(eleventh.fallback?.reason).toBe("daily_limit");
    expect(eleventh.providerKind).toBe("synthetic-offline");
    expect(fetchImpl).toHaveBeenCalledTimes(10);
    // Another worker is not affected.
    const other = await generateCvSafely({ profile, job: null, ai: claude(fetchImpl), now: () => now, usage: { store: usage, feature: "cv_builder_worker", actorRef: "w2", limits: CV_WORKER_LIMITS } });
    expect(other.fallback).toBeNull();
  });

  it("stops at the monthly cap for everyone", async () => {
    const usage = memoryUsage();
    const r = await generateCvSafely({ profile, job: null, ai: claude(respond(goodReply)), usage: { store: usage, feature: "f", actorRef: "w1", limits: { perActorPerDay: 10, perMonth: 0 } } });
    expect(r.fallback?.reason).toBe("monthly_limit");
  });

  it("stays on the safe side when the usage record cannot be read", async () => {
    const broken: AiUsageStore = { count: async () => { throw new Error("db down"); }, record: async () => {} };
    const fetchImpl = respond(goodReply);
    const r = await generateCvSafely({ profile, job: null, ai: claude(fetchImpl), usage: { store: broken, feature: "f", actorRef: "w1", limits: CV_WORKER_LIMITS } });
    expect(r.fallback?.reason).toBe("ai_unavailable");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("kill switch: no AI provider, and a note when a key is set", async () => {
    expect(getClaudeCvProvider({ ANTHROPIC_API_KEY: "k", AI_OUTSIDE_CALLS: "disabled" })).toBeNull();
    expect(getClaudeCvProvider({ ANTHROPIC_API_KEY: "k" })).not.toBeNull();
    const off = await generateCvSafely({ profile, job: null, ai: null, env: { ANTHROPIC_API_KEY: "k", AI_OUTSIDE_CALLS: "disabled" } });
    expect(off.fallback?.reason).toBe("ai_off");
    // No key at all (today's live setting): the basic CV, as before, with no note.
    const none = await generateCvSafely({ profile, job: null, ai: null, env: {} });
    expect(none.fallback).toBeNull();
    expect(none.providerKind).toBe("synthetic-offline");
  });
});

describe("limitCvInput", () => {
  it("cuts every field to a fixed size", () => {
    const big = "x".repeat(10_000);
    const { profile: p, job } = limitCvInput(
      {
        fullName: big, headline: big, summary: big, skills: Array.from({ length: 100 }, () => big), language: "en",
        experience: Array.from({ length: 50 }, () => ({ role: big, employer: big, start: big, highlights: Array.from({ length: 50 }, () => big) })),
        education: Array.from({ length: 50 }, () => ({ credential: big, institution: big, year: big })),
        certifications: Array.from({ length: 50 }, () => big)
      },
      { title: big, description: big }
    );
    expect(p.summary?.length).toBe(CV_INPUT_LIMITS.summary);
    expect(p.skills).toHaveLength(CV_INPUT_LIMITS.skills);
    expect(p.skills[0]).toHaveLength(CV_INPUT_LIMITS.skill);
    expect(p.experience).toHaveLength(CV_INPUT_LIMITS.experience);
    expect(p.experience?.[0]?.highlights).toHaveLength(CV_INPUT_LIMITS.highlights);
    expect(p.education).toHaveLength(CV_INPUT_LIMITS.education);
    expect(p.certifications).toHaveLength(CV_INPUT_LIMITS.certifications);
    expect(job?.description).toHaveLength(CV_INPUT_LIMITS.jobDescription);
    expect(job?.title).toHaveLength(CV_INPUT_LIMITS.field);
  });

  it("keeps the request under the size limit even at the largest input", async () => {
    const fetchImpl = respond(goodReply);
    const big = "word ".repeat(2000);
    await claude(fetchImpl).generate({
      profile: { fullName: "Sam", summary: big, skills: Array.from({ length: 40 }, () => big), language: "en", experience: Array.from({ length: 15 }, () => ({ role: big, employer: big, start: big, highlights: Array.from({ length: 8 }, () => big) })), education: Array.from({ length: 20 }, () => ({ credential: big, institution: big, year: big })), certifications: Array.from({ length: 30 }, () => big), languages: Array.from({ length: 20 }, () => big), headline: big, location: big },
      job: { title: "Cook", description: big }
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe("usage store", () => {
  it("claimAiUse records only allowed attempts", async () => {
    const usage = memoryUsage();
    const now = new Date("2026-11-09T12:00:00.000Z");
    expect(await claimAiUse(usage, { feature: "f", actorRef: "a", limits: { perActorPerDay: 1, perMonth: 5 }, now })).toBe("ok");
    expect(await claimAiUse(usage, { feature: "f", actorRef: "a", limits: { perActorPerDay: 1, perMonth: 5 }, now })).toBe("daily_limit");
    expect(usage.rows).toHaveLength(1);
    // A day later the person may try again.
    expect(await claimAiUse(usage, { feature: "f", actorRef: "a", limits: { perActorPerDay: 1, perMonth: 5 }, now: new Date(now.getTime() + 86_400_001) })).toBe("ok");
  });

  it("the Prisma store counts per person and per feature, and writes feature, person and time only", async () => {
    const count = vi.fn(async () => 3);
    const create = vi.fn(async () => ({}));
    const store = createPrismaAiUsageStore({ aiUsageEvent: { count, create } } as unknown as PrismaClient);
    const since = new Date("2026-11-01T00:00:00.000Z");
    expect(await store.count("cv_builder_worker", "w1", since)).toBe(3);
    expect(count).toHaveBeenCalledWith({ where: { feature: "cv_builder_worker", createdAt: { gte: since }, actorRef: "w1" } });
    await store.count("cv_builder_worker", null, since);
    expect(count).toHaveBeenLastCalledWith({ where: { feature: "cv_builder_worker", createdAt: { gte: since } } });
    await store.record("cv_builder_worker", "w1", since);
    expect(create).toHaveBeenCalledWith({ data: { feature: "cv_builder_worker", actorRef: "w1", createdAt: since } });
  });
});
