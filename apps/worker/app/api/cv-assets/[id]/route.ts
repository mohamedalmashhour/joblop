import { sessionBoundary, isSameOriginMutation, sessionFailure } from "../../sessionBoundary";

// Delete one of the signed-in worker's own CV attachments.
export async function DELETE(request: Request, context: Readonly<{ params: Promise<{ id: string }> }>) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { id } = await context.params;
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const result = await gateway.request(`/worker/cv-assets/${encodeURIComponent(id)}`, "DELETE", token);
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
