import type { Server } from "node:http";
import { describe, expect, it } from "vitest";
import type { IdentityTokenVerifier } from "@rwos/service-auth";
import type { CandidateSourceConfig } from "./config";
import { buildCandidateSourceHttpServer } from "./http";
import { createCandidateLogger } from "./logger";
import { createSyntheticManifest, type SyntheticManifest } from "./manifest";
import { CandidateRateLimiter } from "./rateLimit";
import {
  evaluateRequest,
  searchRequest,
  serviceToken,
  tenantA,
  tenantB,
  testConfig
} from "./testFixture";

describe("candidate source HTTP contract", () => {
  it("returns unique opaque request IDs and preserves a valid caller ID", async () => {
    await withServer(async (origin) => {
      const first = await fetch(`${origin}/health`);
      const second = await fetch(`${origin}/health`);
      expect(first.headers.get("x-request-id")).toMatch(/^rwos-[0-9a-f-]{36}$/);
      expect(second.headers.get("x-request-id")).not.toBe(first.headers.get("x-request-id"));

      const supplied = await fetch(`${origin}/health`, {
        headers: { "x-request-id": "candidate-request-123" }
      });
      expect(supplied.headers.get("x-request-id")).toBe("candidate-request-123");
    });
  });

  it("requires both verified API identity and application authorization in dual mode", async () => {
    const audience = "https://rwos-candidate-opaque-nn.a.run.app";
    const identityToken = "synthetic-verified-google-identity";
    const config: CandidateSourceConfig = {
      ...testConfig,
      environment: "staging",
      trustedAuthorization: {
        mode: "dual-required",
        audience,
        callerServiceAccount: "rwos-api@staging.invalid",
        applicationCredential: serviceToken,
        environment: "staging",
        releaseSha: testConfig.releaseSha
      }
    };
    const identityVerifier: IdentityTokenVerifier = {
      async verify({ token, audience: requestedAudience }) {
        if (token !== identityToken || requestedAudience !== audience) {
          throw new Error("DENIED");
        }
        const now = new Date();
        return {
          subject: "synthetic-api-subject",
          serviceAccountEmail: "rwos-api@staging.invalid",
          audience,
          issuedAt: new Date(now.getTime() - 1_000),
          expiresAt: new Date(now.getTime() + 60_000)
        };
      }
    };
    const dualHeaders = {
      authorization: `Bearer ${identityToken}`,
      "x-rwos-app-authorization": `Bearer ${serviceToken}`,
      "content-type": "application/json",
      "x-rwos-service-id": "api",
      "x-rwos-operation": "candidates:search",
      "x-rwos-tenant-id": tenantA.organizationId,
      "x-rwos-environment": "staging",
      "x-rwos-release-sha": testConfig.releaseSha
    };
    await withServer(
      async (origin) => {
        expect((await fetch(`${origin}/ready`)).status).toBe(200);
        expect((await postSearch(origin, dualHeaders, searchRequest())).status).toBe(200);
        expect(
          (
            await postSearch(
              origin,
              { ...dualHeaders, "x-rwos-app-authorization": `Bearer ${identityToken}` },
              searchRequest()
            )
          ).status
        ).toBe(403);
        expect(
          (
            await postSearch(
              origin,
              { ...dualHeaders, authorization: `Bearer ${serviceToken}` },
              searchRequest()
            )
          ).status
        ).toBe(403);
      },
      {
        config,
        identityVerifier,
        limiter: new CandidateRateLimiter(
          config.tenantLimitPerMinute,
          config.serviceLimitPerMinute
        )
      }
    );
  });

  it("separates liveness and configuration/manifest readiness", async () => {
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
          tenants: new Map()
        }
      }
    );
  });

  it("requires constant-time bearer authentication and exact operation context", async () => {
    await withServer(async (origin) => {
      expect((await postSearch(origin, {}, searchRequest())).status).toBe(403);
      expect(
        (
          await postSearch(
            origin,
            headers(tenantA.organizationId, "candidates:evaluate"),
            searchRequest()
          )
        ).status
      ).toBe(403);
      expect(
        (await postSearch(origin, headers(tenantA.organizationId), searchRequest())).status
      ).toBe(200);
      const evaluation = await fetch(`${origin}/v1/candidates/evaluate`, {
        method: "POST",
        headers: headers(tenantA.organizationId, "candidates:evaluate"),
        body: JSON.stringify(evaluateRequest())
      });
      expect(evaluation.status).toBe(200);
      expect((await evaluation.json()).candidate.candidateSourceReference).toBe(
        "syn-tenant-a-candidate-001"
      );
    });
  });

  it("denies cross-tenant and missing tenant context without returning records", async () => {
    await withServer(async (origin) => {
      const crossTenant = await postSearch(
        origin,
        headers(tenantB.organizationId),
        searchRequest(tenantA)
      );
      expect(crossTenant.status).toBe(403);
      expect(JSON.stringify(await crossTenant.json())).not.toContain("syn-tenant-a");

      const missing = await postSearch(
        origin,
        {
          authorization: `Bearer ${serviceToken}`,
          "content-type": "application/json",
          "x-rwos-service-id": "rwos-api",
          "x-rwos-operation": "candidates:search"
        },
        searchRequest()
      );
      expect(missing.status).toBe(403);
    });
  });

  it("enforces bounded payloads and generic malformed-request errors", async () => {
    await withServer(async (origin) => {
      expect(
        (
          await fetch(`${origin}/v1/candidates/search?cursor=unsupported`, {
            method: "POST",
            headers: headers(tenantA.organizationId),
            body: JSON.stringify(searchRequest())
          })
        ).status
      ).toBe(404);
      const oversized = await fetch(`${origin}/v1/candidates/search`, {
        method: "POST",
        headers: headers(tenantA.organizationId),
        body: JSON.stringify({ padding: "x".repeat(17_000) })
      });
      expect(oversized.status).toBe(400);
      const malformed = await postSearch(origin, headers(tenantA.organizationId), {
        ...searchRequest(),
        unsupported: true
      });
      expect(malformed.status).toBe(400);
      expect(await malformed.json()).toEqual({
        error: "RWOS_CANDIDATE_REQUEST_INVALID",
        message: "Resource unavailable."
      });
    });
  });

  it("enforces approved rate limits and returns Retry-After", async () => {
    const limiter = new CandidateRateLimiter(1, 2, () => 1_000);
    await withServer(
      async (origin) => {
        expect(
          (await postSearch(origin, headers(tenantA.organizationId), searchRequest())).status
        ).toBe(200);
        const limited = await postSearch(origin, headers(tenantA.organizationId), searchRequest());
        expect(limited.status).toBe(429);
        expect(limited.headers.get("retry-after")).toBe("60");
      },
      { limiter }
    );
  });

  it("logs no bearer token or complete candidate payload", async () => {
    const records: string[] = [];
    await withServer(
      async (origin) => {
        await postSearch(origin, headers(tenantA.organizationId), searchRequest());
        await postSearch(origin, headers("person@example.invalid"), searchRequest());
      },
      { records }
    );
    const log = records.join("\n");
    expect(log).not.toContain(serviceToken);
    expect(log).not.toContain(tenantA.organizationId);
    expect(log).not.toContain("rwos-api");
    expect(log).not.toContain("syn-tenant-a-candidate");
    expect(log).not.toContain("Synthetic Candidate");
    expect(log).not.toContain("person@example.invalid");
  });
});

async function withServer(
  run: (origin: string) => Promise<void>,
  options: {
    records?: string[];
    limiter?: CandidateRateLimiter;
    manifest?: SyntheticManifest;
    config?: CandidateSourceConfig;
    identityVerifier?: IdentityTokenVerifier;
  } = {}
) {
  const server = buildCandidateSourceHttpServer({
    config: options.config ?? testConfig,
    manifest: options.manifest ?? createSyntheticManifest(options.config ?? testConfig),
    logger: createCandidateLogger((record) => options.records?.push(record)),
    ...(options.limiter ? { limiter: options.limiter } : {}),
    ...(options.identityVerifier ? { identityVerifier: options.identityVerifier } : {})
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
  tenantId: string,
  operation: "candidates:search" | "candidates:evaluate" = "candidates:search"
) {
  return {
    authorization: `Bearer ${serviceToken}`,
    "content-type": "application/json",
    "x-rwos-service-id": "rwos-api",
    "x-rwos-tenant-id": tenantId,
    "x-rwos-operation": operation
  };
}

function postSearch(origin: string, requestHeaders: Record<string, string>, body: unknown) {
  return fetch(`${origin}/v1/candidates/search`, {
    method: "POST",
    headers: requestHeaders,
    body: JSON.stringify(body)
  });
}
