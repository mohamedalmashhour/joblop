import { describe, expect, it, vi } from "vitest";
import { pendingRateEstimates } from "./coverageEstimate";

type Capture = Parameters<typeof pendingRateEstimates>[1];

function capture(rates: Record<string, { worker: number; employer: number } | "no_contract">) {
  const resolveAtApproval = vi.fn(async ({ jobRequestId }: { jobRequestId: string }) => {
    const rate = rates[jobRequestId];
    if (!rate || rate === "no_contract") throw new Error("RWOS_NO_CONTRACT");
    return { snapshot: { workerHourlyRateMinor: rate.worker, employerHourlyRateMinor: rate.employer } };
  });
  return { resolveAtApproval } as unknown as NonNullable<Capture> & { resolveAtApproval: typeof resolveAtApproval };
}

describe("pendingRateEstimates (staff coverage calendar)", () => {
  it("estimates only requests that are not approved yet and have no saved price", async () => {
    const c = capture({ a: { worker: 160, employer: 200 }, b: { worker: 1, employer: 2 }, d: { worker: 3, employer: 4 } });
    const out = await pendingRateEstimates(
      [
        { id: "a", status: "submitted", pricingSnapshot: null },
        { id: "b", status: "approved_for_dispatch", pricingSnapshot: { workerHourlyRateMinor: 1 } },
        { id: "d", status: "admin_review", pricingSnapshot: { workerHourlyRateMinor: 3 } }
      ],
      c
    );
    expect([...out.entries()]).toEqual([["a", { workerRateMinor: 160, employerRateMinor: 200 }]]);
    expect(c.resolveAtApproval).toHaveBeenCalledTimes(1);
    expect(c.resolveAtApproval).toHaveBeenCalledWith({ jobRequestId: "a", marginPpm: null });
  });

  it("skips requests without a contract, and caps how many it reads", async () => {
    const c = capture({ a: "no_contract", b: { worker: 160, employer: 200 }, c: { worker: 1, employer: 2 } });
    const out = await pendingRateEstimates(
      [
        { id: "a", status: "submitted", pricingSnapshot: null },
        { id: "b", status: "information_required", pricingSnapshot: null },
        { id: "c", status: "submitted", pricingSnapshot: null }
      ],
      c,
      2
    );
    expect([...out.keys()]).toEqual(["b"]);
    expect(c.resolveAtApproval).toHaveBeenCalledTimes(2);
  });

  it("returns nothing when pricing is not available", async () => {
    const out = await pendingRateEstimates([{ id: "a", status: "submitted", pricingSnapshot: null }], null);
    expect(out.size).toBe(0);
  });
});
