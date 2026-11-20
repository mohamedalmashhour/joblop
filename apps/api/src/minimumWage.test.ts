import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { MinimumWageError } from "@rwos/shared";
import type { PrismaClient } from "@rwos/database";
import { submitEmployerOrder } from "./employerOrderRepository";
import { LONG_TERM_LISTING_PLAN_MARKER } from "./requestPricingSnapshot";

// Live check #88: a Joblop job showed $1.60/h on the public Find work page, below the Québec minimum
// wage. The API now refuses such a job at every place its pay is set or approved, and the worker lists
// hide old below-minimum data (openJobs.test.ts covers the list rule).

const read = (file: string) => readFileSync(fileURLToPath(new URL(file, import.meta.url)), "utf8");
const app = read("./app.ts");

describe("minimum wage: every approval and pay path refuses below-minimum pay", () => {
  it("answers 422 with the plain message wherever the check throws", () => {
    const handler = app.slice(app.indexOf("app.setErrorHandler("), app.indexOf('app.get("/health"'));
    expect(handler).toContain("error instanceof MinimumWageError");
    expect(handler).toContain("reply.code(422)");
  });

  it("staff approval, the bulk 'approve standard' and the Brain all go through the checked approveForDispatch", () => {
    const flow = app.slice(app.indexOf("const approveForDispatchFlow = async"), app.indexOf('"/platform/job-requests/intake/:jobRequestId/approve-for-dispatch"'));
    expect(flow).toContain("jobRequestService.approveForDispatch(");
    const brain = app.slice(app.indexOf("async approveJobRequest({ jobRequestId, actorUserId })"));
    expect(brain.slice(0, 900)).toContain("approveForDispatchFlow(");
    const bulk = app.slice(app.indexOf('app.post("/platform/orders/:orderId/approve-standard"'));
    expect(bulk.slice(0, 2000)).toContain("jobRequestService.approveForDispatch(");
  });

  it("long-term listings keep the shared plan marker the check exempts", () => {
    expect(LONG_TERM_LISTING_PLAN_MARKER).toBe("listing");
  });

  it("an employer order with a below-minimum role line says so plainly", async () => {
    const prisma = {
      employerOrder: { findFirst: async () => ({ id: "order-1", organizationId: "org-1", submittedAt: null }) },
      jobRequest: { findMany: async () => [{ id: "jr-1", status: "draft", version: 1 }] }
    } as unknown as PrismaClient;
    const service = {
      submit: async () => {
        throw new MinimumWageError(new Date("2025-09-01T12:00:00.000Z"));
      }
    } as unknown as Parameters<typeof submitEmployerOrder>[1];
    const result = await submitEmployerOrder(prisma, service, {
      actorUserId: "u-1",
      organizationId: "org-1",
      orderId: "order-1",
      now: new Date("2025-09-01T12:00:00.000Z")
    });
    expect(result).toEqual({ ok: false, reason: "below_minimum_wage", message: "Worker pay is below Québec minimum wage ($16.10/h)." });
    const route = app.slice(app.indexOf('app.post("/organizations/:organizationId/orders/:orderId/submit"'));
    expect(route.slice(0, 1400)).toContain('result.reason === "below_minimum_wage"');
  });
});
