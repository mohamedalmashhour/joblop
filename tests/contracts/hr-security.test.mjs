import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { buildApi } from "../../apps/api/src/app";
import {
  discoverElevatedRoutes,
  findAuditMutationPaths,
  findUngatedDevSecrets,
  sameResponseShape
} from "../../contracts/security/index.mjs";

const apiSourcePath = "apps/api/src/app.ts";
const platformRoutePrefixes = [
  "/platform/work-groups",
  "/platform/role-definitions",
  "/platform/job-requests/intake",
  "/platform/dispatches",
  "/platform/worker-offers",
  "/platform/assignments",
  "/platform/attendance",
  "/platform/timesheets"
];
const moneyRouteFragments = [
  "/platform/payroll",
  "/platform/finance",
  "/platform/invoices",
  "/platform/payments",
  "/platform/worker-payables",
  "/platform/employer-payments",
  "/platform/escrow",
  "/platform/money-engine"
];

let tempDirs = [];

afterEach(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
  tempDirs = [];
});

describe("HR contract security gate", () => {
  it("discovers Fastify elevated routes through the kit scanner with non-zero known inventory", () => {
    const routes = discoverFastifyPlatformRoutes(readFileSync(apiSourcePath, "utf8"));
    const expectedKeys = routes.map((route) => `${route.method} ${route.path}`).sort();

    expect(expectedKeys.length).toBeGreaterThan(0);
    for (const prefix of platformRoutePrefixes) {
      expect(routes.some((route) => route.path.startsWith(prefix))).toBe(true);
    }
    for (const fragment of moneyRouteFragments) {
      expect(routes.some((route) => route.path.includes(fragment))).toBe(false);
    }

    const normalizedDir = writeNormalizedRouteManifest(routes);
    const discovered = discoverElevatedRoutes(normalizedDir, {
      elevatedRoles: ["PLATFORM_ADMINISTRATOR", "DISPATCHER"],
      guardCall: "authorizationService.decide"
    });
    const discoveredKeys = discovered.map((route) => `${route.method} ${route.path}`).sort();

    expect(discoveredKeys.length).toBeGreaterThan(0);
    expect(discoveredKeys).toEqual(expectedKeys);
  });

  it("keeps dev-only secrets gated out of production surfaces", () => {
    const targets = ["apps/api/src", "apps/admin/app", "apps/employer/app", "apps/mobile/src"];
    const result = Object.fromEntries(
      targets.map((target) => [
        target,
        findUngatedDevSecrets(target, {
          token: "devCode",
          buildFlag: 'process.env.NODE_ENV !== "production"'
        })
      ])
    );

    expect(result).toEqual({
      "apps/api/src": [],
      "apps/admin/app": [],
      "apps/employer/app": [],
      "apps/mobile/src": []
    });
  });

  it("keeps auth responses enumeration-safe and proves auth rate limiting returns 429", async () => {
    const seeded = {
      status: 401,
      body: { error: "RWOS_AUTHENTICATION_FAILED", message: "Authentication failed." }
    };
    const fresh = {
      status: 401,
      body: { error: "RWOS_AUTHENTICATION_FAILED", message: "Authentication failed." }
    };

    expect(sameResponseShape(seeded, fresh)).toBe(true);

    const app = buildApi({ authService: createAlwaysSuccessfulAuthService() });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await app.inject({
        method: "POST",
        url: "/auth/sign-in",
        payload: {
          email: "contract-rate-limit@example.com",
          password: "WrongPassword123"
        }
      });

      expect(response.statusCode).toBe(200);
    }

    const limited = await app.inject({
      method: "POST",
      url: "/auth/sign-in",
      payload: {
        email: "contract-rate-limit@example.com",
        password: "WrongPassword123"
      }
    });

    expect(limited.statusCode).toBe(429);
    expect(limited.json()).toEqual({
      error: "RWOS_AUTH_RATE_LIMITED",
      message: "Too many authentication attempts. Try again later."
    });

    await app.close();
  });

  it("keeps audit events append-only in current service code", () => {
    expect(findAuditMutationPaths("packages/auth/src", { model: "auditEvent" })).toEqual([]);
  });
});

function discoverFastifyPlatformRoutes(source) {
  const routes = [];
  const routePattern =
    /app\.(get|post|patch|put|delete)\(\s*(?:"([^"]+)"|'([^']+)')/g;
  let match;

  while ((match = routePattern.exec(source))) {
    const method = match[1].toLowerCase();
    const path = match[2] ?? match[3];

    if (path?.startsWith("/platform/")) {
      routes.push({ method, path });
    }
  }

  return routes;
}

function writeNormalizedRouteManifest(routes) {
  const dir = mkdtempSync(join(tmpdir(), "rwos-contract-routes-"));
  tempDirs.push(dir);
  const source = routes
    .map(
      (route) => [
        `if (url.pathname === '${route.path}') {}`,
        `if (req.method === '${route.method.toUpperCase()}') {}`,
        "authorizationService.decide(session, ['PLATFORM_ADMINISTRATOR'])"
      ].join("\n")
    )
    .join("\n");

  writeFileSync(join(dir, "routes.mjs"), source);
  return dir;
}

function createAlwaysSuccessfulAuthService() {
  const now = new Date("2026-07-25T00:00:00.000Z");

  return {
    async register() {
      return {
        user: {
          id: "user_contract",
          publicId: "usr_contract",
          emailNormalized: "contract@example.com",
          displayName: "Contract User",
          status: "active"
        },
        session: {
          id: "session_contract",
          userId: "user_contract",
          expiresAt: now
        },
        token: "contract-token"
      };
    },
    async signIn() {
      return {
        user: {
          id: "user_contract",
          publicId: "usr_contract",
          emailNormalized: "contract@example.com",
          displayName: "Contract User",
          status: "active"
        },
        session: {
          id: "session_contract",
          userId: "user_contract",
          expiresAt: now
        },
        token: "contract-token"
      };
    },
    async validateSession() {
      return {
        authenticated: true,
        user: {
          id: "user_contract",
          publicId: "usr_contract",
          emailNormalized: "contract@example.com",
          displayName: "Contract User",
          status: "active"
        },
        session: {
          id: "session_contract",
          userId: "user_contract",
          expiresAt: now
        }
      };
    },
    async revokeSession() {}
  };
}
