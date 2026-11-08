import { sessionBoundary, sessionFailure } from "../sessionBoundary";

// Calendar hub BFF (employer). Forwards the visible window (from/to ISO dates) to the API with the
// employer session. The API returns only the signed-in employer's own organization. Read-only.
export async function GET(request: Request) {
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const params = new URL(request.url).searchParams;
  const query = new URLSearchParams();
  for (const key of ["from", "to"] as const) {
    const value = params.get(key);
    if (value && !Number.isNaN(Date.parse(value))) query.set(key, value);
  }
  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  const result = await gateway.request(`/employer/calendar-hub${suffix}`, "GET", token);
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: privateHeaders });
}

const privateHeaders = { "cache-control": "private, no-store" };
