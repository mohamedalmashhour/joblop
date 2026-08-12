import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * HR-6 Chunk 1 — DB-mutation proof for the read-only review-context endpoint.
 *
 * The AI review-context layer is ADVISORY. It must never write. Rather than rely on
 * a live database round-trip (Chunk-1 forbids provider/live-E2E work), this proof reads
 * the endpoint's own source and asserts, deterministically, that its handler body issues
 * ZERO write operations and NO audit event — it may only read + call the pure assembler.
 */
const source = readFileSync(fileURLToPath(new URL("./app.ts", import.meta.url)), "utf8");

function reviewContextHandlerBody(): string {
  const marker = 'app.get("/platform/payroll/calculations/:calculationId/review-context"';
  const start = source.indexOf(marker);
  expect(start).toBeGreaterThan(-1);
  // The next route registration bounds this handler.
  const next = source.indexOf("app.get(", start + marker.length);
  const end = next === -1 ? source.indexOf("app.post(", start + marker.length) : next;
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe("HR-6 review-context endpoint is provably read-only", () => {
  const body = reviewContextHandlerBody();

  it("performs no Prisma write of any kind", () => {
    for (const write of [".create(", ".createMany(", ".update(", ".updateMany(", ".upsert(", ".delete(", ".deleteMany(", "$executeRaw", "$transaction"]) {
      expect(body).not.toContain(write);
    }
  });

  it("records no audit event (no AI call has happened; nothing to audit yet)", () => {
    expect(body).not.toContain("recordAudit");
  });

  it("only calls read methods + the pure sanitized-context assembler", () => {
    expect(body).toContain("requirePayrollAuthority"); // authorization BEFORE any lookup
    expect(body).toContain("loadPayrollCalculationDetail");
    expect(body).toContain("assemblePayrollReviewContext");
    // reads only
    expect(body).toContain(".findUnique(");
    expect(body).toContain(".findMany(");
    // exact-lookup ordering: authz is the first awaited call in the handler
    const authzAt = body.indexOf("requirePayrollAuthority");
    const firstReadAt = body.indexOf("loadPayrollCalculationDetail");
    expect(authzAt).toBeLessThan(firstReadAt);
  });

  it("scopes supporting reads to the calculation's own family/period (no broad tenant fetch)", () => {
    expect(body).toContain("familyRootId: detail.familyRootId");
    expect(body).toContain("id: detail.payrollPeriodId");
    // it must NOT list calculations across an organization
    expect(body).not.toContain("where: { organizationId }");
  });

  it("returns only the sanitized context (no raw Prisma rows escape the route)", () => {
    expect(body).toContain("return reply.code(200).send({ context,");
    expect(body).toContain("No AI model was called; no payroll data was modified.");
    // the raw detail/rows are mapped into the assembler input, never sent directly
    expect(body).not.toContain("send({ detail");
    expect(body).not.toContain("send(detail");
  });
});
