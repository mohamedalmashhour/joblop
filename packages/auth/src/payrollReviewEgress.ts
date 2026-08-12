// HR-6.1 Chunk 3 — egress-safety hardening for a FUTURE external AI provider.
//
// No live external AI exists or is configured. This module proves that IF one were ever authorized,
// only a strictly minimized, allowlisted, byte-validated payload could leave the system. It builds a
// `PayrollReviewEgressEnvelope` from an ALLOWLIST (never serialize-then-redact), validates it against
// a strict schema (unknown-field + size rejection), runs a byte-level sensitive-data scan on the
// exact outbound string, and gates the external path behind an explicit capability + injected
// provider. The default remains the offline synthetic provider — external egress is impossible by
// default. Holds no Prisma/repository/service; performs no write; persists nothing.
import type { PayrollReviewContext, PayrollReviewSeverity } from "./payrollReview";
import { validatePayrollReviewOutput, type PayrollReviewProviderOutput, type PayrollReviewResult, type PayrollReviewProvider } from "./payrollReviewProvider";

export const PAYROLL_REVIEW_EGRESS_SCHEMA_VERSION = "hr6.1.egress.1";

// Deterministic hard caps (section 5).
export const PAYROLL_REVIEW_EGRESS_MAX_BYTES = 16_384;
export const PAYROLL_REVIEW_EGRESS_MAX_FLAGS = 50;
export const PAYROLL_REVIEW_EGRESS_MAX_EVIDENCE = 300;
export const PAYROLL_REVIEW_EGRESS_MAX_PROVENANCE = 100;
export const PAYROLL_REVIEW_EGRESS_MAX_STATEMENT = 240;
export const PAYROLL_REVIEW_EGRESS_MAX_METADATA = 120;

// ── The strict outbound allowlist. NOTHING outside these fields may ever leave the system. ──
export type PayrollReviewEgressEnvelope = Readonly<{
  schemaVersion: string;
  calculationRef: string; // opaque — never the full internal id
  workerRef: string; // opaque — never a name/SIN/email
  organizationRef: string; // opaque tenant ref
  period: Readonly<{ start: string; end: string; timezone: string }>;
  jurisdiction: Readonly<{ country: string; region: string }>;
  // deterministic flags — code + severity + system-generated detail (never user text)
  flags: readonly Readonly<{ code: string; severity: PayrollReviewSeverity; detail: string; evidenceRef: string }>[];
  evidenceRefs: readonly string[]; // bounded list of evidence KEYS only (no bodies)
  provenanceFacts: readonly Readonly<{ contractVersion: string; payableMinutes: number; appliedHourlyRateMinor: number }>[];
  // The calculation's OWN authorized totals — the only financial numbers permitted to egress.
  financials: Readonly<{ currency: string; grossMinor: number; deductionsMinor: number; netMinor: number; employerCostMinor: number }>;
  versioning: Readonly<{ providerKey: string; providerVersion: string; promptVersion: string; flagEngineVersion: string; outputContractVersion: string }>;
  notice: string;
}>;

// Build the envelope from the (already sanitized, PII-free, bounded) review context by allowlist.
// Raw correction text (context.untrustedText) is NEVER copied. Rate segments derive from workedTime.
export function buildPayrollReviewEgressEnvelope(context: PayrollReviewContext, versioning: PayrollReviewEgressEnvelope["versioning"]): PayrollReviewEgressEnvelope {
  const bySeg = new Map<string, { contractVersion: string; payableMinutes: number; appliedHourlyRateMinor: number }>();
  for (const w of context.workedTime) {
    const seg = bySeg.get(w.contractVersion) ?? { contractVersion: w.contractVersion, payableMinutes: 0, appliedHourlyRateMinor: w.appliedHourlyRateMinor };
    seg.payableMinutes += w.payableMinutes;
    bySeg.set(w.contractVersion, seg);
  }
  return {
    schemaVersion: PAYROLL_REVIEW_EGRESS_SCHEMA_VERSION,
    calculationRef: `calc-${context.calculationId.slice(0, 8)}`,
    workerRef: context.workerRef,
    organizationRef: `org-${context.organizationRef.slice(0, 8)}`,
    period: { start: context.period.start, end: context.period.end, timezone: context.period.timezone },
    jurisdiction: { country: context.jurisdiction.country, region: context.jurisdiction.region },
    flags: context.flags.slice(0, PAYROLL_REVIEW_EGRESS_MAX_FLAGS).map((f) => ({ code: f.code, severity: f.severity, detail: f.detail.slice(0, PAYROLL_REVIEW_EGRESS_MAX_STATEMENT), evidenceRef: f.evidenceRef })),
    evidenceRefs: Object.keys(context.evidence).slice(0, PAYROLL_REVIEW_EGRESS_MAX_EVIDENCE),
    provenanceFacts: [...bySeg.values()].slice(0, PAYROLL_REVIEW_EGRESS_MAX_PROVENANCE),
    financials: { currency: context.currency, grossMinor: context.gross, deductionsMinor: context.deductions, netMinor: context.net, employerCostMinor: context.employerCost },
    versioning,
    notice: "Advisory review egress. Descriptive, minimized, allowlisted. No payroll authority."
  };
}

// ── Strict schema validation (section 4): unknown fields + sizes rejected, explicit not permissive. ──
export type EgressValidation = { ok: true } | { ok: false; reason: string };
const ALLOWED_SEVERITIES: ReadonlySet<string> = new Set(["info", "low", "medium", "high"]);
const ENVELOPE_TOP_KEYS = new Set(["schemaVersion", "calculationRef", "workerRef", "organizationRef", "period", "jurisdiction", "flags", "evidenceRefs", "provenanceFacts", "financials", "versioning", "notice"]);

function onlyKeys(obj: Record<string, unknown>, allowed: Set<string>): boolean {
  return Object.keys(obj).every((k) => allowed.has(k));
}

export function validatePayrollReviewEgressEnvelope(envelope: unknown): EgressValidation {
  if (typeof envelope !== "object" || envelope === null) return { ok: false, reason: "envelope_not_object" };
  const e = envelope as Record<string, unknown>;
  if (!onlyKeys(e, ENVELOPE_TOP_KEYS)) return { ok: false, reason: "unknown_top_level_field" };
  if (e.schemaVersion !== PAYROLL_REVIEW_EGRESS_SCHEMA_VERSION) return { ok: false, reason: "schema_version_mismatch" };
  for (const k of ["calculationRef", "workerRef", "organizationRef", "notice"]) {
    if (typeof e[k] !== "string" || (e[k] as string).length > PAYROLL_REVIEW_EGRESS_MAX_STATEMENT) return { ok: false, reason: `bad_${k}` };
  }
  const period = e.period as Record<string, unknown>;
  if (typeof period !== "object" || !period || !onlyKeys(period, new Set(["start", "end", "timezone"]))) return { ok: false, reason: "bad_period" };
  const jur = e.jurisdiction as Record<string, unknown>;
  if (typeof jur !== "object" || !jur || !onlyKeys(jur, new Set(["country", "region"]))) return { ok: false, reason: "bad_jurisdiction" };
  if (!Array.isArray(e.flags) || e.flags.length > PAYROLL_REVIEW_EGRESS_MAX_FLAGS) return { ok: false, reason: "bad_flags" };
  for (const raw of e.flags) {
    const f = raw as Record<string, unknown>;
    if (typeof f !== "object" || !f || !onlyKeys(f, new Set(["code", "severity", "detail", "evidenceRef"]))) return { ok: false, reason: "unknown_flag_field" };
    if (typeof f.code !== "string" || typeof f.evidenceRef !== "string") return { ok: false, reason: "bad_flag_shape" };
    if (typeof f.severity !== "string" || !ALLOWED_SEVERITIES.has(f.severity)) return { ok: false, reason: "bad_flag_severity" };
    if (typeof f.detail !== "string" || f.detail.length > PAYROLL_REVIEW_EGRESS_MAX_STATEMENT) return { ok: false, reason: "flag_detail_too_long" };
  }
  if (!Array.isArray(e.evidenceRefs) || e.evidenceRefs.length > PAYROLL_REVIEW_EGRESS_MAX_EVIDENCE) return { ok: false, reason: "bad_evidence" };
  if (!e.evidenceRefs.every((r) => typeof r === "string" && r.length <= PAYROLL_REVIEW_EGRESS_MAX_METADATA)) return { ok: false, reason: "bad_evidence_ref" };
  if (!Array.isArray(e.provenanceFacts) || e.provenanceFacts.length > PAYROLL_REVIEW_EGRESS_MAX_PROVENANCE) return { ok: false, reason: "bad_provenance" };
  for (const raw of e.provenanceFacts) {
    const p = raw as Record<string, unknown>;
    if (typeof p !== "object" || !p || !onlyKeys(p, new Set(["contractVersion", "payableMinutes", "appliedHourlyRateMinor"]))) return { ok: false, reason: "unknown_provenance_field" };
    if (typeof p.contractVersion !== "string" || typeof p.payableMinutes !== "number" || typeof p.appliedHourlyRateMinor !== "number") return { ok: false, reason: "bad_provenance_shape" };
  }
  const fin = e.financials as Record<string, unknown>;
  if (typeof fin !== "object" || !fin || !onlyKeys(fin, new Set(["currency", "grossMinor", "deductionsMinor", "netMinor", "employerCostMinor"]))) return { ok: false, reason: "bad_financials" };
  if (typeof fin.currency !== "string" || ["grossMinor", "deductionsMinor", "netMinor", "employerCostMinor"].some((k) => typeof fin[k] !== "number")) return { ok: false, reason: "bad_financials_shape" };
  const ver = e.versioning as Record<string, unknown>;
  if (typeof ver !== "object" || !ver || !onlyKeys(ver, new Set(["providerKey", "providerVersion", "promptVersion", "flagEngineVersion", "outputContractVersion"]))) return { ok: false, reason: "bad_versioning" };
  return { ok: true };
}

// ── Byte-level outbound scan (section 3): inspect the EXACT serialized string, fail closed. ──
const SENSITIVE_PATTERNS: readonly Readonly<{ name: string; re: RegExp }>[] = [
  { name: "email", re: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i },
  { name: "phone", re: /(?:\+?\d[\s().-]?){10,}/ },
  { name: "sin", re: /\b\d{3}[-\s]?\d{3}[-\s]?\d{3}\b/ },
  { name: "tax_id", re: /\b\d{2}[-\s]?\d{7}\b/ },
  { name: "card", re: /\b(?:\d[ -]?){13,19}\b/ },
  { name: "bank_routing", re: /\b\d{5}[-\s]?\d{3}\b/ },
  { name: "bearer_token", re: /\b(?:bearer\s+[a-z0-9._-]{16,}|sk_(?:live|test)_[a-z0-9]{16,}|eyJ[a-z0-9._-]{20,})/i },
  { name: "secret_field", re: /"(?:password|secret|token|apikey|api_key|authorization)"\s*:/i }
];

export type EgressScan = { safe: true } | { safe: false; reason: string };

export function scanPayrollReviewEgressBytes(serialized: string): EgressScan {
  if (serialized.length > PAYROLL_REVIEW_EGRESS_MAX_BYTES) return { safe: false, reason: "oversize_payload" };
  for (const { name, re } of SENSITIVE_PATTERNS) {
    if (re.test(serialized)) return { safe: false, reason: `sensitive_${name}` };
  }
  return { safe: true };
}

// Numeric containment (section 11): every multi-digit run in the envelope must exist in the source
// context — the envelope introduces no unrelated money or hidden total.
export function egressNumbersAreContextBound(envelope: PayrollReviewEgressEnvelope, context: PayrollReviewContext): boolean {
  const contextDigits = JSON.stringify(context).replace(/\D/g, " ");
  const runs = JSON.stringify(envelope).match(/\d{2,}/g) ?? [];
  return runs.every((r) => contextDigits.includes(r));
}

// ── Capability gate (section 6): synthetic by default; external requires flag AND injected provider. ──
export type PayrollReviewExternalProvider = Readonly<{
  key: string;
  version: string;
  model: string;
  review(envelope: PayrollReviewEgressEnvelope): Promise<PayrollReviewProviderOutput>;
}>;

export type PayrollReviewEgressMode = "synthetic" | "external" | "unavailable";

export function resolveEgressMode(input: { externalEnabled: boolean; externalProvider: PayrollReviewExternalProvider | null | undefined }): PayrollReviewEgressMode {
  if (input.externalEnabled && input.externalProvider) return "external";
  return "synthetic"; // missing/invalid config or no provider => synthetic, never accidental egress
}

// ── Gated external run: build → validate → byte-scan → (only then) call provider, all fail-closed. ──
export async function runExternalPayrollReviewGated(input: {
  context: PayrollReviewContext;
  provider: PayrollReviewExternalProvider;
  versioning: PayrollReviewEgressEnvelope["versioning"];
  timeoutMs: number;
}): Promise<{ status: "ready" | "review_unavailable"; output?: PayrollReviewProviderOutput; reason?: string; envelopeBytes: number }> {
  const envelope = buildPayrollReviewEgressEnvelope(input.context, input.versioning);
  const schema = validatePayrollReviewEgressEnvelope(envelope);
  if (!schema.ok) return { status: "review_unavailable", reason: schema.reason, envelopeBytes: 0 };
  if (!egressNumbersAreContextBound(envelope, input.context)) return { status: "review_unavailable", reason: "envelope_introduced_unknown_number", envelopeBytes: 0 };
  const serialized = JSON.stringify(envelope);
  const scan = scanPayrollReviewEgressBytes(serialized);
  if (!scan.safe) return { status: "review_unavailable", reason: scan.reason, envelopeBytes: serialized.length };

  let raw: PayrollReviewProviderOutput;
  try {
    raw = await Promise.race([
      input.provider.review(envelope),
      new Promise<never>((_r, reject) => { const t = setTimeout(() => reject(new Error("payroll_review_timeout")), input.timeoutMs); (t as unknown as { unref?: () => void }).unref?.(); })
    ]);
  } catch (error) {
    return { status: "review_unavailable", reason: error instanceof Error ? error.message : "provider_error", envelopeBytes: serialized.length };
  }
  const validation = validatePayrollReviewOutput(raw, input.context);
  if (!validation.ok) return { status: "review_unavailable", reason: validation.reason, envelopeBytes: serialized.length };
  return { status: "ready", output: raw, envelopeBytes: serialized.length };
}

// Adapts a future external provider into the existing PayrollReviewProvider port, inserting the
// egress gate BEFORE the external call. If the envelope is unsafe/invalid the wrapper throws before
// calling the external provider, so runPayrollReview() surfaces `review_unavailable` uniformly (same
// result/audit/fail-closed path as the synthetic provider). The external provider therefore can only
// ever receive a validated, byte-scanned PayrollReviewEgressEnvelope — never the raw context.
export function createEgressGatedProvider(external: PayrollReviewExternalProvider, versioning: PayrollReviewEgressEnvelope["versioning"], timeoutMs: number): PayrollReviewProvider {
  return {
    key: external.key,
    version: external.version,
    model: external.model,
    promptVersion: versioning.promptVersion,
    async review(request) {
      const gated = await runExternalPayrollReviewGated({ context: request.context, provider: external, versioning, timeoutMs });
      if (gated.status !== "ready" || !gated.output) throw new Error(gated.reason ?? "egress_blocked");
      return gated.output;
    }
  };
}

// Re-exported for callers assembling the audit/versioning (kept identical to the synthetic path).
export type { PayrollReviewResult, PayrollReviewProvider };
