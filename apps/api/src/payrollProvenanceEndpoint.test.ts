import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * HR-6.1 Chunk 2 — DB-mutation proof for the read-only provenance endpoint. Provenance is
 * descriptive-only; the handler must READ its immutable evidence and issue ZERO writes, no
 * calculation/transition/correction, and no audit row.
 */
const source = readFileSync(fileURLToPath(new URL("./app.ts", import.meta.url)), "utf8");

function provenanceHandlerBody(): string {
  const marker = 'app.get("/platform/payroll/calculations/:calculationId/provenance"';
  const start = source.indexOf(marker);
  expect(start).toBeGreaterThan(-1);
  const nextGet = source.indexOf("app.get(", start + marker.length);
  const nextPost = source.indexOf("app.post(", start + marker.length);
  const end = Math.min(nextGet === -1 ? Infinity : nextGet, nextPost === -1 ? Infinity : nextPost);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe("HR-6.1 provenance endpoint is provably read-only", () => {
  const body = provenanceHandlerBody();

  it("performs no write and no calculation/transition/correction/audit", () => {
    for (const w of [".create(", ".createMany(", ".update(", ".updateMany(", ".upsert(", ".delete(", ".deleteMany(", "$executeRaw", "$transaction", "createCalculationAtomically", "updateCalculationStatus", "updatePeriodStatus", "transitionCalculation", "requestCorrection", "recordAudit"]) {
      expect(body).not.toContain(w);
    }
    // .calculate( must not appear (verifyCalculation is a read-only replay and is allowed)
    expect(body).not.toContain("payrollService.calculate(");
  });

  it("reads only + calls the pure assembler; authz precedes lookup", () => {
    expect(body).toContain("requirePayrollAuthority");
    expect(body).toContain("loadPayrollCalculationDetail");
    expect(body).toContain("assemblePayrollProvenance");
    expect(body).toContain(".findUnique(");
    expect(body).toContain(".findMany(");
    expect(body.indexOf("requirePayrollAuthority")).toBeLessThan(body.indexOf("loadPayrollCalculationDetail"));
  });

  it("returns only the sanitized provenance model, labelled descriptive/never authoritative", () => {
    expect(body).toContain("return reply.code(200).send({ provenance,");
    expect(body).toContain("Descriptive only, never authoritative");
    expect(body).toContain("no payroll data was modified");
  });
});
