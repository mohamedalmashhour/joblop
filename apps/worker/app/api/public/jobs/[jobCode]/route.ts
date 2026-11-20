import { getRuntimeConfig } from "@rwos/config";

// PUBLIC job details BFF — no sign-in. Forwards to the API's /public/jobs/:jobCode (city-level,
// worker pay only; never the address, the employer rate or Joblop's share). Unknown or closed jobs
// answer 404.
export async function GET(_request: Request, context: { params: Promise<{ jobCode: string }> }) {
  const { jobCode } = await context.params;
  if (!/^[A-Za-z0-9][A-Za-z0-9-]{2,63}$/.test(jobCode)) {
    return Response.json({ error: "RWOS_PUBLIC_JOB_NOT_FOUND" }, { status: 404 });
  }
  try {
    const res = await fetch(`${getRuntimeConfig().internalApiOrigin}/public/jobs/${encodeURIComponent(jobCode)}`, {
      method: "GET",
      headers: { accept: "application/json" },
      cache: "no-store"
    });
    if (res.status === 404) return Response.json({ error: "RWOS_PUBLIC_JOB_NOT_FOUND" }, { status: 404 });
    if (!res.ok) return Response.json({ error: "RWOS_UNAVAILABLE" }, { status: 503 });
    const payload = await res.json();
    return Response.json(payload, { headers: { "cache-control": "public, max-age=60" } });
  } catch {
    return Response.json({ error: "RWOS_UNAVAILABLE" }, { status: 503 });
  }
}
