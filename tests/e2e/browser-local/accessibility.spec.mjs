// LOCAL TEST ONLY. Workstream A.2 — accessibility (axe) on the critical pages this gate exercises.
// This feeds Workstream C; we assert no CRITICAL violations locally and report the rest, without a
// broad UI redesign.
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { WORKER_ORIGIN, EMPLOYER_ORIGIN, ADMIN_ORIGIN, USERS, signInAs } from "./origins.mjs";

async function criticalViolations(page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  return results.violations.filter((v) => v.impact === "critical");
}

test("worker landing page has no critical accessibility violations", async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(WORKER_ORIGIN + "/", { waitUntil: "domcontentloaded" });
  expect(await criticalViolations(page)).toEqual([]);
  await ctx.close();
});

test("employer calendar has no critical accessibility violations", async ({ browser }) => {
  const { ctx, page } = await signInAs(browser, EMPLOYER_ORIGIN, USERS.employerA);
  await page.goto(EMPLOYER_ORIGIN + "/employer/calendar", { waitUntil: "domcontentloaded" });
  expect(await criticalViolations(page)).toEqual([]);
  await ctx.close();
});

test("admin payroll console has no critical accessibility violations", async ({ browser }) => {
  const { ctx, page } = await signInAs(browser, ADMIN_ORIGIN, USERS.payrollAdmin);
  await page.goto(ADMIN_ORIGIN + "/payroll", { waitUntil: "domcontentloaded" });
  expect(await criticalViolations(page)).toEqual([]);
  await ctx.close();
});
