import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * HR-6.1 Chunk 4 — source-level proof that observability is content-free and side-effect-free:
 * the telemetry emit sites carry only allowlisted operational fields (no context/correctionReason/
 * untrustedText/evidence body/provenance narrative/review/response/financials/gross/net/rate), the
 * telemetry module persists nothing, and no new mutation was introduced on the review paths.
 */
const appSource = readFileSync(fileURLToPath(new URL("./app.ts", import.meta.url)), "utf8");
const telemetrySource = readFileSync(fileURLToPath(new URL("../../../packages/auth/src/payrollReviewTelemetry.ts", import.meta.url)), "utf8");

// Every emitPayrollReviewTelemetry(...) object-literal argument in app.ts.
function emitArgObjects(): string[] {
  const out: string[] = [];
  const marker = "emitPayrollReviewTelemetry(payrollTelemetrySink, {";
  let i = appSource.indexOf(marker);
  while (i !== -1) {
    const start = appSource.indexOf("{", i);
    // brace-match the object literal
    let depth = 0, j = start;
    for (; j < appSource.length; j++) {
      if (appSource[j] === "{") depth++;
      else if (appSource[j] === "}") { depth--; if (depth === 0) break; }
    }
    out.push(appSource.slice(start, j + 1));
    i = appSource.indexOf(marker, j);
  }
  return out;
}

const ALLOWED_KEYS = ["operation", "status", "providerMode", "providerKey", "providerVersion", "promptVersion", "contractVersion", "flagCount", "evidenceCount", "provenanceFactCount", "payloadBytes", "durationMs", "timeout", "truncated", "failureReason", "correlationId"];
const FORBIDDEN_TOKENS = ["correctionReason", "untrustedText", "financials", "grossPayMinor", "netPayMinor", "appliedHourlyRateMinor", "summary", "findings", "narrative", ".detail", "workerIdentityId", "organizationId"];

describe("HR-6.1 Chunk 4 — telemetry is content-free + side-effect-free", () => {
  it("instruments all four advisory surfaces", () => {
    const ops = emitArgObjects().map((o) => (o.match(/operation:\s*"([a-z_]+)"/) ?? [])[1]).sort();
    expect(ops).toEqual(["payroll_ai_review", "payroll_period_review", "payroll_provenance", "payroll_review_context"]);
  });

  it("every emit argument uses ONLY allowlisted keys — no content/financial/identity fields", () => {
    for (const obj of emitArgObjects()) {
      const keys = [...obj.matchAll(/([A-Za-z]+):/g)].map((m) => m[1]!);
      for (const k of keys) expect(ALLOWED_KEYS).toContain(k);
      for (const forbidden of FORBIDDEN_TOKENS) expect(obj).not.toContain(forbidden);
      // counts only — the review/context/provenance objects may only be read for `.length` here
      expect(obj).not.toMatch(/context:\s/);
      expect(obj).not.toMatch(/review:\s/);
      expect(obj).not.toMatch(/provenance:\s/);
    }
  });

  it("the telemetry module persists nothing and holds no write-capable dependency", () => {
    for (const forbidden of ["PrismaClient", "prisma.", "createPrisma", ".create(", ".update(", ".upsert(", ".delete(", "$executeRaw", "$transaction", "migrat"]) {
      expect(telemetrySource).not.toContain(forbidden);
    }
  });

  it("the logger sink forwards only the validated event (no body/content)", () => {
    expect(telemetrySource).toContain('logger.info("payroll.review.telemetry", { ...event })');
    // emission is best-effort: wrapped so a throwing sink cannot propagate
    expect(telemetrySource).toContain("try {");
    expect(telemetrySource).toContain("catch {");
  });

  it("failure reasons are mapped to allowlisted codes — raw error text never forwarded", () => {
    // handlers pass mapTelemetryFailureReason(...) / a literal enum, never a raw error string
    for (const obj of emitArgObjects()) {
      const m = obj.match(/failureReason:\s*([^,}]+)/);
      if (m) expect(m[1]!).toMatch(/mapTelemetryFailureReason\(|"[a-z_]+"|undefined/);
    }
  });
});
