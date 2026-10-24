# JobLop — Autonomous overnight session log
Operator asleep; authorized to continue across all departments. Nothing pushed, no live
payments, no prod deploys, Stripe TEST only, secrets never committed.

======================================================================
## TL;DR for the morning
- The whole CLIENT journey works for real: post job → save draft → submit for review (201/200).
- The ADMIN journey works: begin review → approve for dispatch → create dispatch → candidate
  review → shortlist the interested worker → (NEW) move to offer preparation.
- The WORKER journey works up to: see job → express interest (worker-a did, on JR-2026-000001).
- Every backend read endpoint across admin + employer + worker, in every department, returns 200.
  The Control Room settlement ledger renders correctly ($30 employer / $24 worker / $6 margin,
  reconciles, zero nulls).
- ONE thing is left to see end-to-end: worker RECEIVES + ACCEPTS the offer. It is blocked by a
  real architecture gap (below). A one-command helper unblocks it — see "Morning steps".

======================================================================
## Code fixes made this session (TRACKED — review `git diff`, then push)
1. packages/config/src/index.ts — EMAIL_FROM accepts "Name <email>" display form (was crashing API
   boot when the Resend sender used a display name).
2. apps/employer/.../CreatePersistedRequestPanel.tsx — Work-agreement ACCEPTANCE CHECKBOX. Shown in
   the editing step AND the final submit step; required to "Submit for review" (the real commitment);
   saving a draft stays free so a client can return to it. Checkbox is centred on its text line.
3. apps/employer/app/i18n/messages.ts — create.agreementAccept (EN + FR).
4. apps/admin/app/api/calendar/requests/[requestId]/route.ts — accept a match on id OR requestNumber
   (admin review screen was 500-ing because it links by JR-number but the guard compared to the UUID).
5. packages/auth/src/index.ts — findJobRequestByIdOrNumber: only do the UUID lookup for a real UUID,
   else resolve by number. (A JR-number was being fed to a UUID column → unhandled 500 PLATFORM-WIDE
   on every by-number lookup; also fixes Control-Room-by-number, etc.)
6. apps/admin/app/api/dispatches/[dispatchReviewId]/offer-preparation/route.ts — NEW BFF route to
   advance a dispatch candidate_review/shortlist_ready → offer_preparation.
7. apps/admin/.../PersistedDispatchPanel.tsx — "Move to offer preparation" button + handler (the
   admin app had the state label and the API endpoint, but NO way to make the transition, so offers
   could never be created — launch-blocking).

## Pre-existing working-tree changes (NOT made tonight — please confirm they are yours before push)
- packages/database/src/catalogue.ts — adds "role_definition.read" to PLATFORM_ADMINISTRATOR.
  Looks correct (admin needs it); keep unless intentional otherwise.
- packages/design-system/src/index.ts (+ index.test.ts) — brand colours changed to brighter blues
  (deepTeal #0c2654, actionTeal #1f9bf0 …). Self-consistent (test updated). Your branding call.
- .claude/launch.json — adds an admin-local debug config + url fields. Dev tooling only.

## Untracked dev helpers (local only — gitignored or never committed)
- local-stack-membership-fix.ts, local-stack-key-fix.ts — DB repairs you already ran (granted the
  owner role; fixed hyphenated work-group/role keys). Keep for re-use.
- local-stack-extra-seed.ts — PATCHED to create underscore keys (wg_care_ / role_psw_) so fresh
  boots don't reintroduce the hyphen bug.
- local-stack-candidate-bridge.ts — the one-command unblocker for the offer flow (see Morning steps).

======================================================================
## The remaining gap (worker offer / accept) — what and why
Creating a worker offer requires a SHORTLISTED **dispatchCandidate** (createOffer →
findShortlistedCandidateByWorkerIdentity). dispatchCandidates come from a DispatchCandidateSource.
In local/test there is NO candidate source wired — the API gets createUnavailableCandidateSource(),
which always reports "unavailable". The marketplace-INTEREST path (worker expresses interest, admin
shortlists the interest) is a SEPARATE track and does NOT create a dispatchCandidate. So locally you
can shortlist an interest but still can't create the governed offer.

Two ways forward (your product decision):
  (A) PROPER FIX — add a local marketplace-backed DispatchCandidateSource (the designed extension
      point: implement DispatchCandidateSource.getStatus/searchCandidates/evaluateCandidate to source
      from WorkerJobInterest), wired in apps/api/src/app.ts only when RWOS_LOCAL_E2E=enabled. I scoped
      it fully (enums, worker-identity mapping, candidate shape all verified) but did NOT hot-patch
      core packages/auth code while you were asleep — a syntax slip there takes the whole stack down.
      I can land it as the first thing when you're back.
  (B) In production, bridge "shortlisted marketplace interest → dispatch candidate" explicitly in the
      offer flow, or require the external candidate-source service. This is the real design choice.

## Morning steps — SEE worker accept end-to-end (≈2 min, path (A)-equivalent via the helper)
Stack is up; current ids: DB rwos_local_dev_1791346556, job JR-2026-000001
(be893f79-ea91-4bb3-b4f8-5d2b87834c7e), dispatch review 04952fe4-822b-41c4-9269-b609d95d2a86.
1) In your Mac Terminal:
   cd "/Volumes/Danny SSD/Codex/resident-workforce-os" \
     && DATABASE_URL="postgresql://$USER@localhost:5432/rwos_local_dev_1791346556" \
        DISPATCH_REVIEW_ID=04952fe4-822b-41c4-9269-b609d95d2a86 \
        JOB_REQUEST_ID=be893f79-ea91-4bb3-b4f8-5d2b87834c7e \
        node --import tsx local-stack-candidate-bridge.ts
   (prints CANDIDATE_BRIDGE_OK — creates one shortlisted dispatch candidate = worker-a.)
2) Admin (http://127.0.0.1:8082) → Dispatch review → "Move to offer preparation" → "Create offer"
   → approve → send. (If the stack was rebuilt and ids changed, read them off local-stack-info.txt
   and the dispatch page.)
3) Worker (http://127.0.0.1:8090) → the offer appears → Accept → an Assignment is created.
NOTE: a code edit hot-reloads the API (tsx watch) and that clears signed-in sessions — just sign in
again if a page shows signed-out.

======================================================================
## Department sweep (this session) — ALL BACKEND ENDPOINTS HEALTHY (200)
ADMIN (8082): calendar/requests, dispatches/list, orders, escalations, verification/queue,
  market-wages, role-definitions ✓; finance/invoices + finance/payments ✓ with ?organizationId;
  control-room (by UUID and by JR-number) ✓. Control Room ledger renders with correct economics.
EMPLOYER (8081): calendar/requests, contract, invoices, market-wages, orders,
  organization-verification, payments, residences, timesheets, assignments, attendance ✓.
  (job-requests is POST-only → 405 on GET, expected.) Dashboard renders clean.
WORKER (8090): attendance, disputes, documents, hr, my-interests, offers, payments, payroll,
  saved-jobs, verification ✓. (marketplace/search + profile/classification are POST-only → 405,
  expected.) Home renders. Marketplace search includes submitted + approved_for_dispatch jobs, so
  the posted job is discoverable (subject to the worker's location match).
No 500s found anywhere except the two I fixed (#4, #5 above).

## Suggested next (when you're back)
- Land option (A) local candidate source (I have it scoped) → full offer/accept without the helper.
- Then verify downstream: offer → accept → assignment → attendance (check-in/out) → timesheet
  (calculate/review/approve) → invoice/payment via the LOCAL fake payment provider → payroll.
- Decide the design-system brand colours (#3 above) stay.

======================================================================
## Page RENDER sweep (client-side) — all healthy
Rendered and inspected, no failures: admin control-room (correct ledger), /workers, /verification,
/payroll, /finance (shows governed "unavailable" truthful-empty-state copy by design — NOT an error;
it has full structure + $ labels); employer /dashboard; worker / (home) and /offers.
Pattern confirmed: pages render whenever their BFF returns 200 (all do). The platform intentionally
uses "… unavailable" / "No fixture data is substituted" copy for empty governed states — do not
mistake that wording for a page error.

## One more real gap found (UI, not launch-blocking for the demo via the helper)
apps/admin/app/dispatches/[dispatchReviewId]/CandidateReviewPanel.tsx has only "Check candidate
source" — there is NO UI to list / evaluate / shortlist candidates returned by a candidate source.
So even if a local candidate source were wired, an admin could not drive source→shortlist from the
screen. The WORKING shortlist path today is the "Interested workers (marketplace)" panel (used this
session). If you implement the local candidate source (option A), also add the candidate list +
evaluate/shortlist controls to CandidateReviewPanel, OR rely on the interested-workers panel.

## Session end state
Stack still running (API hot-reloaded several times during edits — sign in again if a tab shows
signed-out). All fixes are in the working tree, NOTHING committed or pushed (your call in the morning).
Browser tabs left open: employer (8081), worker offers (8090), admin control-room (8082).

======================================================================
## MORNING SESSION (operator present) — LIFECYCLE COMPLETED
Step #1 DONE — full post→offer→accept→assignment proven end to end on the live stack:
client posts JR-2026-000001 → submit → admin begin review → approve for dispatch → create
dispatch → "Source & shortlist interested workers" (new local candidate source) → move to offer
preparation (now chains candidate_review→shortlist_ready→offer_preparation) → create offer →
approve → send → WORKER ACCEPTS → admin creates assignment (201, "confirmed", 4eb278b1-...).

Commits (3 ahead of origin; owner pushes): acdc505 governed-flow fixes · 8dbe513 agreement
checkbox + palette · f6b36fc dispatch lifecycle (local candidate source + source&shortlist +
offer-prep chaining + assignmentHandoff local/test).
Push:  git push origin feat/joblop-worker-bilingual-employer-pricing

Step #3 safety: no sk_live_/pk_live_/rk_live_ anywhere (only guards/tests forbidding them). Stripe
test-mode default-off. PASS.

Step #2 remaining: attendance check-in/out → timesheet → invoice/payment (local fake provider) →
payroll. Check-in is not hard-gated by shift time, so demonstrable next.
Steps #4 (legal copy), #5 (staging deploy), #6 (palette + candidate-source design) need the owner.

======================================================================
## STEP #2 DOWNSTREAM — progress (operator present)
Attendance: FULL lifecycle driven live — create record → worker check-in → check-out → admin
complete. Timesheet: create → calculate works; after a realistic-shift seed it computes 480
clean payable/billable minutes (a real 8h shift).
Remaining before invoice/payment/payroll: a clean (exception-free) timesheet. The first seed
backdated attendance to yesterday but left the SCHEDULED shift on 2026-10-08, so the timesheet
flagged early_arrival/early_departure (correct behavior). The refined local-stack-realistic-shift.ts
now aligns BOTH the job shift window and the attendance to the same past window and clears the
derived timesheet, so a fresh calculate → 480 min, no exception → worker_review.

Infra built for the money tail (committed): admin BFF proxies for assignments/attendance/
timesheets; worker BFF timesheet view+confirm routes. Employer timesheet confirm already existed.

LAUNCH OBSERVATION (design): the timesheet state machine has NO admin "override/accept exception"
path — review_required can only go to correction_required or rejected. Any early/late arrival keeps
a timesheet un-approvable until the data matches the scheduled window. Worth a product decision
before launch (a governed "accept with exception" transition, or confirm this is intended).

TO FINISH THE MONEY TAIL (owner): push, then re-run the refined seed; I then drive
create→calculate (clean 480 min) → worker confirm → employer confirm → platform approve →
invoice → payment (local fake provider) → payroll.
