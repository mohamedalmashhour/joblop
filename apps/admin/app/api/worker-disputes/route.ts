import { sessionBoundary, sessionFailure } from "../sessionBoundary";

// Staff queue of worker disputes. Session-gated here; the API enforces payroll or platform authority.
export async function GET(request: Request) {
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const search = new URL(request.url).search;
  const result = await gateway.request(`/platform/worker-disputes${search}`, "GET", token);
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
