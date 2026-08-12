// HR-6.1 Chunk 4 — content-free operational observability for the advisory payroll-review surfaces.
//
// Telemetry is CONTENT-FREE: it may carry only controlled operation/status/reason codes, safe
// version identifiers, bounded counts/sizes/durations, and a safe correlation id. It can NEVER
// carry payroll content, financial values, PII, raw user text, or any prompt/context/evidence/
// provenance/response body. There is no arbitrary-metadata map and no free-form string. Emission is
// BEST-EFFORT: a failing/unavailable sink can never affect payroll behavior. Holds no Prisma/
// repository/service and persists nothing.

// ── Controlled enums (no free-form values) ──
export type PayrollReviewTelemetryOperation =
  | "payroll_review_context"
  | "payroll_ai_review"
  | "payroll_provenance"
  | "payroll_period_review";

export type PayrollReviewTelemetryStatus = "success" | "review_unavailable" | "rejected" | "failed_safe";

export type PayrollReviewTelemetryProviderMode = "synthetic" | "external";

export type PayrollReviewTelemetryFailureReason =
  | "provider_timeout"
  | "provider_failure"
  | "invalid_provider_output"
  | "unsafe_egress"
  | "oversize_egress"
  | "evidence_unbound"
  | "unknown_number"
  | "capability_disabled"
  | "missing_provenance"
  | "explanation_unavailable";

const OPERATIONS: ReadonlySet<string> = new Set(["payroll_review_context", "payroll_ai_review", "payroll_provenance", "payroll_period_review"]);
const STATUSES: ReadonlySet<string> = new Set(["success", "review_unavailable", "rejected", "failed_safe"]);
const PROVIDER_MODES: ReadonlySet<string> = new Set(["synthetic", "external"]);
const FAILURE_REASONS: ReadonlySet<string> = new Set(["provider_timeout", "provider_failure", "invalid_provider_output", "unsafe_egress", "oversize_egress", "evidence_unbound", "unknown_number", "capability_disabled", "missing_provenance", "explanation_unavailable"]);

// Bounds (deterministic clamps).
export const PAYROLL_TELEMETRY_MAX_COUNT = 100_000;
export const PAYROLL_TELEMETRY_MAX_BYTES = 10_000_000;
export const PAYROLL_TELEMETRY_MAX_DURATION_MS = 600_000;
const MAX_ID_LEN = 64;
// Safe identifier charset for version/correlation fields — no free-form text, no whitespace.
const SAFE_ID = /^[A-Za-z0-9._@:-]{1,64}$/;

// ── The one allowlisted event. Nothing outside these fields may ever be telemetry. ──
export type PayrollReviewTelemetryEvent = Readonly<{
  operation: PayrollReviewTelemetryOperation;
  status: PayrollReviewTelemetryStatus;
  providerMode?: PayrollReviewTelemetryProviderMode;
  providerKey?: string;
  providerVersion?: string;
  promptVersion?: string;
  contractVersion?: string;
  flagCount?: number;
  evidenceCount?: number;
  provenanceFactCount?: number;
  payloadBytes?: number;
  durationMs?: number;
  timeout?: boolean;
  truncated?: boolean;
  failureReason?: PayrollReviewTelemetryFailureReason;
  correlationId?: string;
}>;

// Loose caller-facing input: optionals may be explicitly `undefined` (the builder strips them).
export type PayrollReviewTelemetryInput = Readonly<{
  operation: PayrollReviewTelemetryOperation;
  status: PayrollReviewTelemetryStatus;
  providerMode?: PayrollReviewTelemetryProviderMode | undefined;
  providerKey?: string | undefined;
  providerVersion?: string | undefined;
  promptVersion?: string | undefined;
  contractVersion?: string | undefined;
  flagCount?: number | undefined;
  evidenceCount?: number | undefined;
  provenanceFactCount?: number | undefined;
  payloadBytes?: number | undefined;
  durationMs?: number | undefined;
  timeout?: boolean | undefined;
  truncated?: boolean | undefined;
  failureReason?: PayrollReviewTelemetryFailureReason | undefined;
  correlationId?: string | undefined;
}>;

const ALLOWED_KEYS = new Set<string>(["operation", "status", "providerMode", "providerKey", "providerVersion", "promptVersion", "contractVersion", "flagCount", "evidenceCount", "provenanceFactCount", "payloadBytes", "durationMs", "timeout", "truncated", "failureReason", "correlationId"]);

function clampCount(n: number | undefined, max: number): number | undefined {
  if (n === undefined) return undefined;
  if (!Number.isFinite(n)) return undefined;
  return Math.max(0, Math.min(Math.floor(n), max));
}
function safeId(v: string | undefined): string | undefined {
  if (v === undefined) return undefined;
  return SAFE_ID.test(v) ? v : undefined; // drop anything not a safe id — never free-form text
}

// Pure allowlist constructor: only known fields survive; counts/durations are clamped; identifiers
// are charset-restricted. Callers pass typed inputs; anything else is dropped, never carried.
export function buildPayrollReviewTelemetryEvent(input: PayrollReviewTelemetryInput): PayrollReviewTelemetryEvent {
  const e: Record<string, unknown> = { operation: input.operation, status: input.status };
  if (input.providerMode && PROVIDER_MODES.has(input.providerMode)) e.providerMode = input.providerMode;
  const key = safeId(input.providerKey); if (key) e.providerKey = key;
  const pv = safeId(input.providerVersion); if (pv) e.providerVersion = pv;
  const prompt = safeId(input.promptVersion); if (prompt) e.promptVersion = prompt;
  const cv = safeId(input.contractVersion); if (cv) e.contractVersion = cv;
  const fc = clampCount(input.flagCount, PAYROLL_TELEMETRY_MAX_COUNT); if (fc !== undefined) e.flagCount = fc;
  const ec = clampCount(input.evidenceCount, PAYROLL_TELEMETRY_MAX_COUNT); if (ec !== undefined) e.evidenceCount = ec;
  const pfc = clampCount(input.provenanceFactCount, PAYROLL_TELEMETRY_MAX_COUNT); if (pfc !== undefined) e.provenanceFactCount = pfc;
  const pb = clampCount(input.payloadBytes, PAYROLL_TELEMETRY_MAX_BYTES); if (pb !== undefined) e.payloadBytes = pb;
  const dur = clampCount(input.durationMs, PAYROLL_TELEMETRY_MAX_DURATION_MS); if (dur !== undefined) e.durationMs = dur;
  if (typeof input.timeout === "boolean") e.timeout = input.timeout;
  if (typeof input.truncated === "boolean") e.truncated = input.truncated;
  if (input.failureReason && FAILURE_REASONS.has(input.failureReason)) e.failureReason = input.failureReason;
  const cid = safeId(input.correlationId); if (cid) e.correlationId = cid;
  return e as PayrollReviewTelemetryEvent;
}

export type TelemetryValidation = { ok: true } | { ok: false; reason: string };

// Strict runtime validation — unknown fields, non-enum values, and non-scalar/oversize values are
// rejected. A defensive backstop for any untyped caller/sink.
export function validatePayrollReviewTelemetryEvent(event: unknown): TelemetryValidation {
  if (typeof event !== "object" || event === null) return { ok: false, reason: "not_object" };
  const e = event as Record<string, unknown>;
  for (const k of Object.keys(e)) if (!ALLOWED_KEYS.has(k)) return { ok: false, reason: `unknown_field:${k}` };
  if (typeof e.operation !== "string" || !OPERATIONS.has(e.operation)) return { ok: false, reason: "bad_operation" };
  if (typeof e.status !== "string" || !STATUSES.has(e.status)) return { ok: false, reason: "bad_status" };
  if (e.providerMode !== undefined && (typeof e.providerMode !== "string" || !PROVIDER_MODES.has(e.providerMode))) return { ok: false, reason: "bad_provider_mode" };
  if (e.failureReason !== undefined && (typeof e.failureReason !== "string" || !FAILURE_REASONS.has(e.failureReason))) return { ok: false, reason: "bad_failure_reason" };
  for (const k of ["providerKey", "providerVersion", "promptVersion", "contractVersion", "correlationId"]) {
    if (e[k] !== undefined && (typeof e[k] !== "string" || (e[k] as string).length > MAX_ID_LEN || !SAFE_ID.test(e[k] as string))) return { ok: false, reason: `bad_${k}` };
  }
  for (const [k, max] of [["flagCount", PAYROLL_TELEMETRY_MAX_COUNT], ["evidenceCount", PAYROLL_TELEMETRY_MAX_COUNT], ["provenanceFactCount", PAYROLL_TELEMETRY_MAX_COUNT], ["payloadBytes", PAYROLL_TELEMETRY_MAX_BYTES], ["durationMs", PAYROLL_TELEMETRY_MAX_DURATION_MS]] as const) {
    if (e[k] !== undefined && (typeof e[k] !== "number" || !Number.isInteger(e[k]) || (e[k] as number) < 0 || (e[k] as number) > max)) return { ok: false, reason: `bad_${k}` };
  }
  for (const k of ["timeout", "truncated"]) if (e[k] !== undefined && typeof e[k] !== "boolean") return { ok: false, reason: `bad_${k}` };
  return { ok: true };
}

// Map any raw internal reason string to an allowlisted code — raw error text NEVER leaves as-is.
export function mapTelemetryFailureReason(raw: string | undefined | null): PayrollReviewTelemetryFailureReason | undefined {
  if (!raw) return undefined;
  if (raw === "payroll_review_timeout") return "provider_timeout";
  if (raw.startsWith("sensitive_") || raw === "unsafe_egress") return "unsafe_egress";
  if (raw === "oversize_payload") return "oversize_egress";
  if (raw === "evidence_unbound") return "evidence_unbound";
  if (raw.includes("unknown_number")) return "unknown_number";
  if (raw === "capability_disabled") return "capability_disabled";
  if (raw === "missing_provenance") return "missing_provenance";
  if (raw === "explanation_unavailable") return "explanation_unavailable";
  if (raw.startsWith("summary_") || raw.startsWith("finding_") || raw.startsWith("findings_") || raw.startsWith("flag_") || raw.includes("severity") || raw.includes("evidence") || raw === "too_many_findings" || raw === "explanation_too_long" || raw === "output_not_object") return "invalid_provider_output";
  return "provider_failure"; // default — never the raw string
}

// ── Sink (content-free) + best-effort emit ──
export type PayrollReviewTelemetrySink = Readonly<{ record(event: PayrollReviewTelemetryEvent): void }>;

// Best-effort: validate then record; a throwing/invalid sink is swallowed. NEVER throws to the caller.
export function emitPayrollReviewTelemetry(sink: PayrollReviewTelemetrySink | undefined, event: PayrollReviewTelemetryInput): void {
  if (!sink) return;
  try {
    const built = buildPayrollReviewTelemetryEvent(event);
    if (!validatePayrollReviewTelemetryEvent(built).ok) return;
    sink.record(built);
  } catch {
    /* observability is best-effort and can never affect payroll behavior */
  }
}

// In-memory recording sink for tests.
export function createRecordingTelemetrySink(): PayrollReviewTelemetrySink & { events: PayrollReviewTelemetryEvent[] } {
  const events: PayrollReviewTelemetryEvent[] = [];
  return { events, record: (event) => { events.push(event); } };
}

// Logger-backed sink — maps the allowlisted event to a single structured, content-free log line.
export function createLoggerTelemetrySink(logger: { info(event: string, fields?: Readonly<Record<string, string | number | boolean | null>>): void }): PayrollReviewTelemetrySink {
  return {
    record(event) {
      // Only the allowlisted scalar fields are forwarded; the logger additionally drops any
      // sensitive-named key. No body/content is ever passed.
      logger.info("payroll.review.telemetry", { ...event });
    }
  };
}
