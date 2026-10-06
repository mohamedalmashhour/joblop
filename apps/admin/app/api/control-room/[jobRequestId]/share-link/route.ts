// Mint a signed, party-scoped share link for ONE transaction. Admin-only:
// it runs behind the admin session (sessionBoundary) and refuses cross-site
// callers. The link embeds an already-masked snapshot (employer or worker)
// signed with CONTROL_ROOM_SHARE_SECRET; if that secret is unset, minting
// refuses (503) and sharing stays disabled.
import { sessionBoundary, sessionFailure, isSameOriginMutation } from "../../../sessionBoundary";
import { assembleTransaction, buildSnapshot, type ShareView } from "../../../../../lib/controlRoomLedger";
import { signShare, isShareConfigured } from "../../../../../lib/shareToken";

export async function POST(
  request: Request,
  context: Readonly<{ params: Promise<{ jobRequestId: string }> }>
) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");

  const { jobRequestId } = await context.params;

  let view: ShareView = "employer";
  let ttlHours = 72;
  try {
    const body = await request.json();
    if (body?.view === "worker" || body?.view === "employer") view = body.view;
    if (Number.isFinite(Number(body?.ttlHours))) ttlHours = Number(body.ttlHours);
  } catch {
    // empty/invalid body — fall back to defaults above
  }

  if (!isShareConfigured()) {
    return Response.json(
      { status: "unavailable", message: "Sharing is not configured (CONTROL_ROOM_SHARE_SECRET unset)." },
      { status: 503, headers: { "cache-control": "private, no-store" } }
    );
  }

  const { gateway, token } = await sessionBoundary();
  const result = await gateway.request(
    `/platform/calendar/requests/${encodeURIComponent(jobRequestId)}`,
    "GET",
    token
  );
  if (result.status !== "ok") return sessionFailure(result.status);

  try {
    const { job, ledger } = assembleTransaction(result.payload, jobRequestId);
    if (!ledger) {
      return Response.json(
        { status: "stale", message: "This transaction has no priced ledger yet." },
        { status: 409, headers: { "cache-control": "private, no-store" } }
      );
    }
    const snapshot = buildSnapshot(view, job, ledger);
    const share = signShare(snapshot, ttlHours);
    if (!share) return sessionFailure("unavailable");

    const origin = request.headers.get("origin") ?? new URL(request.url).origin;
    const url = `${origin}/s/${share}`;
    const expiresAt = new Date(Date.now() + Math.min(Math.max(ttlHours, 1), 24 * 30) * 3_600_000).toISOString();

    return Response.json(
      { url, view, expiresAt },
      { headers: { "cache-control": "private, no-store" } }
    );
  } catch {
    return sessionFailure("error");
  }
}
