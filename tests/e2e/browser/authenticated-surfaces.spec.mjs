import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import process from "node:process";

async function signIn(page, origin, email, password) {
  await page.goto(origin);
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in securely/i }).click();
}

test("employer authenticated calendar is accessible", async ({ page }) => {
  await signIn(
    page,
    `${process.env.RWOS_E2E_EMPLOYER_ORIGIN}/employer/calendar`,
    process.env.RWOS_E2E_EMPLOYER_EMAIL,
    process.env.RWOS_E2E_EMPLOYER_PASSWORD
  );
  await expect(
    page.getByText(/persisted request calendar|staffing request/i).first()
  ).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("administrator authenticated calendar is accessible", async ({ page }) => {
  await signIn(
    page,
    `${process.env.RWOS_E2E_ADMIN_ORIGIN}/calendar`,
    process.env.RWOS_E2E_ADMIN_EMAIL,
    process.env.RWOS_E2E_ADMIN_PASSWORD
  );
  await expect(page.getByText(/administrator|review/i).first()).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("worker production entry authenticates without fixture content", async ({ page }) => {
  await signIn(
    page,
    process.env.RWOS_E2E_WORKER_ORIGIN,
    process.env.RWOS_E2E_WORKER_EMAIL,
    process.env.RWOS_E2E_WORKER_PASSWORD
  );
  await expect(page.getByText(/worker offers|worker calendar/i).first()).toBeVisible();
  await expect(page.getByText(/fixture|synthetic worker/i)).toHaveCount(0);
});

test("revoked account receives a generic denial", async ({ page }) => {
  await signIn(
    page,
    `${process.env.RWOS_E2E_EMPLOYER_ORIGIN}/employer/calendar`,
    process.env.RWOS_E2E_REVOKED_EMAIL,
    process.env.RWOS_E2E_REVOKED_PASSWORD
  );
  await expect(page.getByText(/unable|unavailable|not authorized|sign in/i).first()).toBeVisible();
  await expect(page.getByText(/revoked|membership expired|account exists/i)).toHaveCount(0);
});
