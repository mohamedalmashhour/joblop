// LOCAL dev helper (NOT runtime logic): bridge a marketplace interest into a shortlisted
// dispatchCandidate so the existing worker-offer flow (which requires a shortlisted
// dispatchCandidate found by workerIdentityId) can proceed locally, where the external
// candidate source is unavailable. This lets you watch offer -> send -> worker-accept end to
// end on the local stack. It is a seed-style helper, not a change to governed runtime code.
// The proper product fix is a local marketplace-backed DispatchCandidateSource (see
// AUTONOMOUS_SESSION_LOG.md).
//
//   Run on the Mac (DISPATCH_REVIEW_ID + JOB_REQUEST_ID from the dispatch page / list):
//     cd "/Volumes/Danny SSD/Codex/resident-workforce-os" \
//       && DATABASE_URL="postgresql://$USER@localhost:5432/$(sed -n 's/^DB: //p' local-stack-info.txt)" \
//          DISPATCH_REVIEW_ID=<uuid> JOB_REQUEST_ID=<uuid> \
//          node --import tsx local-stack-candidate-bridge.ts
import { createPrismaClient } from "@rwos/database";

async function main() {
  const url = process.env.DATABASE_URL;
  const dispatchReviewId = process.env.DISPATCH_REVIEW_ID;
  const jobRequestId = process.env.JOB_REQUEST_ID;
  if (!url || !dispatchReviewId || !jobRequestId) {
    console.error("CANDIDATE_BRIDGE_FAIL need DATABASE_URL, DISPATCH_REVIEW_ID, JOB_REQUEST_ID");
    process.exit(1);
  }
  const c: any = createPrismaClient(url);

  // Resolve the interested worker directly from the job's interest record — this is exactly
  // the workerIdentityId the admin "Create offer" action will send, so createOffer's
  // findShortlistedCandidateByWorkerIdentity(dispatchReviewId, workerIdentityId) will match.
  const interest = await c.workerJobInterest.findFirst({
    where: { jobRequestId },
    orderBy: { createdAt: "desc" }
  });
  if (!interest) {
    console.log("CANDIDATE_BRIDGE no marketplace interest for job", jobRequestId, "— express interest first.");
    return;
  }
  const workerIdentityId: string = interest.workerIdentityId;
  const wi = await c.workerIdentity.findUnique({ where: { id: workerIdentityId } });
  const displayName: string = wi?.displayName ?? "Interested worker";

  const existing = await c.dispatchCandidate.findFirst({ where: { dispatchReviewId, workerIdentityId } });
  const now = new Date();
  const data = {
    dispatchReviewId,
    workerIdentityId,
    candidateSourceType: "internal_worker_profile",
    candidateSourceReference: `marketplace-interest:${workerIdentityId}`,
    approvedDisplayName: displayName,
    workGroupMatch: "match",
    roleDefinitionMatch: "match",
    qualificationSummaryState: "meets_requirements",
    verificationSummaryState: "meets_requirements",
    availabilityState: "available",
    scheduleConflictState: "conflict_free",
    serviceAreaState: "inside_service_area",
    travelSuitabilityState: "suitable",
    transportConstraintState: "available",
    recommendationState: "recommended",
    shortlistState: "shortlisted",
    shortlistOrder: 1,
    sourceFreshnessAt: now,
    lastEvaluatedAt: now,
    evaluationVersion: 1,
    updatedAt: now
  };
  const row = existing
    ? await c.dispatchCandidate.update({ where: { id: existing.id }, data })
    : await c.dispatchCandidate.create({ data: { ...data, createdAt: now } });
  console.log(
    "CANDIDATE_BRIDGE_OK",
    JSON.stringify({ candidateId: row.id, workerIdentityId, displayName, shortlistState: row.shortlistState })
  );
  console.log("NEXT: reload the dispatch page -> 'Move to offer preparation' -> 'Create offer' -> approve -> send.");
}

main().catch((e) => { console.error("CANDIDATE_BRIDGE_ERROR", e); process.exit(1); });
