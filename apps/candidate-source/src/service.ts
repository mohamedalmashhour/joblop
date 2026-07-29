import type { CandidateSourceConfig, TenantConfig } from "./config";
import type { SyntheticCandidate, SyntheticManifest } from "./manifest";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class CandidateRequestError extends Error {
  constructor(
    readonly status: 400 | 403 | 404,
    readonly code:
      | "RWOS_CANDIDATE_REQUEST_INVALID"
      | "RWOS_CANDIDATE_ACCESS_DENIED"
      | "RWOS_CANDIDATE_UNAVAILABLE"
  ) {
    super(code);
  }
}

export function createCandidateSourceService(
  config: CandidateSourceConfig,
  manifest: SyntheticManifest,
  now: () => Date = () => new Date()
) {
  return {
    search(input: unknown, authenticatedTenantId: string) {
      const request = parseSearch(input, config);
      const tenant = authorizeTenant(config, request.organizationId, authenticatedTenantId);
      const candidates = manifest.tenants.get(tenant.organizationId);
      if (!candidates) throw unavailable();
      if (!candidates.every((candidate) => candidateBelongsToTenant(candidate, tenant))) {
        throw unavailable();
      }
      const filtered =
        request.workGroupId === tenant.workGroupId &&
        request.roleDefinitionId === tenant.roleDefinitionId
          ? candidates
          : [];
      return {
        candidates: filtered
          .slice(0, 100)
          .sort((left, right) =>
            bytewise(left.candidateSourceReference, right.candidateSourceReference)
          )
          .map((candidate) => publicCandidate(candidate, request.requestedAt))
      };
    },

    evaluate(input: unknown, authenticatedTenantId: string) {
      const request = parseEvaluate(input, config);
      const tenant = authorizeTenant(config, request.organizationId, authenticatedTenantId);
      const candidates = manifest.tenants.get(tenant.organizationId);
      const candidate = candidates?.find(
        (item) => item.candidateSourceReference === request.candidateSourceReference
      );
      if (!candidate || !candidateBelongsToTenant(candidate, tenant)) throw unavailable();
      const matches =
        request.workGroupId === tenant.workGroupId &&
        request.roleDefinitionId === tenant.roleDefinitionId;
      return {
        candidate: publicCandidate(candidate, new Date(now().getTime() - 60_000), matches)
      };
    }
  };
}

type CommonRequest = {
  dispatchReviewId: string;
  organizationId: string;
  workGroupId: string;
  roleDefinitionId: string;
  startAt: Date;
  endAt: Date;
  timezone: string;
};

function parseSearch(input: unknown, config: CandidateSourceConfig) {
  const record = exactRecord(input, [
    "dispatchReviewId",
    "organizationId",
    "workGroupId",
    "roleDefinitionId",
    "startAt",
    "endAt",
    "timezone",
    "requestedAt"
  ]);
  return {
    ...parseCommon(record, config),
    requestedAt: timestamp(record.requestedAt)
  };
}

function parseEvaluate(input: unknown, config: CandidateSourceConfig) {
  const record = exactRecord(input, [
    "dispatchReviewId",
    "organizationId",
    "workGroupId",
    "roleDefinitionId",
    "candidateSourceReference",
    "startAt",
    "endAt",
    "timezone"
  ]);
  const candidateSourceReference = boundedString(record.candidateSourceReference, 1, 200);
  if (!/^syn-tenant-[ab]-candidate-\d{3}$/.test(candidateSourceReference)) {
    throw invalid();
  }
  return {
    ...parseCommon(record, config),
    candidateSourceReference
  };
}

function parseCommon(
  record: Record<string, unknown>,
  config: CandidateSourceConfig
): CommonRequest {
  const startAt = timestamp(record.startAt);
  const endAt = timestamp(record.endAt);
  if (endAt <= startAt || endAt.getTime() - startAt.getTime() > 31 * 24 * 60 * 60 * 1000) {
    throw invalid();
  }
  const timezone = boundedString(record.timezone, 1, 64);
  if (!config.allowedTimezones.includes(timezone)) throw invalid();
  return {
    dispatchReviewId: uuid(record.dispatchReviewId),
    organizationId: uuid(record.organizationId),
    workGroupId: uuid(record.workGroupId),
    roleDefinitionId: uuid(record.roleDefinitionId),
    startAt,
    endAt,
    timezone
  };
}

function authorizeTenant(
  config: CandidateSourceConfig,
  organizationId: string,
  authenticatedTenantId: string
): TenantConfig {
  if (organizationId !== authenticatedTenantId) {
    throw new CandidateRequestError(403, "RWOS_CANDIDATE_ACCESS_DENIED");
  }
  const tenant = config.tenants.find((item) => item.organizationId === organizationId);
  if (!tenant) throw new CandidateRequestError(403, "RWOS_CANDIDATE_ACCESS_DENIED");
  return tenant;
}

function candidateBelongsToTenant(candidate: SyntheticCandidate, tenant: TenantConfig) {
  const expectedReferencePrefix = `syn-${tenant.label}-candidate-`;
  return (
    candidate.synthetic === true &&
    candidate.tenant === tenant.label &&
    candidate.organizationId === tenant.organizationId &&
    candidate.candidateSourceReference.startsWith(expectedReferencePrefix) &&
    candidate.matchingAttributes.workGroupId === tenant.workGroupId &&
    candidate.matchingAttributes.roleDefinitionId === tenant.roleDefinitionId
  );
}

function publicCandidate(
  candidate: SyntheticCandidate,
  sourceFreshnessAt: Date,
  exactMatch = true
) {
  return {
    organizationId: candidate.organizationId,
    workerIdentityId: candidate.workerIdentityId,
    candidateSourceReference: candidate.candidateSourceReference,
    approvedDisplayName: candidate.approvedDisplayName,
    candidateSourceType: "internal_worker_profile",
    workGroupMatch: exactMatch ? "match" : "no_match",
    roleDefinitionMatch: exactMatch ? "match" : "no_match",
    qualificationSummaryState: "meets_requirements",
    verificationSummaryState: "meets_requirements",
    availabilityState: "available",
    scheduleConflictState: "conflict_free",
    serviceAreaState: "inside_service_area",
    travelSuitabilityState: "suitable",
    transportConstraintState: "available",
    recommendationState: exactMatch ? "recommended" : "not_recommended",
    sourceFreshnessAt: sourceFreshnessAt.toISOString(),
    evaluationVersion: 1
  };
}

function exactRecord(input: unknown, keys: readonly string[]) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw invalid();
  const record = input as Record<string, unknown>;
  if (Object.keys(record).sort().join(",") !== [...keys].sort().join(",")) throw invalid();
  return record;
}

function uuid(value: unknown) {
  const result = boundedString(value, 36, 36);
  if (!uuidPattern.test(result)) throw invalid();
  return result;
}

function timestamp(value: unknown) {
  const raw = boundedString(value, 20, 40);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(raw)) throw invalid();
  const result = new Date(raw);
  if (!Number.isFinite(result.getTime())) throw invalid();
  return result;
}

function boundedString(value: unknown, minimum: number, maximum: number) {
  if (
    typeof value !== "string" ||
    value.length < minimum ||
    value.length > maximum ||
    !value.trim()
  ) {
    throw invalid();
  }
  return value;
}

function bytewise(left: string, right: string) {
  return Buffer.from(left).compare(Buffer.from(right));
}

function invalid() {
  return new CandidateRequestError(400, "RWOS_CANDIDATE_REQUEST_INVALID");
}

function unavailable() {
  return new CandidateRequestError(404, "RWOS_CANDIDATE_UNAVAILABLE");
}
