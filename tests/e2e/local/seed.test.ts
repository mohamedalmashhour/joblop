import { describe, expect, it } from "vitest";
import { assertLocalE2eEnabled, LOCAL_E2E_USERS, LOCAL_E2E_PASSWORD } from "./seed";
import { validateBrowserE2eEnvironment } from "../e2e-environment-policy";

// Workstream A.1 — the local-E2E seed seam must FAIL CLOSED outside local-E2E mode and be
// impossible to enable in production; the authoritative staging policy must remain localhost-hostile.
describe("local-E2E seam safety", () => {
  it("is enabled only when RWOS_LOCAL_E2E=enabled and not production", () => {
    expect(() => assertLocalE2eEnabled({ RWOS_LOCAL_E2E: "enabled", RWOS_ENV: "local" })).not.toThrow();
    expect(() => assertLocalE2eEnabled({ RWOS_LOCAL_E2E: "enabled", RWOS_ENV: "test" })).not.toThrow();
  });

  it("fails closed when the flag is absent/off", () => {
    expect(() => assertLocalE2eEnabled({})).toThrow(/LOCAL_E2E_NOT_ENABLED/);
    expect(() => assertLocalE2eEnabled({ RWOS_LOCAL_E2E: "disabled" })).toThrow(/LOCAL_E2E_NOT_ENABLED/);
  });

  it("is impossible in production even if the flag is set", () => {
    expect(() => assertLocalE2eEnabled({ RWOS_LOCAL_E2E: "enabled", RWOS_ENV: "production" })).toThrow(/LOCAL_E2E_FORBIDDEN_IN_PRODUCTION/);
  });

  it("uses only synthetic .invalid identities and a synthetic password", () => {
    for (const email of Object.values(LOCAL_E2E_USERS)) expect(email.endsWith("@local-e2e.invalid")).toBe(true);
    expect(LOCAL_E2E_PASSWORD).not.toMatch(/@|real/i);
  });

  it("the authoritative STAGING browser-E2E policy still rejects localhost + requires remote HTTPS", () => {
    // A localhost origin must remain rejected by the staging policy — the local harness is a
    // SEPARATE config, never a loophole in staging.
    const issues = validateBrowserE2eEnvironment({ RWOS_E2E_EMPLOYER_ORIGIN: "http://localhost:8080" });
    expect(issues.some((i) => /EMPLOYER_ORIGIN/i.test(i) && /https|remote|localhost/i.test(i))).toBe(true);
    // an empty env yields many required-input issues (policy is intact, not silently passing)
    expect(validateBrowserE2eEnvironment({}).length).toBeGreaterThan(10);
  });
});
