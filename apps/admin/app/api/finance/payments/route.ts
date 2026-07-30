import { sessionBoundary, sessionFailure } from "../../sessionBoundary";
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

const privateHeaders = { "cache-control": "private, no-store" };
