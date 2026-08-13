// LOCAL TEST ONLY — NOT ACCEPTABLE AS PRODUCTION/STAGING CERTIFICATION.
// Workstream A.1 first proofs: worker/employer/admin browser authentication + cross-role denial,
// driven through the REAL sign-in flow against locally-launched apps + a disposable Postgres.
import { test, expect } from "@playwright/test";
import { WORKER_ORIGIN, EMPLOYER_ORIGIN, ADMIN_ORIGIN, USERS, PASSWORD, apiPost, apiGet } from "./origins.mjs";

const WORKER_PROTECTED = "/api/session"; // returns { authenticated }
const EMPLOYER_PROTECTED = "/api/calendar/requests"; // 200 when authorized, denied otherwise
const ADMIN_PAYROLL_PROTECTED = "/api/payroll/periods"; // 200 only with payroll authority

async function fresh(browser, origin) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(origin + "/", { waitUntil: "domcontentloaded" });
  return { ctx, page };
}

// ── A. Worker authentication: anon denied → sign in → protected → sign out ──
test("worker browser authentication lifecycle", async ({ browser }) => {
  const { ctx, page } = await fresh(browser, WORKER_ORIGIN);
  const anon = await apiGet(page, WORKER_PROTECTED);
  expect(anon.json?.authenticated ?? false).toBe(false); // anonymous cannot access protected state

  const signIn = await apiPost(page, "/api/session/sign-in", { email: USERS.workerA, password: PASSWORD });
  expect(signIn.status).toBe(200); // real session established

  const authed = await apiGet(page, WORKER_PROTECTED);
  expect(authed.json?.authenticated).toBe(true);

  // Protected page reachable while authenticated (best-effort: some clients redirect to "/" — the
  // authoritative proof is the /api/session toggle above/below; WebKit can race the goto).
  await page.goto(WORKER_ORIGIN + "/schedule", { waitUntil: "commit" }).catch(() => {});
  expect(page.url()).toContain(WORKER_ORIGIN);

  const signOut = await apiPost(page, "/api/session/sign-out", {});
  expect([200, 204]).toContain(signOut.status);
  const after = await apiGet(page, WORKER_PROTECTED);
  expect(after.json?.authenticated ?? false).toBe(false); // sign-out removes access
  await ctx.close();
});

// ── B. Employer authentication ──
test("employer browser authentication lifecycle", async ({ browser }) => {
  const { ctx, page } = await fresh(browser, EMPLOYER_ORIGIN);
  const anon = await apiGet(page, EMPLOYER_PROTECTED);
  expect(anon.status).not.toBe(200); // anonymous denied

  const signIn = await apiPost(page, "/api/session/sign-in", { email: USERS.employerA, password: PASSWORD });
  expect(signIn.status).toBe(200);

  const authed = await apiGet(page, EMPLOYER_PROTECTED);
  expect(authed.status).toBe(200); // employer-org authority reaches its own calendar

  const signOut = await apiPost(page, "/api/session/sign-out", {});
  expect([200, 204]).toContain(signOut.status);
  expect((await apiGet(page, EMPLOYER_PROTECTED)).status).not.toBe(200);
  await ctx.close();
});

// ── C. Admin (payroll) authentication + worker/employer cannot reach admin payroll by URL ──
test("admin browser authentication lifecycle", async ({ browser }) => {
  const { ctx, page } = await fresh(browser, ADMIN_ORIGIN);
  expect((await apiGet(page, ADMIN_PAYROLL_PROTECTED)).status).not.toBe(200); // anon denied

  const signIn = await apiPost(page, "/api/session/sign-in", { email: USERS.payrollAdmin, password: PASSWORD });
  expect(signIn.status).toBe(200);
  expect((await apiGet(page, ADMIN_PAYROLL_PROTECTED)).status).toBe(200); // payroll authority granted

  const signOut = await apiPost(page, "/api/session/sign-out", {});
  expect([200, 204]).toContain(signOut.status);
  expect((await apiGet(page, ADMIN_PAYROLL_PROTECTED)).status).not.toBe(200);
  await ctx.close();
});

// ── Cross-role browser denial smoke (section 9) ──
test("a signed-in worker cannot reach the admin payroll surface by URL", async ({ browser }) => {
  const { ctx, page } = await fresh(browser, ADMIN_ORIGIN);
  expect((await apiPost(page, "/api/session/sign-in", { email: USERS.workerA, password: PASSWORD })).status).toBe(200);
  const denied = await apiGet(page, ADMIN_PAYROLL_PROTECTED);
  expect([401, 403]).toContain(denied.status); // authenticated but not authorized → generic denial
  await ctx.close();
});

test("a signed-in employer cannot reach the admin payroll surface by URL", async ({ browser }) => {
  const { ctx, page } = await fresh(browser, ADMIN_ORIGIN);
  expect((await apiPost(page, "/api/session/sign-in", { email: USERS.employerA, password: PASSWORD })).status).toBe(200);
  expect([401, 403]).toContain((await apiGet(page, ADMIN_PAYROLL_PROTECTED)).status);
  await ctx.close();
});

test("a signed-in worker cannot reach an employer-org mutation surface", async ({ browser }) => {
  const { ctx, page } = await fresh(browser, EMPLOYER_ORIGIN);
  expect((await apiPost(page, "/api/session/sign-in", { email: USERS.workerA, password: PASSWORD })).status).toBe(200);
  expect((await apiGet(page, EMPLOYER_PROTECTED)).status).not.toBe(200); // no org membership
  await ctx.close();
});

test("a revoked/disabled account receives a generic denial", async ({ browser }) => {
  const { ctx, page } = await fresh(browser, WORKER_ORIGIN);
  const res = await apiPost(page, "/api/session/sign-in", { email: USERS.revoked, password: PASSWORD });
  expect([401, 403]).toContain(res.status);
  expect((await apiGet(page, WORKER_PROTECTED)).json?.authenticated ?? false).toBe(false);
  await ctx.close();
});
