// LOCAL TEST ONLY. Synthetic identities + local origins shared by the local browser specs.
const port = (name, dflt) => process.env[name] ?? String(dflt);
export const WORKER_ORIGIN = `http://127.0.0.1:${port("RWOS_LOCAL_E2E_WORKER_PORT", 8090)}`;
export const EMPLOYER_ORIGIN = `http://127.0.0.1:${port("RWOS_LOCAL_E2E_EMPLOYER_PORT", 8081)}`;
export const ADMIN_ORIGIN = `http://127.0.0.1:${port("RWOS_LOCAL_E2E_ADMIN_PORT", 8082)}`;

// Must match tests/e2e/local/seed.ts (synthetic only).
export const PASSWORD = "Local-E2E-Synthetic-Pass1";
export const USERS = {
  platformAdmin: "platform-admin@local-e2e.invalid",
  payrollAdmin: "payroll-admin@local-e2e.invalid",
  employerA: "employer-a@local-e2e.invalid",
  employerB: "employer-b@local-e2e.invalid",
  workerA: "worker-a@local-e2e.invalid",
  workerB: "worker-b@local-e2e.invalid",
  revoked: "revoked@local-e2e.invalid"
};

// Same-origin POST/GET issued from within the app page — sends Origin/sec-fetch-site:same-origin so
// the BFF's isSameOriginMutation guard passes. This is the exact request the app's own form makes.
export async function apiPost(page, path, body) {
  return page.evaluate(async ({ path, body }) => {
    const r = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    let json = null; try { json = await r.json(); } catch { /* no body */ }
    return { status: r.status, json };
  }, { path, body });
}
export async function apiGet(page, path) {
  return page.evaluate(async ({ path }) => {
    const r = await fetch(path, { method: "GET" });
    let json = null; try { json = await r.json(); } catch { /* no body */ }
    return { status: r.status, json };
  }, { path });
}
