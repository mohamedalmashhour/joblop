import { resetBrowserEnvironment } from "./reset-environment.mjs";

export default async function globalSetup() {
  await resetBrowserEnvironment("prepare");
}
