import { describe, expect, it } from "vitest";
import {
  JOB_FLOW_ROUTE_PREFIXES,
  JOB_FLOW_ROUTES,
  JOB_FLOW_ROUTES_KEPT_BLOCKED,
  isProductionBlockedOperation,
  resolveProductionFeatureFlags
} from "./productionRoutePolicy";

// Verbatim copy of the matcher production used before the flags existed (app.ts
// isProductionDisabledOperation). With the flags OFF the new policy must agree with it exactly.
function legacyIsProductionDisabledOperation(method: string, url: string) {
  const path = url.split("?")[0] ?? url;
  if (method === "GET" && /\/platform\/dispatches\/[^/]+\/candidates\/search$/.test(path)) {
    return true;
  }
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) return false;
  return (
    path.startsWith("/platform/dispatches") ||
    path.startsWith("/platform/worker-offers") ||
    path.startsWith("/worker/offers") ||
    path.startsWith("/platform/assignments") ||
    path.startsWith("/worker/assignments") ||
    path.startsWith("/platform/attendance") ||
    path.startsWith("/worker/attendance") ||
    path.startsWith("/platform/timesheets") ||
    path.startsWith("/worker/timesheets")
  );
}

const OFF = { jobFlowEnabled: false, publicSignupEnabled: false } as const;
const ON = { jobFlowEnabled: true, publicSignupEnabled: true } as const;
const METHODS = ["GET", "HEAD", "OPTIONS", "POST", "PUT", "PATCH", "DELETE"];

function sampleUrl(template: string) {
  return template.replace(/:[A-Za-z]+/g, "00000000-0000-4000-8000-000000000001");
}

const templates = [
  ...JOB_FLOW_ROUTES.map((entry) => entry.split(" ")[1]!),
  ...Object.keys(JOB_FLOW_ROUTES_KEPT_BLOCKED).map((entry) => entry.split(" ")[1]!),
  "/platform/dispatches/:dispatchReviewId",
  "/platform/dispatches/:dispatchReviewId/audit",
  "/worker/offers",
  "/worker/attendance",
  "/worker/timesheets/:timesheetId",
  "/marketplace/jobs/:jobId/claim",
  "/organizations/:organizationId/timesheets/:timesheetId/confirm",
  "/auth/register",
  "/platform/finance/status"
];

describe("production feature flags", () => {
  it("are OFF by default when the country profile has no defaults (historical production)", () => {
    expect(resolveProductionFeatureFlags({ jobFlow: null, publicSignup: null }, undefined)).toEqual(OFF);
  });

  it("follow the country default when unset (Canada/Québec: ON)", () => {
    expect(
      resolveProductionFeatureFlags({ jobFlow: null, publicSignup: undefined }, { jobFlow: true, publicSignup: true })
    ).toEqual(ON);
  });

  it("an explicit env value always wins over the country default", () => {
    expect(
      resolveProductionFeatureFlags(
        { jobFlow: "disabled", publicSignup: "disabled" },
        { jobFlow: true, publicSignup: true }
      )
    ).toEqual(OFF);
    expect(resolveProductionFeatureFlags({ jobFlow: "enabled", publicSignup: "enabled" }, undefined)).toEqual(ON);
  });
});

describe("production route policy", () => {
  it("with the job flow OFF, blocks exactly what the old blanket rule blocked (job-flow groups)", () => {
    for (const template of templates) {
      const url = sampleUrl(template);
      for (const method of METHODS) {
        for (const suffix of ["", "?x=1", "/", "/extra"]) {
          expect(
            isProductionBlockedOperation(method, `${url}${suffix}`, template, OFF),
            `${method} ${url}${suffix}`
          ).toBe(legacyIsProductionDisabledOperation(method, `${url}${suffix}`));
        }
      }
    }
  });

  it("with the job flow ON, opens every allowlisted route", () => {
    for (const entry of JOB_FLOW_ROUTES) {
      const [method, template] = entry.split(" ") as [string, string];
      expect(isProductionBlockedOperation(method, sampleUrl(template), template, ON), entry).toBe(false);
      expect(isProductionBlockedOperation(method, `${sampleUrl(template)}?q=1`, template, ON), entry).toBe(false);
    }
  });

  it("allowlists only routes under the historically blocked groups", () => {
    for (const entry of JOB_FLOW_ROUTES) {
      const [method, template] = entry.split(" ") as [string, string];
      expect(legacyIsProductionDisabledOperation(method, sampleUrl(template)), entry).toBe(true);
      expect(JOB_FLOW_ROUTE_PREFIXES.some((prefix) => template.startsWith(prefix))).toBe(true);
    }
  });

  it("keeps the reviewed routes blocked even with the job flow ON", () => {
    for (const entry of Object.keys(JOB_FLOW_ROUTES_KEPT_BLOCKED)) {
      const [method, template] = entry.split(" ") as [string, string];
      expect(JOB_FLOW_ROUTES).not.toContain(entry);
      expect(isProductionBlockedOperation(method, sampleUrl(template), template, ON), entry).toBe(true);
    }
  });

  it("blocks an unreviewed or unmatched route under a job-flow group even with the flag ON", () => {
    expect(
      isProductionBlockedOperation("POST", "/platform/timesheets/t-1/unknown", undefined, ON)
    ).toBe(true);
    expect(
      isProductionBlockedOperation("DELETE", "/worker/offers/o-1", "/worker/offers/:workerOfferId", ON)
    ).toBe(true);
  });

  it("always blocks the test-only payment and payout routes in production", () => {
    for (const flags of [OFF, ON]) {
      expect(isProductionBlockedOperation("POST", "/platform/worker-payouts/p-1/execute-test-payout", "/platform/worker-payouts/:payoutId/execute-test-payout", flags)).toBe(true);
      expect(isProductionBlockedOperation("POST", "/organizations/o-1/payment-methods/local-fake", undefined, flags)).toBe(true);
      expect(isProductionBlockedOperation("POST", "/payments/webhooks/local-fake", undefined, flags)).toBe(true);
    }
  });

  it("never touches reads or routes outside the job-flow groups", () => {
    for (const flags of [OFF, ON]) {
      expect(isProductionBlockedOperation("GET", "/worker/offers", "/worker/offers", flags)).toBe(false);
      expect(isProductionBlockedOperation("POST", "/marketplace/jobs/j-1/claim", "/marketplace/jobs/:jobId/claim", flags)).toBe(false);
      expect(isProductionBlockedOperation("POST", "/auth/sign-in", "/auth/sign-in", flags)).toBe(false);
    }
  });
});
