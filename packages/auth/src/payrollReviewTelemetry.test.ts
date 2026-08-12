import { describe, expect, it } from "vitest";
import {
  buildPayrollReviewTelemetryEvent,
  validatePayrollReviewTelemetryEvent,
  emitPayrollReviewTelemetry,
  createRecordingTelemetrySink,
  mapTelemetryFailureReason,
  PAYROLL_TELEMETRY_MAX_COUNT,
  PAYROLL_TELEMETRY_MAX_DURATION_MS,
  type PayrollReviewTelemetryEvent
} from "./payrollReviewTelemetry";

const base: PayrollReviewTelemetryEvent = { operation: "payroll_ai_review", status: "success" };
const validate = (e: unknown) => validatePayrollReviewTelemetryEvent(e);

describe("HR-6.1 Chunk 4 — content-free payroll review telemetry", () => {
  it("1. valid success event", () => {
    const e = buildPayrollReviewTelemetryEvent({ ...base, providerMode: "synthetic", flagCount: 3, durationMs: 12 });
    expect(validate(e).ok).toBe(true);
    expect(e.status).toBe("success");
  });
  it("2. valid unavailable event", () => {
    const e = buildPayrollReviewTelemetryEvent({ ...base, status: "review_unavailable", failureReason: "provider_failure" });
    expect(validate(e).ok).toBe(true);
  });
  it("3. valid timeout event", () => {
    const e = buildPayrollReviewTelemetryEvent({ ...base, status: "review_unavailable", timeout: true, failureReason: "provider_timeout" });
    expect(e.timeout).toBe(true);
    expect(validate(e).ok).toBe(true);
  });
  it("4. unknown field rejected", () => { expect(validate({ ...base, leaked: 1 }).ok).toBe(false); });
  it("5. arbitrary metadata map rejected", () => { expect(validate({ ...base, metadata: { a: 1 } }).ok).toBe(false); });
  it("6. arbitrary error string rejected (no free-form failureReason)", () => { expect(validate({ ...base, failureReason: "boom: stack trace here" }).ok).toBe(false); });
  it("7. prompt/content field rejected", () => { expect(validate({ ...base, prompt: "hello" }).ok).toBe(false); });
  it("8. context field rejected", () => { expect(validate({ ...base, context: {} }).ok).toBe(false); });
  it("9. evidence body rejected", () => { expect(validate({ ...base, evidence: {} }).ok).toBe(false); });
  it("10. provenance narrative rejected", () => { expect(validate({ ...base, provenance: "shift x governed by v1" }).ok).toBe(false); });
  it("11. provider response body rejected", () => { expect(validate({ ...base, review: { summary: "s" } }).ok).toBe(false); });
  it("12. financial field rejected (no financials key allowed)", () => { expect(validate({ ...base, financials: { netMinor: 1 } }).ok).toBe(false); });
  it("13. gross/net/rate value fields rejected", () => {
    for (const k of ["gross", "net", "deductions", "employerCost", "rate", "hourlyRateMinor", "amountMinor"]) {
      expect(validate({ ...base, [k]: 25440 }).ok).toBe(false);
    }
  });
  it("14. PII field rejected", () => {
    for (const k of ["email", "phone", "sin", "workerName", "address", "dob"]) expect(validate({ ...base, [k]: "x" }).ok).toBe(false);
  });
  it("15. token/secret field rejected", () => {
    for (const k of ["token", "secret", "apiKey", "password"]) expect(validate({ ...base, [k]: "x" }).ok).toBe(false);
  });
  it("16. identity/high-cardinality fields are not part of the schema (rejected)", () => {
    for (const k of ["calculationId", "workerId", "organizationId", "tenantId", "contractId"]) expect(validate({ ...base, [k]: "id" }).ok).toBe(false);
  });
  it("17. deterministic event construction", () => {
    const a = buildPayrollReviewTelemetryEvent({ ...base, flagCount: 2, evidenceCount: 5, durationMs: 7 });
    const b = buildPayrollReviewTelemetryEvent({ ...base, flagCount: 2, evidenceCount: 5, durationMs: 7 });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
  it("18. counts are bounded/clamped", () => {
    const e = buildPayrollReviewTelemetryEvent({ ...base, flagCount: PAYROLL_TELEMETRY_MAX_COUNT + 999 });
    expect(e.flagCount).toBe(PAYROLL_TELEMETRY_MAX_COUNT);
    expect(validate(e).ok).toBe(true);
  });
  it("19. duration is bounded/clamped", () => {
    const e = buildPayrollReviewTelemetryEvent({ ...base, durationMs: PAYROLL_TELEMETRY_MAX_DURATION_MS + 5 });
    expect(e.durationMs).toBe(PAYROLL_TELEMETRY_MAX_DURATION_MS);
  });
  it("20. telemetry sink failure is isolated (emit never throws)", () => {
    const throwing = { record() { throw new Error("sink down"); } };
    expect(() => emitPayrollReviewTelemetry(throwing, base)).not.toThrow();
    // an invalid event is silently dropped, not recorded, not thrown
    const sink = createRecordingTelemetrySink();
    emitPayrollReviewTelemetry(sink, { operation: "nope" as never, status: "success" });
    expect(sink.events.length).toBe(0);
  });

  it("builds/records a clean event through a recording sink", () => {
    const sink = createRecordingTelemetrySink();
    emitPayrollReviewTelemetry(sink, { operation: "payroll_provenance", status: "review_unavailable", failureReason: "explanation_unavailable", provenanceFactCount: 4, truncated: false, durationMs: 3 });
    expect(sink.events).toHaveLength(1);
    expect(sink.events[0]).toMatchObject({ operation: "payroll_provenance", status: "review_unavailable", failureReason: "explanation_unavailable" });
  });

  it("maps raw internal reasons to allowlisted codes (raw text never leaks)", () => {
    expect(mapTelemetryFailureReason("payroll_review_timeout")).toBe("provider_timeout");
    expect(mapTelemetryFailureReason("sensitive_email")).toBe("unsafe_egress");
    expect(mapTelemetryFailureReason("oversize_payload")).toBe("oversize_egress");
    expect(mapTelemetryFailureReason("summary_introduced_unknown_number")).toBe("unknown_number");
    expect(mapTelemetryFailureReason("evidence_unbound")).toBe("evidence_unbound");
    expect(mapTelemetryFailureReason("some random error: at line 5")).toBe("provider_failure");
    expect(mapTelemetryFailureReason(null)).toBeUndefined();
  });

  it("safe-id fields drop free-form text (no whitespace/prose)", () => {
    const e = buildPayrollReviewTelemetryEvent({ ...base, providerKey: "ignore previous instructions", providerVersion: "synthetic-2026.08" });
    expect(e.providerKey).toBeUndefined(); // free-form dropped
    expect(e.providerVersion).toBe("synthetic-2026.08");
  });
});
