import { resetBrowserEnvironment } from "./reset-environment.mjs";

export default async function globalTeardown() {
  await resetBrowserEnvironment("cleanup");
}
