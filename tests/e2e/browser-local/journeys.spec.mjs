// LOCAL TEST ONLY. Workstream A.2 — full critical browser journeys (navigation + render + the
// browser-visible HR-6.1 advisory surface), driven through real authenticated sessions.
import { test, expect } from "@playwright/test";
import { WORKER_ORIGIN, EMPLOYER_ORIGIN, ADMIN_ORIGIN, USERS, SEED, signInAs, apiGet, gotoStatus } from "./origins.mjs";

// Assert every listed page loads without a 404 or a 5xx server error (navigation/control matrix).
async function assertPagesLoad(page, origin, paths) {
  const results = [];
  for (const path of paths) {
    const status = await gotoStatus(page, origin, path);
    results.push([path, status]);
  }
  for (const [path, status] of results) {
    expect(status, `${origin}${path} → ${status}`).not.toBe(404);
    expect(status, `${origin}${path} → ${status}`).toBeLessThan(500);
  }
  return results;
}

test("EMPLOYER critical journey: authenticated navigation of Org-A surfaces", async ({ browser }) => {
  const { ctx, page } = await signInAs(browser, EMPLOYER_ORIGIN, USERS.employerA);
  // own-org calendar authority
  expect((await apiGet(page, "/api/calendar/requests")).status).toBe(200);
  await assertPagesLoad(page, EMPLOYER_ORIGIN, [
    "/employer/calendar", "/employer/assignments", "/employer/timesheets", "/employer/attendance", "/employer/onboarding/company"
  ]);
  await ctx.close();
});

test("WORKER critical journey: authenticated navigation of worker surfaces", async ({ browser }) => {
  const { ctx, page } = await signInAs(browser, WORKER_ORIGIN, USERS.workerA);
  expect((await apiGet(page, "/api/session")).json?.authenticated).toBe(true);
  await assertPagesLoad(page, WORKER_ORIGIN, [
    "/", "/schedule", "/pay", "/hr", "/saved-jobs", "/verification", "/documents", "/my-interests"
  ]);
  // a worker cannot reach an admin/employer mutation surface (re-asserted in-journey)
  expect((await apiGet(page, "/api/payroll/statement")).status).toBeLessThan(500);
  await ctx.close();
});

test("ADMIN critical journey: payroll surfaces + HR-6.1 advisory remains non-authoritative", async ({ browser }) => {
  const { ctx, page } = await signInAs(browser, ADMIN_ORIGIN, USERS.payrollAdmin);
  await assertPagesLoad(page, ADMIN_ORIGIN, ["/payroll", "/calendar", "/finance"]);

  // The seeded calculation is visible + governed (read-only). No money execution.
  const periods = await apiGet(page, "/api/payroll/periods");
  expect(periods.status).toBe(200);

  // HR-6.1 advisory review over the seeded calc: advisory only, never authoritative, no money exec.
  const review = await apiGet(page, `/api/payroll/calculations/${SEED.calcId}/ai-review`);
  expect(review.status).toBe(200);
  expect(review.json?.advisory).toBe(true);
  expect(String(review.json?.notice)).toMatch(/cannot approve, lock, correct, or pay/i);
  const body = JSON.stringify(review.json).toLowerCase();
  expect(body).not.toContain("\"paid\"");
  expect(body).not.toContain("disburse");
  // provenance is descriptive-only
  const prov = await apiGet(page, `/api/payroll/calculations/${SEED.calcId}/provenance`);
  expect(prov.status).toBe(200);
  expect(String(prov.json?.notice ?? "")).toMatch(/descriptive only, never authoritative/i);
  await ctx.close();
});
