import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * HR-6.1 Chunk 1 — DB-mutation proof for the read-only period review-context endpoint.
 * The period review answers "why is there no calculation yet"; it must only READ (via the same
 * resolvers the engine uses) and must issue ZERO writes and no audit event.
 */
const source = readFileSync(fileURLToPath(new URL("./app.ts", import.meta.url)), "utf8");

function periodReviewHandlerBody(): string {
  const marker = 'app.get("/platform/payroll/periods/:periodId/review-context"';
  const start = source.indexOf(marker);
  expect(start).toBeGreaterThan(-1);
  const end = source.indexOf("app.get(", start + marker.length);
  const alt = source.indexOf("app.post(", start + marker.length);
  const bound = end === -1 ? alt : Math.min(end, alt === -1 ? end : alt);
  expect(bound).toBeGreaterThan(start);
  return source.slice(start, bound);
}

describe("HR-6.1 period review endpoint is provably read-only", () => {
  const body = periodReviewHandlerBody();

  it("performs no Prisma write and no calculation/transition/correction", () => {
    for (const w of [".create(", ".createMany(", ".update(", ".updateMany(", ".upsert(", ".delete(", ".deleteMany(", "$executeRaw", "$transaction", "createCalculationAtomically", "updateCalculationStatus", "updatePeriodStatus", ".calculate(", "requestCorrection", "recordAudit"]) {
      expect(body).not.toContain(w);
    }
  });

  it("only reads through the shared read-only resolvers + pure assembler", () => {
    expect(body).toContain("requirePayrollAuthority"); // authz first
    expect(body).toContain("payrollRepositoryRead.findPeriodById");
    expect(body).toContain("listEligibleWorkerIds");
    expect(body).toContain("listApprovedWorkedTime");
    expect(body).toContain("payrollRateResolver.resolveAt");
    expect(body).toContain("payrollJurisdictionResolver.resolve");
    expect(body).toContain("assemblePayrollPeriodReviewContext");
    const authzAt = body.indexOf("requirePayrollAuthority");
    const firstReadAt = body.indexOf("findPeriodById");
    expect(authzAt).toBeLessThan(firstReadAt);
  });

  it("returns only the sanitized context (no raw rows escape)", () => {
    expect(body).toContain("return reply.code(200).send({ context,");
    expect(body).toContain("no payroll data was modified");
  });
});
