import { sessionBoundary, sessionFailure } from "../../sessionBoundary";

// Job detail proxy. Forwards the optional search place (a city or a postal code, for the
// server-computed distance) but nothing authoritative — the API resolves everything.
// Privacy-safe payload passes through.
export async function GET(request: Request, context: { params: Promise<{ jobRequestId: string }> }) {
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const { jobRequestId } = await context.params;
  const params = new URL(request.url).searchParams;
  const place = (params.get("place") ?? params.get("postalCode") ?? "").trim().slice(0, 80);
  const path = `/marketplace/jobs/${encodeURIComponent(jobRequestId)}${place ? `?place=${encodeURIComponent(place)}` : ""}`;
  const result = await gateway.request(path, "GET", token);
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
