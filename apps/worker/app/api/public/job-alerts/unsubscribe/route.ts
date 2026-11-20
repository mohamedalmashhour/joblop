import { getRuntimeConfig } from "@rwos/config";

// PUBLIC one-click unsubscribe from job alert emails (no sign-in). Forwards only the opaque token.
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token")?.trim() ?? "";
  const headers = { "cache-control": "no-store" };
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(token)) {
    return Response.json({ ok: false, error: "invalid_token" }, { status: 400, headers });
  }
  try {
    const res = await fetch(
      `${getRuntimeConfig().internalApiOrigin}/public/job-alerts/unsubscribe?token=${encodeURIComponent(token)}`,
      { method: "GET", headers: { accept: "application/json" }, cache: "no-store" }
    );
    const payload = await res.json().catch(() => ({}));
    return Response.json(payload, { status: res.status, headers });
  } catch {
    return Response.json({ ok: false, error: "unavailable" }, { status: 502, headers });
  }
}
