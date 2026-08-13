import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function sources(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? sources(path) : /\.(ts|tsx)$/.test(entry) ? [path] : [];
  });
}

describe("frontend session transport boundaries", () => {
  it("keeps bearer and cookie access outside React components", () => {
    const componentSources = [
      ...sources(join(root, "apps/employer/app/employer")),
      ...sources(join(root, "apps/admin/app/calendar")),
      ...sources(join(root, "apps/mobile/src/features"))
    ]
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");
    expect(componentSources).not.toMatch(/Bearer\s/iu);
    expect(componentSources).not.toMatch(/SessionCookieName/u);
  });

  it("never stores session secrets in browser storage or query parameters", () => {
    const sessionSources = [
      ...sources(join(root, "apps/employer/app/api")),
      ...sources(join(root, "apps/admin/app/api")),
      ...sources(join(root, "apps/mobile/src/auth"))
    ]
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");
    expect(sessionSources).not.toMatch(/localStorage|sessionStorage/u);
    expect(sessionSources).not.toMatch(
      /searchParams\.(?:get|set)\(\s*["'`](?:token|session|authorization)/iu
    );
    expect(sessionSources).not.toMatch(/console\.(?:log|info|warn|error)/u);
  });

  it("uses HttpOnly same-site web cookies and native secure storage", () => {
    const employerBoundary = readFileSync(
      join(root, "apps/employer/app/api/sessionBoundary.ts"),
      "utf8"
    );
    const adminBoundary = readFileSync(join(root, "apps/admin/app/api/sessionBoundary.ts"), "utf8");
    const mobileBoundary = readFileSync(
      join(root, "apps/mobile/src/auth/secureSession.ts"),
      "utf8"
    );
    expect(employerBoundary).toContain("httpOnly: true");
    expect(employerBoundary).toContain('sameSite: "strict"');
    expect(employerBoundary).toContain("secureEmployerSessionCookieName");
    expect(adminBoundary).toContain("secureAdminSessionCookieName");
    expect(employerBoundary).toContain("isSameOriginMutation");
    expect(mobileBoundary).toContain('from "expo-secure-store"');
    expect(mobileBoundary).toContain("WHEN_UNLOCKED_THIS_DEVICE_ONLY");
  });

  it("provides persisted detail BFF routes for employer and admin", () => {
    for (const app of ["employer", "admin"]) {
      expect(
        readFileSync(
          join(root, "apps", app, "app/api/calendar/requests/[requestId]/route.ts"),
          "utf8"
        )
      ).toContain("requestId");
    }
  });

  it("keeps employer and admin session boundaries symmetric", () => {
    const employer = readFileSync(join(root, "apps/employer/app/api/sessionBoundary.ts"), "utf8");
    const admin = readFileSync(join(root, "apps/admin/app/api/sessionBoundary.ts"), "utf8");
    for (const source of [employer, admin]) {
      expect(source).toContain("createFrontendSessionGateway");
      expect(source).toContain("httpOnly: true");
      expect(source).toContain('sameSite: "strict"');
      expect(source).toContain("isSameOriginMutation");
    }
    for (const route of ["session/route.ts"]) {
      const employerRoute = readFileSync(join(root, "apps/employer/app/api", route), "utf8");
      const adminRoute = readFileSync(join(root, "apps/admin/app/api", route), "utf8");
      expect(adminRoute).toBe(employerRoute);
    }
    const employerSignIn = readFileSync(
      join(root, "apps/employer/app/api/session/sign-in/route.ts"),
      "utf8"
    );
    const adminSignIn = readFileSync(
      join(root, "apps/admin/app/api/session/sign-in/route.ts"),
      "utf8"
    );
    for (const route of [employerSignIn, adminSignIn]) {
      expect(route).toContain("isSameOriginMutation");
      expect(route).toContain("sign_out_required");
      expect(route).toContain("gateway.signIn");
      expect(route).toContain("sessionCookieOptions");
    }
    expect(employerSignIn).toContain("organizationContextCookieName");
    expect(employerSignIn).toContain("maxAge: 0");
    const employerSignOut = readFileSync(
      join(root, "apps/employer/app/api/session/sign-out/route.ts"),
      "utf8"
    );
    const adminSignOut = readFileSync(
      join(root, "apps/admin/app/api/session/sign-out/route.ts"),
      "utf8"
    );
    for (const route of [employerSignOut, adminSignOut]) {
      expect(route).toContain("gateway.signOut(token)");
      expect(route).toContain("maxAge: 0");
    }
    expect(employerSignOut).toContain("organizationContextCookieName");
  });

  it("keeps list and detail failures generic and cache-private", () => {
    const apiSources = [
      ...sources(join(root, "apps/employer/app/api")),
      ...sources(join(root, "apps/admin/app/api"))
    ]
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");
    expect(apiSources).toContain('"cache-control": "private, no-store"');
    expect(apiSources).toContain('status === "not_found"');
    expect(apiSources).toContain("Resource unavailable.");
    expect(apiSources).toContain('status === "stale"');
    expect(apiSources).toContain('status === "unavailable"');
    // Guard against leaking server error internals to clients. Target the actual leak
    // vectors (`privateReason`, an error `.stack`, error-chaining `error.cause`) rather than
    // the bare word `cause`, which is now a legitimate domain field (cancellation cause).
    expect(apiSources).not.toMatch(/privateReason|\.stack\b|error\.cause\b/u);
  });

  it("protects employer job-request mutations behind the same-origin session boundary", () => {
    const createRoute = readFileSync(
      join(root, "apps/employer/app/api/job-requests/route.ts"),
      "utf8"
    );
    const submitRoute = readFileSync(
      join(root, "apps/employer/app/api/job-requests/[jobRequestId]/submit/route.ts"),
      "utf8"
    );
    const editRoute = readFileSync(
      join(root, "apps/employer/app/api/job-requests/[jobRequestId]/route.ts"),
      "utf8"
    );
    for (const route of [createRoute, editRoute, submitRoute]) {
      expect(route).toContain("isSameOriginMutation(request)");
      expect(route).toContain("resolveClientOrganizationId");
      expect(route).toContain('"cache-control": "private, no-store"');
      expect(route).not.toContain("authorization:");
    }
    expect(createRoute).toContain("readEmployerJobRequestInput");
    expect(editRoute).toContain("readEmployerJobRequestUpdate");
    expect(editRoute).toContain('"PATCH"');
    expect(submitRoute).toContain("expectedVersion");
  });

  it("protects admin intake mutations behind the admin same-origin session boundary", () => {
    const route = readFileSync(
      join(root, "apps/admin/app/api/intake/[jobRequestId]/[action]/route.ts"),
      "utf8"
    );
    expect(route).toContain("isSameOriginMutation(request)");
    expect(route).toContain("sessionBoundary()");
    expect(route).toContain("encodeURIComponent(jobRequestId)");
    expect(route).toContain('"cache-control": "private, no-store"');
    expect(route).not.toContain("authorization:");
  });

  it("requires sign-out before web or native account switching", () => {
    const webSignIn = readFileSync(
      join(root, "apps/employer/app/api/session/sign-in/route.ts"),
      "utf8"
    );
    const nativeSession = readFileSync(join(root, "apps/mobile/src/auth/secureSession.ts"), "utf8");
    expect(webSignIn).toContain('status: "sign_out_required"');
    expect(webSignIn).toContain("if (token)");
    expect(nativeSession).toContain('return { status: "sign_out_required" }');
  });
});
