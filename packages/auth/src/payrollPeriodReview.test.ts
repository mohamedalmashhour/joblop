import { describe, expect, it } from "vitest";
import {
  assemblePayrollPeriodReviewContext,
  computeWorkerReviewFlags,
  periodContextHasNoSensitiveFields,
  PAYROLL_PERIOD_REVIEW_MAX_WORKERS,
  type RawPeriodReviewInput,
  type RawPeriodReviewWorker
} from "./payrollPeriodReview";

function worker(over: Partial<RawPeriodReviewWorker> = {}): RawPeriodReviewWorker {
  return {
    workerIdentityId: "5aa69319-8f1c-4398-b5d2-6f6ed1736769", existingCalculationId: null,
    hasApprovedWorkedTime: true, approvedWorkedMinutes: 480,
    residenceProvinceResolved: true, residenceProvinceCandidates: ["QC"], workerJurisdictionSupported: true,
    hasEffectiveContractRate: true, intraShiftRateBoundary: false, ...over
  };
}
function input(over: Partial<RawPeriodReviewInput> = {}): RawPeriodReviewInput {
  return {
    period: { id: "period-1", organizationId: "org-1", jurisdiction: { country: "CA", region: "QC" }, provider: { key: "synthetic-fixture", version: "synthetic-2026.08" }, status: "open" },
    providerSupported: true, jurisdictionSupportedByProvider: true, workers: [worker()], ...over
  };
}

describe("HR-6.1 period-level review flags (advisory, read-only)", () => {
  it("a fully-ready worker → READY_TO_CALCULATE, not blocked", () => {
    const ctx = assemblePayrollPeriodReviewContext(input());
    expect(ctx.workers[0]!.flags.map((f) => f.code)).toEqual(["READY_TO_CALCULATE"]);
    expect(ctx.workers[0]!.blocked).toBe(false);
    expect(ctx.summary.readyToCalculate).toBe(1);
    expect(ctx.synthetic).toBe(true);
  });

  it("no approved worked time → MISSING_AUTHORITATIVE_INPUT (blocked)", () => {
    const ctx = assemblePayrollPeriodReviewContext(input({ workers: [worker({ hasApprovedWorkedTime: false, approvedWorkedMinutes: 0 })] }));
    expect(ctx.workers[0]!.flags.some((f) => f.code === "MISSING_AUTHORITATIVE_INPUT")).toBe(true);
    expect(ctx.workers[0]!.blocked).toBe(true);
    expect(ctx.summary.blocked).toBe(1);
  });

  it("no effective contract rate → MISSING_AUTHORITATIVE_INPUT (high)", () => {
    const flags = computeWorkerReviewFlags(worker({ hasEffectiveContractRate: false }), false);
    expect(flags.some((f) => f.code === "MISSING_AUTHORITATIVE_INPUT" && f.severity === "high")).toBe(true);
  });

  it("multiple residence provinces → AMBIGUOUS_JURISDICTION", () => {
    const ctx = assemblePayrollPeriodReviewContext(input({ workers: [worker({ residenceProvinceCandidates: ["QC", "ON"] })] }));
    expect(ctx.workers[0]!.flags.some((f) => f.code === "AMBIGUOUS_JURISDICTION")).toBe(true);
    expect(ctx.workers[0]!.blocked).toBe(true);
  });

  it("unresolved province → AMBIGUOUS_JURISDICTION", () => {
    const flags = computeWorkerReviewFlags(worker({ residenceProvinceResolved: false, residenceProvinceCandidates: [] }), false);
    expect(flags.some((f) => f.code === "AMBIGUOUS_JURISDICTION")).toBe(true);
  });

  it("resolved but unsupported worker jurisdiction → UNSUPPORTED_JURISDICTION", () => {
    const flags = computeWorkerReviewFlags(worker({ workerJurisdictionSupported: false }), false);
    expect(flags.some((f) => f.code === "UNSUPPORTED_JURISDICTION")).toBe(true);
    // ambiguity and unsupported are mutually exclusive branches
    expect(flags.some((f) => f.code === "AMBIGUOUS_JURISDICTION")).toBe(false);
  });

  it("intra-shift rate boundary → INTRA_SHIFT_RATE_BOUNDARY (fail-closed)", () => {
    const flags = computeWorkerReviewFlags(worker({ intraShiftRateBoundary: true }), false);
    expect(flags.some((f) => f.code === "INTRA_SHIFT_RATE_BOUNDARY")).toBe(true);
  });

  it("unsupported provider → period-level UNSUPPORTED_PROVIDER blocks every worker", () => {
    const ctx = assemblePayrollPeriodReviewContext(input({ providerSupported: false }));
    expect(ctx.periodFlags.some((f) => f.code === "UNSUPPORTED_PROVIDER")).toBe(true);
    expect(ctx.workers.every((w) => w.blocked)).toBe(true);
  });

  it("unsupported period jurisdiction → period-level UNSUPPORTED_JURISDICTION", () => {
    const ctx = assemblePayrollPeriodReviewContext(input({ jurisdictionSupportedByProvider: false }));
    expect(ctx.periodFlags.some((f) => f.code === "UNSUPPORTED_JURISDICTION")).toBe(true);
    expect(ctx.workers.every((w) => w.blocked)).toBe(true);
  });

  it("existing calculation → ALREADY_CALCULATED, not blocked, not a failure", () => {
    const ctx = assemblePayrollPeriodReviewContext(input({ workers: [worker({ existingCalculationId: "calc-1" })] }));
    expect(ctx.workers[0]!.flags.map((f) => f.code)).toEqual(["ALREADY_CALCULATED"]);
    expect(ctx.workers[0]!.blocked).toBe(false);
    expect(ctx.summary.alreadyCalculated).toBe(1);
  });

  it("worker ref is opaque and context carries no sensitive fields; invents no amounts", () => {
    const ctx = assemblePayrollPeriodReviewContext(input({ workers: [worker({ hasApprovedWorkedTime: false, approvedWorkedMinutes: 0 })] }));
    expect(ctx.workers[0]!.workerRef).toBe("worker-5aa69319");
    expect(ctx.workers[0]!.workerRef).not.toContain("@");
    expect(periodContextHasNoSensitiveFields(ctx)).toBe(true);
    // no financial value is invented — the raw input carried no currency/amount and neither does output
    expect(JSON.stringify(ctx)).not.toContain("Minor");
    expect(JSON.stringify(ctx)).not.toContain("currency");
  });

  it("is deterministic — identical input yields identical context", () => {
    const a = assemblePayrollPeriodReviewContext(input({ workers: [worker({ intraShiftRateBoundary: true })] }));
    const b = assemblePayrollPeriodReviewContext(input({ workers: [worker({ intraShiftRateBoundary: true })] }));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("worker list is bounded with accurate truncation metadata", () => {
    const many = Array.from({ length: PAYROLL_PERIOD_REVIEW_MAX_WORKERS + 12 }, (_, i) => worker({ workerIdentityId: `w-${i}-${randomHex()}` }));
    const ctx = assemblePayrollPeriodReviewContext(input({ workers: many }));
    expect(ctx.workers.length).toBe(PAYROLL_PERIOD_REVIEW_MAX_WORKERS);
    expect(ctx.bounds.workersIncluded).toBe(PAYROLL_PERIOD_REVIEW_MAX_WORKERS);
    expect(ctx.bounds.workersTotal).toBe(PAYROLL_PERIOD_REVIEW_MAX_WORKERS + 12);
    expect(ctx.bounds.workersTruncated).toBe(true);
  });

  it("every flag's evidenceRef is a non-empty stable reference", () => {
    const ctx = assemblePayrollPeriodReviewContext(input({ providerSupported: false, workers: [worker({ hasApprovedWorkedTime: false, approvedWorkedMinutes: 0, intraShiftRateBoundary: true })] }));
    for (const f of [...ctx.periodFlags, ...ctx.workers.flatMap((w) => w.flags)]) {
      expect(typeof f.evidenceRef).toBe("string");
      expect(f.evidenceRef.length).toBeGreaterThan(0);
    }
  });
});

function randomHex(): string {
  // deterministic-enough unique suffix without Date.now/Math.random reliance in assertions
  return Math.abs(hashString(String(globalThisCounter++))).toString(16);
}
let globalThisCounter = 0;
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}
