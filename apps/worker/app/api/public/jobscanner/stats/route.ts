import { getRuntimeConfig } from "@rwos/config";

// PUBLIC JobScanner stats BFF — no sign-in. Forwards to the API's public /public/jobscanner/stats
// (pure COUNT queries, zero live scan) so the landing magnet can show the TRUE total of jobs waiting
// ("X jobs — open a free account"). External leads are a hand-off to the source, not Joblop jobs.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = getRuntimeConfig().internalApiOrigin;
  try {
    const res = await fetch(`${origin}/public/jobscanner/stats${url.search}`, {
      method: "GET",
      headers: { accept: "application/json" }
    });
    if (!res.ok) return Response.json({ total: 0, externalLeadCount: 0, openJobCount: 0, provinceCount: 0 }, { status: 200 });
    const payload = await res.json();
    return Response.json(payload, { headers: { "cache-control": "public, max-age=120" } });
  } catch {
    return Response.json({ total: 0, externalLeadCount: 0, openJobCount: 0, provinceCount: 0 }, { status: 200 });
  }
}
