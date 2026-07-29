import type { Server } from "node:http";
import { createFakeIdentityTokenVerifier, fakeIdentity } from "@rwos/service-auth/testing";
import { describe, expect, it } from "vitest";
import { createResetControlStore } from "./control";
import { buildQaResetHttpServer } from "./http";
import { createQaResetLogger } from "./logger";
import type { ResetManifest } from "./manifest";
import { MemoryResetLock, MemoryResetRepository } from "./repository";
import { testConfig, testManifest } from "./testFixture";

describe("QA reset HTTP contract", () => {
  it("returns unique opaque request IDs and preserves a valid caller ID", async () => {
    await withServer(async (origin) => {
      const first = await fetch(`${origin}/health`);
      const second = await fetch(`${origin}/health`);
      expect(first.headers.get("x-request-id")).toMatch(/^rwos-[0-9a-f-]{36}$/);
      expect(second.headers.get("x-request-id")).not.toBe(first.headers.get("x-request-id"));

      const supplied = await fetch(`${origin}/health`, {
        headers: { "x-request-id": "qa-reset-request-123" }
      });
      expect(supplied.headers.get("x-request-id")).toBe("qa-reset-request-123");
    });
  });

  it("separates liveness from manifest/configuration readiness", async () => {
    await withServer(async (origin) => {
      expect((await fetch(`${origin}/health`)).status).toBe(200);
      expect((await fetch(`${origin}/ready`)).status).toBe(200);
    });
    await withServer(
      async (origin) => {
        expect((await fetch(`${origin}/health`)).status).toBe(200);
        expect((await fetch(`${origin}/ready`)).status).toBe(503);
      },
      { manifest: { ...testManifest, checksum: "0".repeat(64) } }
    );
  });

  it("keeps liveness up and fails readiness when durable PostgreSQL is unavailable", async () => {
    await withServer(
      async (origin) => {
        expect((await fetch(`${origin}/health`)).status).toBe(200);
        expect((await fetch(`${origin}/ready`)).status).toBe(503);
      },
      { durableReady: false }
    );
  });

  it("requires exact authentication and operation-specific authorization", async () => {
    await withServer(async (origin) => {
      expect((await request(origin, "dry-run", browserBody("prepare"), {})).status).toBe(403);
      for (const [name, value] of Object.entries({
        "x-rwos-project-id": "gcp/projects/other",
        "x-rwos-release-sha": "0".repeat(40),
        "x-rwos-manifest-id": "gcp/manifests/other",
        "x-rwos-manifest-checksum": "0".repeat(64),
        "x-rwos-approval-reference": "gcp/approvals/other"
      })) {
        expect(
          (
            await request(
              origin,
              "dry-run",
              browserBody("prepare"),
              headers("dry-run", { [name]: value })
            )
          ).status
        ).toBe(403);
      }
      expect(
        (await request(origin, "dry-run", browserBody("prepare"), headers("dry-run"))).status
      ).toBe(200);
    });
  });

  it("executes browser dry-run, prepare, cleanup dry-run and cleanup receipts", async () => {
    await withServer(async (origin) => {
      const dryRun = await json(
        request(origin, "dry-run", browserBody("prepare"), headers("dry-run"))
      );
      const preparePlanChecksum = requiredString(dryRun, "planChecksum");
      const prepared = await json(
        request(
          origin,
          "prepare",
          browserBody("prepare", { dryRunChecksum: preparePlanChecksum }),
          headers("prepare")
        )
      );
      expect(prepared.prepared).toBe(true);
      const preparationReceipt = requiredString(prepared, "receipt");
      const cleanupPlan = await json(
        request(origin, "dry-run", browserBody("cleanup"), headers("dry-run"))
      );
      const cleanupPlanChecksum = requiredString(cleanupPlan, "planChecksum");
      const cleaned = await json(
        request(
          origin,
          "cleanup",
          browserBody("cleanup", {
            dryRunChecksum: cleanupPlanChecksum,
            preparationReceipt
          }),
          headers("cleanup")
        )
      );
      expect(cleaned).toMatchObject({ cleaned: true, count: 0 });
    });
  });

  it("accepts the native request shape and rejects malformed or oversized input", async () => {
    await withServer(async (origin) => {
      const native = {
        action: "prepare",
        authorityId: testConfig.authorityId,
        tenantId: testConfig.tenantAId,
        releaseSha: testConfig.releaseSha,
        confirmation: "authorized-staging-native-e2e"
      };
      expect(
        (await request(origin, "dry-run", native, headers("dry-run", {}, "ios-e2e"))).status
      ).toBe(200);
      expect((await request(origin, "dry-run", native, headers("dry-run"))).status).toBe(403);
      expect(
        (
          await request(
            origin,
            "dry-run",
            { ...native, tableName: "users" },
            headers("dry-run", {}, "ios-e2e")
          )
        ).status
      ).toBe(400);
      expect(
        (await request(origin, "dry-run", { padding: "x".repeat(17_000) }, headers("dry-run")))
          .status
      ).toBe(400);
    });
  });

  it("does not log credentials, headers, payloads or record identifiers", async () => {
    const records: string[] = [];
    await withServer(
      async (origin) => {
        await request(origin, "dry-run", browserBody("prepare"), headers("dry-run"));
      },
      { records }
    );
    const log = records.join("\n");
    expect(log).not.toContain(testConfig.callers["browser-e2e"].applicationCredential);
    expect(log).not.toContain(testConfig.callers["browser-e2e"].serviceAccountEmail);
    expect(log).not.toContain(testManifest.records[0]!.recordId);
    expect(log).not.toContain("authorized-staging-browser-e2e");
  });

  it("separates browser, iOS, Android, manual-QA and monitoring identities", async () => {
    await withServer(async (origin) => {
      const browser = browserBody("prepare");
      const native = nativeBody("prepare");
      expect(
        (await request(origin, "dry-run", browser, headers("dry-run", {}, "browser-e2e"))).status
      ).toBe(200);
      expect(
        (await request(origin, "dry-run", native, headers("dry-run", {}, "ios-e2e"))).status
      ).toBe(200);
      expect(
        (await request(origin, "dry-run", native, headers("dry-run", {}, "android-e2e"))).status
      ).toBe(200);
      expect(
        (await request(origin, "dry-run", browser, headers("dry-run", {}, "manual-qa"))).status
      ).toBe(200);
      expect(
        (await request(origin, "prepare", browser, headers("prepare", {}, "manual-qa"))).status
      ).toBe(403);
      expect(
        (
          await fetch(`${origin}/v1/qa-reset/status`, {
            headers: headers("status", {}, "monitoring")
          })
        ).status
      ).toBe(200);
    });
  });

  it("denies browser/native impersonation and swapped Google/application credentials", async () => {
    await withServer(async (origin) => {
      const native = nativeBody("prepare");
      expect(
        (await request(origin, "dry-run", native, headers("dry-run", {}, "browser-e2e"))).status
      ).toBe(403);
      expect(
        (
          await request(
            origin,
            "dry-run",
            native,
            headers(
              "dry-run",
              {
                "x-rwos-service-id": "android-e2e"
              },
              "ios-e2e"
            )
          )
        ).status
      ).toBe(403);
      expect(
        (
          await request(
            origin,
            "dry-run",
            native,
            headers(
              "dry-run",
              {
                authorization: `Bearer ${identityToken("android-e2e")}`
              },
              "ios-e2e"
            )
          )
        ).status
      ).toBe(403);
      expect(
        (
          await request(
            origin,
            "dry-run",
            native,
            headers(
              "dry-run",
              {
                "x-rwos-app-authorization": `Bearer ${testConfig.callers["android-e2e"].applicationCredential}`
              },
              "ios-e2e"
            )
          )
        ).status
      ).toBe(403);
    });
  });
});

async function withServer(
  run: (origin: string) => Promise<void>,
  options: { records?: string[]; manifest?: ResetManifest; durableReady?: boolean } = {}
) {
  const server = buildQaResetHttpServer({
    config: testConfig,
    manifest: options.manifest ?? testManifest,
    repository: new MemoryResetRepository(),
    lock: new MemoryResetLock(),
    control: createResetControlStore(),
    logger: createQaResetLogger((record) => options.records?.push(record)),
    now: () => testNow,
    durableDependencyReady: () => options.durableReady ?? true,
    identityVerifier: verifier()
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
  operation: "dry-run" | "prepare" | "cleanup" | "status",
  overrides: Record<string, string> = {},
  callerAlias:
    "browser-e2e" | "ios-e2e" | "android-e2e" | "manual-qa" | "monitoring" = "browser-e2e"
) {
  const caller = testConfig.callers[callerAlias];
  const approval =
    operation === "dry-run"
      ? testConfig.dryRunApprovalReference
      : operation === "prepare"
        ? testConfig.prepareApprovalReference
        : testConfig.cleanupApprovalReference;
  return {
    authorization: `Bearer ${identityToken(callerAlias)}`,
    "x-rwos-app-authorization": `Bearer ${caller.applicationCredential}`,
    "content-type": "application/json",
    "x-rwos-service-id": callerAlias,
    ...(caller.operatorIdentity ? { "x-rwos-operator-id": caller.operatorIdentity } : {}),
    "x-rwos-operation": `qa-reset:${operation}`,
    "x-rwos-environment": "staging",
    "x-rwos-project-id": testConfig.projectId,
    "x-rwos-cluster-id": testConfig.clusterId,
    "x-rwos-database-id": testConfig.databaseId,
    "x-rwos-authority-id": testConfig.authorityId,
    "x-rwos-namespace": testConfig.namespace,
    "x-rwos-release-sha": testConfig.releaseSha,
    "x-rwos-manifest-id": testConfig.manifestId,
    "x-rwos-manifest-checksum": testConfig.manifestChecksum,
    ...(operation === "status" ? {} : { "x-rwos-approval-reference": approval }),
    ...overrides
  };
}

function browserBody(action: "prepare" | "cleanup", extra: Record<string, string> = {}) {
  return {
    action,
    tenantIds: [testConfig.tenantAId, testConfig.tenantBId],
    releaseSha: testConfig.releaseSha,
    confirmation: "authorized-staging-browser-e2e",
    ...extra
  };
}

function nativeBody(action: "prepare" | "cleanup") {
  return {
    action,
    authorityId: testConfig.authorityId,
    tenantId: testConfig.tenantAId,
    releaseSha: testConfig.releaseSha,
    confirmation: "authorized-staging-native-e2e"
  };
}

const testNow = new Date("2026-07-28T12:00:00.000Z");

function identityToken(
  caller: "browser-e2e" | "ios-e2e" | "android-e2e" | "manual-qa" | "monitoring"
) {
  return `verified-google-identity-token-for-${caller}`;
}

function verifier() {
  return createFakeIdentityTokenVerifier({
    identities: Object.fromEntries(
      Object.entries(testConfig.callers).map(([alias, caller]) => [
        identityToken(alias as keyof typeof testConfig.callers),
        {
          ...fakeIdentity({
            service: alias as keyof typeof testConfig.callers,
            audience: testConfig.audience,
            now: testNow
          }),
          serviceAccountEmail: caller.serviceAccountEmail
        }
      ])
    )
  });
}

function request(
  origin: string,
  operation: "dry-run" | "prepare" | "cleanup",
  body: unknown,
  requestHeaders: Record<string, string>
) {
  return fetch(`${origin}/v1/qa-reset/${operation}`, {
    method: "POST",
    headers: requestHeaders,
    body: JSON.stringify(body)
  });
}

async function json(responsePromise: Promise<Response>) {
  const response = await responsePromise;
  expect(response.status).toBe(200);
  return (await response.json()) as Record<string, string | number | boolean>;
}

function requiredString(record: Record<string, string | number | boolean>, key: string) {
  const value = record[key];
  if (typeof value !== "string") throw new Error(`TEST_RESPONSE_${key}_INVALID`);
  return value;
}
