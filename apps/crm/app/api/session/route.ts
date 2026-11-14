import { sessionBoundary, sessionFailure } from "../sessionBoundary";

export async function GET() {
  const { gateway, token } = await sessionBoundary();
  const result = await gateway.validate(token);
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
