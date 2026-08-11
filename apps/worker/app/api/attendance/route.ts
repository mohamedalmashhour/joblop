import { sessionBoundary, sessionFailure } from "../sessionBoundary";

// The worker's own schedule + attendance (own records only, server-authoritative).
export async function GET(request: Request) {
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const search = new URL(request.url).search;
  const result = await gateway.request(`/worker/attendance${search}`, "GET", token);
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
