import { describe, expect, it } from "vitest";

import { createLocalFakeInvoiceDelivery } from "./invoiceDelivery";

const request = {
  invoiceId: "synthetic-invoice-a",
  organizationId: "tenantA",
  documentDigest: "a".repeat(64),
  recipientAlias: "synthetic-employer-a",
  idempotencyKey: "send-001"
};

describe("local fake invoice delivery", () => {
  it("returns the same receipt for an exact replay", async () => {
    const delivery = createLocalFakeInvoiceDelivery({
      now: () => "2026-07-30T00:00:00.000Z"
    });
    const first = await delivery.deliver(request, "tenantA");
    const replay = await delivery.deliver(request, "tenantA");
    expect(replay).toEqual(first);
    expect(first.provider).toBe("local_fake");
  });

  it("rejects conflicting replay content", async () => {
    const delivery = createLocalFakeInvoiceDelivery({
      now: () => "2026-07-30T00:00:00.000Z"
    });
    await delivery.deliver(request, "tenantA");
    await expect(
      delivery.deliver({ ...request, documentDigest: "b".repeat(64) }, "tenantA")
    ).rejects.toThrow("Invoice delivery idempotency conflict.");
  });

  it("denies cross-organization delivery", async () => {
    const delivery = createLocalFakeInvoiceDelivery({
      now: () => "2026-07-30T00:00:00.000Z"
    });
    await expect(delivery.deliver(request, "tenantB")).rejects.toThrow(
      "Invoice delivery is outside the authorized organization."
    );
  });
});
