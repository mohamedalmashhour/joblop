// Admin order-overview BFF — proxies the platform order-overview (code ↔ client ↔ accepted
// worker ↔ lifecycle). Read-only; session-scoped; no money.
import { sessionBoundary, sessionFailure } from "../../../sessionBoundary";

export async function GET(
  _request: Request,
  context: Readonly<{ params: Promise<{ jobRequestId: string }> }>
) {
  const { jobRequestId } = await context.params;
  const { gateway, token } = await sessionBoundary();
  const result = await gateway.request(
    `/platform/job-requests/${encodeURIComponent(jobRequestId)}/order-overview`,
    "GET",
    token
  );
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
