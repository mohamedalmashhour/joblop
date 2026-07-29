import { describe, expect, it } from "vitest";
import { ControlledDurableDeliveryStore } from "./durableStore";
import { createOfferDeliveryService } from "./service";
import {
  deliveryRequest,
  idempotencyKey,
  scenarioRecord,
  tenantA,
  tenantB,
  testConfig,
  testManifest
} from "./testFixture";

describe("synthetic offer delivery service", () => {
  it("returns deterministic immediate and permanent outcomes", async () => {
    const service = fixture().service;
    const success = scenarioRecord("immediate_success");
    await expect(
      service.deliver(deliveryRequest(success), tenantA.organizationId, idempotencyKey(success))
    ).resolves.toMatchObject({ response: { status: "sent", retryable: false } });
    const permanent = scenarioRecord("permanent_failure");
    await expect(
      service.deliver(
        deliveryRequest(permanent),
        tenantA.organizationId,
        idempotencyKey(permanent)
      )
    ).resolves.toMatchObject({
      response: { status: "failed", providerReference: null, retryable: false }
    });
  });

  it("suppresses duplicates and conflicts on a changed normalized request", async () => {
    const { service, store } = fixture();
    const record = scenarioRecord("duplicate_success");
    const key = idempotencyKey(record);
    const first = await service.deliver(deliveryRequest(record), tenantA.organizationId, key);
    const duplicate = await service.deliver(deliveryRequest(record), tenantA.organizationId, key);
    expect(duplicate.response).toEqual(first.response);
    expect(duplicate.audit.event).toBe("duplicate_suppressed");
    expect(store.size()).toBe(1);
    await expect(
      service.deliver(
        {
          ...deliveryRequest(record),
          workerIdentityId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa999"
        },
        tenantA.organizationId,
        key
      )
    ).rejects.toThrow("RWOS_DELIVERY_IDEMPOTENCY_CONFLICT");
  });

  it("serializes concurrent duplicate requests through one durable record", async () => {
    const { service, store } = fixture();
    const record = scenarioRecord("duplicate_success");
    const key = idempotencyKey(record);
    const outcomes = await Promise.all([
      service.deliver(deliveryRequest(record), tenantA.organizationId, key),
      service.deliver(deliveryRequest(record), tenantA.organizationId, key)
    ]);
    expect(outcomes.map((item) => item.audit.event).sort()).toEqual([
      "accepted",
      "duplicate_suppressed"
    ]);
    expect(store.size()).toBe(1);
  });

  it("uses injected time for one-second and five-second retry transitions", async () => {
    let time = new Date("2026-07-28T12:00:00.000Z");
    const { service } = fixture(() => time);
    const record = scenarioRecord("temporary_failure_then_success");
    const key = idempotencyKey(record);
    await expect(
      service.deliver(deliveryRequest(record), tenantA.organizationId, key)
    ).resolves.toMatchObject({ response: { status: "failed", retryable: true } });
    await expect(
      service.deliver(deliveryRequest(record), tenantA.organizationId, key)
    ).resolves.toMatchObject({ audit: { event: "duplicate_suppressed" } });
    time = new Date("2026-07-28T12:00:01.000Z");
    await expect(
      service.deliver(deliveryRequest(record), tenantA.organizationId, key)
    ).resolves.toMatchObject({
      response: { status: "failed", retryable: true },
      audit: { attempt: 2, event: "retry" }
    });
    time = new Date("2026-07-28T12:00:06.000Z");
    await expect(
      service.deliver(deliveryRequest(record), tenantA.organizationId, key)
    ).resolves.toMatchObject({
      response: { status: "delivered", retryable: false },
      audit: { attempt: 3, event: "status_transition" }
    });
  });

  it.each(["expired", "revoked_recipient", "inactive_organization"] as const)(
    "denies %s records without creating retry state",
    async (scenario) => {
      const { service, store } = fixture();
      const record = scenarioRecord(scenario);
      await expect(
        service.deliver(deliveryRequest(record), tenantA.organizationId, idempotencyKey(record))
      ).rejects.toThrow("RWOS_DELIVERY_UNAVAILABLE");
      expect(store.size()).toBe(0);
    }
  );

  it("conceals cross-tenant and unknown synthetic recipients", async () => {
    const { service } = fixture();
    const record = scenarioRecord("immediate_success");
    await expect(
      service.deliver(deliveryRequest(record), tenantB.organizationId, idempotencyKey(record))
    ).rejects.toThrow("RWOS_DELIVERY_ACCESS_DENIED");
    await expect(
      service.deliver(
        {
          ...deliveryRequest(record),
          workerIdentityId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc"
        },
        tenantA.organizationId,
        idempotencyKey(record)
      )
    ).rejects.toThrow("RWOS_DELIVERY_UNAVAILABLE");
  });

  it("rejects an unknown offer before opening durable state", async () => {
    const record = scenarioRecord("immediate_success");
    let transactionStarted = false;
    const service = createOfferDeliveryService({
      config: testConfig,
      manifest: testManifest,
      store: {
        ready: async () => true,
        transact: async () => {
          transactionStarted = true;
          throw new Error("must not execute");
        }
      },
      now: () => new Date("2026-07-28T12:00:00.000Z")
    });

    await expect(
      service.deliver(
        {
          ...deliveryRequest(record),
          workerOfferId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc"
        },
        tenantA.organizationId,
        "worker-offer:cccccccc-cccc-4ccc-8ccc-cccccccccccc:terms:dddddddd-dddd-4ddd-8ddd-dddddddddddd"
      )
    ).rejects.toThrow("RWOS_DELIVERY_UNAVAILABLE");
    expect(transactionStarted).toBe(false);
  });

  it.each([
    "person@example.invalid",
    "+14165550100",
    "https://recipient.invalid/device",
    "device-token-opaque-but-prohibited"
  ])("rejects recipient destination input %s", async (recipient) => {
    const { service } = fixture();
    const record = scenarioRecord("immediate_success");
    await expect(
      service.deliver(
        { ...deliveryRequest(record), workerIdentityId: recipient },
        tenantA.organizationId,
        idempotencyKey(record)
      )
    ).rejects.toThrow("RWOS_DELIVERY_REQUEST_INVALID");
  });

  it("rejects free-text destinations and malformed idempotency keys", async () => {
    const { service } = fixture();
    const record = scenarioRecord("immediate_success");
    await expect(
      service.deliver(
        { ...deliveryRequest(record), destination: "somewhere" },
        tenantA.organizationId,
        idempotencyKey(record)
      )
    ).rejects.toThrow("RWOS_DELIVERY_REQUEST_INVALID");
    await expect(
      service.deliver(deliveryRequest(record), tenantA.organizationId, "unscoped-key")
    ).rejects.toThrow("RWOS_DELIVERY_REQUEST_INVALID");
  });

  it("fails closed when durable state is unavailable", async () => {
    const { service, store } = fixture();
    store.setAvailable(false);
    const record = scenarioRecord("immediate_success");
    await expect(
      service.deliver(deliveryRequest(record), tenantA.organizationId, idempotencyKey(record))
    ).rejects.toMatchObject({ status: 503, code: "RWOS_DELIVERY_UNAVAILABLE" });
  });
});

function fixture(now: () => Date = () => new Date("2026-07-28T12:00:00.000Z")) {
  const store = new ControlledDurableDeliveryStore();
  return {
    store,
    service: createOfferDeliveryService({
      config: testConfig,
      manifest: testManifest,
      store,
      now
    })
  };
}
