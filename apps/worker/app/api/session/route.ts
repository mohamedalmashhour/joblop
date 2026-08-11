import { sessionBoundary, sessionFailure } from "../sessionBoundary";

// Who am I? Returns the validated worker session payload, or a 401 if signed out.
export async function GET() {
  const { gateway, token } = await sessionBoundary();
  const result = await gateway.validate(token);
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
