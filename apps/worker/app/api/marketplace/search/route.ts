import { getRuntimeConfig } from "@rwos/config";
import { sessionBoundary, isSameOriginMutation, sessionFailure } from "../../sessionBoundary";
import { PLACE_ERROR_CODES, whitelistSearchQuery } from "./searchQuery";

// Worker marketplace search BFF. The browser sends only the whitelisted search fields (place,
// radius, role, sort, dates, minimum open places, verified only, cursor). Everything authoritative —
// resolving the place, distance, ranking, area labels, approximate map points — happens server-side
// in the API. The browser NEVER supplies coordinates, distances, or the confirmed job set.
//
// An unknown place is answered with the API's own 400 + error code (never collapsed into a 500), so
// the page can say "We couldn't find that place".
const NO_STORE = { "cache-control": "private, no-store" };

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");

  const body = await request.json().catch(() => null);
  const query = whitelistSearchQuery(body);
  if (!query) {
    return Response.json(
      { status: "invalid", error: "RWOS_PLACE_REQUIRED", message: "Type a city or a postal code." },
      { status: 400, headers: NO_STORE }
    );
  }

  let apiResponse: Response;
  try {
    apiResponse = await fetch(`${getRuntimeConfig().internalApiOrigin}/marketplace/jobs/search`, {
      method: "POST",
      headers: { accept: "application/json", authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(query),
      cache: "no-store"
    });
  } catch {
    return sessionFailure("unavailable");
  }
  if (apiResponse.status === 401 || apiResponse.status === 403) return sessionFailure("denied");
  const payload = (await apiResponse.json().catch(() => null)) as { error?: unknown; message?: unknown } | null;
  if (apiResponse.ok && payload) return Response.json(payload, { headers: NO_STORE });
  if (payload && typeof payload.error === "string" && PLACE_ERROR_CODES.has(payload.error)) {
    return Response.json(
      { status: "invalid", error: payload.error, message: typeof payload.message === "string" ? payload.message : "" },
      { status: apiResponse.status === 503 ? 503 : 400, headers: NO_STORE }
    );
  }
  return sessionFailure(apiResponse.status >= 502 && apiResponse.status <= 504 ? "unavailable" : "error");
}
