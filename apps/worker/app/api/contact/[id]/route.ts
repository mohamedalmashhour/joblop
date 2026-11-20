import { sessionBoundary, sessionFailure } from "../../sessionBoundary";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const { id } = await context.params;
  const result = await gateway.request(`/contact/worker/conversations/${encodeURIComponent(id)}`, "GET", token);
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
