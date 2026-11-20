export function createReadinessResponse(env: NodeJS.ProcessEnv) {
  const ready = hasValidApiConfiguration(env);
  return Response.json(
    {
      ready,
      service: "resident-workforce-os-crm",
      check: "readiness"
    },
    {
      status: ready ? 200 : 503,
      headers: { "cache-control": "no-store" }
    }
  );
}

function hasValidApiConfiguration(env: NodeJS.ProcessEnv) {
  if (env.RWOS_ENV !== "production") return true;
  if (!env.INTERNAL_API_ORIGIN) return false;
  try {
    return new URL(env.INTERNAL_API_ORIGIN).protocol === "https:";
  } catch {
    return false;
  }
}
