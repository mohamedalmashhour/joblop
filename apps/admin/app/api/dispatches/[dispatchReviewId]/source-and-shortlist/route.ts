import { isSameOriginMutation, sessionBoundary, sessionFailure } from "../../../sessionBoundary";

// Admin convenience for the local/test candidate flow: search the candidate source, evaluate each
// returned candidate into a governed dispatchCandidate, and shortlist it — so the existing worker
// offer flow (which requires a shortlisted dispatchCandidate) can proceed. Each step calls the
// authoritative platform endpoints; this route creates no offers or assignments.
type RawCandidate = { candidateSourceReference?: unknown; approvedDisplayName?: unknown };

export async function POST(
  request: Request,
  context: Readonly<{ params: Promise<{ dispatchReviewId: string }> }>
) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { dispatchReviewId } = await context.params;
  const id = encodeURIComponent(dispatchReviewId);
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");

  const search = await gateway.request(`/platform/dispatches/${id}/candidates/search`, "GET", token);
  if (search.status !== "ok") return sessionFailure(search.status);
  const payload = search.payload as { status?: string; candidates?: RawCandidate[] };
  if (payload.status !== "available") {
    return Response.json(
      { status: "candidate_source_unavailable", shortlisted: 0 },
      { headers: privateHeaders }
    );
  }
  const refs = (payload.candidates ?? [])
    .map((candidate) =>
      typeof candidate.candidateSourceReference === "string"
        ? candidate.candidateSourceReference
        : null
    )
    .filter((reference): reference is string => Boolean(reference));

  let shortlisted = 0;
  for (const candidateSourceReference of refs) {
    const evaluated = await gateway.request(
      `/platform/dispatches/${id}/candidates/evaluate`,
      "POST",
      token,
      { candidateSourceReference }
    );
    if (evaluated.status !== "ok") continue;
    const listed = await gateway.request(
      `/platform/dispatches/${id}/shortlist`,
      "POST",
      token,
      { candidateSourceReference }
    );
    if (listed.status === "ok") shortlisted += 1;
  }

  return Response.json(
    { status: "ok", candidates: refs.length, shortlisted },
    { headers: privateHeaders }
  );
}

const privateHeaders = { "cache-control": "private, no-store" };
