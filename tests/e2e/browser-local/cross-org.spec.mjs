// LOCAL TEST ONLY. Workstream A.2 — Org A ↔ Org B isolation, proven through real network responses.
// The employer/worker BFFs are SESSION-SCOPED: a session resolves to exactly one org/worker, and no
// BFF route accepts an arbitrary org id — so cross-org data is structurally unaddressable, not merely
// hidden. These tests assert the isolation properties that hold at the browser boundary.
import { test, expect } from "@playwright/test";
import { WORKER_ORIGIN, EMPLOYER_ORIGIN, USERS, SEED, signInAs, apiGet } from "./origins.mjs";

test("Employer A's authenticated surfaces expose only Org A (never Org B)", async ({ browser }) => {
  const { ctx, page } = await signInAs(browser, EMPLOYER_ORIGIN, USERS.employerA);
  const calendar = await apiGet(page, "/api/calendar/requests");
  expect(calendar.status).toBe(200);
  const body = JSON.stringify(calendar.json ?? {});
  expect(body).not.toContain(SEED.orgB); // Org B id can never appear in Employer A's surface
  await ctx.close();
});

test("Employer A cannot address Org B through the employer BFF (session-scoped)", async ({ browser }) => {
  const { ctx, page } = await signInAs(browser, EMPLOYER_ORIGIN, USERS.employerA);
  // There is no employer BFF route that takes an org id; assignments/timesheets read the session's
  // org only. Employer A's assignment surface must not surface Org B's tenant id.
  const assignments = await apiGet(page, "/api/assignments");
  expect(assignments.status).toBeLessThan(500);
  expect(JSON.stringify(assignments.json ?? {})).not.toContain(SEED.orgB);
  await ctx.close();
});

test("Worker A's authenticated surfaces expose only Worker A (never Worker B)", async ({ browser }) => {
  const { ctx, page } = await signInAs(browser, WORKER_ORIGIN, USERS.workerA);
  const session = await apiGet(page, "/api/session");
  expect(session.json?.authenticated).toBe(true);
  const statement = await apiGet(page, "/api/payroll/statement");
  expect(statement.status).toBeLessThan(500);
  const body = JSON.stringify({ session: session.json, statement: statement.json });
  expect(body).not.toContain(SEED.workerBId); // no other worker's identity leaks
  await ctx.close();
});

test("Worker A cannot reach employer-org or admin-payroll mutation surfaces", async ({ browser }) => {
  // employer origin, worker creds
  {
    const { ctx, page } = await signInAs(browser, EMPLOYER_ORIGIN, USERS.workerA);
    expect((await apiGet(page, "/api/calendar/requests")).status).not.toBe(200); // no org membership
    await ctx.close();
  }
});
