import { getRuntimeConfig } from "@rwos/config";

// PUBLIC job board BFF — no sign-in required. Forwards to the API's public /public/jobs (area-level,
// privacy-safe) so anyone can browse JobLop's open offers across Canada and filter by location. The
// session gateway requires a token, so this calls the internal API directly (no auth needed).
export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = getRuntimeConfig().internalApiOrigin;
  try {
    const res = await fetch(`${origin}/public/jobs${url.search}`, {
      method: "GET",
      headers: { accept: "application/json" }
    });
    if (!res.ok) return Response.json({ jobs: [], nextCursor: null }, { status: 200 });
    const payload = await res.json();
    return Response.json(payload, { headers: { "cache-control": "public, max-age=60" } });
  } catch {
    return Response.json({ jobs: [], nextCursor: null }, { status: 200 });
  }
}
