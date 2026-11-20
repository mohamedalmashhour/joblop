import { getRuntimeConfig } from "@rwos/config";

// PUBLIC JobScanner teaser BFF — no sign-in. Forwards to the API's public /public/jobscanner/leads
// (cached, read-only external leads from prior scans) so the landing "magnet" can show real market
// leads to anyone. External leads only — a hand-off to the source, never Joblop governed jobs.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = getRuntimeConfig().internalApiOrigin;
  try {
    const res = await fetch(`${origin}/public/jobscanner/leads${url.search}`, {
      method: "GET",
      headers: { accept: "application/json" }
    });
    if (!res.ok) return Response.json({ leads: [], total: 0 }, { status: 200 });
    const payload = await res.json();
    return Response.json(payload, { headers: { "cache-control": "public, max-age=120" } });
  } catch {
    return Response.json({ leads: [], total: 0 }, { status: 200 });
  }
}
