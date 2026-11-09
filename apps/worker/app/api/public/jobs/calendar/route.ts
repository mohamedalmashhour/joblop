import { getRuntimeConfig } from "@rwos/config";

// PUBLIC jobs calendar BFF — no sign-in. Forwards ?from=&to= to the API's /public/jobs/calendar
// (open Joblop jobs: role, city and province, time, places left and the worker's own pay; never the
// address, the employer or any other rate). The session gateway requires a token, so this calls the
// internal API directly. Only the two date parameters are passed on.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const search = new URLSearchParams();
  for (const key of ["from", "to"]) {
    const value = url.searchParams.get(key);
    if (value && value.length <= 40) search.set(key, value);
  }
  try {
    const res = await fetch(`${getRuntimeConfig().internalApiOrigin}/public/jobs/calendar?${search.toString()}`, {
      method: "GET",
      headers: { accept: "application/json" }
    });
    if (!res.ok) return Response.json({ jobs: [], error: "unavailable" }, { status: 200 });
    const payload = await res.json();
    return Response.json(payload, { headers: { "cache-control": "public, max-age=60" } });
  } catch {
    return Response.json({ jobs: [], error: "unavailable" }, { status: 200 });
  }
}
