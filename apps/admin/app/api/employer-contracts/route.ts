import { isSameOriginMutation, sessionBoundary, sessionFailure } from "../sessionBoundary";
import { contractVersion, readPublishRequest } from "./contractRequest";

const privateHeaders = { "cache-control": "private, no-store" };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// A company's current rate card, plus the role catalogue staff price from. The API allows platform
// administrators only.
export async function GET(request: Request) {
  const organizationId = new URL(request.url).searchParams.get("organizationId") ?? "";
  if (!uuid.test(organizationId)) return sessionFailure("not_found");
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const [contract, roles] = await Promise.all([
    gateway.request(`/platform/organizations/${encodeURIComponent(organizationId)}/contract`, "GET", token),
    gateway.request("/role-definitions", "GET", token)
  ]);
  if (contract.status !== "ok") return sessionFailure(contract.status);
  if (roles.status !== "ok") return sessionFailure(roles.status);
  return Response.json(
    {
      contract: (contract.payload as { contract?: unknown }).contract ?? null,
      roleDefinitions: (roles.payload as { roleDefinitions?: unknown }).roleDefinitions ?? [],
      workGroups: (contract.payload as { workGroups?: unknown }).workGroups ?? []
    },
    { headers: privateHeaders }
  );
}

// Publishes a rate card. The employer then reviews and signs it. The server sets the version label.
export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const input = readPublishRequest(await request.json().catch(() => null));
  if (!input) return Response.json({ status: "invalid" }, { status: 400, headers: privateHeaders });
  const { gateway, token } = await sessionBoundary();
  if (!token) return sessionFailure("denied");
  const result = await gateway.request(
    `/organizations/${encodeURIComponent(input.organizationId)}/contract`,
    "POST",
    token,
    { version: contractVersion(new Date()), roleRates: input.roleRates }
  );
  if (result.status !== "ok") return sessionFailure(result.status);
  return Response.json(result.payload, { headers: privateHeaders });
}
