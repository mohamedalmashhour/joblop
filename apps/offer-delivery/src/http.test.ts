import type { Server } from "node:http";
import { describe, expect, it } from "vitest";
import { buildOfferDeliveryHttpServer } from "./http";
import { createDeliveryLogger } from "./logger";
import type { DeliveryManifest } from "./manifest";
import { DeliveryRateLimiter } from "./rateLimit";
import { ControlledDurableDeliveryStore } from "./durableStore";
import {
  deliveryRequest,
  idempotencyKey,
  scenarioRecord,
  serviceToken,
  tenantB,
  testConfig,
  testManifest
} from "./testFixture";

describe("offer delivery HTTP contract", () => {
  it("returns unique opaque request IDs and preserves a valid caller ID", async () => {
    await withServer(async (origin) => {
      const first = await fetch(`${origin}/health`);
      const second = await fetch(`${origin}/health`);
      expect(first.headers.get("x-request-id")).toMatch(/^rwos-[0-9a-f-]{36}$/);
      expect(second.headers.get("x-request-id")).not.toBe(first.headers.get("x-request-id"));

      const supplied = await fetch(`${origin}/health`, {
        headers: { "x-request-id": "delivery-request-123" }
      });
      expect(supplied.headers.get("x-request-id")).toBe("delivery-request-123");
    });
  });

  it("separates process liveness and manifest readiness", async () => {
    await withServer(async (origin) => {
      expect((await fetch(`${origin}/health`)).status).toBe(200);
      expect((await fetch(`${origin}/ready`)).status).toBe(200);
    });
    await withServer(
      async (origin) => {
        expect((await fetch(`${origin}/health`)).status).toBe(200);
        expect((await fetch(`${origin}/ready`)).status).toBe(503);
      },
      {
        manifest: {
          synthetic: true,
          version: 1,
          releaseSha: testConfig.releaseSha,
          records: new Map()
        }
      }
    );
  });

  it("fails readiness when durable state is unavailable", async () => {
    const store = new ControlledDurableDeliveryStore();
    store.setAvailable(false);
    await withServer(
      async (origin) => {
        expect((await fetch(`${origin}/health`)).status).toBe(200);
        expect((await fetch(`${origin}/ready`)).status).toBe(503);
      },
      { store }
    );
  });

  it("requires bearer, service, operation, and matching tenant authorization", async () => {
    const record = scenarioRecord("immediate_success");
    await withServer(async (origin) => {
      expect((await deliver(origin, record, {})).status).toBe(403);
      expect(
        (await deliver(origin, record, headers(record, { operation: "wrong:operation" }))).status
      ).toBe(403);
      expect(
        (await deliver(origin, record, headers(record, { tenantId: tenantB.organizationId })))
          .status
      ).toBe(403);
      const accepted = await deliver(origin, record, headers(record));
      expect(accepted.status).toBe(200);
      expect(await accepted.json()).toMatchObject({ status: "sent", retryable: false });
    });
  });

  it("rejects oversized, malformed, destination-bearing, and query requests", async () => {
    const record = scenarioRecord("immediate_success");
    await withServer(async (origin) => {
      expect(
        (
          await fetch(`${origin}/v1/worker-offers/deliver?callback=unsupported`, {
            method: "POST",
            headers: headers(record),
            body: JSON.stringify(deliveryRequest(record))
          })
        ).status
      ).toBe(404);
      expect(
        (
          await fetch(`${origin}/v1/worker-offers/deliver`, {
            method: "POST",
            headers: headers(record),
            body: JSON.stringify({ padding: "x".repeat(9_000) })
          })
        ).status
      ).toBe(400);
      expect(
        (
          await deliver(origin, record, headers(record), {
            ...deliveryRequest(record),
            email: "person@example.invalid"
          })
        ).status
      ).toBe(400);
    });
  });

  it("enforces request limits with Retry-After", async () => {
    const record = scenarioRecord("immediate_success");
    await withServer(
      async (origin) => {
        expect((await deliver(origin, record, headers(record))).status).toBe(200);
        const limited = await deliver(origin, record, headers(record));
        expect(limited.status).toBe(429);
        expect(limited.headers.get("retry-after")).toBe("60");
      },
      { limiter: new DeliveryRateLimiter(1, 2, () => 1_000) }
    );
  });

  it("keeps credentials, recipient references, destinations and payloads out of logs", async () => {
    const records: string[] = [];
    const record = scenarioRecord("immediate_success");
    await withServer(
      async (origin) => {
        await deliver(origin, record, headers(record));
        await deliver(origin, record, headers(record, { tenantId: "person@example.invalid" }));
      },
      { records }
    );
    const log = records.join("\n");
    expect(log).not.toContain(serviceToken);
    expect(log).not.toContain(record.workerIdentityId);
    expect(log).not.toContain(record.workerOfferId);
    expect(log).not.toContain(idempotencyKey(record));
    expect(log).not.toContain(record.organizationId);
    expect(log).not.toContain("rwos-api");
    expect(log).not.toContain("person@example.invalid");
  });
});

async function withServer(
  run: (origin: string) => Promise<void>,
  options: {
    records?: string[];
    manifest?: DeliveryManifest;
    limiter?: DeliveryRateLimiter;
    store?: ControlledDurableDeliveryStore;
  } = {}
) {
  const server = buildOfferDeliveryHttpServer({
    config: testConfig,
    manifest: options.manifest ?? testManifest,
    logger: createDeliveryLogger((record) => options.records?.push(record)),
    ...(options.limiter ? { limiter: options.limiter } : {}),
    ...(options.store ? { store: options.store } : {}),
    now: () => new Date("2026-07-28T12:00:00.000Z")
  });
  const origin = await listen(server);
  try {
    await run(origin);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
}

async function listen(server: Server) {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("TEST_SERVER_UNAVAILABLE");
  return `http://127.0.0.1:${address.port}`;
}

function headers(
  record: ReturnType<typeof scenarioRecord>,
  overrides: { tenantId?: string; operation?: string } = {}
) {
  return {
    authorization: `Bearer ${serviceToken}`,
    "content-type": "application/json",
    "idempotency-key": idempotencyKey(record),
    "x-rwos-service-id": "rwos-api",
    "x-rwos-tenant-id": overrides.tenantId ?? record.organizationId,
    "x-rwos-operation": overrides.operation ?? "worker-offers:deliver"
  };
}

function deliver(
  origin: string,
  record: ReturnType<typeof scenarioRecord>,
  requestHeaders: Record<string, string>,
  body: unknown = deliveryRequest(record)
) {
  return fetch(`${origin}/v1/worker-offers/deliver`, {
    method: "POST",
    headers: requestHeaders,
    body: JSON.stringify(body)
  });
}
