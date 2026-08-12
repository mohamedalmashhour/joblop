import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * HR-6.1 Chunk 3 — source-level egress-safety proof. Statically proves the external-AI path is
 * capability-gated, synthetic remains the default, the external provider never receives raw context/
 * Prisma rows, and the review handler reaches no write-capable or money/authority action.
 */
const appSource = readFileSync(fileURLToPath(new URL("./app.ts", import.meta.url)), "utf8");
const egressSource = readFileSync(fileURLToPath(new URL("../../../packages/auth/src/payrollReviewEgress.ts", import.meta.url)), "utf8");

function aiReviewHandlerBody(): string {
  const marker = 'app.get("/platform/payroll/calculations/:calculationId/ai-review"';
  const start = appSource.indexOf(marker);
  expect(start).toBeGreaterThan(-1);
  const end = appSource.indexOf("app.get(", start + marker.length);
  return appSource.slice(start, end);
}

describe("HR-6.1 external-AI egress path is capability-gated and safe", () => {
  it("external provider is used ONLY when the flag is enabled AND a provider is injected; default synthetic", () => {
    expect(appSource).toContain("resolveEgressMode({ externalEnabled: runtimeConfig.payrollAiExternalEnabled, externalProvider: options.payrollExternalReviewProvider })");
    expect(appSource).toContain('payrollReviewEgressMode === "external"');
    expect(appSource).toContain("createEgressGatedProvider(");
    // the fallback of the gate is the synthetic provider
    expect(appSource).toContain(": syntheticPayrollReviewProvider");
    expect(appSource).toContain("createSyntheticPayrollReviewProvider()");
  });

  it("the external provider receives only the egress envelope — never raw context or Prisma", () => {
    // the gated wrapper hands the external provider a PayrollReviewEgressEnvelope, built by allowlist
    expect(egressSource).toContain("review(envelope: PayrollReviewEgressEnvelope)");
    expect(egressSource).toContain("input.provider.review(envelope)");
    // the envelope is built field-by-field (allowlist), not by serializing then redacting
    expect(egressSource).not.toContain("JSON.parse(JSON.stringify(context))");
    // egress module holds no Prisma / repository / write-capable service
    for (const forbidden of ["PrismaClient", "prisma.", "createPrisma", "createCalculationAtomically", "updateCalculationStatus"]) {
      expect(egressSource).not.toContain(forbidden);
    }
  });

  it("the ai-review handler performs no write and no money/authority action", () => {
    const body = aiReviewHandlerBody();
    for (const w of [".create(", ".update(", ".upsert(", ".delete(", "$executeRaw", "$transaction", "transitionCalculation", "requestCorrection", "updateCalculationStatus", "recordAudit", "payrollService.calculate("]) {
      expect(body).not.toContain(w);
    }
    // gate is applied at provider construction (before the handler), handler just runs the review
    expect(body).toContain("runPayrollReview({ context, provider: payrollReviewProvider })");
  });

  it("the byte-scan runs before any provider call in the gated runner", () => {
    const idxScan = egressSource.indexOf("scanPayrollReviewEgressBytes(serialized)");
    const idxCall = egressSource.indexOf("input.provider.review(envelope)");
    expect(idxScan).toBeGreaterThan(-1);
    expect(idxCall).toBeGreaterThan(idxScan);
  });
});
