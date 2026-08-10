import { parseEmployerContractEnvelope, type EmployerContractDto } from "@rwos/shared";
import {
  resolveClientOrganizationId,
  sessionBoundary,
  sessionFailure
} from "../sessionBoundary";

// GET the organization's current governed contract (or null if none exists yet).
// The rate card is read-only here; the employer never supplies rates. Rates are
// enriched with human-readable role names from the role-definition catalogue for
// display — the internal roleDefinitionId is always retained.
export async function GET() {
  const { gateway, organizationId, token } = await sessionBoundary();
  const context = await resolveClientOrganizationId(gateway, token, organizationId);
  if (context.status === "context_required") {
    return Response.json(
      { status: "organization_required", organizations: context.organizations },
      { status: 409, headers: privateHeaders }
    );
  }
  if (context.status !== "ok") return sessionFailure(context.status);

  const [contractResult, roleResult] = await Promise.all([
    gateway.request(
      `/organizations/${encodeURIComponent(context.organizationId)}/contract`,
      "GET",
      token
    ),
    gateway.request(
      `/role-definitions?organizationId=${encodeURIComponent(context.organizationId)}`,
      "GET",
      token
    )
  ]);
  if (contractResult.status !== "ok") return sessionFailure(contractResult.status);
  try {
    const contract = parseEmployerContractEnvelope(contractResult.payload);
    return Response.json(
      { contract: withRoleLabels(contract, roleResult.status === "ok" ? roleResult.payload : null) },
      { headers: privateHeaders }
    );
  } catch {
    return sessionFailure("error");
  }
}

// Attach a human role name to each rate from the role-definition catalogue. Role
// lookup is best-effort — a failed/partial fetch leaves roleLabel null (the UI
// falls back), never blocking the contract view.
function withRoleLabels(
  contract: EmployerContractDto | null,
  rolePayload: unknown
): EmployerContractDto | null {
  if (!contract) return null;
  const labels = roleLabelMap(rolePayload);
  return {
    ...contract,
    roleRates: contract.roleRates.map((rate) => ({
      ...rate,
      roleLabel: labels.get(rate.roleDefinitionId) ?? rate.roleLabel
    }))
  };
}

function roleLabelMap(payload: unknown): Map<string, string> {
  const map = new Map<string, string>();
  if (typeof payload !== "object" || payload === null) return map;
  const roles = (payload as { roleDefinitions?: unknown }).roleDefinitions;
  if (!Array.isArray(roles)) return map;
  for (const role of roles) {
    if (typeof role !== "object" || role === null) continue;
    const record = role as Record<string, unknown>;
    if (typeof record.id === "string" && typeof record.displayLabel === "string" && record.displayLabel) {
      map.set(record.id, record.displayLabel);
    }
  }
  return map;
}

const privateHeaders = { "cache-control": "private, no-store" };
