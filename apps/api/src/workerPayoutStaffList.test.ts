import type { PrismaClient } from "@rwos/database";
import { describe, expect, it } from "vitest";
import { listWorkerPayoutsForStaff } from "./workerPayoutStaffList";

const row = {
  id: "payout-1",
  workerIdentityId: "worker-1",
  organizationId: "org-1",
  amountMinor: 9924,
  currency: "CAD",
  status: "released",
  holdUntil: new Date("2026-11-22T00:00:00.000Z"),
  paidAt: null,
  paymentRef: null
};

function prismaWith(rows: readonly (typeof row)[]) {
  return {
    workerPayout: { findMany: async () => rows },
    workerIdentity: { findMany: async () => [{ id: "worker-1", displayName: "Worker A" }] },
    employerOrganization: { findMany: async () => [{ id: "org-1", displayName: "Org A" }] }
  } as unknown as PrismaClient;
}

describe("listWorkerPayoutsForStaff", () => {
  it("names the worker and employer beside each payout", async () => {
    expect(await listWorkerPayoutsForStaff(prismaWith([row]))).toEqual([
      {
        id: "payout-1",
        workerDisplayName: "Worker A",
        organizationName: "Org A",
        amountMinor: 9924,
        currency: "CAD",
        status: "released",
        holdUntil: "2026-11-22T00:00:00.000Z",
        paidAt: null,
        paymentRef: null
      }
    ]);
  });

  it("does not expose the internal worker id", async () => {
    const [view] = await listWorkerPayoutsForStaff(prismaWith([row]));
    expect(view).not.toHaveProperty("workerIdentityId");
  });

  it("returns an empty list when there are no payouts", async () => {
    expect(await listWorkerPayoutsForStaff(prismaWith([]))).toEqual([]);
  });
});
