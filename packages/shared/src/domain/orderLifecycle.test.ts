import { describe, expect, it } from "vitest";
import { deriveOrderLifecycle, orderLifecycleCopy } from "./orderLifecycle";

describe("deriveOrderLifecycle", () => {
  it("pending: approved, no worker yet", () => {
    expect(deriveOrderLifecycle({ jobStatus: "approved_for_dispatch", activeWorkerCount: 0 })).toBe("pending");
  });

  it("accepted: fully staffed by confirmed workers, nothing underway yet", () => {
    expect(
      deriveOrderLifecycle({ jobStatus: "approved_for_dispatch", activeWorkerCount: 1, requestedWorkerCount: 1 })
    ).toBe("accepted");
    // partially staffed is still pending
    expect(
      deriveOrderLifecycle({ jobStatus: "approved_for_dispatch", activeWorkerCount: 1, requestedWorkerCount: 2 })
    ).toBe("pending");
  });

  it("processing: attendance underway, hours locked, invoiced, or payment held", () => {
    const base = { jobStatus: "approved_for_dispatch", activeWorkerCount: 1 } as const;
    expect(deriveOrderLifecycle({ ...base, attendanceUnderway: true })).toBe("processing");
    expect(deriveOrderLifecycle({ ...base, timesheetLocked: true })).toBe("processing");
    expect(deriveOrderLifecycle({ ...base, invoiceIssued: true })).toBe("processing");
    expect(deriveOrderLifecycle({ ...base, paymentCaptured: true })).toBe("processing");
  });

  it("finished: worker paid out", () => {
    expect(
      deriveOrderLifecycle({ jobStatus: "archived", activeWorkerCount: 1, invoiceIssued: true, payoutTransferred: true })
    ).toBe("finished");
  });

  it("disputed overrides accepted/processing/finished-signals but not cancelled", () => {
    expect(
      deriveOrderLifecycle({ jobStatus: "approved_for_dispatch", activeWorkerCount: 1, invoiceIssued: true, hasOpenDispute: true })
    ).toBe("disputed");
    // payout already done but a dispute is open → still disputed (money held)
    expect(
      deriveOrderLifecycle({ jobStatus: "approved_for_dispatch", payoutTransferred: true, hasOpenDispute: true })
    ).toBe("disputed");
    // cancelled wins over everything
    expect(deriveOrderLifecycle({ jobStatus: "cancelled", hasOpenDispute: true, payoutTransferred: true })).toBe("cancelled");
  });

  it("cancelled/expired job statuses", () => {
    expect(deriveOrderLifecycle({ jobStatus: "expired" })).toBe("cancelled");
  });

  it("copy exists for every state", () => {
    for (const s of ["pending", "accepted", "processing", "finished", "disputed", "cancelled"] as const) {
      expect(orderLifecycleCopy(s).label.length).toBeGreaterThan(0);
    }
  });
});
