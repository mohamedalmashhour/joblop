import { sessionBoundary, isSameOriginMutation, sessionFailure } from "../../../sessionBoundary";

// Admin candidate-review glue for MARKETPLACE INTEREST. Read-side merges the platform
// interested-workers signal with the existing governed worker-offers for this dispatch
// review (matched by worker identity) so the reviewer can see whether a governed offer
// already exists. Mutations proxy to the platform interest transitions + link-offer.
//
// This route NEVER creates an offer or an assignment. Offer creation stays in the existing
// worker-offer flow; link-offer only records the link to an already-created governed offer.

type RawInterested = {
  interestId?: unknown;
  workerIdentityId?: unknown;
  displayName?: unknown;
  status?: unknown;
  distanceKmAtInterest?: unknown;
  workerOfferId?: unknown;
  createdAt?: unknown;
};
type RawOffer = { id?: unknown; workerIdentityId?: unknown; status?: unknown; version?: unknown };

const s = (v: unknown): string | null => (typeof v === "string" && v.length > 0 ? v : null);
const n = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

export async function GET(request: Request, context: Readonly<{ params: Promise<{ dispatchReviewId: string }> }>) {
  const { dispatchReviewId } = await context.params;
  const jobRequestId = new URL(request.url).searchParams.get("jobRequestId");
  if (!jobRequestId) return sessionFailure("not_found");
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");

  const [interestedRes, offersRes] = await Promise.all([
    gateway.request(`/platform/job-requests/${encodeURIComponent(jobRequestId)}/interested-workers`, "GET", token),
    gateway.request(`/platform/worker-offers?dispatchReviewId=${encodeURIComponent(dispatchReviewId)}`, "GET", token)
  ]);
  if (interestedRes.status !== "ok") return sessionFailure(interestedRes.status);

  const interested = ((interestedRes.payload as { interested?: unknown }).interested as RawInterested[]) ?? [];
  const offers = offersRes.status === "ok" ? (((offersRes.payload as { workerOffers?: unknown }).workerOffers as RawOffer[]) ?? []) : [];
  const offerByWorker = new Map<string, RawOffer>();
  for (const o of offers) {
    const wid = s(o.workerIdentityId);
    if (wid && !offerByWorker.has(wid)) offerByWorker.set(wid, o);
  }

  // Whitelist to marketplace-safe fields only — never pass private worker data through.
  const merged = interested.map((w) => {
    const wid = s(w.workerIdentityId);
    const offer = wid ? offerByWorker.get(wid) ?? null : null;
    return {
      interestId: s(w.interestId),
      workerIdentityId: wid,
      displayName: s(w.displayName),
      status: s(w.status),
      distanceKmAtInterest: n(w.distanceKmAtInterest),
      linkedOfferId: s(w.workerOfferId),
      createdAt: s(w.createdAt),
      governedOffer: offer ? { workerOfferId: s(offer.id), status: s(offer.status), version: n(offer.version) } : null
    };
  });
  return Response.json({ interested: merged }, { headers: { "cache-control": "private, no-store" } });
}

export async function POST(request: Request, context: Readonly<{ params: Promise<{ dispatchReviewId: string }> }>) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  await context.params; // dispatchReviewId not needed for the transition endpoints
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const body = (await request.json().catch(() => null)) as { action?: string; interestId?: string; workerOfferId?: string } | null;
  const interestId = body?.interestId;
  if (!body || typeof interestId !== "string") return sessionFailure("not_found");

  let path: string;
  let payload: unknown;
  switch (body.action) {
    case "review":
      path = `/platform/job-interests/${encodeURIComponent(interestId)}/review`;
      break;
    case "shortlist":
      path = `/platform/job-interests/${encodeURIComponent(interestId)}/shortlist`;
      break;
    case "not_selected":
      path = `/platform/job-interests/${encodeURIComponent(interestId)}/not-selected`;
      break;
    case "link_offer":
      if (typeof body.workerOfferId !== "string") return sessionFailure("error");
      path = `/platform/job-interests/${encodeURIComponent(interestId)}/link-offer`;
      payload = { workerOfferId: body.workerOfferId };
      break;
    default:
      return sessionFailure("error");
  }
  const result = await gateway.request(path, "POST", token, payload);
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: { "cache-control": "private, no-store" } });
}
