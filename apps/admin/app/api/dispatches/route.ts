import { parseAdminDispatchReview, readDispatchCreateInput } from "./dispatchBoundary";
import { isSameOriginMutation, sessionBoundary, sessionFailure } from "../sessionBoundary";

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const jobRequestIds = searchParams.getAll("jobRequestId");
  if (
    [...searchParams.keys()].some((key) => key !== "jobRequestId") ||
    jobRequestIds.length !== 1 ||
    !readDispatchCreateInput({ jobRequestId: jobRequestIds[0] })
  ) {
    return Response.json(
      { status: "invalid", message: "A valid request reference is required." },
      { status: 400, headers: privateHeaders }
    );
  }
  const jobRequestId = jobRequestIds[0];
  const { gateway, token } = await sessionBoundary();
  const result = await gateway.request("/platform/dispatches", "GET", token);
  if (result.status !== "ok") return sessionFailure(result.status);
  try {
    const payload = result.payload as { dispatches?: unknown };
    const dispatches = Array.isArray(payload.dispatches)
      ? payload.dispatches.map((dispatch) => parseAdminDispatchReview(dispatch))
      : [];
    const matches = dispatches.filter((dispatch) => dispatch.jobRequestId === jobRequestId);
    if (matches.length > 1) {
      return Response.json(
        { status: "conflict", message: "Multiple dispatch reviews require investigation." },
        { status: 409, headers: privateHeaders }
      );
    }
    return Response.json({ dispatches: matches }, { headers: privateHeaders });
  } catch {
    return sessionFailure("error");
  }
}

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const input = readDispatchCreateInput(await request.json().catch(() => null));
  if (!input) {
    return Response.json(
      { status: "invalid", message: "A valid approved request and priority are required." },
      { status: 400, headers: privateHeaders }
    );
  }
  const { gateway, token } = await sessionBoundary();
  const result = await gateway.request("/platform/dispatches", "POST", token, input);
  if (result.status !== "ok") return sessionFailure(result.status);
  try {
    const payload = result.payload as { dispatchReview?: unknown };
    return Response.json(
      { dispatchReview: parseAdminDispatchReview(payload.dispatchReview) },
      { status: 201, headers: privateHeaders }
    );
  } catch {
    return sessionFailure("error");
  }
}

const privateHeaders = { "cache-control": "private, no-store" };
