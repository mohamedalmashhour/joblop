import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import process from "node:process";
import { URL } from "node:url";

async function signIn(
  page,
  signInOrigin,
  email,
  password,
  {
    destination = signInOrigin,
    destinationApiPath,
    expectedStatus = 200,
    signInApiPath = "/api/session/sign-in"
  } = {}
) {
  await page.goto(signInOrigin);
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/^password$/i).fill(password);
  const signInResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname === signInApiPath
  );
  await page.getByRole("button", { name: /^sign in(?: securely)?$/i }).click();
  expect((await signInResponse).status()).toBe(expectedStatus);
  if (destination !== signInOrigin) {
    const destinationResponse = destinationApiPath
      ? page.waitForResponse(
          (response) =>
            response.request().method() === "GET" &&
            new URL(response.url()).pathname === destinationApiPath
        )
      : null;
    await page.goto(destination);
    if (destinationResponse) expect((await destinationResponse).status()).toBe(200);
  }
}

test("employer authenticated calendar is accessible", async ({ page }) => {
  await signIn(
    page,
    `${process.env.RWOS_E2E_EMPLOYER_ORIGIN}/signin`,
    process.env.RWOS_E2E_EMPLOYER_EMAIL,
    process.env.RWOS_E2E_EMPLOYER_PASSWORD,
    {
      destination: `${process.env.RWOS_E2E_EMPLOYER_ORIGIN}/employer/calendar`,
      destinationApiPath: "/api/calendar/requests"
    }
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
    `${process.env.RWOS_E2E_ADMIN_ORIGIN}/signin`,
    process.env.RWOS_E2E_ADMIN_EMAIL,
    process.env.RWOS_E2E_ADMIN_PASSWORD,
    {
      destination: `${process.env.RWOS_E2E_ADMIN_ORIGIN}/calendar`,
      destinationApiPath: "/api/calendar/requests"
    }
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
    process.env.RWOS_E2E_WORKER_PASSWORD,
    // The worker BFF sign-in route is /api/session/sign-in (there is no /auth/sign-in in the worker
    // app). Watch the ACTUAL request so the assertion fails if the real endpoint changes.
    { signInApiPath: "/api/session/sign-in" }
  );
  await expect(page.getByText(/worker offers|worker calendar/i).first()).toBeVisible();
  await expect(page.getByText(/fixture|synthetic worker/i)).toHaveCount(0);
});

test("revoked account receives a generic denial", async ({ page }) => {
  await signIn(
    page,
    `${process.env.RWOS_E2E_EMPLOYER_ORIGIN}/signin`,
    process.env.RWOS_E2E_REVOKED_EMAIL,
    process.env.RWOS_E2E_REVOKED_PASSWORD,
    { expectedStatus: 401 }
  );
  await expect(page.getByText(/unable|unavailable|not authorized|sign in/i).first()).toBeVisible();
  await expect(page.getByText(/revoked|membership expired|account exists/i)).toHaveCount(0);
});
