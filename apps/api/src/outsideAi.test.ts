// The one door to an outside AI: kill switch, text only, health guard, size limit, timeout, no retry,
// pause after failures, metadata-only logs, and no second door anywhere in the code.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { callOutsideAi, finishedText, hasNonTextContent, outsideAiApiKey, outsideAiCallsEnabled, resetOutsideAiCircuits, type OutsideAiCall } from "./outsideAi";

beforeEach(() => resetOutsideAiCircuits());

const ok = () => vi.fn(async () => new Response(JSON.stringify({ stop_reason: "end_turn", content: [{ type: "text", text: "Hello" }] }), { status: 200 }));

function call(over: Partial<OutsideAiCall> = {}): OutsideAiCall {
  return {
    feature: "contact_chat",
    apiKey: "k",
    body: { model: "claude-opus-5-5", max_tokens: 100, messages: [{ role: "user", content: "What time is my shift? SECRET-PROMPT-TEXT" }] },
    userContent: ["What time is my shift? SECRET-PROMPT-TEXT"],
    env: {},
    logger: { info: vi.fn() },
    fetchImpl: ok() as unknown as typeof fetch,
    ...over
  };
}

describe("kill switch AI_OUTSIDE_CALLS", () => {
  it("is on by default (today's live behaviour) and off only when set", () => {
    expect(outsideAiCallsEnabled({})).toBe(true);
    expect(outsideAiCallsEnabled({ AI_OUTSIDE_CALLS: "enabled" })).toBe(true);
    for (const value of ["disabled", "DISABLED", " off ", "false", "0"]) expect(outsideAiCallsEnabled({ AI_OUTSIDE_CALLS: value })).toBe(false);
  });

  it("hides the API key when off, so every feature uses its rules", () => {
    expect(outsideAiApiKey({ ANTHROPIC_API_KEY: " sk " })).toBe("sk");
    expect(outsideAiApiKey({ ANTHROPIC_API_KEY: "sk", AI_OUTSIDE_CALLS: "disabled" })).toBeNull();
    expect(outsideAiApiKey({})).toBeNull();
  });

  it("makes no network call when off", async () => {
    const fetchImpl = vi.fn();
    const result = await callOutsideAi(call({ env: { AI_OUTSIDE_CALLS: "disabled" }, fetchImpl: fetchImpl as unknown as typeof fetch }));
    expect(result).toEqual({ ok: false, outcome: "disabled" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("text only: no image, scan or base64 ever leaves", () => {
  it.each([
    ["an image block", { messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: "image/png", data: "aGVsbG8=" } }] }] }],
    ["a document block", { messages: [{ role: "user", content: [{ type: "document", source: { type: "url", url: "https://x" } }] }] }],
    ["a data: URI", { messages: [{ role: "user", content: "data:image/jpeg;base64,/9j/4AAQ" }] }],
    ["a long base64 run", { messages: [{ role: "user", content: "A".repeat(3000) }] }]
  ])("refuses %s", async (_label, body) => {
    expect(hasNonTextContent(body)).toBe(true);
    const fetchImpl = vi.fn();
    const result = await callOutsideAi(call({ body: { model: "m", ...body }, fetchImpl: fetchImpl as unknown as typeof fetch }));
    expect(result).toEqual({ ok: false, outcome: "non_text_blocked" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("allows plain text, a JSON schema and cache control", () => {
    expect(hasNonTextContent({ system: [{ type: "text", text: "x", cache_control: { type: "ephemeral" } }], output_config: { format: { type: "json_schema", schema: { type: "object" } } } })).toBe(false);
  });

  it("allows the model's own thinking blocks in a tool loop (long opaque signature), but still refuses images beside them", () => {
    const turn = { role: "assistant", content: [{ type: "thinking", thinking: "", signature: "S".repeat(5000) }, { type: "tool_use", id: "t", name: "x", input: {} }] };
    expect(hasNonTextContent({ messages: [turn] })).toBe(false);
    expect(hasNonTextContent({ messages: [{ type: "redacted_thinking", data: "D".repeat(5000) }] })).toBe(false);
    expect(hasNonTextContent({ messages: [turn, { role: "user", content: [{ type: "image", source: { type: "base64", data: "x" } }] }] })).toBe(true);
    expect(hasNonTextContent({ messages: [{ type: "thinking", thinking: "data:image/png;base64,AAAA", signature: "s" }] })).toBe(true);
  });
});

describe("guards before the call", () => {
  it("refuses people's text that still names health information", async () => {
    const fetchImpl = vi.fn();
    const result = await callOutsideAi(call({ userContent: ["I am pregnant"], fetchImpl: fetchImpl as unknown as typeof fetch }));
    expect(result).toEqual({ ok: false, outcome: "health_blocked" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("refuses input over the size limit", async () => {
    const fetchImpl = vi.fn();
    const result = await callOutsideAi(call({ maxInputChars: 50, fetchImpl: fetchImpl as unknown as typeof fetch }));
    expect(result).toEqual({ ok: false, outcome: "too_large" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("the call", () => {
  it("sends one request with a timeout signal and returns the data", async () => {
    const fetchImpl = ok();
    const result = await callOutsideAi(call({ fetchImpl: fetchImpl as unknown as typeof fetch }));
    expect(result.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const init = (fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect((init.headers as Record<string, string>)["x-api-key"]).toBe("k");
  });

  it("stops waiting after the timeout and does not retry", async () => {
    const fetchImpl = vi.fn((_url: string, init: RequestInit) =>
      new Promise<Response>((_resolve, reject) => init.signal?.addEventListener("abort", () => reject(init.signal?.reason)))
    );
    const result = await callOutsideAi(call({ timeoutMs: 20, fetchImpl: fetchImpl as unknown as typeof fetch }));
    expect(result).toEqual({ ok: false, outcome: "timeout" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("reports an HTTP error with its status only", async () => {
    const fetchImpl = vi.fn(async () => new Response("overloaded: internal detail", { status: 529 }));
    expect(await callOutsideAi(call({ fetchImpl: fetchImpl as unknown as typeof fetch }))).toEqual({ ok: false, outcome: "http_error", status: 529 });
  });

  it("pauses the feature for a minute after three failures in a row (no retry storm)", async () => {
    let t = 1_000_000;
    const now = () => t;
    const failing = vi.fn(async () => new Response("", { status: 500 }));
    for (let i = 0; i < 3; i++) await callOutsideAi(call({ now, fetchImpl: failing as unknown as typeof fetch }));
    expect(failing).toHaveBeenCalledTimes(3);
    const paused = await callOutsideAi(call({ now, fetchImpl: failing as unknown as typeof fetch }));
    expect(paused).toEqual({ ok: false, outcome: "circuit_open" });
    expect(failing).toHaveBeenCalledTimes(3);
    // Other features are not paused.
    expect((await callOutsideAi(call({ now, feature: "cv_builder" }))).ok).toBe(true);
    t += 61_000;
    expect((await callOutsideAi(call({ now }))).ok).toBe(true);
  });

  it("logs metadata only: feature, model, outcome, latency, size, status; never the prompt or the reply", async () => {
    const logger = { info: vi.fn() };
    await callOutsideAi(call({ logger }));
    expect(logger.info).toHaveBeenCalledWith("ai.outside_call", expect.objectContaining({ feature: "contact_chat", model: "claude-opus-5-5", outcome: "ok", status: 200 }));
    const fields = (logger.info.mock.calls[0] as unknown as [string, Record<string, unknown>])[1];
    expect(Object.keys(fields).sort()).toEqual(["feature", "inputChars", "latencyMs", "model", "outcome", "status"]);
    const logged = JSON.stringify(logger.info.mock.calls);
    expect(logged).not.toContain("SECRET-PROMPT-TEXT");
    expect(logged).not.toContain("Hello");
  });
});

describe("finishedText", () => {
  it("accepts only a finished reply", () => {
    expect(finishedText({ stop_reason: "end_turn", content: [{ type: "text", text: " a " }, { type: "text", text: "b" }] })).toBe("a b");
    expect(finishedText({ stop_reason: "max_tokens", content: [{ type: "text", text: "cut" }] })).toBeNull();
    expect(finishedText({ stop_reason: "refusal", content: [] })).toBeNull();
    expect(finishedText({ stop_reason: "end_turn", content: [{ type: "text", text: "  " }] })).toBeNull();
  });
});

describe("no second door to an outside AI", () => {
  it("only outsideAi.ts holds the Anthropic address", () => {
    const root = join(__dirname, "..", "..", "..");
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        if (name === "node_modules" || name === ".next" || name === "dist" || name.startsWith(".")) continue;
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.(ts|tsx|js|mjs)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name) && readFileSync(path, "utf8").includes("api.anthropic.com")) hits.push(relative(root, path));
      }
    };
    for (const top of ["apps", "packages"]) walk(join(root, top));
    expect(hits).toEqual([join("apps", "api", "src", "outsideAi.ts")]);
  });
});
