import { sessionBoundary, isSameOriginMutation, sessionFailure } from "../../sessionBoundary";
import { parseFinancePayments, readOrganizationId } from "../financeBoundary";

export async function GET(request: Request) {
  const organizationId = readOrganizationId(request);
  if (!organizationId) {
    return Response.json(
      { status: "invalid", message: "A valid organization reference is required." },
      { status: 400, headers: privateHeaders }
    );
  }
  const { gateway, token } = await sessionBoundary();
  const result = await gateway.request(
    `/organizations/${encodeURIComponent(organizationId)}/payments`,
    "GET",
    token
  );
  if (result.status !== "ok") return sessionFailure(result.status);
  try {
    return Response.json(
      { payments: parseFinancePayments(result.payload) },
      { headers: privateHeaders }
    );
  } catch {
    return sessionFailure("error");
  }
}


export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const organizationId = readOrganizationId(request);
  if (!organizationId) {
    return Response.json(
      { status: "invalid", message: "A valid organization reference is required." },
      { status: 400, headers: privateHeaders }
    );
  }
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const body = await request.json().catch(() => ({}));
  const result = await gateway.request(
    `/organizations/${encodeURIComponent(organizationId)}/payments`,
    "POST",
    token,
    body
  );
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: privateHeaders });
}

const privateHeaders = { "cache-control": "private, no-store" };
