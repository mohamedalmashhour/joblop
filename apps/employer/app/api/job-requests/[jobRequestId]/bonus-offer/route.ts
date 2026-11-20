import { sessionBoundary, sessionFailure } from "../../../sessionBoundary";

// Bonus offer BFF (employer). Returns the bonus Joblop staff offered for one of the employer's
// jobs, or { offer: null }. The API checks the job belongs to the signed-in employer. Read-only.
export async function GET(_request: Request, context: Readonly<{ params: Promise<{ jobRequestId: string }> }>) {
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const { jobRequestId } = await context.params;
  const result = await gateway.request(
    `/employer/job-requests/${encodeURIComponent(jobRequestId)}/bonus-offer`,
    "GET",
    token
  );
  if (result.status === "not_found") return Response.json({ offer: null }, { headers: privateHeaders });
  if (result.status !== "ok") return sessionFailure(result.status);
  const offer = (result.payload as { offer?: unknown } | null)?.offer ?? null;
  return Response.json({ offer }, { headers: privateHeaders });
}

const privateHeaders = { "cache-control": "private, no-store" };
