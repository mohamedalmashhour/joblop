import { sessionBoundary, sessionFailure } from "../../sessionBoundary";

// Signed-in worker: turn a public job code into the job's id, so a visitor who opened a public job
// and then signed up is taken to the real job page where they can take it.
export async function GET(_request: Request, context: { params: Promise<{ jobCode: string }> }) {
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const { jobCode } = await context.params;
  if (!/^[A-Za-z0-9][A-Za-z0-9-]{2,63}$/.test(jobCode)) return sessionFailure("not_found");
  const result = await gateway.request(`/marketplace/job-codes/${encodeURIComponent(jobCode)}`, "GET", token);
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
