import { sessionBoundary, isSameOriginMutation, sessionFailure } from "../../sessionBoundary";

// Worker marketplace search BFF. The browser sends only a postal code + optional radius +
// optional role. Everything authoritative — geocoding, distance, ranking, area labels,
// approximate map points — happens server-side in the API. The browser NEVER supplies
// coordinates, distances, or the confirmed job set. This route just forwards a whitelisted
// query and returns the API's privacy-safe results verbatim.
export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");

  const body = await request.json().catch(() => null);
  const query = whitelistQuery(body);
  if (!query) {
    return Response.json(
      { status: "invalid", message: "A valid Canadian postal code is required." },
      { status: 400, headers: { "cache-control": "private, no-store" } }
    );
  }

  const result = await gateway.request("/marketplace/jobs/search", "POST", token, query);
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}

// Drop anything the browser must not influence. Only these three fields are forwarded.
function whitelistQuery(input: unknown): { postalCode: string; radiusKm?: number; role?: string } | null {
  if (typeof input !== "object" || input === null) return null;
  const record = input as Record<string, unknown>;
  const postalCode = typeof record.postalCode === "string" ? record.postalCode.trim() : "";
  if (!postalCode) return null;
  const radiusRaw = record.radiusKm;
  const radiusKm =
    typeof radiusRaw === "number" && Number.isFinite(radiusRaw) && radiusRaw > 0 ? radiusRaw : undefined;
  const role = typeof record.role === "string" && record.role.trim().length > 0 ? record.role.trim() : undefined;
  return {
    postalCode,
    ...(radiusKm !== undefined ? { radiusKm } : {}),
    ...(role !== undefined ? { role } : {})
  };
}
