// Transaction Control Room — read-only lifecycle + settlement aggregation for ONE job request.
// Additive, read-only. Delegates all money/parse logic to lib/controlRoomLedger so the
// settlement math has a single home (shared with the share-link mint endpoint).
import { sessionBoundary, sessionFailure } from "../../sessionBoundary";
import { assembleTransaction } from "../../../../lib/controlRoomLedger";

export async function GET(
  _request: Request,
  context: Readonly<{ params: Promise<{ jobRequestId: string }> }>
) {
  const { jobRequestId } = await context.params;
  const { gateway, token } = await sessionBoundary();
  const result = await gateway.request(
    `/platform/calendar/requests/${encodeURIComponent(jobRequestId)}`,
    "GET",
    token
  );
  if (result.status !== "ok") return sessionFailure(result.status);

  try {
    const { job, stages, ledger, checks } = assembleTransaction(result.payload, jobRequestId);
    return Response.json(
      { job, stages, ledger, checks },
      { headers: { "cache-control": "private, no-store" } }
    );
  } catch {
    return sessionFailure("error");
  }
}
