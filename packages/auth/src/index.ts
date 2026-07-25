import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
export const workerRoles = ["WORKER"] as const;

export const employerRoles = ["EMPLOYER_OWNER", "EMPLOYER_SCHEDULER"] as const;

export const adminRoles = [
  "DISPATCHER",
  "COMPLIANCE_REVIEWER",
  "FINANCE_REVIEWER",
  "SUPPORT_AGENT",
  "PLATFORM_ADMIN",
  "READ_ONLY_AUDITOR"
] as const;

export type PlatformRole =
  | (typeof workerRoles)[number]
  | (typeof employerRoles)[number]
  | (typeof adminRoles)[number];

export function assertRole(currentRole: PlatformRole, allowedRoles: readonly PlatformRole[]) {
  if (!allowedRoles.includes(currentRole)) {
    throw new Error("RWOS_AUTHORIZATION_DENIED");
  }
}

export const authorizationDeniedCode = "RWOS_AUTHORIZATION_DENIED";
export const authorizationDeniedMessage = "Access denied.";

export const authorizationRoleKeys = [
  "PLATFORM_ADMINISTRATOR",
  "ORGANIZATION_OWNER",
  "ORGANIZATION_ADMINISTRATOR",
  "ORGANIZATION_STAFF",
  "WORKER_ACCESS",
  "DISPATCHER"
] as const;

export type AuthorizationRoleKey = (typeof authorizationRoleKeys)[number];

export const authorizationPermissionKeys = [
  "organization.read",
  "organization.update",
  "residence.read",
  "residence.create",
  "residence.update",
  "department.read",
  "department.create",
  "department.update",
  "work_group.read",
  "role_definition.read",
  "job_request.create",
  "job_request.read",
  "job_request.update_draft",
  "job_request.submit",
  "job_request.cancel",
  "job_request.admin_review",
  "job_request.request_information",
  "job_request.approve_for_dispatch",
  "audit.read",
  "platform.supervise"
] as const;

export type AuthorizationPermissionKey = (typeof authorizationPermissionKeys)[number];
export type AuthorizationDecisionStatus =
  | "allow"
  | "deny"
  | "context_required"
  | "permission_missing"
  | "account_inactive"
  | "session_invalid";
export type AuthorizationContextRequirement = "none" | "organization" | "platform";
export type AuthorizationPermissionLifecycle = "active" | "reserved";

export interface AuthorizationPermissionDefinition {
  key: AuthorizationPermissionKey;
  purpose: string;
  context: AuthorizationContextRequirement;
  lifecycle: AuthorizationPermissionLifecycle;
  securityRisk: string;
  testRequirement: string;
}

export interface AuthorizationRoleDefinition {
  key: AuthorizationRoleKey;
  displayLabel: string;
  context: AuthorizationContextRequirement;
  description: string;
  permissions: readonly AuthorizationPermissionKey[];
}

export interface AuthorizationResourceContext {
  organizationId?: string | null;
}

export interface AuthorizationPlatformContext {
  platform?: boolean;
}

export interface AuthorizationDecisionInput {
  session: SessionValidationResult;
  roles?: readonly AuthorizationRoleKey[];
  permission: string;
  resourceContext?: AuthorizationResourceContext;
  platformContext?: AuthorizationPlatformContext;
  correlationId?: string;
}

export interface AuthorizationDecision {
  status: AuthorizationDecisionStatus;
  allow: boolean;
  externalCode: typeof authorizationDeniedCode | null;
  externalMessage: typeof authorizationDeniedMessage | null;
  internalReason: string | null;
  permission: string;
  roles: readonly AuthorizationRoleKey[];
  correlationId: string;
}

export interface AuthorizationAuditEventInput {
  action: "authorization.denied" | "authorization.platform_supervision";
  userId: string | null;
  permission: string;
  reason: string;
  correlationId: string;
}

export interface AuthorizationAuditSink {
  recordAuthorizationAuditEvent(input: AuthorizationAuditEventInput): Promise<void>;
}

export type OrganizationMembershipStatus = "invited" | "active" | "suspended" | "revoked" | "expired";
export type OrganizationMembershipDecisionStatus =
  | "allow"
  | "membership_missing"
  | "context_required"
  | "membership_inactive"
  | "membership_expired"
  | "duplicate_membership"
  | "access_role_missing";

export interface StoredMembershipAccessRole {
  accessRole: {
    key: AuthorizationRoleKey;
  };
}

export interface StoredOrganizationMembership {
  id: string;
  organizationId: string;
  userId: string;
  status: OrganizationMembershipStatus;
  invitedByUserId: string | null;
  createdAt: Date;
  acceptedAt: Date | null;
  suspendedAt: Date | null;
  revokedAt: Date | null;
  expiredAt: Date | null;
  organization: {
    id: string;
    publicId: string;
    displayName: string;
    status: string;
  };
  membershipRoles: StoredMembershipAccessRole[];
}

export interface PublicOrganizationMembership {
  id: string;
  organizationId: string;
  organizationPublicId: string;
  organizationDisplayName: string;
  userId: string;
  status: OrganizationMembershipStatus;
  roleKeys: AuthorizationRoleKey[];
  invitedByUserId: string | null;
  invitedAt: Date;
  activatedAt: Date | null;
  suspendedAt: Date | null;
  revokedAt: Date | null;
  expiresAt: Date | null;
  updatedAt: Date;
}

export interface OrganizationMembershipDecision {
  status: OrganizationMembershipDecisionStatus;
  allow: boolean;
  membership: PublicOrganizationMembership | null;
  organizationId: string | null;
  roles: readonly AuthorizationRoleKey[];
  internalReason: string | null;
  externalCode: typeof authorizationDeniedCode | null;
  externalMessage: typeof authorizationDeniedMessage | null;
}

export interface InviteMembershipInput {
  organizationId: string;
  userId: string;
  invitedByUserId: string | null;
  accessRoleKeys: readonly AuthorizationRoleKey[];
  expiresAt?: Date | null;
  correlationId?: string;
}

export interface OrganizationMembershipRepository {
  listMembershipsForUser(userId: string): Promise<StoredOrganizationMembership[]>;
  findMembershipById(membershipId: string): Promise<StoredOrganizationMembership | null>;
  findMembershipForUserByOrganization(userId: string, organizationId: string): Promise<StoredOrganizationMembership | null>;
  createMembership(input: {
    organizationId: string;
    userId: string;
    invitedByUserId: string | null;
    accessRoleKeys: readonly AuthorizationRoleKey[];
    expiresAt: Date | null;
    now: Date;
  }): Promise<StoredOrganizationMembership>;
  updateMembershipStatus(input: {
    membershipId: string;
    status: OrganizationMembershipStatus;
    actorUserId: string | null;
    now: Date;
  }): Promise<StoredOrganizationMembership>;
  replaceMembershipRoles(input: {
    membershipId: string;
    accessRoleKeys: readonly AuthorizationRoleKey[];
    actorUserId: string | null;
    now: Date;
  }): Promise<StoredOrganizationMembership>;
  recordMembershipAuditEvent(input: {
    action:
      | "membership.invited"
      | "membership.activated"
      | "membership.suspended"
      | "membership.revoked"
      | "membership.expired"
      | "membership.context_selected"
      | "membership.access_role_changed"
      | "membership.denied";
    membershipId: string | null;
    organizationId: string | null;
    userId: string | null;
    actorUserId: string | null;
    reason: string | null;
    priorState: string | null;
    newState: string | null;
    correlationId: string;
    createdAt: Date;
  }): Promise<void>;
}

export class OrganizationMembershipError extends Error {
  decision: OrganizationMembershipDecision;

  constructor(decision: OrganizationMembershipDecision) {
    super(authorizationDeniedMessage);
    this.name = "OrganizationMembershipError";
    this.decision = decision;
  }
}

export type EmployerOrganizationStatus = "invited" | "pending_review" | "active" | "restricted" | "suspended" | "closed";
export type EmployerOrganizationDecisionStatus =
  | "allow"
  | "invalid_input"
  | "not_found"
  | "membership_denied"
  | "permission_denied"
  | "organization_inactive"
  | "version_conflict"
  | "duplicate_organization"
  | "bootstrap_failed";

export interface StoredEmployerOrganization {
  id: string;
  publicId: string;
  legalName: string;
  displayName: string;
  status: EmployerOrganizationStatus;
  createdByUserId: string | null;
  reviewedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  restrictedAt: Date | null;
  suspendedAt: Date | null;
  closedAt: Date | null;
}

export interface PublicEmployerOrganization {
  id: string;
  publicId: string;
  legalName: string;
  displayName: string;
  status: EmployerOrganizationStatus;
  createdByUserId: string | null;
  reviewedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  restrictedAt: Date | null;
  suspendedAt: Date | null;
  closedAt: Date | null;
  version: string;
}

export interface EmployerOrganizationDecision {
  status: EmployerOrganizationDecisionStatus;
  allow: boolean;
  organization: PublicEmployerOrganization | null;
  membership: PublicOrganizationMembership | null;
  roles: readonly AuthorizationRoleKey[];
  internalReason: string | null;
  externalCode: typeof authorizationDeniedCode | null;
  externalMessage: typeof authorizationDeniedMessage | null;
}

export interface CreateEmployerOrganizationInput {
  actorUserId: string;
  legalName: string;
  displayName: string;
  correlationId?: string;
}

export interface UpdateEmployerOrganizationInput {
  actorUserId: string;
  organizationId: string;
  expectedVersion: string;
  legalName?: string | null;
  displayName?: string | null;
  correlationId?: string;
}

export interface EmployerOrganizationRepository {
  findOrganizationById(organizationId: string): Promise<StoredEmployerOrganization | null>;
  findOrganizationByPublicId(publicId: string): Promise<StoredEmployerOrganization | null>;
  createOrganizationWithOwnerMembership(input: {
    publicId: string;
    legalName: string;
    displayName: string;
    actorUserId: string;
    ownerRoleKey: AuthorizationRoleKey;
    correlationId: string;
    now: Date;
  }): Promise<{ organization: StoredEmployerOrganization; membership: StoredOrganizationMembership }>;
  updateOrganization(input: {
    organizationId: string;
    expectedUpdatedAt: Date;
    legalName?: string | undefined;
    displayName?: string | undefined;
    actorUserId: string;
    now: Date;
  }): Promise<StoredEmployerOrganization | null>;
  updateOrganizationStatus(input: {
    organizationId: string;
    expectedUpdatedAt: Date;
    status: EmployerOrganizationStatus;
    actorUserId: string;
    now: Date;
  }): Promise<StoredEmployerOrganization | null>;
  recordOrganizationAuditEvent(input: {
    action:
      | "organization.created"
      | "organization.updated"
      | "organization.suspended"
      | "organization.reactivated"
      | "organization.closed"
      | "organization.access_denied";
    organizationId: string | null;
    actorUserId: string | null;
    priorState: string | null;
    newState: string | null;
    reason: string | null;
    correlationId: string;
    createdAt: Date;
  }): Promise<void>;
}

export class EmployerOrganizationError extends Error {
  decision: EmployerOrganizationDecision;

  constructor(decision: EmployerOrganizationDecision) {
    super(authorizationDeniedMessage);
    this.name = "EmployerOrganizationError";
    this.decision = decision;
  }
}

export type ResidenceStatus = "draft" | "active" | "restricted" | "inactive" | "closed";
export type ResidenceDecisionStatus =
  | "allow"
  | "invalid_input"
  | "not_found"
  | "membership_denied"
  | "permission_denied"
  | "organization_inactive"
  | "residence_inactive"
  | "version_conflict"
  | "invalid_transition"
  | "audit_failed";

export interface StoredResidence {
  id: string;
  publicId: string;
  organizationId: string;
  name: string;
  status: ResidenceStatus;
  addressSummary: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}

export interface PublicResidence {
  id: string;
  publicId: string;
  organizationId: string;
  name: string;
  status: ResidenceStatus;
  addressSummary: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
  version: string;
}

export interface ResidenceDecision {
  status: ResidenceDecisionStatus;
  allow: boolean;
  residence: PublicResidence | null;
  organization: PublicEmployerOrganization | null;
  membership: PublicOrganizationMembership | null;
  roles: readonly AuthorizationRoleKey[];
  internalReason: string | null;
  externalCode: typeof authorizationDeniedCode | null;
  externalMessage: typeof authorizationDeniedMessage | null;
}

export interface CreateResidenceInput {
  actorUserId: string;
  organizationId: string;
  name: string;
  addressSummary?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  correlationId?: string;
}

export interface UpdateResidenceInput {
  actorUserId: string;
  organizationId: string;
  residenceId: string;
  expectedVersion: string;
  name?: string | null;
  addressSummary?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  correlationId?: string;
}

export interface ResidenceRepository {
  findResidenceById(residenceId: string): Promise<StoredResidence | null>;
  listResidencesByOrganization(input: { organizationId: string; status?: ResidenceStatus | null }): Promise<StoredResidence[]>;
  createResidence(input: {
    publicId: string;
    organizationId: string;
    name: string;
    addressSummary: string | null;
    city: string | null;
    region: string | null;
    country: string | null;
    actorUserId: string;
    correlationId: string;
    now: Date;
  }): Promise<StoredResidence>;
  updateResidence(input: {
    residenceId: string;
    organizationId: string;
    expectedUpdatedAt: Date;
    name?: string | undefined;
    addressSummary?: string | null | undefined;
    city?: string | null | undefined;
    region?: string | null | undefined;
    country?: string | null | undefined;
    actorUserId: string;
    now: Date;
  }): Promise<StoredResidence | null>;
  updateResidenceStatus(input: {
    residenceId: string;
    organizationId: string;
    expectedUpdatedAt: Date;
    status: Extract<ResidenceStatus, "active" | "inactive" | "closed">;
    actorUserId: string;
    now: Date;
  }): Promise<StoredResidence | null>;
  recordResidenceAuditEvent(input: {
    action:
      | "residence.created"
      | "residence.updated"
      | "residence.inactivated"
      | "residence.reactivated"
      | "residence.closed"
      | "residence.access_denied";
    organizationId: string | null;
    residenceId: string | null;
    actorUserId: string | null;
    priorState: string | null;
    newState: string | null;
    reason: string | null;
    correlationId: string;
    createdAt: Date;
  }): Promise<void>;
}

export class ResidenceError extends Error {
  decision: ResidenceDecision;

  constructor(decision: ResidenceDecision) {
    super(authorizationDeniedMessage);
    this.name = "ResidenceError";
    this.decision = decision;
  }
}

export class AuthorizationDeniedError extends Error {
  code = authorizationDeniedCode;
  decision: AuthorizationDecision;

  constructor(decision: AuthorizationDecision) {
    super(authorizationDeniedMessage);
    this.name = "AuthorizationDeniedError";
    this.decision = decision;
  }
}

export const authorizationPermissionDefinitions = [
  permission(
    "organization.read",
    "Read organization summary records within an organization context.",
    "organization",
    "active",
    "May expose organization information if context is not enforced.",
    "Deny without organization context."
  ),
  permission(
    "organization.update",
    "Update organization summary records within an organization context.",
    "organization",
    "active",
    "Could alter organization data if granted outside ownership controls.",
    "Organization Owner only in matrix."
  ),
  permission(
    "residence.read",
    "Read residence records within an organization context.",
    "organization",
    "active",
    "May expose location or facility details.",
    "Deny without organization context."
  ),
  permission(
    "residence.create",
    "Create residence records within an organization context.",
    "organization",
    "active",
    "Could create operational locations before organization membership exists.",
    "Mapped only to approved organization roles."
  ),
  permission(
    "residence.update",
    "Update residence records within an organization context.",
    "organization",
    "active",
    "Could alter residence operating details.",
    "Mapped only to approved organization roles."
  ),
  permission(
    "department.read",
    "Read department records within a future organization context.",
    "organization",
    "reserved",
    "May expose operating structure.",
    "Deny without organization context; no active department API."
  ),
  permission(
    "department.create",
    "Create department records within a future organization context.",
    "organization",
    "reserved",
    "Could create operational units before membership controls exist.",
    "Mapped only to approved organization roles; no active endpoint."
  ),
  permission(
    "department.update",
    "Update department records within a future organization context.",
    "organization",
    "reserved",
    "Could alter operating units.",
    "Mapped only to approved organization roles; no active endpoint."
  ),
  permission(
    "work_group.read",
    "Read the approved work group catalogue.",
    "none",
    "reserved",
    "Low risk, but catalogue APIs are not active in this phase.",
    "Role matrix may include it; no active endpoint."
  ),
  permission(
    "role_definition.read",
    "Read the approved operational role definition catalogue.",
    "none",
    "reserved",
    "Low risk, but catalogue APIs are not active in this phase.",
    "Role matrix may include it; no active endpoint."
  ),
  permission(
    "job_request.create",
    "Create future job requests within a future organization context.",
    "organization",
    "reserved",
    "Could create commercial demand if activated too early.",
    "Reserved until Job Request Foundation."
  ),
  permission(
    "job_request.read",
    "Read future job requests within a future organization context.",
    "organization",
    "reserved",
    "May expose commercial staffing demand.",
    "Reserved until Job Request Foundation."
  ),
  permission(
    "job_request.update_draft",
    "Update future draft job requests within a future organization context.",
    "organization",
    "reserved",
    "Could alter commercial demand.",
    "Reserved until Job Request Foundation."
  ),
  permission(
    "job_request.submit",
    "Submit future job requests for admin review.",
    "organization",
    "reserved",
    "Could trigger operational review before workflow exists.",
    "Reserved until Job Request Foundation."
  ),
  permission(
    "job_request.cancel",
    "Cancel future job requests within a future organization context.",
    "organization",
    "reserved",
    "Could alter commercial demand.",
    "Reserved until Job Request Foundation."
  ),
  permission(
    "job_request.admin_review",
    "Perform future platform job request review.",
    "platform",
    "reserved",
    "Could approve operational dispatch if activated too early.",
    "Platform Administrator only; reserved until admin intake."
  ),
  permission(
    "job_request.request_information",
    "Request future job request information from an employer.",
    "platform",
    "reserved",
    "Could affect employer workflow if activated too early.",
    "Platform Administrator only; reserved until admin intake."
  ),
  permission(
    "job_request.approve_for_dispatch",
    "Approve future job requests for dispatch.",
    "platform",
    "reserved",
    "Could move staffing demand into dispatch if activated too early.",
    "Platform Administrator only; reserved until dispatch."
  ),
  permission(
    "audit.read",
    "Read future audit summaries.",
    "platform",
    "reserved",
    "Could expose sensitive operational history.",
    "Platform Administrator only; no audit API yet."
  ),
  permission(
    "platform.supervise",
    "Access explicit platform-supervision capability probes.",
    "platform",
    "active",
    "High privilege and must never be inferred.",
    "Platform Administrator allowed; organization roles denied."
  )
] as const satisfies readonly AuthorizationPermissionDefinition[];

export const authorizationRoleDefinitions = [
  roleDefinition("PLATFORM_ADMINISTRATOR", "Platform Administrator", "platform", [
    "platform.supervise",
    "job_request.admin_review",
    "job_request.request_information",
    "job_request.approve_for_dispatch",
    "audit.read"
  ]),
  roleDefinition("ORGANIZATION_OWNER", "Organization Owner", "organization", [
    "organization.read",
    "organization.update",
    "residence.read",
    "residence.create",
    "residence.update",
    "department.read",
    "department.create",
    "department.update",
    "work_group.read",
    "role_definition.read",
    "job_request.create",
    "job_request.read",
    "job_request.update_draft",
    "job_request.submit",
    "job_request.cancel"
  ]),
  roleDefinition("ORGANIZATION_ADMINISTRATOR", "Organization Administrator", "organization", [
    "organization.read",
    "residence.read",
    "residence.create",
    "residence.update",
    "department.read",
    "department.create",
    "department.update",
    "work_group.read",
    "role_definition.read",
    "job_request.create",
    "job_request.read",
    "job_request.update_draft",
    "job_request.submit",
    "job_request.cancel"
  ]),
  roleDefinition("ORGANIZATION_STAFF", "Organization Staff", "organization", [
    "organization.read",
    "residence.read",
    "department.read",
    "work_group.read",
    "role_definition.read",
    "job_request.create",
    "job_request.read",
    "job_request.update_draft",
    "job_request.submit",
    "job_request.cancel"
  ]),
  roleDefinition("WORKER_ACCESS", "Worker Access", "none", []),
  roleDefinition("DISPATCHER", "Dispatcher", "platform", [])
] as const satisfies readonly AuthorizationRoleDefinition[];

export function createAuthorizationService(auditSink?: AuthorizationAuditSink) {
  return {
    async decide(input: AuthorizationDecisionInput): Promise<AuthorizationDecision> {
      const decision = createAuthorizationDecision(input);

      if (!decision.allow && isSensitiveAuthorizationDenial(decision)) {
        await auditSink?.recordAuthorizationAuditEvent({
          action: "authorization.denied",
          userId: input.session.user?.id ?? null,
          permission: input.permission,
          reason: decision.internalReason ?? "denied",
          correlationId: decision.correlationId
        });
      }

      if (decision.allow && input.permission === "platform.supervise") {
        await auditSink?.recordAuthorizationAuditEvent({
          action: "authorization.platform_supervision",
          userId: input.session.user?.id ?? null,
          permission: input.permission,
          reason: "platform_supervision_allowed",
          correlationId: decision.correlationId
        });
      }

      return decision;
    },

    async assertAllowed(input: AuthorizationDecisionInput) {
      const decision = await this.decide(input);

      if (!decision.allow) {
        throw new AuthorizationDeniedError(decision);
      }

      return decision;
    },

    rolePermissions(role: AuthorizationRoleKey) {
      return getAuthorizationRole(role)?.permissions ?? [];
    }
  };
}

export type AuthorizationService = ReturnType<typeof createAuthorizationService>;

export function createAuthorizationDecision(input: AuthorizationDecisionInput): AuthorizationDecision {
  const roles = sanitizeAuthorizationRoles(input.roles ?? []);
  const permissionDefinition = getAuthorizationPermission(input.permission);
  const correlationId = input.correlationId ?? createAuthorizationCorrelationId();

  if (!input.session.authenticated || !input.session.user || !input.session.session) {
    return deny("session_invalid", "session_invalid", input.permission, roles, correlationId);
  }

  if (input.session.user.status === "disabled" || input.session.user.status === "closed") {
    return deny("account_inactive", `account_${input.session.user.status}`, input.permission, roles, correlationId);
  }

  if (!permissionDefinition) {
    return deny("permission_missing", "unknown_permission", input.permission, roles, correlationId);
  }

  if (roles.length === 0) {
    return deny("permission_missing", "no_role", input.permission, roles, correlationId);
  }

  if (permissionDefinition.context === "organization" && !input.resourceContext?.organizationId) {
    return deny("context_required", "organization_context_required", input.permission, roles, correlationId);
  }

  if (permissionDefinition.context === "platform" && input.platformContext?.platform !== true) {
    return deny("context_required", "platform_context_required", input.permission, roles, correlationId);
  }

  const permissions = new Set(
    roles.flatMap((role) => getAuthorizationRole(role)?.permissions ?? [])
  );

  if (!permissions.has(permissionDefinition.key)) {
    return deny("permission_missing", "role_lacks_permission", input.permission, roles, correlationId);
  }

  if (permissionDefinition.lifecycle === "reserved") {
    return deny("deny", "permission_reserved_for_future_service", input.permission, roles, correlationId);
  }

  return {
    status: "allow",
    allow: true,
    externalCode: null,
    externalMessage: null,
    internalReason: null,
    permission: input.permission,
    roles,
    correlationId
  };
}

export function toSafeAuthorizationResponse(decision: AuthorizationDecision) {
  if (decision.allow) {
    return {
      authorized: true
    };
  }

  return {
    authorized: false,
    error: authorizationDeniedCode,
    message: authorizationDeniedMessage
  };
}

export function createOrganizationMembershipService(
  repository: OrganizationMembershipRepository,
  options: { now?: () => Date } = {}
) {
  const now = options.now ?? (() => new Date());

  return {
    async inviteMembership(input: InviteMembershipInput) {
      const currentTime = now();
      const existingMembership = await repository.findMembershipForUserByOrganization(input.userId, input.organizationId);

      if (existingMembership) {
        const decision = membershipDeny("duplicate_membership", "duplicate_membership", null, input.organizationId, []);
        await auditMembershipDenial(repository, {
          decision,
          userId: input.userId,
          actorUserId: input.invitedByUserId,
          correlationId: input.correlationId,
          createdAt: currentTime
        });
        throw new OrganizationMembershipError(decision);
      }

      const membership = await repository.createMembership({
        organizationId: input.organizationId,
        userId: input.userId,
        invitedByUserId: input.invitedByUserId,
        accessRoleKeys: input.accessRoleKeys,
        expiresAt: input.expiresAt ?? null,
        now: currentTime
      });
      await recordMembershipAudit(repository, {
        action: "membership.invited",
        membershipId: membership.id,
        organizationId: membership.organizationId,
        userId: membership.userId,
        actorUserId: input.invitedByUserId,
        reason: null,
        priorState: null,
        newState: "invited",
        correlationId: input.correlationId,
        createdAt: currentTime
      });

      return toPublicMembership(membership);
    },

    async listMemberships(userId: string) {
      return (await repository.listMembershipsForUser(userId)).map(toPublicMembership);
    },

    async getMembership(userId: string, membershipId: string) {
      const membership = await repository.findMembershipById(membershipId);

      if (!membership || membership.userId !== userId) {
        return null;
      }

      return toPublicMembership(membership);
    },

    async activateMembership(input: { userId: string; membershipId: string; actorUserId: string; correlationId?: string }) {
      const membership = await assertMembershipBelongsToUser(repository, input.userId, input.membershipId);
      const currentTime = now();
      const updated = await repository.updateMembershipStatus({
        membershipId: membership.id,
        status: "active",
        actorUserId: input.actorUserId,
        now: currentTime
      });
      await recordMembershipAudit(repository, {
        action: "membership.activated",
        membershipId: membership.id,
        organizationId: membership.organizationId,
        userId: membership.userId,
        actorUserId: input.actorUserId,
        reason: null,
        priorState: membership.status,
        newState: "active",
        correlationId: input.correlationId,
        createdAt: currentTime
      });

      return toPublicMembership(updated);
    },

    async suspendMembership(input: { userId: string; membershipId: string; actorUserId: string; correlationId?: string }) {
      return updateMembershipLifecycle(repository, {
        ...input,
        status: "suspended",
        auditAction: "membership.suspended",
        now: now()
      });
    },

    async revokeMembership(input: { userId: string; membershipId: string; actorUserId: string; correlationId?: string }) {
      return updateMembershipLifecycle(repository, {
        ...input,
        status: "revoked",
        auditAction: "membership.revoked",
        now: now()
      });
    },

    async expireMembership(input: { userId: string; membershipId: string; actorUserId: string | null; correlationId?: string }) {
      return updateMembershipLifecycle(repository, {
        ...input,
        status: "expired",
        auditAction: "membership.expired",
        now: now()
      });
    },

    async changeMembershipRoles(input: {
      userId: string;
      membershipId: string;
      actorUserId: string;
      accessRoleKeys: readonly AuthorizationRoleKey[];
      correlationId?: string;
    }) {
      const membership = await assertMembershipBelongsToUser(repository, input.userId, input.membershipId);
      const currentTime = now();
      const updated = await repository.replaceMembershipRoles({
        membershipId: membership.id,
        accessRoleKeys: input.accessRoleKeys,
        actorUserId: input.actorUserId,
        now: currentTime
      });
      await recordMembershipAudit(repository, {
        action: "membership.access_role_changed",
        membershipId: membership.id,
        organizationId: membership.organizationId,
        userId: membership.userId,
        actorUserId: input.actorUserId,
        reason: null,
        priorState: membershipRoleKeys(membership).join(","),
        newState: input.accessRoleKeys.join(","),
        correlationId: input.correlationId,
        createdAt: currentTime
      });

      return toPublicMembership(updated);
    },

    async selectOrganizationContext(input: {
      userId: string;
      organizationId?: string | null;
      correlationId?: string;
    }): Promise<OrganizationMembershipDecision> {
      const currentTime = now();

      if (!input.organizationId) {
        const decision = membershipDeny("context_required", "organization_context_required", null, null, []);
        await auditMembershipDenial(repository, {
          decision,
          userId: input.userId,
          actorUserId: input.userId,
          correlationId: input.correlationId,
          createdAt: currentTime
        });
        return decision;
      }

      const membership = await repository.findMembershipForUserByOrganization(input.userId, input.organizationId);

      if (!membership) {
        const decision = membershipDeny("membership_missing", "membership_not_found", null, input.organizationId, []);
        await auditMembershipDenial(repository, {
          decision,
          userId: input.userId,
          actorUserId: input.userId,
          correlationId: input.correlationId,
          createdAt: currentTime
        });
        return decision;
      }

      const decision = evaluateMembershipForContext(membership, currentTime);

      if (!decision.allow) {
        await auditMembershipDenial(repository, {
          decision,
          userId: input.userId,
          actorUserId: input.userId,
          correlationId: input.correlationId,
          createdAt: currentTime
        });
        return decision;
      }

      await recordMembershipAudit(repository, {
        action: "membership.context_selected",
        membershipId: membership.id,
        organizationId: membership.organizationId,
        userId: membership.userId,
        actorUserId: input.userId,
        reason: null,
        priorState: null,
        newState: "context_selected",
        correlationId: input.correlationId,
        createdAt: currentTime
      });

      return decision;
    }
  };
}

export type OrganizationMembershipService = ReturnType<typeof createOrganizationMembershipService>;

export function createEmployerOrganizationService(
  repository: EmployerOrganizationRepository,
  membershipService: OrganizationMembershipService,
  authorizationService: AuthorizationService,
  options: { now?: () => Date } = {}
) {
  const now = options.now ?? (() => new Date());

  return {
    async createOrganization(input: CreateEmployerOrganizationInput) {
      const currentTime = now();
      const correlationId = input.correlationId ?? createOrganizationCorrelationId();
      const legalName = normalizeOrganizationName(input.legalName);
      const displayName = normalizeOrganizationName(input.displayName);

      if (!legalName || !displayName) {
        const decision = organizationDeny("invalid_input", "invalid_organization_name", null, null, []);
        await auditOrganizationDenial(repository, {
          decision,
          actorUserId: input.actorUserId,
          correlationId,
          createdAt: currentTime
        });
        throw new EmployerOrganizationError(decision);
      }

      try {
        const created = await repository.createOrganizationWithOwnerMembership({
          publicId: createPublicOrganizationId(),
          legalName,
          displayName,
          actorUserId: input.actorUserId,
          ownerRoleKey: "ORGANIZATION_OWNER",
          correlationId,
          now: currentTime
        });

        return {
          organization: toPublicOrganization(created.organization),
          membership: toPublicMembership(created.membership),
          organizationContext: {
            organizationId: created.organization.id,
            roles: membershipRoleKeys(created.membership)
          }
        };
      } catch (error) {
        const decision = organizationDeny(
          error instanceof Error && error.message === "RWOS_ORGANIZATION_DUPLICATE"
            ? "duplicate_organization"
            : "bootstrap_failed",
          error instanceof Error ? error.message : "organization_bootstrap_failed",
          null,
          null,
          []
        );
        await auditOrganizationDenial(repository, {
          decision,
          actorUserId: input.actorUserId,
          correlationId,
          createdAt: currentTime
        });
        throw new EmployerOrganizationError(decision);
      }
    },

    async getOrganization(input: { actorUserId: string; organizationId: string; correlationId?: string }) {
      const organization = await repository.findOrganizationById(input.organizationId);
      const decision = await authorizeOrganizationOperation({
        repository,
        membershipService,
        authorizationService,
        actorUserId: input.actorUserId,
        organization,
        organizationId: input.organizationId,
        permission: "organization.read",
        correlationId: input.correlationId,
        now: now()
      });

      if (!decision.allow || !decision.organization) {
        throw new EmployerOrganizationError(decision);
      }

      return decision.organization;
    },

    async getOrganizationStatus(input: { actorUserId: string; organizationId: string; correlationId?: string }) {
      return this.getOrganization(input);
    },

    async updateOrganization(input: UpdateEmployerOrganizationInput) {
      const currentTime = now();
      const organization = await repository.findOrganizationById(input.organizationId);
      const decision = await authorizeOrganizationOperation({
        repository,
        membershipService,
        authorizationService,
        actorUserId: input.actorUserId,
        organization,
        organizationId: input.organizationId,
        permission: "organization.update",
        correlationId: input.correlationId,
        now: currentTime
      });

      if (!decision.allow || !decision.organization) {
        throw new EmployerOrganizationError(decision);
      }

      const legalName = input.legalName === undefined || input.legalName === null ? undefined : normalizeOrganizationName(input.legalName);
      const displayName =
        input.displayName === undefined || input.displayName === null ? undefined : normalizeOrganizationName(input.displayName);

      if ((input.legalName != null && !legalName) || (input.displayName != null && !displayName)) {
        throw new EmployerOrganizationError(
          organizationDeny("invalid_input", "invalid_organization_name", decision.organization, decision.membership, decision.roles)
        );
      }

      const expectedUpdatedAt = parseOrganizationVersion(input.expectedVersion);

      if (!expectedUpdatedAt) {
        throw new EmployerOrganizationError(
          organizationDeny("version_conflict", "invalid_version", decision.organization, decision.membership, decision.roles)
        );
      }

      const updated = await repository.updateOrganization({
        organizationId: input.organizationId,
        expectedUpdatedAt,
        legalName,
        displayName,
        actorUserId: input.actorUserId,
        now: currentTime
      });

      if (!updated) {
        throw new EmployerOrganizationError(
          organizationDeny("version_conflict", "stale_version", decision.organization, decision.membership, decision.roles)
        );
      }

      await recordOrganizationAudit(repository, {
        action: "organization.updated",
        organizationId: updated.id,
        actorUserId: input.actorUserId,
        priorState: organization?.status ?? null,
        newState: updated.status,
        reason: null,
        correlationId: input.correlationId,
        createdAt: currentTime
      });

      return toPublicOrganization(updated);
    },

    async updateOrganizationStatus(input: {
      actorUserId: string;
      organizationId: string;
      expectedVersion: string;
      status: Extract<EmployerOrganizationStatus, "active" | "suspended" | "closed">;
      correlationId?: string;
    }) {
      const currentTime = now();
      const organization = await repository.findOrganizationById(input.organizationId);
      const decision = await authorizeOrganizationOperation({
        repository,
        membershipService,
        authorizationService,
        actorUserId: input.actorUserId,
        organization,
        organizationId: input.organizationId,
        permission: "organization.update",
        correlationId: input.correlationId,
        now: currentTime,
        allowInactiveSelfStatusChange: true
      });

      if (!decision.allow || !decision.organization) {
        throw new EmployerOrganizationError(decision);
      }

      const expectedUpdatedAt = parseOrganizationVersion(input.expectedVersion);

      if (!expectedUpdatedAt) {
        throw new EmployerOrganizationError(
          organizationDeny("version_conflict", "invalid_version", decision.organization, decision.membership, decision.roles)
        );
      }

      const updated = await repository.updateOrganizationStatus({
        organizationId: input.organizationId,
        expectedUpdatedAt,
        status: input.status,
        actorUserId: input.actorUserId,
        now: currentTime
      });

      if (!updated) {
        throw new EmployerOrganizationError(
          organizationDeny("version_conflict", "stale_version", decision.organization, decision.membership, decision.roles)
        );
      }

      await recordOrganizationAudit(repository, {
        action:
          input.status === "suspended"
            ? "organization.suspended"
            : input.status === "closed"
              ? "organization.closed"
              : "organization.reactivated",
        organizationId: updated.id,
        actorUserId: input.actorUserId,
        priorState: organization?.status ?? null,
        newState: updated.status,
        reason: null,
        correlationId: input.correlationId,
        createdAt: currentTime
      });

      return toPublicOrganization(updated);
    }
  };
}

export type EmployerOrganizationService = ReturnType<typeof createEmployerOrganizationService>;

export function createResidenceService(
  residenceRepository: ResidenceRepository,
  organizationRepository: EmployerOrganizationRepository,
  membershipService: OrganizationMembershipService,
  authorizationService: AuthorizationService,
  options: { now?: () => Date } = {}
) {
  const now = options.now ?? (() => new Date());

  return {
    async createResidence(input: CreateResidenceInput) {
      const currentTime = now();
      const correlationId = input.correlationId ?? createResidenceCorrelationId();
      const name = normalizeResidenceText(input.name, 2, 160);
      const addressSummary = normalizeOptionalResidenceText(input.addressSummary, 240);
      const city = normalizeOptionalResidenceText(input.city, 120);
      const region = normalizeOptionalResidenceText(input.region, 120);
      const country = normalizeOptionalResidenceText(input.country, 80);

      if (!name) {
        const decision = residenceDeny("invalid_input", "invalid_residence_name", null, null, null, []);
        await auditResidenceDenial(residenceRepository, {
          decision,
          actorUserId: input.actorUserId,
          correlationId,
          createdAt: currentTime
        });
        throw new ResidenceError(decision);
      }

      const authorization = await authorizeResidenceOperation({
        residenceRepository,
        organizationRepository,
        membershipService,
        authorizationService,
        actorUserId: input.actorUserId,
        organizationId: input.organizationId,
        residence: null,
        permission: "residence.create",
        correlationId,
        now: currentTime
      });

      if (!authorization.allow) {
        throw new ResidenceError(authorization);
      }

      try {
        const residence = await residenceRepository.createResidence({
          publicId: createPublicResidenceId(),
          organizationId: input.organizationId,
          name,
          addressSummary,
          city,
          region,
          country,
          actorUserId: input.actorUserId,
          correlationId,
          now: currentTime
        });

        return toPublicResidence(residence);
      } catch (error) {
        const decision = residenceDeny(
          "audit_failed",
          error instanceof Error ? error.message : "residence_create_failed",
          null,
          authorization.organization,
          authorization.membership,
          authorization.roles
        );
        await auditResidenceDenial(residenceRepository, {
          decision,
          actorUserId: input.actorUserId,
          correlationId,
          createdAt: currentTime
        });
        throw new ResidenceError(decision);
      }
    },

    async getResidence(input: { actorUserId: string; organizationId: string; residenceId: string; correlationId?: string }) {
      const currentTime = now();
      const residence = await residenceRepository.findResidenceById(input.residenceId);
      const authorization = await authorizeResidenceOperation({
        residenceRepository,
        organizationRepository,
        membershipService,
        authorizationService,
        actorUserId: input.actorUserId,
        organizationId: input.organizationId,
        residence,
        permission: "residence.read",
        correlationId: input.correlationId,
        now: currentTime,
        allowInactiveResidenceRead: true
      });

      if (!authorization.allow || !authorization.residence) {
        throw new ResidenceError(authorization);
      }

      return authorization.residence;
    },

    async listResidences(input: { actorUserId: string; organizationId: string; status?: ResidenceStatus | null; correlationId?: string }) {
      const currentTime = now();
      const authorization = await authorizeResidenceOperation({
        residenceRepository,
        organizationRepository,
        membershipService,
        authorizationService,
        actorUserId: input.actorUserId,
        organizationId: input.organizationId,
        residence: null,
        permission: "residence.read",
        correlationId: input.correlationId,
        now: currentTime,
        allowInactiveResidenceRead: true
      });

      if (!authorization.allow) {
        throw new ResidenceError(authorization);
      }

      const status = input.status && residenceStatuses.includes(input.status) ? input.status : null;

      return (await residenceRepository.listResidencesByOrganization({ organizationId: input.organizationId, status })).map(toPublicResidence);
    },

    async updateResidence(input: UpdateResidenceInput) {
      const currentTime = now();
      const residence = await residenceRepository.findResidenceById(input.residenceId);
      const authorization = await authorizeResidenceOperation({
        residenceRepository,
        organizationRepository,
        membershipService,
        authorizationService,
        actorUserId: input.actorUserId,
        organizationId: input.organizationId,
        residence,
        permission: "residence.update",
        correlationId: input.correlationId,
        now: currentTime
      });

      if (!authorization.allow || !authorization.residence) {
        throw new ResidenceError(authorization);
      }

      const name = input.name == null ? undefined : normalizeResidenceText(input.name, 2, 160);
      const addressSummary = input.addressSummary === undefined ? undefined : normalizeOptionalResidenceText(input.addressSummary, 240);
      const city = input.city === undefined ? undefined : normalizeOptionalResidenceText(input.city, 120);
      const region = input.region === undefined ? undefined : normalizeOptionalResidenceText(input.region, 120);
      const country = input.country === undefined ? undefined : normalizeOptionalResidenceText(input.country, 80);

      if (input.name != null && !name) {
        throw new ResidenceError(
          residenceDeny("invalid_input", "invalid_residence_name", authorization.residence, authorization.organization, authorization.membership, authorization.roles)
        );
      }

      const expectedUpdatedAt = parseResidenceVersion(input.expectedVersion);

      if (!expectedUpdatedAt) {
        throw new ResidenceError(
          residenceDeny("version_conflict", "invalid_version", authorization.residence, authorization.organization, authorization.membership, authorization.roles)
        );
      }

      const updated = await residenceRepository.updateResidence({
        residenceId: input.residenceId,
        organizationId: input.organizationId,
        expectedUpdatedAt,
        name,
        addressSummary,
        city,
        region,
        country,
        actorUserId: input.actorUserId,
        now: currentTime
      });

      if (!updated) {
        throw new ResidenceError(
          residenceDeny("version_conflict", "stale_version", authorization.residence, authorization.organization, authorization.membership, authorization.roles)
        );
      }

      await recordResidenceAudit(residenceRepository, {
        action: "residence.updated",
        organizationId: input.organizationId,
        residenceId: updated.id,
        actorUserId: input.actorUserId,
        priorState: residence?.status ?? null,
        newState: updated.status,
        reason: null,
        correlationId: input.correlationId,
        createdAt: currentTime
      });

      return toPublicResidence(updated);
    },

    async updateResidenceStatus(input: {
      actorUserId: string;
      organizationId: string;
      residenceId: string;
      expectedVersion: string;
      status: Extract<ResidenceStatus, "active" | "inactive" | "closed">;
      reason: string;
      correlationId?: string;
    }) {
      const currentTime = now();
      const residence = await residenceRepository.findResidenceById(input.residenceId);
      const authorization = await authorizeResidenceOperation({
        residenceRepository,
        organizationRepository,
        membershipService,
        authorizationService,
        actorUserId: input.actorUserId,
        organizationId: input.organizationId,
        residence,
        permission: "residence.update",
        correlationId: input.correlationId,
        now: currentTime,
        allowInactiveResidenceStatusChange: true
      });

      if (!authorization.allow || !authorization.residence || !residence) {
        throw new ResidenceError(authorization);
      }

      if (!isAllowedResidenceTransition(residence.status, input.status)) {
        throw new ResidenceError(
          residenceDeny("invalid_transition", "invalid_residence_status_transition", authorization.residence, authorization.organization, authorization.membership, authorization.roles)
        );
      }

      const expectedUpdatedAt = parseResidenceVersion(input.expectedVersion);

      if (!expectedUpdatedAt) {
        throw new ResidenceError(
          residenceDeny("version_conflict", "invalid_version", authorization.residence, authorization.organization, authorization.membership, authorization.roles)
        );
      }

      const updated = await residenceRepository.updateResidenceStatus({
        residenceId: input.residenceId,
        organizationId: input.organizationId,
        expectedUpdatedAt,
        status: input.status,
        actorUserId: input.actorUserId,
        now: currentTime
      });

      if (!updated) {
        throw new ResidenceError(
          residenceDeny("version_conflict", "stale_version", authorization.residence, authorization.organization, authorization.membership, authorization.roles)
        );
      }

      await recordResidenceAudit(residenceRepository, {
        action: input.status === "inactive" ? "residence.inactivated" : input.status === "closed" ? "residence.closed" : "residence.reactivated",
        organizationId: input.organizationId,
        residenceId: updated.id,
        actorUserId: input.actorUserId,
        priorState: residence.status,
        newState: updated.status,
        reason: normalizeOptionalResidenceText(input.reason, 240),
        correlationId: input.correlationId,
        createdAt: currentTime
      });

      return toPublicResidence(updated);
    }
  };
}

export type ResidenceService = ReturnType<typeof createResidenceService>;

export const authenticationErrorCode = "RWOS_AUTHENTICATION_FAILED";
export const authenticationErrorMessage = "Authentication failed.";
export const authenticationRequiredCode = "RWOS_AUTHENTICATION_REQUIRED";
export const registrationUnavailableCode = "RWOS_REGISTRATION_UNAVAILABLE";
export const passwordPolicyErrorCode = "RWOS_PASSWORD_REQUIREMENTS_NOT_MET";

const nilEntityId = "00000000-0000-0000-0000-000000000000";
const passwordHashPrefix = "scrypt:v1";
const passwordHashParts = 8;
const sessionTokenByteLength = 32;
const defaultSessionTtlSeconds = 60 * 60 * 8;
const defaultPasswordOptions = {
  costFactor: 16_384,
  blockSize: 8,
  parallelization: 1,
  keyLength: 64,
  saltLength: 16
} as const;
const dummyPasswordHash =
  "scrypt:v1:16384:8:1:64:dGVzdC1kdW1teS1zYWx0LXYx:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

export type AuthenticationUserStatus =
  | "email_verification_pending"
  | "active"
  | "restricted"
  | "disabled"
  | "closed";

export type AuthenticationIdentityProvider = "local_password" | "dev_test" | "future_oauth";
export type AuthenticationSessionStatus = "active" | "expired" | "revoked";
export type AuthenticationAuditSource = "api" | "admin" | "employer" | "worker" | "system";
export type AuthenticationAuditActorType = "user" | "system" | "service";

export interface PasswordHashOptions {
  costFactor?: number;
  blockSize?: number;
  parallelization?: number;
  keyLength?: number;
  saltLength?: number;
}

export interface AuthenticationServiceOptions {
  passwordHashOptions?: PasswordHashOptions;
  sessionTtlSeconds?: number;
  now?: () => Date;
  randomToken?: () => string;
}

export interface StoredAuthenticationIdentity {
  id: string;
  provider: AuthenticationIdentityProvider;
  providerSubject: string;
  passwordHash: string | null;
}

export interface StoredAuthenticationUser {
  id: string;
  publicId: string;
  emailNormalized: string;
  displayName: string | null;
  status: AuthenticationUserStatus;
  identities: StoredAuthenticationIdentity[];
}

export interface StoredAuthenticationSession {
  id: string;
  userId: string;
  sessionHash: string;
  status: AuthenticationSessionStatus;
  expiresAt: Date;
  lastSeenAt: Date | null;
  revokedAt: Date | null;
  user: StoredAuthenticationUser;
}

export interface CreateLocalUserInput {
  publicId: string;
  emailNormalized: string;
  displayName: string | null;
  passwordHash: string;
  now: Date;
}

export interface CreateSessionInput {
  userId: string;
  sessionHash: string;
  expiresAt: Date;
  ipHash: string | null;
  userAgentHash: string | null;
}

export interface UpdateSessionInput {
  sessionId: string;
  status?: AuthenticationSessionStatus | undefined;
  lastSeenAt?: Date | null | undefined;
  revokedAt?: Date | null | undefined;
}

export type AuthenticationAuditAction =
  | "auth.registration"
  | "auth.login_success"
  | "auth.login_failed"
  | "auth.logout"
  | "auth.session_revoked"
  | "auth.session_expired"
  | "auth.account_disabled"
  | "auth.account_closed";

export interface RecordAuthenticationAuditEventInput {
  action: AuthenticationAuditAction;
  actorType: AuthenticationAuditActorType;
  userId: string | null;
  entityId: string | null;
  entityPublicReference: string | null;
  priorState: string | null;
  newState: string | null;
  reason: string | null;
  source: AuthenticationAuditSource;
  correlationId: string;
  createdAt: Date;
}

export interface AuthenticationRepository {
  findUserByEmailNormalized(emailNormalized: string): Promise<StoredAuthenticationUser | null>;
  createLocalUser(input: CreateLocalUserInput): Promise<StoredAuthenticationUser>;
  createSession(input: CreateSessionInput): Promise<StoredAuthenticationSession>;
  findSessionByHash(sessionHash: string): Promise<StoredAuthenticationSession | null>;
  updateSession(input: UpdateSessionInput): Promise<StoredAuthenticationSession | null>;
  recordAuthenticationAuditEvent(input: RecordAuthenticationAuditEventInput): Promise<void>;
}

export interface PublicAuthenticationUser {
  id: string;
  publicId: string;
  emailNormalized: string;
  displayName: string | null;
  status: AuthenticationUserStatus;
}

export interface PublicAuthenticationSession {
  id: string;
  userId: string;
  expiresAt: Date;
}

export interface RegistrationResult {
  user: PublicAuthenticationUser;
  session: PublicAuthenticationSession;
  token: string;
}

export interface SignInResult {
  user: PublicAuthenticationUser;
  session: PublicAuthenticationSession;
  token: string;
}

export interface SessionValidationResult {
  authenticated: boolean;
  user: PublicAuthenticationUser | null;
  session: PublicAuthenticationSession | null;
}

export class AuthenticationError extends Error {
  code = authenticationErrorCode;

  constructor() {
    super(authenticationErrorMessage);
    this.name = "AuthenticationError";
  }
}

export class AuthenticationRequiredError extends Error {
  code = authenticationRequiredCode;

  constructor() {
    super("Authentication required.");
    this.name = "AuthenticationRequiredError";
  }
}

export class RegistrationUnavailableError extends Error {
  code = registrationUnavailableCode;

  constructor() {
    super("Registration unavailable.");
    this.name = "RegistrationUnavailableError";
  }
}

export class PasswordPolicyError extends Error {
  code = passwordPolicyErrorCode;

  constructor() {
    super("Password requirements not met.");
    this.name = "PasswordPolicyError";
  }
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function validatePasswordForRegistration(password: string) {
  return password.length >= 12 && password.length <= 256 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

export async function hashPassword(password: string, options: PasswordHashOptions = {}) {
  if (!validatePasswordForRegistration(password)) {
    throw new PasswordPolicyError();
  }

  const resolved = resolvePasswordHashOptions(options);
  const salt = randomBytes(resolved.saltLength);
  const derivedKey = (await scrypt(password, salt, resolved.keyLength, {
    N: resolved.costFactor,
    r: resolved.blockSize,
    p: resolved.parallelization
  })) as Buffer;

  return [
    passwordHashPrefix,
    resolved.costFactor,
    resolved.blockSize,
    resolved.parallelization,
    resolved.keyLength,
    salt.toString("base64url"),
    derivedKey.toString("base64url")
  ].join(":");
}

export async function verifyPassword(password: string, encodedHash: string | null | undefined) {
  const parsed = parsePasswordHash(encodedHash);

  if (!parsed) {
    await verifyPassword(password, dummyPasswordHash);
    return false;
  }

  const derivedKey = (await scrypt(password, parsed.salt, parsed.keyLength, {
    N: parsed.costFactor,
    r: parsed.blockSize,
    p: parsed.parallelization
  })) as Buffer;

  if (derivedKey.length !== parsed.expectedHash.length) {
    timingSafeEqual(Buffer.alloc(parsed.expectedHash.length), parsed.expectedHash);
    return false;
  }

  return timingSafeEqual(derivedKey, parsed.expectedHash);
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("base64url");
}

export function createSessionToken() {
  return randomBytes(sessionTokenByteLength).toString("base64url");
}

export function createAuthenticationService(
  repository: AuthenticationRepository,
  options: AuthenticationServiceOptions = {}
) {
  const now = options.now ?? (() => new Date());
  const randomToken = options.randomToken ?? createSessionToken;
  const sessionTtlSeconds = options.sessionTtlSeconds ?? defaultSessionTtlSeconds;

  return {
    async register(input: {
      email: string;
      password: string;
      displayName?: string | null;
      source?: AuthenticationAuditSource;
      correlationId?: string;
      ipAddress?: string | null;
      userAgent?: string | null;
    }): Promise<RegistrationResult> {
      const emailNormalized = normalizeEmail(input.email);
      const currentTime = now();
      const existingUser = await repository.findUserByEmailNormalized(emailNormalized);

      if (existingUser) {
        await recordAuthenticationAudit(repository, {
          action: "auth.registration",
          actorType: "system",
          userId: null,
          entityId: null,
          entityPublicReference: null,
          priorState: null,
          newState: null,
          reason: "registration_unavailable",
          source: input.source ?? "api",
          correlationId: input.correlationId,
          createdAt: currentTime
        });
        throw new RegistrationUnavailableError();
      }

      const passwordHash = await hashPassword(input.password, options.passwordHashOptions);
      const user = await repository.createLocalUser({
        publicId: createPublicUserId(),
        emailNormalized,
        displayName: input.displayName ?? null,
        passwordHash,
        now: currentTime
      });
      await recordAuthenticationAudit(repository, {
        action: "auth.registration",
        actorType: "user",
        userId: user.id,
        entityId: user.id,
        entityPublicReference: user.publicId,
        priorState: null,
        newState: user.status,
        reason: null,
        source: input.source ?? "api",
        correlationId: input.correlationId,
        createdAt: currentTime
      });

      const session = await createSessionForUser(repository, user, randomToken, sessionTtlSeconds, currentTime, input);

      return {
        user: toPublicUser(user),
        ...session
      };
    },

    async signIn(input: {
      email: string;
      password: string;
      source?: AuthenticationAuditSource;
      correlationId?: string;
      ipAddress?: string | null;
      userAgent?: string | null;
    }): Promise<SignInResult> {
      const emailNormalized = normalizeEmail(input.email);
      const currentTime = now();
      const user = await repository.findUserByEmailNormalized(emailNormalized);
      const identity = user?.identities.find((candidate) => candidate.provider === "local_password");
      const passwordMatches = await verifyPassword(input.password, identity?.passwordHash);

      if (!user || !identity || !passwordMatches) {
        await recordAuthenticationAudit(repository, {
          action: "auth.login_failed",
          actorType: "system",
          userId: null,
          entityId: null,
          entityPublicReference: null,
          priorState: null,
          newState: null,
          reason: "invalid_credentials",
          source: input.source ?? "api",
          correlationId: input.correlationId,
          createdAt: currentTime
        });
        throw new AuthenticationError();
      }

      if (user.status === "disabled" || user.status === "closed") {
        await recordAuthenticationAudit(repository, {
          action: user.status === "disabled" ? "auth.account_disabled" : "auth.account_closed",
          actorType: "user",
          userId: user.id,
          entityId: user.id,
          entityPublicReference: user.publicId,
          priorState: user.status,
          newState: user.status,
          reason: "login_blocked",
          source: input.source ?? "api",
          correlationId: input.correlationId,
          createdAt: currentTime
        });
        throw new AuthenticationError();
      }

      const session = await createSessionForUser(repository, user, randomToken, sessionTtlSeconds, currentTime, input);
      await recordAuthenticationAudit(repository, {
        action: "auth.login_success",
        actorType: "user",
        userId: user.id,
        entityId: user.id,
        entityPublicReference: user.publicId,
        priorState: null,
        newState: "session_active",
        reason: null,
        source: input.source ?? "api",
        correlationId: input.correlationId,
        createdAt: currentTime
      });

      return {
        user: toPublicUser(user),
        ...session
      };
    },

    async validateSession(token: string | null | undefined): Promise<SessionValidationResult> {
      if (!token) {
        return unauthenticatedSession();
      }

      const currentTime = now();
      const session = await repository.findSessionByHash(hashSessionToken(token));

      if (!session) {
        return unauthenticatedSession();
      }

      if (session.status !== "active") {
        return unauthenticatedSession();
      }

      if (session.expiresAt.getTime() <= currentTime.getTime()) {
        await repository.updateSession({
          sessionId: session.id,
          status: "expired",
          lastSeenAt: currentTime
        });
        await recordAuthenticationAudit(repository, {
          action: "auth.session_expired",
          actorType: "user",
          userId: session.userId,
          entityId: session.userId,
          entityPublicReference: session.user.publicId,
          priorState: "active",
          newState: "expired",
          reason: "session_expired",
          source: "api",
          createdAt: currentTime
        });
        return unauthenticatedSession();
      }

      if (session.user.status === "disabled" || session.user.status === "closed") {
        return unauthenticatedSession();
      }

      await repository.updateSession({
        sessionId: session.id,
        lastSeenAt: currentTime
      });

      return {
        authenticated: true,
        user: toPublicUser(session.user),
        session: toPublicSession(session)
      };
    },

    async revokeSession(input: {
      token: string | null | undefined;
      reason?: string | null;
      source?: AuthenticationAuditSource;
      correlationId?: string;
    }) {
      if (!input.token) {
        return { revoked: false };
      }

      const currentTime = now();
      const session = await repository.findSessionByHash(hashSessionToken(input.token));

      if (!session || session.status !== "active") {
        return { revoked: false };
      }

      await repository.updateSession({
        sessionId: session.id,
        status: "revoked",
        revokedAt: currentTime,
        lastSeenAt: currentTime
      });
      await recordAuthenticationAudit(repository, {
        action: input.reason === "logout" ? "auth.logout" : "auth.session_revoked",
        actorType: "user",
        userId: session.userId,
        entityId: session.userId,
        entityPublicReference: session.user.publicId,
        priorState: "active",
        newState: "revoked",
        reason: input.reason ?? "session_revoked",
        source: input.source ?? "api",
        correlationId: input.correlationId,
        createdAt: currentTime
      });

      return { revoked: true };
    },

    requireAuthenticatedSession(session: SessionValidationResult) {
      if (!session.authenticated || !session.user || !session.session) {
        throw new AuthenticationRequiredError();
      }

      return {
        user: session.user,
        session: session.session
      };
    }
  };
}

export type AuthenticationService = ReturnType<typeof createAuthenticationService>;

type PrismaAuthClient = {
  user: {
    findUnique(args: {
      where: { emailNormalized: string };
      include: { identities: true };
    }): Promise<StoredAuthenticationUser | null>;
    create(args: {
      data: {
        publicId: string;
        emailNormalized: string;
        displayName: string | null;
        status: "active";
        identities: {
          create: {
            provider: "local_password";
            providerSubject: string;
            passwordHash: string;
            passwordUpdatedAt: Date;
          };
        };
      };
      include: { identities: true };
    }): Promise<StoredAuthenticationUser>;
  };
  session: {
    create(args: {
      data: {
        userId: string;
        sessionHash: string;
        expiresAt: Date;
        ipHash: string | null;
        userAgentHash: string | null;
      };
      include: { user: { include: { identities: true } } };
    }): Promise<StoredAuthenticationSession>;
    findUnique(args: {
      where: { sessionHash: string };
      include: { user: { include: { identities: true } } };
    }): Promise<StoredAuthenticationSession | null>;
    update(args: {
      where: { id: string };
      data: {
        status?: AuthenticationSessionStatus | undefined;
        lastSeenAt?: Date | null | undefined;
        revokedAt?: Date | null | undefined;
      };
      include: { user: { include: { identities: true } } };
    }): Promise<StoredAuthenticationSession>;
  };
  auditActorReference: {
    create(args: {
      data: {
        actorType: AuthenticationAuditActorType;
        userId?: string;
        displayLabel: string;
      };
    }): Promise<{ id: string }>;
  };
  auditEvent: {
    create(args: {
      data: {
        actorReferenceId: string;
        entityType: "authentication";
        entityId: string;
        entityPublicReference: string | null;
        action: AuthenticationAuditAction;
        priorState: string | null;
        newState: string | null;
        reason: string | null;
        source: AuthenticationAuditSource;
        correlationId: string;
        policyVersion: string;
        createdAt: Date;
      };
    }): Promise<unknown>;
  };
};

export function createPrismaAuthenticationRepository(prismaClient: unknown): AuthenticationRepository {
  const prisma = prismaClient as PrismaAuthClient;

  return {
    findUserByEmailNormalized(emailNormalized) {
      return prisma.user.findUnique({
        where: { emailNormalized },
        include: { identities: true }
      });
    },

    createLocalUser(input) {
      return prisma.user.create({
        data: {
          publicId: input.publicId,
          emailNormalized: input.emailNormalized,
          displayName: input.displayName,
          status: "active",
          identities: {
            create: {
              provider: "local_password",
              providerSubject: input.emailNormalized,
              passwordHash: input.passwordHash,
              passwordUpdatedAt: input.now
            }
          }
        },
        include: { identities: true }
      });
    },

    createSession(input) {
      return prisma.session.create({
        data: {
          userId: input.userId,
          sessionHash: input.sessionHash,
          expiresAt: input.expiresAt,
          ipHash: input.ipHash,
          userAgentHash: input.userAgentHash
        },
        include: { user: { include: { identities: true } } }
      });
    },

    findSessionByHash(sessionHash) {
      return prisma.session.findUnique({
        where: { sessionHash },
        include: { user: { include: { identities: true } } }
      });
    },

    async updateSession(input) {
      return prisma.session.update({
        where: { id: input.sessionId },
        data: {
          status: input.status,
          lastSeenAt: input.lastSeenAt,
          revokedAt: input.revokedAt
        },
        include: { user: { include: { identities: true } } }
      });
    },

    async recordAuthenticationAuditEvent(input) {
      const actorReference = await prisma.auditActorReference.create({
        data: {
          actorType: input.actorType,
          ...(input.userId ? { userId: input.userId } : {}),
          displayLabel: input.userId ? "Authenticated user" : "Authentication boundary"
        }
      });

      await prisma.auditEvent.create({
        data: {
          actorReferenceId: actorReference.id,
          entityType: "authentication",
          entityId: input.entityId ?? nilEntityId,
          entityPublicReference: input.entityPublicReference,
          action: input.action,
          priorState: input.priorState,
          newState: input.newState,
          reason: input.reason,
          source: input.source,
          correlationId: input.correlationId,
          policyVersion: "auth-foundation-v1",
          createdAt: input.createdAt
        }
      });
    }
  };
}

type PrismaMembershipClient = {
  organizationMembership: {
    findMany(args: {
      where: { userId: string };
      include: typeof membershipInclude;
      orderBy: { createdAt: "asc" };
    }): Promise<StoredOrganizationMembership[]>;
    findUnique(args: { where: { id: string }; include: typeof membershipInclude }): Promise<StoredOrganizationMembership | null>;
    findFirst(args: {
      where: { userId: string; organizationId: string };
      include: typeof membershipInclude;
    }): Promise<StoredOrganizationMembership | null>;
    create(args: {
      data: {
        organizationId: string;
        userId: string;
        invitedByUserId: string | null;
        status: OrganizationMembershipStatus;
        createdAt: Date;
        expiredAt: Date | null;
        membershipRoles: {
          create: { accessRoleDefinitionId: string }[];
        };
      };
      include: typeof membershipInclude;
    }): Promise<StoredOrganizationMembership>;
    update(args: {
      where: { id: string };
      data: {
        status?: OrganizationMembershipStatus | undefined;
        acceptedAt?: Date | null | undefined;
        suspendedAt?: Date | null | undefined;
        revokedAt?: Date | null | undefined;
        expiredAt?: Date | null | undefined;
      };
      include: typeof membershipInclude;
    }): Promise<StoredOrganizationMembership>;
  };
  accessRoleDefinition: {
    findMany(args: { where: { key: { in: readonly AuthorizationRoleKey[] } } }): Promise<{ id: string; key: AuthorizationRoleKey }[]>;
  };
  membershipAccessRole: {
    deleteMany(args: { where: { membershipId: string } }): Promise<unknown>;
    createMany(args: {
      data: { membershipId: string; accessRoleDefinitionId: string; assignedByUserId: string | null }[];
      skipDuplicates: true;
    }): Promise<unknown>;
  };
  auditActorReference: {
    create(args: {
      data: {
        actorType: AuthenticationAuditActorType;
        userId?: string;
        organizationId?: string;
        displayLabel: string;
      };
    }): Promise<{ id: string }>;
  };
  auditEvent: {
    create(args: {
      data: {
        actorReferenceId: string;
        organizationId: string | null;
        entityType: string;
        entityId: string;
        entityPublicReference: string | null;
        action: string;
        priorState: string | null;
        newState: string | null;
        reason: string | null;
        source: "api";
        correlationId: string;
        policyVersion: string;
        createdAt: Date;
      };
    }): Promise<unknown>;
  };
};

const membershipInclude = {
  organization: true,
  membershipRoles: {
    include: {
      accessRole: true
    }
  }
} as const;

export function createPrismaOrganizationMembershipRepository(prismaClient: unknown): OrganizationMembershipRepository {
  const prisma = prismaClient as PrismaMembershipClient;

  return {
    listMembershipsForUser(userId) {
      return prisma.organizationMembership.findMany({
        where: { userId },
        include: membershipInclude,
        orderBy: { createdAt: "asc" }
      });
    },

    findMembershipById(membershipId) {
      return prisma.organizationMembership.findUnique({
        where: { id: membershipId },
        include: membershipInclude
      });
    },

    findMembershipForUserByOrganization(userId, organizationId) {
      return prisma.organizationMembership.findFirst({
        where: { userId, organizationId },
        include: membershipInclude
      });
    },

    async createMembership(input) {
      const accessRoles = await resolveMembershipAccessRoles(prisma, input.accessRoleKeys);

      if (accessRoles.length !== input.accessRoleKeys.length) {
        throw new Error("RWOS_MEMBERSHIP_ACCESS_ROLE_MISSING");
      }

      return prisma.organizationMembership.create({
        data: {
          organizationId: input.organizationId,
          userId: input.userId,
          invitedByUserId: input.invitedByUserId,
          status: "invited",
          createdAt: input.now,
          expiredAt: input.expiresAt,
          membershipRoles: {
            create: accessRoles.map((accessRole) => ({
              accessRoleDefinitionId: accessRole.id
            }))
          }
        },
        include: membershipInclude
      });
    },

    updateMembershipStatus(input) {
      return prisma.organizationMembership.update({
        where: { id: input.membershipId },
        data: membershipStatusUpdate(input.status, input.now),
        include: membershipInclude
      });
    },

    async replaceMembershipRoles(input) {
      const accessRoles = await resolveMembershipAccessRoles(prisma, input.accessRoleKeys);

      if (accessRoles.length !== input.accessRoleKeys.length) {
        throw new Error("RWOS_MEMBERSHIP_ACCESS_ROLE_MISSING");
      }

      await prisma.membershipAccessRole.deleteMany({
        where: { membershipId: input.membershipId }
      });
      await prisma.membershipAccessRole.createMany({
        data: accessRoles.map((accessRole) => ({
          membershipId: input.membershipId,
          accessRoleDefinitionId: accessRole.id,
          assignedByUserId: input.actorUserId
        })),
        skipDuplicates: true
      });

      const updated = await prisma.organizationMembership.findUnique({
        where: { id: input.membershipId },
        include: membershipInclude
      });

      if (!updated) {
        throw new Error("RWOS_MEMBERSHIP_NOT_FOUND");
      }

      return updated;
    },

    async recordMembershipAuditEvent(input) {
      const actorReference = await prisma.auditActorReference.create({
        data: {
          actorType: input.actorUserId ? "user" : "system",
          ...(input.actorUserId ? { userId: input.actorUserId } : {}),
          ...(input.organizationId ? { organizationId: input.organizationId } : {}),
          displayLabel: input.actorUserId ? "Membership actor" : "Membership boundary"
        }
      });

      await prisma.auditEvent.create({
        data: {
          actorReferenceId: actorReference.id,
          organizationId: input.organizationId,
          entityType: "organization_membership",
          entityId: input.membershipId ?? nilEntityId,
          entityPublicReference: input.userId,
          action: input.action,
          priorState: input.priorState,
          newState: input.newState,
          reason: input.reason,
          source: "api",
          correlationId: input.correlationId,
          policyVersion: "organization-membership-foundation-v1",
          createdAt: input.createdAt
        }
      });
    }
  };
}

type PrismaEmployerOrganizationClient = PrismaMembershipClient & {
  $transaction<T>(callback: (transaction: PrismaEmployerOrganizationClient) => Promise<T>): Promise<T>;
  employerOrganization: {
    findUnique(args: { where: { id?: string; publicId?: string } }): Promise<StoredEmployerOrganization | null>;
    findFirst(args: { where: { legalName: string } }): Promise<StoredEmployerOrganization | null>;
    create(args: {
      data: {
        publicId: string;
        legalName: string;
        displayName: string;
        status: EmployerOrganizationStatus;
        createdByUserId: string;
        createdAt: Date;
        updatedAt: Date;
      };
    }): Promise<StoredEmployerOrganization>;
    updateMany(args: {
      where: { id: string; updatedAt: Date };
      data: {
        legalName?: string | undefined;
        displayName?: string | undefined;
        status?: EmployerOrganizationStatus | undefined;
        restrictedAt?: Date | null | undefined;
        suspendedAt?: Date | null | undefined;
        closedAt?: Date | null | undefined;
        updatedAt: Date;
      };
    }): Promise<{ count: number }>;
  };
};

export function createPrismaEmployerOrganizationRepository(prismaClient: unknown): EmployerOrganizationRepository {
  const prisma = prismaClient as PrismaEmployerOrganizationClient;

  return {
    findOrganizationById(organizationId) {
      return prisma.employerOrganization.findUnique({
        where: { id: organizationId }
      });
    },

    findOrganizationByPublicId(publicId) {
      return prisma.employerOrganization.findUnique({
        where: { publicId }
      });
    },

    async createOrganizationWithOwnerMembership(input) {
      return prisma.$transaction(async (transaction) => {
        const existing = await transaction.employerOrganization.findFirst({
          where: { legalName: input.legalName }
        });

        if (existing) {
          throw new Error("RWOS_ORGANIZATION_DUPLICATE");
        }

        const organization = await transaction.employerOrganization.create({
          data: {
            publicId: input.publicId,
            legalName: input.legalName,
            displayName: input.displayName,
            status: "active",
            createdByUserId: input.actorUserId,
            createdAt: input.now,
            updatedAt: input.now
          }
        });
        const accessRoles = await resolveMembershipAccessRoles(transaction, [input.ownerRoleKey]);

        if (accessRoles.length !== 1) {
          throw new Error("RWOS_ORGANIZATION_OWNER_ROLE_MISSING");
        }

        const membership = await transaction.organizationMembership.create({
          data: {
            organizationId: organization.id,
            userId: input.actorUserId,
            invitedByUserId: input.actorUserId,
            status: "active",
            createdAt: input.now,
            expiredAt: null,
            membershipRoles: {
              create: [{ accessRoleDefinitionId: accessRoles[0]!.id }]
            }
          },
          include: membershipInclude
        });

        await recordPrismaOrganizationAudit(transaction, {
          action: "organization.created",
          organizationId: organization.id,
          actorUserId: input.actorUserId,
          priorState: null,
          newState: organization.status,
          reason: null,
          correlationId: input.correlationId,
          createdAt: input.now
        });
        await recordPrismaMembershipAudit(transaction, {
          action: "membership.activated",
          membershipId: membership.id,
          organizationId: organization.id,
          userId: input.actorUserId,
          actorUserId: input.actorUserId,
          reason: "owner_membership_bootstrap",
          priorState: null,
          newState: "active",
          correlationId: input.correlationId,
          createdAt: input.now
        });
        await recordPrismaMembershipAudit(transaction, {
          action: "membership.access_role_changed",
          membershipId: membership.id,
          organizationId: organization.id,
          userId: input.actorUserId,
          actorUserId: input.actorUserId,
          reason: "organization_owner_bootstrap",
          priorState: null,
          newState: input.ownerRoleKey,
          correlationId: input.correlationId,
          createdAt: input.now
        });

        return { organization, membership };
      });
    },

    async updateOrganization(input) {
      const result = await prisma.employerOrganization.updateMany({
        where: { id: input.organizationId, updatedAt: input.expectedUpdatedAt },
        data: {
          legalName: input.legalName,
          displayName: input.displayName,
          updatedAt: input.now
        }
      });

      if (result.count !== 1) {
        return null;
      }

      return this.findOrganizationById(input.organizationId);
    },

    async updateOrganizationStatus(input) {
      const result = await prisma.employerOrganization.updateMany({
        where: { id: input.organizationId, updatedAt: input.expectedUpdatedAt },
        data: {
          status: input.status,
          restrictedAt: input.status === "active" ? null : undefined,
          suspendedAt: input.status === "suspended" ? input.now : input.status === "active" ? null : undefined,
          closedAt: input.status === "closed" ? input.now : undefined,
          updatedAt: input.now
        }
      });

      if (result.count !== 1) {
        return null;
      }

      return this.findOrganizationById(input.organizationId);
    },

    async recordOrganizationAuditEvent(input) {
      await recordPrismaOrganizationAudit(prisma, input);
    }
  };
}

type PrismaResidenceClient = Pick<PrismaEmployerOrganizationClient, "auditActorReference" | "auditEvent"> & {
  $transaction<T>(callback: (transaction: PrismaResidenceClient) => Promise<T>): Promise<T>;
  residence: {
    findUnique(args: { where: { id: string } }): Promise<StoredResidence | null>;
    findMany(args: {
      where: { organizationId: string; status?: ResidenceStatus | undefined };
      orderBy: { name: "asc" };
    }): Promise<StoredResidence[]>;
    create(args: {
      data: {
        publicId: string;
        organizationId: string;
        name: string;
        status: "active";
        addressSummary: string | null;
        city: string | null;
        region: string | null;
        country: string | null;
        createdByUserId: string;
        createdAt: Date;
        updatedAt: Date;
      };
    }): Promise<StoredResidence>;
    updateMany(args: {
      where: { id: string; organizationId: string; updatedAt: Date };
      data: {
        name?: string | undefined;
        addressSummary?: string | null | undefined;
        city?: string | null | undefined;
        region?: string | null | undefined;
        country?: string | null | undefined;
        status?: ResidenceStatus | undefined;
        archivedAt?: Date | null | undefined;
        updatedAt: Date;
      };
    }): Promise<{ count: number }>;
  };
};

export function createPrismaResidenceRepository(prismaClient: unknown): ResidenceRepository {
  const prisma = prismaClient as PrismaResidenceClient;

  return {
    findResidenceById(residenceId) {
      return prisma.residence.findUnique({
        where: { id: residenceId }
      });
    },

    listResidencesByOrganization(input) {
      return prisma.residence.findMany({
        where: {
          organizationId: input.organizationId,
          ...(input.status ? { status: input.status } : {})
        },
        orderBy: { name: "asc" }
      });
    },

    async createResidence(input) {
      return prisma.$transaction(async (transaction) => {
        const residence = await transaction.residence.create({
          data: {
            publicId: input.publicId,
            organizationId: input.organizationId,
            name: input.name,
            status: "active",
            addressSummary: input.addressSummary,
            city: input.city,
            region: input.region,
            country: input.country,
            createdByUserId: input.actorUserId,
            createdAt: input.now,
            updatedAt: input.now
          }
        });

        await recordPrismaResidenceAudit(transaction, {
          action: "residence.created",
          organizationId: input.organizationId,
          residenceId: residence.id,
          actorUserId: input.actorUserId,
          priorState: null,
          newState: residence.status,
          reason: null,
          correlationId: input.correlationId,
          createdAt: input.now
        });

        return residence;
      });
    },

    async updateResidence(input) {
      const result = await prisma.residence.updateMany({
        where: { id: input.residenceId, organizationId: input.organizationId, updatedAt: input.expectedUpdatedAt },
        data: {
          name: input.name,
          addressSummary: input.addressSummary,
          city: input.city,
          region: input.region,
          country: input.country,
          updatedAt: input.now
        }
      });

      if (result.count !== 1) {
        return null;
      }

      return this.findResidenceById(input.residenceId);
    },

    async updateResidenceStatus(input) {
      const result = await prisma.residence.updateMany({
        where: { id: input.residenceId, organizationId: input.organizationId, updatedAt: input.expectedUpdatedAt },
        data: {
          status: input.status,
          archivedAt: input.status === "closed" ? input.now : input.status === "active" ? null : undefined,
          updatedAt: input.now
        }
      });

      if (result.count !== 1) {
        return null;
      }

      return this.findResidenceById(input.residenceId);
    },

    async recordResidenceAuditEvent(input) {
      await recordPrismaResidenceAudit(prisma, input);
    }
  };
}

function resolvePasswordHashOptions(options: PasswordHashOptions) {
  return {
    costFactor: options.costFactor ?? readPositiveInteger("RWOS_PASSWORD_SCRYPT_N", defaultPasswordOptions.costFactor),
    blockSize: options.blockSize ?? defaultPasswordOptions.blockSize,
    parallelization: options.parallelization ?? defaultPasswordOptions.parallelization,
    keyLength: options.keyLength ?? defaultPasswordOptions.keyLength,
    saltLength: options.saltLength ?? defaultPasswordOptions.saltLength
  };
}

function readPositiveInteger(name: string, fallback: number) {
  const raw = process.env[name];

  if (!raw) return fallback;

  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parsePasswordHash(encodedHash: string | null | undefined) {
  if (!encodedHash) return null;

  const parts = encodedHash.split(":");

  if (parts.length !== passwordHashParts || `${parts[0]}:${parts[1]}` !== passwordHashPrefix) {
    return null;
  }

  const costFactor = Number(parts[2]);
  const blockSize = Number(parts[3]);
  const parallelization = Number(parts[4]);
  const keyLength = Number(parts[5]);
  const saltPart = parts[6];
  const hashPart = parts[7];

  if (!saltPart || !hashPart || !costFactor || !blockSize || !parallelization || !keyLength) {
    return null;
  }

  return {
    costFactor,
    blockSize,
    parallelization,
    keyLength,
    salt: Buffer.from(saltPart, "base64url"),
    expectedHash: Buffer.from(hashPart, "base64url")
  };
}

async function createSessionForUser(
  repository: AuthenticationRepository,
  user: StoredAuthenticationUser,
  randomToken: () => string,
  sessionTtlSeconds: number,
  currentTime: Date,
  input: { ipAddress?: string | null; userAgent?: string | null }
) {
  const token = randomToken();
  const expiresAt = new Date(currentTime.getTime() + sessionTtlSeconds * 1000);
  const session = await repository.createSession({
    userId: user.id,
    sessionHash: hashSessionToken(token),
    expiresAt,
    ipHash: hashOptionalOperationalValue(input.ipAddress),
    userAgentHash: hashOptionalOperationalValue(input.userAgent)
  });

  return {
    session: toPublicSession(session),
    token
  };
}

function toPublicUser(user: StoredAuthenticationUser): PublicAuthenticationUser {
  return {
    id: user.id,
    publicId: user.publicId,
    emailNormalized: user.emailNormalized,
    displayName: user.displayName,
    status: user.status
  };
}

function toPublicSession(session: Pick<StoredAuthenticationSession, "id" | "userId" | "expiresAt">) {
  return {
    id: session.id,
    userId: session.userId,
    expiresAt: session.expiresAt
  };
}

function unauthenticatedSession(): SessionValidationResult {
  return {
    authenticated: false,
    user: null,
    session: null
  };
}

async function recordAuthenticationAudit(
  repository: AuthenticationRepository,
  input: Omit<RecordAuthenticationAuditEventInput, "correlationId"> & { correlationId?: string | undefined }
) {
  await repository.recordAuthenticationAuditEvent({
    ...input,
    correlationId: input.correlationId ?? createCorrelationId()
  });
}

function createPublicUserId() {
  return `usr_${randomBytes(12).toString("base64url")}`;
}

function createCorrelationId() {
  return `auth_${randomBytes(12).toString("base64url")}`;
}

function hashOptionalOperationalValue(value: string | null | undefined) {
  if (!value) return null;

  return createHash("sha256").update(value, "utf8").digest("base64url");
}

function permission(
  key: AuthorizationPermissionKey,
  purpose: string,
  context: AuthorizationContextRequirement,
  lifecycle: AuthorizationPermissionLifecycle,
  securityRisk: string,
  testRequirement: string
): AuthorizationPermissionDefinition {
  return {
    key,
    purpose,
    context,
    lifecycle,
    securityRisk,
    testRequirement
  };
}

function roleDefinition(
  key: AuthorizationRoleKey,
  displayLabel: string,
  context: AuthorizationContextRequirement,
  permissions: readonly AuthorizationPermissionKey[]
): AuthorizationRoleDefinition {
  return {
    key,
    displayLabel,
    context,
    description: `${displayLabel} authorization boundary.`,
    permissions
  };
}

function getAuthorizationPermission(permissionKey: string) {
  return authorizationPermissionDefinitions.find((permissionDefinition) => permissionDefinition.key === permissionKey);
}

function getAuthorizationRole(roleKey: AuthorizationRoleKey) {
  return authorizationRoleDefinitions.find((roleDefinition) => roleDefinition.key === roleKey);
}

function sanitizeAuthorizationRoles(roles: readonly AuthorizationRoleKey[]) {
  return roles.filter((role, index) => authorizationRoleKeys.includes(role) && roles.indexOf(role) === index);
}

function deny(
  status: Exclude<AuthorizationDecisionStatus, "allow">,
  internalReason: string,
  permission: string,
  roles: readonly AuthorizationRoleKey[],
  correlationId: string
): AuthorizationDecision {
  return {
    status,
    allow: false,
    externalCode: authorizationDeniedCode,
    externalMessage: authorizationDeniedMessage,
    internalReason,
    permission,
    roles,
    correlationId
  };
}

function isSensitiveAuthorizationDenial(decision: AuthorizationDecision) {
  return decision.permission === "platform.supervise" || decision.permission.startsWith("job_request.");
}

function createAuthorizationCorrelationId() {
  return `authz_${randomBytes(12).toString("base64url")}`;
}

function toPublicMembership(membership: StoredOrganizationMembership): PublicOrganizationMembership {
  return {
    id: membership.id,
    organizationId: membership.organizationId,
    organizationPublicId: membership.organization.publicId,
    organizationDisplayName: membership.organization.displayName,
    userId: membership.userId,
    status: membership.status,
    roleKeys: membershipRoleKeys(membership),
    invitedByUserId: membership.invitedByUserId,
    invitedAt: membership.createdAt,
    activatedAt: membership.acceptedAt,
    suspendedAt: membership.suspendedAt,
    revokedAt: membership.revokedAt,
    expiresAt: membership.expiredAt,
    updatedAt: latestMembershipTimestamp(membership)
  };
}

function membershipRoleKeys(membership: StoredOrganizationMembership) {
  return membership.membershipRoles.map((membershipRole) => membershipRole.accessRole.key);
}

function latestMembershipTimestamp(membership: StoredOrganizationMembership) {
  return [membership.acceptedAt, membership.suspendedAt, membership.revokedAt, membership.expiredAt, membership.createdAt]
    .filter((timestamp): timestamp is Date => Boolean(timestamp))
    .sort((left, right) => right.getTime() - left.getTime())[0] ?? membership.createdAt;
}

async function assertMembershipBelongsToUser(
  repository: OrganizationMembershipRepository,
  userId: string,
  membershipId: string
) {
  const membership = await repository.findMembershipById(membershipId);

  if (!membership || membership.userId !== userId) {
    throw new OrganizationMembershipError(membershipDeny("membership_missing", "membership_not_found", null, null, []));
  }

  return membership;
}

async function updateMembershipLifecycle(
  repository: OrganizationMembershipRepository,
  input: {
    userId: string;
    membershipId: string;
    actorUserId: string | null;
    correlationId?: string;
    status: OrganizationMembershipStatus;
    auditAction: Parameters<OrganizationMembershipRepository["recordMembershipAuditEvent"]>[0]["action"];
    now: Date;
  }
) {
  const membership = await assertMembershipBelongsToUser(repository, input.userId, input.membershipId);
  const updated = await repository.updateMembershipStatus({
    membershipId: membership.id,
    status: input.status,
    actorUserId: input.actorUserId,
    now: input.now
  });
  await recordMembershipAudit(repository, {
    action: input.auditAction,
    membershipId: membership.id,
    organizationId: membership.organizationId,
    userId: membership.userId,
    actorUserId: input.actorUserId,
    reason: null,
    priorState: membership.status,
    newState: input.status,
    correlationId: input.correlationId,
    createdAt: input.now
  });

  return toPublicMembership(updated);
}

function evaluateMembershipForContext(
  membership: StoredOrganizationMembership,
  currentTime: Date
): OrganizationMembershipDecision {
  const publicMembership = toPublicMembership(membership);
  const roles = membershipRoleKeys(membership);

  if (membership.expiredAt && membership.expiredAt.getTime() <= currentTime.getTime()) {
    return membershipDeny("membership_expired", "membership_expired", publicMembership, membership.organizationId, roles);
  }

  if (membership.status !== "active") {
    return membershipDeny(`membership_${membership.status}`, `membership_${membership.status}`, publicMembership, membership.organizationId, roles);
  }

  return {
    status: "allow",
    allow: true,
    membership: publicMembership,
    organizationId: membership.organizationId,
    roles,
    internalReason: null,
    externalCode: null,
    externalMessage: null
  };
}

function membershipDeny(
  status:
    | Exclude<OrganizationMembershipDecisionStatus, "allow">
    | "membership_invited"
    | "membership_suspended"
    | "membership_revoked"
    | "membership_expired",
  internalReason: string,
  membership: PublicOrganizationMembership | null,
  organizationId: string | null,
  roles: readonly AuthorizationRoleKey[]
): OrganizationMembershipDecision {
  return {
    status: normalizeMembershipDecisionStatus(status),
    allow: false,
    membership,
    organizationId,
    roles,
    internalReason,
    externalCode: authorizationDeniedCode,
    externalMessage: authorizationDeniedMessage
  };
}

function normalizeMembershipDecisionStatus(
  status:
    | Exclude<OrganizationMembershipDecisionStatus, "allow">
    | "membership_invited"
    | "membership_suspended"
    | "membership_revoked"
    | "membership_expired"
): OrganizationMembershipDecisionStatus {
  if (status === "membership_invited" || status === "membership_suspended" || status === "membership_revoked") {
    return "membership_inactive";
  }

  return status === "membership_expired" ? "membership_expired" : status;
}

async function auditMembershipDenial(
  repository: OrganizationMembershipRepository,
  input: {
    decision: OrganizationMembershipDecision;
    userId: string | null;
    actorUserId: string | null;
    correlationId?: string | undefined;
    createdAt: Date;
  }
) {
  await recordMembershipAudit(repository, {
    action: "membership.denied",
    membershipId: input.decision.membership?.id ?? null,
    organizationId: input.decision.organizationId,
    userId: input.userId,
    actorUserId: input.actorUserId,
    reason: input.decision.internalReason,
    priorState: input.decision.membership?.status ?? null,
    newState: "denied",
    correlationId: input.correlationId,
    createdAt: input.createdAt
  });
}

async function recordMembershipAudit(
  repository: OrganizationMembershipRepository,
  input: Omit<Parameters<OrganizationMembershipRepository["recordMembershipAuditEvent"]>[0], "correlationId"> & {
    correlationId?: string | undefined;
  }
) {
  await repository.recordMembershipAuditEvent({
    ...input,
    correlationId: input.correlationId ?? createMembershipCorrelationId()
  });
}

async function resolveMembershipAccessRoles(prisma: PrismaMembershipClient, accessRoleKeys: readonly AuthorizationRoleKey[]) {
  return prisma.accessRoleDefinition.findMany({
    where: {
      key: {
        in: [...new Set(accessRoleKeys)]
      }
    }
  });
}

function membershipStatusUpdate(status: OrganizationMembershipStatus, now: Date) {
  return {
    status,
    acceptedAt: status === "active" ? now : undefined,
    suspendedAt: status === "suspended" ? now : undefined,
    revokedAt: status === "revoked" ? now : undefined,
    expiredAt: status === "expired" ? now : undefined
  };
}

function createMembershipCorrelationId() {
  return `membership_${randomBytes(12).toString("base64url")}`;
}

function toPublicOrganization(organization: StoredEmployerOrganization): PublicEmployerOrganization {
  return {
    id: organization.id,
    publicId: organization.publicId,
    legalName: organization.legalName,
    displayName: organization.displayName,
    status: organization.status,
    createdByUserId: organization.createdByUserId,
    reviewedByUserId: organization.reviewedByUserId,
    createdAt: organization.createdAt,
    updatedAt: organization.updatedAt,
    restrictedAt: organization.restrictedAt,
    suspendedAt: organization.suspendedAt,
    closedAt: organization.closedAt,
    version: organization.updatedAt.toISOString()
  };
}

async function authorizeOrganizationOperation(input: {
  repository: EmployerOrganizationRepository;
  membershipService: OrganizationMembershipService;
  authorizationService: AuthorizationService;
  actorUserId: string;
  organization: StoredEmployerOrganization | null;
  organizationId: string;
  permission: AuthorizationPermissionKey;
  correlationId?: string | undefined;
  now: Date;
  allowInactiveSelfStatusChange?: boolean | undefined;
}): Promise<EmployerOrganizationDecision> {
  if (!input.organization) {
    const decision = organizationDeny("not_found", "organization_not_found", null, null, []);
    await auditOrganizationDenial(input.repository, {
      decision,
      actorUserId: input.actorUserId,
      correlationId: input.correlationId,
      createdAt: input.now
    });
    return decision;
  }

  const membershipDecision = await input.membershipService.selectOrganizationContext({
    userId: input.actorUserId,
    organizationId: input.organizationId,
    ...(input.correlationId ? { correlationId: input.correlationId } : {})
  });

  if (!membershipDecision.allow || !membershipDecision.membership) {
    const decision = organizationDeny(
      "membership_denied",
      membershipDecision.internalReason ?? "membership_denied",
      toPublicOrganization(input.organization),
      membershipDecision.membership,
      membershipDecision.roles
    );
    await auditOrganizationDenial(input.repository, {
      decision,
      actorUserId: input.actorUserId,
      correlationId: input.correlationId,
      createdAt: input.now
    });
    return decision;
  }

  const authorizationDecision = await input.authorizationService.decide({
    session: {
      authenticated: true,
      user: {
        id: input.actorUserId,
        publicId: "organization_context_user",
        emailNormalized: "organization-context@example.invalid",
        displayName: null,
        status: "active"
      },
      session: {
        id: "organization-context-session",
        userId: input.actorUserId,
        expiresAt: input.now
      }
    },
    roles: membershipDecision.roles,
    permission: input.permission,
    resourceContext: { organizationId: input.organizationId },
    ...(input.correlationId ? { correlationId: input.correlationId } : {})
  });

  if (!authorizationDecision.allow) {
    const decision = organizationDeny(
      "permission_denied",
      authorizationDecision.internalReason ?? "permission_denied",
      toPublicOrganization(input.organization),
      membershipDecision.membership,
      membershipDecision.roles
    );
    await auditOrganizationDenial(input.repository, {
      decision,
      actorUserId: input.actorUserId,
      correlationId: input.correlationId,
      createdAt: input.now
    });
    return decision;
  }

  if (organizationBlocksOrdinaryOperations(input.organization.status) && !input.allowInactiveSelfStatusChange) {
    const decision = organizationDeny(
      "organization_inactive",
      `organization_${input.organization.status}`,
      toPublicOrganization(input.organization),
      membershipDecision.membership,
      membershipDecision.roles
    );
    await auditOrganizationDenial(input.repository, {
      decision,
      actorUserId: input.actorUserId,
      correlationId: input.correlationId,
      createdAt: input.now
    });
    return decision;
  }

  return {
    status: "allow",
    allow: true,
    organization: toPublicOrganization(input.organization),
    membership: membershipDecision.membership,
    roles: membershipDecision.roles,
    internalReason: null,
    externalCode: null,
    externalMessage: null
  };
}

function organizationBlocksOrdinaryOperations(status: EmployerOrganizationStatus) {
  return status === "suspended" || status === "closed" || status === "restricted";
}

function organizationDeny(
  status: Exclude<EmployerOrganizationDecisionStatus, "allow">,
  internalReason: string,
  organization: PublicEmployerOrganization | null,
  membership: PublicOrganizationMembership | null,
  roles: readonly AuthorizationRoleKey[]
): EmployerOrganizationDecision {
  return {
    status,
    allow: false,
    organization,
    membership,
    roles,
    internalReason,
    externalCode: authorizationDeniedCode,
    externalMessage: authorizationDeniedMessage
  };
}

async function auditOrganizationDenial(
  repository: EmployerOrganizationRepository,
  input: {
    decision: EmployerOrganizationDecision;
    actorUserId: string | null;
    correlationId?: string | undefined;
    createdAt: Date;
  }
) {
  await recordOrganizationAudit(repository, {
    action: "organization.access_denied",
    organizationId: input.decision.organization?.id ?? null,
    actorUserId: input.actorUserId,
    priorState: input.decision.organization?.status ?? null,
    newState: "denied",
    reason: input.decision.internalReason,
    correlationId: input.correlationId,
    createdAt: input.createdAt
  });
}

async function recordOrganizationAudit(
  repository: EmployerOrganizationRepository,
  input: Omit<Parameters<EmployerOrganizationRepository["recordOrganizationAuditEvent"]>[0], "correlationId"> & {
    correlationId?: string | undefined;
  }
) {
  await repository.recordOrganizationAuditEvent({
    ...input,
    correlationId: input.correlationId ?? createOrganizationCorrelationId()
  });
}

async function recordPrismaOrganizationAudit(
  prisma: Pick<PrismaEmployerOrganizationClient, "auditActorReference" | "auditEvent">,
  input: Parameters<EmployerOrganizationRepository["recordOrganizationAuditEvent"]>[0]
) {
  const actorReference = await prisma.auditActorReference.create({
    data: {
      actorType: input.actorUserId ? "user" : "system",
      ...(input.actorUserId ? { userId: input.actorUserId } : {}),
      ...(input.organizationId ? { organizationId: input.organizationId } : {}),
      displayLabel: input.actorUserId ? "Organization actor" : "Organization boundary"
    }
  });

  await prisma.auditEvent.create({
    data: {
      actorReferenceId: actorReference.id,
      organizationId: input.organizationId,
      entityType: "employer_organization",
      entityId: input.organizationId ?? nilEntityId,
      entityPublicReference: input.organizationId,
      action: input.action,
      priorState: input.priorState,
      newState: input.newState,
      reason: input.reason,
      source: "api",
      correlationId: input.correlationId,
      policyVersion: "employer-organization-foundation-v1",
      createdAt: input.createdAt
    }
  });
}

async function recordPrismaMembershipAudit(
  prisma: Pick<PrismaMembershipClient, "auditActorReference" | "auditEvent">,
  input: Parameters<OrganizationMembershipRepository["recordMembershipAuditEvent"]>[0]
) {
  const actorReference = await prisma.auditActorReference.create({
    data: {
      actorType: input.actorUserId ? "user" : "system",
      ...(input.actorUserId ? { userId: input.actorUserId } : {}),
      ...(input.organizationId ? { organizationId: input.organizationId } : {}),
      displayLabel: input.actorUserId ? "Membership actor" : "Membership boundary"
    }
  });

  await prisma.auditEvent.create({
    data: {
      actorReferenceId: actorReference.id,
      organizationId: input.organizationId,
      entityType: "organization_membership",
      entityId: input.membershipId ?? nilEntityId,
      entityPublicReference: input.userId,
      action: input.action,
      priorState: input.priorState,
      newState: input.newState,
      reason: input.reason,
      source: "api",
      correlationId: input.correlationId,
      policyVersion: "organization-membership-foundation-v1",
      createdAt: input.createdAt
    }
  });
}

function normalizeOrganizationName(value: string) {
  const normalized = value.trim().replace(/\s+/g, " ");

  return normalized.length >= 2 && normalized.length <= 160 ? normalized : "";
}

function parseOrganizationVersion(version: string) {
  const parsed = new Date(version);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function createPublicOrganizationId() {
  return `org_${randomBytes(12).toString("base64url")}`;
}

function createOrganizationCorrelationId() {
  return `org_${randomBytes(12).toString("base64url")}`;
}

const residenceStatuses = ["draft", "active", "restricted", "inactive", "closed"] as const satisfies readonly ResidenceStatus[];

function toPublicResidence(residence: StoredResidence): PublicResidence {
  return {
    id: residence.id,
    publicId: residence.publicId,
    organizationId: residence.organizationId,
    name: residence.name,
    status: residence.status,
    addressSummary: residence.addressSummary,
    city: residence.city,
    region: residence.region,
    country: residence.country,
    createdByUserId: residence.createdByUserId,
    createdAt: residence.createdAt,
    updatedAt: residence.updatedAt,
    archivedAt: residence.archivedAt,
    version: residence.updatedAt.toISOString()
  };
}

async function authorizeResidenceOperation(input: {
  residenceRepository: ResidenceRepository;
  organizationRepository: EmployerOrganizationRepository;
  membershipService: OrganizationMembershipService;
  authorizationService: AuthorizationService;
  actorUserId: string;
  organizationId: string;
  residence: StoredResidence | null;
  permission: AuthorizationPermissionKey;
  correlationId?: string | undefined;
  now: Date;
  allowInactiveResidenceRead?: boolean | undefined;
  allowInactiveResidenceStatusChange?: boolean | undefined;
}): Promise<ResidenceDecision> {
  const organization = await input.organizationRepository.findOrganizationById(input.organizationId);

  if (!organization) {
    const decision = residenceDeny("not_found", "organization_not_found", null, null, null, []);
    await auditResidenceDenial(input.residenceRepository, {
      decision,
      actorUserId: input.actorUserId,
      correlationId: input.correlationId,
      createdAt: input.now
    });
    return decision;
  }

  const organizationPublic = toPublicOrganization(organization);
  const membershipDecision = await input.membershipService.selectOrganizationContext({
    userId: input.actorUserId,
    organizationId: input.organizationId,
    ...(input.correlationId ? { correlationId: input.correlationId } : {})
  });

  if (!membershipDecision.allow || !membershipDecision.membership) {
    const decision = residenceDeny(
      "membership_denied",
      membershipDecision.internalReason ?? "membership_denied",
      input.residence ? toPublicResidence(input.residence) : null,
      organizationPublic,
      membershipDecision.membership,
      membershipDecision.roles
    );
    await auditResidenceDenial(input.residenceRepository, {
      decision,
      actorUserId: input.actorUserId,
      correlationId: input.correlationId,
      createdAt: input.now
    });
    return decision;
  }

  const authorizationDecision = await input.authorizationService.decide({
    session: {
      authenticated: true,
      user: {
        id: input.actorUserId,
        publicId: "residence_context_user",
        emailNormalized: "residence-context@example.invalid",
        displayName: null,
        status: "active"
      },
      session: {
        id: "residence-context-session",
        userId: input.actorUserId,
        expiresAt: input.now
      }
    },
    roles: membershipDecision.roles,
    permission: input.permission,
    resourceContext: { organizationId: input.organizationId },
    ...(input.correlationId ? { correlationId: input.correlationId } : {})
  });

  if (!authorizationDecision.allow) {
    const decision = residenceDeny(
      "permission_denied",
      authorizationDecision.internalReason ?? "permission_denied",
      input.residence ? toPublicResidence(input.residence) : null,
      organizationPublic,
      membershipDecision.membership,
      membershipDecision.roles
    );
    await auditResidenceDenial(input.residenceRepository, {
      decision,
      actorUserId: input.actorUserId,
      correlationId: input.correlationId,
      createdAt: input.now
    });
    return decision;
  }

  if (organizationBlocksOrdinaryOperations(organization.status)) {
    const decision = residenceDeny(
      "organization_inactive",
      `organization_${organization.status}`,
      input.residence ? toPublicResidence(input.residence) : null,
      organizationPublic,
      membershipDecision.membership,
      membershipDecision.roles
    );
    await auditResidenceDenial(input.residenceRepository, {
      decision,
      actorUserId: input.actorUserId,
      correlationId: input.correlationId,
      createdAt: input.now
    });
    return decision;
  }

  if (input.residence) {
    if (input.residence.organizationId !== input.organizationId) {
      const decision = residenceDeny("not_found", "residence_not_found", null, organizationPublic, membershipDecision.membership, membershipDecision.roles);
      await auditResidenceDenial(input.residenceRepository, {
        decision,
        actorUserId: input.actorUserId,
        correlationId: input.correlationId,
        createdAt: input.now
      });
      return decision;
    }

    if (residenceBlocksOrdinaryUpdates(input.residence.status) && !input.allowInactiveResidenceRead && !input.allowInactiveResidenceStatusChange) {
      const decision = residenceDeny(
        "residence_inactive",
        `residence_${input.residence.status}`,
        toPublicResidence(input.residence),
        organizationPublic,
        membershipDecision.membership,
        membershipDecision.roles
      );
      await auditResidenceDenial(input.residenceRepository, {
        decision,
        actorUserId: input.actorUserId,
        correlationId: input.correlationId,
        createdAt: input.now
      });
      return decision;
    }
  } else if (input.permission !== "residence.create" && input.permission !== "residence.read") {
    const decision = residenceDeny("not_found", "residence_not_found", null, organizationPublic, membershipDecision.membership, membershipDecision.roles);
    await auditResidenceDenial(input.residenceRepository, {
      decision,
      actorUserId: input.actorUserId,
      correlationId: input.correlationId,
      createdAt: input.now
    });
    return decision;
  }

  return {
    status: "allow",
    allow: true,
    residence: input.residence ? toPublicResidence(input.residence) : null,
    organization: organizationPublic,
    membership: membershipDecision.membership,
    roles: membershipDecision.roles,
    internalReason: null,
    externalCode: null,
    externalMessage: null
  };
}

function residenceBlocksOrdinaryUpdates(status: ResidenceStatus) {
  return status === "closed" || status === "inactive" || status === "restricted";
}

function isAllowedResidenceTransition(current: ResidenceStatus, next: Extract<ResidenceStatus, "active" | "inactive" | "closed">) {
  if (current === "closed") return false;
  if (next === "active") return current === "inactive" || current === "draft";
  if (next === "inactive") return current === "active";
  if (next === "closed") return current === "active" || current === "inactive" || current === "draft";

  return false;
}

function residenceDeny(
  status: Exclude<ResidenceDecisionStatus, "allow">,
  internalReason: string,
  residence: PublicResidence | null,
  organization: PublicEmployerOrganization | null,
  membership: PublicOrganizationMembership | null,
  roles: readonly AuthorizationRoleKey[]
): ResidenceDecision {
  return {
    status,
    allow: false,
    residence,
    organization,
    membership,
    roles,
    internalReason,
    externalCode: authorizationDeniedCode,
    externalMessage: authorizationDeniedMessage
  };
}

async function auditResidenceDenial(
  repository: ResidenceRepository,
  input: {
    decision: ResidenceDecision;
    actorUserId: string | null;
    correlationId?: string | undefined;
    createdAt: Date;
  }
) {
  await recordResidenceAudit(repository, {
    action: "residence.access_denied",
    organizationId: input.decision.organization?.id ?? input.decision.residence?.organizationId ?? null,
    residenceId: input.decision.residence?.id ?? null,
    actorUserId: input.actorUserId,
    priorState: input.decision.residence?.status ?? null,
    newState: "denied",
    reason: input.decision.internalReason,
    correlationId: input.correlationId,
    createdAt: input.createdAt
  });
}

async function recordResidenceAudit(
  repository: ResidenceRepository,
  input: Omit<Parameters<ResidenceRepository["recordResidenceAuditEvent"]>[0], "correlationId"> & {
    correlationId?: string | undefined;
  }
) {
  await repository.recordResidenceAuditEvent({
    ...input,
    correlationId: input.correlationId ?? createResidenceCorrelationId()
  });
}

async function recordPrismaResidenceAudit(
  prisma: Pick<PrismaResidenceClient, "auditActorReference" | "auditEvent">,
  input: Parameters<ResidenceRepository["recordResidenceAuditEvent"]>[0]
) {
  const actorReference = await prisma.auditActorReference.create({
    data: {
      actorType: input.actorUserId ? "user" : "system",
      ...(input.actorUserId ? { userId: input.actorUserId } : {}),
      ...(input.organizationId ? { organizationId: input.organizationId } : {}),
      displayLabel: input.actorUserId ? "Residence actor" : "Residence boundary"
    }
  });

  await prisma.auditEvent.create({
    data: {
      actorReferenceId: actorReference.id,
      organizationId: input.organizationId,
      entityType: "residence",
      entityId: input.residenceId ?? nilEntityId,
      entityPublicReference: input.residenceId,
      action: input.action,
      priorState: input.priorState,
      newState: input.newState,
      reason: input.reason,
      source: "api",
      correlationId: input.correlationId,
      policyVersion: "residence-foundation-v1",
      createdAt: input.createdAt
    }
  });
}

function normalizeResidenceText(value: string, minLength: number, maxLength: number) {
  const normalized = value.trim().replace(/\s+/g, " ");

  return normalized.length >= minLength && normalized.length <= maxLength ? normalized : "";
}

function normalizeOptionalResidenceText(value: string | null | undefined, maxLength: number) {
  if (value == null) return null;

  const normalized = value.trim().replace(/\s+/g, " ");

  return normalized.length > 0 && normalized.length <= maxLength ? normalized : null;
}

function parseResidenceVersion(version: string) {
  const parsed = new Date(version);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function createPublicResidenceId() {
  return `res_${randomBytes(12).toString("base64url")}`;
}

function createResidenceCorrelationId() {
  return `residence_${randomBytes(12).toString("base64url")}`;
}

async function scrypt(password: string, salt: Buffer, keyLength: number, options: { N: number; r: number; p: number }) {
  return new Promise<Buffer>((resolve, reject) => {
    scryptCallback(password, salt, keyLength, options, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(derivedKey as Buffer);
    });
  });
}
