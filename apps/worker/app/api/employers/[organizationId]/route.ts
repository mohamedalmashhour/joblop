import { sessionBoundary, sessionFailure } from "../../sessionBoundary";

// Employer public-profile proxy. Returns only the API's approved public fields.
export async function GET(_request: Request, context: { params: Promise<{ organizationId: string }> }) {
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const { organizationId } = await context.params;
  const result = await gateway.request(
    `/marketplace/employers/${encodeURIComponent(organizationId)}`,
    "GET",
    token
  );
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
