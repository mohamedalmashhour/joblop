// The one door to an outside AI (launch step 6, AI safety). Every call to the Anthropic API goes
// through `callOutsideAi`, which always:
//   - honours the kill switch AI_OUTSIDE_CALLS=disabled (no call at all; every feature uses its rules),
//   - refuses any image, document or base64 content (text only, never a photo or a scanned document),
//   - refuses input that still names personal health information after the privacy filter,
//   - refuses input over the feature's size limit,
//   - stops waiting after a hard timeout (20 s by default) and never retries,
//   - pauses a feature for a minute after three failures in a row, so an outage cannot cause a storm,
//   - logs metadata only (feature, model, outcome, latency, size, HTTP status): never prompt text,
//     never a reply, never personal data.
// Callers still run the privacy filter (aiPrivacyFilter.ts) on every string first; this module is the
// second guard. No other file may contain the Anthropic address (see outsideAi.test.ts).

import { createLogger } from "@rwos/observability";
import { containsHealthDetail, type PrivacyLogger } from "./aiPrivacyFilter";

export type OutsideAiFeature = "contact_chat" | "staff_assistant" | "cv_builder";

export type OutsideAiOutcome =
  | "ok"
  | "disabled"
  | "too_large"
  | "non_text_blocked"
  | "health_blocked"
  | "circuit_open"
  | "timeout"
  | "http_error"
  | "network_error"
  | "bad_response";

export const ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";
export const OUTSIDE_AI_TIMEOUT_MS = 20_000;
export const OUTSIDE_AI_DEFAULT_MAX_INPUT_CHARS = 40_000;
const FAILURES_BEFORE_PAUSE = 3;
const PAUSE_MS = 60_000;

/** The kill switch. Unset (today's live setting) keeps outside AI on wherever a key is set. */
export function outsideAiCallsEnabled(env: Readonly<Record<string, string | undefined>> = process.env): boolean {
  const value = env.AI_OUTSIDE_CALLS?.trim().toLowerCase();
  return !(value === "disabled" || value === "off" || value === "false" || value === "0");
}

/** The API key, or null when there is none or the kill switch is on. Callers use their rules on null. */
export function outsideAiApiKey(env: Readonly<Record<string, string | undefined>> = process.env): string | null {
  if (!outsideAiCallsEnabled(env)) return null;
  const key = env.ANTHROPIC_API_KEY?.trim();
  return key ? key : null;
}

const BASE64_RUN = /[A-Za-z0-9+/]{2000,}={0,2}/;

/** True when a request body carries anything but text: image or document blocks, a base64 source,
 *  a data: URI, or a long base64 run. Photos and scans must never leave as images. */
export function hasNonTextContent(value: unknown): boolean {
  const seen = new WeakSet<object>();
  const walk = (v: unknown): boolean => {
    if (typeof v === "string") return /^data:[^,]{0,100};base64,/i.test(v) || BASE64_RUN.test(v);
    if (v === null || typeof v !== "object") return false;
    if (seen.has(v)) return false;
    seen.add(v);
    if (Array.isArray(v)) return v.some(walk);
    const record = v as Record<string, unknown>;
    const type = typeof record.type === "string" ? record.type.toLowerCase() : "";
    if (type === "image" || type === "document" || type === "file" || type === "input_image" || type === "image_url") return true;
    if ("source" in record && record.source && typeof record.source === "object") return true;
    return Object.values(record).some(walk);
  };
  return walk(value);
}

type Circuit = { failures: number; pausedUntil: number };
const circuits = new Map<OutsideAiFeature, Circuit>();

/** Tests only: forget every failure count. */
export function resetOutsideAiCircuits(): void {
  circuits.clear();
}

export type OutsideAiResult =
  | Readonly<{ ok: true; data: unknown; latencyMs: number }>
  | Readonly<{ ok: false; outcome: Exclude<OutsideAiOutcome, "ok">; status?: number }>;

export type OutsideAiCall = Readonly<{
  feature: OutsideAiFeature;
  apiKey: string;
  /** The Messages API body. Must already be filtered; text only. */
  body: Readonly<Record<string, unknown>>;
  /** The filtered text that came from people (messages, profile, job text): checked for health words. */
  userContent: readonly string[];
  extraHeaders?: Readonly<Record<string, string>>;
  maxInputChars?: number;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  logger?: PrivacyLogger;
  env?: Readonly<Record<string, string | undefined>>;
  now?: () => number;
}>;

const defaultLogger: PrivacyLogger = createLogger("api");

export async function callOutsideAi(call: OutsideAiCall): Promise<OutsideAiResult> {
  const logger = call.logger ?? defaultLogger;
  const now = call.now ?? Date.now;
  const model = typeof call.body.model === "string" ? call.body.model : "unknown";
  const started = now();
  const payload = JSON.stringify(call.body);
  const log = (outcome: OutsideAiOutcome, status: number | null = null) =>
    logger.info("ai.outside_call", {
      feature: call.feature,
      model,
      outcome,
      latencyMs: Math.max(0, now() - started),
      inputChars: payload.length,
      status
    });
  const refuse = (outcome: Exclude<OutsideAiOutcome, "ok">, status?: number): OutsideAiResult => {
    log(outcome, status ?? null);
    return status === undefined ? { ok: false, outcome } : { ok: false, outcome, status };
  };

  if (!outsideAiCallsEnabled(call.env ?? process.env)) return refuse("disabled");
  if (hasNonTextContent(call.body)) return refuse("non_text_blocked");
  if (call.userContent.some(containsHealthDetail)) return refuse("health_blocked");
  if (payload.length > (call.maxInputChars ?? OUTSIDE_AI_DEFAULT_MAX_INPUT_CHARS)) return refuse("too_large");

  const circuit = circuits.get(call.feature) ?? { failures: 0, pausedUntil: 0 };
  if (circuit.pausedUntil > now()) return refuse("circuit_open");
  const failed = (outcome: Exclude<OutsideAiOutcome, "ok">, status?: number) => {
    circuit.failures += 1;
    if (circuit.failures >= FAILURES_BEFORE_PAUSE) {
      circuit.pausedUntil = now() + PAUSE_MS;
      circuit.failures = 0;
    }
    circuits.set(call.feature, circuit);
    return refuse(outcome, status);
  };

  let res: Response;
  try {
    res = await (call.fetchImpl ?? fetch)(ANTHROPIC_MESSAGES_URL, {
      method: "POST",
      headers: {
        "x-api-key": call.apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
        ...(call.extraHeaders ?? {})
      },
      signal: AbortSignal.timeout(call.timeoutMs ?? OUTSIDE_AI_TIMEOUT_MS),
      body: payload
    });
  } catch (error) {
    const name = (error as { name?: string } | null)?.name;
    return failed(name === "TimeoutError" || name === "AbortError" ? "timeout" : "network_error");
  }
  if (!res.ok) return failed("http_error", res.status);
  let data: unknown;
  try {
    data = await res.json();
  } catch (error) {
    const name = (error as { name?: string } | null)?.name;
    return failed(name === "TimeoutError" || name === "AbortError" ? "timeout" : "bad_response", res.status);
  }
  circuit.failures = 0;
  circuits.set(call.feature, circuit);
  log("ok", res.status);
  return { ok: true, data, latencyMs: Math.max(0, now() - started) };
}

/** The text of a finished reply, or null when it was cut off, refused or empty. */
export function finishedText(data: unknown, joiner = ""): string | null {
  const body = data as { stop_reason?: unknown; content?: unknown } | null;
  if (body?.stop_reason !== "end_turn" || !Array.isArray(body.content)) return null;
  const text = body.content
    .filter((b): b is { type: string; text: string } => !!b && typeof b === "object" && (b as { type?: unknown }).type === "text" && typeof (b as { text?: unknown }).text === "string")
    .map((b) => b.text)
    .join(joiner)
    .trim();
  return text || null;
}
