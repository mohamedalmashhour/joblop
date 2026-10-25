import { getRuntimeConfig } from "@rwos/config";

// PUBLIC job-alert capture BFF — no sign-in. Forwards the landing magnet's email submission to the
// API's public /public/jobscanner/alerts so JobLop (not the external source) owns the lead.
export async function POST(request: Request) {
  const origin = getRuntimeConfig().internalApiOrigin;
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  try {
    const res = await fetch(`${origin}/public/jobscanner/alerts`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(body)
    });
    const payload = await res.json().catch(() => ({}));
    return Response.json(payload, { status: res.status });
  } catch {
    return Response.json({ error: "RWOS_ALERT_UNAVAILABLE", message: "Could not subscribe right now." }, { status: 502 });
  }
}
