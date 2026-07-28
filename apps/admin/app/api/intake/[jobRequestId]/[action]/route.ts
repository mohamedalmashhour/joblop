import {
  intakeActionPath,
  parseAdminIntakeMutationResult,
  readAdminIntakeMutation,
  type AdminIntakeAction
} from "../../intakeBoundary";
import { isSameOriginMutation, sessionBoundary, sessionFailure } from "../../../sessionBoundary";

const actions = new Set<AdminIntakeAction>([
  "admin-review",
  "request-information",
  "approve-for-dispatch"
]);

export async function POST(
  request: Request,
  context: Readonly<{
    params: Promise<{ action: string; jobRequestId: string }>;
  }>
) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const { action: rawAction, jobRequestId } = await context.params;
  if (!actions.has(rawAction as AdminIntakeAction)) return invalidRequest();
  const action = rawAction as AdminIntakeAction;
  const input = readAdminIntakeMutation(
    await request.json().catch(() => null),
    action === "request-information"
  );
  if (!input) return invalidRequest();

  const { gateway, token } = await sessionBoundary();
  const result = await gateway.request(
    `/platform/job-requests/intake/${encodeURIComponent(jobRequestId)}/${intakeActionPath(action)}`,
    "POST",
    token,
    input
  );
  if (result.status !== "ok") return sessionFailure(result.status);
  try {
    return Response.json(
      { jobRequest: parseAdminIntakeMutationResult(result.payload) },
      { headers: privateHeaders }
    );
  } catch {
    return sessionFailure("error");
  }
}

function invalidRequest() {
  return Response.json(
    { status: "invalid", message: "A current request version and valid reason are required." },
    { status: 400, headers: privateHeaders }
  );
}

const privateHeaders = { "cache-control": "private, no-store" };
