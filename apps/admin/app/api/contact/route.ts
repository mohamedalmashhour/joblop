import { sessionBoundary, sessionFailure } from "../sessionBoundary";

// The Contact desk queue. Urgent conversations come first.
export async function GET(request: Request) {
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const { search } = new URL(request.url);
  const result = await gateway.request(`/platform/contact/conversations${search}`, "GET", token);
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
