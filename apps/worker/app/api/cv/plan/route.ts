import { sessionBoundary, sessionFailure } from "../../sessionBoundary";

// Worker Pro plan status + pricing for the signed-in worker.
export async function GET() {
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const result = await gateway.request("/worker/cv/plan", "GET", token);
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
