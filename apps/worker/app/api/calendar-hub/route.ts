import { sessionBoundary, sessionFailure } from "../sessionBoundary";

// Worker calendar hub BFF. Forwards only the `from` / `to` date window to the API with the
// worker's session. The API decides what the worker sees (open jobs, own shifts, cancelled
// shifts, pay days and the "Today" list); the browser never influences anything else.
export async function GET(request: Request) {
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");

  const incoming = new URL(request.url).searchParams;
  const forwarded = new URLSearchParams();
  for (const key of ["from", "to"] as const) {
    const value = incoming.get(key);
    if (value && value.length <= 64) forwarded.set(key, value);
  }
  const query = forwarded.toString();

  const result = await gateway.request(`/worker/calendar-hub${query ? `?${query}` : ""}`, "GET", token);
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
