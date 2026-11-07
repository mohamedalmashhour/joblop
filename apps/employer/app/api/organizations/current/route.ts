import {
  isSameOriginMutation,
  resolveClientOrganizationId,
  sessionBoundary,
  sessionFailure
} from "../../sessionBoundary";
import { readCompanyUpdate, type CompanyDetails } from "./companyDetails";

const privateHeaders = { "cache-control": "private, no-store" };

function toCompanyDetails(payload: unknown): CompanyDetails | null {
  const organization = (payload as { organization?: Record<string, unknown> } | null)?.organization;
  if (
    typeof organization?.legalName !== "string" ||
    typeof organization.displayName !== "string" ||
    typeof organization.publicId !== "string" ||
    typeof organization.version !== "string"
  ) {
    return null;
  }
  return {
    legalName: organization.legalName,
    displayName: organization.displayName,
    publicId: organization.publicId,
    version: organization.version
  };
}

async function currentOrganization() {
  const { gateway, organizationId, token } = await sessionBoundary();
  const context = await resolveClientOrganizationId(gateway, token, organizationId);
  return { context, gateway, token };
}

function organizationRequired(organizations: unknown) {
  return Response.json({ status: "organization_required", organizations }, { status: 409, headers: privateHeaders });
}

function respond(result: Awaited<ReturnType<Awaited<ReturnType<typeof sessionBoundary>>["gateway"]["request"]>>) {
  if (result.status !== "ok") return sessionFailure(result.status);
  const company = toCompanyDetails(result.payload);
  return company ? Response.json({ company }, { headers: privateHeaders }) : sessionFailure("error");
}

// The details of the company the employer is working in.
export async function GET() {
  const { context, gateway, token } = await currentOrganization();
  if (context.status === "context_required") return organizationRequired(context.organizations);
  if (context.status !== "ok") return sessionFailure(context.status);
  return respond(
    await gateway.request(`/organizations/${encodeURIComponent(context.organizationId)}`, "GET", token)
  );
}

// Saves the company's names. The API checks the employer may do this and audits the change, and the
// version stops one person overwriting another's edit.
export async function PATCH(request: Request) {
  if (!isSameOriginMutation(request)) return sessionFailure("denied");
  const update = readCompanyUpdate(await request.json().catch(() => null));
  if (!update) {
    return Response.json({ status: "invalid" }, { status: 400, headers: privateHeaders });
  }
  const { context, gateway, token } = await currentOrganization();
  if (context.status === "context_required") return organizationRequired(context.organizations);
  if (context.status !== "ok") return sessionFailure(context.status);
  const path = `/organizations/${encodeURIComponent(context.organizationId)}`;
  const result = await gateway.request(path, "PATCH", token, update);
  if (result.status !== "denied") return respond(result);

  // The API deliberately answers a stale save the same way as a refusal. If the company has moved on
  // since this person loaded it, tell them so instead of showing a dead end.
  const current = await gateway.request(path, "GET", token);
  const company = current.status === "ok" ? toCompanyDetails(current.payload) : null;
  return sessionFailure(company && company.version !== update.expectedVersion ? "stale" : "denied");
}
