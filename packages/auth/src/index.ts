import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual
} from "node:crypto";
import type { RequestPricingSnapshot } from "@rwos/shared";
import type {
  WorkerOfferDeliveryProvider,
  WorkerOfferDeliveryResult
} from "./productionIntegrations";
export * from "./employerCancellation";
export * from "./employerContract";
export * from "./employerReduce";
export * from "./employerRequestEdit";
export * from "./workerSavedJobs";
export * from "./workerJobInterest";
export * from "./verification";
export * from "./eligibilityPolicy";
export * from "./hrDomain";
export * from "./hr";
export * from "./hrDocuments";
export * from "./hrCompliance";
export * from "./payroll";
export * from "./payrollReview";
export * from "./payrollReviewProvider";
export * from "./payrollPeriodReview";
export * from "./payrollProvenance";
export * from "./payrollReviewEgress";
export * from "./payrollReviewTelemetry";
export {
  CalendarRequestError,
  createCalendarRequestService,
  createPrismaCalendarRequestProfileRepository,
  createPrismaConfirmedAssignmentCoverageReader,
  upgradeClientStatusForCoverage,
  type AssignmentCoverage,
  type CalendarRequestProfileRepository,
  type CalendarRequestService,
  type CalendarVerificationState,
  type ConfirmedAssignmentCoverageReader,
  type StoredCalendarRequestProfile
} from "./calendarRequest";
export {
  createFrontendSessionGateway,
  localAdminSessionCookieName,
  localEmployerSessionCookieName,
  localFrontendSessionCookieName,
  secureAdminSessionCookieName,
  secureEmployerSessionCookieName,
  secureFrontendSessionCookieName,
  type FrontendSessionFetch,
  type FrontendSessionResult
} from "./frontendSession";
export {
  ProductionIntegrationError,
  createHttpCandidateSource,
  createHttpWorkerOfferDeliveryProvider,
  createBrevoWorkerOfferDeliveryProvider,
  type WorkerOfferDeliveryProvider,
  type WorkerOfferDeliveryResult
} from "./productionIntegrations";
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
  (typeof workerRoles)[number] | (typeof employerRoles)[number] | (typeof adminRoles)[number];

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
  "DISPATCHER",
  "TIMESHEET_REVIEWER",
  "HR_ADMINISTRATOR",
  "PAYROLL_ADMINISTRATOR"
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
  "dispatch.create",
  "dispatch.read",
  "dispatch.review_candidates",
  "dispatch.manage_shortlist",
  "dispatch.pause",
  "dispatch.resume",
  "dispatch.cancel",
  "dispatch.close",
  "dispatch.prepare_offer",
  "dispatch.audit_read",
  "dispatch.supervise",
  "worker_offer.create",
  "worker_offer.read",
  "worker_offer.approve",
  "worker_offer.send",
  "worker_offer.withdraw",
  "worker_offer.cancel",
  "worker_offer.audit_read",
  "worker_offer.respond",
  "worker_offer.supervise",
  "assignment.create",
  "assignment.read",
  "assignment.cancel",
  "assignment.withdraw",
  "assignment.mark_replacement_required",
  "assignment.attendance_handoff",
  "assignment.audit_read",
  "assignment.worker_read",
  "assignment.worker_acknowledge",
  "assignment.worker_withdraw",
  "assignment.supervise",
  "attendance.create",
  "attendance.read",
  "attendance.check_in",
  "attendance.check_out",
  "attendance.override",
  "attendance.cancel",
  "attendance.audit_read",
  "attendance.worker_read",
  "attendance.worker_check_in",
  "attendance.worker_check_out",
  "attendance.supervise",
  "timesheet.create",
  "timesheet.read",
  "timesheet.calculate",
  "timesheet.recalculate",
  "timesheet.review",
  "timesheet.approve",
  "timesheet.lock",
  "timesheet.reject",
  "timesheet.request_correction",
  "timesheet.adjust",
  "timesheet.audit_read",
  "timesheet.worker_read",
  "timesheet.worker_confirm",
  "timesheet.worker_dispute",
  "timesheet.employer_read",
  "timesheet.employer_confirm",
  "timesheet.employer_dispute",
  "timesheet.supervise",
  "timesheet.override_exceptions",
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

export type OrganizationMembershipStatus =
  "invited" | "active" | "suspended" | "revoked" | "expired";
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
  findMembershipForUserByOrganization(
    userId: string,
    organizationId: string
  ): Promise<StoredOrganizationMembership | null>;
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

export type EmployerOrganizationStatus =
  "invited" | "pending_review" | "active" | "restricted" | "suspended" | "closed";
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
  }): Promise<{
    organization: StoredEmployerOrganization;
    membership: StoredOrganizationMembership;
  }>;
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
  listResidencesByOrganization(input: {
    organizationId: string;
    status?: ResidenceStatus | null;
  }): Promise<StoredResidence[]>;
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

export type DepartmentStatus = "draft" | "active" | "restricted" | "inactive" | "closed";
export type DepartmentDecisionStatus =
  | "allow"
  | "invalid_input"
  | "not_found"
  | "membership_denied"
  | "permission_denied"
  | "organization_inactive"
  | "residence_inactive"
  | "department_inactive"
  | "version_conflict"
  | "invalid_transition"
  | "audit_failed";

export interface StoredDepartment {
  id: string;
  publicId: string;
  organizationId: string;
  residenceId: string;
  name: string;
  status: DepartmentStatus;
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}

export interface PublicDepartment {
  id: string;
  publicId: string;
  organizationId: string;
  residenceId: string;
  name: string;
  status: DepartmentStatus;
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
  version: string;
}

export interface DepartmentDecision {
  status: DepartmentDecisionStatus;
  allow: boolean;
  department: PublicDepartment | null;
  residence: PublicResidence | null;
  organization: PublicEmployerOrganization | null;
  membership: PublicOrganizationMembership | null;
  roles: readonly AuthorizationRoleKey[];
  internalReason: string | null;
  externalCode: typeof authorizationDeniedCode | null;
  externalMessage: typeof authorizationDeniedMessage | null;
}

export interface CreateDepartmentInput {
  actorUserId: string;
  organizationId: string;
  residenceId: string;
  name: string;
  correlationId?: string;
}

export interface UpdateDepartmentInput {
  actorUserId: string;
  organizationId: string;
  residenceId: string;
  departmentId: string;
  expectedVersion: string;
  name?: string | null;
  correlationId?: string;
}

export interface DepartmentRepository {
  findDepartmentById(departmentId: string): Promise<StoredDepartment | null>;
  listDepartmentsByResidence(input: {
    organizationId: string;
    residenceId: string;
    status?: DepartmentStatus | null;
  }): Promise<StoredDepartment[]>;
  createDepartment(input: {
    publicId: string;
    organizationId: string;
    residenceId: string;
    name: string;
    actorUserId: string;
    correlationId: string;
    now: Date;
  }): Promise<StoredDepartment>;
  updateDepartment(input: {
    departmentId: string;
    organizationId: string;
    residenceId: string;
    expectedUpdatedAt: Date;
    name?: string | undefined;
    actorUserId: string;
    now: Date;
  }): Promise<StoredDepartment | null>;
  updateDepartmentStatus(input: {
    departmentId: string;
    organizationId: string;
    residenceId: string;
    expectedUpdatedAt: Date;
    status: Extract<DepartmentStatus, "active" | "inactive" | "closed">;
    actorUserId: string;
    now: Date;
  }): Promise<StoredDepartment | null>;
  recordDepartmentAuditEvent(input: {
    action:
      | "department.created"
      | "department.updated"
      | "department.inactivated"
      | "department.reactivated"
      | "department.closed"
      | "department.access_denied";
    organizationId: string | null;
    residenceId: string | null;
    departmentId: string | null;
    actorUserId: string | null;
    priorState: string | null;
    newState: string | null;
    reason: string | null;
    correlationId: string;
    createdAt: Date;
  }): Promise<void>;
}

export class DepartmentError extends Error {
  decision: DepartmentDecision;

  constructor(decision: DepartmentDecision) {
    super(authorizationDeniedMessage);
    this.name = "DepartmentError";
    this.decision = decision;
  }
}

export type WorkGroupStatus = "active" | "inactive" | "retired";
export type WorkGroupDecisionStatus =
  | "allow"
  | "invalid_input"
  | "not_found"
  | "permission_denied"
  | "version_conflict"
  | "invalid_transition"
  | "invalid_transition"
  | "audit_failed";

export interface StoredWorkGroup {
  id: string;
  key: string;
  displayLabel: string;
  status: WorkGroupStatus;
  displayOrder: number;
  iconKey: string | null;
  qualificationSummary: string | null;
  safetyRequirementSummary: string | null;
  defaultTemplateKey: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicWorkGroup {
  id: string;
  slug: string;
  displayLabel: string;
  status: WorkGroupStatus;
  displayOrder: number;
  iconKey: string | null;
  qualificationSummary: string | null;
  safetyRequirementSummary: string | null;
  defaultTemplateKey: string | null;
  createdAt: Date;
  updatedAt: Date;
  version: string;
}

export interface WorkGroupDecision {
  status: WorkGroupDecisionStatus;
  allow: boolean;
  workGroup: PublicWorkGroup | null;
  roles: readonly AuthorizationRoleKey[];
  internalReason: string | null;
  externalCode: typeof authorizationDeniedCode | null;
  externalMessage: typeof authorizationDeniedMessage | null;
}

export interface WorkGroupRepository {
  findWorkGroupById(workGroupId: string): Promise<StoredWorkGroup | null>;
  findWorkGroupByKey(key: string): Promise<StoredWorkGroup | null>;
  listWorkGroups(input: { includeInactive: boolean }): Promise<StoredWorkGroup[]>;
  updateWorkGroup(input: {
    workGroupId: string;
    expectedUpdatedAt: Date;
    displayLabel?: string | undefined;
    displayOrder?: number | undefined;
    iconKey?: string | null | undefined;
    now: Date;
  }): Promise<StoredWorkGroup | null>;
  updateWorkGroupStatus(input: {
    workGroupId: string;
    expectedUpdatedAt: Date;
    status: Extract<WorkGroupStatus, "active" | "inactive">;
    now: Date;
  }): Promise<StoredWorkGroup | null>;
  recordWorkGroupAuditEvent(input: {
    action:
      | "work_group.updated"
      | "work_group.activated"
      | "work_group.deactivated"
      | "work_group.access_denied";
    workGroupId: string | null;
    actorUserId: string | null;
    priorState: string | null;
    newState: string | null;
    reason: string | null;
    correlationId: string;
    createdAt: Date;
  }): Promise<void>;
}

export class WorkGroupError extends Error {
  decision: WorkGroupDecision;

  constructor(decision: WorkGroupDecision) {
    super(authorizationDeniedMessage);
    this.name = "WorkGroupError";
    this.decision = decision;
  }
}

export type RoleDefinitionStatus = "active" | "inactive" | "retired";
export type RoleDefinitionDecisionStatus =
  | "allow"
  | "invalid_input"
  | "not_found"
  | "permission_denied"
  | "version_conflict"
  | "invalid_transition"
  | "audit_failed";

export interface StoredRoleDefinition {
  id: string;
  workGroupId: string;
  key: string;
  displayLabel: string;
  status: RoleDefinitionStatus;
  displayOrder: number;
  localizedLabelKey: string | null;
  qualificationSummary: string | null;
  safetyRequirementSummary: string | null;
  adminConfigurable: boolean;
  createdAt: Date;
  updatedAt: Date;
  workGroup: StoredWorkGroup;
}

export interface PublicRoleDefinition {
  id: string;
  workGroupId: string;
  workGroupSlug: string;
  code: string;
  slug: string;
  displayLabel: string;
  status: RoleDefinitionStatus;
  displayOrder: number;
  localizedLabelKey: string | null;
  qualificationSummary: string | null;
  safetyRequirementSummary: string | null;
  adminConfigurable: boolean;
  createdAt: Date;
  updatedAt: Date;
  version: string;
}

export interface RoleDefinitionDecision {
  status: RoleDefinitionDecisionStatus;
  allow: boolean;
  roleDefinition: PublicRoleDefinition | null;
  roles: readonly AuthorizationRoleKey[];
  internalReason: string | null;
  externalCode: typeof authorizationDeniedCode | null;
  externalMessage: typeof authorizationDeniedMessage | null;
}

export interface RoleDefinitionRepository {
  findRoleDefinitionById(roleDefinitionId: string): Promise<StoredRoleDefinition | null>;
  findRoleDefinitionByKey(key: string): Promise<StoredRoleDefinition | null>;
  listRoleDefinitions(input: {
    includeInactive: boolean;
    workGroupKey?: string | undefined;
  }): Promise<StoredRoleDefinition[]>;
  updateRoleDefinition(input: {
    roleDefinitionId: string;
    expectedUpdatedAt: Date;
    displayLabel?: string | undefined;
    displayOrder?: number | undefined;
    localizedLabelKey?: string | null | undefined;
    qualificationSummary?: string | null | undefined;
    safetyRequirementSummary?: string | null | undefined;
    now: Date;
  }): Promise<StoredRoleDefinition | null>;
  updateRoleDefinitionStatus(input: {
    roleDefinitionId: string;
    expectedUpdatedAt: Date;
    status: Extract<RoleDefinitionStatus, "active" | "inactive">;
    now: Date;
  }): Promise<StoredRoleDefinition | null>;
  recordRoleDefinitionAuditEvent(input: {
    action:
      | "role_definition.updated"
      | "role_definition.activated"
      | "role_definition.deactivated"
      | "role_definition.access_denied";
    roleDefinitionId: string | null;
    workGroupId: string | null;
    actorUserId: string | null;
    priorState: string | null;
    newState: string | null;
    reason: string | null;
    correlationId: string;
    createdAt: Date;
  }): Promise<void>;
}

export class RoleDefinitionError extends Error {
  decision: RoleDefinitionDecision;

  constructor(decision: RoleDefinitionDecision) {
    super(authorizationDeniedMessage);
    this.name = "RoleDefinitionError";
    this.decision = decision;
  }
}

export type JobRequestStatus =
  | "draft"
  | "submitted"
  | "admin_review"
  | "information_required"
  | "approved_for_dispatch"
  | "cancelled"
  | "expired"
  | "archived";
export type JobRequestUrgency = "normal" | "urgent" | "immediate";
export type JobRequestType = "single_day" | "multi_day" | "recurring_intent";
export type JobRequestDecisionStatus =
  | "allow"
  | "invalid_input"
  | "not_found"
  | "membership_denied"
  | "permission_denied"
  | "organization_inactive"
  | "residence_inactive"
  | "department_inactive"
  | "catalogue_inactive"
  | "parent_mismatch"
  | "version_conflict"
  | "invalid_transition"
  | "audit_failed";

export interface StoredJobRequest {
  id: string;
  jobRequestNumber: string;
  organizationId: string;
  residenceId: string;
  departmentId: string;
  workGroupId: string;
  roleDefinitionId: string;
  creatorUserId: string;
  title: string;
  description: string | null;
  numberOfWorkers: number;
  urgency: JobRequestUrgency;
  requestType: JobRequestType;
  timezone: string;
  startAt: Date;
  endAt: Date;
  isMultiDay: boolean;
  hasRecurringIntent: boolean;
  status: JobRequestStatus;
  adminReviewReason: string | null;
  version: number;
  createdByUserId: string;
  updatedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  submittedAt: Date | null;
  cancelledAt: Date | null;
  expiredAt: Date | null;
  archivedAt: Date | null;
}

export interface PublicJobRequest extends StoredJobRequest {
  versionToken: number;
}

export interface JobRequestDecision {
  status: JobRequestDecisionStatus;
  allow: boolean;
  jobRequest: PublicJobRequest | null;
  organization: PublicEmployerOrganization | null;
  membership: PublicOrganizationMembership | null;
  roles: readonly AuthorizationRoleKey[];
  internalReason: string | null;
  externalCode: typeof authorizationDeniedCode | null;
  externalMessage: typeof authorizationDeniedMessage | null;
}

export interface JobRequestRepository {
  createDraft(input: {
    organizationId: string;
    residenceId: string;
    departmentId: string;
    workGroupId: string;
    roleDefinitionId: string;
    actorUserId: string;
    title: string;
    description: string | null;
    numberOfWorkers: number;
    urgency: JobRequestUrgency;
    requestType: JobRequestType;
    timezone: string;
    startAt: Date;
    endAt: Date;
    isMultiDay: boolean;
    hasRecurringIntent: boolean;
    now: Date;
    correlationId: string;
  }): Promise<StoredJobRequest>;
  findJobRequestById(jobRequestId: string): Promise<StoredJobRequest | null>;
  findJobRequestByNumber(jobRequestNumber: string): Promise<StoredJobRequest | null>;
  listJobRequests(input: {
    organizationId?: string | undefined;
    residenceId?: string | undefined;
    departmentId?: string | undefined;
    statuses?: readonly JobRequestStatus[] | undefined;
  }): Promise<StoredJobRequest[]>;
  updateDraft(input: {
    jobRequestId: string;
    expectedVersion: number;
    actorUserId: string;
    residenceId?: string | undefined;
    departmentId?: string | undefined;
    workGroupId?: string | undefined;
    roleDefinitionId?: string | undefined;
    title?: string | undefined;
    description?: string | null | undefined;
    numberOfWorkers?: number | undefined;
    urgency?: JobRequestUrgency | undefined;
    requestType?: JobRequestType | undefined;
    timezone?: string | undefined;
    startAt?: Date | undefined;
    endAt?: Date | undefined;
    isMultiDay?: boolean | undefined;
    hasRecurringIntent?: boolean | undefined;
    now: Date;
  }): Promise<StoredJobRequest | null>;
  transitionJobRequest(input: {
    jobRequestId: string;
    expectedVersion: number;
    actorUserId: string;
    status: JobRequestStatus;
    adminReviewReason?: string | null | undefined;
    now: Date;
  }): Promise<StoredJobRequest | null>;
  recordJobRequestAuditEvent(input: {
    action:
      | "job_request.created"
      | "job_request.updated"
      | "job_request.submitted"
      | "job_request.admin_review_started"
      | "job_request.information_requested"
      | "job_request.resubmitted"
      | "job_request.approved_for_dispatch"
      | "job_request.cancelled"
      | "job_request.expired"
      | "job_request.archived"
      | "job_request.access_denied";
    organizationId: string | null;
    jobRequestId: string | null;
    jobRequestNumber: string | null;
    actorUserId: string | null;
    priorState: string | null;
    newState: string | null;
    reason: string | null;
    correlationId: string;
    createdAt: Date;
  }): Promise<void>;
}

export class JobRequestError extends Error {
  decision: JobRequestDecision;

  constructor(decision: JobRequestDecision) {
    super(authorizationDeniedMessage);
    this.name = "JobRequestError";
    this.decision = decision;
  }
}

export type DispatchReviewStatus =
  | "draft"
  | "active"
  | "candidate_review"
  | "shortlist_ready"
  | "offer_preparation"
  | "paused"
  | "cancelled"
  | "closed";
export type DispatchType = "initial" | "replacement_reserved";
export type DispatchPriority = "normal" | "urgent" | "emergency";
export type DispatchCandidateSourceType =
  | "internal_worker_profile"
  | "invited_worker"
  | "staffing_partner"
  | "enterprise_employee_pool"
  | "external_integration"
  | "imported_record"
  | "unavailable";
export type DispatchMatchState = "match" | "partial_match" | "no_match" | "not_evaluated";
export type DispatchSummaryState =
  | "meets_requirements"
  | "partially_meets"
  | "missing_required"
  | "verification_pending"
  | "expired"
  | "not_evaluated";
export type DispatchAvailabilityState =
  "available" | "partially_available" | "unavailable" | "not_evaluated" | "source_unavailable";
export type DispatchConflictState =
  "conflict_free" | "conflict_detected" | "not_evaluated" | "source_unavailable";
export type DispatchServiceAreaState =
  "inside_service_area" | "outside_service_area" | "not_evaluated" | "source_unavailable";
export type DispatchTravelState =
  "suitable" | "unsuitable" | "unknown" | "not_evaluated" | "source_unavailable";
export type DispatchTransportState =
  "available" | "unavailable" | "unknown" | "not_evaluated" | "source_unavailable";
export type DispatchRecommendationState =
  "not_evaluated" | "recommended" | "not_recommended" | "alternative" | "unavailable";
export type DispatchShortlistState = "not_shortlisted" | "shortlisted" | "removed";
export type DispatchDecisionStatus =
  | "allow"
  | "invalid_input"
  | "not_found"
  | "permission_denied"
  | "job_request_not_ready"
  | "version_conflict"
  | "invalid_transition"
  | "candidate_source_unavailable";

export interface StoredDispatchReview {
  id: string;
  jobRequestId: string;
  organizationId: string;
  residenceId: string;
  departmentId: string;
  workGroupId: string;
  roleDefinitionId: string;
  dispatchType: DispatchType;
  state: DispatchReviewStatus;
  operationalOwnerUserId: string | null;
  priority: DispatchPriority;
  urgency: JobRequestUrgency;
  requiredWorkerCount: number;
  shortlistedCandidateCount: number;
  preparedOfferCount: number;
  startedAt: Date | null;
  pausedAt: Date | null;
  cancelledAt: Date | null;
  closedAt: Date | null;
  createdByUserId: string;
  updatedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface StoredDispatchCandidate {
  id: string;
  dispatchReviewId: string;
  workerIdentityId: string | null;
  candidateSourceType: DispatchCandidateSourceType;
  candidateSourceReference: string;
  approvedDisplayName: string;
  workGroupMatch: DispatchMatchState;
  roleDefinitionMatch: DispatchMatchState;
  qualificationSummaryState: DispatchSummaryState;
  verificationSummaryState: DispatchSummaryState;
  availabilityState: DispatchAvailabilityState;
  scheduleConflictState: DispatchConflictState;
  serviceAreaState: DispatchServiceAreaState;
  travelSuitabilityState: DispatchTravelState;
  transportConstraintState: DispatchTransportState;
  recommendationState: DispatchRecommendationState;
  shortlistState: DispatchShortlistState;
  shortlistOrder: number | null;
  sourceFreshnessAt: Date | null;
  lastEvaluatedAt: Date | null;
  evaluationVersion: number;
  addedByUserId: string | null;
  removedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface PublicDispatchReview extends StoredDispatchReview {
  remainingWorkerCount: number;
  versionToken: number;
}

export interface PublicDispatchCandidate extends StoredDispatchCandidate {
  versionToken: number;
}

export interface EmployerDispatchStatus {
  jobRequestId: string;
  jobRequestNumber: string;
  dispatchState: DispatchReviewStatus | "not_started";
  requiredWorkerCount: number;
  shortlistedCandidateCount: number;
  preparedOfferCount: number;
  remainingWorkerCount: number;
  updatedAt: Date | null;
}

export interface DispatchDecision {
  status: DispatchDecisionStatus;
  allow: boolean;
  dispatchReview: PublicDispatchReview | null;
  roles: readonly AuthorizationRoleKey[];
  internalReason: string | null;
  externalCode: typeof authorizationDeniedCode | null;
  externalMessage: typeof authorizationDeniedMessage | null;
}

export interface CandidateSourceSearchResult {
  status: "available" | "candidate_source_unavailable";
  candidates: readonly PublicDispatchCandidate[];
}

export interface DispatchCandidateEvaluationInput {
  dispatchReview: PublicDispatchReview;
  candidateSourceReference: string;
}

export interface DispatchCandidateSource {
  getStatus(): Promise<{ status: "available" | "candidate_source_unavailable" }>;
  searchCandidates(input: {
    dispatchReview: PublicDispatchReview;
    staffingWindow: { startAt: Date; endAt: Date; timezone: string };
    requestedAt: Date;
  }): Promise<CandidateSourceSearchResult>;
  evaluateCandidate(
    input: DispatchCandidateEvaluationInput & {
      staffingWindow: { startAt: Date; endAt: Date; timezone: string };
      requestedAt: Date;
    }
  ): Promise<
    | { status: "available"; candidate: PublicDispatchCandidate }
    | { status: "candidate_source_unavailable"; candidate: null }
  >;
}

export interface DispatchRepository {
  createDispatchReviewWithAudit(input: {
    jobRequest: StoredJobRequest;
    actorUserId: string;
    operationalOwnerUserId: string | null;
    priority: DispatchPriority;
    correlationId: string;
    now: Date;
  }): Promise<StoredDispatchReview>;
  findDispatchReviewById(dispatchReviewId: string): Promise<StoredDispatchReview | null>;
  findActiveDispatchReviewForJobRequest(jobRequestId: string): Promise<StoredDispatchReview | null>;
  findCurrentDispatchReviewForJobRequest(
    jobRequestId: string
  ): Promise<StoredDispatchReview | null>;
  listDispatchReviews(input: {
    organizationId?: string | undefined;
    states?: readonly DispatchReviewStatus[] | undefined;
  }): Promise<StoredDispatchReview[]>;
  updateDispatchReview(input: {
    dispatchReviewId: string;
    expectedVersion: number;
    actorUserId: string;
    state?: DispatchReviewStatus | undefined;
    operationalOwnerUserId?: string | null | undefined;
    shortlistedCandidateCount?: number | undefined;
    preparedOfferCount?: number | undefined;
    startedAt?: Date | null | undefined;
    pausedAt?: Date | null | undefined;
    cancelledAt?: Date | null | undefined;
    closedAt?: Date | null | undefined;
    now: Date;
  }): Promise<StoredDispatchReview | null>;
  listCandidates(dispatchReviewId: string): Promise<StoredDispatchCandidate[]>;
  findShortlistedCandidateByWorkerIdentity(
    dispatchReviewId: string,
    workerIdentityId: string
  ): Promise<StoredDispatchCandidate | null>;
  upsertCandidate(input: {
    dispatchReviewId: string;
    candidate: Omit<
      StoredDispatchCandidate,
      | "id"
      | "dispatchReviewId"
      | "shortlistState"
      | "shortlistOrder"
      | "addedByUserId"
      | "removedByUserId"
      | "createdAt"
      | "updatedAt"
      | "version"
    >;
    actorUserId: string;
    now: Date;
  }): Promise<StoredDispatchCandidate>;
  updateCandidateShortlist(input: {
    dispatchReviewId: string;
    candidateSourceReference: string;
    shortlistState: DispatchShortlistState;
    shortlistOrder: number | null;
    actorUserId: string;
    now: Date;
  }): Promise<StoredDispatchCandidate | null>;
  reorderShortlist(input: {
    dispatchReviewId: string;
    candidateSourceReferences: readonly string[];
    actorUserId: string;
    now: Date;
  }): Promise<StoredDispatchCandidate[]>;
  recordDispatchAuditEvent(input: {
    action:
      | "dispatch.created"
      | "dispatch.owner_changed"
      | "dispatch.candidate_review_started"
      | "dispatch.candidate_source_unavailable"
      | "dispatch.candidate_evaluated"
      | "dispatch.candidate_shortlisted"
      | "dispatch.candidate_removed"
      | "dispatch.shortlist_reordered"
      | "dispatch.shortlist_ready"
      | "dispatch.offer_preparation"
      | "dispatch.paused"
      | "dispatch.resumed"
      | "dispatch.cancelled"
      | "dispatch.closed"
      | "dispatch.access_denied";
    organizationId: string | null;
    dispatchReviewId: string | null;
    jobRequestId: string | null;
    actorUserId: string | null;
    priorState: string | null;
    newState: string | null;
    reason: string | null;
    correlationId: string;
    createdAt: Date;
  }): Promise<void>;
}

export class DispatchError extends Error {
  decision: DispatchDecision;

  constructor(decision: DispatchDecision) {
    super(authorizationDeniedMessage);
    this.name = "DispatchError";
    this.decision = decision;
  }
}

export type WorkerIdentityStatus = "active" | "inactive" | "closed";
export type WorkerOfferStatus =
  | "draft"
  | "approved"
  | "sent"
  | "delivered"
  | "viewed"
  | "accepted"
  | "declined"
  | "expired"
  | "withdrawn"
  | "cancelled";
export type WorkerOfferDeliveryStatus = "pending" | "attempted" | "delivered" | "failed";
export type WorkerOfferResponseType = "accepted" | "declined";
export type WorkerOfferDecisionStatus =
  | "allow"
  | "invalid_input"
  | "not_found"
  | "permission_denied"
  | "version_conflict"
  | "invalid_transition"
  | "expired"
  | "duplicate_response"
  | "stale_terms"
  | "capacity_exceeded"
  | "worker_identity_inactive";

export interface StoredWorkerIdentity {
  id: string;
  userId: string;
  displayName: string | null;
  preferredLanguage: string | null;
  status: WorkerIdentityStatus;
  classification: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface StoredWorkerOffer {
  id: string;
  dispatchReviewId: string;
  jobRequestId: string;
  organizationId: string;
  residenceId: string;
  departmentId: string;
  workerIdentityId: string;
  currentTermsVersionId: string | null;
  status: WorkerOfferStatus;
  expiresAt: Date;
  approvedAt: Date | null;
  sentAt: Date | null;
  deliveredAt: Date | null;
  viewedAt: Date | null;
  respondedAt: Date | null;
  withdrawnAt: Date | null;
  cancelledAt: Date | null;
  createdByUserId: string;
  updatedByUserId: string | null;
  approvedByUserId: string | null;
  sentByUserId: string | null;
  withdrawnByUserId: string | null;
  cancelledByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface StoredWorkerOfferTermsVersion {
  id: string;
  workerOfferId: string;
  versionNumber: number;
  workerVisibleTitle: string;
  workerVisibleSummary: string | null;
  timezone: string;
  startAt: Date;
  endAt: Date;
  workGroupId: string;
  roleDefinitionId: string;
  compensationSummary: string | null;
  policySummary: string | null;
  createdByUserId: string;
  createdAt: Date;
}

export interface StoredWorkerOfferDeliveryAttempt {
  id: string;
  workerOfferId: string;
  status: WorkerOfferDeliveryStatus;
  providerBoundary: string;
  reason: string | null;
  attemptedAt: Date | null;
  deliveredAt: Date | null;
  failedAt: Date | null;
  createdByUserId: string | null;
  createdAt: Date;
}

export interface StoredWorkerOfferResponse {
  id: string;
  workerOfferId: string;
  workerIdentityId: string;
  termsVersionId: string;
  responseType: WorkerOfferResponseType;
  reason: string | null;
  createdAt: Date;
}

export interface PublicWorkerOffer extends StoredWorkerOffer {
  currentTermsVersion: StoredWorkerOfferTermsVersion | null;
  versionToken: number;
}

export interface WorkerOfferDecision {
  status: WorkerOfferDecisionStatus;
  allow: boolean;
  workerOffer: PublicWorkerOffer | null;
  roles: readonly AuthorizationRoleKey[];
  internalReason: string | null;
  externalCode: typeof authorizationDeniedCode | null;
  externalMessage: typeof authorizationDeniedMessage | null;
}

export interface WorkerOfferRepository {
  findWorkerIdentityById(workerIdentityId: string): Promise<StoredWorkerIdentity | null>;
  findWorkerIdentityByUserId(userId: string): Promise<StoredWorkerIdentity | null>;
  createWorkerIdentity(input: {
    userId: string;
    displayName?: string | null;
    preferredLanguage?: string | null;
    now: Date;
  }): Promise<StoredWorkerIdentity>;
  setWorkerClassification(input: {
    userId: string;
    classification: string;
    now: Date;
  }): Promise<StoredWorkerIdentity | null>;
  createWorkerOffer(input: {
    dispatchReview: StoredDispatchReview;
    jobRequest: StoredJobRequest;
    workerIdentity: StoredWorkerIdentity;
    expiresAt: Date;
    workerVisibleTitle: string;
    workerVisibleSummary: string | null;
    compensationSummary: string | null;
    policySummary: string | null;
    actorUserId: string;
    capacityLimit: number;
    now: Date;
  }): Promise<{ offer: StoredWorkerOffer; termsVersion: StoredWorkerOfferTermsVersion } | null>;
  findWorkerOfferById(workerOfferId: string): Promise<StoredWorkerOffer | null>;
  findCurrentTermsVersion(workerOfferId: string): Promise<StoredWorkerOfferTermsVersion | null>;
  listWorkerOffers(input: {
    dispatchReviewId?: string | undefined;
    organizationId?: string | undefined;
    workerIdentityId?: string | undefined;
    statuses?: readonly WorkerOfferStatus[] | undefined;
  }): Promise<StoredWorkerOffer[]>;
  countCapacityOffersForDispatch(dispatchReviewId: string): Promise<number>;
  updateWorkerOffer(input: {
    workerOfferId: string;
    expectedVersion: number;
    actorUserId: string | null;
    status?: WorkerOfferStatus | undefined;
    approvedAt?: Date | null | undefined;
    sentAt?: Date | null | undefined;
    deliveredAt?: Date | null | undefined;
    viewedAt?: Date | null | undefined;
    respondedAt?: Date | null | undefined;
    withdrawnAt?: Date | null | undefined;
    cancelledAt?: Date | null | undefined;
    now: Date;
  }): Promise<StoredWorkerOffer | null>;
  createDeliveryAttempt(input: {
    workerOfferId: string;
    status: WorkerOfferDeliveryStatus;
    providerBoundary: string;
    reason: string | null;
    actorUserId: string | null;
    now: Date;
  }): Promise<StoredWorkerOfferDeliveryAttempt>;
  finalizeAcceptedDelivery(input: {
    workerOfferId: string;
    expectedVersion: number;
    nextStatus: Extract<WorkerOfferStatus, "sent" | "delivered">;
    attemptStatus: Extract<WorkerOfferDeliveryStatus, "attempted" | "delivered">;
    attemptReason: string | null;
    organizationId: string;
    dispatchReviewId: string;
    jobRequestId: string;
    actorUserId: string | null;
    correlationId: string;
    now: Date;
  }): Promise<StoredWorkerOffer | null>;
  findResponseByOfferId(workerOfferId: string): Promise<StoredWorkerOfferResponse | null>;
  createResponse(input: {
    workerOfferId: string;
    workerIdentityId: string;
    termsVersionId: string;
    responseType: WorkerOfferResponseType;
    reason: string | null;
    now: Date;
  }): Promise<StoredWorkerOfferResponse>;
  respondToWorkerOfferAtomically(input: {
    workerOfferId: string;
    workerIdentityId: string;
    termsVersionId: string;
    responseType: WorkerOfferResponseType;
    reason: string | null;
    expectedVersion: number;
    nextStatus: Extract<WorkerOfferStatus, "accepted" | "declined">;
    actorUserId: string | null;
    now: Date;
  }): Promise<StoredWorkerOffer | null>;
  recordWorkerOfferAuditEvent(input: {
    action:
      | "worker_offer.created"
      | "worker_offer.terms_version_created"
      | "worker_offer.approved"
      | "worker_offer.sent"
      | "worker_offer.delivery_attempted"
      | "worker_offer.delivery_succeeded"
      | "worker_offer.delivery_failed"
      | "worker_offer.viewed"
      | "worker_offer.accepted"
      | "worker_offer.declined"
      | "worker_offer.expired"
      | "worker_offer.withdrawn"
      | "worker_offer.cancelled"
      | "worker_offer.response_rejected"
      | "worker_offer.access_denied";
    organizationId: string | null;
    workerOfferId: string | null;
    dispatchReviewId: string | null;
    jobRequestId: string | null;
    actorUserId: string | null;
    priorState: string | null;
    newState: string | null;
    reason: string | null;
    correlationId: string;
    createdAt: Date;
  }): Promise<void>;
}

export class WorkerOfferError extends Error {
  decision: WorkerOfferDecision;

  constructor(decision: WorkerOfferDecision) {
    super(authorizationDeniedMessage);
    this.name = "WorkerOfferError";
    this.decision = decision;
  }
}

export type AssignmentStatus =
  | "pending_validation"
  | "confirmed"
  | "worker_acknowledged"
  | "ready_for_attendance"
  | "in_attendance_window"
  | "attendance_handoff"
  | "worker_withdrawn"
  | "employer_cancelled"
  | "platform_cancelled"
  | "replacement_required"
  | "expired_before_start"
  | "closed";

export type AssignmentDecisionStatus =
  | "allow"
  | "invalid_input"
  | "not_found"
  | "permission_denied"
  | "version_conflict"
  | "invalid_transition"
  | "capacity_exceeded"
  | "worker_identity_inactive"
  | "worker_offer_not_accepted"
  | "terms_unavailable"
  | "assignment_exists"
  | "conflict_detected";

export interface StoredAssignment {
  id: string;
  jobRequestId: string;
  dispatchReviewId: string;
  workerOfferId: string;
  workerOfferTermsVersionId: string;
  workerIdentityId: string;
  organizationId: string;
  residenceId: string;
  departmentId: string;
  workGroupId: string;
  roleDefinitionId: string;
  status: AssignmentStatus;
  confirmedStartAt: Date;
  confirmedEndAt: Date;
  timezone: string;
  confirmedTitle: string;
  confirmedRoleSummary: string | null;
  confirmedWorksiteSummary: string | null;
  confirmedDepartmentSummary: string | null;
  confirmedResponsibilitySummary: string | null;
  confirmedPolicySummary: string | null;
  confirmedCompensationSummary: string | null;
  validationSnapshot: unknown | null;
  capacityCheckedAt: Date;
  conflictCheckedAt: Date;
  confirmedAt: Date;
  workerAcknowledgedAt: Date | null;
  readyForAttendanceAt: Date | null;
  attendanceWindowStartedAt: Date | null;
  attendanceHandoffAt: Date | null;
  workerWithdrawnAt: Date | null;
  cancelledAt: Date | null;
  replacementRequiredAt: Date | null;
  closedAt: Date | null;
  cancellationReasonCategory: string | null;
  createdByUserId: string;
  updatedByUserId: string | null;
  confirmedByUserId: string | null;
  cancelledByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface PublicAssignment extends StoredAssignment {
  versionToken: number;
  attendanceBoundary: "not_started" | "handoff_ready" | "handoff_completed";
}

export type AtomicAssignmentCreateFailure =
  | "worker_offer_not_found"
  | "worker_offer_version_changed"
  | "worker_offer_not_accepted"
  | "worker_offer_expired"
  | "response_not_accepted"
  | "current_terms_unavailable"
  | "source_chain_mismatch"
  | "job_request_not_dispatchable"
  | "dispatch_not_assignable"
  | "worker_identity_inactive"
  | "assignment_exists"
  | "job_capacity_reached"
  | "worker_schedule_conflict";

export type AtomicAssignmentCreateResult =
  | Readonly<{ ok: true; assignment: StoredAssignment }>
  | Readonly<{ ok: false; reason: AtomicAssignmentCreateFailure }>;

export interface AssignmentDecision {
  status: AssignmentDecisionStatus;
  allow: boolean;
  assignment: PublicAssignment | null;
  roles: readonly AuthorizationRoleKey[];
  internalReason: string | null;
  externalCode: typeof authorizationDeniedCode | null;
  externalMessage: typeof authorizationDeniedMessage | null;
}

export interface AssignmentRepository {
  createAssignmentFromAcceptedOfferAtomically(input: {
    workerOfferId: string;
    expectedDispatchReviewId: string;
    expectedOfferVersion: number;
    actorUserId: string;
    correlationId: string;
    now: Date;
  }): Promise<AtomicAssignmentCreateResult>;
  findAssignmentById(assignmentId: string): Promise<StoredAssignment | null>;
  findAssignmentByWorkerOfferId(workerOfferId: string): Promise<StoredAssignment | null>;
  listAssignments(input: {
    dispatchReviewId?: string | undefined;
    organizationId?: string | undefined;
    workerIdentityId?: string | undefined;
    jobRequestId?: string | undefined;
    statuses?: readonly AssignmentStatus[] | undefined;
  }): Promise<StoredAssignment[]>;
  countActiveAssignmentsForJobRequest(jobRequestId: string): Promise<number>;
  countConflictingAssignments(input: {
    workerIdentityId: string;
    startAt: Date;
    endAt: Date;
    excludeAssignmentId?: string | undefined;
  }): Promise<number>;
  updateAssignment(input: {
    assignmentId: string;
    expectedVersion: number;
    actorUserId: string | null;
    status?: AssignmentStatus | undefined;
    workerAcknowledgedAt?: Date | null | undefined;
    readyForAttendanceAt?: Date | null | undefined;
    attendanceWindowStartedAt?: Date | null | undefined;
    attendanceHandoffAt?: Date | null | undefined;
    workerWithdrawnAt?: Date | null | undefined;
    cancelledAt?: Date | null | undefined;
    replacementRequiredAt?: Date | null | undefined;
    closedAt?: Date | null | undefined;
    cancellationReasonCategory?: string | null | undefined;
    now: Date;
  }): Promise<StoredAssignment | null>;
  recordAssignmentAuditEvent(input: {
    action:
      | "assignment.creation_attempted"
      | "assignment.validation_passed"
      | "assignment.validation_failed"
      | "assignment.confirmed"
      | "assignment.worker_acknowledged"
      | "assignment.ready_for_attendance"
      | "assignment.attendance_window_started"
      | "assignment.attendance_handoff"
      | "assignment.worker_withdrawn"
      | "assignment.employer_cancelled"
      | "assignment.platform_cancelled"
      | "assignment.replacement_required"
      | "assignment.closed"
      | "assignment.access_denied"
      | "assignment.version_conflict";
    organizationId: string | null;
    assignmentId: string | null;
    workerOfferId: string | null;
    jobRequestId: string | null;
    actorUserId: string | null;
    priorState: string | null;
    newState: string | null;
    reason: string | null;
    correlationId: string;
    createdAt: Date;
  }): Promise<void>;
}

export class AssignmentError extends Error {
  decision: AssignmentDecision;

  constructor(decision: AssignmentDecision) {
    super(authorizationDeniedMessage);
    this.name = "AssignmentError";
    this.decision = decision;
  }
}

export class AssignmentTransactionUnavailableError extends Error {
  constructor() {
    super("Assignment transaction is temporarily unavailable.");
    this.name = "AssignmentTransactionUnavailableError";
  }
}

export type AttendanceStatus =
  | "pending_start"
  | "checked_in"
  | "checked_out"
  | "completed"
  | "missed"
  | "cancelled"
  | "exception";

export type AttendanceDecisionStatus =
  | "allow"
  | "invalid_input"
  | "not_found"
  | "permission_denied"
  | "version_conflict"
  | "invalid_transition"
  | "assignment_not_ready"
  | "attendance_exists"
  | "duplicate_check_in"
  | "duplicate_check_out"
  | "check_out_before_check_in";

export interface StoredAttendanceRecord {
  id: string;
  assignmentId: string;
  jobRequestId: string;
  workerIdentityId: string;
  organizationId: string;
  residenceId: string;
  departmentId: string;
  workGroupId: string;
  roleDefinitionId: string;
  status: AttendanceStatus;
  scheduledStartAt: Date;
  scheduledEndAt: Date;
  timezone: string;
  assignmentStatusSnapshot: string;
  verificationMethod: string;
  checkInAt: Date | null;
  checkInMethod: string | null;
  checkInEvidenceSummary: string | null;
  checkInLocationPolicyResult: string | null;
  checkOutAt: Date | null;
  checkOutMethod: string | null;
  checkOutEvidenceSummary: string | null;
  checkOutLocationPolicyResult: string | null;
  exceptionCategory: string | null;
  supervisorNote: string | null;
  createdByUserId: string;
  updatedByUserId: string | null;
  checkedInByUserId: string | null;
  checkedOutByUserId: string | null;
  cancelledByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  cancelledAt: Date | null;
  version: number;
}

export interface PublicAttendanceRecord extends StoredAttendanceRecord {
  versionToken: number;
  timesheetBoundary: "not_started" | "handoff_ready";
  verificationBoundary: "provider_neutral";
}

export interface AttendanceDecision {
  status: AttendanceDecisionStatus;
  allow: boolean;
  attendanceRecord: PublicAttendanceRecord | null;
  roles: readonly AuthorizationRoleKey[];
  internalReason: string | null;
  externalCode: typeof authorizationDeniedCode | null;
  externalMessage: typeof authorizationDeniedMessage | null;
}

export interface AttendanceRepository {
  createAttendanceFromAssignment(input: {
    assignment: StoredAssignment;
    actorUserId: string;
    verificationMethod: string;
    now: Date;
  }): Promise<StoredAttendanceRecord>;
  findAttendanceById(attendanceRecordId: string): Promise<StoredAttendanceRecord | null>;
  findAttendanceByAssignmentId(assignmentId: string): Promise<StoredAttendanceRecord | null>;
  listAttendance(input: {
    organizationId?: string | undefined;
    workerIdentityId?: string | undefined;
    assignmentId?: string | undefined;
    statuses?: readonly AttendanceStatus[] | undefined;
  }): Promise<StoredAttendanceRecord[]>;
  updateAttendance(input: {
    attendanceRecordId: string;
    expectedVersion: number;
    actorUserId: string | null;
    status?: AttendanceStatus | undefined;
    checkInAt?: Date | null | undefined;
    checkInMethod?: string | null | undefined;
    checkInEvidenceSummary?: string | null | undefined;
    checkInLocationPolicyResult?: string | null | undefined;
    checkOutAt?: Date | null | undefined;
    checkOutMethod?: string | null | undefined;
    checkOutEvidenceSummary?: string | null | undefined;
    checkOutLocationPolicyResult?: string | null | undefined;
    exceptionCategory?: string | null | undefined;
    supervisorNote?: string | null | undefined;
    completedAt?: Date | null | undefined;
    cancelledAt?: Date | null | undefined;
    checkedInByUserId?: string | null | undefined;
    checkedOutByUserId?: string | null | undefined;
    cancelledByUserId?: string | null | undefined;
    now: Date;
  }): Promise<StoredAttendanceRecord | null>;
  recordAttendanceAuditEvent(input: {
    action:
      | "attendance.creation_attempted"
      | "attendance.validation_failed"
      | "attendance.created"
      | "attendance.check_in_attempted"
      | "attendance.checked_in"
      | "attendance.check_out_attempted"
      | "attendance.checked_out"
      | "attendance.completed"
      | "attendance.missed"
      | "attendance.cancelled"
      | "attendance.exception"
      | "attendance.access_denied"
      | "attendance.version_conflict";
    organizationId: string | null;
    attendanceRecordId: string | null;
    assignmentId: string | null;
    actorUserId: string | null;
    priorState: string | null;
    newState: string | null;
    reason: string | null;
    correlationId: string;
    createdAt: Date;
  }): Promise<void>;
}

export class AttendanceError extends Error {
  decision: AttendanceDecision;

  constructor(decision: AttendanceDecision) {
    super(authorizationDeniedMessage);
    this.name = "AttendanceError";
    this.decision = decision;
  }
}

export type TimesheetStatus =
  | "draft"
  | "calculation_pending"
  | "review_required"
  | "worker_review"
  | "employer_review"
  | "platform_review"
  | "approved"
  | "locked"
  | "rejected"
  | "correction_required"
  | "cancelled";

export type TimesheetDecisionStatus =
  | "allow"
  | "invalid_input"
  | "not_found"
  | "permission_denied"
  | "version_conflict"
  | "invalid_transition"
  | "attendance_not_ready"
  | "timesheet_exists"
  | "attendance_changed"
  | "assignment_changed"
  | "worker_review_required"
  | "employer_review_required"
  | "locked_record";

export interface StoredTimesheet {
  id: string;
  assignmentId: string;
  attendanceRecordId: string;
  jobRequestId: string;
  workerIdentityId: string;
  organizationId: string;
  residenceId: string;
  departmentId: string;
  workGroupId: string;
  roleDefinitionId: string;
  status: TimesheetStatus;
  attendanceVersionSnapshot: number;
  assignmentVersionSnapshot: number;
  scheduledStartAt: Date;
  scheduledEndAt: Date;
  actualCheckInAt: Date | null;
  actualCheckOutAt: Date | null;
  timezone: string;
  rawElapsedMinutes: number | null;
  payableMinutes: number | null;
  billableMinutes: number | null;
  excludedMinutes: number;
  breakMinutes: number;
  premiumCandidateMinutes: number;
  overtimeCandidateMinutes: number;
  roundingAdjustmentMinutes: number;
  exceptionSummary: string | null;
  workerReviewStatus: string;
  workerReviewedAt: Date | null;
  employerReviewStatus: string;
  employerReviewedAt: Date | null;
  platformReviewStatus: string;
  platformReviewedAt: Date | null;
  approvedAt: Date | null;
  lockedAt: Date | null;
  rejectedAt: Date | null;
  cancelledAt: Date | null;
  correctionReason: string | null;
  createdByUserId: string;
  updatedByUserId: string | null;
  workerReviewedByUserId: string | null;
  employerReviewedByUserId: string | null;
  platformReviewedByUserId: string | null;
  lockedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface StoredTimesheetCalculationSnapshot {
  id: string;
  timesheetId: string;
  attendanceRecordId: string;
  attendanceVersionSnapshot: number;
  assignmentId: string;
  assignmentVersionSnapshot: number;
  calculationPolicyVersion: string;
  countryPackVersion: string;
  rawCheckInAt: Date;
  rawCheckOutAt: Date;
  normalizedCheckInAt: Date;
  normalizedCheckOutAt: Date;
  timezone: string;
  breakRule: string;
  roundingRule: string;
  rawElapsedMinutes: number;
  payableMinutes: number;
  billableMinutes: number;
  excludedMinutes: number;
  breakMinutes: number;
  premiumCandidateMinutes: number;
  overtimeCandidateMinutes: number;
  roundingAdjustmentMinutes: number;
  exceptionFlags: string[];
  calculationEngineVersion: string;
  createdAt: Date;
}

export interface PublicTimesheet extends StoredTimesheet {
  versionToken: number;
  attendanceBoundary: "preserved";
  payrollBoundary: "not_started" | "handoff_ready";
  financeBoundary: "not_started" | "handoff_ready";
  calculationBoundary: "time_only_no_money";
}

export interface TimesheetDecision {
  status: TimesheetDecisionStatus;
  allow: boolean;
  timesheet: PublicTimesheet | null;
  roles: readonly AuthorizationRoleKey[];
  internalReason: string | null;
  externalCode: typeof authorizationDeniedCode | null;
  externalMessage: typeof authorizationDeniedMessage | null;
}

export interface TimesheetRepository {
  createTimesheetFromAttendance(input: {
    attendanceRecord: StoredAttendanceRecord;
    assignment: StoredAssignment;
    actorUserId: string;
    now: Date;
  }): Promise<StoredTimesheet>;
  findTimesheetById(timesheetId: string): Promise<StoredTimesheet | null>;
  findTimesheetByAttendanceRecordId(attendanceRecordId: string): Promise<StoredTimesheet | null>;
  findTimesheetByAssignmentId(assignmentId: string): Promise<StoredTimesheet | null>;
  listTimesheets(input: {
    organizationId?: string | undefined;
    workerIdentityId?: string | undefined;
    assignmentId?: string | undefined;
    statuses?: readonly TimesheetStatus[] | undefined;
  }): Promise<StoredTimesheet[]>;
  updateTimesheet(input: {
    timesheetId: string;
    expectedVersion: number;
    actorUserId: string | null;
    status?: TimesheetStatus | undefined;
    actualCheckInAt?: Date | null | undefined;
    actualCheckOutAt?: Date | null | undefined;
    rawElapsedMinutes?: number | null | undefined;
    payableMinutes?: number | null | undefined;
    billableMinutes?: number | null | undefined;
    excludedMinutes?: number | undefined;
    breakMinutes?: number | undefined;
    premiumCandidateMinutes?: number | undefined;
    overtimeCandidateMinutes?: number | undefined;
    roundingAdjustmentMinutes?: number | undefined;
    exceptionSummary?: string | null | undefined;
    workerReviewStatus?: string | undefined;
    workerReviewedAt?: Date | null | undefined;
    employerReviewStatus?: string | undefined;
    employerReviewedAt?: Date | null | undefined;
    platformReviewStatus?: string | undefined;
    platformReviewedAt?: Date | null | undefined;
    approvedAt?: Date | null | undefined;
    lockedAt?: Date | null | undefined;
    rejectedAt?: Date | null | undefined;
    cancelledAt?: Date | null | undefined;
    correctionReason?: string | null | undefined;
    workerReviewedByUserId?: string | null | undefined;
    employerReviewedByUserId?: string | null | undefined;
    platformReviewedByUserId?: string | null | undefined;
    lockedByUserId?: string | null | undefined;
    now: Date;
  }): Promise<StoredTimesheet | null>;
  createCalculationSnapshot(input: {
    timesheet: StoredTimesheet;
    attendanceRecord: StoredAttendanceRecord;
    assignment: StoredAssignment;
    calculation: TimesheetCalculationResult;
    now: Date;
  }): Promise<StoredTimesheetCalculationSnapshot>;
  listCalculationSnapshots(timesheetId: string): Promise<StoredTimesheetCalculationSnapshot[]>;
  recordTimesheetAuditEvent(input: {
    action:
      | "timesheet.creation_attempted"
      | "timesheet.validation_failed"
      | "timesheet.created"
      | "timesheet.calculation_started"
      | "timesheet.calculation_completed"
      | "timesheet.calculation_failed"
      | "timesheet.worker_confirmed"
      | "timesheet.worker_disputed"
      | "timesheet.employer_confirmed"
      | "timesheet.employer_disputed"
      | "timesheet.correction_requested"
      | "timesheet.exceptions_overridden"
      | "timesheet.approved"
      | "timesheet.rejected"
      | "timesheet.locked"
      | "timesheet.cancelled"
      | "timesheet.access_denied"
      | "timesheet.version_conflict";
    organizationId: string | null;
    timesheetId: string | null;
    attendanceRecordId: string | null;
    assignmentId: string | null;
    actorUserId: string | null;
    priorState: string | null;
    newState: string | null;
    reason: string | null;
    correlationId: string;
    createdAt: Date;
  }): Promise<void>;
}

export class TimesheetError extends Error {
  decision: TimesheetDecision;

  constructor(decision: TimesheetDecision) {
    super(authorizationDeniedMessage);
    this.name = "TimesheetError";
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
    "Read department records within an organization and residence context.",
    "organization",
    "active",
    "May expose operating structure.",
    "Deny without organization and residence context."
  ),
  permission(
    "department.create",
    "Create department records within an organization and residence context.",
    "organization",
    "active",
    "Could create operational units before membership controls exist.",
    "Mapped only to approved organization roles."
  ),
  permission(
    "department.update",
    "Update department records within an organization and residence context.",
    "organization",
    "active",
    "Could alter operating units.",
    "Mapped only to approved organization roles."
  ),
  permission(
    "work_group.read",
    "Read the approved work group catalogue.",
    "none",
    "active",
    "Low risk global catalogue read with no tenant-owned data.",
    "Only active catalogue entries are exposed to ordinary users."
  ),
  permission(
    "role_definition.read",
    "Read the approved operational role definition catalogue.",
    "none",
    "active",
    "Low risk global catalogue read with no tenant-owned data.",
    "Only active role definitions under active WorkGroups are exposed to ordinary users."
  ),
  permission(
    "job_request.create",
    "Create draft job requests within an organization context.",
    "organization",
    "active",
    "Creates commercial staffing demand.",
    "Requires active organization membership and active parent records."
  ),
  permission(
    "job_request.read",
    "Read job requests within an organization context.",
    "organization",
    "active",
    "May expose commercial staffing demand.",
    "Requires active organization membership or explicit platform intake authority."
  ),
  permission(
    "job_request.update_draft",
    "Update draft job requests within an organization context.",
    "organization",
    "active",
    "Could alter commercial demand.",
    "Allowed only before governed submission or information-required resubmission."
  ),
  permission(
    "job_request.submit",
    "Submit job requests for admin review.",
    "organization",
    "active",
    "Could trigger operational review before workflow exists.",
    "Allowed for draft and information-required requests only."
  ),
  permission(
    "job_request.cancel",
    "Cancel job requests within a governed organization context.",
    "organization",
    "active",
    "Could alter commercial demand.",
    "Allowed only for approved pre-dispatch states."
  ),
  permission(
    "job_request.admin_review",
    "Perform platform job request intake review.",
    "platform",
    "active",
    "Could approve operational dispatch if activated too early.",
    "Platform Administrator only."
  ),
  permission(
    "job_request.request_information",
    "Request job request information from an employer.",
    "platform",
    "active",
    "Could affect employer workflow if activated too early.",
    "Platform Administrator only; requires a reason."
  ),
  permission(
    "job_request.approve_for_dispatch",
    "Approve job requests for the future dispatch boundary.",
    "platform",
    "active",
    "Could move staffing demand into dispatch if activated too early.",
    "Creates only the approved-for-dispatch boundary state."
  ),
  permission(
    "dispatch.create",
    "Create a dispatch review for an approved job request.",
    "platform",
    "active",
    "Could open operational staffing review before admin approval.",
    "Dispatcher and Platform Administrator only; requires approved-for-dispatch Job Request."
  ),
  permission(
    "dispatch.read",
    "Read dispatch review summaries and governed candidate evaluation summaries.",
    "platform",
    "active",
    "Could expose internal dispatch state or candidate summaries.",
    "Dispatcher and Platform Administrator only."
  ),
  permission(
    "dispatch.review_candidates",
    "Start or run governed candidate review.",
    "platform",
    "active",
    "Could imply candidate eligibility if source truthfulness is not preserved.",
    "Candidate source unavailable must remain explicit."
  ),
  permission(
    "dispatch.manage_shortlist",
    "Add, remove, or reorder candidates on a manual dispatch shortlist.",
    "platform",
    "active",
    "Could unfairly affect worker opportunity if audit reason is absent.",
    "Requires explicit human actor and auditable reason."
  ),
  permission(
    "dispatch.pause",
    "Pause an active dispatch review.",
    "platform",
    "active",
    "Could delay staffing without auditability.",
    "Requires dispatcher authority and reason."
  ),
  permission(
    "dispatch.resume",
    "Resume a paused dispatch review.",
    "platform",
    "active",
    "Could resume operational review without human oversight.",
    "Requires dispatcher authority."
  ),
  permission(
    "dispatch.cancel",
    "Cancel a dispatch review before offer or assignment authority.",
    "platform",
    "active",
    "Could halt staffing demand without preserving source state.",
    "Requires dispatcher authority and reason."
  ),
  permission(
    "dispatch.close",
    "Close a dispatch review without creating worker offers or assignments.",
    "platform",
    "active",
    "Could be confused with completed staffing.",
    "Closure remains separate from offer, assignment, attendance, and finance."
  ),
  permission(
    "dispatch.prepare_offer",
    "Move dispatch to the offer-preparation boundary.",
    "platform",
    "active",
    "Could be mistaken for creating a Worker Offer.",
    "Must not create WorkerOffer, Assignment, notification, or calendar hold."
  ),
  permission(
    "dispatch.audit_read",
    "Read dispatch audit summaries.",
    "platform",
    "active",
    "Could expose internal staffing review history.",
    "Dispatcher and Platform Administrator only."
  ),
  permission(
    "dispatch.supervise",
    "Reserved future dispatch supervision capability.",
    "platform",
    "reserved",
    "Would grant elevated dispatch oversight if activated silently.",
    "Not assigned to active roles in this foundation."
  ),
  permission(
    "worker_offer.create",
    "Create governed Worker Offers from an offer-preparation dispatch boundary.",
    "platform",
    "active",
    "Could expose worker-facing terms or exceed remaining staffing need.",
    "Dispatcher and Platform Administrator only; does not create Assignment."
  ),
  permission(
    "worker_offer.read",
    "Read governed Worker Offer summaries.",
    "platform",
    "active",
    "Could expose worker offer state beyond minimum operational need.",
    "Dispatcher and Platform Administrator only."
  ),
  permission(
    "worker_offer.approve",
    "Approve a draft Worker Offer for sending.",
    "platform",
    "active",
    "Could make incomplete offer terms eligible for sending.",
    "Requires draft offer, current terms version, and explicit human actor."
  ),
  permission(
    "worker_offer.send",
    "Send an approved Worker Offer through the abstract delivery boundary.",
    "platform",
    "active",
    "Could be mistaken for notification-provider execution.",
    "Creates only abstract delivery attempts; no provider integration."
  ),
  permission(
    "worker_offer.withdraw",
    "Withdraw a non-terminal Worker Offer.",
    "platform",
    "active",
    "Could remove worker opportunity without auditability.",
    "Requires dispatcher authority and reason."
  ),
  permission(
    "worker_offer.cancel",
    "Cancel a Worker Offer before Assignment authority exists.",
    "platform",
    "active",
    "Could be confused with cancelling Assignment or attendance.",
    "Requires dispatcher authority and reason; no Assignment changes."
  ),
  permission(
    "worker_offer.audit_read",
    "Read Worker Offer audit summaries.",
    "platform",
    "active",
    "Could expose internal offer history.",
    "Dispatcher and Platform Administrator only."
  ),
  permission(
    "worker_offer.respond",
    "Allow a worker to accept or decline their own sent offer.",
    "none",
    "active",
    "Could accept another worker's offer if ownership is not enforced.",
    "Requires authenticated WorkerIdentity ownership and current terms."
  ),
  permission(
    "worker_offer.supervise",
    "Reserved future Worker Offer supervision capability.",
    "platform",
    "reserved",
    "Would grant elevated offer oversight if activated silently.",
    "Not assigned to active roles in this foundation."
  ),
  permission(
    "assignment.create",
    "Create an authoritative Assignment from an accepted Worker Offer after final validation.",
    "platform",
    "active",
    "Could incorrectly convert an offer into attendance if preconditions are bypassed.",
    "Requires accepted Worker Offer, capacity validation, conflict recheck, and platform actor."
  ),
  permission(
    "assignment.read",
    "Read governed Assignment status for authorized platform or employer users.",
    "organization",
    "active",
    "Could expose worker operational commitments beyond minimum necessary access.",
    "Requires organization context and returns Assignment status only."
  ),
  permission(
    "assignment.cancel",
    "Cancel an Assignment through a governed administrative boundary.",
    "platform",
    "active",
    "Could erase a work commitment without audit or replacement context.",
    "Requires reason category and preserves historical Assignment."
  ),
  permission(
    "assignment.withdraw",
    "Record worker withdrawal from an Assignment through a governed platform boundary.",
    "platform",
    "active",
    "Could be confused with discipline or timesheet impact.",
    "Preserves neutral withdrawal state and does not calculate penalties."
  ),
  permission(
    "assignment.mark_replacement_required",
    "Mark an Assignment as requiring replacement without executing replacement.",
    "platform",
    "active",
    "Could be mistaken for replacement dispatch execution.",
    "Marks boundary only; Replacement Engine remains downstream."
  ),
  permission(
    "assignment.attendance_handoff",
    "Move Assignment to the Attendance handoff boundary.",
    "platform",
    "active",
    "Could be mistaken for GPS or attendance evidence.",
    "Does not create attendance records, GPS events, worked time, or timesheets."
  ),
  permission(
    "assignment.audit_read",
    "Read Assignment audit summaries.",
    "platform",
    "active",
    "Could expose operational history beyond least privilege.",
    "Dispatcher and Platform Administrator only."
  ),
  permission(
    "assignment.worker_read",
    "Allow a worker to read their own Assignment.",
    "none",
    "active",
    "Could expose another worker's schedule if ownership is not enforced.",
    "Requires authenticated WorkerIdentity ownership."
  ),
  permission(
    "assignment.worker_acknowledge",
    "Allow a worker to acknowledge their own Assignment.",
    "none",
    "active",
    "Could be confused with attendance acceptance.",
    "Acknowledgement does not create attendance evidence."
  ),
  permission(
    "assignment.worker_withdraw",
    "Allow a worker to request withdrawal from their own Assignment.",
    "none",
    "active",
    "Could be treated as discipline if not neutral and auditable.",
    "Records neutral withdrawal boundary only; replacement remains downstream."
  ),
  permission(
    "assignment.supervise",
    "Reserved future Assignment supervision capability.",
    "platform",
    "reserved",
    "Would grant elevated assignment oversight if activated silently.",
    "Not assigned to active roles in this foundation."
  ),
  permission(
    "attendance.create",
    "Create an AttendanceRecord from a valid Assignment.",
    "platform",
    "active",
    "Could create operational evidence without a valid Assignment if preconditions are bypassed.",
    "Requires Assignment handoff state and creates no timesheet, payroll, finance, or GPS provider record."
  ),
  permission(
    "attendance.read",
    "Read governed Attendance status for authorized platform or employer users.",
    "organization",
    "active",
    "Could expose worker presence information beyond minimum necessary access.",
    "Requires organization context and returns attendance status only."
  ),
  permission(
    "attendance.check_in",
    "Record platform-supervised check-in evidence.",
    "platform",
    "active",
    "Could fabricate arrival evidence if not actor-bound and audited.",
    "Records timestamped evidence only; does not approve time or payroll."
  ),
  permission(
    "attendance.check_out",
    "Record platform-supervised check-out evidence.",
    "platform",
    "active",
    "Could fabricate departure evidence if not actor-bound and audited.",
    "Records timestamped evidence only; does not approve time or payroll."
  ),
  permission(
    "attendance.override",
    "Mark an AttendanceRecord as an exception or completed by supervised review.",
    "platform",
    "active",
    "Could be mistaken for timesheet approval or worker discipline.",
    "Preserves original evidence and does not calculate approved hours."
  ),
  permission(
    "attendance.cancel",
    "Cancel Attendance when Assignment context is no longer valid.",
    "platform",
    "active",
    "Could erase operational evidence without audit if misused.",
    "Preserves cancelled state and does not modify Assignment history."
  ),
  permission(
    "attendance.audit_read",
    "Read Attendance audit summaries.",
    "platform",
    "active",
    "Could expose operational evidence history beyond least privilege.",
    "Dispatcher and Platform Administrator only."
  ),
  permission(
    "attendance.worker_read",
    "Allow a worker to read their own AttendanceRecord.",
    "none",
    "active",
    "Could expose another worker's attendance if ownership is not enforced.",
    "Requires authenticated WorkerIdentity ownership."
  ),
  permission(
    "attendance.worker_check_in",
    "Allow a worker to check in to their own AttendanceRecord.",
    "none",
    "active",
    "Could fabricate another worker's arrival if ownership is not enforced.",
    "Records worker-owned timestamp evidence only."
  ),
  permission(
    "attendance.worker_check_out",
    "Allow a worker to check out of their own AttendanceRecord.",
    "none",
    "active",
    "Could fabricate another worker's departure if ownership is not enforced.",
    "Records worker-owned timestamp evidence only."
  ),
  permission(
    "attendance.supervise",
    "Reserved future Attendance supervision capability.",
    "platform",
    "reserved",
    "Would grant elevated attendance oversight if activated silently.",
    "Not assigned to active roles in this foundation."
  ),
  permission(
    "timesheet.create",
    "Create a Timesheet from completed or resolved Attendance evidence.",
    "platform",
    "active",
    "Could convert incomplete attendance evidence into reviewed work time.",
    "Requires Attendance validation and creates no payroll, finance, invoice, or payment record."
  ),
  permission(
    "timesheet.read",
    "Read governed Timesheet summaries for authorized platform users.",
    "platform",
    "active",
    "Could expose payable and billable time boundaries beyond least privilege.",
    "Timesheet Reviewer and Platform Administrator only."
  ),
  permission(
    "timesheet.calculate",
    "Create a versioned Timesheet calculation snapshot.",
    "platform",
    "active",
    "Could produce unauditable time values if calculation inputs are not versioned.",
    "Requires Attendance and Assignment input versions."
  ),
  permission(
    "timesheet.recalculate",
    "Recalculate an unlocked Timesheet through a governed review path.",
    "platform",
    "active",
    "Could silently change reviewed time if previous snapshots are overwritten.",
    "Creates a new calculation snapshot and preserves prior state."
  ),
  permission(
    "timesheet.review",
    "Review Timesheet exceptions and correction requests.",
    "platform",
    "active",
    "Could be confused with payroll approval if boundary language is weak.",
    "Review never creates payroll or invoice records."
  ),
  permission(
    "timesheet.approve",
    "Approve governed Timesheet time values before locking.",
    "platform",
    "active",
    "Could prematurely authorize downstream payroll or finance if review is incomplete.",
    "Requires worker and employer review boundaries before platform approval."
  ),
  permission(
    "timesheet.lock",
    "Lock an approved Timesheet for future Payroll and Finance handoff boundaries.",
    "platform",
    "active",
    "Could prevent fair correction if locked records are overwritten or lack correction paths.",
    "Locked Timesheets are immutable except through formal correction."
  ),
  permission(
    "timesheet.reject",
    "Reject an invalid Timesheet with a governed reason.",
    "platform",
    "active",
    "Could unfairly block payable review without evidence and audit.",
    "Requires reason and audit; creates no disciplinary conclusion."
  ),
  permission(
    "timesheet.request_correction",
    "Request Timesheet correction before approval or after review exception.",
    "platform",
    "active",
    "Could hide time changes if original values are not preserved.",
    "Keeps Attendance immutable and requires recalculation or formal adjustment."
  ),
  permission(
    "timesheet.override_exceptions",
    "Accept flagged Timesheet review exceptions and release it into the normal review chain.",
    "platform",
    "active",
    "Could wave through anomalous time if applied without evidence or audit.",
    "Requires an audited reason; never approves pay and never mutates Attendance or minutes."
  ),
  permission(
    "timesheet.adjust",
    "Reserved formal adjustment capability for post-lock correction.",
    "platform",
    "active",
    "Could alter financial inputs if used without strict evidence.",
    "Approved for boundary only; no payroll or finance posting."
  ),
  permission(
    "timesheet.audit_read",
    "Read Timesheet audit summaries.",
    "platform",
    "active",
    "Could expose review and dispute history beyond least privilege.",
    "Timesheet Reviewer and Platform Administrator only."
  ),
  permission(
    "timesheet.worker_read",
    "Allow a worker to read their own Timesheet.",
    "none",
    "active",
    "Could expose another worker's time if ownership is not enforced.",
    "Requires authenticated WorkerIdentity ownership."
  ),
  permission(
    "timesheet.worker_confirm",
    "Allow a worker to explicitly confirm their own Timesheet review.",
    "none",
    "active",
    "Could create hidden consent if silence is treated as confirmation.",
    "Requires explicit worker action; silence never counts."
  ),
  permission(
    "timesheet.worker_dispute",
    "Allow a worker to dispute their own Timesheet.",
    "none",
    "active",
    "Could expose sensitive dispute information if not scoped.",
    "Requires worker ownership and audit."
  ),
  permission(
    "timesheet.employer_read",
    "Allow an employer to read organization-scoped Timesheet status.",
    "organization",
    "active",
    "Could expose worker-payable details or cross-tenant time records.",
    "Requires organization context and hides confidential commercial/worker data."
  ),
  permission(
    "timesheet.employer_confirm",
    "Allow an employer to confirm organization-scoped Timesheet review.",
    "organization",
    "active",
    "Could be mistaken for platform approval or payroll execution.",
    "Employer confirmation does not approve payroll or modify Attendance evidence."
  ),
  permission(
    "timesheet.employer_dispute",
    "Allow an employer to dispute organization-scoped Timesheet details.",
    "organization",
    "active",
    "Could unfairly alter worker time if treated as evidence rewrite.",
    "Creates a correction-required review state and preserves Attendance."
  ),
  permission(
    "timesheet.supervise",
    "Reserved future Timesheet supervision capability.",
    "platform",
    "reserved",
    "Would grant elevated Timesheet oversight if activated silently.",
    "Not assigned to active roles in this foundation."
  ),
  permission(
    "audit.read",
    "Read approved audit summaries.",
    "platform",
    "active",
    "Could expose sensitive operational history.",
    "Platform Administrator only."
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
    "role_definition.read",
    "job_request.admin_review",
    "job_request.request_information",
    "job_request.approve_for_dispatch",
    "dispatch.create",
    "dispatch.read",
    "dispatch.review_candidates",
    "dispatch.manage_shortlist",
    "dispatch.pause",
    "dispatch.resume",
    "dispatch.cancel",
    "dispatch.close",
    "dispatch.prepare_offer",
    "dispatch.audit_read",
    "worker_offer.create",
    "worker_offer.read",
    "worker_offer.approve",
    "worker_offer.send",
    "worker_offer.withdraw",
    "worker_offer.cancel",
    "worker_offer.audit_read",
    "assignment.create",
    "assignment.read",
    "assignment.cancel",
    "assignment.withdraw",
    "assignment.mark_replacement_required",
    "assignment.attendance_handoff",
    "assignment.audit_read",
    "attendance.create",
    "attendance.read",
    "attendance.check_in",
    "attendance.check_out",
    "attendance.override",
    "attendance.cancel",
    "attendance.audit_read",
    "timesheet.create",
    "timesheet.read",
    "timesheet.calculate",
    "timesheet.recalculate",
    "timesheet.review",
    "timesheet.approve",
    "timesheet.lock",
    "timesheet.reject",
    "timesheet.request_correction",
    "timesheet.override_exceptions",
    "timesheet.adjust",
    "timesheet.audit_read",
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
    "job_request.cancel",
    "assignment.read",
    "attendance.read",
    "timesheet.employer_read",
    "timesheet.employer_confirm",
    "timesheet.employer_dispute"
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
    "job_request.cancel",
    "assignment.read",
    "attendance.read",
    "timesheet.employer_read",
    "timesheet.employer_confirm",
    "timesheet.employer_dispute"
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
    "job_request.cancel",
    "assignment.read",
    "attendance.read",
    "timesheet.employer_read",
    "timesheet.employer_confirm",
    "timesheet.employer_dispute"
  ]),
  roleDefinition("WORKER_ACCESS", "Worker Access", "none", [
    "worker_offer.respond",
    "assignment.worker_read",
    "assignment.worker_acknowledge",
    "assignment.worker_withdraw",
    "attendance.worker_read",
    "attendance.worker_check_in",
    "attendance.worker_check_out",
    "timesheet.worker_read",
    "timesheet.worker_confirm",
    "timesheet.worker_dispute"
  ]),
  roleDefinition("DISPATCHER", "Dispatcher", "platform", [
    "dispatch.create",
    "dispatch.read",
    "dispatch.review_candidates",
    "dispatch.manage_shortlist",
    "dispatch.pause",
    "dispatch.resume",
    "dispatch.cancel",
    "dispatch.close",
    "dispatch.prepare_offer",
    "dispatch.audit_read",
    "worker_offer.create",
    "worker_offer.read",
    "worker_offer.approve",
    "worker_offer.send",
    "worker_offer.withdraw",
    "worker_offer.cancel",
    "worker_offer.audit_read",
    "assignment.create",
    "assignment.read",
    "assignment.cancel",
    "assignment.withdraw",
    "assignment.mark_replacement_required",
    "assignment.attendance_handoff",
    "assignment.audit_read",
    "attendance.create",
    "attendance.read",
    "attendance.check_in",
    "attendance.check_out",
    "attendance.override",
    "attendance.cancel",
    "attendance.audit_read",
    "timesheet.read"
  ]),
  roleDefinition("TIMESHEET_REVIEWER", "Timesheet Reviewer", "platform", [
    "timesheet.create",
    "timesheet.read",
    "timesheet.calculate",
    "timesheet.recalculate",
    "timesheet.review",
    "timesheet.approve",
    "timesheet.lock",
    "timesheet.reject",
    "timesheet.request_correction",
    "timesheet.override_exceptions",
    "timesheet.adjust",
    "timesheet.audit_read"
  ])
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

export function createAuthorizationDecision(
  input: AuthorizationDecisionInput
): AuthorizationDecision {
  const roles = sanitizeAuthorizationRoles(input.roles ?? []);
  const permissionDefinition = getAuthorizationPermission(input.permission);
  const correlationId = input.correlationId ?? createAuthorizationCorrelationId();

  if (!input.session.authenticated || !input.session.user || !input.session.session) {
    return deny("session_invalid", "session_invalid", input.permission, roles, correlationId);
  }

  if (input.session.user.status === "disabled" || input.session.user.status === "closed") {
    return deny(
      "account_inactive",
      `account_${input.session.user.status}`,
      input.permission,
      roles,
      correlationId
    );
  }

  if (!permissionDefinition) {
    return deny("permission_missing", "unknown_permission", input.permission, roles, correlationId);
  }

  if (roles.length === 0) {
    return deny("permission_missing", "no_role", input.permission, roles, correlationId);
  }

  if (permissionDefinition.context === "organization" && !input.resourceContext?.organizationId) {
    return deny(
      "context_required",
      "organization_context_required",
      input.permission,
      roles,
      correlationId
    );
  }

  if (permissionDefinition.context === "platform" && input.platformContext?.platform !== true) {
    return deny(
      "context_required",
      "platform_context_required",
      input.permission,
      roles,
      correlationId
    );
  }

  const permissions = new Set(
    roles.flatMap((role) => getAuthorizationRole(role)?.permissions ?? [])
  );

  if (!permissions.has(permissionDefinition.key)) {
    return deny(
      "permission_missing",
      "role_lacks_permission",
      input.permission,
      roles,
      correlationId
    );
  }

  if (permissionDefinition.lifecycle === "reserved") {
    return deny(
      "deny",
      "permission_reserved_for_future_service",
      input.permission,
      roles,
      correlationId
    );
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
      const existingMembership = await repository.findMembershipForUserByOrganization(
        input.userId,
        input.organizationId
      );

      if (existingMembership) {
        const decision = membershipDeny(
          "duplicate_membership",
          "duplicate_membership",
          null,
          input.organizationId,
          []
        );
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

    async activateMembership(input: {
      userId: string;
      membershipId: string;
      actorUserId: string;
      correlationId?: string;
    }) {
      const membership = await assertMembershipBelongsToUser(
        repository,
        input.userId,
        input.membershipId
      );
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

    async suspendMembership(input: {
      userId: string;
      membershipId: string;
      actorUserId: string;
      correlationId?: string;
    }) {
      return updateMembershipLifecycle(repository, {
        ...input,
        status: "suspended",
        auditAction: "membership.suspended",
        now: now()
      });
    },

    async revokeMembership(input: {
      userId: string;
      membershipId: string;
      actorUserId: string;
      correlationId?: string;
    }) {
      return updateMembershipLifecycle(repository, {
        ...input,
        status: "revoked",
        auditAction: "membership.revoked",
        now: now()
      });
    },

    async expireMembership(input: {
      userId: string;
      membershipId: string;
      actorUserId: string | null;
      correlationId?: string;
    }) {
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
      const membership = await assertMembershipBelongsToUser(
        repository,
        input.userId,
        input.membershipId
      );
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
        const decision = membershipDeny(
          "context_required",
          "organization_context_required",
          null,
          null,
          []
        );
        await auditMembershipDenial(repository, {
          decision,
          userId: input.userId,
          actorUserId: input.userId,
          correlationId: input.correlationId,
          createdAt: currentTime
        });
        return decision;
      }

      const membership = await repository.findMembershipForUserByOrganization(
        input.userId,
        input.organizationId
      );

      if (!membership) {
        const decision = membershipDeny(
          "membership_missing",
          "membership_not_found",
          null,
          input.organizationId,
          []
        );
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
        const decision = organizationDeny(
          "invalid_input",
          "invalid_organization_name",
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

    async getOrganization(input: {
      actorUserId: string;
      organizationId: string;
      correlationId?: string;
    }) {
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

    async getOrganizationStatus(input: {
      actorUserId: string;
      organizationId: string;
      correlationId?: string;
    }) {
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

      const legalName =
        input.legalName === undefined || input.legalName === null
          ? undefined
          : normalizeOrganizationName(input.legalName);
      const displayName =
        input.displayName === undefined || input.displayName === null
          ? undefined
          : normalizeOrganizationName(input.displayName);

      if ((input.legalName != null && !legalName) || (input.displayName != null && !displayName)) {
        throw new EmployerOrganizationError(
          organizationDeny(
            "invalid_input",
            "invalid_organization_name",
            decision.organization,
            decision.membership,
            decision.roles
          )
        );
      }

      const expectedUpdatedAt = parseOrganizationVersion(input.expectedVersion);

      if (!expectedUpdatedAt) {
        throw new EmployerOrganizationError(
          organizationDeny(
            "version_conflict",
            "invalid_version",
            decision.organization,
            decision.membership,
            decision.roles
          )
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
          organizationDeny(
            "version_conflict",
            "stale_version",
            decision.organization,
            decision.membership,
            decision.roles
          )
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
          organizationDeny(
            "version_conflict",
            "invalid_version",
            decision.organization,
            decision.membership,
            decision.roles
          )
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
          organizationDeny(
            "version_conflict",
            "stale_version",
            decision.organization,
            decision.membership,
            decision.roles
          )
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
        const decision = residenceDeny(
          "invalid_input",
          "invalid_residence_name",
          null,
          null,
          null,
          []
        );
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

    async getResidence(input: {
      actorUserId: string;
      organizationId: string;
      residenceId: string;
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

    async listResidences(input: {
      actorUserId: string;
      organizationId: string;
      status?: ResidenceStatus | null;
      correlationId?: string;
    }) {
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

      return (
        await residenceRepository.listResidencesByOrganization({
          organizationId: input.organizationId,
          status
        })
      ).map(toPublicResidence);
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
      const addressSummary =
        input.addressSummary === undefined
          ? undefined
          : normalizeOptionalResidenceText(input.addressSummary, 240);
      const city =
        input.city === undefined ? undefined : normalizeOptionalResidenceText(input.city, 120);
      const region =
        input.region === undefined ? undefined : normalizeOptionalResidenceText(input.region, 120);
      const country =
        input.country === undefined ? undefined : normalizeOptionalResidenceText(input.country, 80);

      if (input.name != null && !name) {
        throw new ResidenceError(
          residenceDeny(
            "invalid_input",
            "invalid_residence_name",
            authorization.residence,
            authorization.organization,
            authorization.membership,
            authorization.roles
          )
        );
      }

      const expectedUpdatedAt = parseResidenceVersion(input.expectedVersion);

      if (!expectedUpdatedAt) {
        throw new ResidenceError(
          residenceDeny(
            "version_conflict",
            "invalid_version",
            authorization.residence,
            authorization.organization,
            authorization.membership,
            authorization.roles
          )
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
          residenceDeny(
            "version_conflict",
            "stale_version",
            authorization.residence,
            authorization.organization,
            authorization.membership,
            authorization.roles
          )
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
          residenceDeny(
            "invalid_transition",
            "invalid_residence_status_transition",
            authorization.residence,
            authorization.organization,
            authorization.membership,
            authorization.roles
          )
        );
      }

      const expectedUpdatedAt = parseResidenceVersion(input.expectedVersion);

      if (!expectedUpdatedAt) {
        throw new ResidenceError(
          residenceDeny(
            "version_conflict",
            "invalid_version",
            authorization.residence,
            authorization.organization,
            authorization.membership,
            authorization.roles
          )
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
          residenceDeny(
            "version_conflict",
            "stale_version",
            authorization.residence,
            authorization.organization,
            authorization.membership,
            authorization.roles
          )
        );
      }

      await recordResidenceAudit(residenceRepository, {
        action:
          input.status === "inactive"
            ? "residence.inactivated"
            : input.status === "closed"
              ? "residence.closed"
              : "residence.reactivated",
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

export function createDepartmentService(
  departmentRepository: DepartmentRepository,
  residenceRepository: ResidenceRepository,
  organizationRepository: EmployerOrganizationRepository,
  membershipService: OrganizationMembershipService,
  authorizationService: AuthorizationService,
  options: { now?: () => Date } = {}
) {
  const now = options.now ?? (() => new Date());

  return {
    async createDepartment(input: CreateDepartmentInput) {
      const currentTime = now();
      const correlationId = input.correlationId ?? createDepartmentCorrelationId();
      const name = normalizeDepartmentText(input.name, 2, 160);

      if (!name) {
        const decision = departmentDeny(
          "invalid_input",
          "invalid_department_name",
          null,
          null,
          null,
          null,
          []
        );
        await auditDepartmentDenial(departmentRepository, {
          decision,
          actorUserId: input.actorUserId,
          correlationId,
          createdAt: currentTime
        });
        throw new DepartmentError(decision);
      }

      const authorization = await authorizeDepartmentOperation({
        departmentRepository,
        residenceRepository,
        organizationRepository,
        membershipService,
        authorizationService,
        actorUserId: input.actorUserId,
        organizationId: input.organizationId,
        residenceId: input.residenceId,
        department: null,
        permission: "department.create",
        correlationId,
        now: currentTime
      });

      if (!authorization.allow) {
        throw new DepartmentError(authorization);
      }

      try {
        const department = await departmentRepository.createDepartment({
          publicId: createPublicDepartmentId(),
          organizationId: input.organizationId,
          residenceId: input.residenceId,
          name,
          actorUserId: input.actorUserId,
          correlationId,
          now: currentTime
        });

        return toPublicDepartment(department);
      } catch (error) {
        const decision = departmentDeny(
          "audit_failed",
          error instanceof Error ? error.message : "department_create_failed",
          null,
          authorization.residence,
          authorization.organization,
          authorization.membership,
          authorization.roles
        );
        await auditDepartmentDenial(departmentRepository, {
          decision,
          actorUserId: input.actorUserId,
          correlationId,
          createdAt: currentTime
        });
        throw new DepartmentError(decision);
      }
    },

    async getDepartment(input: {
      actorUserId: string;
      organizationId: string;
      residenceId: string;
      departmentId: string;
      correlationId?: string;
    }) {
      const currentTime = now();
      const department = await departmentRepository.findDepartmentById(input.departmentId);
      const authorization = await authorizeDepartmentOperation({
        departmentRepository,
        residenceRepository,
        organizationRepository,
        membershipService,
        authorizationService,
        actorUserId: input.actorUserId,
        organizationId: input.organizationId,
        residenceId: input.residenceId,
        department,
        permission: "department.read",
        correlationId: input.correlationId,
        now: currentTime,
        allowInactiveDepartmentRead: true,
        allowInactiveResidenceRead: true
      });

      if (!authorization.allow || !authorization.department) {
        throw new DepartmentError(authorization);
      }

      return authorization.department;
    },

    async listDepartments(input: {
      actorUserId: string;
      organizationId: string;
      residenceId: string;
      status?: DepartmentStatus | null;
      correlationId?: string;
    }) {
      const currentTime = now();
      const authorization = await authorizeDepartmentOperation({
        departmentRepository,
        residenceRepository,
        organizationRepository,
        membershipService,
        authorizationService,
        actorUserId: input.actorUserId,
        organizationId: input.organizationId,
        residenceId: input.residenceId,
        department: null,
        permission: "department.read",
        correlationId: input.correlationId,
        now: currentTime,
        allowInactiveResidenceRead: true
      });

      if (!authorization.allow) {
        throw new DepartmentError(authorization);
      }

      const status =
        input.status && departmentStatuses.includes(input.status) ? input.status : null;

      return (
        await departmentRepository.listDepartmentsByResidence({
          organizationId: input.organizationId,
          residenceId: input.residenceId,
          status
        })
      ).map(toPublicDepartment);
    },

    async updateDepartment(input: UpdateDepartmentInput) {
      const currentTime = now();
      const department = await departmentRepository.findDepartmentById(input.departmentId);
      const authorization = await authorizeDepartmentOperation({
        departmentRepository,
        residenceRepository,
        organizationRepository,
        membershipService,
        authorizationService,
        actorUserId: input.actorUserId,
        organizationId: input.organizationId,
        residenceId: input.residenceId,
        department,
        permission: "department.update",
        correlationId: input.correlationId,
        now: currentTime
      });

      if (!authorization.allow || !authorization.department) {
        throw new DepartmentError(authorization);
      }

      const name = input.name == null ? undefined : normalizeDepartmentText(input.name, 2, 160);

      if (input.name != null && !name) {
        throw new DepartmentError(
          departmentDeny(
            "invalid_input",
            "invalid_department_name",
            authorization.department,
            authorization.residence,
            authorization.organization,
            authorization.membership,
            authorization.roles
          )
        );
      }

      const expectedUpdatedAt = parseDepartmentVersion(input.expectedVersion);

      if (!expectedUpdatedAt) {
        throw new DepartmentError(
          departmentDeny(
            "version_conflict",
            "invalid_version",
            authorization.department,
            authorization.residence,
            authorization.organization,
            authorization.membership,
            authorization.roles
          )
        );
      }

      const updated = await departmentRepository.updateDepartment({
        departmentId: input.departmentId,
        organizationId: input.organizationId,
        residenceId: input.residenceId,
        expectedUpdatedAt,
        name,
        actorUserId: input.actorUserId,
        now: currentTime
      });

      if (!updated) {
        throw new DepartmentError(
          departmentDeny(
            "version_conflict",
            "stale_version",
            authorization.department,
            authorization.residence,
            authorization.organization,
            authorization.membership,
            authorization.roles
          )
        );
      }

      await recordDepartmentAudit(departmentRepository, {
        action: "department.updated",
        organizationId: input.organizationId,
        residenceId: input.residenceId,
        departmentId: updated.id,
        actorUserId: input.actorUserId,
        priorState: department?.status ?? null,
        newState: updated.status,
        reason: null,
        correlationId: input.correlationId,
        createdAt: currentTime
      });

      return toPublicDepartment(updated);
    },

    async updateDepartmentStatus(input: {
      actorUserId: string;
      organizationId: string;
      residenceId: string;
      departmentId: string;
      expectedVersion: string;
      status: Extract<DepartmentStatus, "active" | "inactive" | "closed">;
      reason: string;
      correlationId?: string;
    }) {
      const currentTime = now();
      const department = await departmentRepository.findDepartmentById(input.departmentId);
      const authorization = await authorizeDepartmentOperation({
        departmentRepository,
        residenceRepository,
        organizationRepository,
        membershipService,
        authorizationService,
        actorUserId: input.actorUserId,
        organizationId: input.organizationId,
        residenceId: input.residenceId,
        department,
        permission: "department.update",
        correlationId: input.correlationId,
        now: currentTime,
        allowInactiveDepartmentStatusChange: true
      });

      if (!authorization.allow || !authorization.department || !department) {
        throw new DepartmentError(authorization);
      }

      if (!isAllowedDepartmentTransition(department.status, input.status)) {
        throw new DepartmentError(
          departmentDeny(
            "invalid_transition",
            "invalid_department_status_transition",
            authorization.department,
            authorization.residence,
            authorization.organization,
            authorization.membership,
            authorization.roles
          )
        );
      }

      const expectedUpdatedAt = parseDepartmentVersion(input.expectedVersion);

      if (!expectedUpdatedAt) {
        throw new DepartmentError(
          departmentDeny(
            "version_conflict",
            "invalid_version",
            authorization.department,
            authorization.residence,
            authorization.organization,
            authorization.membership,
            authorization.roles
          )
        );
      }

      const updated = await departmentRepository.updateDepartmentStatus({
        departmentId: input.departmentId,
        organizationId: input.organizationId,
        residenceId: input.residenceId,
        expectedUpdatedAt,
        status: input.status,
        actorUserId: input.actorUserId,
        now: currentTime
      });

      if (!updated) {
        throw new DepartmentError(
          departmentDeny(
            "version_conflict",
            "stale_version",
            authorization.department,
            authorization.residence,
            authorization.organization,
            authorization.membership,
            authorization.roles
          )
        );
      }

      await recordDepartmentAudit(departmentRepository, {
        action:
          input.status === "inactive"
            ? "department.inactivated"
            : input.status === "closed"
              ? "department.closed"
              : "department.reactivated",
        organizationId: input.organizationId,
        residenceId: input.residenceId,
        departmentId: updated.id,
        actorUserId: input.actorUserId,
        priorState: department.status,
        newState: updated.status,
        reason: normalizeOptionalResidenceText(input.reason, 240),
        correlationId: input.correlationId,
        createdAt: currentTime
      });

      return toPublicDepartment(updated);
    }
  };
}

export type DepartmentService = ReturnType<typeof createDepartmentService>;

export function createWorkGroupService(
  workGroupRepository: WorkGroupRepository,
  authorizationService: AuthorizationService,
  options: { now?: () => Date } = {}
) {
  const now = options.now ?? (() => new Date());

  return {
    async listActiveWorkGroups(input: {
      session: SessionValidationResult;
      roles?: readonly AuthorizationRoleKey[];
      correlationId?: string;
    }) {
      const decision = await authorizeWorkGroupOperation({
        workGroupRepository,
        authorizationService,
        session: input.session,
        roles: input.roles ?? [],
        permission: "work_group.read",
        correlationId: input.correlationId,
        now: now()
      });

      if (!decision.allow) {
        throw new WorkGroupError(decision);
      }

      return (await workGroupRepository.listWorkGroups({ includeInactive: false })).map(
        toPublicWorkGroup
      );
    },

    async getActiveWorkGroup(input: {
      session: SessionValidationResult;
      roles?: readonly AuthorizationRoleKey[];
      slug: string;
      correlationId?: string;
    }) {
      const currentTime = now();
      const workGroup = await workGroupRepository.findWorkGroupByKey(
        workGroupSlugToKey(input.slug)
      );
      const decision = await authorizeWorkGroupOperation({
        workGroupRepository,
        authorizationService,
        session: input.session,
        roles: input.roles ?? [],
        permission: "work_group.read",
        workGroup,
        correlationId: input.correlationId,
        now: currentTime
      });

      if (!decision.allow || !decision.workGroup || decision.workGroup.status !== "active") {
        throw new WorkGroupError(
          decision.allow
            ? workGroupDeny("not_found", "work_group_not_found", null, input.roles ?? [])
            : decision
        );
      }

      return decision.workGroup;
    },

    async listAllWorkGroups(input: {
      session: SessionValidationResult;
      roles?: readonly AuthorizationRoleKey[];
      correlationId?: string;
    }) {
      const decision = await authorizeWorkGroupOperation({
        workGroupRepository,
        authorizationService,
        session: input.session,
        roles: input.roles ?? [],
        permission: "platform.supervise",
        platform: true,
        correlationId: input.correlationId,
        now: now()
      });

      if (!decision.allow) {
        throw new WorkGroupError(decision);
      }

      return (await workGroupRepository.listWorkGroups({ includeInactive: true })).map(
        toPublicWorkGroup
      );
    },

    async getWorkGroupForManagement(input: {
      session: SessionValidationResult;
      roles?: readonly AuthorizationRoleKey[];
      slug: string;
      correlationId?: string;
    }) {
      const workGroup = await workGroupRepository.findWorkGroupByKey(
        workGroupSlugToKey(input.slug)
      );
      const decision = await authorizeWorkGroupOperation({
        workGroupRepository,
        authorizationService,
        session: input.session,
        roles: input.roles ?? [],
        permission: "platform.supervise",
        platform: true,
        workGroup,
        correlationId: input.correlationId,
        now: now()
      });

      if (!decision.allow || !decision.workGroup) {
        throw new WorkGroupError(
          decision.allow
            ? workGroupDeny("not_found", "work_group_not_found", null, input.roles ?? [])
            : decision
        );
      }

      return decision.workGroup;
    },

    async updateWorkGroup(input: {
      session: SessionValidationResult;
      roles?: readonly AuthorizationRoleKey[];
      slug: string;
      expectedVersion: string;
      displayLabel?: string | null;
      displayOrder?: number | null;
      iconKey?: string | null;
      correlationId?: string;
    }) {
      const currentTime = now();
      const workGroup = await workGroupRepository.findWorkGroupByKey(
        workGroupSlugToKey(input.slug)
      );
      const decision = await authorizeWorkGroupOperation({
        workGroupRepository,
        authorizationService,
        session: input.session,
        roles: input.roles ?? [],
        permission: "platform.supervise",
        platform: true,
        workGroup,
        correlationId: input.correlationId,
        now: currentTime
      });

      if (!decision.allow || !workGroup) {
        throw new WorkGroupError(
          decision.allow
            ? workGroupDeny("not_found", "work_group_not_found", null, input.roles ?? [])
            : decision
        );
      }

      const expectedUpdatedAt = parseWorkGroupVersion(input.expectedVersion);
      const displayLabel =
        input.displayLabel == null ? undefined : normalizeCatalogueText(input.displayLabel, 2, 120);
      const displayOrder = input.displayOrder == null ? undefined : input.displayOrder;
      const iconKey =
        input.iconKey === undefined ? undefined : normalizeOptionalResidenceText(input.iconKey, 80);

      if (!expectedUpdatedAt) {
        throw new WorkGroupError(
          workGroupDeny(
            "version_conflict",
            "invalid_version",
            toPublicWorkGroup(workGroup),
            input.roles ?? []
          )
        );
      }

      if (input.displayLabel != null && !displayLabel) {
        throw new WorkGroupError(
          workGroupDeny(
            "invalid_input",
            "invalid_work_group_label",
            toPublicWorkGroup(workGroup),
            input.roles ?? []
          )
        );
      }

      if (
        displayOrder !== undefined &&
        (!Number.isInteger(displayOrder) || displayOrder < 1 || displayOrder > 10_000)
      ) {
        throw new WorkGroupError(
          workGroupDeny(
            "invalid_input",
            "invalid_work_group_display_order",
            toPublicWorkGroup(workGroup),
            input.roles ?? []
          )
        );
      }

      const updated = await workGroupRepository.updateWorkGroup({
        workGroupId: workGroup.id,
        expectedUpdatedAt,
        displayLabel,
        displayOrder,
        iconKey,
        now: currentTime
      });

      if (!updated) {
        throw new WorkGroupError(
          workGroupDeny(
            "version_conflict",
            "stale_version",
            toPublicWorkGroup(workGroup),
            input.roles ?? []
          )
        );
      }

      await recordWorkGroupAudit(workGroupRepository, {
        action: "work_group.updated",
        workGroupId: updated.id,
        actorUserId: input.session.user?.id ?? null,
        priorState: workGroup.status,
        newState: updated.status,
        reason: null,
        correlationId: input.correlationId,
        createdAt: currentTime
      });

      return toPublicWorkGroup(updated);
    },

    async updateWorkGroupStatus(input: {
      session: SessionValidationResult;
      roles?: readonly AuthorizationRoleKey[];
      slug: string;
      expectedVersion: string;
      status: Extract<WorkGroupStatus, "active" | "inactive">;
      reason: string;
      correlationId?: string;
    }) {
      const currentTime = now();
      const workGroup = await workGroupRepository.findWorkGroupByKey(
        workGroupSlugToKey(input.slug)
      );
      const decision = await authorizeWorkGroupOperation({
        workGroupRepository,
        authorizationService,
        session: input.session,
        roles: input.roles ?? [],
        permission: "platform.supervise",
        platform: true,
        workGroup,
        correlationId: input.correlationId,
        now: currentTime
      });

      if (!decision.allow || !workGroup) {
        throw new WorkGroupError(
          decision.allow
            ? workGroupDeny("not_found", "work_group_not_found", null, input.roles ?? [])
            : decision
        );
      }

      if (!isAllowedWorkGroupTransition(workGroup.status, input.status)) {
        throw new WorkGroupError(
          workGroupDeny(
            "invalid_transition",
            "invalid_work_group_status_transition",
            toPublicWorkGroup(workGroup),
            input.roles ?? []
          )
        );
      }

      const expectedUpdatedAt = parseWorkGroupVersion(input.expectedVersion);

      if (!expectedUpdatedAt) {
        throw new WorkGroupError(
          workGroupDeny(
            "version_conflict",
            "invalid_version",
            toPublicWorkGroup(workGroup),
            input.roles ?? []
          )
        );
      }

      const updated = await workGroupRepository.updateWorkGroupStatus({
        workGroupId: workGroup.id,
        expectedUpdatedAt,
        status: input.status,
        now: currentTime
      });

      if (!updated) {
        throw new WorkGroupError(
          workGroupDeny(
            "version_conflict",
            "stale_version",
            toPublicWorkGroup(workGroup),
            input.roles ?? []
          )
        );
      }

      await recordWorkGroupAudit(workGroupRepository, {
        action: input.status === "active" ? "work_group.activated" : "work_group.deactivated",
        workGroupId: updated.id,
        actorUserId: input.session.user?.id ?? null,
        priorState: workGroup.status,
        newState: updated.status,
        reason: normalizeOptionalResidenceText(input.reason, 240),
        correlationId: input.correlationId,
        createdAt: currentTime
      });

      return toPublicWorkGroup(updated);
    }
  };
}

export type WorkGroupService = ReturnType<typeof createWorkGroupService>;

export function createRoleDefinitionService(
  roleDefinitionRepository: RoleDefinitionRepository,
  authorizationService: AuthorizationService,
  options: { now?: () => Date } = {}
) {
  const now = options.now ?? (() => new Date());

  return {
    async listActiveRoleDefinitions(input: {
      session: SessionValidationResult;
      roles?: readonly AuthorizationRoleKey[];
      workGroupSlug?: string | null;
      correlationId?: string;
    }) {
      const decision = await authorizeRoleDefinitionOperation({
        roleDefinitionRepository,
        authorizationService,
        session: input.session,
        roles: input.roles ?? [],
        permission: "role_definition.read",
        correlationId: input.correlationId,
        now: now()
      });

      if (!decision.allow) throw new RoleDefinitionError(decision);

      return (
        await roleDefinitionRepository.listRoleDefinitions({
          includeInactive: false,
          workGroupKey: input.workGroupSlug ? workGroupSlugToKey(input.workGroupSlug) : undefined
        })
      )
        .filter((roleDefinition) => roleDefinition.workGroup.status === "active")
        .map(toPublicRoleDefinition);
    },

    async getActiveRoleDefinition(input: {
      session: SessionValidationResult;
      roles?: readonly AuthorizationRoleKey[];
      identifier: string;
      correlationId?: string;
    }) {
      const roleDefinition = await roleDefinitionRepository.findRoleDefinitionByKey(
        roleDefinitionIdentifierToKey(input.identifier)
      );
      const decision = await authorizeRoleDefinitionOperation({
        roleDefinitionRepository,
        authorizationService,
        session: input.session,
        roles: input.roles ?? [],
        permission: "role_definition.read",
        roleDefinition,
        correlationId: input.correlationId,
        now: now()
      });

      if (
        !decision.allow ||
        !decision.roleDefinition ||
        decision.roleDefinition.status !== "active" ||
        roleDefinition?.workGroup.status !== "active"
      ) {
        throw new RoleDefinitionError(
          decision.allow
            ? roleDefinitionDeny("not_found", "role_definition_not_found", null, input.roles ?? [])
            : decision
        );
      }

      return decision.roleDefinition;
    },

    async listAllRoleDefinitions(input: {
      session: SessionValidationResult;
      roles?: readonly AuthorizationRoleKey[];
      workGroupSlug?: string | null;
      correlationId?: string;
    }) {
      const decision = await authorizeRoleDefinitionOperation({
        roleDefinitionRepository,
        authorizationService,
        session: input.session,
        roles: input.roles ?? [],
        permission: "platform.supervise",
        platform: true,
        correlationId: input.correlationId,
        now: now()
      });

      if (!decision.allow) throw new RoleDefinitionError(decision);

      return (
        await roleDefinitionRepository.listRoleDefinitions({
          includeInactive: true,
          workGroupKey: input.workGroupSlug ? workGroupSlugToKey(input.workGroupSlug) : undefined
        })
      ).map(toPublicRoleDefinition);
    },

    async getRoleDefinitionForManagement(input: {
      session: SessionValidationResult;
      roles?: readonly AuthorizationRoleKey[];
      identifier: string;
      correlationId?: string;
    }) {
      const roleDefinition = await roleDefinitionRepository.findRoleDefinitionByKey(
        roleDefinitionIdentifierToKey(input.identifier)
      );
      const decision = await authorizeRoleDefinitionOperation({
        roleDefinitionRepository,
        authorizationService,
        session: input.session,
        roles: input.roles ?? [],
        permission: "platform.supervise",
        platform: true,
        roleDefinition,
        correlationId: input.correlationId,
        now: now()
      });

      if (!decision.allow || !decision.roleDefinition) {
        throw new RoleDefinitionError(
          decision.allow
            ? roleDefinitionDeny("not_found", "role_definition_not_found", null, input.roles ?? [])
            : decision
        );
      }

      return decision.roleDefinition;
    },

    async updateRoleDefinition(input: {
      session: SessionValidationResult;
      roles?: readonly AuthorizationRoleKey[];
      identifier: string;
      expectedVersion: string;
      displayLabel?: string | null;
      displayOrder?: number | null;
      localizedLabelKey?: string | null;
      qualificationSummary?: string | null;
      safetyRequirementSummary?: string | null;
      correlationId?: string;
    }) {
      const currentTime = now();
      const roleDefinition = await roleDefinitionRepository.findRoleDefinitionByKey(
        roleDefinitionIdentifierToKey(input.identifier)
      );
      const decision = await authorizeRoleDefinitionOperation({
        roleDefinitionRepository,
        authorizationService,
        session: input.session,
        roles: input.roles ?? [],
        permission: "platform.supervise",
        platform: true,
        roleDefinition,
        correlationId: input.correlationId,
        now: currentTime
      });

      if (!decision.allow || !roleDefinition) {
        throw new RoleDefinitionError(
          decision.allow
            ? roleDefinitionDeny("not_found", "role_definition_not_found", null, input.roles ?? [])
            : decision
        );
      }

      const expectedUpdatedAt = parseCatalogueVersion(input.expectedVersion);
      const displayLabel =
        input.displayLabel == null ? undefined : normalizeCatalogueText(input.displayLabel, 2, 120);
      const displayOrder = input.displayOrder == null ? undefined : input.displayOrder;
      const localizedLabelKey =
        input.localizedLabelKey === undefined
          ? undefined
          : normalizeOptionalResidenceText(input.localizedLabelKey, 120);
      const qualificationSummary =
        input.qualificationSummary === undefined
          ? undefined
          : normalizeOptionalResidenceText(input.qualificationSummary, 500);
      const safetyRequirementSummary =
        input.safetyRequirementSummary === undefined
          ? undefined
          : normalizeOptionalResidenceText(input.safetyRequirementSummary, 500);

      if (!expectedUpdatedAt) {
        throw new RoleDefinitionError(
          roleDefinitionDeny(
            "version_conflict",
            "invalid_version",
            toPublicRoleDefinition(roleDefinition),
            input.roles ?? []
          )
        );
      }

      if (input.displayLabel != null && !displayLabel) {
        throw new RoleDefinitionError(
          roleDefinitionDeny(
            "invalid_input",
            "invalid_role_definition_label",
            toPublicRoleDefinition(roleDefinition),
            input.roles ?? []
          )
        );
      }

      if (
        displayOrder !== undefined &&
        (!Number.isInteger(displayOrder) || displayOrder < 1 || displayOrder > 10_000)
      ) {
        throw new RoleDefinitionError(
          roleDefinitionDeny(
            "invalid_input",
            "invalid_role_definition_display_order",
            toPublicRoleDefinition(roleDefinition),
            input.roles ?? []
          )
        );
      }

      const updated = await roleDefinitionRepository.updateRoleDefinition({
        roleDefinitionId: roleDefinition.id,
        expectedUpdatedAt,
        displayLabel,
        displayOrder,
        localizedLabelKey,
        qualificationSummary,
        safetyRequirementSummary,
        now: currentTime
      });

      if (!updated) {
        throw new RoleDefinitionError(
          roleDefinitionDeny(
            "version_conflict",
            "stale_version",
            toPublicRoleDefinition(roleDefinition),
            input.roles ?? []
          )
        );
      }

      await recordRoleDefinitionAudit(roleDefinitionRepository, {
        action: "role_definition.updated",
        roleDefinitionId: updated.id,
        workGroupId: updated.workGroupId,
        actorUserId: input.session.user?.id ?? null,
        priorState: roleDefinition.status,
        newState: updated.status,
        reason: null,
        correlationId: input.correlationId,
        createdAt: currentTime
      });

      return toPublicRoleDefinition(updated);
    },

    async updateRoleDefinitionStatus(input: {
      session: SessionValidationResult;
      roles?: readonly AuthorizationRoleKey[];
      identifier: string;
      expectedVersion: string;
      status: Extract<RoleDefinitionStatus, "active" | "inactive">;
      reason: string;
      correlationId?: string;
    }) {
      const currentTime = now();
      const roleDefinition = await roleDefinitionRepository.findRoleDefinitionByKey(
        roleDefinitionIdentifierToKey(input.identifier)
      );
      const decision = await authorizeRoleDefinitionOperation({
        roleDefinitionRepository,
        authorizationService,
        session: input.session,
        roles: input.roles ?? [],
        permission: "platform.supervise",
        platform: true,
        roleDefinition,
        correlationId: input.correlationId,
        now: currentTime
      });

      if (!decision.allow || !roleDefinition) {
        throw new RoleDefinitionError(
          decision.allow
            ? roleDefinitionDeny("not_found", "role_definition_not_found", null, input.roles ?? [])
            : decision
        );
      }

      if (!isAllowedRoleDefinitionTransition(roleDefinition.status, input.status)) {
        throw new RoleDefinitionError(
          roleDefinitionDeny(
            "invalid_transition",
            "invalid_role_definition_status_transition",
            toPublicRoleDefinition(roleDefinition),
            input.roles ?? []
          )
        );
      }

      const expectedUpdatedAt = parseCatalogueVersion(input.expectedVersion);

      if (!expectedUpdatedAt) {
        throw new RoleDefinitionError(
          roleDefinitionDeny(
            "version_conflict",
            "invalid_version",
            toPublicRoleDefinition(roleDefinition),
            input.roles ?? []
          )
        );
      }

      const updated = await roleDefinitionRepository.updateRoleDefinitionStatus({
        roleDefinitionId: roleDefinition.id,
        expectedUpdatedAt,
        status: input.status,
        now: currentTime
      });

      if (!updated) {
        throw new RoleDefinitionError(
          roleDefinitionDeny(
            "version_conflict",
            "stale_version",
            toPublicRoleDefinition(roleDefinition),
            input.roles ?? []
          )
        );
      }

      await recordRoleDefinitionAudit(roleDefinitionRepository, {
        action:
          input.status === "active" ? "role_definition.activated" : "role_definition.deactivated",
        roleDefinitionId: updated.id,
        workGroupId: updated.workGroupId,
        actorUserId: input.session.user?.id ?? null,
        priorState: roleDefinition.status,
        newState: updated.status,
        reason: normalizeOptionalResidenceText(input.reason, 240),
        correlationId: input.correlationId,
        createdAt: currentTime
      });

      return toPublicRoleDefinition(updated);
    }
  };
}

export type RoleDefinitionService = ReturnType<typeof createRoleDefinitionService>;

export type ResolvedRequestPricing = Readonly<{
  jobRequestId: string;
  organizationId: string;
  contractId: string;
  contractVersion: string;
  currency: string;
  snapshot: RequestPricingSnapshot;
  // Gap A — variable client pricing captured at approval (optional; emergency is per-hour platform-kept,
  // distance is a flat per-shift surcharge split 50/50 worker/platform).
  variable?: Readonly<{
    emergencySurchargePerHourMinor: number;
    distanceSurchargeMinor: number;
    distanceWorkerMinor: number;
    distancePlatformMinor: number;
  }>;
}>;

// Port that derives the immutable worker/platform split from the employer rate (E) and the admin
// margin at approval. resolveAtApproval is read-only and MUST throw when the request has no effective
// priced contract, so an unpriced request can never be approved. persist writes the snapshot (upsert).
export interface RequestPricingSnapshotCapture {
  resolveAtApproval(input: {
    jobRequestId: string;
    marginPpm: number | null;
  }): Promise<ResolvedRequestPricing>;
  persist(input: {
    resolved: ResolvedRequestPricing;
    capturedByUserId: string;
    occurredAt: Date;
  }): Promise<void>;
}

export function createJobRequestService(
  jobRequestRepository: JobRequestRepository,
  organizationRepository: EmployerOrganizationRepository,
  residenceRepository: ResidenceRepository,
  departmentRepository: DepartmentRepository,
  workGroupRepository: WorkGroupRepository,
  roleDefinitionRepository: RoleDefinitionRepository,
  membershipService: OrganizationMembershipService,
  authorizationService: AuthorizationService,
  options: { now?: () => Date; pricingSnapshotCapture?: RequestPricingSnapshotCapture } = {}
) {
  const now = options.now ?? (() => new Date());

  return {
    async createDraft(input: {
      actorUserId: string;
      organizationId: string;
      residenceId: string;
      departmentId: string;
      workGroupSlug: string;
      roleDefinitionIdentifier: string;
      title: string;
      description?: string | null;
      numberOfWorkers: number;
      urgency: JobRequestUrgency;
      requestType: JobRequestType;
      timezone: string;
      startAt: Date;
      endAt: Date;
      correlationId?: string;
    }) {
      const currentTime = now();
      const authorization = await authorizeJobRequestEmployerOperation({
        organizationRepository,
        jobRequestRepository,
        membershipService,
        authorizationService,
        actorUserId: input.actorUserId,
        organizationId: input.organizationId,
        permission: "job_request.create",
        correlationId: input.correlationId,
        now: currentTime
      });

      if (!authorization.allow || !authorization.organization)
        throw new JobRequestError(authorization);

      const parent = await validateJobRequestParents({
        organization: authorization.organization,
        residenceRepository,
        departmentRepository,
        workGroupRepository,
        roleDefinitionRepository,
        residenceId: input.residenceId,
        departmentId: input.departmentId,
        workGroupSlug: input.workGroupSlug,
        roleDefinitionIdentifier: input.roleDefinitionIdentifier,
        requireActiveParents: true,
        roles: authorization.roles
      });

      if (!parent.allow) throw new JobRequestError(parent);

      const title = normalizeRequiredJobRequestText(input.title, 4, 160);
      const description = normalizeOptionalResidenceText(input.description ?? null, 2000);
      const numberOfWorkers = normalizeWorkerCount(input.numberOfWorkers);
      const timezone = normalizeRequiredJobRequestText(input.timezone, 2, 80);
      const isMultiDay = isMultiDayRange(input.startAt, input.endAt);
      const hasRecurringIntent = input.requestType === "recurring_intent";

      if (
        !title ||
        !timezone ||
        numberOfWorkers < 1 ||
        !isValidJobRequestTiming(input.startAt, input.endAt)
      ) {
        throw new JobRequestError(
          jobRequestDeny(
            "invalid_input",
            "invalid_job_request_payload",
            null,
            authorization.roles,
            authorization.organization,
            authorization.membership
          )
        );
      }

      // Authoritative 6-hour minimum shift rule (server-side, not UI-only).
      if (!meetsMinimumShiftDuration(input.startAt, input.endAt)) {
        throw new JobRequestError(
          jobRequestDeny(
            "invalid_input",
            "job_request_below_minimum_shift",
            null,
            authorization.roles,
            authorization.organization,
            authorization.membership
          )
        );
      }

      const draft = await jobRequestRepository.createDraft({
        organizationId: input.organizationId,
        residenceId: input.residenceId,
        departmentId: input.departmentId,
        workGroupId: parent.workGroup!.id,
        roleDefinitionId: parent.roleDefinition!.id,
        actorUserId: input.actorUserId,
        title,
        description,
        numberOfWorkers,
        urgency: input.urgency,
        requestType: input.requestType,
        timezone,
        startAt: input.startAt,
        endAt: input.endAt,
        isMultiDay,
        hasRecurringIntent,
        now: currentTime,
        correlationId: input.correlationId ?? createJobRequestCorrelationId()
      });

      return toPublicJobRequest(draft);
    },

    async listForOrganization(input: {
      actorUserId: string;
      organizationId: string;
      residenceId?: string | null;
      departmentId?: string | null;
      correlationId?: string;
    }) {
      const currentTime = now();
      const authorization = await authorizeJobRequestEmployerOperation({
        organizationRepository,
        jobRequestRepository,
        membershipService,
        authorizationService,
        actorUserId: input.actorUserId,
        organizationId: input.organizationId,
        permission: "job_request.read",
        correlationId: input.correlationId,
        now: currentTime
      });

      if (!authorization.allow) throw new JobRequestError(authorization);

      return (
        await jobRequestRepository.listJobRequests({
          organizationId: input.organizationId,
          residenceId: input.residenceId ?? undefined,
          departmentId: input.departmentId ?? undefined
        })
      ).map(toPublicJobRequest);
    },

    async getForOrganization(input: {
      actorUserId: string;
      organizationId: string;
      jobRequestIdOrNumber: string;
      correlationId?: string;
    }) {
      const currentTime = now();
      const jobRequest = await findJobRequestByIdOrNumber(
        jobRequestRepository,
        input.jobRequestIdOrNumber
      );
      const authorization = await authorizeJobRequestEmployerOperation({
        organizationRepository,
        jobRequestRepository,
        membershipService,
        authorizationService,
        actorUserId: input.actorUserId,
        organizationId: input.organizationId,
        permission: "job_request.read",
        jobRequest,
        correlationId: input.correlationId,
        now: currentTime
      });

      if (
        !authorization.allow ||
        !jobRequest ||
        jobRequest.organizationId !== input.organizationId
      ) {
        throw new JobRequestError(
          authorization.allow
            ? jobRequestDeny(
                "not_found",
                "job_request_not_found",
                null,
                authorization.roles,
                authorization.organization,
                authorization.membership
              )
            : authorization
        );
      }

      return toPublicJobRequest(jobRequest);
    },

    async authorizeCalendarProfileUpdate(input: {
      actorUserId: string;
      organizationId: string;
      jobRequestIdOrNumber: string;
      correlationId?: string;
    }) {
      const currentTime = now();
      const jobRequest = await findJobRequestByIdOrNumber(
        jobRequestRepository,
        input.jobRequestIdOrNumber
      );
      const authorization = await authorizeJobRequestEmployerOperation({
        organizationRepository,
        jobRequestRepository,
        membershipService,
        authorizationService,
        actorUserId: input.actorUserId,
        organizationId: input.organizationId,
        permission: "job_request.update_draft",
        jobRequest,
        correlationId: input.correlationId,
        now: currentTime
      });

      if (
        !authorization.allow ||
        !jobRequest ||
        jobRequest.organizationId !== input.organizationId
      ) {
        throw new JobRequestError(
          authorization.allow
            ? jobRequestDeny(
                "not_found",
                "job_request_not_found",
                null,
                authorization.roles,
                authorization.organization,
                authorization.membership
              )
            : authorization
        );
      }

      return toPublicJobRequest(jobRequest);
    },

    async updateDraft(input: {
      actorUserId: string;
      organizationId: string;
      jobRequestId: string;
      expectedVersion: number;
      residenceId?: string | null;
      departmentId?: string | null;
      workGroupSlug?: string | null;
      roleDefinitionIdentifier?: string | null;
      title?: string | null;
      description?: string | null;
      numberOfWorkers?: number | null;
      urgency?: JobRequestUrgency | null;
      requestType?: JobRequestType | null;
      timezone?: string | null;
      startAt?: Date | null;
      endAt?: Date | null;
      correlationId?: string;
    }) {
      const currentTime = now();
      const jobRequest = await jobRequestRepository.findJobRequestById(input.jobRequestId);
      const authorization = await authorizeJobRequestEmployerOperation({
        organizationRepository,
        jobRequestRepository,
        membershipService,
        authorizationService,
        actorUserId: input.actorUserId,
        organizationId: input.organizationId,
        permission: "job_request.update_draft",
        jobRequest,
        correlationId: input.correlationId,
        now: currentTime
      });

      if (
        !authorization.allow ||
        !jobRequest ||
        jobRequest.organizationId !== input.organizationId
      ) {
        throw new JobRequestError(
          authorization.allow
            ? jobRequestDeny(
                "not_found",
                "job_request_not_found",
                null,
                authorization.roles,
                authorization.organization,
                authorization.membership
              )
            : authorization
        );
      }

      if (jobRequest.status !== "draft" && jobRequest.status !== "information_required") {
        throw new JobRequestError(
          jobRequestDeny(
            "invalid_transition",
            "job_request_not_editable",
            toPublicJobRequest(jobRequest),
            authorization.roles,
            authorization.organization,
            authorization.membership
          )
        );
      }

      const targetResidenceId = input.residenceId ?? jobRequest.residenceId;
      const targetDepartmentId = input.departmentId ?? jobRequest.departmentId;
      const workGroup = input.workGroupSlug
        ? await workGroupRepository.findWorkGroupByKey(workGroupSlugToKey(input.workGroupSlug))
        : await workGroupRepository.findWorkGroupById(jobRequest.workGroupId);
      const roleDefinition = input.roleDefinitionIdentifier
        ? await roleDefinitionRepository.findRoleDefinitionByKey(
            roleDefinitionIdentifierToKey(input.roleDefinitionIdentifier)
          )
        : await roleDefinitionRepository.findRoleDefinitionById(jobRequest.roleDefinitionId);

      const parent = await validateJobRequestParents({
        organization: authorization.organization!,
        residenceRepository,
        departmentRepository,
        workGroupRepository,
        roleDefinitionRepository,
        residenceId: targetResidenceId,
        departmentId: targetDepartmentId,
        workGroupSlug: workGroup ? workGroupKeyToSlug(workGroup.key) : "",
        roleDefinitionIdentifier: roleDefinition ? roleDefinition.key : "",
        requireActiveParents: true,
        roles: authorization.roles
      });

      if (!parent.allow) throw new JobRequestError(parent);

      const startAt = input.startAt ?? jobRequest.startAt;
      const endAt = input.endAt ?? jobRequest.endAt;

      if (!isValidJobRequestTiming(startAt, endAt)) {
        throw new JobRequestError(
          jobRequestDeny(
            "invalid_input",
            "invalid_job_request_timing",
            toPublicJobRequest(jobRequest),
            authorization.roles,
            authorization.organization,
            authorization.membership
          )
        );
      }

      // Authoritative 6-hour minimum shift rule also applies to edits.
      if (!meetsMinimumShiftDuration(startAt, endAt)) {
        throw new JobRequestError(
          jobRequestDeny(
            "invalid_input",
            "job_request_below_minimum_shift",
            toPublicJobRequest(jobRequest),
            authorization.roles,
            authorization.organization,
            authorization.membership
          )
        );
      }

      const updated = await jobRequestRepository.updateDraft({
        jobRequestId: jobRequest.id,
        expectedVersion: input.expectedVersion,
        actorUserId: input.actorUserId,
        residenceId: targetResidenceId,
        departmentId: targetDepartmentId,
        workGroupId: parent.workGroup!.id,
        roleDefinitionId: parent.roleDefinition!.id,
        title:
          input.title == null ? undefined : normalizeRequiredJobRequestText(input.title, 4, 160),
        description:
          input.description === undefined
            ? undefined
            : normalizeOptionalResidenceText(input.description, 2000),
        numberOfWorkers:
          input.numberOfWorkers == null ? undefined : normalizeWorkerCount(input.numberOfWorkers),
        urgency: input.urgency ?? undefined,
        requestType: input.requestType ?? undefined,
        timezone:
          input.timezone == null
            ? undefined
            : normalizeRequiredJobRequestText(input.timezone, 2, 80),
        startAt,
        endAt,
        isMultiDay: isMultiDayRange(startAt, endAt),
        hasRecurringIntent: (input.requestType ?? jobRequest.requestType) === "recurring_intent",
        now: currentTime
      });

      if (!updated) {
        throw new JobRequestError(
          jobRequestDeny(
            "version_conflict",
            "stale_version",
            toPublicJobRequest(jobRequest),
            authorization.roles,
            authorization.organization,
            authorization.membership
          )
        );
      }

      await recordJobRequestAudit(jobRequestRepository, {
        action: "job_request.updated",
        organizationId: updated.organizationId,
        jobRequestId: updated.id,
        jobRequestNumber: updated.jobRequestNumber,
        actorUserId: input.actorUserId,
        priorState: jobRequest.status,
        newState: updated.status,
        reason: null,
        correlationId: input.correlationId,
        createdAt: currentTime
      });

      return toPublicJobRequest(updated);
    },

    async submit(input: {
      actorUserId: string;
      organizationId: string;
      jobRequestId: string;
      expectedVersion: number;
      correlationId?: string;
    }) {
      return transitionEmployerJobRequest({
        jobRequestRepository,
        organizationRepository,
        membershipService,
        authorizationService,
        actorUserId: input.actorUserId,
        organizationId: input.organizationId,
        jobRequestId: input.jobRequestId,
        expectedVersion: input.expectedVersion,
        permission: "job_request.submit",
        allowedFrom: ["draft", "information_required"],
        nextStatus: "submitted",
        action: "job_request.submitted",
        correlationId: input.correlationId,
        now: currentTimeFrom(now)
      });
    },

    async cancel(input: {
      actorUserId: string;
      organizationId: string;
      jobRequestId: string;
      expectedVersion: number;
      reason: string;
      correlationId?: string;
    }) {
      return transitionEmployerJobRequest({
        jobRequestRepository,
        organizationRepository,
        membershipService,
        authorizationService,
        actorUserId: input.actorUserId,
        organizationId: input.organizationId,
        jobRequestId: input.jobRequestId,
        expectedVersion: input.expectedVersion,
        permission: "job_request.cancel",
        allowedFrom: ["draft", "submitted", "information_required", "approved_for_dispatch"],
        nextStatus: "cancelled",
        action: "job_request.cancelled",
        reason: input.reason,
        correlationId: input.correlationId,
        now: currentTimeFrom(now)
      });
    },

    // Live capacity INCREASE (Add Workers). A dedicated governed operation — NOT the
    // draft-only edit path. Existing offers/assignments/attendance are untouched; only
    // the required-worker target grows, and the extra capacity flows through dispatch.
    // Optimistic-concurrency guarded; audited old→new target.
    async increaseRequestedCapacity(input: {
      actorUserId: string;
      organizationId: string;
      jobRequestId: string;
      additionalWorkers: number;
      expectedVersion: number;
      correlationId?: string;
    }) {
      const currentTime = now();
      const jobRequest = await jobRequestRepository.findJobRequestById(input.jobRequestId);
      const authorization = await authorizeJobRequestEmployerOperation({
        organizationRepository,
        jobRequestRepository,
        membershipService,
        authorizationService,
        actorUserId: input.actorUserId,
        organizationId: input.organizationId,
        permission: "job_request.update_draft",
        jobRequest,
        correlationId: input.correlationId,
        now: currentTime
      });
      if (!authorization.allow || !jobRequest || jobRequest.organizationId !== input.organizationId) {
        throw new JobRequestError(
          authorization.allow
            ? jobRequestDeny("not_found", "job_request_not_found", null, authorization.roles, authorization.organization, authorization.membership)
            : authorization
        );
      }
      if (!LIVE_CAPACITY_STATUSES.includes(jobRequest.status)) {
        throw new JobRequestError(
          jobRequestDeny("invalid_input", "job_request_not_capacity_mutable", toPublicJobRequest(jobRequest), authorization.roles, authorization.organization, authorization.membership)
        );
      }
      const additional = normalizeWorkerCount(input.additionalWorkers);
      if (additional < 1) {
        throw new JobRequestError(
          jobRequestDeny("invalid_input", "invalid_added_capacity", toPublicJobRequest(jobRequest), authorization.roles, authorization.organization, authorization.membership)
        );
      }
      const previousTarget = jobRequest.numberOfWorkers;
      const newTarget = previousTarget + additional;
      const updated = await jobRequestRepository.updateDraft({
        jobRequestId: jobRequest.id,
        expectedVersion: input.expectedVersion,
        actorUserId: input.actorUserId,
        numberOfWorkers: newTarget,
        now: currentTime
      });
      if (!updated) {
        throw new JobRequestError(
          jobRequestDeny("version_conflict", "job_request_version_conflict", toPublicJobRequest(jobRequest), authorization.roles, authorization.organization, authorization.membership)
        );
      }
      await jobRequestRepository.recordJobRequestAuditEvent({
        action: "job_request.updated",
        organizationId: jobRequest.organizationId,
        jobRequestId: jobRequest.id,
        jobRequestNumber: jobRequest.jobRequestNumber,
        actorUserId: input.actorUserId,
        priorState: `numberOfWorkers=${previousTarget}`,
        newState: `numberOfWorkers=${newTarget}`,
        reason: "capacity_increased",
        correlationId: input.correlationId ?? createJobRequestCorrelationId(),
        createdAt: currentTime
      });
      return { jobRequest: toPublicJobRequest(updated), previousTarget, addedCapacity: additional, newTarget };
    },

    async listAdminIntake(input: {
      session: SessionValidationResult;
      roles?: readonly AuthorizationRoleKey[];
      correlationId?: string;
    }) {
      const decision = await authorizeJobRequestPlatformOperation({
        jobRequestRepository,
        authorizationService,
        session: input.session,
        roles: input.roles ?? [],
        permission: "job_request.admin_review",
        correlationId: input.correlationId,
        now: now()
      });

      if (!decision.allow) throw new JobRequestError(decision);

      return (
        await jobRequestRepository.listJobRequests({
          statuses: ["submitted", "admin_review", "information_required"]
        })
      ).map(toPublicJobRequest);
    },

    // Same admin-review authority as listAdminIntake, but across the whole request lifecycle (every
    // non-draft status) rather than only the review queue — so the admin can see requests from
    // submission through to closure on a calendar. Read-only; identical governance.
    async listAdminLifecycle(input: {
      session: SessionValidationResult;
      roles?: readonly AuthorizationRoleKey[];
      correlationId?: string;
    }) {
      const decision = await authorizeJobRequestPlatformOperation({
        jobRequestRepository,
        authorizationService,
        session: input.session,
        roles: input.roles ?? [],
        permission: "job_request.admin_review",
        correlationId: input.correlationId,
        now: now()
      });

      if (!decision.allow) throw new JobRequestError(decision);

      return (
        await jobRequestRepository.listJobRequests({
          statuses: [
            "submitted",
            "admin_review",
            "information_required",
            "approved_for_dispatch",
            "cancelled",
            "expired",
            "archived"
          ]
        })
      ).map(toPublicJobRequest);
    },

    async getForAdmin(input: {
      session: SessionValidationResult;
      roles?: readonly AuthorizationRoleKey[];
      jobRequestIdOrNumber: string;
      correlationId?: string;
    }) {
      const jobRequest = await findJobRequestByIdOrNumber(
        jobRequestRepository,
        input.jobRequestIdOrNumber
      );
      const decision = await authorizeJobRequestPlatformOperation({
        jobRequestRepository,
        authorizationService,
        session: input.session,
        roles: input.roles ?? [],
        permission: "job_request.admin_review",
        jobRequest,
        correlationId: input.correlationId,
        now: now()
      });

      if (!decision.allow || !jobRequest) {
        throw new JobRequestError(
          decision.allow
            ? jobRequestDeny(
                "not_found",
                "job_request_not_found",
                null,
                input.roles ?? [],
                null,
                null
              )
            : decision
        );
      }

      return toPublicJobRequest(jobRequest);
    },

    async startAdminReview(input: {
      session: SessionValidationResult;
      roles?: readonly AuthorizationRoleKey[];
      jobRequestId: string;
      expectedVersion: number;
      correlationId?: string;
    }) {
      return transitionPlatformJobRequest({
        jobRequestRepository,
        authorizationService,
        session: input.session,
        roles: input.roles ?? [],
        jobRequestId: input.jobRequestId,
        expectedVersion: input.expectedVersion,
        permission: "job_request.admin_review",
        allowedFrom: ["submitted"],
        nextStatus: "admin_review",
        action: "job_request.admin_review_started",
        correlationId: input.correlationId,
        now: currentTimeFrom(now)
      });
    },

    async requestInformation(input: {
      session: SessionValidationResult;
      roles?: readonly AuthorizationRoleKey[];
      jobRequestId: string;
      expectedVersion: number;
      reason: string;
      correlationId?: string;
    }) {
      return transitionPlatformJobRequest({
        jobRequestRepository,
        authorizationService,
        session: input.session,
        roles: input.roles ?? [],
        jobRequestId: input.jobRequestId,
        expectedVersion: input.expectedVersion,
        permission: "job_request.request_information",
        allowedFrom: ["admin_review"],
        nextStatus: "information_required",
        action: "job_request.information_requested",
        reason: input.reason,
        correlationId: input.correlationId,
        now: currentTimeFrom(now)
      });
    },

    async approveForDispatch(input: {
      session: SessionValidationResult;
      roles?: readonly AuthorizationRoleKey[];
      jobRequestId: string;
      expectedVersion: number;
      marginPpm?: number | null;
      correlationId?: string;
    }) {
      const capture = options.pricingSnapshotCapture;
      const occurredAt = currentTimeFrom(now);
      // Resolve the worker/platform pricing BEFORE the status flip. resolveAtApproval throws when the
      // request has no effective priced contract, so an unpriced request is rejected without ever
      // changing status — approval always implies a known worker rate.
      const resolved = capture
        ? await capture.resolveAtApproval({
            jobRequestId: input.jobRequestId,
            marginPpm: input.marginPpm ?? null
          })
        : null;
      const result = await transitionPlatformJobRequest({
        jobRequestRepository,
        authorizationService,
        session: input.session,
        roles: input.roles ?? [],
        jobRequestId: input.jobRequestId,
        expectedVersion: input.expectedVersion,
        permission: "job_request.approve_for_dispatch",
        allowedFrom: ["admin_review"],
        nextStatus: "approved_for_dispatch",
        action: "job_request.approved_for_dispatch",
        correlationId: input.correlationId,
        now: occurredAt
      });
      // Persist the immutable snapshot once the flip succeeds (the same sequential model the audit
      // write uses). An unpriced request already failed above, so an approved request has a snapshot.
      if (capture && resolved) {
        await capture.persist({
          resolved,
          capturedByUserId: input.session.user?.id ?? "system",
          occurredAt
        });
      }
      return result;
    }
  };
}

export type JobRequestService = ReturnType<typeof createJobRequestService>;

export function createUnavailableCandidateSource(): DispatchCandidateSource {
  return {
    async getStatus() {
      return { status: "candidate_source_unavailable" };
    },
    async searchCandidates() {
      return { status: "candidate_source_unavailable", candidates: [] };
    },
    async evaluateCandidate() {
      return { status: "candidate_source_unavailable", candidate: null };
    }
  };
}

// LOCAL/TEST candidate source backed by marketplace interest. The external HTTP candidate
// source is not wired outside production, which would leave dispatch with no candidates and
// block the governed offer flow. This implements the designed DispatchCandidateSource extension
// point by sourcing candidates from workers who expressed interest in the job. It is wired ONLY
// when the local E2E flag is set (see apps/api/src/app.ts); production still uses the HTTP source.
export function createLocalMarketplaceCandidateSource(deps: {
  listInterestedWorkers: (
    jobRequestId: string
  ) => Promise<readonly { workerIdentityId: string; displayName: string | null }[]>;
}): DispatchCandidateSource {
  const buildCandidate = (
    dispatchReviewId: string,
    workerIdentityId: string,
    displayName: string | null,
    at: Date
  ): PublicDispatchCandidate => ({
    id: `local-candidate-${workerIdentityId}`,
    dispatchReviewId,
    workerIdentityId,
    candidateSourceType: "internal_worker_profile",
    candidateSourceReference: `marketplace-interest:${workerIdentityId}`,
    approvedDisplayName: displayName ?? "Interested worker",
    workGroupMatch: "match",
    roleDefinitionMatch: "match",
    qualificationSummaryState: "meets_requirements",
    verificationSummaryState: "meets_requirements",
    availabilityState: "available",
    scheduleConflictState: "conflict_free",
    serviceAreaState: "inside_service_area",
    travelSuitabilityState: "suitable",
    transportConstraintState: "available",
    recommendationState: "recommended",
    shortlistState: "not_shortlisted",
    shortlistOrder: null,
    sourceFreshnessAt: at,
    lastEvaluatedAt: at,
    evaluationVersion: 1,
    addedByUserId: null,
    removedByUserId: null,
    createdAt: at,
    updatedAt: at,
    version: 1,
    versionToken: 1
  });
  const referenceToWorkerId = (reference: string) =>
    reference.startsWith("marketplace-interest:")
      ? reference.slice("marketplace-interest:".length)
      : reference;
  return {
    async getStatus() {
      return { status: "available" };
    },
    async searchCandidates(input) {
      const interested = await deps.listInterestedWorkers(input.dispatchReview.jobRequestId);
      return {
        status: "available",
        candidates: interested.map((worker) =>
          buildCandidate(
            input.dispatchReview.id,
            worker.workerIdentityId,
            worker.displayName,
            input.requestedAt
          )
        )
      };
    },
    async evaluateCandidate(input) {
      const workerIdentityId = referenceToWorkerId(input.candidateSourceReference);
      const interested = await deps.listInterestedWorkers(input.dispatchReview.jobRequestId);
      const match = interested.find((worker) => worker.workerIdentityId === workerIdentityId);
      if (!match) {
        return { status: "candidate_source_unavailable", candidate: null };
      }
      return {
        status: "available",
        candidate: buildCandidate(
          input.dispatchReview.id,
          match.workerIdentityId,
          match.displayName,
          input.requestedAt
        )
      };
    }
  };
}

export function createDispatchService(
  dispatchRepository: DispatchRepository,
  jobRequestRepository: JobRequestRepository,
  organizationRepository: EmployerOrganizationRepository,
  membershipService: OrganizationMembershipService,
  authorizationService: AuthorizationService,
  candidateSource: DispatchCandidateSource = createUnavailableCandidateSource(),
  options: { now?: () => Date } = {}
) {
  const now = options.now ?? (() => new Date());

  return {
    async createDispatch(input: {
      session: SessionValidationResult;
      roles?: readonly AuthorizationRoleKey[];
      jobRequestIdOrNumber: string;
      operationalOwnerUserId?: string | null;
      priority?: DispatchPriority;
      correlationId?: string;
    }) {
      const currentTime = now();
      const jobRequest = await findJobRequestByIdOrNumber(
        jobRequestRepository,
        input.jobRequestIdOrNumber
      );
      const decision = await authorizeDispatchPlatformOperation({
        dispatchRepository,
        authorizationService,
        session: input.session,
        roles: input.roles ?? [],
        permission: "dispatch.create",
        dispatchReview: null,
        correlationId: input.correlationId,
        now: currentTime
      });

      if (!decision.allow) throw new DispatchError(decision);
      if (!jobRequest) {
        throw new DispatchError(
          dispatchDeny("not_found", "job_request_not_found", null, input.roles ?? [])
        );
      }
      if (jobRequest.status !== "approved_for_dispatch") {
        throw new DispatchError(
          dispatchDeny(
            "job_request_not_ready",
            "job_request_not_approved_for_dispatch",
            null,
            input.roles ?? []
          )
        );
      }

      const existing = await dispatchRepository.findActiveDispatchReviewForJobRequest(
        jobRequest.id
      );
      if (existing) {
        throw new DispatchError(
          dispatchDeny(
            "invalid_transition",
            "non_terminal_dispatch_already_exists",
            toPublicDispatchReview(existing),
            input.roles ?? []
          )
        );
      }

      let dispatchReview: StoredDispatchReview;
      const correlationId = input.correlationId ?? randomUUID();
      try {
        dispatchReview = await dispatchRepository.createDispatchReviewWithAudit({
          jobRequest,
          actorUserId: input.session.user?.id ?? "system",
          operationalOwnerUserId: input.operationalOwnerUserId ?? input.session.user?.id ?? null,
          priority: input.priority ?? urgencyToDispatchPriority(jobRequest.urgency),
          correlationId,
          now: currentTime
        });
      } catch (error) {
        if (!isPrismaUniqueConflict(error)) throw error;
        const concurrentDispatch = await dispatchRepository.findActiveDispatchReviewForJobRequest(
          jobRequest.id
        );
        if (!concurrentDispatch) throw error;
        throw new DispatchError(
          dispatchDeny(
            "invalid_transition",
            "non_terminal_dispatch_already_exists",
            toPublicDispatchReview(concurrentDispatch),
            input.roles ?? []
          )
        );
      }
      return toPublicDispatchReview(dispatchReview);
    },

    async listDispatches(input: {
      session: SessionValidationResult;
      roles?: readonly AuthorizationRoleKey[];
      organizationId?: string | null;
      states?: readonly DispatchReviewStatus[];
      correlationId?: string;
    }) {
      const decision = await authorizeDispatchPlatformOperation({
        dispatchRepository,
        authorizationService,
        session: input.session,
        roles: input.roles ?? [],
        permission: "dispatch.read",
        dispatchReview: null,
        correlationId: input.correlationId,
        now: now()
      });
      if (!decision.allow) throw new DispatchError(decision);

      return (
        await dispatchRepository.listDispatchReviews({
          organizationId: input.organizationId ?? undefined,
          states: input.states
        })
      ).map(toPublicDispatchReview);
    },

    async getDispatch(input: {
      session: SessionValidationResult;
      roles?: readonly AuthorizationRoleKey[];
      dispatchReviewId: string;
      correlationId?: string;
    }) {
      const currentTime = now();
      const dispatchReview = await dispatchRepository.findDispatchReviewById(
        input.dispatchReviewId
      );
      const decision = await authorizeDispatchPlatformOperation({
        dispatchRepository,
        authorizationService,
        session: input.session,
        roles: input.roles ?? [],
        permission: "dispatch.read",
        dispatchReview,
        correlationId: input.correlationId,
        now: currentTime
      });
      if (!decision.allow || !dispatchReview) {
        throw new DispatchError(
          decision.allow
            ? dispatchDeny("not_found", "dispatch_not_found", null, input.roles ?? [])
            : decision
        );
      }

      return {
        dispatchReview: toPublicDispatchReview(dispatchReview),
        candidates: (await dispatchRepository.listCandidates(dispatchReview.id)).map(
          toPublicDispatchCandidate
        )
      };
    },

    async assignOperationalOwner(input: {
      session: SessionValidationResult;
      roles?: readonly AuthorizationRoleKey[];
      dispatchReviewId: string;
      operationalOwnerUserId: string | null;
      expectedVersion: number;
      correlationId?: string;
    }) {
      return updateDispatchBoundary({
        dispatchRepository,
        authorizationService,
        session: input.session,
        roles: input.roles ?? [],
        permission: "dispatch.create",
        dispatchReviewId: input.dispatchReviewId,
        expectedVersion: input.expectedVersion,
        transition: "owner",
        data: { operationalOwnerUserId: input.operationalOwnerUserId },
        action: "dispatch.owner_changed",
        reason: null,
        correlationId: input.correlationId,
        now: now()
      });
    },

    async startCandidateReview(input: DispatchTransitionInput) {
      return transitionDispatchReview({
        ...input,
        dispatchRepository,
        authorizationService,
        permission: "dispatch.review_candidates",
        allowedFrom: ["draft", "active"],
        nextState: "candidate_review",
        action: "dispatch.candidate_review_started",
        startedAt: true,
        now: now()
      });
    },

    async getCandidateSourceStatus(input: {
      session: SessionValidationResult;
      roles?: readonly AuthorizationRoleKey[];
      dispatchReviewId: string;
      correlationId?: string;
    }) {
      await requireAuthorizedDispatch({
        dispatchRepository,
        authorizationService,
        session: input.session,
        roles: input.roles ?? [],
        permission: "dispatch.review_candidates",
        dispatchReviewId: input.dispatchReviewId,
        correlationId: input.correlationId,
        now: now()
      });
      return candidateSource.getStatus();
    },

    async searchCandidates(input: {
      session: SessionValidationResult;
      roles?: readonly AuthorizationRoleKey[];
      dispatchReviewId: string;
      correlationId?: string;
    }) {
      const currentTime = now();
      const dispatchReview = await requireAuthorizedDispatch({
        dispatchRepository,
        authorizationService,
        session: input.session,
        roles: input.roles ?? [],
        permission: "dispatch.review_candidates",
        dispatchReviewId: input.dispatchReviewId,
        correlationId: input.correlationId,
        now: currentTime
      });
      const jobRequest = await jobRequestRepository.findJobRequestById(
        dispatchReview.stored.jobRequestId
      );
      if (!jobRequest) {
        throw new DispatchError(
          dispatchDeny("not_found", "job_request_not_found", null, input.roles ?? [])
        );
      }
      const result = await candidateSource.searchCandidates({
        dispatchReview: dispatchReview.publicDispatch,
        staffingWindow: {
          startAt: jobRequest.startAt,
          endAt: jobRequest.endAt,
          timezone: jobRequest.timezone
        },
        requestedAt: currentTime
      });
      if (result.status === "candidate_source_unavailable") {
        await recordDispatchAudit(dispatchRepository, {
          action: "dispatch.candidate_source_unavailable",
          organizationId: dispatchReview.stored.organizationId,
          dispatchReviewId: dispatchReview.stored.id,
          jobRequestId: dispatchReview.stored.jobRequestId,
          actorUserId: input.session.user?.id ?? null,
          priorState: dispatchReview.stored.state,
          newState: dispatchReview.stored.state,
          reason: "candidate_source_unavailable",
          correlationId: input.correlationId,
          createdAt: currentTime
        });
      }
      return result;
    },

    async evaluateCandidate(input: {
      session: SessionValidationResult;
      roles?: readonly AuthorizationRoleKey[];
      dispatchReviewId: string;
      candidateSourceReference: string;
      correlationId?: string;
    }) {
      const currentTime = now();
      const dispatchReview = await requireAuthorizedDispatch({
        dispatchRepository,
        authorizationService,
        session: input.session,
        roles: input.roles ?? [],
        permission: "dispatch.review_candidates",
        dispatchReviewId: input.dispatchReviewId,
        correlationId: input.correlationId,
        now: currentTime
      });
      const jobRequest = await jobRequestRepository.findJobRequestById(
        dispatchReview.stored.jobRequestId
      );
      if (!jobRequest) {
        throw new DispatchError(
          dispatchDeny("not_found", "job_request_not_found", null, input.roles ?? [])
        );
      }
      const result = await candidateSource.evaluateCandidate({
        dispatchReview: dispatchReview.publicDispatch,
        candidateSourceReference: input.candidateSourceReference,
        staffingWindow: {
          startAt: jobRequest.startAt,
          endAt: jobRequest.endAt,
          timezone: jobRequest.timezone
        },
        requestedAt: currentTime
      });
      if (result.status === "candidate_source_unavailable") {
        await recordDispatchAudit(dispatchRepository, {
          action: "dispatch.candidate_source_unavailable",
          organizationId: dispatchReview.stored.organizationId,
          dispatchReviewId: dispatchReview.stored.id,
          jobRequestId: dispatchReview.stored.jobRequestId,
          actorUserId: input.session.user?.id ?? null,
          priorState: dispatchReview.stored.state,
          newState: dispatchReview.stored.state,
          reason: "candidate_source_unavailable",
          correlationId: input.correlationId,
          createdAt: currentTime
        });
        return result;
      }
      const candidate = await dispatchRepository.upsertCandidate({
        dispatchReviewId: dispatchReview.stored.id,
        candidate: stripPublicCandidateForUpsert(result.candidate),
        actorUserId: input.session.user?.id ?? "system",
        now: currentTime
      });
      await recordDispatchAudit(dispatchRepository, {
        action: "dispatch.candidate_evaluated",
        organizationId: dispatchReview.stored.organizationId,
        dispatchReviewId: dispatchReview.stored.id,
        jobRequestId: dispatchReview.stored.jobRequestId,
        actorUserId: input.session.user?.id ?? null,
        priorState: dispatchReview.stored.state,
        newState: dispatchReview.stored.state,
        reason: candidate.candidateSourceReference,
        correlationId: input.correlationId,
        createdAt: currentTime
      });
      return { status: "available" as const, candidate: toPublicDispatchCandidate(candidate) };
    },

    async addCandidateToShortlist(input: DispatchCandidateShortlistInput) {
      return updateCandidateShortlistBoundary({
        ...input,
        dispatchRepository,
        authorizationService,
        shortlistState: "shortlisted",
        action: "dispatch.candidate_shortlisted",
        now: now()
      });
    },

    async removeCandidateFromShortlist(input: DispatchCandidateShortlistInput) {
      return updateCandidateShortlistBoundary({
        ...input,
        dispatchRepository,
        authorizationService,
        shortlistState: "removed",
        action: "dispatch.candidate_removed",
        now: now()
      });
    },

    async reorderShortlist(input: {
      session: SessionValidationResult;
      roles?: readonly AuthorizationRoleKey[];
      dispatchReviewId: string;
      candidateSourceReferences: readonly string[];
      correlationId?: string;
    }) {
      const currentTime = now();
      const dispatchReview = await requireAuthorizedDispatch({
        dispatchRepository,
        authorizationService,
        session: input.session,
        roles: input.roles ?? [],
        permission: "dispatch.manage_shortlist",
        dispatchReviewId: input.dispatchReviewId,
        correlationId: input.correlationId,
        now: currentTime
      });
      const candidates = await dispatchRepository.reorderShortlist({
        dispatchReviewId: dispatchReview.stored.id,
        candidateSourceReferences: input.candidateSourceReferences,
        actorUserId: input.session.user?.id ?? "system",
        now: currentTime
      });
      await recordDispatchAudit(dispatchRepository, {
        action: "dispatch.shortlist_reordered",
        organizationId: dispatchReview.stored.organizationId,
        dispatchReviewId: dispatchReview.stored.id,
        jobRequestId: dispatchReview.stored.jobRequestId,
        actorUserId: input.session.user?.id ?? null,
        priorState: dispatchReview.stored.state,
        newState: dispatchReview.stored.state,
        reason: null,
        correlationId: input.correlationId,
        createdAt: currentTime
      });
      return candidates.map(toPublicDispatchCandidate);
    },

    async markShortlistReady(input: DispatchTransitionInput) {
      return transitionDispatchReview({
        ...input,
        dispatchRepository,
        authorizationService,
        permission: "dispatch.manage_shortlist",
        allowedFrom: ["candidate_review", "active"],
        nextState: "shortlist_ready",
        action: "dispatch.shortlist_ready",
        now: now()
      });
    },

    async moveToOfferPreparation(input: DispatchTransitionInput) {
      return transitionDispatchReview({
        ...input,
        dispatchRepository,
        authorizationService,
        permission: "dispatch.prepare_offer",
        allowedFrom: ["shortlist_ready"],
        nextState: "offer_preparation",
        action: "dispatch.offer_preparation",
        prepareOfferBoundary: true,
        now: now()
      });
    },

    async pause(input: DispatchTransitionInput & { reason: string }) {
      return transitionDispatchReview({
        ...input,
        dispatchRepository,
        authorizationService,
        permission: "dispatch.pause",
        allowedFrom: ["active", "candidate_review", "shortlist_ready", "offer_preparation"],
        nextState: "paused",
        action: "dispatch.paused",
        pausedAt: true,
        now: now()
      });
    },

    async resume(input: DispatchTransitionInput) {
      return transitionDispatchReview({
        ...input,
        dispatchRepository,
        authorizationService,
        permission: "dispatch.resume",
        allowedFrom: ["paused"],
        nextState: "active",
        action: "dispatch.resumed",
        now: now()
      });
    },

    async cancel(input: DispatchTransitionInput & { reason: string }) {
      return transitionDispatchReview({
        ...input,
        dispatchRepository,
        authorizationService,
        permission: "dispatch.cancel",
        allowedFrom: nonTerminalDispatchStates,
        nextState: "cancelled",
        action: "dispatch.cancelled",
        cancelledAt: true,
        now: now()
      });
    },

    async close(input: DispatchTransitionInput & { reason: string }) {
      return transitionDispatchReview({
        ...input,
        dispatchRepository,
        authorizationService,
        permission: "dispatch.close",
        allowedFrom: nonTerminalDispatchStates,
        nextState: "closed",
        action: "dispatch.closed",
        closedAt: true,
        now: now()
      });
    },

    async readAuditSummary(input: {
      session: SessionValidationResult;
      roles?: readonly AuthorizationRoleKey[];
      dispatchReviewId: string;
      correlationId?: string;
    }) {
      const dispatchReview = await requireAuthorizedDispatch({
        dispatchRepository,
        authorizationService,
        session: input.session,
        roles: input.roles ?? [],
        permission: "dispatch.audit_read",
        dispatchReviewId: input.dispatchReviewId,
        correlationId: input.correlationId,
        now: now()
      });
      return {
        dispatchReviewId: dispatchReview.stored.id,
        policyVersion: "dispatch-foundation-v1",
        auditAvailable: true,
        message: "Dispatch audit is available through governed audit records."
      };
    },

    async getEmployerDispatchStatus(input: {
      actorUserId: string;
      organizationId: string;
      jobRequestIdOrNumber: string;
      correlationId?: string;
    }) {
      const currentTime = now();
      const jobRequest = await findJobRequestByIdOrNumber(
        jobRequestRepository,
        input.jobRequestIdOrNumber
      );
      const authorization = await authorizeJobRequestEmployerOperation({
        organizationRepository,
        jobRequestRepository,
        membershipService,
        authorizationService,
        actorUserId: input.actorUserId,
        organizationId: input.organizationId,
        permission: "job_request.read",
        jobRequest,
        correlationId: input.correlationId,
        now: currentTime
      });
      if (
        !authorization.allow ||
        !jobRequest ||
        jobRequest.organizationId !== input.organizationId
      ) {
        throw new JobRequestError(
          authorization.allow
            ? jobRequestDeny(
                "not_found",
                "job_request_not_found",
                null,
                authorization.roles,
                authorization.organization,
                authorization.membership
              )
            : authorization
        );
      }
      const dispatchReview = await dispatchRepository.findCurrentDispatchReviewForJobRequest(
        jobRequest.id
      );
      return toEmployerDispatchStatus(jobRequest, dispatchReview);
    }
  };
}

export type DispatchService = ReturnType<typeof createDispatchService>;

export function createWorkerOfferService(
  workerOfferRepository: WorkerOfferRepository,
  dispatchRepository: DispatchRepository,
  jobRequestRepository: JobRequestRepository,
  authorizationService: AuthorizationService,
  options: {
    now?: () => Date;
    deliveryProvider?: WorkerOfferDeliveryProvider;
  } = {}
) {
  const now = options.now ?? (() => new Date());
  const deliveryProvider = options.deliveryProvider ?? unavailableWorkerOfferDeliveryProvider;

  return {
    async ensureWorkerIdentity(input: {
      userId: string;
      displayName?: string | null;
      preferredLanguage?: string | null;
    }) {
      const existing = await workerOfferRepository.findWorkerIdentityByUserId(input.userId);
      if (existing) return existing;

      return workerOfferRepository.createWorkerIdentity({
        userId: input.userId,
        displayName: normalizeOptionalResidenceText(input.displayName ?? null, 160),
        preferredLanguage: normalizeOptionalResidenceText(input.preferredLanguage ?? null, 40),
        now: now()
      });
    },

    // The worker's self-declared tax classification. Only the two worker-facing types are selectable
    // here (employee or travailleur autonome = contractor); the identity is ensured first so a brand-
    // new worker can set it at sign-up. Drives payroll (deductions / T4 vs no deductions / T4A).
    async setClassification(input: { userId: string; classification: string }) {
      const normalized = input.classification === "contractor" ? "contractor" : "employee";
      const existing = await workerOfferRepository.findWorkerIdentityByUserId(input.userId);
      if (!existing) {
        await workerOfferRepository.createWorkerIdentity({
          userId: input.userId,
          displayName: null,
          preferredLanguage: null,
          now: now()
        });
      }
      return workerOfferRepository.setWorkerClassification({
        userId: input.userId,
        classification: normalized,
        now: now()
      });
    },

    async createOffer(input: {
      session: SessionValidationResult;
      roles?: readonly AuthorizationRoleKey[];
      dispatchReviewId: string;
      workerIdentityId: string;
      expiresAt: Date;
      workerVisibleTitle?: string | null;
      workerVisibleSummary?: string | null;
      compensationSummary?: string | null;
      policySummary?: string | null;
      correlationId?: string;
    }) {
      const currentTime = now();
      const dispatchReview = await dispatchRepository.findDispatchReviewById(
        input.dispatchReviewId
      );
      const decision = await authorizeWorkerOfferPlatformOperation({
        workerOfferRepository,
        authorizationService,
        session: input.session,
        roles: input.roles ?? [],
        permission: "worker_offer.create",
        workerOffer: null,
        correlationId: input.correlationId,
        now: currentTime
      });
      if (!decision.allow) throw new WorkerOfferError(decision);
      if (!dispatchReview) {
        throw new WorkerOfferError(
          workerOfferDeny("not_found", "dispatch_not_found", null, input.roles ?? [])
        );
      }
      if (dispatchReview.state !== "offer_preparation") {
        throw new WorkerOfferError(
          workerOfferDeny(
            "invalid_transition",
            `dispatch_not_in_offer_preparation:${dispatchReview.state}`,
            null,
            input.roles ?? []
          )
        );
      }

      const jobRequest = await jobRequestRepository.findJobRequestById(dispatchReview.jobRequestId);
      const workerIdentity = await workerOfferRepository.findWorkerIdentityById(
        input.workerIdentityId
      );
      if (!jobRequest) {
        throw new WorkerOfferError(
          workerOfferDeny("not_found", "job_request_not_found", null, input.roles ?? [])
        );
      }
      if (!workerIdentity) {
        throw new WorkerOfferError(
          workerOfferDeny("not_found", "worker_identity_not_found", null, input.roles ?? [])
        );
      }
      if (workerIdentity.status !== "active") {
        throw new WorkerOfferError(
          workerOfferDeny(
            "worker_identity_inactive",
            "worker_identity_not_active",
            null,
            input.roles ?? []
          )
        );
      }
      const shortlistedCandidate =
        await dispatchRepository.findShortlistedCandidateByWorkerIdentity(
          dispatchReview.id,
          workerIdentity.id
        );
      if (!shortlistedCandidate) {
        throw new WorkerOfferError(
          workerOfferDeny(
            "invalid_input",
            "worker_not_linked_to_shortlisted_candidate",
            null,
            input.roles ?? []
          )
        );
      }
      if (input.expiresAt <= currentTime) {
        throw new WorkerOfferError(
          workerOfferDeny("invalid_input", "offer_expiry_must_be_future", null, input.roles ?? [])
        );
      }

      // Offer capacity is the number of offers this dispatch may hold open at once. When the
      // dispatch has been moved to offer_preparation, `preparedOfferCount` is the governed offer
      // target set at that boundary (min of required headcount and shortlist size) — so up to that
      // many offers may be created. For dispatches that reached offer_preparation without the
      // boundary pass (e.g. seeded directly into the state), `preparedOfferCount` is 0 and we fall
      // back to the required headcount. The repository gate enforces activeOfferCount < capacity.
      const remainingWorkerCount =
        dispatchReview.preparedOfferCount > 0
          ? dispatchReview.preparedOfferCount
          : dispatchReview.requiredWorkerCount;
      const title =
        normalizeRequiredJobRequestText(input.workerVisibleTitle ?? jobRequest.title, 4, 160) ??
        jobRequest.title;
      const created = await workerOfferRepository.createWorkerOffer({
        dispatchReview,
        jobRequest,
        workerIdentity,
        expiresAt: input.expiresAt,
        workerVisibleTitle: title,
        workerVisibleSummary: normalizeOptionalResidenceText(
          input.workerVisibleSummary ?? jobRequest.description,
          2000
        ),
        compensationSummary: normalizeOptionalResidenceText(input.compensationSummary ?? null, 500),
        policySummary: normalizeOptionalResidenceText(input.policySummary ?? null, 500),
        actorUserId: input.session.user?.id ?? "system",
        capacityLimit: remainingWorkerCount,
        now: currentTime
      });
      if (!created) {
        throw new WorkerOfferError(
          workerOfferDeny(
            "capacity_exceeded",
            "remaining_worker_count_reached",
            null,
            input.roles ?? []
          )
        );
      }
      const publicOffer = toPublicWorkerOffer(created.offer, created.termsVersion);
      await recordWorkerOfferAudit(workerOfferRepository, {
        action: "worker_offer.created",
        organizationId: created.offer.organizationId,
        workerOfferId: created.offer.id,
        dispatchReviewId: created.offer.dispatchReviewId,
        jobRequestId: created.offer.jobRequestId,
        actorUserId: input.session.user?.id ?? null,
        priorState: null,
        newState: created.offer.status,
        reason: null,
        correlationId: input.correlationId,
        createdAt: currentTime
      });
      await recordWorkerOfferAudit(workerOfferRepository, {
        action: "worker_offer.terms_version_created",
        organizationId: created.offer.organizationId,
        workerOfferId: created.offer.id,
        dispatchReviewId: created.offer.dispatchReviewId,
        jobRequestId: created.offer.jobRequestId,
        actorUserId: input.session.user?.id ?? null,
        priorState: null,
        newState: String(created.termsVersion.versionNumber),
        reason: created.termsVersion.id,
        correlationId: input.correlationId,
        createdAt: currentTime
      });

      return publicOffer;
    },

    async listOffers(input: {
      session: SessionValidationResult;
      roles?: readonly AuthorizationRoleKey[];
      dispatchReviewId?: string | null;
      organizationId?: string | null;
      statuses?: readonly WorkerOfferStatus[];
      correlationId?: string;
    }) {
      const decision = await authorizeWorkerOfferPlatformOperation({
        workerOfferRepository,
        authorizationService,
        session: input.session,
        roles: input.roles ?? [],
        permission: "worker_offer.read",
        workerOffer: null,
        correlationId: input.correlationId,
        now: now()
      });
      if (!decision.allow) throw new WorkerOfferError(decision);

      return Promise.all(
        (
          await workerOfferRepository.listWorkerOffers({
            dispatchReviewId: input.dispatchReviewId ?? undefined,
            organizationId: input.organizationId ?? undefined,
            statuses: input.statuses
          })
        ).map(async (offer) =>
          toPublicWorkerOffer(offer, await workerOfferRepository.findCurrentTermsVersion(offer.id))
        )
      );
    },

    async readOffer(input: {
      session: SessionValidationResult;
      roles?: readonly AuthorizationRoleKey[];
      workerOfferId: string;
      correlationId?: string;
    }) {
      const offer = await requireAuthorizedWorkerOffer({
        workerOfferRepository,
        authorizationService,
        session: input.session,
        roles: input.roles ?? [],
        permission: "worker_offer.read",
        workerOfferId: input.workerOfferId,
        correlationId: input.correlationId,
        now: now()
      });
      return offer.publicOffer;
    },

    async approve(input: WorkerOfferTransitionInput) {
      return transitionWorkerOffer({
        ...input,
        workerOfferRepository,
        authorizationService,
        permission: "worker_offer.approve",
        allowedFrom: ["draft"],
        nextStatus: "approved",
        action: "worker_offer.approved",
        approvedAt: true,
        now: now()
      });
    },

    async send(input: WorkerOfferTransitionInput) {
      const authorized = await requireAuthorizedWorkerOffer({
        workerOfferRepository,
        authorizationService,
        permission: "worker_offer.send",
        session: input.session,
        roles: input.roles ?? [],
        workerOfferId: input.workerOfferId,
        correlationId: input.correlationId,
        now: now()
      });
      if (
        authorized.stored.version !== input.expectedVersion ||
        authorized.stored.status !== "approved"
      ) {
        throw new WorkerOfferError(
          workerOfferDeny(
            authorized.stored.version !== input.expectedVersion
              ? "version_conflict"
              : "invalid_transition",
            "worker_offer_send_not_allowed",
            authorized.publicOffer,
            input.roles ?? []
          )
        );
      }
      return deliverWorkerOffer({
        workerOfferRepository,
        deliveryProvider,
        offer: authorized.publicOffer,
        actorUserId: input.session.user?.id ?? null,
        ...(input.correlationId ? { correlationId: input.correlationId } : {}),
        now: now()
      });
    },

    async retryDelivery(input: WorkerOfferTransitionInput) {
      const authorized = await requireAuthorizedWorkerOffer({
        workerOfferRepository,
        authorizationService,
        session: input.session,
        roles: input.roles ?? [],
        permission: "worker_offer.send",
        workerOfferId: input.workerOfferId,
        correlationId: input.correlationId,
        now: now()
      });
      if (authorized.stored.version !== input.expectedVersion) {
        throw new WorkerOfferError(
          workerOfferDeny(
            "version_conflict",
            "worker_offer_version_conflict",
            authorized.publicOffer,
            input.roles ?? []
          )
        );
      }
      if (authorized.stored.status !== "approved") {
        throw new WorkerOfferError(
          workerOfferDeny(
            "invalid_transition",
            `worker_offer_delivery_retry_not_allowed:${authorized.stored.status}`,
            authorized.publicOffer,
            input.roles ?? []
          )
        );
      }
      return deliverWorkerOffer({
        workerOfferRepository,
        deliveryProvider,
        offer: authorized.publicOffer,
        actorUserId: input.session.user?.id ?? null,
        ...(input.correlationId ? { correlationId: input.correlationId } : {}),
        now: now()
      });
    },

    async workerRead(input: {
      session: SessionValidationResult;
      roles?: readonly AuthorizationRoleKey[];
      workerOfferId: string;
      correlationId?: string;
    }) {
      const workerIdentity = await requireWorkerIdentityForSession(
        workerOfferRepository,
        input.session
      );
      const offer = await requireWorkerOwnedOffer({
        workerOfferRepository,
        authorizationService,
        session: input.session,
        roles: input.roles ?? [],
        workerIdentity,
        workerOfferId: input.workerOfferId,
        correlationId: input.correlationId,
        now: now()
      });
      return offer.publicOffer;
    },

    async listWorkerOffers(input: {
      session: SessionValidationResult;
      roles?: readonly AuthorizationRoleKey[];
      statuses?: readonly WorkerOfferStatus[];
      correlationId?: string;
    }) {
      const currentTime = now();
      const workerIdentity = await requireWorkerIdentityForSession(
        workerOfferRepository,
        input.session
      );
      const decision = await authorizationService.decide({
        session: input.session,
        roles: input.roles ?? [],
        permission: "worker_offer.respond"
      });
      if (!decision.allow) {
        const denial = workerOfferDeny(
          "permission_denied",
          "worker_offer_discovery_denied",
          null,
          input.roles ?? []
        );
        await recordWorkerOfferDenial(workerOfferRepository, {
          decision: denial,
          actorUserId: input.session.user?.id ?? null,
          correlationId: input.correlationId,
          createdAt: currentTime
        });
        throw new WorkerOfferError(denial);
      }

      const requestedStatuses = input.statuses?.filter((status) =>
        workerDiscoverableOfferStates.includes(status)
      );
      const statuses =
        requestedStatuses && requestedStatuses.length > 0
          ? requestedStatuses
          : workerDiscoverableOfferStates;
      return Promise.all(
        (
          await workerOfferRepository.listWorkerOffers({
            workerIdentityId: workerIdentity.id,
            statuses
          })
        ).map(async (offer) =>
          toPublicWorkerOffer(offer, await workerOfferRepository.findCurrentTermsVersion(offer.id))
        )
      );
    },

    async workerCalendarReference(input: {
      session: SessionValidationResult;
      roles?: readonly AuthorizationRoleKey[];
      workerOfferId: string;
      correlationId?: string;
    }) {
      const workerIdentity = await requireWorkerIdentityForSession(
        workerOfferRepository,
        input.session
      );
      const offer = await requireWorkerOwnedOffer({
        workerOfferRepository,
        authorizationService,
        session: input.session,
        roles: input.roles ?? [],
        workerIdentity,
        workerOfferId: input.workerOfferId,
        correlationId: input.correlationId,
        now: now()
      });
      return offer.publicOffer;
    },

    async accept(input: WorkerOfferResponseInput) {
      return respondToWorkerOffer({
        ...input,
        workerOfferRepository,
        authorizationService,
        responseType: "accepted",
        nextStatus: "accepted",
        action: "worker_offer.accepted",
        now: now()
      });
    },

    async decline(input: WorkerOfferResponseInput) {
      return respondToWorkerOffer({
        ...input,
        workerOfferRepository,
        authorizationService,
        responseType: "declined",
        nextStatus: "declined",
        action: "worker_offer.declined",
        now: now()
      });
    },

    async withdraw(input: WorkerOfferTransitionInput & { reason: string }) {
      return transitionWorkerOffer({
        ...input,
        workerOfferRepository,
        authorizationService,
        permission: "worker_offer.withdraw",
        allowedFrom: ["draft", "approved", "sent", "delivered", "viewed"],
        nextStatus: "withdrawn",
        action: "worker_offer.withdrawn",
        withdrawnAt: true,
        now: now()
      });
    },

    async cancel(input: WorkerOfferTransitionInput & { reason: string }) {
      return transitionWorkerOffer({
        ...input,
        workerOfferRepository,
        authorizationService,
        permission: "worker_offer.cancel",
        allowedFrom: ["draft", "approved", "sent", "delivered", "viewed"],
        nextStatus: "cancelled",
        action: "worker_offer.cancelled",
        cancelledAt: true,
        now: now()
      });
    },

    async readAuditSummary(input: {
      session: SessionValidationResult;
      roles?: readonly AuthorizationRoleKey[];
      workerOfferId: string;
      correlationId?: string;
    }) {
      const offer = await requireAuthorizedWorkerOffer({
        workerOfferRepository,
        authorizationService,
        session: input.session,
        roles: input.roles ?? [],
        permission: "worker_offer.audit_read",
        workerOfferId: input.workerOfferId,
        correlationId: input.correlationId,
        now: now()
      });
      return {
        workerOfferId: offer.stored.id,
        dispatchReviewId: offer.stored.dispatchReviewId,
        jobRequestId: offer.stored.jobRequestId,
        policyVersion: "worker-offer-foundation-v1",
        auditAvailable: true,
        message: "Worker Offer audit is available through governed audit records."
      };
    }
  };
}

export type WorkerOfferService = ReturnType<typeof createWorkerOfferService>;

const unavailableWorkerOfferDeliveryProvider: WorkerOfferDeliveryProvider = {
  async deliver() {
    return { status: "failed", providerReference: null, retryable: true };
  }
};

async function deliverWorkerOffer(input: {
  workerOfferRepository: WorkerOfferRepository;
  deliveryProvider: WorkerOfferDeliveryProvider;
  offer: PublicWorkerOffer;
  actorUserId: string | null;
  correlationId?: string;
  now: Date;
}) {
  const termsId = input.offer.currentTermsVersion?.id ?? "missing";
  let result: WorkerOfferDeliveryResult;
  try {
    result = await input.deliveryProvider.deliver({
      organizationId: input.offer.organizationId,
      workerOfferId: input.offer.id,
      workerIdentityId: input.offer.workerIdentityId,
      idempotencyKey: `worker-offer:${input.offer.id}:terms:${termsId}`
    });
  } catch {
    result = { status: "failed", providerReference: null, retryable: true };
  }
  const attemptStatus =
    result.status === "delivered" ? "delivered" : result.status === "sent" ? "attempted" : "failed";
  const reason =
    result.status === "failed"
      ? result.retryable
        ? "provider_unavailable_retryable"
        : "provider_rejected"
      : result.providerReference
        ? `provider_reference:${result.providerReference}`
        : null;
  if (result.status !== "failed") {
    const updated = await input.workerOfferRepository.finalizeAcceptedDelivery({
      workerOfferId: input.offer.id,
      expectedVersion: input.offer.versionToken,
      nextStatus: result.status,
      attemptStatus: result.status === "delivered" ? "delivered" : "attempted",
      attemptReason: reason,
      organizationId: input.offer.organizationId,
      dispatchReviewId: input.offer.dispatchReviewId,
      jobRequestId: input.offer.jobRequestId,
      actorUserId: input.actorUserId,
      correlationId: input.correlationId ?? randomUUID(),
      now: input.now
    });
    if (!updated) {
      throw new WorkerOfferError(
        workerOfferDeny(
          "version_conflict",
          "worker_offer_delivery_indeterminate_requires_reconciliation",
          input.offer,
          []
        )
      );
    }
    return toPublicWorkerOffer(
      updated,
      await input.workerOfferRepository.findCurrentTermsVersion(updated.id)
    );
  }
  await input.workerOfferRepository.createDeliveryAttempt({
    workerOfferId: input.offer.id,
    status: attemptStatus,
    providerBoundary: "configured_http_v1",
    reason,
    actorUserId: input.actorUserId,
    now: input.now
  });
  await recordWorkerOfferAudit(input.workerOfferRepository, {
    action: "worker_offer.delivery_failed",
    organizationId: input.offer.organizationId,
    workerOfferId: input.offer.id,
    dispatchReviewId: input.offer.dispatchReviewId,
    jobRequestId: input.offer.jobRequestId,
    actorUserId: input.actorUserId,
    priorState: input.offer.status,
    newState: input.offer.status,
    reason:
      result.status === "failed"
        ? result.retryable
          ? "retryable_provider_failure"
          : "provider_rejected"
        : null,
    correlationId: input.correlationId,
    createdAt: input.now
  });
  return input.offer;
}

const workerDiscoverableOfferStates: readonly WorkerOfferStatus[] = [
  "sent",
  "delivered",
  "viewed",
  "accepted",
  "declined",
  "expired",
  "withdrawn",
  "cancelled"
];

interface WorkerOfferTransitionInput {
  session: SessionValidationResult;
  roles?: readonly AuthorizationRoleKey[];
  workerOfferId: string;
  expectedVersion: number;
  reason?: string;
  correlationId?: string;
}

interface WorkerOfferResponseInput {
  session: SessionValidationResult;
  roles?: readonly AuthorizationRoleKey[];
  workerOfferId: string;
  expectedVersion: number;
  expectedTermsVersionId: string;
  reason?: string | null;
  correlationId?: string;
}

const workerOfferCapacityStates: readonly WorkerOfferStatus[] = [
  "draft",
  "approved",
  "sent",
  "delivered",
  "viewed",
  "accepted"
] as const;

function toPublicWorkerOffer(
  offer: StoredWorkerOffer,
  currentTermsVersion: StoredWorkerOfferTermsVersion | null
): PublicWorkerOffer {
  return {
    ...offer,
    currentTermsVersion,
    versionToken: offer.version
  };
}

function workerOfferDeny(
  status: Exclude<WorkerOfferDecisionStatus, "allow">,
  internalReason: string,
  workerOffer: PublicWorkerOffer | null,
  roles: readonly AuthorizationRoleKey[]
): WorkerOfferDecision {
  return {
    status,
    allow: false,
    workerOffer,
    roles,
    internalReason,
    externalCode: authorizationDeniedCode,
    externalMessage: authorizationDeniedMessage
  };
}

async function authorizeWorkerOfferPlatformOperation(input: {
  workerOfferRepository: WorkerOfferRepository;
  authorizationService: AuthorizationService;
  session: SessionValidationResult;
  roles: readonly AuthorizationRoleKey[];
  permission: AuthorizationPermissionKey;
  workerOffer?: StoredWorkerOffer | null | undefined;
  correlationId?: string | undefined;
  now: Date;
}): Promise<WorkerOfferDecision> {
  const authorizationDecision = await input.authorizationService.decide({
    session: input.session,
    roles: input.roles,
    permission: input.permission,
    platformContext: { platform: true },
    ...(input.correlationId ? { correlationId: input.correlationId } : {})
  });

  const publicOffer = input.workerOffer
    ? toPublicWorkerOffer(
        input.workerOffer,
        await input.workerOfferRepository.findCurrentTermsVersion(input.workerOffer.id)
      )
    : null;

  if (!authorizationDecision.allow) {
    const decision = workerOfferDeny(
      "permission_denied",
      authorizationDecision.internalReason ?? "permission_denied",
      publicOffer,
      input.roles
    );
    await recordWorkerOfferDenial(input.workerOfferRepository, {
      decision,
      actorUserId: input.session.user?.id ?? null,
      correlationId: input.correlationId,
      createdAt: input.now
    });
    return decision;
  }

  return {
    status: "allow",
    allow: true,
    workerOffer: publicOffer,
    roles: input.roles,
    internalReason: null,
    externalCode: null,
    externalMessage: null
  };
}

async function requireAuthorizedWorkerOffer(input: {
  workerOfferRepository: WorkerOfferRepository;
  authorizationService: AuthorizationService;
  session: SessionValidationResult;
  roles: readonly AuthorizationRoleKey[];
  permission: AuthorizationPermissionKey;
  workerOfferId: string;
  correlationId?: string | undefined;
  now: Date;
}) {
  const workerOffer = await input.workerOfferRepository.findWorkerOfferById(input.workerOfferId);
  const decision = await authorizeWorkerOfferPlatformOperation({
    workerOfferRepository: input.workerOfferRepository,
    authorizationService: input.authorizationService,
    session: input.session,
    roles: input.roles,
    permission: input.permission,
    workerOffer,
    correlationId: input.correlationId,
    now: input.now
  });
  if (!decision.allow || !workerOffer) {
    throw new WorkerOfferError(
      decision.allow
        ? workerOfferDeny("not_found", "worker_offer_not_found", null, input.roles)
        : decision
    );
  }

  return {
    stored: workerOffer,
    publicOffer: toPublicWorkerOffer(
      workerOffer,
      await input.workerOfferRepository.findCurrentTermsVersion(workerOffer.id)
    )
  };
}

async function requireWorkerIdentityForSession(
  workerOfferRepository: WorkerOfferRepository,
  session: SessionValidationResult
) {
  if (!session.authenticated || !session.user) {
    throw new WorkerOfferError(workerOfferDeny("permission_denied", "session_invalid", null, []));
  }
  const workerIdentity = await workerOfferRepository.findWorkerIdentityByUserId(session.user.id);
  if (!workerIdentity) {
    throw new WorkerOfferError(workerOfferDeny("not_found", "worker_identity_not_found", null, []));
  }
  if (workerIdentity.status !== "active") {
    throw new WorkerOfferError(
      workerOfferDeny("worker_identity_inactive", "worker_identity_not_active", null, [])
    );
  }
  return workerIdentity;
}

async function requireWorkerOwnedOffer(input: {
  workerOfferRepository: WorkerOfferRepository;
  authorizationService: AuthorizationService;
  session: SessionValidationResult;
  roles: readonly AuthorizationRoleKey[];
  workerIdentity: StoredWorkerIdentity;
  workerOfferId: string;
  correlationId?: string | undefined;
  now: Date;
}) {
  const authorizationDecision = await input.authorizationService.decide({
    session: input.session,
    roles: input.roles,
    permission: "worker_offer.respond",
    ...(input.correlationId ? { correlationId: input.correlationId } : {})
  });
  const workerOffer = await input.workerOfferRepository.findWorkerOfferById(input.workerOfferId);
  const publicOffer = workerOffer
    ? toPublicWorkerOffer(
        workerOffer,
        await input.workerOfferRepository.findCurrentTermsVersion(workerOffer.id)
      )
    : null;
  if (!authorizationDecision.allow || !workerOffer) {
    throw new WorkerOfferError(
      authorizationDecision.allow
        ? workerOfferDeny("not_found", "worker_offer_not_found", null, input.roles)
        : workerOfferDeny(
            "permission_denied",
            authorizationDecision.internalReason ?? "permission_denied",
            publicOffer,
            input.roles
          )
    );
  }
  if (workerOffer.workerIdentityId !== input.workerIdentity.id) {
    const decision = workerOfferDeny(
      "permission_denied",
      "worker_offer_not_owned_by_worker",
      publicOffer,
      input.roles
    );
    await recordWorkerOfferDenial(input.workerOfferRepository, {
      decision,
      actorUserId: input.session.user?.id ?? null,
      correlationId: input.correlationId,
      createdAt: input.now
    });
    throw new WorkerOfferError(decision);
  }

  return { stored: workerOffer, publicOffer: publicOffer! };
}

async function transitionWorkerOffer(
  input: WorkerOfferTransitionInput & {
    workerOfferRepository: WorkerOfferRepository;
    authorizationService: AuthorizationService;
    permission: AuthorizationPermissionKey;
    allowedFrom: readonly WorkerOfferStatus[];
    nextStatus: WorkerOfferStatus;
    action: Parameters<WorkerOfferRepository["recordWorkerOfferAuditEvent"]>[0]["action"];
    approvedAt?: boolean;
    sentAt?: boolean;
    withdrawnAt?: boolean;
    cancelledAt?: boolean;
    now: Date;
  }
) {
  const offer = await requireAuthorizedWorkerOffer({
    workerOfferRepository: input.workerOfferRepository,
    authorizationService: input.authorizationService,
    session: input.session,
    roles: input.roles ?? [],
    permission: input.permission,
    workerOfferId: input.workerOfferId,
    correlationId: input.correlationId,
    now: input.now
  });
  if (!input.allowedFrom.includes(offer.stored.status)) {
    throw new WorkerOfferError(
      workerOfferDeny(
        "invalid_transition",
        `cannot_transition_from_${offer.stored.status}_to_${input.nextStatus}`,
        offer.publicOffer,
        input.roles ?? []
      )
    );
  }
  const reason =
    input.reason === undefined ? null : normalizeRequiredJobRequestText(input.reason, 2, 1000);
  if (input.reason !== undefined && !reason) {
    throw new WorkerOfferError(
      workerOfferDeny(
        "invalid_input",
        "transition_reason_required",
        offer.publicOffer,
        input.roles ?? []
      )
    );
  }
  const updated = await input.workerOfferRepository.updateWorkerOffer({
    workerOfferId: offer.stored.id,
    expectedVersion: input.expectedVersion,
    actorUserId: input.session.user?.id ?? null,
    status: input.nextStatus,
    ...(input.approvedAt ? { approvedAt: input.now } : {}),
    ...(input.sentAt ? { sentAt: input.now } : {}),
    ...(input.withdrawnAt ? { withdrawnAt: input.now } : {}),
    ...(input.cancelledAt ? { cancelledAt: input.now } : {}),
    now: input.now
  });
  if (!updated) {
    throw new WorkerOfferError(
      workerOfferDeny("version_conflict", "stale_version", offer.publicOffer, input.roles ?? [])
    );
  }
  await recordWorkerOfferAudit(input.workerOfferRepository, {
    action: input.action,
    organizationId: updated.organizationId,
    workerOfferId: updated.id,
    dispatchReviewId: updated.dispatchReviewId,
    jobRequestId: updated.jobRequestId,
    actorUserId: input.session.user?.id ?? null,
    priorState: offer.stored.status,
    newState: updated.status,
    reason,
    correlationId: input.correlationId,
    createdAt: input.now
  });
  return toPublicWorkerOffer(
    updated,
    await input.workerOfferRepository.findCurrentTermsVersion(updated.id)
  );
}

async function respondToWorkerOffer(
  input: WorkerOfferResponseInput & {
    workerOfferRepository: WorkerOfferRepository;
    authorizationService: AuthorizationService;
    responseType: WorkerOfferResponseType;
    nextStatus: Extract<WorkerOfferStatus, "accepted" | "declined">;
    action: Parameters<WorkerOfferRepository["recordWorkerOfferAuditEvent"]>[0]["action"];
    now: Date;
  }
) {
  const workerIdentity = await requireWorkerIdentityForSession(
    input.workerOfferRepository,
    input.session
  );
  const offer = await requireWorkerOwnedOffer({
    workerOfferRepository: input.workerOfferRepository,
    authorizationService: input.authorizationService,
    session: input.session,
    roles: input.roles ?? [],
    workerIdentity,
    workerOfferId: input.workerOfferId,
    correlationId: input.correlationId,
    now: input.now
  });
  const terms = offer.publicOffer.currentTermsVersion;
  if (!terms || terms.id !== input.expectedTermsVersionId) {
    await recordRejectedWorkerResponse(input, offer.stored, "stale_terms");
    throw new WorkerOfferError(
      workerOfferDeny("stale_terms", "stale_terms", offer.publicOffer, input.roles ?? [])
    );
  }
  if (!["sent", "delivered", "viewed"].includes(offer.stored.status)) {
    await recordRejectedWorkerResponse(
      input,
      offer.stored,
      `cannot_respond_from_${offer.stored.status}`
    );
    throw new WorkerOfferError(
      workerOfferDeny(
        "invalid_transition",
        `cannot_respond_from_${offer.stored.status}`,
        offer.publicOffer,
        input.roles ?? []
      )
    );
  }
  if (offer.stored.expiresAt <= input.now) {
    const expired = await input.workerOfferRepository.updateWorkerOffer({
      workerOfferId: offer.stored.id,
      expectedVersion: offer.stored.version,
      actorUserId: input.session.user?.id ?? null,
      status: "expired",
      now: input.now
    });
    await recordWorkerOfferAudit(input.workerOfferRepository, {
      action: "worker_offer.expired",
      organizationId: offer.stored.organizationId,
      workerOfferId: offer.stored.id,
      dispatchReviewId: offer.stored.dispatchReviewId,
      jobRequestId: offer.stored.jobRequestId,
      actorUserId: input.session.user?.id ?? null,
      priorState: offer.stored.status,
      newState: expired?.status ?? "expired",
      reason: "server_expiry",
      correlationId: input.correlationId,
      createdAt: input.now
    });
    throw new WorkerOfferError(
      workerOfferDeny("expired", "offer_expired", offer.publicOffer, input.roles ?? [])
    );
  }
  if (await input.workerOfferRepository.findResponseByOfferId(offer.stored.id)) {
    await recordRejectedWorkerResponse(input, offer.stored, "duplicate_response");
    throw new WorkerOfferError(
      workerOfferDeny(
        "duplicate_response",
        "duplicate_response",
        offer.publicOffer,
        input.roles ?? []
      )
    );
  }
  const updated = await input.workerOfferRepository.respondToWorkerOfferAtomically({
    workerOfferId: offer.stored.id,
    workerIdentityId: workerIdentity.id,
    termsVersionId: terms.id,
    responseType: input.responseType,
    reason: normalizeOptionalResidenceText(input.reason ?? null, 1000),
    expectedVersion: input.expectedVersion,
    actorUserId: input.session.user?.id ?? null,
    nextStatus: input.nextStatus,
    now: input.now
  });
  if (!updated) {
    throw new WorkerOfferError(
      workerOfferDeny("version_conflict", "stale_version", offer.publicOffer, input.roles ?? [])
    );
  }
  await recordWorkerOfferAudit(input.workerOfferRepository, {
    action: input.action,
    organizationId: updated.organizationId,
    workerOfferId: updated.id,
    dispatchReviewId: updated.dispatchReviewId,
    jobRequestId: updated.jobRequestId,
    actorUserId: input.session.user?.id ?? null,
    priorState: offer.stored.status,
    newState: updated.status,
    reason: null,
    correlationId: input.correlationId,
    createdAt: input.now
  });
  return toPublicWorkerOffer(
    updated,
    await input.workerOfferRepository.findCurrentTermsVersion(updated.id)
  );
}

async function recordRejectedWorkerResponse(
  input: WorkerOfferResponseInput & {
    workerOfferRepository: WorkerOfferRepository;
    responseType: WorkerOfferResponseType;
    now: Date;
  },
  offer: StoredWorkerOffer,
  reason: string
) {
  await recordWorkerOfferAudit(input.workerOfferRepository, {
    action: "worker_offer.response_rejected",
    organizationId: offer.organizationId,
    workerOfferId: offer.id,
    dispatchReviewId: offer.dispatchReviewId,
    jobRequestId: offer.jobRequestId,
    actorUserId: input.session.user?.id ?? null,
    priorState: offer.status,
    newState: offer.status,
    reason,
    correlationId: input.correlationId,
    createdAt: input.now
  });
}

async function recordWorkerOfferDenial(
  repository: WorkerOfferRepository,
  input: {
    decision: WorkerOfferDecision;
    actorUserId: string | null;
    correlationId?: string | undefined;
    createdAt: Date;
  }
) {
  await recordWorkerOfferAudit(repository, {
    action: "worker_offer.access_denied",
    organizationId: input.decision.workerOffer?.organizationId ?? null,
    workerOfferId: input.decision.workerOffer?.id ?? null,
    dispatchReviewId: input.decision.workerOffer?.dispatchReviewId ?? null,
    jobRequestId: input.decision.workerOffer?.jobRequestId ?? null,
    actorUserId: input.actorUserId,
    priorState: input.decision.workerOffer?.status ?? null,
    newState: "denied",
    reason: input.decision.internalReason,
    correlationId: input.correlationId,
    createdAt: input.createdAt
  });
}

async function recordWorkerOfferAudit(
  repository: WorkerOfferRepository,
  input: Omit<
    Parameters<WorkerOfferRepository["recordWorkerOfferAuditEvent"]>[0],
    "correlationId"
  > & {
    correlationId?: string | undefined;
  }
) {
  await repository.recordWorkerOfferAuditEvent({
    ...input,
    correlationId: input.correlationId ?? createWorkerOfferCorrelationId()
  });
}

function createWorkerOfferCorrelationId() {
  return `worker_offer_${randomBytes(12).toString("base64url")}`;
}

export function createAssignmentService(
  assignmentRepository: AssignmentRepository,
  workerOfferRepository: WorkerOfferRepository,
  dispatchRepository: DispatchRepository,
  jobRequestRepository: JobRequestRepository,
  authorizationService: AuthorizationService,
  options: { now?: () => Date } = {}
) {
  const now = options.now ?? (() => new Date());
  void workerOfferRepository;
  void dispatchRepository;
  void jobRequestRepository;

  return {
    async createFromAcceptedOffer(input: {
      session: SessionValidationResult;
      roles?: readonly AuthorizationRoleKey[];
      workerOfferId: string;
      expectedDispatchReviewId: string;
      expectedOfferVersion: number;
      correlationId?: string;
    }) {
      const currentTime = now();
      const decision = await authorizeAssignmentPlatformOperation({
        assignmentRepository,
        authorizationService,
        session: input.session,
        roles: input.roles ?? [],
        permission: "assignment.create",
        assignment: null,
        correlationId: input.correlationId,
        now: currentTime
      });
      if (!decision.allow) throw new AssignmentError(decision);

      const result = await assignmentRepository.createAssignmentFromAcceptedOfferAtomically({
        workerOfferId: input.workerOfferId,
        expectedDispatchReviewId: input.expectedDispatchReviewId,
        expectedOfferVersion: input.expectedOfferVersion,
        actorUserId: input.session.user?.id ?? "system",
        correlationId: input.correlationId ?? createAssignmentCorrelationId(),
        now: currentTime
      });
      if (!result.ok) {
        throw new AssignmentError(
          assignmentDeny(
            assignmentDecisionStatusForAtomicFailure(result.reason),
            result.reason,
            null,
            input.roles ?? []
          )
        );
      }
      return toPublicAssignment(result.assignment);
    },

    async listAssignments(input: {
      session: SessionValidationResult;
      roles?: readonly AuthorizationRoleKey[];
      dispatchReviewId?: string | null;
      organizationId?: string | null;
      jobRequestId?: string | null;
      statuses?: readonly AssignmentStatus[];
      correlationId?: string;
    }) {
      const decision = await authorizeAssignmentReadOperation({
        assignmentRepository,
        authorizationService,
        session: input.session,
        roles: input.roles ?? [],
        organizationId: input.organizationId ?? null,
        assignment: null,
        correlationId: input.correlationId,
        now: now()
      });
      if (!decision.allow) throw new AssignmentError(decision);

      return (
        await assignmentRepository.listAssignments({
          dispatchReviewId: input.dispatchReviewId ?? undefined,
          organizationId: input.organizationId ?? undefined,
          jobRequestId: input.jobRequestId ?? undefined,
          statuses: input.statuses
        })
      ).map(toPublicAssignment);
    },

    async readAssignment(input: {
      session: SessionValidationResult;
      roles?: readonly AuthorizationRoleKey[];
      assignmentId: string;
      correlationId?: string;
    }) {
      const assignment = await requireAuthorizedAssignment({
        assignmentRepository,
        authorizationService,
        session: input.session,
        roles: input.roles ?? [],
        permission: "assignment.read",
        assignmentId: input.assignmentId,
        correlationId: input.correlationId,
        now: now()
      });
      return assignment.publicAssignment;
    },

    async listWorkerAssignments(input: {
      session: SessionValidationResult;
      roles?: readonly AuthorizationRoleKey[];
      statuses?: readonly AssignmentStatus[];
      correlationId?: string;
    }) {
      const workerIdentity = await requireWorkerIdentityForSession(
        workerOfferRepository,
        input.session
      );
      const authorizationDecision = await authorizationService.decide({
        session: input.session,
        roles: input.roles ?? [],
        permission: "assignment.worker_read",
        ...(input.correlationId ? { correlationId: input.correlationId } : {})
      });
      if (!authorizationDecision.allow) {
        throw new AssignmentError(
          assignmentDeny(
            "permission_denied",
            authorizationDecision.internalReason ?? "permission_denied",
            null,
            input.roles ?? []
          )
        );
      }
      return (
        await assignmentRepository.listAssignments({
          workerIdentityId: workerIdentity.id,
          statuses: input.statuses
        })
      ).map(toPublicAssignment);
    },

    async workerRead(input: {
      session: SessionValidationResult;
      roles?: readonly AuthorizationRoleKey[];
      assignmentId: string;
      correlationId?: string;
    }) {
      const workerIdentity = await requireWorkerIdentityForSession(
        workerOfferRepository,
        input.session
      );
      const assignment = await requireWorkerOwnedAssignment({
        assignmentRepository,
        authorizationService,
        session: input.session,
        roles: input.roles ?? [],
        workerIdentity,
        assignmentId: input.assignmentId,
        permission: "assignment.worker_read",
        correlationId: input.correlationId,
        now: now()
      });
      return assignment.publicAssignment;
    },

    async acknowledge(input: AssignmentTransitionInput) {
      const workerIdentity = await requireWorkerIdentityForSession(
        workerOfferRepository,
        input.session
      );
      const assignment = await requireWorkerOwnedAssignment({
        assignmentRepository,
        authorizationService,
        session: input.session,
        roles: input.roles ?? [],
        workerIdentity,
        assignmentId: input.assignmentId,
        permission: "assignment.worker_acknowledge",
        correlationId: input.correlationId,
        now: now()
      });
      return transitionAssignment({
        ...input,
        assignmentRepository,
        authorizationService,
        assignment: assignment.stored,
        permission: "assignment.worker_acknowledge",
        allowedFrom: ["confirmed", "ready_for_attendance"],
        nextStatus: "worker_acknowledged",
        action: "assignment.worker_acknowledged",
        workerAcknowledgedAt: true,
        platform: false,
        now: now()
      });
    },

    async workerWithdraw(input: AssignmentTransitionInput & { reason: string }) {
      const workerIdentity = await requireWorkerIdentityForSession(
        workerOfferRepository,
        input.session
      );
      const assignment = await requireWorkerOwnedAssignment({
        assignmentRepository,
        authorizationService,
        session: input.session,
        roles: input.roles ?? [],
        workerIdentity,
        assignmentId: input.assignmentId,
        permission: "assignment.worker_withdraw",
        correlationId: input.correlationId,
        now: now()
      });
      return transitionAssignment({
        ...input,
        assignmentRepository,
        authorizationService,
        assignment: assignment.stored,
        permission: "assignment.worker_withdraw",
        allowedFrom: ["confirmed", "worker_acknowledged", "ready_for_attendance"],
        nextStatus: "worker_withdrawn",
        action: "assignment.worker_withdrawn",
        workerWithdrawnAt: true,
        platform: false,
        now: now()
      });
    },

    async markReadyForAttendance(input: AssignmentTransitionInput) {
      return transitionAssignmentById({
        ...input,
        assignmentRepository,
        authorizationService,
        permission: "assignment.attendance_handoff",
        allowedFrom: ["confirmed", "worker_acknowledged"],
        nextStatus: "ready_for_attendance",
        action: "assignment.ready_for_attendance",
        readyForAttendanceAt: true,
        platform: true,
        now: now()
      });
    },

    async startAttendanceWindow(input: AssignmentTransitionInput) {
      return transitionAssignmentById({
        ...input,
        assignmentRepository,
        authorizationService,
        permission: "assignment.attendance_handoff",
        allowedFrom: ["ready_for_attendance"],
        nextStatus: "in_attendance_window",
        action: "assignment.attendance_window_started",
        attendanceWindowStartedAt: true,
        platform: true,
        now: now()
      });
    },

    async attendanceHandoff(input: AssignmentTransitionInput) {
      return transitionAssignmentById({
        ...input,
        assignmentRepository,
        authorizationService,
        permission: "assignment.attendance_handoff",
        allowedFrom: ["ready_for_attendance", "in_attendance_window"],
        nextStatus: "attendance_handoff",
        action: "assignment.attendance_handoff",
        attendanceHandoffAt: true,
        platform: true,
        now: now()
      });
    },

    async cancel(input: AssignmentTransitionInput & { reason: string; status?: AssignmentStatus }) {
      const status = input.status ?? "platform_cancelled";
      if (!["employer_cancelled", "platform_cancelled"].includes(status)) {
        throw new AssignmentError(
          assignmentDeny("invalid_input", "invalid_cancellation_status", null, input.roles ?? [])
        );
      }
      return transitionAssignmentById({
        ...input,
        assignmentRepository,
        authorizationService,
        permission: "assignment.cancel",
        allowedFrom: [
          "confirmed",
          "worker_acknowledged",
          "ready_for_attendance",
          "in_attendance_window"
        ],
        nextStatus: status,
        action:
          status === "employer_cancelled"
            ? "assignment.employer_cancelled"
            : "assignment.platform_cancelled",
        cancelledAt: true,
        cancellationReasonCategory: input.reason,
        platform: true,
        now: now()
      });
    },

    async markReplacementRequired(input: AssignmentTransitionInput & { reason: string }) {
      return transitionAssignmentById({
        ...input,
        assignmentRepository,
        authorizationService,
        permission: "assignment.mark_replacement_required",
        allowedFrom: [
          "confirmed",
          "worker_acknowledged",
          "ready_for_attendance",
          "worker_withdrawn",
          "employer_cancelled",
          "platform_cancelled",
          "expired_before_start"
        ],
        nextStatus: "replacement_required",
        action: "assignment.replacement_required",
        replacementRequiredAt: true,
        cancellationReasonCategory: input.reason,
        platform: true,
        now: now()
      });
    },

    async readAuditSummary(input: {
      session: SessionValidationResult;
      roles?: readonly AuthorizationRoleKey[];
      assignmentId: string;
      correlationId?: string;
    }) {
      const assignment = await requireAuthorizedAssignment({
        assignmentRepository,
        authorizationService,
        session: input.session,
        roles: input.roles ?? [],
        permission: "assignment.audit_read",
        assignmentId: input.assignmentId,
        correlationId: input.correlationId,
        now: now()
      });
      return {
        assignmentId: assignment.stored.id,
        workerOfferId: assignment.stored.workerOfferId,
        jobRequestId: assignment.stored.jobRequestId,
        policyVersion: "assignment-foundation-v1",
        auditAvailable: true,
        message: "Assignment audit is available through governed audit records."
      };
    }
  };
}

export type AssignmentService = ReturnType<typeof createAssignmentService>;

interface AssignmentTransitionInput {
  session: SessionValidationResult;
  roles?: readonly AuthorizationRoleKey[];
  assignmentId: string;
  expectedVersion: number;
  reason?: string;
  correlationId?: string;
}

const activeAssignmentStates: readonly AssignmentStatus[] = [
  "pending_validation",
  "confirmed",
  "worker_acknowledged",
  "ready_for_attendance",
  "in_attendance_window",
  "attendance_handoff"
] as const;

function toPublicAssignment(assignment: StoredAssignment): PublicAssignment {
  return {
    ...assignment,
    versionToken: assignment.version,
    attendanceBoundary:
      assignment.status === "attendance_handoff"
        ? "handoff_completed"
        : assignment.status === "ready_for_attendance" ||
            assignment.status === "in_attendance_window"
          ? "handoff_ready"
          : "not_started"
  };
}

function assignmentDeny(
  status: Exclude<AssignmentDecisionStatus, "allow">,
  internalReason: string,
  assignment: PublicAssignment | null,
  roles: readonly AuthorizationRoleKey[]
): AssignmentDecision {
  return {
    status,
    allow: false,
    assignment,
    roles,
    internalReason,
    externalCode: authorizationDeniedCode,
    externalMessage: authorizationDeniedMessage
  };
}

async function authorizeAssignmentPlatformOperation(input: {
  assignmentRepository: AssignmentRepository;
  authorizationService: AuthorizationService;
  session: SessionValidationResult;
  roles: readonly AuthorizationRoleKey[];
  permission: AuthorizationPermissionKey;
  assignment?: StoredAssignment | null | undefined;
  correlationId?: string | undefined;
  now: Date;
}): Promise<AssignmentDecision> {
  const authorizationDecision = await input.authorizationService.decide({
    session: input.session,
    roles: input.roles,
    permission: input.permission,
    platformContext: { platform: true },
    ...(input.correlationId ? { correlationId: input.correlationId } : {})
  });
  const publicAssignment = input.assignment ? toPublicAssignment(input.assignment) : null;

  if (!authorizationDecision.allow) {
    const decision = assignmentDeny(
      "permission_denied",
      authorizationDecision.internalReason ?? "permission_denied",
      publicAssignment,
      input.roles
    );
    await recordAssignmentDenial(input.assignmentRepository, {
      decision,
      actorUserId: input.session.user?.id ?? null,
      correlationId: input.correlationId,
      createdAt: input.now
    });
    return decision;
  }

  return {
    status: "allow",
    allow: true,
    assignment: publicAssignment,
    roles: input.roles,
    internalReason: null,
    externalCode: null,
    externalMessage: null
  };
}

async function authorizeAssignmentReadOperation(input: {
  assignmentRepository: AssignmentRepository;
  authorizationService: AuthorizationService;
  session: SessionValidationResult;
  roles: readonly AuthorizationRoleKey[];
  organizationId: string | null;
  assignment?: StoredAssignment | null | undefined;
  correlationId?: string | undefined;
  now: Date;
}): Promise<AssignmentDecision> {
  const organizationId = input.assignment?.organizationId ?? input.organizationId;
  const authorizationDecision = await input.authorizationService.decide({
    session: input.session,
    roles: input.roles,
    permission: "assignment.read",
    resourceContext: { organizationId },
    ...(input.correlationId ? { correlationId: input.correlationId } : {})
  });
  const publicAssignment = input.assignment ? toPublicAssignment(input.assignment) : null;

  if (!authorizationDecision.allow) {
    const decision = assignmentDeny(
      "permission_denied",
      authorizationDecision.internalReason ?? "permission_denied",
      publicAssignment,
      input.roles
    );
    await recordAssignmentDenial(input.assignmentRepository, {
      decision,
      actorUserId: input.session.user?.id ?? null,
      correlationId: input.correlationId,
      createdAt: input.now
    });
    return decision;
  }

  return {
    status: "allow",
    allow: true,
    assignment: publicAssignment,
    roles: input.roles,
    internalReason: null,
    externalCode: null,
    externalMessage: null
  };
}

async function requireAuthorizedAssignment(input: {
  assignmentRepository: AssignmentRepository;
  authorizationService: AuthorizationService;
  session: SessionValidationResult;
  roles: readonly AuthorizationRoleKey[];
  permission: AuthorizationPermissionKey;
  assignmentId: string;
  correlationId?: string | undefined;
  now: Date;
}) {
  const assignment = await input.assignmentRepository.findAssignmentById(input.assignmentId);
  const decision =
    input.permission === "assignment.read"
      ? await authorizeAssignmentReadOperation({
          assignmentRepository: input.assignmentRepository,
          authorizationService: input.authorizationService,
          session: input.session,
          roles: input.roles,
          organizationId: assignment?.organizationId ?? null,
          assignment,
          correlationId: input.correlationId,
          now: input.now
        })
      : await authorizeAssignmentPlatformOperation({
          assignmentRepository: input.assignmentRepository,
          authorizationService: input.authorizationService,
          session: input.session,
          roles: input.roles,
          permission: input.permission,
          assignment,
          correlationId: input.correlationId,
          now: input.now
        });

  if (!assignment || !decision.allow) {
    throw new AssignmentError(
      !assignment
        ? assignmentDeny("not_found", "assignment_not_found", null, input.roles)
        : decision
    );
  }

  return { stored: assignment, publicAssignment: toPublicAssignment(assignment) };
}

async function requireWorkerOwnedAssignment(input: {
  assignmentRepository: AssignmentRepository;
  authorizationService: AuthorizationService;
  session: SessionValidationResult;
  roles: readonly AuthorizationRoleKey[];
  workerIdentity: StoredWorkerIdentity;
  assignmentId: string;
  permission: AuthorizationPermissionKey;
  correlationId?: string | undefined;
  now: Date;
}) {
  const authorizationDecision = await input.authorizationService.decide({
    session: input.session,
    roles: input.roles,
    permission: input.permission,
    platformContext: { platform: true },
    ...(input.correlationId ? { correlationId: input.correlationId } : {})
  });
  const assignment = await input.assignmentRepository.findAssignmentById(input.assignmentId);
  const publicAssignment = assignment ? toPublicAssignment(assignment) : null;
  if (!assignment || assignment.workerIdentityId !== input.workerIdentity.id) {
    const decision = assignmentDeny(
      !assignment ? "not_found" : "permission_denied",
      !assignment ? "assignment_not_found" : "assignment_not_owned_by_worker",
      publicAssignment,
      input.roles
    );
    await recordAssignmentDenial(input.assignmentRepository, {
      decision,
      actorUserId: input.session.user?.id ?? null,
      correlationId: input.correlationId,
      createdAt: input.now
    });
    throw new AssignmentError(decision);
  }
  if (!authorizationDecision.allow) {
    const decision = assignmentDeny(
      "permission_denied",
      authorizationDecision.internalReason ?? "permission_denied",
      publicAssignment,
      input.roles
    );
    await recordAssignmentDenial(input.assignmentRepository, {
      decision,
      actorUserId: input.session.user?.id ?? null,
      correlationId: input.correlationId,
      createdAt: input.now
    });
    throw new AssignmentError(decision);
  }
  return { stored: assignment, publicAssignment: toPublicAssignment(assignment) };
}

async function transitionAssignmentById(
  input: AssignmentTransitionInput & {
    assignmentRepository: AssignmentRepository;
    authorizationService: AuthorizationService;
    permission: AuthorizationPermissionKey;
    allowedFrom: readonly AssignmentStatus[];
    nextStatus: AssignmentStatus;
    action: Parameters<AssignmentRepository["recordAssignmentAuditEvent"]>[0]["action"];
    workerAcknowledgedAt?: boolean | undefined;
    readyForAttendanceAt?: boolean | undefined;
    attendanceWindowStartedAt?: boolean | undefined;
    attendanceHandoffAt?: boolean | undefined;
    workerWithdrawnAt?: boolean | undefined;
    cancelledAt?: boolean | undefined;
    replacementRequiredAt?: boolean | undefined;
    closedAt?: boolean | undefined;
    cancellationReasonCategory?: string | null | undefined;
    platform: boolean;
    now: Date;
  }
) {
  const assignment = await requireAuthorizedAssignment({
    assignmentRepository: input.assignmentRepository,
    authorizationService: input.authorizationService,
    session: input.session,
    roles: input.roles ?? [],
    permission: input.permission,
    assignmentId: input.assignmentId,
    correlationId: input.correlationId,
    now: input.now
  });
  return transitionAssignment({ ...input, assignment: assignment.stored });
}

async function transitionAssignment(
  input: AssignmentTransitionInput & {
    assignmentRepository: AssignmentRepository;
    authorizationService: AuthorizationService;
    assignment: StoredAssignment;
    permission: AuthorizationPermissionKey;
    allowedFrom: readonly AssignmentStatus[];
    nextStatus: AssignmentStatus;
    action: Parameters<AssignmentRepository["recordAssignmentAuditEvent"]>[0]["action"];
    workerAcknowledgedAt?: boolean | undefined;
    readyForAttendanceAt?: boolean | undefined;
    attendanceWindowStartedAt?: boolean | undefined;
    attendanceHandoffAt?: boolean | undefined;
    workerWithdrawnAt?: boolean | undefined;
    cancelledAt?: boolean | undefined;
    replacementRequiredAt?: boolean | undefined;
    closedAt?: boolean | undefined;
    cancellationReasonCategory?: string | null | undefined;
    platform: boolean;
    now: Date;
  }
) {
  const assignment = input.assignment;
  if (!input.allowedFrom.includes(assignment.status)) {
    throw new AssignmentError(
      assignmentDeny(
        "invalid_transition",
        `cannot_transition_from_${assignment.status}`,
        toPublicAssignment(assignment),
        input.roles ?? []
      )
    );
  }

  const updated = await input.assignmentRepository.updateAssignment({
    assignmentId: assignment.id,
    expectedVersion: input.expectedVersion,
    actorUserId: input.session.user?.id ?? null,
    status: input.nextStatus,
    workerAcknowledgedAt: input.workerAcknowledgedAt ? input.now : undefined,
    readyForAttendanceAt: input.readyForAttendanceAt ? input.now : undefined,
    attendanceWindowStartedAt: input.attendanceWindowStartedAt ? input.now : undefined,
    attendanceHandoffAt: input.attendanceHandoffAt ? input.now : undefined,
    workerWithdrawnAt: input.workerWithdrawnAt ? input.now : undefined,
    cancelledAt: input.cancelledAt ? input.now : undefined,
    replacementRequiredAt: input.replacementRequiredAt ? input.now : undefined,
    closedAt: input.closedAt ? input.now : undefined,
    cancellationReasonCategory:
      input.cancellationReasonCategory === undefined
        ? undefined
        : normalizeOptionalResidenceText(input.cancellationReasonCategory, 160),
    now: input.now
  });

  if (!updated) {
    await recordAssignmentAudit(input.assignmentRepository, {
      action: "assignment.version_conflict",
      organizationId: assignment.organizationId,
      assignmentId: assignment.id,
      workerOfferId: assignment.workerOfferId,
      jobRequestId: assignment.jobRequestId,
      actorUserId: input.session.user?.id ?? null,
      priorState: assignment.status,
      newState: assignment.status,
      reason: "stale_version",
      correlationId: input.correlationId,
      createdAt: input.now
    });
    throw new AssignmentError(
      assignmentDeny(
        "version_conflict",
        "stale_version",
        toPublicAssignment(assignment),
        input.roles ?? []
      )
    );
  }

  await recordAssignmentAudit(input.assignmentRepository, {
    action: input.action,
    organizationId: updated.organizationId,
    assignmentId: updated.id,
    workerOfferId: updated.workerOfferId,
    jobRequestId: updated.jobRequestId,
    actorUserId: input.session.user?.id ?? null,
    priorState: assignment.status,
    newState: updated.status,
    reason: input.reason ?? null,
    correlationId: input.correlationId,
    createdAt: input.now
  });

  return toPublicAssignment(updated);
}

async function recordAssignmentDenial(
  repository: AssignmentRepository,
  input: {
    decision: AssignmentDecision;
    actorUserId: string | null;
    correlationId?: string | undefined;
    createdAt: Date;
  }
) {
  await recordAssignmentAudit(repository, {
    action: "assignment.access_denied",
    organizationId: input.decision.assignment?.organizationId ?? null,
    assignmentId: input.decision.assignment?.id ?? null,
    workerOfferId: input.decision.assignment?.workerOfferId ?? null,
    jobRequestId: input.decision.assignment?.jobRequestId ?? null,
    actorUserId: input.actorUserId,
    priorState: input.decision.assignment?.status ?? null,
    newState: "denied",
    reason: input.decision.internalReason,
    correlationId: input.correlationId,
    createdAt: input.createdAt
  });
}

async function recordAssignmentAudit(
  repository: AssignmentRepository,
  input: Omit<
    Parameters<AssignmentRepository["recordAssignmentAuditEvent"]>[0],
    "correlationId"
  > & {
    correlationId?: string | undefined;
  }
) {
  await repository.recordAssignmentAuditEvent({
    ...input,
    correlationId: input.correlationId ?? createAssignmentCorrelationId()
  });
}

function createAssignmentCorrelationId() {
  return `assignment_${randomBytes(12).toString("base64url")}`;
}

function assignmentDecisionStatusForAtomicFailure(
  reason: AtomicAssignmentCreateFailure
): Exclude<AssignmentDecisionStatus, "allow"> {
  if (reason === "worker_offer_not_found" || reason === "source_chain_mismatch") {
    return "not_found";
  }
  if (reason === "worker_offer_version_changed") return "version_conflict";
  if (reason === "worker_offer_not_accepted" || reason === "response_not_accepted") {
    return "worker_offer_not_accepted";
  }
  if (reason === "current_terms_unavailable") return "terms_unavailable";
  if (reason === "worker_identity_inactive") return "worker_identity_inactive";
  if (reason === "assignment_exists") return "assignment_exists";
  if (reason === "job_capacity_reached") return "capacity_exceeded";
  if (reason === "worker_schedule_conflict") return "conflict_detected";
  return "invalid_transition";
}

export function createAttendanceService(
  attendanceRepository: AttendanceRepository,
  assignmentRepository: AssignmentRepository,
  workerOfferRepository: WorkerOfferRepository,
  authorizationService: AuthorizationService,
  options: { now?: () => Date } = {}
) {
  const now = options.now ?? (() => new Date());

  return {
    async createFromAssignment(input: {
      session: SessionValidationResult;
      roles?: readonly AuthorizationRoleKey[];
      assignmentId: string;
      verificationMethod?: string | null;
      correlationId?: string;
    }) {
      const currentTime = now();
      const decision = await authorizeAttendancePlatformOperation({
        attendanceRepository,
        authorizationService,
        session: input.session,
        roles: input.roles ?? [],
        permission: "attendance.create",
        attendanceRecord: null,
        correlationId: input.correlationId,
        now: currentTime
      });
      if (!decision.allow) throw new AttendanceError(decision);

      await recordAttendanceAudit(attendanceRepository, {
        action: "attendance.creation_attempted",
        organizationId: null,
        attendanceRecordId: null,
        assignmentId: input.assignmentId,
        actorUserId: input.session.user?.id ?? null,
        priorState: null,
        newState: "pending_start",
        reason: "create_from_assignment",
        correlationId: input.correlationId,
        createdAt: currentTime
      });

      const assignment = await assignmentRepository.findAssignmentById(input.assignmentId);
      if (!assignment) {
        throw new AttendanceError(
          attendanceDeny("not_found", "assignment_not_found", null, input.roles ?? [])
        );
      }
      if (!attendanceReadyAssignmentStates.includes(assignment.status)) {
        await recordAttendanceValidationFailure({
          attendanceRepository,
          assignment,
          session: input.session,
          reason: `assignment_not_ready:${assignment.status}`,
          correlationId: input.correlationId,
          now: currentTime
        });
        throw new AttendanceError(
          attendanceDeny(
            "assignment_not_ready",
            `assignment_not_ready:${assignment.status}`,
            null,
            input.roles ?? []
          )
        );
      }
      if (await attendanceRepository.findAttendanceByAssignmentId(assignment.id)) {
        throw new AttendanceError(
          attendanceDeny("attendance_exists", "attendance_already_exists", null, input.roles ?? [])
        );
      }

      const attendanceRecord = await attendanceRepository.createAttendanceFromAssignment({
        assignment,
        actorUserId: input.session.user?.id ?? "system",
        verificationMethod: normalizeVerificationMethod(input.verificationMethod),
        now: currentTime
      });

      await recordAttendanceAudit(attendanceRepository, {
        action: "attendance.created",
        organizationId: attendanceRecord.organizationId,
        attendanceRecordId: attendanceRecord.id,
        assignmentId: attendanceRecord.assignmentId,
        actorUserId: input.session.user?.id ?? null,
        priorState: null,
        newState: attendanceRecord.status,
        reason: "assignment_validated",
        correlationId: input.correlationId,
        createdAt: currentTime
      });

      return toPublicAttendanceRecord(attendanceRecord);
    },

    async listAttendance(input: {
      session: SessionValidationResult;
      roles?: readonly AuthorizationRoleKey[];
      organizationId?: string | null;
      assignmentId?: string | null;
      statuses?: readonly AttendanceStatus[];
      correlationId?: string;
    }) {
      const decision = await authorizeAttendanceReadOperation({
        attendanceRepository,
        authorizationService,
        session: input.session,
        roles: input.roles ?? [],
        organizationId: input.organizationId ?? null,
        attendanceRecord: null,
        correlationId: input.correlationId,
        now: now()
      });
      if (!decision.allow) throw new AttendanceError(decision);

      return (
        await attendanceRepository.listAttendance({
          organizationId: input.organizationId ?? undefined,
          assignmentId: input.assignmentId ?? undefined,
          statuses: input.statuses
        })
      ).map(toPublicAttendanceRecord);
    },

    async readAttendance(input: {
      session: SessionValidationResult;
      roles?: readonly AuthorizationRoleKey[];
      attendanceRecordId: string;
      correlationId?: string;
    }) {
      const attendance = await requireAuthorizedAttendance({
        attendanceRepository,
        authorizationService,
        session: input.session,
        roles: input.roles ?? [],
        permission: "attendance.read",
        attendanceRecordId: input.attendanceRecordId,
        correlationId: input.correlationId,
        now: now()
      });
      return attendance.publicAttendanceRecord;
    },

    async workerRead(input: {
      session: SessionValidationResult;
      roles?: readonly AuthorizationRoleKey[];
      attendanceRecordId: string;
      correlationId?: string;
    }) {
      const workerIdentity = await requireWorkerIdentityForSession(
        workerOfferRepository,
        input.session
      );
      const attendance = await requireWorkerOwnedAttendance({
        attendanceRepository,
        authorizationService,
        session: input.session,
        roles: input.roles ?? [],
        workerIdentity,
        attendanceRecordId: input.attendanceRecordId,
        permission: "attendance.worker_read",
        correlationId: input.correlationId,
        now: now()
      });
      return attendance.publicAttendanceRecord;
    },

    async workerCheckIn(input: AttendanceEvidenceInput) {
      // Retry only on transient DB write-conflicts (40001/40P01/P2034). Each retry re-fetches
      // the record fresh, so a two-writer race converges deterministically: the loser re-reads
      // the now-committed record and is rejected as a version/state conflict (409). This does
      // NOT alter the exactly-once/version-guard semantics — only how a racing loser is reported.
      return runAtomicAssignmentWithRetry(async () => {
        const currentTime = now();
        const workerIdentity = await requireWorkerIdentityForSession(
          workerOfferRepository,
          input.session
        );
        const attendance = await requireWorkerOwnedAttendance({
          attendanceRepository,
          authorizationService,
          session: input.session,
          roles: input.roles ?? [],
          workerIdentity,
          attendanceRecordId: input.attendanceRecordId,
          permission: "attendance.worker_check_in",
          correlationId: input.correlationId,
          now: currentTime
        });
        return checkInAttendance({
          ...input,
          attendanceRepository,
          attendanceRecord: attendance.stored,
          actorUserId: input.session.user?.id ?? null,
          now: currentTime
        });
      });
    },

    async workerCheckOut(input: AttendanceEvidenceInput) {
      return runAtomicAssignmentWithRetry(async () => {
        const currentTime = now();
        const workerIdentity = await requireWorkerIdentityForSession(
          workerOfferRepository,
          input.session
        );
        const attendance = await requireWorkerOwnedAttendance({
          attendanceRepository,
          authorizationService,
          session: input.session,
          roles: input.roles ?? [],
          workerIdentity,
          attendanceRecordId: input.attendanceRecordId,
          permission: "attendance.worker_check_out",
          correlationId: input.correlationId,
          now: currentTime
        });
        return checkOutAttendance({
          ...input,
          attendanceRepository,
          attendanceRecord: attendance.stored,
          actorUserId: input.session.user?.id ?? null,
          now: currentTime
        });
      });
    },

    async markCompleted(input: AttendanceTransitionInput) {
      return transitionAttendanceById({
        ...input,
        attendanceRepository,
        authorizationService,
        permission: "attendance.override",
        allowedFrom: ["checked_out"],
        nextStatus: "completed",
        action: "attendance.completed",
        completedAt: true,
        now: now()
      });
    },

    async markMissed(input: AttendanceTransitionInput & { reason: string }) {
      return transitionAttendanceById({
        ...input,
        attendanceRepository,
        authorizationService,
        permission: "attendance.override",
        allowedFrom: ["pending_start"],
        nextStatus: "missed",
        action: "attendance.missed",
        exceptionCategory: input.reason,
        now: now()
      });
    },

    async markException(
      input: AttendanceTransitionInput & { reason: string; note?: string | null }
    ) {
      return transitionAttendanceById({
        ...input,
        attendanceRepository,
        authorizationService,
        permission: "attendance.override",
        allowedFrom: ["pending_start", "checked_in", "checked_out"],
        nextStatus: "exception",
        action: "attendance.exception",
        exceptionCategory: input.reason,
        supervisorNote: input.note ?? null,
        now: now()
      });
    },

    async cancel(input: AttendanceTransitionInput & { reason: string }) {
      return transitionAttendanceById({
        ...input,
        attendanceRepository,
        authorizationService,
        permission: "attendance.cancel",
        allowedFrom: ["pending_start", "checked_in", "exception"],
        nextStatus: "cancelled",
        action: "attendance.cancelled",
        cancelledAt: true,
        exceptionCategory: input.reason,
        now: now()
      });
    },

    async readAuditSummary(input: {
      session: SessionValidationResult;
      roles?: readonly AuthorizationRoleKey[];
      attendanceRecordId: string;
      correlationId?: string;
    }) {
      const attendance = await requireAuthorizedAttendance({
        attendanceRepository,
        authorizationService,
        session: input.session,
        roles: input.roles ?? [],
        permission: "attendance.audit_read",
        attendanceRecordId: input.attendanceRecordId,
        correlationId: input.correlationId,
        now: now()
      });
      return {
        attendanceRecordId: attendance.stored.id,
        assignmentId: attendance.stored.assignmentId,
        status: attendance.stored.status,
        message: "Attendance audit is available through governed audit records."
      };
    }
  };
}

export type AttendanceService = ReturnType<typeof createAttendanceService>;

export function createTimesheetService(
  timesheetRepository: TimesheetRepository,
  attendanceRepository: AttendanceRepository,
  assignmentRepository: AssignmentRepository,
  workerOfferRepository: WorkerOfferRepository,
  authorizationService: AuthorizationService,
  options: { now?: () => Date } = {}
) {
  const now = options.now ?? (() => new Date());

  return {
    async createFromAttendance(input: {
      session: SessionValidationResult;
      roles?: readonly AuthorizationRoleKey[];
      attendanceRecordId: string;
      correlationId?: string;
    }) {
      const currentTime = now();
      const decision = await authorizeTimesheetPlatformOperation({
        timesheetRepository,
        authorizationService,
        session: input.session,
        roles: input.roles ?? [],
        permission: "timesheet.create",
        timesheet: null,
        correlationId: input.correlationId,
        now: currentTime
      });
      if (!decision.allow) throw new TimesheetError(decision);

      await recordTimesheetAudit(timesheetRepository, {
        action: "timesheet.creation_attempted",
        organizationId: null,
        timesheetId: null,
        attendanceRecordId: input.attendanceRecordId,
        assignmentId: null,
        actorUserId: input.session.user?.id ?? null,
        priorState: null,
        newState: "draft",
        reason: "create_from_attendance",
        correlationId: input.correlationId,
        createdAt: currentTime
      });

      const attendanceRecord = await attendanceRepository.findAttendanceById(
        input.attendanceRecordId
      );
      if (!attendanceRecord) {
        throw new TimesheetError(
          timesheetDeny("not_found", "attendance_record_not_found", null, input.roles ?? [])
        );
      }
      if (!timesheetReadyAttendanceStatuses.includes(attendanceRecord.status)) {
        await recordTimesheetValidationFailure({
          timesheetRepository,
          attendanceRecord,
          actorUserId: input.session.user?.id ?? null,
          reason: `attendance_not_ready:${attendanceRecord.status}`,
          correlationId: input.correlationId,
          now: currentTime
        });
        throw new TimesheetError(
          timesheetDeny(
            "attendance_not_ready",
            `attendance_not_ready:${attendanceRecord.status}`,
            null,
            input.roles ?? []
          )
        );
      }
      if (!attendanceRecord.checkInAt || !attendanceRecord.checkOutAt) {
        await recordTimesheetValidationFailure({
          timesheetRepository,
          attendanceRecord,
          actorUserId: input.session.user?.id ?? null,
          reason: "attendance_missing_check_in_or_check_out",
          correlationId: input.correlationId,
          now: currentTime
        });
        throw new TimesheetError(
          timesheetDeny(
            "attendance_not_ready",
            "attendance_missing_check_in_or_check_out",
            null,
            input.roles ?? []
          )
        );
      }
      const assignment = await assignmentRepository.findAssignmentById(
        attendanceRecord.assignmentId
      );
      if (!assignment) {
        throw new TimesheetError(
          timesheetDeny("not_found", "assignment_not_found", null, input.roles ?? [])
        );
      }
      if (await timesheetRepository.findTimesheetByAttendanceRecordId(attendanceRecord.id)) {
        throw new TimesheetError(
          timesheetDeny("timesheet_exists", "timesheet_already_exists", null, input.roles ?? [])
        );
      }

      const timesheet = await timesheetRepository.createTimesheetFromAttendance({
        attendanceRecord,
        assignment,
        actorUserId: input.session.user?.id ?? "system",
        now: currentTime
      });
      await recordTimesheetAudit(timesheetRepository, {
        action: "timesheet.created",
        organizationId: timesheet.organizationId,
        timesheetId: timesheet.id,
        attendanceRecordId: timesheet.attendanceRecordId,
        assignmentId: timesheet.assignmentId,
        actorUserId: input.session.user?.id ?? null,
        priorState: null,
        newState: timesheet.status,
        reason: "attendance_validated",
        correlationId: input.correlationId,
        createdAt: currentTime
      });

      return toPublicTimesheet(timesheet);
    },

    async calculate(input: TimesheetTransitionInput) {
      const currentTime = now();
      const timesheet = await requireAuthorizedTimesheet({
        timesheetRepository,
        authorizationService,
        session: input.session,
        roles: input.roles ?? [],
        permission: "timesheet.calculate",
        timesheetId: input.timesheetId,
        correlationId: input.correlationId,
        now: currentTime
      });
      if (
        !["draft", "calculation_pending", "correction_required"].includes(timesheet.stored.status)
      ) {
        throw new TimesheetError(
          timesheetDeny(
            "invalid_transition",
            `cannot_calculate_from_${timesheet.stored.status}`,
            toPublicTimesheet(timesheet.stored),
            input.roles ?? []
          )
        );
      }
      const attendanceRecord = await attendanceRepository.findAttendanceById(
        timesheet.stored.attendanceRecordId
      );
      const assignment = await assignmentRepository.findAssignmentById(
        timesheet.stored.assignmentId
      );
      if (!attendanceRecord || !assignment) {
        throw new TimesheetError(
          timesheetDeny(
            "not_found",
            "timesheet_input_record_not_found",
            timesheet.publicTimesheet,
            input.roles ?? []
          )
        );
      }
      if (attendanceRecord.version !== timesheet.stored.attendanceVersionSnapshot) {
        throw new TimesheetError(
          timesheetDeny(
            "attendance_changed",
            "attendance_version_changed",
            timesheet.publicTimesheet,
            input.roles ?? []
          )
        );
      }
      if (assignment.version !== timesheet.stored.assignmentVersionSnapshot) {
        throw new TimesheetError(
          timesheetDeny(
            "assignment_changed",
            "assignment_version_changed",
            timesheet.publicTimesheet,
            input.roles ?? []
          )
        );
      }
      if (!attendanceRecord.checkInAt || !attendanceRecord.checkOutAt) {
        throw new TimesheetError(
          timesheetDeny(
            "attendance_not_ready",
            "attendance_missing_check_in_or_check_out",
            timesheet.publicTimesheet,
            input.roles ?? []
          )
        );
      }

      await recordTimesheetAudit(timesheetRepository, {
        action: "timesheet.calculation_started",
        organizationId: timesheet.stored.organizationId,
        timesheetId: timesheet.stored.id,
        attendanceRecordId: timesheet.stored.attendanceRecordId,
        assignmentId: timesheet.stored.assignmentId,
        actorUserId: input.session.user?.id ?? null,
        priorState: timesheet.stored.status,
        newState: "calculation_pending",
        reason: "time_only_calculation",
        correlationId: input.correlationId,
        createdAt: currentTime
      });

      const calculation = calculateTimesheetMinutes(attendanceRecord, assignment);
      const nextStatus: TimesheetStatus =
        calculation.exceptionFlags.length > 0 ? "review_required" : "worker_review";
      const updated = await timesheetRepository.updateTimesheet({
        timesheetId: timesheet.stored.id,
        expectedVersion: input.expectedVersion,
        actorUserId: input.session.user?.id ?? null,
        status: nextStatus,
        actualCheckInAt: calculation.rawCheckInAt,
        actualCheckOutAt: calculation.rawCheckOutAt,
        rawElapsedMinutes: calculation.rawElapsedMinutes,
        payableMinutes: calculation.payableMinutes,
        billableMinutes: calculation.billableMinutes,
        excludedMinutes: calculation.excludedMinutes,
        breakMinutes: calculation.breakMinutes,
        premiumCandidateMinutes: calculation.premiumCandidateMinutes,
        overtimeCandidateMinutes: calculation.overtimeCandidateMinutes,
        roundingAdjustmentMinutes: calculation.roundingAdjustmentMinutes,
        exceptionSummary: calculation.exceptionFlags.join(", ") || null,
        now: currentTime
      });
      if (!updated) {
        await recordTimesheetVersionConflict(timesheetRepository, timesheet.stored, {
          actorUserId: input.session.user?.id ?? null,
          correlationId: input.correlationId,
          roles: input.roles ?? [],
          now: currentTime
        });
        throw new TimesheetError(
          timesheetDeny(
            "version_conflict",
            "stale_version",
            timesheet.publicTimesheet,
            input.roles ?? []
          )
        );
      }
      await timesheetRepository.createCalculationSnapshot({
        timesheet: updated,
        attendanceRecord,
        assignment,
        calculation,
        now: currentTime
      });
      await recordTimesheetAudit(timesheetRepository, {
        action: "timesheet.calculation_completed",
        organizationId: updated.organizationId,
        timesheetId: updated.id,
        attendanceRecordId: updated.attendanceRecordId,
        assignmentId: updated.assignmentId,
        actorUserId: input.session.user?.id ?? null,
        priorState: timesheet.stored.status,
        newState: updated.status,
        reason:
          calculation.exceptionFlags.length > 0 ? "exceptions_flagged" : "ready_for_worker_review",
        correlationId: input.correlationId,
        createdAt: currentTime
      });

      return toPublicTimesheet(updated);
    },

    async listTimesheets(input: {
      session: SessionValidationResult;
      roles?: readonly AuthorizationRoleKey[];
      organizationId?: string | null;
      assignmentId?: string | null;
      statuses?: readonly TimesheetStatus[];
      correlationId?: string;
    }) {
      const currentTime = now();
      const decision =
        input.organizationId === null || input.organizationId === undefined
          ? await authorizeTimesheetPlatformOperation({
              timesheetRepository,
              authorizationService,
              session: input.session,
              roles: input.roles ?? [],
              permission: "timesheet.read",
              timesheet: null,
              correlationId: input.correlationId,
              now: currentTime
            })
          : await authorizeTimesheetReadOperation({
              timesheetRepository,
              authorizationService,
              session: input.session,
              roles: input.roles ?? [],
              organizationId: input.organizationId,
              permission: "timesheet.employer_read",
              timesheet: null,
              correlationId: input.correlationId,
              now: currentTime
            });
      if (!decision.allow) throw new TimesheetError(decision);

      return (
        await timesheetRepository.listTimesheets({
          organizationId: input.organizationId ?? undefined,
          assignmentId: input.assignmentId ?? undefined,
          statuses: input.statuses
        })
      ).map(toPublicTimesheet);
    },

    async readTimesheet(input: TimesheetReadInput) {
      const timesheet = await requireAuthorizedTimesheet({
        timesheetRepository,
        authorizationService,
        session: input.session,
        roles: input.roles ?? [],
        permission: "timesheet.read",
        timesheetId: input.timesheetId,
        correlationId: input.correlationId,
        now: now()
      });
      return timesheet.publicTimesheet;
    },

    async workerRead(input: TimesheetReadInput) {
      const workerIdentity = await requireWorkerIdentityForSession(
        workerOfferRepository,
        input.session
      );
      const timesheet = await requireWorkerOwnedTimesheet({
        timesheetRepository,
        authorizationService,
        session: input.session,
        roles: input.roles ?? [],
        workerIdentity,
        timesheetId: input.timesheetId,
        permission: "timesheet.worker_read",
        correlationId: input.correlationId,
        now: now()
      });
      return timesheet.publicTimesheet;
    },

    async workerConfirm(input: TimesheetTransitionInput) {
      const currentTime = now();
      const workerIdentity = await requireWorkerIdentityForSession(
        workerOfferRepository,
        input.session
      );
      const timesheet = await requireWorkerOwnedTimesheet({
        timesheetRepository,
        authorizationService,
        session: input.session,
        roles: input.roles ?? [],
        workerIdentity,
        timesheetId: input.timesheetId,
        permission: "timesheet.worker_confirm",
        correlationId: input.correlationId,
        now: currentTime
      });
      return transitionTimesheet({
        timesheetRepository,
        timesheet: timesheet.stored,
        expectedVersion: input.expectedVersion,
        actorUserId: input.session.user?.id ?? null,
        roles: input.roles ?? [],
        allowedFrom: ["worker_review"],
        nextStatus: "employer_review",
        action: "timesheet.worker_confirmed",
        workerReviewStatus: "confirmed",
        workerReviewedAt: currentTime,
        workerReviewedByUserId: input.session.user?.id ?? null,
        reason: "worker_explicit_confirmation",
        correlationId: input.correlationId,
        now: currentTime
      });
    },

    async workerDispute(input: TimesheetTransitionInput & { reason: string }) {
      const currentTime = now();
      const workerIdentity = await requireWorkerIdentityForSession(
        workerOfferRepository,
        input.session
      );
      const timesheet = await requireWorkerOwnedTimesheet({
        timesheetRepository,
        authorizationService,
        session: input.session,
        roles: input.roles ?? [],
        workerIdentity,
        timesheetId: input.timesheetId,
        permission: "timesheet.worker_dispute",
        correlationId: input.correlationId,
        now: currentTime
      });
      return transitionTimesheet({
        timesheetRepository,
        timesheet: timesheet.stored,
        expectedVersion: input.expectedVersion,
        actorUserId: input.session.user?.id ?? null,
        roles: input.roles ?? [],
        allowedFrom: ["worker_review", "employer_review", "platform_review"],
        nextStatus: "correction_required",
        action: "timesheet.worker_disputed",
        workerReviewStatus: "disputed",
        workerReviewedAt: currentTime,
        workerReviewedByUserId: input.session.user?.id ?? null,
        correctionReason: normalizeOptionalResidenceText(input.reason, 240),
        reason: "worker_dispute",
        correlationId: input.correlationId,
        now: currentTime
      });
    },

    async employerConfirm(input: TimesheetTransitionInput) {
      const currentTime = now();
      const timesheet = await requireEmployerScopedTimesheet({
        timesheetRepository,
        authorizationService,
        session: input.session,
        roles: input.roles ?? [],
        timesheetId: input.timesheetId,
        permission: "timesheet.employer_confirm",
        correlationId: input.correlationId,
        now: currentTime
      });
      return transitionTimesheet({
        timesheetRepository,
        timesheet: timesheet.stored,
        expectedVersion: input.expectedVersion,
        actorUserId: input.session.user?.id ?? null,
        roles: input.roles ?? [],
        allowedFrom: ["employer_review"],
        nextStatus: "platform_review",
        action: "timesheet.employer_confirmed",
        employerReviewStatus: "confirmed",
        employerReviewedAt: currentTime,
        employerReviewedByUserId: input.session.user?.id ?? null,
        reason: "employer_explicit_confirmation",
        correlationId: input.correlationId,
        now: currentTime
      });
    },

    async employerDispute(input: TimesheetTransitionInput & { reason: string }) {
      const currentTime = now();
      const timesheet = await requireEmployerScopedTimesheet({
        timesheetRepository,
        authorizationService,
        session: input.session,
        roles: input.roles ?? [],
        timesheetId: input.timesheetId,
        permission: "timesheet.employer_dispute",
        correlationId: input.correlationId,
        now: currentTime
      });
      return transitionTimesheet({
        timesheetRepository,
        timesheet: timesheet.stored,
        expectedVersion: input.expectedVersion,
        actorUserId: input.session.user?.id ?? null,
        roles: input.roles ?? [],
        allowedFrom: ["employer_review", "platform_review"],
        nextStatus: "correction_required",
        action: "timesheet.employer_disputed",
        employerReviewStatus: "disputed",
        employerReviewedAt: currentTime,
        employerReviewedByUserId: input.session.user?.id ?? null,
        correctionReason: normalizeOptionalResidenceText(input.reason, 240),
        reason: "employer_dispute",
        correlationId: input.correlationId,
        now: currentTime
      });
    },

    async requestCorrection(input: TimesheetTransitionInput & { reason: string }) {
      const currentTime = now();
      const timesheet = await requireAuthorizedTimesheet({
        timesheetRepository,
        authorizationService,
        session: input.session,
        roles: input.roles ?? [],
        permission: "timesheet.request_correction",
        timesheetId: input.timesheetId,
        correlationId: input.correlationId,
        now: currentTime
      });
      return transitionTimesheet({
        timesheetRepository,
        timesheet: timesheet.stored,
        expectedVersion: input.expectedVersion,
        actorUserId: input.session.user?.id ?? null,
        roles: input.roles ?? [],
        allowedFrom: [
          "review_required",
          "worker_review",
          "employer_review",
          "platform_review",
          "approved"
        ],
        nextStatus: "correction_required",
        action: "timesheet.correction_requested",
        correctionReason: normalizeOptionalResidenceText(input.reason, 240),
        reason: "correction_requested",
        correlationId: input.correlationId,
        now: currentTime
      });
    },

    // Governed platform override of review exceptions. ACCEPTS the flagged exceptions and
    // releases the timesheet from review_required back into the normal multi-party review
    // chain (worker -> employer -> platform). It NEVER approves pay unilaterally, NEVER mutates
    // the immutable Attendance record or the calculated minutes, and requires an audited reason.
    async overrideExceptions(input: TimesheetTransitionInput & { reason: string }) {
      const currentTime = now();
      const trimmedReason = typeof input.reason === "string" ? input.reason.trim() : "";
      const timesheet = await requireAuthorizedTimesheet({
        timesheetRepository,
        authorizationService,
        session: input.session,
        roles: input.roles ?? [],
        permission: "timesheet.override_exceptions",
        timesheetId: input.timesheetId,
        correlationId: input.correlationId,
        now: currentTime
      });
      if (!trimmedReason) {
        throw new TimesheetError(
          timesheetDeny(
            "invalid_input",
            "override_reason_required",
            timesheet.publicTimesheet,
            input.roles ?? []
          )
        );
      }
      return transitionTimesheet({
        timesheetRepository,
        timesheet: timesheet.stored,
        expectedVersion: input.expectedVersion,
        actorUserId: input.session.user?.id ?? null,
        roles: input.roles ?? [],
        allowedFrom: ["review_required"],
        nextStatus: "worker_review",
        action: "timesheet.exceptions_overridden",
        correctionReason: normalizeOptionalResidenceText(trimmedReason, 240),
        reason: "exceptions_overridden",
        correlationId: input.correlationId,
        now: currentTime
      });
    },

    async approve(input: TimesheetTransitionInput) {
      const currentTime = now();
      const timesheet = await requireAuthorizedTimesheet({
        timesheetRepository,
        authorizationService,
        session: input.session,
        roles: input.roles ?? [],
        permission: "timesheet.approve",
        timesheetId: input.timesheetId,
        correlationId: input.correlationId,
        now: currentTime
      });
      if (timesheet.stored.workerReviewStatus !== "confirmed") {
        throw new TimesheetError(
          timesheetDeny(
            "worker_review_required",
            "worker_review_required",
            timesheet.publicTimesheet,
            input.roles ?? []
          )
        );
      }
      if (timesheet.stored.employerReviewStatus !== "confirmed") {
        throw new TimesheetError(
          timesheetDeny(
            "employer_review_required",
            "employer_review_required",
            timesheet.publicTimesheet,
            input.roles ?? []
          )
        );
      }
      return transitionTimesheet({
        timesheetRepository,
        timesheet: timesheet.stored,
        expectedVersion: input.expectedVersion,
        actorUserId: input.session.user?.id ?? null,
        roles: input.roles ?? [],
        allowedFrom: ["platform_review"],
        nextStatus: "approved",
        action: "timesheet.approved",
        platformReviewStatus: "approved",
        platformReviewedAt: currentTime,
        platformReviewedByUserId: input.session.user?.id ?? null,
        approvedAt: currentTime,
        reason: "platform_approved",
        correlationId: input.correlationId,
        now: currentTime
      });
    },

    async reject(input: TimesheetTransitionInput & { reason: string }) {
      const currentTime = now();
      const timesheet = await requireAuthorizedTimesheet({
        timesheetRepository,
        authorizationService,
        session: input.session,
        roles: input.roles ?? [],
        permission: "timesheet.reject",
        timesheetId: input.timesheetId,
        correlationId: input.correlationId,
        now: currentTime
      });
      return transitionTimesheet({
        timesheetRepository,
        timesheet: timesheet.stored,
        expectedVersion: input.expectedVersion,
        actorUserId: input.session.user?.id ?? null,
        roles: input.roles ?? [],
        allowedFrom: ["review_required", "worker_review", "employer_review", "platform_review"],
        nextStatus: "rejected",
        action: "timesheet.rejected",
        platformReviewStatus: "rejected",
        platformReviewedAt: currentTime,
        platformReviewedByUserId: input.session.user?.id ?? null,
        rejectedAt: currentTime,
        correctionReason: normalizeOptionalResidenceText(input.reason, 240),
        reason: "platform_rejected",
        correlationId: input.correlationId,
        now: currentTime
      });
    },

    async lock(input: TimesheetTransitionInput) {
      const currentTime = now();
      const timesheet = await requireAuthorizedTimesheet({
        timesheetRepository,
        authorizationService,
        session: input.session,
        roles: input.roles ?? [],
        permission: "timesheet.lock",
        timesheetId: input.timesheetId,
        correlationId: input.correlationId,
        now: currentTime
      });
      return transitionTimesheet({
        timesheetRepository,
        timesheet: timesheet.stored,
        expectedVersion: input.expectedVersion,
        actorUserId: input.session.user?.id ?? null,
        roles: input.roles ?? [],
        allowedFrom: ["approved"],
        nextStatus: "locked",
        action: "timesheet.locked",
        lockedAt: currentTime,
        lockedByUserId: input.session.user?.id ?? null,
        reason: "locked_for_future_payroll_and_finance_handoff",
        correlationId: input.correlationId,
        now: currentTime
      });
    },

    async readAuditSummary(input: TimesheetReadInput) {
      const timesheet = await requireAuthorizedTimesheet({
        timesheetRepository,
        authorizationService,
        session: input.session,
        roles: input.roles ?? [],
        permission: "timesheet.audit_read",
        timesheetId: input.timesheetId,
        correlationId: input.correlationId,
        now: now()
      });
      const snapshots = await timesheetRepository.listCalculationSnapshots(timesheet.stored.id);
      return {
        timesheetId: timesheet.stored.id,
        attendanceRecordId: timesheet.stored.attendanceRecordId,
        assignmentId: timesheet.stored.assignmentId,
        status: timesheet.stored.status,
        calculationSnapshots: snapshots.length,
        message: "Timesheet audit is available through governed audit records."
      };
    }
  };
}

export type TimesheetService = ReturnType<typeof createTimesheetService>;

interface TimesheetReadInput {
  session: SessionValidationResult;
  roles?: readonly AuthorizationRoleKey[];
  timesheetId: string;
  correlationId?: string;
}

interface TimesheetTransitionInput extends TimesheetReadInput {
  expectedVersion: number;
}

interface TimesheetCalculationResult {
  rawCheckInAt: Date;
  rawCheckOutAt: Date;
  normalizedCheckInAt: Date;
  normalizedCheckOutAt: Date;
  rawElapsedMinutes: number;
  payableMinutes: number;
  billableMinutes: number;
  excludedMinutes: number;
  breakMinutes: number;
  premiumCandidateMinutes: number;
  overtimeCandidateMinutes: number;
  roundingAdjustmentMinutes: number;
  exceptionFlags: string[];
  calculationPolicyVersion: string;
  countryPackVersion: string;
  breakRule: string;
  roundingRule: string;
  calculationEngineVersion: string;
}

const timesheetReadyAttendanceStatuses: readonly AttendanceStatus[] = ["completed"];

function toPublicTimesheet(timesheet: StoredTimesheet): PublicTimesheet {
  return {
    ...timesheet,
    versionToken: timesheet.version,
    attendanceBoundary: "preserved",
    payrollBoundary: timesheet.status === "locked" ? "handoff_ready" : "not_started",
    financeBoundary: timesheet.status === "locked" ? "handoff_ready" : "not_started",
    calculationBoundary: "time_only_no_money"
  };
}

function timesheetDeny(
  status: Exclude<TimesheetDecisionStatus, "allow">,
  internalReason: string,
  timesheet: PublicTimesheet | null,
  roles: readonly AuthorizationRoleKey[]
): TimesheetDecision {
  return {
    status,
    allow: false,
    timesheet,
    roles,
    internalReason,
    externalCode: authorizationDeniedCode,
    externalMessage: authorizationDeniedMessage
  };
}

async function authorizeTimesheetPlatformOperation(input: {
  timesheetRepository: TimesheetRepository;
  authorizationService: AuthorizationService;
  session: SessionValidationResult;
  roles: readonly AuthorizationRoleKey[];
  permission: AuthorizationPermissionKey;
  timesheet?: StoredTimesheet | null | undefined;
  correlationId?: string | undefined;
  now: Date;
}): Promise<TimesheetDecision> {
  const authorizationDecision = await input.authorizationService.decide({
    session: input.session,
    roles: input.roles,
    permission: input.permission,
    platformContext: { platform: true },
    ...(input.correlationId ? { correlationId: input.correlationId } : {})
  });
  const publicTimesheet = input.timesheet ? toPublicTimesheet(input.timesheet) : null;

  if (!authorizationDecision.allow) {
    const decision = timesheetDeny(
      "permission_denied",
      authorizationDecision.internalReason ?? "permission_denied",
      publicTimesheet,
      input.roles
    );
    await recordTimesheetDenial(input.timesheetRepository, {
      decision,
      actorUserId: input.session.user?.id ?? null,
      correlationId: input.correlationId,
      createdAt: input.now
    });
    return decision;
  }

  return {
    status: "allow",
    allow: true,
    timesheet: publicTimesheet,
    roles: input.roles,
    internalReason: null,
    externalCode: null,
    externalMessage: null
  };
}

async function authorizeTimesheetReadOperation(input: {
  timesheetRepository: TimesheetRepository;
  authorizationService: AuthorizationService;
  session: SessionValidationResult;
  roles: readonly AuthorizationRoleKey[];
  organizationId: string | null;
  permission: AuthorizationPermissionKey;
  timesheet?: StoredTimesheet | null | undefined;
  correlationId?: string | undefined;
  now: Date;
}): Promise<TimesheetDecision> {
  const authorizationDecision = await input.authorizationService.decide({
    session: input.session,
    roles: input.roles,
    permission: input.permission,
    ...(input.organizationId ? { resourceContext: { organizationId: input.organizationId } } : {}),
    ...(input.correlationId ? { correlationId: input.correlationId } : {})
  });
  const publicTimesheet = input.timesheet ? toPublicTimesheet(input.timesheet) : null;

  if (!authorizationDecision.allow) {
    const decision = timesheetDeny(
      "permission_denied",
      authorizationDecision.internalReason ?? "permission_denied",
      publicTimesheet,
      input.roles
    );
    await recordTimesheetDenial(input.timesheetRepository, {
      decision,
      actorUserId: input.session.user?.id ?? null,
      correlationId: input.correlationId,
      createdAt: input.now
    });
    return decision;
  }

  return {
    status: "allow",
    allow: true,
    timesheet: publicTimesheet,
    roles: input.roles,
    internalReason: null,
    externalCode: null,
    externalMessage: null
  };
}

async function requireAuthorizedTimesheet(input: {
  timesheetRepository: TimesheetRepository;
  authorizationService: AuthorizationService;
  session: SessionValidationResult;
  roles: readonly AuthorizationRoleKey[];
  permission: AuthorizationPermissionKey;
  timesheetId: string;
  correlationId?: string | undefined;
  now: Date;
}) {
  const timesheet = await input.timesheetRepository.findTimesheetById(input.timesheetId);
  const decision =
    input.permission === "timesheet.read"
      ? await authorizeTimesheetPlatformOperation({
          timesheetRepository: input.timesheetRepository,
          authorizationService: input.authorizationService,
          session: input.session,
          roles: input.roles,
          permission: input.permission,
          timesheet,
          correlationId: input.correlationId,
          now: input.now
        })
      : await authorizeTimesheetPlatformOperation({
          timesheetRepository: input.timesheetRepository,
          authorizationService: input.authorizationService,
          session: input.session,
          roles: input.roles,
          permission: input.permission,
          timesheet,
          correlationId: input.correlationId,
          now: input.now
        });

  if (!timesheet || !decision.allow) {
    throw new TimesheetError(
      !timesheet ? timesheetDeny("not_found", "timesheet_not_found", null, input.roles) : decision
    );
  }

  return { stored: timesheet, publicTimesheet: toPublicTimesheet(timesheet) };
}

async function requireWorkerOwnedTimesheet(input: {
  timesheetRepository: TimesheetRepository;
  authorizationService: AuthorizationService;
  session: SessionValidationResult;
  roles: readonly AuthorizationRoleKey[];
  workerIdentity: StoredWorkerIdentity;
  timesheetId: string;
  permission: AuthorizationPermissionKey;
  correlationId?: string | undefined;
  now: Date;
}) {
  const authorizationDecision = await input.authorizationService.decide({
    session: input.session,
    roles: input.roles,
    permission: input.permission,
    ...(input.correlationId ? { correlationId: input.correlationId } : {})
  });
  const timesheet = await input.timesheetRepository.findTimesheetById(input.timesheetId);
  const publicTimesheet = timesheet ? toPublicTimesheet(timesheet) : null;
  if (!timesheet || timesheet.workerIdentityId !== input.workerIdentity.id) {
    const decision = timesheetDeny(
      !timesheet ? "not_found" : "permission_denied",
      !timesheet ? "timesheet_not_found" : "timesheet_not_owned_by_worker",
      publicTimesheet,
      input.roles
    );
    await recordTimesheetDenial(input.timesheetRepository, {
      decision,
      actorUserId: input.session.user?.id ?? null,
      correlationId: input.correlationId,
      createdAt: input.now
    });
    throw new TimesheetError(decision);
  }
  if (!authorizationDecision.allow) {
    const decision = timesheetDeny(
      "permission_denied",
      authorizationDecision.internalReason ?? "permission_denied",
      publicTimesheet,
      input.roles
    );
    await recordTimesheetDenial(input.timesheetRepository, {
      decision,
      actorUserId: input.session.user?.id ?? null,
      correlationId: input.correlationId,
      createdAt: input.now
    });
    throw new TimesheetError(decision);
  }
  return { stored: timesheet, publicTimesheet: toPublicTimesheet(timesheet) };
}

async function requireEmployerScopedTimesheet(input: {
  timesheetRepository: TimesheetRepository;
  authorizationService: AuthorizationService;
  session: SessionValidationResult;
  roles: readonly AuthorizationRoleKey[];
  timesheetId: string;
  permission: AuthorizationPermissionKey;
  correlationId?: string | undefined;
  now: Date;
}) {
  const timesheet = await input.timesheetRepository.findTimesheetById(input.timesheetId);
  if (!timesheet) {
    throw new TimesheetError(timesheetDeny("not_found", "timesheet_not_found", null, input.roles));
  }
  const decision = await authorizeTimesheetReadOperation({
    timesheetRepository: input.timesheetRepository,
    authorizationService: input.authorizationService,
    session: input.session,
    roles: input.roles,
    organizationId: timesheet.organizationId,
    permission: input.permission,
    timesheet,
    correlationId: input.correlationId,
    now: input.now
  });
  if (!decision.allow) throw new TimesheetError(decision);

  return { stored: timesheet, publicTimesheet: toPublicTimesheet(timesheet) };
}

async function transitionTimesheet(input: {
  timesheetRepository: TimesheetRepository;
  timesheet: StoredTimesheet;
  expectedVersion: number;
  actorUserId: string | null;
  roles: readonly AuthorizationRoleKey[];
  allowedFrom: readonly TimesheetStatus[];
  nextStatus: TimesheetStatus;
  action: Parameters<TimesheetRepository["recordTimesheetAuditEvent"]>[0]["action"];
  workerReviewStatus?: string | undefined;
  workerReviewedAt?: Date | null | undefined;
  workerReviewedByUserId?: string | null | undefined;
  employerReviewStatus?: string | undefined;
  employerReviewedAt?: Date | null | undefined;
  employerReviewedByUserId?: string | null | undefined;
  platformReviewStatus?: string | undefined;
  platformReviewedAt?: Date | null | undefined;
  platformReviewedByUserId?: string | null | undefined;
  approvedAt?: Date | null | undefined;
  lockedAt?: Date | null | undefined;
  lockedByUserId?: string | null | undefined;
  rejectedAt?: Date | null | undefined;
  cancelledAt?: Date | null | undefined;
  correctionReason?: string | null | undefined;
  reason: string;
  correlationId?: string | undefined;
  now: Date;
}) {
  if (input.timesheet.status === "locked") {
    throw new TimesheetError(
      timesheetDeny(
        "locked_record",
        "locked_timesheet_requires_formal_correction",
        toPublicTimesheet(input.timesheet),
        input.roles
      )
    );
  }
  if (!input.allowedFrom.includes(input.timesheet.status)) {
    throw new TimesheetError(
      timesheetDeny(
        "invalid_transition",
        `cannot_transition_from_${input.timesheet.status}`,
        toPublicTimesheet(input.timesheet),
        input.roles
      )
    );
  }

  const updated = await input.timesheetRepository.updateTimesheet({
    timesheetId: input.timesheet.id,
    expectedVersion: input.expectedVersion,
    actorUserId: input.actorUserId,
    status: input.nextStatus,
    workerReviewStatus: input.workerReviewStatus,
    workerReviewedAt: input.workerReviewedAt,
    workerReviewedByUserId: input.workerReviewedByUserId,
    employerReviewStatus: input.employerReviewStatus,
    employerReviewedAt: input.employerReviewedAt,
    employerReviewedByUserId: input.employerReviewedByUserId,
    platformReviewStatus: input.platformReviewStatus,
    platformReviewedAt: input.platformReviewedAt,
    platformReviewedByUserId: input.platformReviewedByUserId,
    approvedAt: input.approvedAt,
    lockedAt: input.lockedAt,
    lockedByUserId: input.lockedByUserId,
    rejectedAt: input.rejectedAt,
    cancelledAt: input.cancelledAt,
    correctionReason: input.correctionReason,
    now: input.now
  });
  if (!updated) {
    await recordTimesheetVersionConflict(input.timesheetRepository, input.timesheet, {
      actorUserId: input.actorUserId,
      correlationId: input.correlationId,
      roles: input.roles,
      now: input.now
    });
    throw new TimesheetError(
      timesheetDeny(
        "version_conflict",
        "stale_version",
        toPublicTimesheet(input.timesheet),
        input.roles
      )
    );
  }

  await recordTimesheetAudit(input.timesheetRepository, {
    action: input.action,
    organizationId: updated.organizationId,
    timesheetId: updated.id,
    attendanceRecordId: updated.attendanceRecordId,
    assignmentId: updated.assignmentId,
    actorUserId: input.actorUserId,
    priorState: input.timesheet.status,
    newState: updated.status,
    reason: input.reason,
    correlationId: input.correlationId,
    createdAt: input.now
  });

  return toPublicTimesheet(updated);
}

function calculateTimesheetMinutes(
  attendanceRecord: StoredAttendanceRecord,
  assignment: StoredAssignment
): TimesheetCalculationResult {
  if (!attendanceRecord.checkInAt || !attendanceRecord.checkOutAt) {
    throw new TimesheetError(
      timesheetDeny("attendance_not_ready", "attendance_missing_check_in_or_check_out", null, [])
    );
  }
  const rawElapsedMinutes = Math.max(
    0,
    Math.floor(
      (attendanceRecord.checkOutAt.getTime() - attendanceRecord.checkInAt.getTime()) / 60000
    )
  );
  const exceptionFlags: string[] = [];
  if (attendanceRecord.checkInAt < assignment.confirmedStartAt)
    exceptionFlags.push("early_arrival");
  if (attendanceRecord.checkInAt > assignment.confirmedStartAt) exceptionFlags.push("late_arrival");
  if (attendanceRecord.checkOutAt < assignment.confirmedEndAt)
    exceptionFlags.push("early_departure");
  if (attendanceRecord.checkOutAt > assignment.confirmedEndAt)
    exceptionFlags.push("late_departure");
  if (attendanceRecord.exceptionCategory)
    exceptionFlags.push(`attendance_exception:${attendanceRecord.exceptionCategory}`);

  // Authoritative 6-hour minimum applied to pay AND billing. The employer accepts, and the worker
  // relies on, "any shift shorter than 6 hours is billed as 6 hours; if the worker is dismissed for
  // any reason, the 6-hour minimum is still paid." Every dispatched shift is scheduled for at least
  // this minimum (enforced at request creation), so once attendance has a check-in and check-out the
  // worked time is floored to the minimum for both payable and billable minutes. A true no-show never
  // reaches a completed attendance record, so it is handled by the no-show/missed path, not here.
  const flooredMinutes = Math.max(rawElapsedMinutes, MINIMUM_STAFFING_SHIFT_MINUTES);
  if (flooredMinutes > rawElapsedMinutes) exceptionFlags.push("minimum_shift_floor_applied");

  return {
    rawCheckInAt: attendanceRecord.checkInAt,
    rawCheckOutAt: attendanceRecord.checkOutAt,
    normalizedCheckInAt: attendanceRecord.checkInAt,
    normalizedCheckOutAt: attendanceRecord.checkOutAt,
    rawElapsedMinutes,
    payableMinutes: flooredMinutes,
    billableMinutes: flooredMinutes,
    excludedMinutes: 0,
    breakMinutes: 0,
    premiumCandidateMinutes: 0,
    overtimeCandidateMinutes: 0,
    roundingAdjustmentMinutes: 0,
    exceptionFlags,
    calculationPolicyVersion: "timesheet-foundation-v1",
    countryPackVersion: "not_applied",
    breakRule: "break_evidence_deferred",
    roundingRule: "no_rounding",
    calculationEngineVersion: "timesheet-foundation-v1"
  };
}

async function recordTimesheetValidationFailure(input: {
  timesheetRepository: TimesheetRepository;
  attendanceRecord: StoredAttendanceRecord;
  actorUserId: string | null;
  reason: string;
  correlationId?: string | undefined;
  now: Date;
}) {
  await recordTimesheetAudit(input.timesheetRepository, {
    action: "timesheet.validation_failed",
    organizationId: input.attendanceRecord.organizationId,
    timesheetId: null,
    attendanceRecordId: input.attendanceRecord.id,
    assignmentId: input.attendanceRecord.assignmentId,
    actorUserId: input.actorUserId,
    priorState: input.attendanceRecord.status,
    newState: null,
    reason: input.reason,
    correlationId: input.correlationId,
    createdAt: input.now
  });
}

async function recordTimesheetVersionConflict(
  repository: TimesheetRepository,
  timesheet: StoredTimesheet,
  input: {
    actorUserId: string | null;
    correlationId?: string | undefined;
    roles: readonly AuthorizationRoleKey[];
    now: Date;
  }
) {
  await recordTimesheetAudit(repository, {
    action: "timesheet.version_conflict",
    organizationId: timesheet.organizationId,
    timesheetId: timesheet.id,
    attendanceRecordId: timesheet.attendanceRecordId,
    assignmentId: timesheet.assignmentId,
    actorUserId: input.actorUserId,
    priorState: timesheet.status,
    newState: timesheet.status,
    reason: "stale_version",
    correlationId: input.correlationId,
    createdAt: input.now
  });
}

async function recordTimesheetDenial(
  repository: TimesheetRepository,
  input: {
    decision: TimesheetDecision;
    actorUserId: string | null;
    correlationId?: string | undefined;
    createdAt: Date;
  }
) {
  await recordTimesheetAudit(repository, {
    action: "timesheet.access_denied",
    organizationId: input.decision.timesheet?.organizationId ?? null,
    timesheetId: input.decision.timesheet?.id ?? null,
    attendanceRecordId: input.decision.timesheet?.attendanceRecordId ?? null,
    assignmentId: input.decision.timesheet?.assignmentId ?? null,
    actorUserId: input.actorUserId,
    priorState: input.decision.timesheet?.status ?? null,
    newState: input.decision.status,
    reason: input.decision.internalReason,
    correlationId: input.correlationId,
    createdAt: input.createdAt
  });
}

async function recordTimesheetAudit(
  repository: TimesheetRepository,
  input: Omit<Parameters<TimesheetRepository["recordTimesheetAuditEvent"]>[0], "correlationId"> & {
    correlationId?: string | undefined;
  }
) {
  await repository.recordTimesheetAuditEvent({
    ...input,
    correlationId: input.correlationId ?? createTimesheetCorrelationId()
  });
}

function createTimesheetCorrelationId() {
  return `timesheet_${randomBytes(12).toString("base64url")}`;
}

interface AttendanceEvidenceInput {
  session: SessionValidationResult;
  roles?: readonly AuthorizationRoleKey[];
  attendanceRecordId: string;
  expectedVersion: number;
  method?: string | null;
  evidenceSummary?: string | null;
  locationPolicyResult?: string | null;
  correlationId?: string;
}

interface AttendanceTransitionInput {
  session: SessionValidationResult;
  roles?: readonly AuthorizationRoleKey[];
  attendanceRecordId: string;
  expectedVersion: number;
  reason?: string | null;
  correlationId?: string;
}

const attendanceReadyAssignmentStates: readonly AssignmentStatus[] = [
  "in_attendance_window",
  "attendance_handoff"
];

function toPublicAttendanceRecord(
  attendanceRecord: StoredAttendanceRecord
): PublicAttendanceRecord {
  return {
    ...attendanceRecord,
    versionToken: attendanceRecord.version,
    timesheetBoundary: attendanceRecord.status === "completed" ? "handoff_ready" : "not_started",
    verificationBoundary: "provider_neutral"
  };
}

function attendanceDeny(
  status: Exclude<AttendanceDecisionStatus, "allow">,
  internalReason: string,
  attendanceRecord: PublicAttendanceRecord | null,
  roles: readonly AuthorizationRoleKey[]
): AttendanceDecision {
  return {
    status,
    allow: false,
    attendanceRecord,
    roles,
    internalReason,
    externalCode: authorizationDeniedCode,
    externalMessage: authorizationDeniedMessage
  };
}

async function authorizeAttendancePlatformOperation(input: {
  attendanceRepository: AttendanceRepository;
  authorizationService: AuthorizationService;
  session: SessionValidationResult;
  roles: readonly AuthorizationRoleKey[];
  permission: AuthorizationPermissionKey;
  attendanceRecord?: StoredAttendanceRecord | null | undefined;
  correlationId?: string | undefined;
  now: Date;
}): Promise<AttendanceDecision> {
  const authorizationDecision = await input.authorizationService.decide({
    session: input.session,
    roles: input.roles,
    permission: input.permission,
    platformContext: { platform: true },
    ...(input.correlationId ? { correlationId: input.correlationId } : {})
  });
  const publicAttendance = input.attendanceRecord
    ? toPublicAttendanceRecord(input.attendanceRecord)
    : null;

  if (!authorizationDecision.allow) {
    const decision = attendanceDeny(
      "permission_denied",
      authorizationDecision.internalReason ?? "permission_denied",
      publicAttendance,
      input.roles
    );
    await recordAttendanceDenial(input.attendanceRepository, {
      decision,
      actorUserId: input.session.user?.id ?? null,
      correlationId: input.correlationId,
      createdAt: input.now
    });
    return decision;
  }

  return {
    status: "allow",
    allow: true,
    attendanceRecord: publicAttendance,
    roles: input.roles,
    internalReason: null,
    externalCode: null,
    externalMessage: null
  };
}

async function authorizeAttendanceReadOperation(input: {
  attendanceRepository: AttendanceRepository;
  authorizationService: AuthorizationService;
  session: SessionValidationResult;
  roles: readonly AuthorizationRoleKey[];
  organizationId: string | null;
  attendanceRecord?: StoredAttendanceRecord | null | undefined;
  correlationId?: string | undefined;
  now: Date;
}): Promise<AttendanceDecision> {
  const authorizationDecision = await input.authorizationService.decide({
    session: input.session,
    roles: input.roles,
    permission: "attendance.read",
    ...(input.organizationId ? { resourceContext: { organizationId: input.organizationId } } : {}),
    ...(input.correlationId ? { correlationId: input.correlationId } : {})
  });
  const publicAttendance = input.attendanceRecord
    ? toPublicAttendanceRecord(input.attendanceRecord)
    : null;

  if (!authorizationDecision.allow) {
    const decision = attendanceDeny(
      "permission_denied",
      authorizationDecision.internalReason ?? "permission_denied",
      publicAttendance,
      input.roles
    );
    await recordAttendanceDenial(input.attendanceRepository, {
      decision,
      actorUserId: input.session.user?.id ?? null,
      correlationId: input.correlationId,
      createdAt: input.now
    });
    return decision;
  }

  return {
    status: "allow",
    allow: true,
    attendanceRecord: publicAttendance,
    roles: input.roles,
    internalReason: null,
    externalCode: null,
    externalMessage: null
  };
}

async function requireAuthorizedAttendance(input: {
  attendanceRepository: AttendanceRepository;
  authorizationService: AuthorizationService;
  session: SessionValidationResult;
  roles: readonly AuthorizationRoleKey[];
  permission: AuthorizationPermissionKey;
  attendanceRecordId: string;
  correlationId?: string | undefined;
  now: Date;
}) {
  const attendanceRecord = await input.attendanceRepository.findAttendanceById(
    input.attendanceRecordId
  );
  const decision =
    input.permission === "attendance.read"
      ? await authorizeAttendanceReadOperation({
          attendanceRepository: input.attendanceRepository,
          authorizationService: input.authorizationService,
          session: input.session,
          roles: input.roles,
          organizationId: attendanceRecord?.organizationId ?? null,
          attendanceRecord,
          correlationId: input.correlationId,
          now: input.now
        })
      : await authorizeAttendancePlatformOperation({
          attendanceRepository: input.attendanceRepository,
          authorizationService: input.authorizationService,
          session: input.session,
          roles: input.roles,
          permission: input.permission,
          attendanceRecord,
          correlationId: input.correlationId,
          now: input.now
        });

  if (!attendanceRecord || !decision.allow) {
    throw new AttendanceError(
      !attendanceRecord
        ? attendanceDeny("not_found", "attendance_record_not_found", null, input.roles)
        : decision
    );
  }

  return {
    stored: attendanceRecord,
    publicAttendanceRecord: toPublicAttendanceRecord(attendanceRecord)
  };
}

async function requireWorkerOwnedAttendance(input: {
  attendanceRepository: AttendanceRepository;
  authorizationService: AuthorizationService;
  session: SessionValidationResult;
  roles: readonly AuthorizationRoleKey[];
  workerIdentity: StoredWorkerIdentity;
  attendanceRecordId: string;
  permission: AuthorizationPermissionKey;
  correlationId?: string | undefined;
  now: Date;
}) {
  const authorizationDecision = await input.authorizationService.decide({
    session: input.session,
    roles: input.roles,
    permission: input.permission,
    ...(input.correlationId ? { correlationId: input.correlationId } : {})
  });
  const attendanceRecord = await input.attendanceRepository.findAttendanceById(
    input.attendanceRecordId
  );
  const publicAttendance = attendanceRecord ? toPublicAttendanceRecord(attendanceRecord) : null;
  if (!attendanceRecord || attendanceRecord.workerIdentityId !== input.workerIdentity.id) {
    const decision = attendanceDeny(
      !attendanceRecord ? "not_found" : "permission_denied",
      !attendanceRecord ? "attendance_record_not_found" : "attendance_not_owned_by_worker",
      publicAttendance,
      input.roles
    );
    await recordAttendanceDenial(input.attendanceRepository, {
      decision,
      actorUserId: input.session.user?.id ?? null,
      correlationId: input.correlationId,
      createdAt: input.now
    });
    throw new AttendanceError(decision);
  }
  if (!authorizationDecision.allow) {
    const decision = attendanceDeny(
      "permission_denied",
      authorizationDecision.internalReason ?? "permission_denied",
      publicAttendance,
      input.roles
    );
    await recordAttendanceDenial(input.attendanceRepository, {
      decision,
      actorUserId: input.session.user?.id ?? null,
      correlationId: input.correlationId,
      createdAt: input.now
    });
    throw new AttendanceError(decision);
  }
  return {
    stored: attendanceRecord,
    publicAttendanceRecord: toPublicAttendanceRecord(attendanceRecord)
  };
}

async function checkInAttendance(
  input: AttendanceEvidenceInput & {
    attendanceRepository: AttendanceRepository;
    attendanceRecord: StoredAttendanceRecord;
    actorUserId: string | null;
    now: Date;
  }
) {
  const attendanceRecord = input.attendanceRecord;
  await recordAttendanceAudit(input.attendanceRepository, {
    action: "attendance.check_in_attempted",
    organizationId: attendanceRecord.organizationId,
    attendanceRecordId: attendanceRecord.id,
    assignmentId: attendanceRecord.assignmentId,
    actorUserId: input.actorUserId,
    priorState: attendanceRecord.status,
    newState: "checked_in",
    reason: input.method ?? "provider_neutral",
    correlationId: input.correlationId,
    createdAt: input.now
  });

  if (attendanceRecord.status !== "pending_start") {
    throw new AttendanceError(
      attendanceDeny(
        attendanceRecord.checkInAt ? "duplicate_check_in" : "invalid_transition",
        `cannot_check_in_from_${attendanceRecord.status}`,
        toPublicAttendanceRecord(attendanceRecord),
        input.roles ?? []
      )
    );
  }

  const updated = await input.attendanceRepository.updateAttendance({
    attendanceRecordId: attendanceRecord.id,
    expectedVersion: input.expectedVersion,
    actorUserId: input.actorUserId,
    status: "checked_in",
    checkInAt: input.now,
    checkedInByUserId: input.actorUserId,
    checkInMethod: normalizeVerificationMethod(input.method),
    checkInEvidenceSummary: normalizeOptionalResidenceText(input.evidenceSummary, 240),
    checkInLocationPolicyResult: normalizeLocationPolicyResult(input.locationPolicyResult),
    now: input.now
  });
  if (!updated) {
    await recordAttendanceVersionConflict(input.attendanceRepository, attendanceRecord, input);
    throw new AttendanceError(
      attendanceDeny(
        "version_conflict",
        "stale_version",
        toPublicAttendanceRecord(attendanceRecord),
        input.roles ?? []
      )
    );
  }

  await recordAttendanceAudit(input.attendanceRepository, {
    action: "attendance.checked_in",
    organizationId: updated.organizationId,
    attendanceRecordId: updated.id,
    assignmentId: updated.assignmentId,
    actorUserId: input.actorUserId,
    priorState: attendanceRecord.status,
    newState: updated.status,
    reason: updated.checkInMethod,
    correlationId: input.correlationId,
    createdAt: input.now
  });
  return toPublicAttendanceRecord(updated);
}

async function checkOutAttendance(
  input: AttendanceEvidenceInput & {
    attendanceRepository: AttendanceRepository;
    attendanceRecord: StoredAttendanceRecord;
    actorUserId: string | null;
    now: Date;
  }
) {
  const attendanceRecord = input.attendanceRecord;
  await recordAttendanceAudit(input.attendanceRepository, {
    action: "attendance.check_out_attempted",
    organizationId: attendanceRecord.organizationId,
    attendanceRecordId: attendanceRecord.id,
    assignmentId: attendanceRecord.assignmentId,
    actorUserId: input.actorUserId,
    priorState: attendanceRecord.status,
    newState: "checked_out",
    reason: input.method ?? "provider_neutral",
    correlationId: input.correlationId,
    createdAt: input.now
  });

  if (attendanceRecord.status !== "checked_in") {
    throw new AttendanceError(
      attendanceDeny(
        attendanceRecord.checkOutAt ? "duplicate_check_out" : "invalid_transition",
        `cannot_check_out_from_${attendanceRecord.status}`,
        toPublicAttendanceRecord(attendanceRecord),
        input.roles ?? []
      )
    );
  }
  if (attendanceRecord.checkInAt && input.now < attendanceRecord.checkInAt) {
    throw new AttendanceError(
      attendanceDeny(
        "check_out_before_check_in",
        "check_out_before_check_in",
        toPublicAttendanceRecord(attendanceRecord),
        input.roles ?? []
      )
    );
  }

  const updated = await input.attendanceRepository.updateAttendance({
    attendanceRecordId: attendanceRecord.id,
    expectedVersion: input.expectedVersion,
    actorUserId: input.actorUserId,
    status: "checked_out",
    checkOutAt: input.now,
    checkedOutByUserId: input.actorUserId,
    checkOutMethod: normalizeVerificationMethod(input.method),
    checkOutEvidenceSummary: normalizeOptionalResidenceText(input.evidenceSummary, 240),
    checkOutLocationPolicyResult: normalizeLocationPolicyResult(input.locationPolicyResult),
    now: input.now
  });
  if (!updated) {
    await recordAttendanceVersionConflict(input.attendanceRepository, attendanceRecord, input);
    throw new AttendanceError(
      attendanceDeny(
        "version_conflict",
        "stale_version",
        toPublicAttendanceRecord(attendanceRecord),
        input.roles ?? []
      )
    );
  }

  await recordAttendanceAudit(input.attendanceRepository, {
    action: "attendance.checked_out",
    organizationId: updated.organizationId,
    attendanceRecordId: updated.id,
    assignmentId: updated.assignmentId,
    actorUserId: input.actorUserId,
    priorState: attendanceRecord.status,
    newState: updated.status,
    reason: updated.checkOutMethod,
    correlationId: input.correlationId,
    createdAt: input.now
  });
  return toPublicAttendanceRecord(updated);
}

async function transitionAttendanceById(
  input: AttendanceTransitionInput & {
    attendanceRepository: AttendanceRepository;
    authorizationService: AuthorizationService;
    permission: AuthorizationPermissionKey;
    allowedFrom: readonly AttendanceStatus[];
    nextStatus: AttendanceStatus;
    action: Parameters<AttendanceRepository["recordAttendanceAuditEvent"]>[0]["action"];
    exceptionCategory?: string | null | undefined;
    supervisorNote?: string | null | undefined;
    completedAt?: boolean | undefined;
    cancelledAt?: boolean | undefined;
    now: Date;
  }
) {
  const attendance = await requireAuthorizedAttendance({
    attendanceRepository: input.attendanceRepository,
    authorizationService: input.authorizationService,
    session: input.session,
    roles: input.roles ?? [],
    permission: input.permission,
    attendanceRecordId: input.attendanceRecordId,
    correlationId: input.correlationId,
    now: input.now
  });
  const attendanceRecord = attendance.stored;
  if (!input.allowedFrom.includes(attendanceRecord.status)) {
    throw new AttendanceError(
      attendanceDeny(
        "invalid_transition",
        `cannot_transition_from_${attendanceRecord.status}`,
        toPublicAttendanceRecord(attendanceRecord),
        input.roles ?? []
      )
    );
  }
  const updated = await input.attendanceRepository.updateAttendance({
    attendanceRecordId: attendanceRecord.id,
    expectedVersion: input.expectedVersion,
    actorUserId: input.session.user?.id ?? null,
    status: input.nextStatus,
    exceptionCategory:
      input.exceptionCategory === undefined
        ? undefined
        : normalizeOptionalResidenceText(input.exceptionCategory, 160),
    supervisorNote:
      input.supervisorNote === undefined
        ? undefined
        : normalizeOptionalResidenceText(input.supervisorNote, 240),
    completedAt: input.completedAt ? input.now : undefined,
    cancelledAt: input.cancelledAt ? input.now : undefined,
    cancelledByUserId: input.cancelledAt ? (input.session.user?.id ?? null) : undefined,
    now: input.now
  });
  if (!updated) {
    await recordAttendanceVersionConflict(input.attendanceRepository, attendanceRecord, input);
    throw new AttendanceError(
      attendanceDeny(
        "version_conflict",
        "stale_version",
        toPublicAttendanceRecord(attendanceRecord),
        input.roles ?? []
      )
    );
  }
  await recordAttendanceAudit(input.attendanceRepository, {
    action: input.action,
    organizationId: updated.organizationId,
    attendanceRecordId: updated.id,
    assignmentId: updated.assignmentId,
    actorUserId: input.session.user?.id ?? null,
    priorState: attendanceRecord.status,
    newState: updated.status,
    reason: input.reason ?? input.exceptionCategory ?? null,
    correlationId: input.correlationId,
    createdAt: input.now
  });
  return toPublicAttendanceRecord(updated);
}

async function recordAttendanceValidationFailure(input: {
  attendanceRepository: AttendanceRepository;
  assignment: StoredAssignment;
  session: SessionValidationResult;
  reason: string;
  correlationId?: string | undefined;
  now: Date;
}) {
  await recordAttendanceAudit(input.attendanceRepository, {
    action: "attendance.validation_failed",
    organizationId: input.assignment.organizationId,
    attendanceRecordId: null,
    assignmentId: input.assignment.id,
    actorUserId: input.session.user?.id ?? null,
    priorState: input.assignment.status,
    newState: "blocked",
    reason: input.reason,
    correlationId: input.correlationId,
    createdAt: input.now
  });
}

async function recordAttendanceVersionConflict(
  repository: AttendanceRepository,
  attendanceRecord: StoredAttendanceRecord,
  input: {
    session: SessionValidationResult;
    roles?: readonly AuthorizationRoleKey[];
    correlationId?: string | undefined;
    now: Date;
  }
) {
  await recordAttendanceAudit(repository, {
    action: "attendance.version_conflict",
    organizationId: attendanceRecord.organizationId,
    attendanceRecordId: attendanceRecord.id,
    assignmentId: attendanceRecord.assignmentId,
    actorUserId: input.session.user?.id ?? null,
    priorState: attendanceRecord.status,
    newState: attendanceRecord.status,
    reason: "stale_version",
    correlationId: input.correlationId,
    createdAt: input.now
  });
}

async function recordAttendanceDenial(
  repository: AttendanceRepository,
  input: {
    decision: AttendanceDecision;
    actorUserId: string | null;
    correlationId?: string | undefined;
    createdAt: Date;
  }
) {
  await recordAttendanceAudit(repository, {
    action: "attendance.access_denied",
    organizationId: input.decision.attendanceRecord?.organizationId ?? null,
    attendanceRecordId: input.decision.attendanceRecord?.id ?? null,
    assignmentId: input.decision.attendanceRecord?.assignmentId ?? null,
    actorUserId: input.actorUserId,
    priorState: input.decision.attendanceRecord?.status ?? null,
    newState: "denied",
    reason: input.decision.internalReason,
    correlationId: input.correlationId,
    createdAt: input.createdAt
  });
}

async function recordAttendanceAudit(
  repository: AttendanceRepository,
  input: Omit<
    Parameters<AttendanceRepository["recordAttendanceAuditEvent"]>[0],
    "correlationId"
  > & {
    correlationId?: string | undefined;
  }
) {
  await repository.recordAttendanceAuditEvent({
    ...input,
    correlationId: input.correlationId ?? createAttendanceCorrelationId()
  });
}

function createAttendanceCorrelationId() {
  return `attendance_${randomBytes(12).toString("base64url")}`;
}

function normalizeVerificationMethod(value: string | null | undefined) {
  const normalized = normalizeOptionalResidenceText(value, 64);
  return normalized ?? "none";
}

function normalizeLocationPolicyResult(value: string | null | undefined) {
  return normalizeOptionalResidenceText(value, 120);
}

const nonTerminalDispatchStates: readonly DispatchReviewStatus[] = [
  "draft",
  "active",
  "candidate_review",
  "shortlist_ready",
  "offer_preparation",
  "paused"
] as const satisfies readonly DispatchReviewStatus[];

interface DispatchTransitionInput {
  session: SessionValidationResult;
  roles?: readonly AuthorizationRoleKey[];
  dispatchReviewId: string;
  expectedVersion: number;
  reason?: string;
  correlationId?: string;
}

interface DispatchCandidateShortlistInput {
  session: SessionValidationResult;
  roles?: readonly AuthorizationRoleKey[];
  dispatchReviewId: string;
  candidateSourceReference: string;
  shortlistOrder?: number | null;
  correlationId?: string;
}

function toPublicDispatchReview(dispatchReview: StoredDispatchReview): PublicDispatchReview {
  return {
    ...dispatchReview,
    remainingWorkerCount: Math.max(
      0,
      dispatchReview.requiredWorkerCount - dispatchReview.preparedOfferCount
    ),
    versionToken: dispatchReview.version
  };
}

function toPublicDispatchCandidate(candidate: StoredDispatchCandidate): PublicDispatchCandidate {
  return {
    ...candidate,
    versionToken: candidate.version
  };
}

function toEmployerDispatchStatus(
  jobRequest: StoredJobRequest,
  dispatchReview: StoredDispatchReview | null
): EmployerDispatchStatus {
  if (!dispatchReview) {
    return {
      jobRequestId: jobRequest.id,
      jobRequestNumber: jobRequest.jobRequestNumber,
      dispatchState: "not_started",
      requiredWorkerCount: jobRequest.numberOfWorkers,
      shortlistedCandidateCount: 0,
      preparedOfferCount: 0,
      remainingWorkerCount: jobRequest.numberOfWorkers,
      updatedAt: null
    };
  }

  return {
    jobRequestId: jobRequest.id,
    jobRequestNumber: jobRequest.jobRequestNumber,
    dispatchState: dispatchReview.state,
    requiredWorkerCount: dispatchReview.requiredWorkerCount,
    shortlistedCandidateCount: dispatchReview.shortlistedCandidateCount,
    preparedOfferCount: dispatchReview.preparedOfferCount,
    remainingWorkerCount: Math.max(
      0,
      dispatchReview.requiredWorkerCount - dispatchReview.preparedOfferCount
    ),
    updatedAt: dispatchReview.updatedAt
  };
}

function dispatchDeny(
  status: Exclude<DispatchDecisionStatus, "allow">,
  internalReason: string,
  dispatchReview: PublicDispatchReview | null,
  roles: readonly AuthorizationRoleKey[]
): DispatchDecision {
  return {
    status,
    allow: false,
    dispatchReview,
    roles,
    internalReason,
    externalCode: authorizationDeniedCode,
    externalMessage: authorizationDeniedMessage
  };
}

function isPrismaUniqueConflict(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

async function authorizeDispatchPlatformOperation(input: {
  dispatchRepository: DispatchRepository;
  authorizationService: AuthorizationService;
  session: SessionValidationResult;
  roles: readonly AuthorizationRoleKey[];
  permission: AuthorizationPermissionKey;
  dispatchReview?: StoredDispatchReview | null | undefined;
  correlationId?: string | undefined;
  now: Date;
}): Promise<DispatchDecision> {
  const authorizationDecision = await input.authorizationService.decide({
    session: input.session,
    roles: input.roles,
    permission: input.permission,
    platformContext: { platform: true },
    ...(input.correlationId ? { correlationId: input.correlationId } : {})
  });

  if (!authorizationDecision.allow) {
    const decision = dispatchDeny(
      "permission_denied",
      authorizationDecision.internalReason ?? "permission_denied",
      input.dispatchReview ? toPublicDispatchReview(input.dispatchReview) : null,
      input.roles
    );
    await recordDispatchDenial(input.dispatchRepository, {
      decision,
      actorUserId: input.session.user?.id ?? null,
      correlationId: input.correlationId,
      createdAt: input.now
    });
    return decision;
  }

  return {
    status: "allow",
    allow: true,
    dispatchReview: input.dispatchReview ? toPublicDispatchReview(input.dispatchReview) : null,
    roles: input.roles,
    internalReason: null,
    externalCode: null,
    externalMessage: null
  };
}

async function requireAuthorizedDispatch(input: {
  dispatchRepository: DispatchRepository;
  authorizationService: AuthorizationService;
  session: SessionValidationResult;
  roles: readonly AuthorizationRoleKey[];
  permission: AuthorizationPermissionKey;
  dispatchReviewId: string;
  correlationId?: string | undefined;
  now: Date;
}) {
  const dispatchReview = await input.dispatchRepository.findDispatchReviewById(
    input.dispatchReviewId
  );
  const decision = await authorizeDispatchPlatformOperation({
    dispatchRepository: input.dispatchRepository,
    authorizationService: input.authorizationService,
    session: input.session,
    roles: input.roles,
    permission: input.permission,
    dispatchReview,
    correlationId: input.correlationId,
    now: input.now
  });
  if (!decision.allow || !dispatchReview) {
    throw new DispatchError(
      decision.allow ? dispatchDeny("not_found", "dispatch_not_found", null, input.roles) : decision
    );
  }

  return {
    stored: dispatchReview,
    publicDispatch: toPublicDispatchReview(dispatchReview)
  };
}

async function updateDispatchBoundary(input: {
  dispatchRepository: DispatchRepository;
  authorizationService: AuthorizationService;
  session: SessionValidationResult;
  roles: readonly AuthorizationRoleKey[];
  permission: AuthorizationPermissionKey;
  dispatchReviewId: string;
  expectedVersion: number;
  transition: string;
  data: Partial<Parameters<DispatchRepository["updateDispatchReview"]>[0]>;
  action: Parameters<DispatchRepository["recordDispatchAuditEvent"]>[0]["action"];
  reason: string | null;
  correlationId?: string | undefined;
  now: Date;
}) {
  const dispatch = await requireAuthorizedDispatch({
    dispatchRepository: input.dispatchRepository,
    authorizationService: input.authorizationService,
    session: input.session,
    roles: input.roles,
    permission: input.permission,
    dispatchReviewId: input.dispatchReviewId,
    correlationId: input.correlationId,
    now: input.now
  });
  if (!nonTerminalDispatchStates.includes(dispatch.stored.state)) {
    throw new DispatchError(
      dispatchDeny(
        "invalid_transition",
        `cannot_${input.transition}_from_${dispatch.stored.state}`,
        dispatch.publicDispatch,
        input.roles
      )
    );
  }
  const updated = await input.dispatchRepository.updateDispatchReview({
    dispatchReviewId: dispatch.stored.id,
    expectedVersion: input.expectedVersion,
    actorUserId: input.session.user?.id ?? "system",
    ...input.data,
    now: input.now
  });
  if (!updated) {
    throw new DispatchError(
      dispatchDeny("version_conflict", "stale_version", dispatch.publicDispatch, input.roles)
    );
  }
  await recordDispatchAudit(input.dispatchRepository, {
    action: input.action,
    organizationId: updated.organizationId,
    dispatchReviewId: updated.id,
    jobRequestId: updated.jobRequestId,
    actorUserId: input.session.user?.id ?? null,
    priorState: dispatch.stored.state,
    newState: updated.state,
    reason: input.reason,
    correlationId: input.correlationId,
    createdAt: input.now
  });
  return toPublicDispatchReview(updated);
}

async function transitionDispatchReview(
  input: DispatchTransitionInput & {
    dispatchRepository: DispatchRepository;
    authorizationService: AuthorizationService;
    permission: AuthorizationPermissionKey;
    allowedFrom: readonly DispatchReviewStatus[];
    nextState: DispatchReviewStatus;
    action: Parameters<DispatchRepository["recordDispatchAuditEvent"]>[0]["action"];
    startedAt?: boolean;
    pausedAt?: boolean;
    cancelledAt?: boolean;
    closedAt?: boolean;
    prepareOfferBoundary?: boolean;
    now: Date;
  }
) {
  const dispatch = await requireAuthorizedDispatch({
    dispatchRepository: input.dispatchRepository,
    authorizationService: input.authorizationService,
    session: input.session,
    roles: input.roles ?? [],
    permission: input.permission,
    dispatchReviewId: input.dispatchReviewId,
    correlationId: input.correlationId,
    now: input.now
  });
  if (!input.allowedFrom.includes(dispatch.stored.state)) {
    throw new DispatchError(
      dispatchDeny(
        "invalid_transition",
        `cannot_transition_from_${dispatch.stored.state}_to_${input.nextState}`,
        dispatch.publicDispatch,
        input.roles ?? []
      )
    );
  }
  const reason =
    input.reason === undefined ? null : normalizeRequiredJobRequestText(input.reason, 2, 1000);
  if (input.reason !== undefined && !reason) {
    throw new DispatchError(
      dispatchDeny(
        "invalid_input",
        "transition_reason_required",
        dispatch.publicDispatch,
        input.roles ?? []
      )
    );
  }
  const updated = await input.dispatchRepository.updateDispatchReview({
    dispatchReviewId: dispatch.stored.id,
    expectedVersion: input.expectedVersion,
    actorUserId: input.session.user?.id ?? "system",
    state: input.nextState,
    ...(input.startedAt && !dispatch.stored.startedAt ? { startedAt: input.now } : {}),
    ...(input.pausedAt ? { pausedAt: input.now } : {}),
    ...(input.cancelledAt ? { cancelledAt: input.now } : {}),
    ...(input.closedAt ? { closedAt: input.now } : {}),
    ...(input.prepareOfferBoundary
      ? {
          preparedOfferCount: Math.min(
            dispatch.stored.requiredWorkerCount,
            dispatch.stored.shortlistedCandidateCount
          )
        }
      : {}),
    now: input.now
  });
  if (!updated) {
    throw new DispatchError(
      dispatchDeny("version_conflict", "stale_version", dispatch.publicDispatch, input.roles ?? [])
    );
  }
  await recordDispatchAudit(input.dispatchRepository, {
    action: input.action,
    organizationId: updated.organizationId,
    dispatchReviewId: updated.id,
    jobRequestId: updated.jobRequestId,
    actorUserId: input.session.user?.id ?? null,
    priorState: dispatch.stored.state,
    newState: updated.state,
    reason,
    correlationId: input.correlationId,
    createdAt: input.now
  });
  return toPublicDispatchReview(updated);
}

async function updateCandidateShortlistBoundary(
  input: DispatchCandidateShortlistInput & {
    dispatchRepository: DispatchRepository;
    authorizationService: AuthorizationService;
    shortlistState: Extract<DispatchShortlistState, "shortlisted" | "removed">;
    action: Parameters<DispatchRepository["recordDispatchAuditEvent"]>[0]["action"];
    now: Date;
  }
) {
  const dispatch = await requireAuthorizedDispatch({
    dispatchRepository: input.dispatchRepository,
    authorizationService: input.authorizationService,
    session: input.session,
    roles: input.roles ?? [],
    permission: "dispatch.manage_shortlist",
    dispatchReviewId: input.dispatchReviewId,
    correlationId: input.correlationId,
    now: input.now
  });
  if (!["active", "candidate_review", "shortlist_ready"].includes(dispatch.stored.state)) {
    throw new DispatchError(
      dispatchDeny(
        "invalid_transition",
        `cannot_manage_shortlist_from_${dispatch.stored.state}`,
        dispatch.publicDispatch,
        input.roles ?? []
      )
    );
  }
  const shortlistOrder =
    input.shortlistState === "shortlisted"
      ? (input.shortlistOrder ?? dispatch.stored.shortlistedCandidateCount + 1)
      : null;
  const candidate = await input.dispatchRepository.updateCandidateShortlist({
    dispatchReviewId: dispatch.stored.id,
    candidateSourceReference: input.candidateSourceReference,
    shortlistState: input.shortlistState,
    shortlistOrder,
    actorUserId: input.session.user?.id ?? "system",
    now: input.now
  });
  if (!candidate) {
    throw new DispatchError(
      dispatchDeny("not_found", "candidate_not_found", dispatch.publicDispatch, input.roles ?? [])
    );
  }
  const candidates = await input.dispatchRepository.listCandidates(dispatch.stored.id);
  const shortlistedCandidateCount = candidates.filter(
    (item) => item.shortlistState === "shortlisted"
  ).length;
  await input.dispatchRepository.updateDispatchReview({
    dispatchReviewId: dispatch.stored.id,
    expectedVersion: dispatch.stored.version,
    actorUserId: input.session.user?.id ?? "system",
    shortlistedCandidateCount,
    now: input.now
  });
  await recordDispatchAudit(input.dispatchRepository, {
    action: input.action,
    organizationId: dispatch.stored.organizationId,
    dispatchReviewId: dispatch.stored.id,
    jobRequestId: dispatch.stored.jobRequestId,
    actorUserId: input.session.user?.id ?? null,
    priorState: dispatch.stored.state,
    newState: dispatch.stored.state,
    reason: candidate.candidateSourceReference,
    correlationId: input.correlationId,
    createdAt: input.now
  });
  return toPublicDispatchCandidate(candidate);
}

function stripPublicCandidateForUpsert(
  candidate: PublicDispatchCandidate
): Parameters<DispatchRepository["upsertCandidate"]>[0]["candidate"] {
  return {
    workerIdentityId: candidate.workerIdentityId,
    candidateSourceType: candidate.candidateSourceType,
    candidateSourceReference: candidate.candidateSourceReference,
    approvedDisplayName: candidate.approvedDisplayName,
    workGroupMatch: candidate.workGroupMatch,
    roleDefinitionMatch: candidate.roleDefinitionMatch,
    qualificationSummaryState: candidate.qualificationSummaryState,
    verificationSummaryState: candidate.verificationSummaryState,
    availabilityState: candidate.availabilityState,
    scheduleConflictState: candidate.scheduleConflictState,
    serviceAreaState: candidate.serviceAreaState,
    travelSuitabilityState: candidate.travelSuitabilityState,
    transportConstraintState: candidate.transportConstraintState,
    recommendationState: candidate.recommendationState,
    sourceFreshnessAt: candidate.sourceFreshnessAt,
    lastEvaluatedAt: candidate.lastEvaluatedAt,
    evaluationVersion: candidate.evaluationVersion
  };
}

function urgencyToDispatchPriority(urgency: JobRequestUrgency): DispatchPriority {
  if (urgency === "immediate") return "emergency";
  if (urgency === "urgent") return "urgent";
  return "normal";
}

async function recordDispatchDenial(
  repository: DispatchRepository,
  input: {
    decision: DispatchDecision;
    actorUserId: string | null;
    correlationId?: string | undefined;
    createdAt: Date;
  }
) {
  await recordDispatchAudit(repository, {
    action: "dispatch.access_denied",
    organizationId: input.decision.dispatchReview?.organizationId ?? null,
    dispatchReviewId: input.decision.dispatchReview?.id ?? null,
    jobRequestId: input.decision.dispatchReview?.jobRequestId ?? null,
    actorUserId: input.actorUserId,
    priorState: input.decision.dispatchReview?.state ?? null,
    newState: "denied",
    reason: input.decision.internalReason,
    correlationId: input.correlationId,
    createdAt: input.createdAt
  });
}

async function recordDispatchAudit(
  repository: DispatchRepository,
  input: Omit<Parameters<DispatchRepository["recordDispatchAuditEvent"]>[0], "correlationId"> & {
    correlationId?: string | undefined;
  }
) {
  await repository.recordDispatchAuditEvent({
    ...input,
    correlationId: input.correlationId ?? createDispatchCorrelationId()
  });
}

function createDispatchCorrelationId() {
  return `dispatch_${randomBytes(12).toString("base64url")}`;
}

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
  "email_verification_pending" | "active" | "restricted" | "disabled" | "closed";

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
  emailVerifiedAt?: Date | null;
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
  phone?: string | null;
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

export interface StoredEmailVerificationCode {
  id: string;
  userId: string;
  codeHash: string;
  attempts: number;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
}

export interface CreateEmailVerificationCodeInput {
  userId: string;
  codeHash: string;
  expiresAt: Date;
  now: Date;
}

export interface UpdateEmailVerificationCodeInput {
  verificationId: string;
  expectedAttempts: number;
  now: Date;
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

export interface CreateOAuthUserInput {
  publicId: string;
  emailNormalized: string;
  displayName: string | null;
  provider: AuthenticationIdentityProvider;
  providerSubject: string;
  emailVerifiedAt: Date | null;
  now: Date;
}

export interface LinkOAuthIdentityInput {
  userId: string;
  provider: AuthenticationIdentityProvider;
  providerSubject: string;
  emailVerifiedAt: Date | null;
  now: Date;
}

export interface UpsertGoogleOAuthTokenInput {
  userId: string;
  googleSub: string;
  // Null leaves any existing refresh token untouched (Google only returns it on first consent).
  refreshTokenEncrypted: string | null;
  scope: string;
  calendarSyncEnabled: boolean;
  now: Date;
}

export interface GoogleProfile {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
}

export interface AuthenticationRepository {
  findUserByEmailNormalized(emailNormalized: string): Promise<StoredAuthenticationUser | null>;
  createLocalUser(input: CreateLocalUserInput): Promise<StoredAuthenticationUser>;
  // OAuth (Google) support. Optional so existing in-memory test repositories keep compiling; the
  // service throws a clear error if signInWithGoogle is called against a repository without them.
  findUserByOAuthSubject?(
    provider: AuthenticationIdentityProvider,
    providerSubject: string
  ): Promise<StoredAuthenticationUser | null>;
  createOAuthUser?(input: CreateOAuthUserInput): Promise<StoredAuthenticationUser>;
  linkOAuthIdentity?(input: LinkOAuthIdentityInput): Promise<void>;
  upsertGoogleOAuthToken?(input: UpsertGoogleOAuthTokenInput): Promise<void>;
  createSession(input: CreateSessionInput): Promise<StoredAuthenticationSession>;
  findSessionByHash(sessionHash: string): Promise<StoredAuthenticationSession | null>;
  updateSession(input: UpdateSessionInput): Promise<StoredAuthenticationSession | null>;
  createEmailVerificationCode(
    input: CreateEmailVerificationCodeInput
  ): Promise<StoredEmailVerificationCode>;
  findActiveEmailVerificationCode(userId: string): Promise<StoredEmailVerificationCode | null>;
  incrementEmailVerificationAttempts(
    input: UpdateEmailVerificationCodeInput
  ): Promise<StoredEmailVerificationCode | null>;
  consumeEmailVerificationCode(
    input: UpdateEmailVerificationCodeInput
  ): Promise<StoredEmailVerificationCode | null>;
  markEmailVerified(input: { userId: string; now: Date }): Promise<StoredAuthenticationUser | null>;
  recordAuthenticationAuditEvent(input: RecordAuthenticationAuditEventInput): Promise<void>;
}

export interface PublicAuthenticationUser {
  id: string;
  publicId: string;
  emailNormalized: string;
  displayName: string | null;
  status: AuthenticationUserStatus;
  emailVerified?: boolean;
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
  return (
    password.length >= 12 &&
    password.length <= 256 &&
    /[A-Za-z]/.test(password) &&
    /\d/.test(password)
  );
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
      phone?: string | null;
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
        phone: input.phone ?? null,
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

      const session = await createSessionForUser(
        repository,
        user,
        randomToken,
        sessionTtlSeconds,
        currentTime,
        input
      );

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
      const identity = user?.identities.find(
        (candidate) => candidate.provider === "local_password"
      );
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

      const session = await createSessionForUser(
        repository,
        user,
        randomToken,
        sessionTtlSeconds,
        currentTime,
        input
      );
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

    // Google OAuth sign-in: provisions (or links) a user for an already-verified Google profile and
    // issues a session exactly as password sign-in does. The caller (API) has already exchanged the
    // authorization code with Google and fetched the verified profile — the client is never trusted.
    async signInWithGoogle(input: {
      profile: GoogleProfile;
      refreshTokenEncrypted: string | null;
      scope: string;
      calendarSyncEnabled: boolean;
      source?: AuthenticationAuditSource;
      correlationId?: string;
      ipAddress?: string | null;
      userAgent?: string | null;
    }): Promise<SignInResult> {
      if (
        !repository.findUserByOAuthSubject ||
        !repository.createOAuthUser ||
        !repository.linkOAuthIdentity ||
        !repository.upsertGoogleOAuthToken
      ) {
        throw new AuthenticationError();
      }
      const provider: AuthenticationIdentityProvider = "future_oauth";
      const providerSubject = `google:${input.profile.sub}`;
      const emailNormalized = normalizeEmail(input.profile.email);
      const currentTime = now();

      let user = await repository.findUserByOAuthSubject(provider, providerSubject);
      if (!user) {
        const existingByEmail = await repository.findUserByEmailNormalized(emailNormalized);
        if (existingByEmail) {
          await repository.linkOAuthIdentity({
            userId: existingByEmail.id,
            provider,
            providerSubject,
            emailVerifiedAt: input.profile.emailVerified ? currentTime : null,
            now: currentTime
          });
          user = await repository.findUserByEmailNormalized(emailNormalized);
        } else {
          user = await repository.createOAuthUser({
            publicId: createPublicUserId(),
            emailNormalized,
            displayName: input.profile.name,
            provider,
            providerSubject,
            emailVerifiedAt: input.profile.emailVerified ? currentTime : null,
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
            reason: "oauth_google",
            source: input.source ?? "api",
            correlationId: input.correlationId,
            createdAt: currentTime
          });
        }
      }

      if (!user) {
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

      await repository.upsertGoogleOAuthToken({
        userId: user.id,
        googleSub: input.profile.sub,
        refreshTokenEncrypted: input.refreshTokenEncrypted,
        scope: input.scope,
        calendarSyncEnabled: input.calendarSyncEnabled,
        now: currentTime
      });

      const session = await createSessionForUser(
        repository,
        user,
        randomToken,
        sessionTtlSeconds,
        currentTime,
        input
      );
      await recordAuthenticationAudit(repository, {
        action: "auth.login_success",
        actorType: "user",
        userId: user.id,
        entityId: user.id,
        entityPublicReference: user.publicId,
        priorState: null,
        newState: "session_active",
        reason: "oauth_google",
        source: input.source ?? "api",
        correlationId: input.correlationId,
        createdAt: currentTime
      });

      return {
        user: toPublicUser(user),
        ...session
      };
    },

    // Staff phone sign-in: the API has already checked the texted code and the staff grant, so this
    // only issues the session, exactly as password sign-in does.
    async signInWithVerifiedStaffPhone(input: {
      emailNormalized: string;
      source?: AuthenticationAuditSource;
      correlationId?: string;
      ipAddress?: string | null;
      userAgent?: string | null;
    }): Promise<SignInResult> {
      const currentTime = now();
      const user = await repository.findUserByEmailNormalized(input.emailNormalized);
      if (!user || user.status !== "active") throw new AuthenticationError();
      const session = await createSessionForUser(repository, user, randomToken, sessionTtlSeconds, currentTime, input);
      await recordAuthenticationAudit(repository, {
        action: "auth.login_success",
        actorType: "user",
        userId: user.id,
        entityId: user.id,
        entityPublicReference: user.publicId,
        priorState: null,
        newState: "session_active",
        reason: "staff_phone_code",
        source: input.source ?? "api",
        correlationId: input.correlationId,
        createdAt: currentTime
      });
      return { user: toPublicUser(user), ...session };
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

type PrismaEmailVerificationCodeClient = {
  updateMany(args: {
    where: {
      id?: string;
      userId?: string;
      attempts?: number;
      consumedAt: null;
    };
    data: {
      attempts?: { increment: 1 };
      consumedAt?: Date;
    };
  }): Promise<{ count: number }>;
  create(args: {
    data: {
      userId: string;
      codeHash: string;
      expiresAt: Date;
      createdAt: Date;
    };
  }): Promise<StoredEmailVerificationCode>;
  findFirst(args: {
    where: { userId: string; consumedAt: null };
    orderBy: { createdAt: "desc" };
  }): Promise<StoredEmailVerificationCode | null>;
  findUnique(args: { where: { id: string } }): Promise<StoredEmailVerificationCode | null>;
};

type PrismaAuthTransaction = {
  user: {
    findUnique(args: {
      where: { emailNormalized: string } | { id: string };
      include: { identities: true };
    }): Promise<StoredAuthenticationUser | null>;
    create(args: {
      data: {
        publicId: string;
        emailNormalized: string;
        displayName: string | null;
        phone?: string | null;
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
  userIdentity: {
    updateMany(args: {
      where: { userId: string; provider: "local_password"; emailVerifiedAt: null };
      data: { emailVerifiedAt: Date };
    }): Promise<{ count: number }>;
  };
  emailVerificationCode: PrismaEmailVerificationCodeClient;
};

type PrismaAuthClient = PrismaAuthTransaction & {
  $transaction<T>(work: (transaction: PrismaAuthTransaction) => Promise<T>): Promise<T>;
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

// Narrowed accessor for the OAuth (Google) models/shapes the password path never touches.
type GoogleOAuthPrisma = {
  user: {
    findFirst(args: {
      where: {
        identities: {
          some: { provider: AuthenticationIdentityProvider; providerSubject: string };
        };
      };
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
            provider: AuthenticationIdentityProvider;
            providerSubject: string;
            emailVerifiedAt: Date | null;
          };
        };
      };
      include: { identities: true };
    }): Promise<StoredAuthenticationUser>;
  };
  userIdentity: {
    create(args: {
      data: {
        userId: string;
        provider: AuthenticationIdentityProvider;
        providerSubject: string;
        emailVerifiedAt: Date | null;
      };
    }): Promise<unknown>;
  };
  googleOAuthToken: {
    upsert(args: {
      where: { userId: string };
      create: {
        userId: string;
        refreshTokenEncrypted: string;
        scope: string;
        calendarSyncEnabled: boolean;
        googleSub: string;
      };
      update: {
        scope: string;
        calendarSyncEnabled: boolean;
        googleSub: string;
        refreshTokenEncrypted?: string;
      };
    }): Promise<unknown>;
  };
};

export function createPrismaAuthenticationRepository(
  prismaClient: unknown
): AuthenticationRepository {
  const prisma = prismaClient as PrismaAuthClient;
  const oauthDb = prismaClient as GoogleOAuthPrisma;

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
          phone: input.phone ?? null,
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

    findUserByOAuthSubject(provider, providerSubject) {
      return oauthDb.user.findFirst({
        where: { identities: { some: { provider, providerSubject } } },
        include: { identities: true }
      });
    },

    createOAuthUser(input) {
      return oauthDb.user.create({
        data: {
          publicId: input.publicId,
          emailNormalized: input.emailNormalized,
          displayName: input.displayName,
          status: "active",
          identities: {
            create: {
              provider: input.provider,
              providerSubject: input.providerSubject,
              emailVerifiedAt: input.emailVerifiedAt
            }
          }
        },
        include: { identities: true }
      });
    },

    async linkOAuthIdentity(input) {
      await oauthDb.userIdentity.create({
        data: {
          userId: input.userId,
          provider: input.provider,
          providerSubject: input.providerSubject,
          emailVerifiedAt: input.emailVerifiedAt
        }
      });
    },

    async upsertGoogleOAuthToken(input) {
      await oauthDb.googleOAuthToken.upsert({
        where: { userId: input.userId },
        create: {
          userId: input.userId,
          refreshTokenEncrypted: input.refreshTokenEncrypted ?? "",
          scope: input.scope,
          calendarSyncEnabled: input.calendarSyncEnabled,
          googleSub: input.googleSub
        },
        update: {
          scope: input.scope,
          calendarSyncEnabled: input.calendarSyncEnabled,
          googleSub: input.googleSub,
          // Only overwrite the stored refresh token when Google returned a fresh one.
          ...(input.refreshTokenEncrypted
            ? { refreshTokenEncrypted: input.refreshTokenEncrypted }
            : {})
        }
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

    createEmailVerificationCode(input) {
      return prisma.$transaction(async (transaction) => {
        await transaction.emailVerificationCode.updateMany({
          where: {
            userId: input.userId,
            consumedAt: null
          },
          data: {
            consumedAt: input.now
          }
        });
        return transaction.emailVerificationCode.create({
          data: {
            userId: input.userId,
            codeHash: input.codeHash,
            expiresAt: input.expiresAt,
            createdAt: input.now
          }
        });
      });
    },

    findActiveEmailVerificationCode(userId) {
      return prisma.emailVerificationCode.findFirst({
        where: { userId, consumedAt: null },
        orderBy: { createdAt: "desc" }
      });
    },

    incrementEmailVerificationAttempts(input) {
      return updateEmailVerificationCode(prisma, input, {
        attempts: { increment: 1 }
      });
    },

    consumeEmailVerificationCode(input) {
      return updateEmailVerificationCode(prisma, input, {
        consumedAt: input.now
      });
    },

    markEmailVerified(input) {
      return prisma.$transaction(async (transaction) => {
        await transaction.userIdentity.updateMany({
          where: {
            userId: input.userId,
            provider: "local_password",
            emailVerifiedAt: null
          },
          data: { emailVerifiedAt: input.now }
        });
        return transaction.user.findUnique({
          where: { id: input.userId },
          include: { identities: true }
        });
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

async function updateEmailVerificationCode(
  prisma: PrismaAuthClient,
  input: UpdateEmailVerificationCodeInput,
  data: {
    attempts?: { increment: 1 };
    consumedAt?: Date;
  }
) {
  return prisma.$transaction(async (transaction) => {
    const updated = await transaction.emailVerificationCode.updateMany({
      where: {
        id: input.verificationId,
        attempts: input.expectedAttempts,
        consumedAt: null
      },
      data
    });
    if (updated.count !== 1) return null;
    return transaction.emailVerificationCode.findUnique({
      where: { id: input.verificationId }
    });
  });
}

type PrismaMembershipClient = {
  organizationMembership: {
    findMany(args: {
      where: { userId: string };
      include: typeof membershipInclude;
      orderBy: { createdAt: "asc" };
    }): Promise<StoredOrganizationMembership[]>;
    findUnique(args: {
      where: { id: string };
      include: typeof membershipInclude;
    }): Promise<StoredOrganizationMembership | null>;
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
    findMany(args: {
      where: { key: { in: readonly AuthorizationRoleKey[] } };
    }): Promise<{ id: string; key: AuthorizationRoleKey }[]>;
  };
  membershipAccessRole: {
    deleteMany(args: { where: { membershipId: string } }): Promise<unknown>;
    createMany(args: {
      data: {
        membershipId: string;
        accessRoleDefinitionId: string;
        assignedByUserId: string | null;
      }[];
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

export function createPrismaOrganizationMembershipRepository(
  prismaClient: unknown
): OrganizationMembershipRepository {
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
  $transaction<T>(
    callback: (transaction: PrismaEmployerOrganizationClient) => Promise<T>
  ): Promise<T>;
  employerOrganization: {
    findUnique(args: {
      where: { id?: string; publicId?: string };
    }): Promise<StoredEmployerOrganization | null>;
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

export function createPrismaEmployerOrganizationRepository(
  prismaClient: unknown
): EmployerOrganizationRepository {
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
          suspendedAt:
            input.status === "suspended" ? input.now : input.status === "active" ? null : undefined,
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

type PrismaResidenceClient = Pick<
  PrismaEmployerOrganizationClient,
  "auditActorReference" | "auditEvent"
> & {
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
        where: {
          id: input.residenceId,
          organizationId: input.organizationId,
          updatedAt: input.expectedUpdatedAt
        },
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
        where: {
          id: input.residenceId,
          organizationId: input.organizationId,
          updatedAt: input.expectedUpdatedAt
        },
        data: {
          status: input.status,
          archivedAt:
            input.status === "closed" ? input.now : input.status === "active" ? null : undefined,
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

type PrismaDepartmentClient = Pick<
  PrismaEmployerOrganizationClient,
  "auditActorReference" | "auditEvent"
> & {
  $transaction<T>(callback: (transaction: PrismaDepartmentClient) => Promise<T>): Promise<T>;
  department: {
    findUnique(args: { where: { id: string } }): Promise<StoredDepartment | null>;
    findMany(args: {
      where: { organizationId: string; residenceId: string; status?: DepartmentStatus | undefined };
      orderBy: { name: "asc" };
    }): Promise<StoredDepartment[]>;
    create(args: {
      data: {
        publicId: string;
        organizationId: string;
        residenceId: string;
        name: string;
        status: "active";
        createdByUserId: string;
        createdAt: Date;
        updatedAt: Date;
      };
    }): Promise<StoredDepartment>;
    updateMany(args: {
      where: { id: string; organizationId: string; residenceId: string; updatedAt: Date };
      data: {
        name?: string | undefined;
        status?: DepartmentStatus | undefined;
        archivedAt?: Date | null | undefined;
        updatedAt: Date;
      };
    }): Promise<{ count: number }>;
  };
};

export function createPrismaDepartmentRepository(prismaClient: unknown): DepartmentRepository {
  const prisma = prismaClient as PrismaDepartmentClient;

  return {
    findDepartmentById(departmentId) {
      return prisma.department.findUnique({
        where: { id: departmentId }
      });
    },

    listDepartmentsByResidence(input) {
      return prisma.department.findMany({
        where: {
          organizationId: input.organizationId,
          residenceId: input.residenceId,
          ...(input.status ? { status: input.status } : {})
        },
        orderBy: { name: "asc" }
      });
    },

    async createDepartment(input) {
      return prisma.$transaction(async (transaction) => {
        const department = await transaction.department.create({
          data: {
            publicId: input.publicId,
            organizationId: input.organizationId,
            residenceId: input.residenceId,
            name: input.name,
            status: "active",
            createdByUserId: input.actorUserId,
            createdAt: input.now,
            updatedAt: input.now
          }
        });

        await recordPrismaDepartmentAudit(transaction, {
          action: "department.created",
          organizationId: input.organizationId,
          residenceId: input.residenceId,
          departmentId: department.id,
          actorUserId: input.actorUserId,
          priorState: null,
          newState: department.status,
          reason: null,
          correlationId: input.correlationId,
          createdAt: input.now
        });

        return department;
      });
    },

    async updateDepartment(input) {
      const result = await prisma.department.updateMany({
        where: {
          id: input.departmentId,
          organizationId: input.organizationId,
          residenceId: input.residenceId,
          updatedAt: input.expectedUpdatedAt
        },
        data: {
          name: input.name,
          updatedAt: input.now
        }
      });

      if (result.count !== 1) {
        return null;
      }

      return this.findDepartmentById(input.departmentId);
    },

    async updateDepartmentStatus(input) {
      const result = await prisma.department.updateMany({
        where: {
          id: input.departmentId,
          organizationId: input.organizationId,
          residenceId: input.residenceId,
          updatedAt: input.expectedUpdatedAt
        },
        data: {
          status: input.status,
          archivedAt:
            input.status === "closed" ? input.now : input.status === "active" ? null : undefined,
          updatedAt: input.now
        }
      });

      if (result.count !== 1) {
        return null;
      }

      return this.findDepartmentById(input.departmentId);
    },

    async recordDepartmentAuditEvent(input) {
      await recordPrismaDepartmentAudit(prisma, input);
    }
  };
}

type PrismaWorkGroupClient = Pick<
  PrismaEmployerOrganizationClient,
  "auditActorReference" | "auditEvent"
> & {
  workGroup: {
    findUnique(
      args: { where: { id: string } } | { where: { key: string } }
    ): Promise<StoredWorkGroup | null>;
    findMany(args: {
      where?: { status?: WorkGroupStatus | undefined };
      orderBy: [{ displayOrder: "asc" }, { displayLabel: "asc" }, { key: "asc" }];
    }): Promise<StoredWorkGroup[]>;
    updateMany(args: {
      where: { id: string; updatedAt: Date };
      data: {
        displayLabel?: string | undefined;
        displayOrder?: number | undefined;
        iconKey?: string | null | undefined;
        status?: WorkGroupStatus | undefined;
        updatedAt: Date;
      };
    }): Promise<{ count: number }>;
  };
};

export function createPrismaWorkGroupRepository(prismaClient: unknown): WorkGroupRepository {
  const prisma = prismaClient as PrismaWorkGroupClient;

  return {
    findWorkGroupById(workGroupId) {
      return prisma.workGroup.findUnique({
        where: { id: workGroupId }
      });
    },

    findWorkGroupByKey(key) {
      return prisma.workGroup.findUnique({
        where: { key }
      });
    },

    listWorkGroups(input) {
      return prisma.workGroup.findMany({
        ...(input.includeInactive ? {} : { where: { status: "active" as const } }),
        orderBy: [{ displayOrder: "asc" }, { displayLabel: "asc" }, { key: "asc" }]
      });
    },

    async updateWorkGroup(input) {
      const result = await prisma.workGroup.updateMany({
        where: { id: input.workGroupId, updatedAt: input.expectedUpdatedAt },
        data: {
          displayLabel: input.displayLabel,
          displayOrder: input.displayOrder,
          iconKey: input.iconKey,
          updatedAt: input.now
        }
      });

      if (result.count !== 1) {
        return null;
      }

      return this.findWorkGroupById(input.workGroupId);
    },

    async updateWorkGroupStatus(input) {
      const result = await prisma.workGroup.updateMany({
        where: { id: input.workGroupId, updatedAt: input.expectedUpdatedAt },
        data: {
          status: input.status,
          updatedAt: input.now
        }
      });

      if (result.count !== 1) {
        return null;
      }

      return this.findWorkGroupById(input.workGroupId);
    },

    async recordWorkGroupAuditEvent(input) {
      await recordPrismaWorkGroupAudit(prisma, input);
    }
  };
}

type PrismaRoleDefinitionClient = Pick<
  PrismaEmployerOrganizationClient,
  "auditActorReference" | "auditEvent"
> & {
  roleDefinition: {
    findUnique(args: {
      where: { id: string } | { key: string };
      include: { workGroup: true };
    }): Promise<StoredRoleDefinition | null>;
    findMany(args: {
      where?: {
        status?: RoleDefinitionStatus | undefined;
        workGroup?: { key: string } | undefined;
      };
      include: { workGroup: true };
      orderBy: [
        { workGroup: { displayOrder: "asc" } },
        { displayOrder: "asc" },
        { displayLabel: "asc" },
        { key: "asc" }
      ];
    }): Promise<StoredRoleDefinition[]>;
    updateMany(args: {
      where: { id: string; updatedAt: Date };
      data: {
        displayLabel?: string | undefined;
        displayOrder?: number | undefined;
        localizedLabelKey?: string | null | undefined;
        qualificationSummary?: string | null | undefined;
        safetyRequirementSummary?: string | null | undefined;
        status?: RoleDefinitionStatus | undefined;
        updatedAt: Date;
      };
    }): Promise<{ count: number }>;
  };
};

export function createPrismaRoleDefinitionRepository(
  prismaClient: unknown
): RoleDefinitionRepository {
  const prisma = prismaClient as PrismaRoleDefinitionClient;

  return {
    findRoleDefinitionById(roleDefinitionId) {
      return prisma.roleDefinition.findUnique({
        where: { id: roleDefinitionId },
        include: { workGroup: true }
      });
    },

    findRoleDefinitionByKey(key) {
      return prisma.roleDefinition.findUnique({
        where: { key },
        include: { workGroup: true }
      });
    },

    listRoleDefinitions(input) {
      return prisma.roleDefinition.findMany({
        where: {
          ...(input.includeInactive ? {} : { status: "active" as const }),
          ...(input.workGroupKey ? { workGroup: { key: input.workGroupKey } } : {})
        },
        include: { workGroup: true },
        orderBy: [
          { workGroup: { displayOrder: "asc" } },
          { displayOrder: "asc" },
          { displayLabel: "asc" },
          { key: "asc" }
        ]
      });
    },

    async updateRoleDefinition(input) {
      const result = await prisma.roleDefinition.updateMany({
        where: { id: input.roleDefinitionId, updatedAt: input.expectedUpdatedAt },
        data: {
          displayLabel: input.displayLabel,
          displayOrder: input.displayOrder,
          localizedLabelKey: input.localizedLabelKey,
          qualificationSummary: input.qualificationSummary,
          safetyRequirementSummary: input.safetyRequirementSummary,
          updatedAt: input.now
        }
      });

      if (result.count !== 1) return null;

      return this.findRoleDefinitionById(input.roleDefinitionId);
    },

    async updateRoleDefinitionStatus(input) {
      const result = await prisma.roleDefinition.updateMany({
        where: { id: input.roleDefinitionId, updatedAt: input.expectedUpdatedAt },
        data: {
          status: input.status,
          updatedAt: input.now
        }
      });

      if (result.count !== 1) return null;

      return this.findRoleDefinitionById(input.roleDefinitionId);
    },

    async recordRoleDefinitionAuditEvent(input) {
      await recordPrismaRoleDefinitionAudit(prisma, input);
    }
  };
}

type PrismaJobRequestClient = Pick<
  PrismaEmployerOrganizationClient,
  "auditActorReference" | "auditEvent"
> & {
  $transaction<T>(callback: (transaction: PrismaJobRequestClient) => Promise<T>): Promise<T>;
  jobRequestSequence: {
    upsert(args: {
      where: { scopeYear: number };
      create: { scopeYear: number; lastValue: number };
      update: Record<string, never>;
    }): Promise<{ scopeYear: number; lastValue: number }>;
    update(args: {
      where: { scopeYear: number };
      data: { lastValue: { increment: number } };
    }): Promise<{ scopeYear: number; lastValue: number }>;
  };
  jobRequest: {
    create(args: { data: CreateJobRequestPrismaData }): Promise<StoredJobRequest>;
    findUnique(args: {
      where: { id: string } | { jobRequestNumber: string };
    }): Promise<StoredJobRequest | null>;
    findMany(args: {
      where?: {
        dispatchReviewId?: string | undefined;
        organizationId?: string | undefined;
        residenceId?: string | undefined;
        departmentId?: string | undefined;
        status?: { in: readonly JobRequestStatus[] } | undefined;
      };
      orderBy: [{ createdAt: "desc" }, { jobRequestNumber: "desc" }];
    }): Promise<StoredJobRequest[]>;
    updateMany(args: {
      where: { id: string; version: number };
      data: Partial<UpdateJobRequestPrismaData>;
    }): Promise<{ count: number }>;
  };
};

type CreateJobRequestPrismaData = {
  jobRequestNumber: string;
  organizationId: string;
  residenceId: string;
  departmentId: string;
  workGroupId: string;
  roleDefinitionId: string;
  creatorUserId: string;
  createdByUserId: string;
  title: string;
  description: string | null;
  numberOfWorkers: number;
  urgency: JobRequestUrgency;
  requestType: JobRequestType;
  timezone: string;
  startAt: Date;
  endAt: Date;
  isMultiDay: boolean;
  hasRecurringIntent: boolean;
  status: "draft";
  createdAt: Date;
  updatedAt: Date;
};

type UpdateJobRequestPrismaData = {
  residenceId: string;
  departmentId: string;
  workGroupId: string;
  roleDefinitionId: string;
  title: string;
  description: string | null;
  numberOfWorkers: number;
  urgency: JobRequestUrgency;
  requestType: JobRequestType;
  timezone: string;
  startAt: Date;
  endAt: Date;
  isMultiDay: boolean;
  hasRecurringIntent: boolean;
  status: JobRequestStatus;
  adminReviewReason: string | null;
  version: { increment: number };
  updatedByUserId: string;
  updatedAt: Date;
  submittedAt: Date | null;
  cancelledAt: Date | null;
  expiredAt: Date | null;
  archivedAt: Date | null;
};

export function createPrismaJobRequestRepository(prismaClient: unknown): JobRequestRepository {
  const prisma = prismaClient as PrismaJobRequestClient;

  return {
    async createDraft(input) {
      return prisma.$transaction(async (transaction) => {
        const year = input.now.getUTCFullYear();
        await transaction.jobRequestSequence.upsert({
          where: { scopeYear: year },
          create: { scopeYear: year, lastValue: 0 },
          update: {}
        });
        const sequence = await transaction.jobRequestSequence.update({
          where: { scopeYear: year },
          data: { lastValue: { increment: 1 } }
        });
        const jobRequestNumber = formatJobRequestNumber(year, sequence.lastValue);
        const created = await transaction.jobRequest.create({
          data: {
            jobRequestNumber,
            organizationId: input.organizationId,
            residenceId: input.residenceId,
            departmentId: input.departmentId,
            workGroupId: input.workGroupId,
            roleDefinitionId: input.roleDefinitionId,
            creatorUserId: input.actorUserId,
            createdByUserId: input.actorUserId,
            title: input.title,
            description: input.description,
            numberOfWorkers: input.numberOfWorkers,
            urgency: input.urgency,
            requestType: input.requestType,
            timezone: input.timezone,
            startAt: input.startAt,
            endAt: input.endAt,
            isMultiDay: input.isMultiDay,
            hasRecurringIntent: input.hasRecurringIntent,
            status: "draft",
            createdAt: input.now,
            updatedAt: input.now
          }
        });
        await recordPrismaJobRequestAudit(transaction, {
          action: "job_request.created",
          organizationId: created.organizationId,
          jobRequestId: created.id,
          jobRequestNumber: created.jobRequestNumber,
          actorUserId: input.actorUserId,
          priorState: null,
          newState: created.status,
          reason: null,
          correlationId: input.correlationId,
          createdAt: input.now
        });

        return created;
      });
    },

    findJobRequestById(jobRequestId) {
      return prisma.jobRequest.findUnique({ where: { id: jobRequestId } });
    },

    findJobRequestByNumber(jobRequestNumber) {
      return prisma.jobRequest.findUnique({ where: { jobRequestNumber } });
    },

    listJobRequests(input) {
      return prisma.jobRequest.findMany({
        where: {
          ...(input.organizationId ? { organizationId: input.organizationId } : {}),
          ...(input.residenceId ? { residenceId: input.residenceId } : {}),
          ...(input.departmentId ? { departmentId: input.departmentId } : {}),
          ...(input.statuses ? { status: { in: input.statuses } } : {})
        },
        orderBy: [{ createdAt: "desc" }, { jobRequestNumber: "desc" }]
      });
    },

    async updateDraft(input) {
      const data: Partial<UpdateJobRequestPrismaData> = {
        updatedByUserId: input.actorUserId,
        updatedAt: input.now,
        version: { increment: 1 }
      };

      if (input.residenceId !== undefined) data.residenceId = input.residenceId;
      if (input.departmentId !== undefined) data.departmentId = input.departmentId;
      if (input.workGroupId !== undefined) data.workGroupId = input.workGroupId;
      if (input.roleDefinitionId !== undefined) data.roleDefinitionId = input.roleDefinitionId;
      if (input.title !== undefined) data.title = input.title;
      if (input.description !== undefined) data.description = input.description;
      if (input.numberOfWorkers !== undefined) data.numberOfWorkers = input.numberOfWorkers;
      if (input.urgency !== undefined) data.urgency = input.urgency;
      if (input.requestType !== undefined) data.requestType = input.requestType;
      if (input.timezone !== undefined) data.timezone = input.timezone;
      if (input.startAt !== undefined) data.startAt = input.startAt;
      if (input.endAt !== undefined) data.endAt = input.endAt;
      if (input.isMultiDay !== undefined) data.isMultiDay = input.isMultiDay;
      if (input.hasRecurringIntent !== undefined)
        data.hasRecurringIntent = input.hasRecurringIntent;

      const result = await prisma.jobRequest.updateMany({
        where: { id: input.jobRequestId, version: input.expectedVersion },
        data
      });

      if (result.count !== 1) return null;

      return this.findJobRequestById(input.jobRequestId);
    },

    async transitionJobRequest(input) {
      const data: Partial<UpdateJobRequestPrismaData> = {
        status: input.status,
        updatedByUserId: input.actorUserId,
        updatedAt: input.now,
        version: { increment: 1 }
      };

      if (input.adminReviewReason !== undefined) data.adminReviewReason = input.adminReviewReason;
      if (input.status === "submitted") data.submittedAt = input.now;
      if (input.status === "cancelled") data.cancelledAt = input.now;
      if (input.status === "expired") data.expiredAt = input.now;
      if (input.status === "archived") data.archivedAt = input.now;

      const result = await prisma.jobRequest.updateMany({
        where: { id: input.jobRequestId, version: input.expectedVersion },
        data
      });

      if (result.count !== 1) return null;

      return this.findJobRequestById(input.jobRequestId);
    },

    async recordJobRequestAuditEvent(input) {
      await recordPrismaJobRequestAudit(prisma, input);
    }
  };
}

type PrismaDispatchClient = Pick<PrismaJobRequestClient, "auditActorReference" | "auditEvent"> & {
  $transaction<T>(fn: (transaction: PrismaDispatchClient) => Promise<T>): Promise<T>;
  dispatchReview: {
    create(args: { data: CreateDispatchReviewPrismaData }): Promise<StoredDispatchReview>;
    findUnique(args: { where: { id: string } }): Promise<StoredDispatchReview | null>;
    findFirst(args: {
      where: { jobRequestId: string; state?: { in: readonly DispatchReviewStatus[] } };
      orderBy?: { updatedAt: "desc" };
    }): Promise<StoredDispatchReview | null>;
    findMany(args: {
      where?: {
        organizationId?: string | undefined;
        state?: { in: readonly DispatchReviewStatus[] } | undefined;
      };
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }];
    }): Promise<StoredDispatchReview[]>;
    updateMany(args: {
      where: { id: string; version: number };
      data: Partial<UpdateDispatchReviewPrismaData>;
    }): Promise<{ count: number }>;
  };
  dispatchCandidate: {
    upsert(args: {
      where: {
        dispatchReviewId_candidateSourceReference: {
          dispatchReviewId: string;
          candidateSourceReference: string;
        };
      };
      create: CreateDispatchCandidatePrismaData;
      update: Partial<CreateDispatchCandidatePrismaData>;
    }): Promise<StoredDispatchCandidate>;
    findMany(args: {
      where: { dispatchReviewId: string; shortlistState?: DispatchShortlistState | undefined };
      orderBy: [{ shortlistOrder: "asc" }, { updatedAt: "desc" }];
    }): Promise<StoredDispatchCandidate[]>;
    updateMany(args: {
      where: { dispatchReviewId: string; candidateSourceReference: string };
      data: Partial<UpdateDispatchCandidatePrismaData>;
    }): Promise<{ count: number }>;
    findFirst(args: {
      where: {
        dispatchReviewId: string;
        candidateSourceReference?: string | undefined;
        workerIdentityId?: string | undefined;
        shortlistState?: DispatchShortlistState | undefined;
      };
    }): Promise<StoredDispatchCandidate | null>;
  };
};

type CreateDispatchReviewPrismaData = {
  jobRequestId: string;
  organizationId: string;
  residenceId: string;
  departmentId: string;
  workGroupId: string;
  roleDefinitionId: string;
  dispatchType: DispatchType;
  state: DispatchReviewStatus;
  operationalOwnerUserId: string | null;
  priority: DispatchPriority;
  urgency: JobRequestUrgency;
  requiredWorkerCount: number;
  shortlistedCandidateCount: number;
  preparedOfferCount: number;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
};

type UpdateDispatchReviewPrismaData = {
  state: DispatchReviewStatus;
  operationalOwnerUserId: string | null;
  shortlistedCandidateCount: number;
  preparedOfferCount: number;
  startedAt: Date | null;
  pausedAt: Date | null;
  cancelledAt: Date | null;
  closedAt: Date | null;
  updatedByUserId: string;
  updatedAt: Date;
  version: { increment: number };
};

type CreateDispatchCandidatePrismaData = Omit<
  StoredDispatchCandidate,
  "id" | "createdAt" | "updatedAt" | "version"
> & {
  createdAt: Date;
  updatedAt: Date;
};

type UpdateDispatchCandidatePrismaData = Partial<CreateDispatchCandidatePrismaData> & {
  updatedAt: Date;
  version: { increment: number };
};

export function createPrismaDispatchRepository(prismaClient: unknown): DispatchRepository {
  const prisma = prismaClient as PrismaDispatchClient;

  return {
    createDispatchReviewWithAudit(input) {
      return prisma.$transaction(async (transaction) => {
        const created = await transaction.dispatchReview.create({
          data: {
            jobRequestId: input.jobRequest.id,
            organizationId: input.jobRequest.organizationId,
            residenceId: input.jobRequest.residenceId,
            departmentId: input.jobRequest.departmentId,
            workGroupId: input.jobRequest.workGroupId,
            roleDefinitionId: input.jobRequest.roleDefinitionId,
            dispatchType: "initial",
            state: "draft",
            operationalOwnerUserId: input.operationalOwnerUserId,
            priority: input.priority,
            urgency: input.jobRequest.urgency,
            requiredWorkerCount: input.jobRequest.numberOfWorkers,
            shortlistedCandidateCount: 0,
            preparedOfferCount: 0,
            createdByUserId: input.actorUserId,
            createdAt: input.now,
            updatedAt: input.now
          }
        });
        await recordPrismaDispatchAudit(transaction, {
          action: "dispatch.created",
          organizationId: created.organizationId,
          dispatchReviewId: created.id,
          jobRequestId: created.jobRequestId,
          actorUserId: input.actorUserId,
          priorState: null,
          newState: created.state,
          reason: null,
          correlationId: input.correlationId,
          createdAt: input.now
        });
        return created;
      });
    },

    findDispatchReviewById(dispatchReviewId) {
      return prisma.dispatchReview.findUnique({ where: { id: dispatchReviewId } });
    },

    findActiveDispatchReviewForJobRequest(jobRequestId) {
      return prisma.dispatchReview.findFirst({
        where: { jobRequestId, state: { in: nonTerminalDispatchStates } }
      });
    },

    async findCurrentDispatchReviewForJobRequest(jobRequestId) {
      const active = await this.findActiveDispatchReviewForJobRequest(jobRequestId);
      return (
        active ??
        prisma.dispatchReview.findFirst({
          where: { jobRequestId },
          orderBy: { updatedAt: "desc" }
        })
      );
    },

    listDispatchReviews(input) {
      return prisma.dispatchReview.findMany({
        where: {
          ...(input.organizationId ? { organizationId: input.organizationId } : {}),
          ...(input.states ? { state: { in: input.states } } : {})
        },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }]
      });
    },

    async updateDispatchReview(input) {
      const data: Partial<UpdateDispatchReviewPrismaData> = {
        updatedByUserId: input.actorUserId,
        updatedAt: input.now,
        version: { increment: 1 }
      };

      if (input.state !== undefined) data.state = input.state;
      if (input.operationalOwnerUserId !== undefined)
        data.operationalOwnerUserId = input.operationalOwnerUserId;
      if (input.shortlistedCandidateCount !== undefined)
        data.shortlistedCandidateCount = input.shortlistedCandidateCount;
      if (input.preparedOfferCount !== undefined)
        data.preparedOfferCount = input.preparedOfferCount;
      if (input.startedAt !== undefined) data.startedAt = input.startedAt;
      if (input.pausedAt !== undefined) data.pausedAt = input.pausedAt;
      if (input.cancelledAt !== undefined) data.cancelledAt = input.cancelledAt;
      if (input.closedAt !== undefined) data.closedAt = input.closedAt;

      const result = await prisma.dispatchReview.updateMany({
        where: { id: input.dispatchReviewId, version: input.expectedVersion },
        data
      });
      if (result.count !== 1) return null;

      return this.findDispatchReviewById(input.dispatchReviewId);
    },

    listCandidates(dispatchReviewId) {
      return prisma.dispatchCandidate.findMany({
        where: { dispatchReviewId },
        orderBy: [{ shortlistOrder: "asc" }, { updatedAt: "desc" }]
      });
    },

    findShortlistedCandidateByWorkerIdentity(dispatchReviewId, workerIdentityId) {
      return prisma.dispatchCandidate.findFirst({
        where: {
          dispatchReviewId,
          workerIdentityId,
          shortlistState: "shortlisted"
        }
      });
    },

    upsertCandidate(input) {
      return prisma.dispatchCandidate.upsert({
        where: {
          dispatchReviewId_candidateSourceReference: {
            dispatchReviewId: input.dispatchReviewId,
            candidateSourceReference: input.candidate.candidateSourceReference
          }
        },
        create: {
          ...input.candidate,
          dispatchReviewId: input.dispatchReviewId,
          shortlistState: "not_shortlisted",
          shortlistOrder: null,
          addedByUserId: null,
          removedByUserId: null,
          createdAt: input.now,
          updatedAt: input.now
        },
        update: {
          ...input.candidate,
          updatedAt: input.now
        }
      });
    },

    async updateCandidateShortlist(input) {
      const result = await prisma.dispatchCandidate.updateMany({
        where: {
          dispatchReviewId: input.dispatchReviewId,
          candidateSourceReference: input.candidateSourceReference
        },
        data: {
          shortlistState: input.shortlistState,
          shortlistOrder: input.shortlistOrder,
          ...(input.shortlistState === "shortlisted"
            ? { addedByUserId: input.actorUserId, removedByUserId: null }
            : { removedByUserId: input.actorUserId }),
          updatedAt: input.now,
          version: { increment: 1 }
        }
      });
      if (result.count !== 1) return null;

      return prisma.dispatchCandidate.findFirst({
        where: {
          dispatchReviewId: input.dispatchReviewId,
          candidateSourceReference: input.candidateSourceReference
        }
      });
    },

    async reorderShortlist(input) {
      for (const [index, candidateSourceReference] of input.candidateSourceReferences.entries()) {
        await prisma.dispatchCandidate.updateMany({
          where: {
            dispatchReviewId: input.dispatchReviewId,
            candidateSourceReference
          },
          data: {
            shortlistState: "shortlisted",
            shortlistOrder: index + 1,
            updatedAt: input.now,
            version: { increment: 1 }
          }
        });
      }

      return prisma.dispatchCandidate.findMany({
        where: { dispatchReviewId: input.dispatchReviewId, shortlistState: "shortlisted" },
        orderBy: [{ shortlistOrder: "asc" }, { updatedAt: "desc" }]
      });
    },

    async recordDispatchAuditEvent(input) {
      await recordPrismaDispatchAudit(prisma, input);
    }
  };
}

type PrismaWorkerOfferClient = Pick<PrismaDispatchClient, "auditActorReference" | "auditEvent"> & {
  $transaction<T>(fn: (transaction: PrismaWorkerOfferClient) => Promise<T>): Promise<T>;
  $queryRawUnsafe<T>(query: string, ...values: unknown[]): Promise<T>;
  workerIdentity: {
    findUnique(args: {
      where: { id?: string | undefined; userId?: string | undefined };
    }): Promise<StoredWorkerIdentity | null>;
    create(args: {
      data: {
        userId: string;
        displayName?: string | null;
        preferredLanguage?: string | null;
        status: WorkerIdentityStatus;
        createdAt: Date;
        updatedAt: Date;
      };
    }): Promise<StoredWorkerIdentity>;
    updateMany(args: {
      where: { userId?: string | undefined };
      data: { classification?: string | undefined; updatedAt?: Date | undefined };
    }): Promise<{ count: number }>;
  };
  workerOffer: {
    create(args: { data: CreateWorkerOfferPrismaData }): Promise<StoredWorkerOffer>;
    findUnique(args: { where: { id: string } }): Promise<StoredWorkerOffer | null>;
    findMany(args: {
      where?: {
        dispatchReviewId?: string | undefined;
        organizationId?: string | undefined;
        workerIdentityId?: string | undefined;
        status?: { in: readonly WorkerOfferStatus[] } | undefined;
      };
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }];
    }): Promise<StoredWorkerOffer[]>;
    count(args: {
      where: { dispatchReviewId: string; status: { in: readonly WorkerOfferStatus[] } };
    }): Promise<number>;
    update(args: {
      where: { id: string };
      data: Partial<UpdateWorkerOfferPrismaData>;
    }): Promise<StoredWorkerOffer>;
    updateMany(args: {
      where: { id: string; version: number };
      data: Partial<UpdateWorkerOfferPrismaData>;
    }): Promise<{ count: number }>;
  };
  workerOfferTermsVersion: {
    create(args: {
      data: CreateWorkerOfferTermsPrismaData;
    }): Promise<StoredWorkerOfferTermsVersion>;
    findFirst(args: {
      where: { workerOfferId: string };
      orderBy: { versionNumber: "desc" };
    }): Promise<StoredWorkerOfferTermsVersion | null>;
  };
  workerOfferDeliveryAttempt: {
    create(args: {
      data: {
        workerOfferId: string;
        status: WorkerOfferDeliveryStatus;
        providerBoundary: string;
        reason: string | null;
        attemptedAt?: Date | null;
        deliveredAt?: Date | null;
        failedAt?: Date | null;
        createdByUserId: string | null;
        createdAt: Date;
      };
    }): Promise<StoredWorkerOfferDeliveryAttempt>;
  };
  workerOfferResponse: {
    findUnique(args: {
      where: { workerOfferId: string };
    }): Promise<StoredWorkerOfferResponse | null>;
    create(args: {
      data: {
        workerOfferId: string;
        workerIdentityId: string;
        termsVersionId: string;
        responseType: WorkerOfferResponseType;
        reason: string | null;
        createdAt: Date;
      };
    }): Promise<StoredWorkerOfferResponse>;
  };
};

type CreateWorkerOfferPrismaData = {
  dispatchReviewId: string;
  jobRequestId: string;
  organizationId: string;
  residenceId: string;
  departmentId: string;
  workerIdentityId: string;
  status: WorkerOfferStatus;
  expiresAt: Date;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
};

type CreateWorkerOfferTermsPrismaData = {
  workerOfferId: string;
  versionNumber: number;
  workerVisibleTitle: string;
  workerVisibleSummary: string | null;
  timezone: string;
  startAt: Date;
  endAt: Date;
  workGroupId: string;
  roleDefinitionId: string;
  compensationSummary: string | null;
  policySummary: string | null;
  createdByUserId: string;
  createdAt: Date;
};

type UpdateWorkerOfferPrismaData = {
  currentTermsVersionId: string | null;
  status: WorkerOfferStatus;
  approvedAt: Date | null;
  sentAt: Date | null;
  deliveredAt: Date | null;
  viewedAt: Date | null;
  respondedAt: Date | null;
  withdrawnAt: Date | null;
  cancelledAt: Date | null;
  updatedByUserId: string | null;
  approvedByUserId: string | null;
  sentByUserId: string | null;
  withdrawnByUserId: string | null;
  cancelledByUserId: string | null;
  updatedAt: Date;
  version: { increment: number };
};

export function createPrismaWorkerOfferRepository(prismaClient: unknown): WorkerOfferRepository {
  const prisma = prismaClient as PrismaWorkerOfferClient;

  return {
    findWorkerIdentityById(workerIdentityId) {
      return prisma.workerIdentity.findUnique({ where: { id: workerIdentityId } });
    },

    findWorkerIdentityByUserId(userId) {
      return prisma.workerIdentity.findUnique({ where: { userId } });
    },

    createWorkerIdentity(input) {
      return prisma.workerIdentity.create({
        data: {
          userId: input.userId,
          displayName: input.displayName ?? null,
          preferredLanguage: input.preferredLanguage ?? null,
          status: "active",
          createdAt: input.now,
          updatedAt: input.now
        }
      });
    },
    async setWorkerClassification(input) {
      const updated = await prisma.workerIdentity.updateMany({
        where: { userId: input.userId },
        data: { classification: input.classification, updatedAt: input.now }
      });
      if (updated.count === 0) return null;
      return prisma.workerIdentity.findUnique({ where: { userId: input.userId } });
    },

    createWorkerOffer(input) {
      return prisma.$transaction(async (transaction) => {
        await transaction.$queryRawUnsafe(
          "SELECT pg_advisory_xact_lock(hashtext($1))::text AS lock_acquired",
          `rwos:worker-offer:dispatch:${input.dispatchReview.id}`
        );
        const activeOfferCount = await transaction.workerOffer.count({
          where: {
            dispatchReviewId: input.dispatchReview.id,
            status: { in: workerOfferCapacityStates }
          }
        });
        if (activeOfferCount >= input.capacityLimit) return null;
        const offer = await transaction.workerOffer.create({
          data: {
            dispatchReviewId: input.dispatchReview.id,
            jobRequestId: input.jobRequest.id,
            organizationId: input.dispatchReview.organizationId,
            residenceId: input.dispatchReview.residenceId,
            departmentId: input.dispatchReview.departmentId,
            workerIdentityId: input.workerIdentity.id,
            status: "draft",
            expiresAt: input.expiresAt,
            createdByUserId: input.actorUserId,
            createdAt: input.now,
            updatedAt: input.now
          }
        });
        const termsVersion = await transaction.workerOfferTermsVersion.create({
          data: {
            workerOfferId: offer.id,
            versionNumber: 1,
            workerVisibleTitle: input.workerVisibleTitle,
            workerVisibleSummary: input.workerVisibleSummary,
            timezone: input.jobRequest.timezone,
            startAt: input.jobRequest.startAt,
            endAt: input.jobRequest.endAt,
            workGroupId: input.jobRequest.workGroupId,
            roleDefinitionId: input.jobRequest.roleDefinitionId,
            compensationSummary: input.compensationSummary,
            policySummary: input.policySummary,
            createdByUserId: input.actorUserId,
            createdAt: input.now
          }
        });
        const updated = await transaction.workerOffer.update({
          where: { id: offer.id },
          data: {
            currentTermsVersionId: termsVersion.id,
            updatedByUserId: input.actorUserId,
            updatedAt: input.now
          }
        });
        return { offer: updated, termsVersion };
      });
    },

    findWorkerOfferById(workerOfferId) {
      return prisma.workerOffer.findUnique({ where: { id: workerOfferId } });
    },

    findCurrentTermsVersion(workerOfferId) {
      return prisma.workerOfferTermsVersion.findFirst({
        where: { workerOfferId },
        orderBy: { versionNumber: "desc" }
      });
    },

    listWorkerOffers(input) {
      return prisma.workerOffer.findMany({
        where: {
          ...(input.dispatchReviewId ? { dispatchReviewId: input.dispatchReviewId } : {}),
          ...(input.organizationId ? { organizationId: input.organizationId } : {}),
          ...(input.workerIdentityId ? { workerIdentityId: input.workerIdentityId } : {}),
          ...(input.statuses ? { status: { in: input.statuses } } : {})
        },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }]
      });
    },

    countCapacityOffersForDispatch(dispatchReviewId) {
      return prisma.workerOffer.count({
        where: { dispatchReviewId, status: { in: workerOfferCapacityStates } }
      });
    },

    async updateWorkerOffer(input) {
      const data: Partial<UpdateWorkerOfferPrismaData> = {
        updatedByUserId: input.actorUserId,
        updatedAt: input.now,
        version: { increment: 1 }
      };

      if (input.status !== undefined) data.status = input.status;
      if (input.approvedAt !== undefined) {
        data.approvedAt = input.approvedAt;
        data.approvedByUserId = input.actorUserId;
      }
      if (input.sentAt !== undefined) {
        data.sentAt = input.sentAt;
        data.sentByUserId = input.actorUserId;
      }
      if (input.deliveredAt !== undefined) data.deliveredAt = input.deliveredAt;
      if (input.viewedAt !== undefined) data.viewedAt = input.viewedAt;
      if (input.respondedAt !== undefined) data.respondedAt = input.respondedAt;
      if (input.withdrawnAt !== undefined) {
        data.withdrawnAt = input.withdrawnAt;
        data.withdrawnByUserId = input.actorUserId;
      }
      if (input.cancelledAt !== undefined) {
        data.cancelledAt = input.cancelledAt;
        data.cancelledByUserId = input.actorUserId;
      }

      const result = await prisma.workerOffer.updateMany({
        where: { id: input.workerOfferId, version: input.expectedVersion },
        data
      });
      if (result.count !== 1) return null;

      return this.findWorkerOfferById(input.workerOfferId);
    },

    createDeliveryAttempt(input) {
      return prisma.workerOfferDeliveryAttempt.create({
        data: {
          workerOfferId: input.workerOfferId,
          status: input.status,
          providerBoundary: input.providerBoundary,
          reason: input.reason,
          attemptedAt: input.status === "attempted" ? input.now : null,
          deliveredAt: input.status === "delivered" ? input.now : null,
          failedAt: input.status === "failed" ? input.now : null,
          createdByUserId: input.actorUserId,
          createdAt: input.now
        }
      });
    },

    finalizeAcceptedDelivery(input) {
      return prisma.$transaction(async (transaction) => {
        const result = await transaction.workerOffer.updateMany({
          where: { id: input.workerOfferId, version: input.expectedVersion },
          data: {
            status: input.nextStatus,
            sentAt: input.now,
            sentByUserId: input.actorUserId,
            deliveredAt: input.nextStatus === "delivered" ? input.now : null,
            updatedByUserId: input.actorUserId,
            updatedAt: input.now,
            version: { increment: 1 }
          }
        });
        if (result.count !== 1) return null;
        await transaction.workerOfferDeliveryAttempt.create({
          data: {
            workerOfferId: input.workerOfferId,
            status: input.attemptStatus,
            providerBoundary: "configured_http_v1",
            reason: input.attemptReason,
            attemptedAt: input.attemptStatus === "attempted" ? input.now : null,
            deliveredAt: input.attemptStatus === "delivered" ? input.now : null,
            failedAt: null,
            createdByUserId: input.actorUserId,
            createdAt: input.now
          }
        });
        await recordPrismaWorkerOfferAudit(transaction, {
          action:
            input.nextStatus === "delivered"
              ? "worker_offer.delivery_succeeded"
              : "worker_offer.sent",
          organizationId: input.organizationId,
          workerOfferId: input.workerOfferId,
          dispatchReviewId: input.dispatchReviewId,
          jobRequestId: input.jobRequestId,
          actorUserId: input.actorUserId,
          priorState: "approved",
          newState: input.nextStatus,
          reason: null,
          correlationId: input.correlationId,
          createdAt: input.now
        });
        return transaction.workerOffer.findUnique({ where: { id: input.workerOfferId } });
      });
    },

    findResponseByOfferId(workerOfferId) {
      return prisma.workerOfferResponse.findUnique({ where: { workerOfferId } });
    },

    createResponse(input) {
      return prisma.workerOfferResponse.create({
        data: {
          workerOfferId: input.workerOfferId,
          workerIdentityId: input.workerIdentityId,
          termsVersionId: input.termsVersionId,
          responseType: input.responseType,
          reason: input.reason,
          createdAt: input.now
        }
      });
    },

    respondToWorkerOfferAtomically(input) {
      return prisma.$transaction(async (transaction) => {
        const result = await transaction.workerOffer.updateMany({
          where: { id: input.workerOfferId, version: input.expectedVersion },
          data: {
            status: input.nextStatus,
            respondedAt: input.now,
            updatedByUserId: input.actorUserId,
            updatedAt: input.now,
            version: { increment: 1 }
          }
        });
        if (result.count !== 1) return null;
        await transaction.workerOfferResponse.create({
          data: {
            workerOfferId: input.workerOfferId,
            workerIdentityId: input.workerIdentityId,
            termsVersionId: input.termsVersionId,
            responseType: input.responseType,
            reason: input.reason,
            createdAt: input.now
          }
        });
        return transaction.workerOffer.findUnique({ where: { id: input.workerOfferId } });
      });
    },

    async recordWorkerOfferAuditEvent(input) {
      await recordPrismaWorkerOfferAudit(prisma, input);
    }
  };
}

type PrismaAssignmentClient = Pick<
  PrismaWorkerOfferClient,
  | "auditActorReference"
  | "auditEvent"
  | "workerIdentity"
  | "workerOffer"
  | "workerOfferTermsVersion"
  | "workerOfferResponse"
> &
  Pick<PrismaJobRequestClient, "jobRequest"> &
  Pick<PrismaDispatchClient, "dispatchReview"> & {
    $transaction<T>(
      fn: (transaction: PrismaAssignmentClient) => Promise<T>,
      options?: {
        isolationLevel?: "Serializable";
        maxWait?: number;
        timeout?: number;
      }
    ): Promise<T>;
    $queryRaw<T>(query: TemplateStringsArray, ...values: unknown[]): Promise<T>;
    assignment: {
      create(args: { data: CreateAssignmentPrismaData }): Promise<StoredAssignment>;
      findUnique(args: {
        where: { id?: string | undefined; workerOfferId?: string | undefined };
      }): Promise<StoredAssignment | null>;
      findMany(args: {
        where?: {
          organizationId?: string | undefined;
          workerIdentityId?: string | undefined;
          jobRequestId?: string | undefined;
          status?: { in: readonly AssignmentStatus[] } | undefined;
          confirmedStartAt?: { lt: Date } | undefined;
          confirmedEndAt?: { gt: Date } | undefined;
          id?: { not: string } | undefined;
        };
        orderBy: [{ updatedAt: "desc" }, { confirmedStartAt: "asc" }];
      }): Promise<StoredAssignment[]>;
      count(args: {
        where: {
          jobRequestId?: string | undefined;
          workerIdentityId?: string | undefined;
          status?: { in: readonly AssignmentStatus[] } | undefined;
          confirmedStartAt?: { lt: Date } | undefined;
          confirmedEndAt?: { gt: Date } | undefined;
          id?: { not: string } | undefined;
        };
      }): Promise<number>;
      updateMany(args: {
        where: { id: string; version: number };
        data: Partial<UpdateAssignmentPrismaData>;
      }): Promise<{ count: number }>;
    };
  };

type CreateAssignmentPrismaData = {
  jobRequestId: string;
  dispatchReviewId: string;
  workerOfferId: string;
  workerOfferTermsVersionId: string;
  workerIdentityId: string;
  organizationId: string;
  residenceId: string;
  departmentId: string;
  workGroupId: string;
  roleDefinitionId: string;
  status: AssignmentStatus;
  confirmedStartAt: Date;
  confirmedEndAt: Date;
  timezone: string;
  confirmedTitle: string;
  confirmedRoleSummary: string | null;
  confirmedWorksiteSummary: string | null;
  confirmedDepartmentSummary: string | null;
  confirmedResponsibilitySummary: string | null;
  confirmedPolicySummary: string | null;
  confirmedCompensationSummary: string | null;
  validationSnapshot: Record<string, unknown>;
  capacityCheckedAt: Date;
  conflictCheckedAt: Date;
  confirmedAt: Date;
  createdByUserId: string;
  confirmedByUserId: string;
  createdAt: Date;
  updatedAt: Date;
};

type UpdateAssignmentPrismaData = {
  status: AssignmentStatus;
  workerAcknowledgedAt: Date | null;
  readyForAttendanceAt: Date | null;
  attendanceWindowStartedAt: Date | null;
  attendanceHandoffAt: Date | null;
  workerWithdrawnAt: Date | null;
  cancelledAt: Date | null;
  replacementRequiredAt: Date | null;
  closedAt: Date | null;
  cancellationReasonCategory: string | null;
  updatedByUserId: string | null;
  cancelledByUserId: string | null;
  updatedAt: Date;
  version: { increment: number };
};

export function createPrismaAssignmentRepository(prismaClient: unknown): AssignmentRepository {
  const prisma = prismaClient as PrismaAssignmentClient;

  return {
    createAssignmentFromAcceptedOfferAtomically(input) {
      return runAtomicAssignmentWithRetry(() =>
        prisma.$transaction(
          async (transaction) => {
            const locked = await transaction.$queryRaw<Array<{ id: string }>>`
            SELECT id
            FROM worker_offers
            WHERE id = ${input.workerOfferId}::uuid
            FOR UPDATE
          `;
            if (locked.length !== 1) {
              return { ok: false as const, reason: "worker_offer_not_found" as const };
            }
            const workerOffer = await transaction.workerOffer.findUnique({
              where: { id: input.workerOfferId }
            });
            if (!workerOffer) {
              return { ok: false as const, reason: "worker_offer_not_found" as const };
            }
            if (workerOffer.dispatchReviewId !== input.expectedDispatchReviewId) {
              return { ok: false as const, reason: "source_chain_mismatch" as const };
            }
            const fail = async (reason: AtomicAssignmentCreateFailure) => {
              await recordPrismaAssignmentAudit(transaction, {
                action: "assignment.validation_failed",
                organizationId: workerOffer.organizationId,
                assignmentId: null,
                workerOfferId: workerOffer.id,
                jobRequestId: workerOffer.jobRequestId,
                actorUserId: input.actorUserId,
                priorState: "pending_validation",
                newState: "rejected",
                reason,
                correlationId: input.correlationId,
                createdAt: input.now
              });
              return { ok: false as const, reason };
            };
            if (workerOffer.status !== "accepted") return fail("worker_offer_not_accepted");
            if (workerOffer.version !== input.expectedOfferVersion) {
              return fail("worker_offer_version_changed");
            }
            if (workerOffer.expiresAt <= input.now) return fail("worker_offer_expired");

            await transaction.$queryRaw`
            SELECT pg_advisory_xact_lock(
              hashtextextended(${`rwos:assignment:job:${workerOffer.jobRequestId}`}, 0)
            )::text AS lock_acquired
          `;
            await transaction.$queryRaw`
            SELECT pg_advisory_xact_lock(
              hashtextextended(${`rwos:assignment:worker:${workerOffer.workerIdentityId}`}, 0)
            )::text AS lock_acquired
          `;

            const [response, termsVersion, jobRequest, dispatchReview, workerIdentity, existing] =
              await Promise.all([
                transaction.workerOfferResponse.findUnique({
                  where: { workerOfferId: workerOffer.id }
                }),
                transaction.workerOfferTermsVersion.findFirst({
                  where: { workerOfferId: workerOffer.id },
                  orderBy: { versionNumber: "desc" }
                }),
                transaction.jobRequest.findUnique({ where: { id: workerOffer.jobRequestId } }),
                transaction.dispatchReview.findUnique({
                  where: { id: workerOffer.dispatchReviewId }
                }),
                transaction.workerIdentity.findUnique({
                  where: { id: workerOffer.workerIdentityId }
                }),
                transaction.assignment.findUnique({ where: { workerOfferId: workerOffer.id } })
              ]);
            if (existing) return fail("assignment_exists");
            if (
              !response ||
              response.responseType !== "accepted" ||
              response.workerIdentityId !== workerOffer.workerIdentityId
            ) {
              return fail("response_not_accepted");
            }
            if (
              !termsVersion ||
              termsVersion.id !== workerOffer.currentTermsVersionId ||
              termsVersion.workerOfferId !== workerOffer.id ||
              response.termsVersionId !== termsVersion.id
            ) {
              return fail("current_terms_unavailable");
            }
            if (!jobRequest || !dispatchReview || !workerIdentity) {
              return fail("source_chain_mismatch");
            }
            if (
              dispatchReview.jobRequestId !== jobRequest.id ||
              workerOffer.organizationId !== jobRequest.organizationId ||
              workerOffer.organizationId !== dispatchReview.organizationId ||
              workerOffer.residenceId !== jobRequest.residenceId ||
              workerOffer.residenceId !== dispatchReview.residenceId ||
              workerOffer.departmentId !== jobRequest.departmentId ||
              workerOffer.departmentId !== dispatchReview.departmentId ||
              termsVersion.workGroupId !== jobRequest.workGroupId ||
              termsVersion.roleDefinitionId !== jobRequest.roleDefinitionId
            ) {
              return fail("source_chain_mismatch");
            }
            if (jobRequest.status !== "approved_for_dispatch") {
              return fail("job_request_not_dispatchable");
            }
            if (dispatchReview.state !== "offer_preparation") {
              return fail("dispatch_not_assignable");
            }
            if (workerIdentity.status !== "active") return fail("worker_identity_inactive");

            const activeAssignments = await transaction.assignment.count({
              where: { jobRequestId: jobRequest.id, status: { in: activeAssignmentStates } }
            });
            if (activeAssignments >= jobRequest.numberOfWorkers) {
              return fail("job_capacity_reached");
            }
            const conflictCount = await transaction.assignment.count({
              where: {
                workerIdentityId: workerIdentity.id,
                status: { in: activeAssignmentStates },
                confirmedStartAt: { lt: termsVersion.endAt },
                confirmedEndAt: { gt: termsVersion.startAt }
              }
            });
            if (conflictCount > 0) return fail("worker_schedule_conflict");

            const assignment = await transaction.assignment.create({
              data: {
                jobRequestId: workerOffer.jobRequestId,
                dispatchReviewId: workerOffer.dispatchReviewId,
                workerOfferId: workerOffer.id,
                workerOfferTermsVersionId: termsVersion.id,
                workerIdentityId: workerIdentity.id,
                organizationId: workerOffer.organizationId,
                residenceId: workerOffer.residenceId,
                departmentId: workerOffer.departmentId,
                workGroupId: termsVersion.workGroupId,
                roleDefinitionId: termsVersion.roleDefinitionId,
                status: "confirmed",
                confirmedStartAt: termsVersion.startAt,
                confirmedEndAt: termsVersion.endAt,
                timezone: termsVersion.timezone,
                confirmedTitle: termsVersion.workerVisibleTitle,
                confirmedRoleSummary: jobRequest.title,
                confirmedWorksiteSummary: dispatchReview.residenceId,
                confirmedDepartmentSummary: dispatchReview.departmentId,
                confirmedResponsibilitySummary: termsVersion.workerVisibleSummary,
                confirmedPolicySummary: termsVersion.policySummary,
                confirmedCompensationSummary: termsVersion.compensationSummary,
                validationSnapshot: {
                  policyVersion: "assignment-foundation-v2",
                  workerOfferStatus: workerOffer.status,
                  termsVersionId: termsVersion.id,
                  jobRequestStatus: jobRequest.status,
                  dispatchReviewState: dispatchReview.state,
                  activeAssignmentsBeforeCreate: activeAssignments,
                  requiredWorkerCount: jobRequest.numberOfWorkers,
                  conflictCount,
                  attendanceCreated: false,
                  workerCalendarCreated: false,
                  payrollCreated: false
                },
                capacityCheckedAt: input.now,
                conflictCheckedAt: input.now,
                confirmedAt: input.now,
                createdByUserId: input.actorUserId,
                confirmedByUserId: input.actorUserId,
                createdAt: input.now,
                updatedAt: input.now
              }
            });
            await recordPrismaAssignmentAudit(transaction, {
              action: "assignment.validation_passed",
              organizationId: assignment.organizationId,
              assignmentId: assignment.id,
              workerOfferId: assignment.workerOfferId,
              jobRequestId: assignment.jobRequestId,
              actorUserId: input.actorUserId,
              priorState: "pending_validation",
              newState: "confirmed",
              reason: "final_validation_passed",
              correlationId: input.correlationId,
              createdAt: input.now
            });
            await recordPrismaAssignmentAudit(transaction, {
              action: "assignment.confirmed",
              organizationId: assignment.organizationId,
              assignmentId: assignment.id,
              workerOfferId: assignment.workerOfferId,
              jobRequestId: assignment.jobRequestId,
              actorUserId: input.actorUserId,
              priorState: "pending_validation",
              newState: assignment.status,
              reason: "accepted_worker_offer_confirmed",
              correlationId: input.correlationId,
              createdAt: input.now
            });
            return { ok: true as const, assignment };
          },
          { isolationLevel: "Serializable", maxWait: 2_000, timeout: 10_000 }
        )
      );
    },

    findAssignmentById(assignmentId) {
      return prisma.assignment.findUnique({ where: { id: assignmentId } });
    },

    findAssignmentByWorkerOfferId(workerOfferId) {
      return prisma.assignment.findUnique({ where: { workerOfferId } });
    },

    listAssignments(input) {
      return prisma.assignment.findMany({
        where: {
          ...(input.dispatchReviewId ? { dispatchReviewId: input.dispatchReviewId } : {}),
          ...(input.organizationId ? { organizationId: input.organizationId } : {}),
          ...(input.workerIdentityId ? { workerIdentityId: input.workerIdentityId } : {}),
          ...(input.jobRequestId ? { jobRequestId: input.jobRequestId } : {}),
          ...(input.statuses ? { status: { in: input.statuses } } : {})
        },
        orderBy: [{ updatedAt: "desc" }, { confirmedStartAt: "asc" }]
      });
    },

    countActiveAssignmentsForJobRequest(jobRequestId) {
      return prisma.assignment.count({
        where: { jobRequestId, status: { in: activeAssignmentStates } }
      });
    },

    countConflictingAssignments(input) {
      return prisma.assignment.count({
        where: {
          workerIdentityId: input.workerIdentityId,
          status: { in: activeAssignmentStates },
          confirmedStartAt: { lt: input.endAt },
          confirmedEndAt: { gt: input.startAt },
          ...(input.excludeAssignmentId ? { id: { not: input.excludeAssignmentId } } : {})
        }
      });
    },

    async updateAssignment(input) {
      const data: Partial<UpdateAssignmentPrismaData> = {
        updatedByUserId: input.actorUserId,
        updatedAt: input.now,
        version: { increment: 1 }
      };

      if (input.status !== undefined) data.status = input.status;
      if (input.workerAcknowledgedAt !== undefined) {
        data.workerAcknowledgedAt = input.workerAcknowledgedAt;
      }
      if (input.readyForAttendanceAt !== undefined) {
        data.readyForAttendanceAt = input.readyForAttendanceAt;
      }
      if (input.attendanceWindowStartedAt !== undefined) {
        data.attendanceWindowStartedAt = input.attendanceWindowStartedAt;
      }
      if (input.attendanceHandoffAt !== undefined)
        data.attendanceHandoffAt = input.attendanceHandoffAt;
      if (input.workerWithdrawnAt !== undefined) data.workerWithdrawnAt = input.workerWithdrawnAt;
      if (input.cancelledAt !== undefined) {
        data.cancelledAt = input.cancelledAt;
        data.cancelledByUserId = input.actorUserId;
      }
      if (input.replacementRequiredAt !== undefined) {
        data.replacementRequiredAt = input.replacementRequiredAt;
      }
      if (input.closedAt !== undefined) data.closedAt = input.closedAt;
      if (input.cancellationReasonCategory !== undefined) {
        data.cancellationReasonCategory = input.cancellationReasonCategory;
      }

      const result = await prisma.assignment.updateMany({
        where: { id: input.assignmentId, version: input.expectedVersion },
        data
      });
      if (result.count !== 1) return null;

      return this.findAssignmentById(input.assignmentId);
    },

    async recordAssignmentAuditEvent(input) {
      await recordPrismaAssignmentAudit(prisma, input);
    }
  };
}

async function runAtomicAssignmentWithRetry<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isRetryableAssignmentTransactionError(error)) throw error;
      if (attempt >= 2) throw new AssignmentTransactionUnavailableError();
      await new Promise((resolve) => setTimeout(resolve, 5 * (attempt + 1)));
    }
  }
}

function isRetryableAssignmentTransactionError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const record = error as Record<string, unknown>;
  if (record.code === "P2034" || record.code === "40001" || record.code === "40P01") return true;
  const cause = record.cause;
  if (!cause || typeof cause !== "object") return false;
  const causeRecord = cause as Record<string, unknown>;
  return causeRecord.code === "40001" || causeRecord.code === "40P01";
}

type PrismaAttendanceClient = Pick<PrismaAssignmentClient, "auditActorReference" | "auditEvent"> & {
  attendanceRecord: {
    create(args: { data: CreateAttendancePrismaData }): Promise<StoredAttendanceRecord>;
    findUnique(args: {
      where: { id?: string | undefined; assignmentId?: string | undefined };
    }): Promise<StoredAttendanceRecord | null>;
    findMany(args: {
      where?: {
        organizationId?: string | undefined;
        workerIdentityId?: string | undefined;
        assignmentId?: string | undefined;
        status?: { in: readonly AttendanceStatus[] } | undefined;
      };
      orderBy: [{ updatedAt: "desc" }, { scheduledStartAt: "asc" }];
    }): Promise<StoredAttendanceRecord[]>;
    updateMany(args: {
      where: { id: string; version: number };
      data: Partial<UpdateAttendancePrismaData>;
    }): Promise<{ count: number }>;
  };
};

type CreateAttendancePrismaData = {
  assignmentId: string;
  jobRequestId: string;
  workerIdentityId: string;
  organizationId: string;
  residenceId: string;
  departmentId: string;
  workGroupId: string;
  roleDefinitionId: string;
  status: AttendanceStatus;
  scheduledStartAt: Date;
  scheduledEndAt: Date;
  timezone: string;
  assignmentStatusSnapshot: string;
  verificationMethod: string;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
};

type UpdateAttendancePrismaData = {
  status: AttendanceStatus;
  checkInAt: Date | null;
  checkInMethod: string | null;
  checkInEvidenceSummary: string | null;
  checkInLocationPolicyResult: string | null;
  checkOutAt: Date | null;
  checkOutMethod: string | null;
  checkOutEvidenceSummary: string | null;
  checkOutLocationPolicyResult: string | null;
  exceptionCategory: string | null;
  supervisorNote: string | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  updatedByUserId: string | null;
  checkedInByUserId: string | null;
  checkedOutByUserId: string | null;
  cancelledByUserId: string | null;
  updatedAt: Date;
  version: { increment: number };
};

export function createPrismaAttendanceRepository(prismaClient: unknown): AttendanceRepository {
  const prisma = prismaClient as PrismaAttendanceClient;

  return {
    createAttendanceFromAssignment(input) {
      return prisma.attendanceRecord.create({
        data: {
          assignmentId: input.assignment.id,
          jobRequestId: input.assignment.jobRequestId,
          workerIdentityId: input.assignment.workerIdentityId,
          organizationId: input.assignment.organizationId,
          residenceId: input.assignment.residenceId,
          departmentId: input.assignment.departmentId,
          workGroupId: input.assignment.workGroupId,
          roleDefinitionId: input.assignment.roleDefinitionId,
          status: "pending_start",
          scheduledStartAt: input.assignment.confirmedStartAt,
          scheduledEndAt: input.assignment.confirmedEndAt,
          timezone: input.assignment.timezone,
          assignmentStatusSnapshot: input.assignment.status,
          verificationMethod: input.verificationMethod,
          createdByUserId: input.actorUserId,
          createdAt: input.now,
          updatedAt: input.now
        }
      });
    },

    findAttendanceById(attendanceRecordId) {
      return prisma.attendanceRecord.findUnique({ where: { id: attendanceRecordId } });
    },

    findAttendanceByAssignmentId(assignmentId) {
      return prisma.attendanceRecord.findUnique({ where: { assignmentId } });
    },

    listAttendance(input) {
      return prisma.attendanceRecord.findMany({
        where: {
          ...(input.organizationId ? { organizationId: input.organizationId } : {}),
          ...(input.workerIdentityId ? { workerIdentityId: input.workerIdentityId } : {}),
          ...(input.assignmentId ? { assignmentId: input.assignmentId } : {}),
          ...(input.statuses ? { status: { in: input.statuses } } : {})
        },
        orderBy: [{ updatedAt: "desc" }, { scheduledStartAt: "asc" }]
      });
    },

    async updateAttendance(input) {
      const data: Partial<UpdateAttendancePrismaData> = {
        updatedByUserId: input.actorUserId,
        updatedAt: input.now,
        version: { increment: 1 }
      };

      if (input.status !== undefined) data.status = input.status;
      if (input.checkInAt !== undefined) data.checkInAt = input.checkInAt;
      if (input.checkInMethod !== undefined) data.checkInMethod = input.checkInMethod;
      if (input.checkInEvidenceSummary !== undefined) {
        data.checkInEvidenceSummary = input.checkInEvidenceSummary;
      }
      if (input.checkInLocationPolicyResult !== undefined) {
        data.checkInLocationPolicyResult = input.checkInLocationPolicyResult;
      }
      if (input.checkOutAt !== undefined) data.checkOutAt = input.checkOutAt;
      if (input.checkOutMethod !== undefined) data.checkOutMethod = input.checkOutMethod;
      if (input.checkOutEvidenceSummary !== undefined) {
        data.checkOutEvidenceSummary = input.checkOutEvidenceSummary;
      }
      if (input.checkOutLocationPolicyResult !== undefined) {
        data.checkOutLocationPolicyResult = input.checkOutLocationPolicyResult;
      }
      if (input.exceptionCategory !== undefined) data.exceptionCategory = input.exceptionCategory;
      if (input.supervisorNote !== undefined) data.supervisorNote = input.supervisorNote;
      if (input.completedAt !== undefined) data.completedAt = input.completedAt;
      if (input.cancelledAt !== undefined) data.cancelledAt = input.cancelledAt;
      if (input.checkedInByUserId !== undefined) {
        data.checkedInByUserId = input.checkedInByUserId;
      }
      if (input.checkedOutByUserId !== undefined) {
        data.checkedOutByUserId = input.checkedOutByUserId;
      }
      if (input.cancelledByUserId !== undefined) {
        data.cancelledByUserId = input.cancelledByUserId;
      }

      // The version guard (WHERE version = expectedVersion) is the source of truth for
      // exactly-once. Under a true two-writer race the pg adapter may raise a retryable
      // write-conflict (40001/40P01/P2034) on the guarded row instead of committing 0 rows —
      // that is the same "someone else won" outcome, so we classify it as the loser losing
      // (null) rather than a 500. This does NOT change the guard's semantics: at most one
      // writer ever commits; the loser is surfaced upstream as a version_conflict (409).
      let result: { count: number };
      try {
        result = await prisma.attendanceRecord.updateMany({
          where: { id: input.attendanceRecordId, version: input.expectedVersion },
          data
        });
      } catch (error) {
        if (isRetryableAssignmentTransactionError(error)) return null;
        throw error;
      }
      if (result.count !== 1) return null;

      return this.findAttendanceById(input.attendanceRecordId);
    },

    async recordAttendanceAuditEvent(input) {
      await recordPrismaAttendanceAudit(prisma, input);
    }
  };
}

type PrismaTimesheetClient = Pick<PrismaAttendanceClient, "auditActorReference" | "auditEvent"> & {
  timesheet: {
    create(args: { data: CreateTimesheetPrismaData }): Promise<StoredTimesheet>;
    findUnique(args: {
      where: {
        id?: string | undefined;
        assignmentId?: string | undefined;
        attendanceRecordId?: string | undefined;
      };
    }): Promise<StoredTimesheet | null>;
    findMany(args: {
      where?: {
        organizationId?: string | undefined;
        workerIdentityId?: string | undefined;
        assignmentId?: string | undefined;
        status?: { in: readonly TimesheetStatus[] } | undefined;
      };
      orderBy: [{ updatedAt: "desc" }, { scheduledStartAt: "asc" }];
    }): Promise<StoredTimesheet[]>;
    updateMany(args: {
      where: { id: string; version: number };
      data: Partial<UpdateTimesheetPrismaData>;
    }): Promise<{ count: number }>;
  };
  timesheetCalculationSnapshot: {
    create(args: {
      data: CreateTimesheetCalculationSnapshotPrismaData;
    }): Promise<StoredTimesheetCalculationSnapshot>;
    findMany(args: {
      where: { timesheetId: string };
      orderBy: { createdAt: "desc" };
    }): Promise<StoredTimesheetCalculationSnapshot[]>;
  };
};

type CreateTimesheetPrismaData = {
  assignmentId: string;
  attendanceRecordId: string;
  jobRequestId: string;
  workerIdentityId: string;
  organizationId: string;
  residenceId: string;
  departmentId: string;
  workGroupId: string;
  roleDefinitionId: string;
  status: TimesheetStatus;
  attendanceVersionSnapshot: number;
  assignmentVersionSnapshot: number;
  scheduledStartAt: Date;
  scheduledEndAt: Date;
  actualCheckInAt: Date | null;
  actualCheckOutAt: Date | null;
  timezone: string;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
};

type UpdateTimesheetPrismaData = {
  status: TimesheetStatus;
  actualCheckInAt: Date | null;
  actualCheckOutAt: Date | null;
  rawElapsedMinutes: number | null;
  payableMinutes: number | null;
  billableMinutes: number | null;
  excludedMinutes: number;
  breakMinutes: number;
  premiumCandidateMinutes: number;
  overtimeCandidateMinutes: number;
  roundingAdjustmentMinutes: number;
  exceptionSummary: string | null;
  workerReviewStatus: string;
  workerReviewedAt: Date | null;
  employerReviewStatus: string;
  employerReviewedAt: Date | null;
  platformReviewStatus: string;
  platformReviewedAt: Date | null;
  approvedAt: Date | null;
  lockedAt: Date | null;
  rejectedAt: Date | null;
  cancelledAt: Date | null;
  correctionReason: string | null;
  updatedByUserId: string | null;
  workerReviewedByUserId: string | null;
  employerReviewedByUserId: string | null;
  platformReviewedByUserId: string | null;
  lockedByUserId: string | null;
  updatedAt: Date;
  version: { increment: number };
};

type CreateTimesheetCalculationSnapshotPrismaData = {
  timesheetId: string;
  attendanceRecordId: string;
  attendanceVersionSnapshot: number;
  assignmentId: string;
  assignmentVersionSnapshot: number;
  calculationPolicyVersion: string;
  countryPackVersion: string;
  rawCheckInAt: Date;
  rawCheckOutAt: Date;
  normalizedCheckInAt: Date;
  normalizedCheckOutAt: Date;
  timezone: string;
  breakRule: string;
  roundingRule: string;
  rawElapsedMinutes: number;
  payableMinutes: number;
  billableMinutes: number;
  excludedMinutes: number;
  breakMinutes: number;
  premiumCandidateMinutes: number;
  overtimeCandidateMinutes: number;
  roundingAdjustmentMinutes: number;
  exceptionFlags: string[];
  calculationEngineVersion: string;
  createdAt: Date;
};

export function createPrismaTimesheetRepository(prismaClient: unknown): TimesheetRepository {
  const prisma = prismaClient as PrismaTimesheetClient;

  return {
    createTimesheetFromAttendance(input) {
      return prisma.timesheet.create({
        data: {
          assignmentId: input.assignment.id,
          attendanceRecordId: input.attendanceRecord.id,
          jobRequestId: input.attendanceRecord.jobRequestId,
          workerIdentityId: input.attendanceRecord.workerIdentityId,
          organizationId: input.attendanceRecord.organizationId,
          residenceId: input.attendanceRecord.residenceId,
          departmentId: input.attendanceRecord.departmentId,
          workGroupId: input.attendanceRecord.workGroupId,
          roleDefinitionId: input.attendanceRecord.roleDefinitionId,
          status: "draft",
          attendanceVersionSnapshot: input.attendanceRecord.version,
          assignmentVersionSnapshot: input.assignment.version,
          scheduledStartAt: input.attendanceRecord.scheduledStartAt,
          scheduledEndAt: input.attendanceRecord.scheduledEndAt,
          actualCheckInAt: null,
          actualCheckOutAt: null,
          timezone: input.attendanceRecord.timezone,
          createdByUserId: input.actorUserId,
          createdAt: input.now,
          updatedAt: input.now
        }
      });
    },

    findTimesheetById(timesheetId) {
      return prisma.timesheet.findUnique({ where: { id: timesheetId } });
    },

    findTimesheetByAttendanceRecordId(attendanceRecordId) {
      return prisma.timesheet.findUnique({ where: { attendanceRecordId } });
    },

    findTimesheetByAssignmentId(assignmentId) {
      return prisma.timesheet.findUnique({ where: { assignmentId } });
    },

    listTimesheets(input) {
      return prisma.timesheet.findMany({
        where: {
          ...(input.organizationId ? { organizationId: input.organizationId } : {}),
          ...(input.workerIdentityId ? { workerIdentityId: input.workerIdentityId } : {}),
          ...(input.assignmentId ? { assignmentId: input.assignmentId } : {}),
          ...(input.statuses ? { status: { in: input.statuses } } : {})
        },
        orderBy: [{ updatedAt: "desc" }, { scheduledStartAt: "asc" }]
      });
    },

    async updateTimesheet(input) {
      const data: Partial<UpdateTimesheetPrismaData> = {
        updatedByUserId: input.actorUserId,
        updatedAt: input.now,
        version: { increment: 1 }
      };

      if (input.status !== undefined) data.status = input.status;
      if (input.actualCheckInAt !== undefined) data.actualCheckInAt = input.actualCheckInAt;
      if (input.actualCheckOutAt !== undefined) data.actualCheckOutAt = input.actualCheckOutAt;
      if (input.rawElapsedMinutes !== undefined) data.rawElapsedMinutes = input.rawElapsedMinutes;
      if (input.payableMinutes !== undefined) data.payableMinutes = input.payableMinutes;
      if (input.billableMinutes !== undefined) data.billableMinutes = input.billableMinutes;
      if (input.excludedMinutes !== undefined) data.excludedMinutes = input.excludedMinutes;
      if (input.breakMinutes !== undefined) data.breakMinutes = input.breakMinutes;
      if (input.premiumCandidateMinutes !== undefined) {
        data.premiumCandidateMinutes = input.premiumCandidateMinutes;
      }
      if (input.overtimeCandidateMinutes !== undefined) {
        data.overtimeCandidateMinutes = input.overtimeCandidateMinutes;
      }
      if (input.roundingAdjustmentMinutes !== undefined) {
        data.roundingAdjustmentMinutes = input.roundingAdjustmentMinutes;
      }
      if (input.exceptionSummary !== undefined) data.exceptionSummary = input.exceptionSummary;
      if (input.workerReviewStatus !== undefined) {
        data.workerReviewStatus = input.workerReviewStatus;
      }
      if (input.workerReviewedAt !== undefined) data.workerReviewedAt = input.workerReviewedAt;
      if (input.employerReviewStatus !== undefined) {
        data.employerReviewStatus = input.employerReviewStatus;
      }
      if (input.employerReviewedAt !== undefined) {
        data.employerReviewedAt = input.employerReviewedAt;
      }
      if (input.platformReviewStatus !== undefined) {
        data.platformReviewStatus = input.platformReviewStatus;
      }
      if (input.platformReviewedAt !== undefined) {
        data.platformReviewedAt = input.platformReviewedAt;
      }
      if (input.approvedAt !== undefined) data.approvedAt = input.approvedAt;
      if (input.lockedAt !== undefined) data.lockedAt = input.lockedAt;
      if (input.rejectedAt !== undefined) data.rejectedAt = input.rejectedAt;
      if (input.cancelledAt !== undefined) data.cancelledAt = input.cancelledAt;
      if (input.correctionReason !== undefined) data.correctionReason = input.correctionReason;
      if (input.workerReviewedByUserId !== undefined) {
        data.workerReviewedByUserId = input.workerReviewedByUserId;
      }
      if (input.employerReviewedByUserId !== undefined) {
        data.employerReviewedByUserId = input.employerReviewedByUserId;
      }
      if (input.platformReviewedByUserId !== undefined) {
        data.platformReviewedByUserId = input.platformReviewedByUserId;
      }
      if (input.lockedByUserId !== undefined) data.lockedByUserId = input.lockedByUserId;

      const result = await prisma.timesheet.updateMany({
        where: { id: input.timesheetId, version: input.expectedVersion },
        data
      });
      if (result.count !== 1) return null;

      return this.findTimesheetById(input.timesheetId);
    },

    createCalculationSnapshot(input) {
      return prisma.timesheetCalculationSnapshot.create({
        data: {
          timesheetId: input.timesheet.id,
          attendanceRecordId: input.attendanceRecord.id,
          attendanceVersionSnapshot: input.attendanceRecord.version,
          assignmentId: input.assignment.id,
          assignmentVersionSnapshot: input.assignment.version,
          calculationPolicyVersion: input.calculation.calculationPolicyVersion,
          countryPackVersion: input.calculation.countryPackVersion,
          rawCheckInAt: input.calculation.rawCheckInAt,
          rawCheckOutAt: input.calculation.rawCheckOutAt,
          normalizedCheckInAt: input.calculation.normalizedCheckInAt,
          normalizedCheckOutAt: input.calculation.normalizedCheckOutAt,
          timezone: input.attendanceRecord.timezone,
          breakRule: input.calculation.breakRule,
          roundingRule: input.calculation.roundingRule,
          rawElapsedMinutes: input.calculation.rawElapsedMinutes,
          payableMinutes: input.calculation.payableMinutes,
          billableMinutes: input.calculation.billableMinutes,
          excludedMinutes: input.calculation.excludedMinutes,
          breakMinutes: input.calculation.breakMinutes,
          premiumCandidateMinutes: input.calculation.premiumCandidateMinutes,
          overtimeCandidateMinutes: input.calculation.overtimeCandidateMinutes,
          roundingAdjustmentMinutes: input.calculation.roundingAdjustmentMinutes,
          exceptionFlags: input.calculation.exceptionFlags,
          calculationEngineVersion: input.calculation.calculationEngineVersion,
          createdAt: input.now
        }
      });
    },

    listCalculationSnapshots(timesheetId) {
      return prisma.timesheetCalculationSnapshot.findMany({
        where: { timesheetId },
        orderBy: { createdAt: "desc" }
      });
    },

    async recordTimesheetAuditEvent(input) {
      await recordPrismaTimesheetAudit(prisma, input);
    }
  };
}

function resolvePasswordHashOptions(options: PasswordHashOptions) {
  return {
    costFactor:
      options.costFactor ??
      readPositiveInteger("RWOS_PASSWORD_SCRYPT_N", defaultPasswordOptions.costFactor),
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
    status: user.status,
    emailVerified: user.identities.some((identity) => Boolean(identity.emailVerifiedAt))
  };
}

function toPublicSession(
  session: Pick<StoredAuthenticationSession, "id" | "userId" | "expiresAt">
) {
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
  input: Omit<RecordAuthenticationAuditEventInput, "correlationId"> & {
    correlationId?: string | undefined;
  }
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
  return authorizationPermissionDefinitions.find(
    (permissionDefinition) => permissionDefinition.key === permissionKey
  );
}

function getAuthorizationRole(roleKey: AuthorizationRoleKey) {
  return authorizationRoleDefinitions.find((roleDefinition) => roleDefinition.key === roleKey);
}

function sanitizeAuthorizationRoles(roles: readonly AuthorizationRoleKey[]) {
  return roles.filter(
    (role, index) => authorizationRoleKeys.includes(role) && roles.indexOf(role) === index
  );
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
  return (
    decision.permission === "platform.supervise" ||
    decision.permission.startsWith("job_request.") ||
    decision.permission.startsWith("dispatch.") ||
    decision.permission.startsWith("worker_offer.") ||
    decision.permission.startsWith("assignment.") ||
    decision.permission.startsWith("attendance.") ||
    decision.permission.startsWith("timesheet.")
  );
}

function createAuthorizationCorrelationId() {
  return `authz_${randomBytes(12).toString("base64url")}`;
}

function toPublicMembership(
  membership: StoredOrganizationMembership
): PublicOrganizationMembership {
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
  return (
    [
      membership.acceptedAt,
      membership.suspendedAt,
      membership.revokedAt,
      membership.expiredAt,
      membership.createdAt
    ]
      .filter((timestamp): timestamp is Date => Boolean(timestamp))
      .sort((left, right) => right.getTime() - left.getTime())[0] ?? membership.createdAt
  );
}

async function assertMembershipBelongsToUser(
  repository: OrganizationMembershipRepository,
  userId: string,
  membershipId: string
) {
  const membership = await repository.findMembershipById(membershipId);

  if (!membership || membership.userId !== userId) {
    throw new OrganizationMembershipError(
      membershipDeny("membership_missing", "membership_not_found", null, null, [])
    );
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
    auditAction: Parameters<
      OrganizationMembershipRepository["recordMembershipAuditEvent"]
    >[0]["action"];
    now: Date;
  }
) {
  const membership = await assertMembershipBelongsToUser(
    repository,
    input.userId,
    input.membershipId
  );
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
    return membershipDeny(
      "membership_expired",
      "membership_expired",
      publicMembership,
      membership.organizationId,
      roles
    );
  }

  if (membership.status !== "active") {
    return membershipDeny(
      `membership_${membership.status}`,
      `membership_${membership.status}`,
      publicMembership,
      membership.organizationId,
      roles
    );
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
  if (
    status === "membership_invited" ||
    status === "membership_suspended" ||
    status === "membership_revoked"
  ) {
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
  input: Omit<
    Parameters<OrganizationMembershipRepository["recordMembershipAuditEvent"]>[0],
    "correlationId"
  > & {
    correlationId?: string | undefined;
  }
) {
  await repository.recordMembershipAuditEvent({
    ...input,
    correlationId: input.correlationId ?? createMembershipCorrelationId()
  });
}

async function resolveMembershipAccessRoles(
  prisma: PrismaMembershipClient,
  accessRoleKeys: readonly AuthorizationRoleKey[]
) {
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

function toPublicOrganization(
  organization: StoredEmployerOrganization
): PublicEmployerOrganization {
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

  if (
    organizationBlocksOrdinaryOperations(input.organization.status) &&
    !input.allowInactiveSelfStatusChange
  ) {
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
  input: Omit<
    Parameters<EmployerOrganizationRepository["recordOrganizationAuditEvent"]>[0],
    "correlationId"
  > & {
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

const residenceStatuses = [
  "draft",
  "active",
  "restricted",
  "inactive",
  "closed"
] as const satisfies readonly ResidenceStatus[];

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
  const organization = await input.organizationRepository.findOrganizationById(
    input.organizationId
  );

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
      const decision = residenceDeny(
        "not_found",
        "residence_not_found",
        null,
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

    if (
      residenceBlocksOrdinaryUpdates(input.residence.status) &&
      !input.allowInactiveResidenceRead &&
      !input.allowInactiveResidenceStatusChange
    ) {
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
    const decision = residenceDeny(
      "not_found",
      "residence_not_found",
      null,
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

function isAllowedResidenceTransition(
  current: ResidenceStatus,
  next: Extract<ResidenceStatus, "active" | "inactive" | "closed">
) {
  if (current === "closed") return false;
  if (next === "active") return current === "inactive" || current === "draft";
  if (next === "inactive") return current === "active";
  if (next === "closed")
    return current === "active" || current === "inactive" || current === "draft";

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
    organizationId:
      input.decision.organization?.id ?? input.decision.residence?.organizationId ?? null,
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

const departmentStatuses = [
  "draft",
  "active",
  "restricted",
  "inactive",
  "closed"
] as const satisfies readonly DepartmentStatus[];

function toPublicDepartment(department: StoredDepartment): PublicDepartment {
  return {
    id: department.id,
    publicId: department.publicId,
    organizationId: department.organizationId,
    residenceId: department.residenceId,
    name: department.name,
    status: department.status,
    createdByUserId: department.createdByUserId,
    createdAt: department.createdAt,
    updatedAt: department.updatedAt,
    archivedAt: department.archivedAt,
    version: department.updatedAt.toISOString()
  };
}

async function authorizeDepartmentOperation(input: {
  departmentRepository: DepartmentRepository;
  residenceRepository: ResidenceRepository;
  organizationRepository: EmployerOrganizationRepository;
  membershipService: OrganizationMembershipService;
  authorizationService: AuthorizationService;
  actorUserId: string;
  organizationId: string;
  residenceId: string;
  department: StoredDepartment | null;
  permission: AuthorizationPermissionKey;
  correlationId?: string | undefined;
  now: Date;
  allowInactiveResidenceRead?: boolean | undefined;
  allowInactiveDepartmentRead?: boolean | undefined;
  allowInactiveDepartmentStatusChange?: boolean | undefined;
}): Promise<DepartmentDecision> {
  const organization = await input.organizationRepository.findOrganizationById(
    input.organizationId
  );

  if (!organization) {
    const decision = departmentDeny(
      "not_found",
      "organization_not_found",
      null,
      null,
      null,
      null,
      []
    );
    await auditDepartmentDenial(input.departmentRepository, {
      decision,
      actorUserId: input.actorUserId,
      correlationId: input.correlationId,
      createdAt: input.now
    });
    return decision;
  }

  const organizationPublic = toPublicOrganization(organization);
  const residence = await input.residenceRepository.findResidenceById(input.residenceId);
  const residencePublic = residence ? toPublicResidence(residence) : null;
  const membershipDecision = await input.membershipService.selectOrganizationContext({
    userId: input.actorUserId,
    organizationId: input.organizationId,
    ...(input.correlationId ? { correlationId: input.correlationId } : {})
  });

  if (!membershipDecision.allow || !membershipDecision.membership) {
    const decision = departmentDeny(
      "membership_denied",
      membershipDecision.internalReason ?? "membership_denied",
      input.department ? toPublicDepartment(input.department) : null,
      residencePublic,
      organizationPublic,
      membershipDecision.membership,
      membershipDecision.roles
    );
    await auditDepartmentDenial(input.departmentRepository, {
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
        publicId: "department_context_user",
        emailNormalized: "department-context@example.invalid",
        displayName: null,
        status: "active"
      },
      session: {
        id: "department-context-session",
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
    const decision = departmentDeny(
      "permission_denied",
      authorizationDecision.internalReason ?? "permission_denied",
      input.department ? toPublicDepartment(input.department) : null,
      residencePublic,
      organizationPublic,
      membershipDecision.membership,
      membershipDecision.roles
    );
    await auditDepartmentDenial(input.departmentRepository, {
      decision,
      actorUserId: input.actorUserId,
      correlationId: input.correlationId,
      createdAt: input.now
    });
    return decision;
  }

  if (organizationBlocksOrdinaryOperations(organization.status)) {
    const decision = departmentDeny(
      "organization_inactive",
      `organization_${organization.status}`,
      input.department ? toPublicDepartment(input.department) : null,
      residencePublic,
      organizationPublic,
      membershipDecision.membership,
      membershipDecision.roles
    );
    await auditDepartmentDenial(input.departmentRepository, {
      decision,
      actorUserId: input.actorUserId,
      correlationId: input.correlationId,
      createdAt: input.now
    });
    return decision;
  }

  if (!residence || residence.organizationId !== input.organizationId) {
    const decision = departmentDeny(
      "not_found",
      "residence_not_found",
      null,
      null,
      organizationPublic,
      membershipDecision.membership,
      membershipDecision.roles
    );
    await auditDepartmentDenial(input.departmentRepository, {
      decision,
      actorUserId: input.actorUserId,
      correlationId: input.correlationId,
      createdAt: input.now
    });
    return decision;
  }

  if (residenceBlocksOrdinaryUpdates(residence.status) && !input.allowInactiveResidenceRead) {
    const decision = departmentDeny(
      "residence_inactive",
      `residence_${residence.status}`,
      input.department ? toPublicDepartment(input.department) : null,
      residencePublic,
      organizationPublic,
      membershipDecision.membership,
      membershipDecision.roles
    );
    await auditDepartmentDenial(input.departmentRepository, {
      decision,
      actorUserId: input.actorUserId,
      correlationId: input.correlationId,
      createdAt: input.now
    });
    return decision;
  }

  if (input.department) {
    if (
      input.department.organizationId !== input.organizationId ||
      input.department.residenceId !== input.residenceId
    ) {
      const decision = departmentDeny(
        "not_found",
        "department_not_found",
        null,
        residencePublic,
        organizationPublic,
        membershipDecision.membership,
        membershipDecision.roles
      );
      await auditDepartmentDenial(input.departmentRepository, {
        decision,
        actorUserId: input.actorUserId,
        correlationId: input.correlationId,
        createdAt: input.now
      });
      return decision;
    }

    if (
      departmentBlocksOrdinaryUpdates(input.department.status) &&
      !input.allowInactiveDepartmentRead &&
      !input.allowInactiveDepartmentStatusChange
    ) {
      const decision = departmentDeny(
        "department_inactive",
        `department_${input.department.status}`,
        toPublicDepartment(input.department),
        residencePublic,
        organizationPublic,
        membershipDecision.membership,
        membershipDecision.roles
      );
      await auditDepartmentDenial(input.departmentRepository, {
        decision,
        actorUserId: input.actorUserId,
        correlationId: input.correlationId,
        createdAt: input.now
      });
      return decision;
    }
  } else if (input.permission !== "department.create" && input.permission !== "department.read") {
    const decision = departmentDeny(
      "not_found",
      "department_not_found",
      null,
      residencePublic,
      organizationPublic,
      membershipDecision.membership,
      membershipDecision.roles
    );
    await auditDepartmentDenial(input.departmentRepository, {
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
    department: input.department ? toPublicDepartment(input.department) : null,
    residence: residencePublic,
    organization: organizationPublic,
    membership: membershipDecision.membership,
    roles: membershipDecision.roles,
    internalReason: null,
    externalCode: null,
    externalMessage: null
  };
}

function departmentBlocksOrdinaryUpdates(status: DepartmentStatus) {
  return status === "closed" || status === "inactive" || status === "restricted";
}

function isAllowedDepartmentTransition(
  current: DepartmentStatus,
  next: Extract<DepartmentStatus, "active" | "inactive" | "closed">
) {
  if (current === "closed") return false;
  if (next === "active") return current === "inactive" || current === "draft";
  if (next === "inactive") return current === "active";
  if (next === "closed")
    return current === "active" || current === "inactive" || current === "draft";

  return false;
}

function departmentDeny(
  status: Exclude<DepartmentDecisionStatus, "allow">,
  internalReason: string,
  department: PublicDepartment | null,
  residence: PublicResidence | null,
  organization: PublicEmployerOrganization | null,
  membership: PublicOrganizationMembership | null,
  roles: readonly AuthorizationRoleKey[]
): DepartmentDecision {
  return {
    status,
    allow: false,
    department,
    residence,
    organization,
    membership,
    roles,
    internalReason,
    externalCode: authorizationDeniedCode,
    externalMessage: authorizationDeniedMessage
  };
}

async function auditDepartmentDenial(
  repository: DepartmentRepository,
  input: {
    decision: DepartmentDecision;
    actorUserId: string | null;
    correlationId?: string | undefined;
    createdAt: Date;
  }
) {
  await recordDepartmentAudit(repository, {
    action: "department.access_denied",
    organizationId:
      input.decision.organization?.id ??
      input.decision.department?.organizationId ??
      input.decision.residence?.organizationId ??
      null,
    residenceId: input.decision.residence?.id ?? input.decision.department?.residenceId ?? null,
    departmentId: input.decision.department?.id ?? null,
    actorUserId: input.actorUserId,
    priorState: input.decision.department?.status ?? null,
    newState: "denied",
    reason: input.decision.internalReason,
    correlationId: input.correlationId,
    createdAt: input.createdAt
  });
}

async function recordDepartmentAudit(
  repository: DepartmentRepository,
  input: Omit<
    Parameters<DepartmentRepository["recordDepartmentAuditEvent"]>[0],
    "correlationId"
  > & {
    correlationId?: string | undefined;
  }
) {
  await repository.recordDepartmentAuditEvent({
    ...input,
    correlationId: input.correlationId ?? createDepartmentCorrelationId()
  });
}

async function recordPrismaDepartmentAudit(
  prisma: Pick<PrismaDepartmentClient, "auditActorReference" | "auditEvent">,
  input: Parameters<DepartmentRepository["recordDepartmentAuditEvent"]>[0]
) {
  const actorReference = await prisma.auditActorReference.create({
    data: {
      actorType: input.actorUserId ? "user" : "system",
      ...(input.actorUserId ? { userId: input.actorUserId } : {}),
      ...(input.organizationId ? { organizationId: input.organizationId } : {}),
      displayLabel: input.actorUserId ? "Department actor" : "Department boundary"
    }
  });

  await prisma.auditEvent.create({
    data: {
      actorReferenceId: actorReference.id,
      organizationId: input.organizationId,
      entityType: "department",
      entityId: input.departmentId ?? nilEntityId,
      entityPublicReference: input.departmentId,
      action: input.action,
      priorState: input.priorState,
      newState: input.newState,
      reason: input.reason,
      source: "api",
      correlationId: input.correlationId,
      policyVersion: "department-foundation-v1",
      createdAt: input.createdAt
    }
  });
}

function normalizeDepartmentText(value: string, minLength: number, maxLength: number) {
  const normalized = value.trim().replace(/\s+/g, " ");

  return normalized.length >= minLength && normalized.length <= maxLength ? normalized : "";
}

function parseDepartmentVersion(version: string) {
  const parsed = new Date(version);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function createPublicDepartmentId() {
  return `dept_${randomBytes(12).toString("base64url")}`;
}

function createDepartmentCorrelationId() {
  return `department_${randomBytes(12).toString("base64url")}`;
}

function toPublicWorkGroup(workGroup: StoredWorkGroup): PublicWorkGroup {
  return {
    id: workGroup.id,
    slug: workGroupKeyToSlug(workGroup.key),
    displayLabel: workGroup.displayLabel,
    status: workGroup.status,
    displayOrder: workGroup.displayOrder,
    iconKey: workGroup.iconKey,
    qualificationSummary: workGroup.qualificationSummary,
    safetyRequirementSummary: workGroup.safetyRequirementSummary,
    defaultTemplateKey: workGroup.defaultTemplateKey,
    createdAt: workGroup.createdAt,
    updatedAt: workGroup.updatedAt,
    version: workGroup.updatedAt.toISOString()
  };
}

async function authorizeWorkGroupOperation(input: {
  workGroupRepository: WorkGroupRepository;
  authorizationService: AuthorizationService;
  session: SessionValidationResult;
  roles: readonly AuthorizationRoleKey[];
  permission: AuthorizationPermissionKey;
  workGroup?: StoredWorkGroup | null;
  platform?: boolean | undefined;
  correlationId?: string | undefined;
  now: Date;
}): Promise<WorkGroupDecision> {
  const decision = await input.authorizationService.decide({
    session: input.session,
    roles: input.roles,
    permission: input.permission,
    platformContext: { platform: input.platform === true },
    ...(input.correlationId ? { correlationId: input.correlationId } : {})
  });

  if (!decision.allow) {
    const workGroupDecision = workGroupDeny(
      "permission_denied",
      decision.internalReason ?? "permission_denied",
      input.workGroup ? toPublicWorkGroup(input.workGroup) : null,
      input.roles
    );
    await auditWorkGroupDenial(input.workGroupRepository, {
      decision: workGroupDecision,
      actorUserId: input.session.user?.id ?? null,
      correlationId: input.correlationId,
      createdAt: input.now
    });
    return workGroupDecision;
  }

  return {
    status: "allow",
    allow: true,
    workGroup: input.workGroup ? toPublicWorkGroup(input.workGroup) : null,
    roles: input.roles,
    internalReason: null,
    externalCode: null,
    externalMessage: null
  };
}

function isAllowedWorkGroupTransition(
  current: WorkGroupStatus,
  next: Extract<WorkGroupStatus, "active" | "inactive">
) {
  if (current === "retired") return false;
  if (next === "active") return current === "inactive";
  if (next === "inactive") return current === "active";

  return false;
}

function workGroupDeny(
  status: Exclude<WorkGroupDecisionStatus, "allow">,
  internalReason: string,
  workGroup: PublicWorkGroup | null,
  roles: readonly AuthorizationRoleKey[]
): WorkGroupDecision {
  return {
    status,
    allow: false,
    workGroup,
    roles,
    internalReason,
    externalCode: authorizationDeniedCode,
    externalMessage: authorizationDeniedMessage
  };
}

async function auditWorkGroupDenial(
  repository: WorkGroupRepository,
  input: {
    decision: WorkGroupDecision;
    actorUserId: string | null;
    correlationId?: string | undefined;
    createdAt: Date;
  }
) {
  await recordWorkGroupAudit(repository, {
    action: "work_group.access_denied",
    workGroupId: input.decision.workGroup?.id ?? null,
    actorUserId: input.actorUserId,
    priorState: input.decision.workGroup?.status ?? null,
    newState: "denied",
    reason: input.decision.internalReason,
    correlationId: input.correlationId,
    createdAt: input.createdAt
  });
}

async function recordWorkGroupAudit(
  repository: WorkGroupRepository,
  input: Omit<Parameters<WorkGroupRepository["recordWorkGroupAuditEvent"]>[0], "correlationId"> & {
    correlationId?: string | undefined;
  }
) {
  await repository.recordWorkGroupAuditEvent({
    ...input,
    correlationId: input.correlationId ?? createWorkGroupCorrelationId()
  });
}

async function recordPrismaWorkGroupAudit(
  prisma: Pick<PrismaWorkGroupClient, "auditActorReference" | "auditEvent">,
  input: Parameters<WorkGroupRepository["recordWorkGroupAuditEvent"]>[0]
) {
  const actorReference = await prisma.auditActorReference.create({
    data: {
      actorType: input.actorUserId ? "user" : "system",
      ...(input.actorUserId ? { userId: input.actorUserId } : {}),
      displayLabel: input.actorUserId ? "WorkGroup actor" : "WorkGroup boundary"
    }
  });

  await prisma.auditEvent.create({
    data: {
      actorReferenceId: actorReference.id,
      organizationId: null,
      entityType: "work_group",
      entityId: input.workGroupId ?? nilEntityId,
      entityPublicReference: input.workGroupId,
      action: input.action,
      priorState: input.priorState,
      newState: input.newState,
      reason: input.reason,
      source: "api",
      correlationId: input.correlationId,
      policyVersion: "work-groups-foundation-v1",
      createdAt: input.createdAt
    }
  });
}

function toPublicRoleDefinition(roleDefinition: StoredRoleDefinition): PublicRoleDefinition {
  return {
    id: roleDefinition.id,
    workGroupId: roleDefinition.workGroupId,
    workGroupSlug: workGroupKeyToSlug(roleDefinition.workGroup.key),
    code: roleDefinitionKeyToCode(roleDefinition.key),
    slug: roleDefinitionKeyToSlug(roleDefinition.key),
    displayLabel: roleDefinition.displayLabel,
    status: roleDefinition.status,
    displayOrder: roleDefinition.displayOrder,
    localizedLabelKey: roleDefinition.localizedLabelKey,
    qualificationSummary: roleDefinition.qualificationSummary,
    safetyRequirementSummary: roleDefinition.safetyRequirementSummary,
    adminConfigurable: roleDefinition.adminConfigurable,
    createdAt: roleDefinition.createdAt,
    updatedAt: roleDefinition.updatedAt,
    version: roleDefinition.updatedAt.toISOString()
  };
}

async function authorizeRoleDefinitionOperation(input: {
  roleDefinitionRepository: RoleDefinitionRepository;
  authorizationService: AuthorizationService;
  session: SessionValidationResult;
  roles: readonly AuthorizationRoleKey[];
  permission: AuthorizationPermissionKey;
  roleDefinition?: StoredRoleDefinition | null;
  platform?: boolean | undefined;
  correlationId?: string | undefined;
  now: Date;
}): Promise<RoleDefinitionDecision> {
  const decision = await input.authorizationService.decide({
    session: input.session,
    roles: input.roles,
    permission: input.permission,
    platformContext: { platform: input.platform === true },
    ...(input.correlationId ? { correlationId: input.correlationId } : {})
  });

  if (!decision.allow) {
    const roleDefinitionDecision = roleDefinitionDeny(
      "permission_denied",
      decision.internalReason ?? "permission_denied",
      input.roleDefinition ? toPublicRoleDefinition(input.roleDefinition) : null,
      input.roles
    );

    await auditRoleDefinitionDenial(input.roleDefinitionRepository, {
      decision: roleDefinitionDecision,
      actorUserId: input.session.user?.id ?? null,
      correlationId: input.correlationId,
      createdAt: input.now
    });

    return roleDefinitionDecision;
  }

  return {
    status: "allow",
    allow: true,
    roleDefinition: input.roleDefinition ? toPublicRoleDefinition(input.roleDefinition) : null,
    roles: input.roles,
    internalReason: null,
    externalCode: null,
    externalMessage: null
  };
}

function roleDefinitionDeny(
  status: RoleDefinitionDecisionStatus,
  internalReason: string,
  roleDefinition: PublicRoleDefinition | null,
  roles: readonly AuthorizationRoleKey[]
): RoleDefinitionDecision {
  return {
    status,
    allow: false,
    roleDefinition,
    roles,
    internalReason,
    externalCode: authorizationDeniedCode,
    externalMessage: authorizationDeniedMessage
  };
}

function isAllowedRoleDefinitionTransition(
  current: RoleDefinitionStatus,
  next: Extract<RoleDefinitionStatus, "active" | "inactive">
) {
  if (current === "retired") return false;
  return current !== next;
}

async function auditRoleDefinitionDenial(
  repository: RoleDefinitionRepository,
  input: {
    decision: RoleDefinitionDecision;
    actorUserId: string | null;
    correlationId?: string | undefined;
    createdAt: Date;
  }
) {
  await recordRoleDefinitionAudit(repository, {
    action: "role_definition.access_denied",
    roleDefinitionId: input.decision.roleDefinition?.id ?? null,
    workGroupId: input.decision.roleDefinition?.workGroupId ?? null,
    actorUserId: input.actorUserId,
    priorState: input.decision.roleDefinition?.status ?? null,
    newState: "denied",
    reason: input.decision.internalReason,
    correlationId: input.correlationId,
    createdAt: input.createdAt
  });
}

async function recordRoleDefinitionAudit(
  repository: RoleDefinitionRepository,
  input: Omit<
    Parameters<RoleDefinitionRepository["recordRoleDefinitionAuditEvent"]>[0],
    "correlationId"
  > & {
    correlationId?: string | undefined;
  }
) {
  await repository.recordRoleDefinitionAuditEvent({
    ...input,
    correlationId: input.correlationId ?? createRoleDefinitionCorrelationId()
  });
}

async function recordPrismaRoleDefinitionAudit(
  prisma: Pick<PrismaRoleDefinitionClient, "auditActorReference" | "auditEvent">,
  input: Parameters<RoleDefinitionRepository["recordRoleDefinitionAuditEvent"]>[0]
) {
  const actorReference = await prisma.auditActorReference.create({
    data: {
      actorType: input.actorUserId ? "user" : "system",
      ...(input.actorUserId ? { userId: input.actorUserId } : {}),
      displayLabel: input.actorUserId ? "RoleDefinition actor" : "RoleDefinition boundary"
    }
  });

  await prisma.auditEvent.create({
    data: {
      actorReferenceId: actorReference.id,
      organizationId: null,
      entityType: "role_definition",
      entityId: input.roleDefinitionId ?? nilEntityId,
      entityPublicReference: input.roleDefinitionId,
      action: input.action,
      priorState: input.priorState,
      newState: input.newState,
      reason: input.reason,
      source: "api",
      correlationId: input.correlationId,
      policyVersion: "role-definitions-foundation-v1",
      createdAt: input.createdAt
    }
  });
}

function workGroupKeyToSlug(key: string) {
  return key.replace(/_/g, "-");
}

function workGroupSlugToKey(slug: string) {
  return slug.trim().toLowerCase().replace(/-/g, "_");
}

function normalizeCatalogueText(value: string, minLength: number, maxLength: number) {
  const normalized = value.trim().replace(/\s+/g, " ");

  return normalized.length >= minLength && normalized.length <= maxLength ? normalized : "";
}

function parseWorkGroupVersion(version: string) {
  return parseCatalogueVersion(version);
}

function parseCatalogueVersion(version: string) {
  const parsed = new Date(version);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function createWorkGroupCorrelationId() {
  return `work_group_${randomBytes(12).toString("base64url")}`;
}

function roleDefinitionKeyToCode(key: string) {
  return key.trim().toUpperCase();
}

function roleDefinitionKeyToSlug(key: string) {
  return key.trim().toLowerCase().replace(/_/g, "-");
}

function roleDefinitionIdentifierToKey(identifier: string) {
  return identifier.trim().toLowerCase().replace(/-/g, "_");
}

function createRoleDefinitionCorrelationId() {
  return `role_definition_${randomBytes(12).toString("base64url")}`;
}

type JobRequestParentDecision = JobRequestDecision & {
  workGroup?: StoredWorkGroup | undefined;
  roleDefinition?: StoredRoleDefinition | undefined;
};

function currentTimeFrom(now: () => Date) {
  return now();
}

function toPublicJobRequest(jobRequest: StoredJobRequest): PublicJobRequest {
  return {
    ...jobRequest,
    versionToken: jobRequest.version
  };
}

function jobRequestDeny(
  status: Exclude<JobRequestDecisionStatus, "allow">,
  internalReason: string,
  jobRequest: PublicJobRequest | null,
  roles: readonly AuthorizationRoleKey[],
  organization: PublicEmployerOrganization | null,
  membership: PublicOrganizationMembership | null
): JobRequestDecision {
  return {
    status,
    allow: false,
    jobRequest,
    organization,
    membership,
    roles,
    internalReason,
    externalCode: authorizationDeniedCode,
    externalMessage: authorizationDeniedMessage
  };
}

async function authorizeJobRequestEmployerOperation(input: {
  organizationRepository: EmployerOrganizationRepository;
  jobRequestRepository: JobRequestRepository;
  membershipService: OrganizationMembershipService;
  authorizationService: AuthorizationService;
  actorUserId: string;
  organizationId: string;
  permission: AuthorizationPermissionKey;
  jobRequest?: StoredJobRequest | null | undefined;
  correlationId?: string | undefined;
  now: Date;
}): Promise<JobRequestDecision> {
  const organization = await input.organizationRepository.findOrganizationById(
    input.organizationId
  );

  if (!organization) {
    const decision = jobRequestDeny(
      "not_found",
      "organization_not_found",
      input.jobRequest ? toPublicJobRequest(input.jobRequest) : null,
      [],
      null,
      null
    );
    await auditJobRequestDenial(input.jobRequestRepository, {
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
    const decision = jobRequestDeny(
      "membership_denied",
      membershipDecision.internalReason ?? "membership_denied",
      input.jobRequest ? toPublicJobRequest(input.jobRequest) : null,
      membershipDecision.roles,
      organizationPublic,
      membershipDecision.membership
    );
    await auditJobRequestDenial(input.jobRequestRepository, {
      decision,
      actorUserId: input.actorUserId,
      correlationId: input.correlationId,
      createdAt: input.now
    });
    return decision;
  }

  if (organizationBlocksOrdinaryOperations(organization.status)) {
    const decision = jobRequestDeny(
      "organization_inactive",
      `organization_${organization.status}`,
      input.jobRequest ? toPublicJobRequest(input.jobRequest) : null,
      membershipDecision.roles,
      organizationPublic,
      membershipDecision.membership
    );
    await auditJobRequestDenial(input.jobRequestRepository, {
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
        publicId: "job-request-context-user",
        emailNormalized: "job-request-context@example.invalid",
        displayName: null,
        status: "active"
      },
      session: {
        id: "job-request-context-session",
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
    const decision = jobRequestDeny(
      "permission_denied",
      authorizationDecision.internalReason ?? "permission_denied",
      input.jobRequest ? toPublicJobRequest(input.jobRequest) : null,
      membershipDecision.roles,
      organizationPublic,
      membershipDecision.membership
    );
    await auditJobRequestDenial(input.jobRequestRepository, {
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
    jobRequest: input.jobRequest ? toPublicJobRequest(input.jobRequest) : null,
    organization: organizationPublic,
    membership: membershipDecision.membership,
    roles: membershipDecision.roles,
    internalReason: null,
    externalCode: null,
    externalMessage: null
  };
}

async function authorizeJobRequestPlatformOperation(input: {
  jobRequestRepository: JobRequestRepository;
  authorizationService: AuthorizationService;
  session: SessionValidationResult;
  roles: readonly AuthorizationRoleKey[];
  permission: AuthorizationPermissionKey;
  jobRequest?: StoredJobRequest | null | undefined;
  correlationId?: string | undefined;
  now: Date;
}): Promise<JobRequestDecision> {
  const authorizationDecision = await input.authorizationService.decide({
    session: input.session,
    roles: input.roles,
    permission: input.permission,
    platformContext: { platform: true },
    ...(input.correlationId ? { correlationId: input.correlationId } : {})
  });

  if (!authorizationDecision.allow) {
    const decision = jobRequestDeny(
      "permission_denied",
      authorizationDecision.internalReason ?? "permission_denied",
      input.jobRequest ? toPublicJobRequest(input.jobRequest) : null,
      input.roles,
      null,
      null
    );
    await auditJobRequestDenial(input.jobRequestRepository, {
      decision,
      actorUserId: input.session.user?.id ?? null,
      correlationId: input.correlationId,
      createdAt: input.now
    });
    return decision;
  }

  return {
    status: "allow",
    allow: true,
    jobRequest: input.jobRequest ? toPublicJobRequest(input.jobRequest) : null,
    organization: null,
    membership: null,
    roles: input.roles,
    internalReason: null,
    externalCode: null,
    externalMessage: null
  };
}

async function validateJobRequestParents(input: {
  organization: PublicEmployerOrganization;
  residenceRepository: ResidenceRepository;
  departmentRepository: DepartmentRepository;
  workGroupRepository: WorkGroupRepository;
  roleDefinitionRepository: RoleDefinitionRepository;
  residenceId: string;
  departmentId: string;
  workGroupSlug: string;
  roleDefinitionIdentifier: string;
  requireActiveParents: boolean;
  roles: readonly AuthorizationRoleKey[];
}): Promise<JobRequestParentDecision> {
  const residence = await input.residenceRepository.findResidenceById(input.residenceId);
  if (!residence || residence.organizationId !== input.organization.id) {
    return jobRequestDeny(
      "parent_mismatch",
      "residence_not_in_organization",
      null,
      input.roles,
      input.organization,
      null
    );
  }

  if (input.requireActiveParents && residence.status !== "active") {
    return jobRequestDeny(
      "residence_inactive",
      `residence_${residence.status}`,
      null,
      input.roles,
      input.organization,
      null
    );
  }

  const department = await input.departmentRepository.findDepartmentById(input.departmentId);
  if (
    !department ||
    department.organizationId !== input.organization.id ||
    department.residenceId !== residence.id
  ) {
    return jobRequestDeny(
      "parent_mismatch",
      "department_not_in_residence",
      null,
      input.roles,
      input.organization,
      null
    );
  }

  if (input.requireActiveParents && department.status !== "active") {
    return jobRequestDeny(
      "department_inactive",
      `department_${department.status}`,
      null,
      input.roles,
      input.organization,
      null
    );
  }

  const workGroup = await input.workGroupRepository.findWorkGroupByKey(
    workGroupSlugToKey(input.workGroupSlug)
  );
  if (!workGroup) {
    return jobRequestDeny(
      "not_found",
      "work_group_not_found",
      null,
      input.roles,
      input.organization,
      null
    );
  }

  if (input.requireActiveParents && workGroup.status !== "active") {
    return jobRequestDeny(
      "catalogue_inactive",
      `work_group_${workGroup.status}`,
      null,
      input.roles,
      input.organization,
      null
    );
  }

  const roleDefinition = await input.roleDefinitionRepository.findRoleDefinitionByKey(
    roleDefinitionIdentifierToKey(input.roleDefinitionIdentifier)
  );
  if (!roleDefinition) {
    return jobRequestDeny(
      "not_found",
      "role_definition_not_found",
      null,
      input.roles,
      input.organization,
      null
    );
  }

  if (roleDefinition.workGroupId !== workGroup.id) {
    return jobRequestDeny(
      "parent_mismatch",
      "role_definition_not_in_work_group",
      null,
      input.roles,
      input.organization,
      null
    );
  }

  if (input.requireActiveParents && roleDefinition.status !== "active") {
    return jobRequestDeny(
      "catalogue_inactive",
      `role_definition_${roleDefinition.status}`,
      null,
      input.roles,
      input.organization,
      null
    );
  }

  return {
    status: "allow",
    allow: true,
    jobRequest: null,
    organization: input.organization,
    membership: null,
    roles: input.roles,
    internalReason: null,
    externalCode: null,
    externalMessage: null,
    workGroup,
    roleDefinition
  };
}

async function transitionEmployerJobRequest(input: {
  jobRequestRepository: JobRequestRepository;
  organizationRepository: EmployerOrganizationRepository;
  membershipService: OrganizationMembershipService;
  authorizationService: AuthorizationService;
  actorUserId: string;
  organizationId: string;
  jobRequestId: string;
  expectedVersion: number;
  permission: AuthorizationPermissionKey;
  allowedFrom: readonly JobRequestStatus[];
  nextStatus: JobRequestStatus;
  action: Parameters<JobRequestRepository["recordJobRequestAuditEvent"]>[0]["action"];
  reason?: string | undefined;
  correlationId?: string | undefined;
  now: Date;
}) {
  const jobRequest = await input.jobRequestRepository.findJobRequestById(input.jobRequestId);
  const authorization = await authorizeJobRequestEmployerOperation({
    organizationRepository: input.organizationRepository,
    jobRequestRepository: input.jobRequestRepository,
    membershipService: input.membershipService,
    authorizationService: input.authorizationService,
    actorUserId: input.actorUserId,
    organizationId: input.organizationId,
    permission: input.permission,
    jobRequest,
    correlationId: input.correlationId,
    now: input.now
  });

  if (!authorization.allow || !jobRequest || jobRequest.organizationId !== input.organizationId) {
    throw new JobRequestError(
      authorization.allow
        ? jobRequestDeny(
            "not_found",
            "job_request_not_found",
            null,
            authorization.roles,
            authorization.organization,
            authorization.membership
          )
        : authorization
    );
  }

  if (!input.allowedFrom.includes(jobRequest.status)) {
    throw new JobRequestError(
      jobRequestDeny(
        "invalid_transition",
        `cannot_transition_from_${jobRequest.status}_to_${input.nextStatus}`,
        toPublicJobRequest(jobRequest),
        authorization.roles,
        authorization.organization,
        authorization.membership
      )
    );
  }

  const priorStatus = jobRequest.status;
  const reason =
    input.reason === undefined ? null : normalizeRequiredJobRequestText(input.reason, 2, 1000);
  if (input.reason !== undefined && !reason) {
    throw new JobRequestError(
      jobRequestDeny(
        "invalid_input",
        "transition_reason_required",
        toPublicJobRequest(jobRequest),
        authorization.roles,
        authorization.organization,
        authorization.membership
      )
    );
  }

  const updated = await input.jobRequestRepository.transitionJobRequest({
    jobRequestId: jobRequest.id,
    expectedVersion: input.expectedVersion,
    actorUserId: input.actorUserId,
    status: input.nextStatus,
    adminReviewReason: input.nextStatus === "submitted" ? null : reason,
    now: input.now
  });

  if (!updated) {
    throw new JobRequestError(
      jobRequestDeny(
        "version_conflict",
        "stale_version",
        toPublicJobRequest(jobRequest),
        authorization.roles,
        authorization.organization,
        authorization.membership
      )
    );
  }

  const action =
    input.action === "job_request.submitted" && priorStatus === "information_required"
      ? "job_request.resubmitted"
      : input.action;
  await recordJobRequestAudit(input.jobRequestRepository, {
    action,
    organizationId: updated.organizationId,
    jobRequestId: updated.id,
    jobRequestNumber: updated.jobRequestNumber,
    actorUserId: input.actorUserId,
    priorState: priorStatus,
    newState: updated.status,
    reason,
    correlationId: input.correlationId,
    createdAt: input.now
  });

  return toPublicJobRequest(updated);
}

async function transitionPlatformJobRequest(input: {
  jobRequestRepository: JobRequestRepository;
  authorizationService: AuthorizationService;
  session: SessionValidationResult;
  roles: readonly AuthorizationRoleKey[];
  jobRequestId: string;
  expectedVersion: number;
  permission: AuthorizationPermissionKey;
  allowedFrom: readonly JobRequestStatus[];
  nextStatus: JobRequestStatus;
  action: Parameters<JobRequestRepository["recordJobRequestAuditEvent"]>[0]["action"];
  reason?: string | undefined;
  correlationId?: string | undefined;
  now: Date;
}) {
  const jobRequest = await input.jobRequestRepository.findJobRequestById(input.jobRequestId);
  const decision = await authorizeJobRequestPlatformOperation({
    jobRequestRepository: input.jobRequestRepository,
    authorizationService: input.authorizationService,
    session: input.session,
    roles: input.roles,
    permission: input.permission,
    jobRequest,
    correlationId: input.correlationId,
    now: input.now
  });

  if (!decision.allow || !jobRequest) {
    throw new JobRequestError(
      decision.allow
        ? jobRequestDeny("not_found", "job_request_not_found", null, input.roles, null, null)
        : decision
    );
  }

  if (!input.allowedFrom.includes(jobRequest.status)) {
    throw new JobRequestError(
      jobRequestDeny(
        "invalid_transition",
        `cannot_transition_from_${jobRequest.status}_to_${input.nextStatus}`,
        toPublicJobRequest(jobRequest),
        input.roles,
        null,
        null
      )
    );
  }

  const priorStatus = jobRequest.status;
  const reason =
    input.reason === undefined ? null : normalizeRequiredJobRequestText(input.reason, 2, 1000);
  if (input.reason !== undefined && !reason) {
    throw new JobRequestError(
      jobRequestDeny(
        "invalid_input",
        "transition_reason_required",
        toPublicJobRequest(jobRequest),
        input.roles,
        null,
        null
      )
    );
  }

  const updated = await input.jobRequestRepository.transitionJobRequest({
    jobRequestId: jobRequest.id,
    expectedVersion: input.expectedVersion,
    actorUserId: input.session.user?.id ?? "system",
    status: input.nextStatus,
    adminReviewReason: reason,
    now: input.now
  });

  if (!updated) {
    throw new JobRequestError(
      jobRequestDeny(
        "version_conflict",
        "stale_version",
        toPublicJobRequest(jobRequest),
        input.roles,
        null,
        null
      )
    );
  }

  await recordJobRequestAudit(input.jobRequestRepository, {
    action: input.action,
    organizationId: updated.organizationId,
    jobRequestId: updated.id,
    jobRequestNumber: updated.jobRequestNumber,
    actorUserId: input.session.user?.id ?? null,
    priorState: priorStatus,
    newState: updated.status,
    reason,
    correlationId: input.correlationId,
    createdAt: input.now
  });

  return toPublicJobRequest(updated);
}

async function findJobRequestByIdOrNumber(repository: JobRequestRepository, idOrNumber: string) {
  const trimmed = idOrNumber.trim();
  // The production `id` column is a UUID: passing a request number (e.g. "JR-2026-000001")
  // to a by-id lookup makes the datastore reject the value and throw, which must never
  // surface as a 500 before the by-number fallback runs. A canonical UUID is looked up by id
  // directly. Any other string MIGHT still be a valid id for the configured repository (e.g.
  // non-UUID ids in tests), so we attempt the id lookup defensively and treat a datastore
  // type-rejection as "not found by id", falling through to the request-number lookup.
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
    const byId = await repository.findJobRequestById(trimmed);
    if (byId) return byId;
  } else {
    try {
      const byId = await repository.findJobRequestById(trimmed);
      if (byId) return byId;
    } catch {
      // Datastore rejected the value as a non-UUID id — resolve by request number instead.
    }
  }
  return repository.findJobRequestByNumber(trimmed.toUpperCase());
}

function normalizeRequiredJobRequestText(value: string, minLength: number, maxLength: number) {
  return normalizeCatalogueText(value, minLength, maxLength);
}

function normalizeWorkerCount(value: number) {
  return Number.isInteger(value) && value > 0 && value <= 500 ? value : 0;
}

function isValidJobRequestTiming(startAt: Date, endAt: Date) {
  return (
    startAt instanceof Date &&
    endAt instanceof Date &&
    !Number.isNaN(startAt.getTime()) &&
    !Number.isNaN(endAt.getTime()) &&
    endAt.getTime() > startAt.getTime()
  );
}

// Authoritative platform business rule: a staffing request shift must be at least
// 6 hours per worker. Enforced server-side on create and edit. Mirrors the shared
// constant MINIMUM_SHIFT_MINUTES (@rwos/shared) used by employer-facing UI copy.
export const MINIMUM_STAFFING_SHIFT_MINUTES = 360;

// Non-terminal statuses on which employer live-capacity mutations (Add/Reduce) are
// permitted. Terminal states (cancelled/expired/archived) and post-work states are
// excluded.
const LIVE_CAPACITY_STATUSES: readonly JobRequestStatus[] = [
  "draft",
  "submitted",
  "admin_review",
  "information_required",
  "approved_for_dispatch"
];

function meetsMinimumShiftDuration(startAt: Date, endAt: Date) {
  const durationMinutes = (endAt.getTime() - startAt.getTime()) / 60000;
  return durationMinutes >= MINIMUM_STAFFING_SHIFT_MINUTES;
}

function isMultiDayRange(startAt: Date, endAt: Date) {
  return startAt.toISOString().slice(0, 10) !== endAt.toISOString().slice(0, 10);
}

function formatJobRequestNumber(year: number, sequenceValue: number) {
  return `JR-${year}-${String(sequenceValue).padStart(6, "0")}`;
}

function createJobRequestCorrelationId() {
  return `job_request_${randomBytes(12).toString("base64url")}`;
}

async function auditJobRequestDenial(
  repository: JobRequestRepository,
  input: {
    decision: JobRequestDecision;
    actorUserId: string | null;
    correlationId?: string | undefined;
    createdAt: Date;
  }
) {
  await recordJobRequestAudit(repository, {
    action: "job_request.access_denied",
    organizationId:
      input.decision.organization?.id ?? input.decision.jobRequest?.organizationId ?? null,
    jobRequestId: input.decision.jobRequest?.id ?? null,
    jobRequestNumber: input.decision.jobRequest?.jobRequestNumber ?? null,
    actorUserId: input.actorUserId,
    priorState: input.decision.jobRequest?.status ?? null,
    newState: "denied",
    reason: input.decision.internalReason,
    correlationId: input.correlationId,
    createdAt: input.createdAt
  });
}

async function recordJobRequestAudit(
  repository: JobRequestRepository,
  input: Omit<
    Parameters<JobRequestRepository["recordJobRequestAuditEvent"]>[0],
    "correlationId"
  > & {
    correlationId?: string | undefined;
  }
) {
  await repository.recordJobRequestAuditEvent({
    ...input,
    correlationId: input.correlationId ?? createJobRequestCorrelationId()
  });
}

async function recordPrismaJobRequestAudit(
  prisma: Pick<PrismaJobRequestClient, "auditActorReference" | "auditEvent">,
  input: Parameters<JobRequestRepository["recordJobRequestAuditEvent"]>[0]
) {
  const actorReference = await prisma.auditActorReference.create({
    data: {
      actorType: input.actorUserId ? "user" : "system",
      ...(input.actorUserId ? { userId: input.actorUserId } : {}),
      displayLabel: input.actorUserId ? "JobRequest actor" : "JobRequest boundary"
    }
  });

  await prisma.auditEvent.create({
    data: {
      actorReferenceId: actorReference.id,
      organizationId: input.organizationId,
      entityType: "job_request",
      entityId: input.jobRequestId ?? nilEntityId,
      entityPublicReference: input.jobRequestNumber,
      action: input.action,
      priorState: input.priorState,
      newState: input.newState,
      reason: input.reason,
      source: "api",
      correlationId: input.correlationId,
      policyVersion: "job-request-foundation-v1",
      createdAt: input.createdAt
    }
  });
}

async function recordPrismaDispatchAudit(
  prisma: Pick<PrismaDispatchClient, "auditActorReference" | "auditEvent">,
  input: Parameters<DispatchRepository["recordDispatchAuditEvent"]>[0]
) {
  const actorReference = await prisma.auditActorReference.create({
    data: {
      actorType: input.actorUserId ? "user" : "system",
      ...(input.actorUserId ? { userId: input.actorUserId } : {}),
      displayLabel: input.actorUserId ? "Dispatch actor" : "Dispatch boundary"
    }
  });

  await prisma.auditEvent.create({
    data: {
      actorReferenceId: actorReference.id,
      organizationId: input.organizationId,
      entityType: "dispatch_review",
      entityId: input.dispatchReviewId ?? nilEntityId,
      entityPublicReference: input.jobRequestId,
      action: input.action,
      priorState: input.priorState,
      newState: input.newState,
      reason: input.reason,
      source: "api",
      correlationId: input.correlationId,
      policyVersion: "dispatch-foundation-v1",
      createdAt: input.createdAt
    }
  });
}

async function recordPrismaWorkerOfferAudit(
  prisma: Pick<PrismaWorkerOfferClient, "auditActorReference" | "auditEvent">,
  input: Parameters<WorkerOfferRepository["recordWorkerOfferAuditEvent"]>[0]
) {
  const actorReference = await prisma.auditActorReference.create({
    data: {
      actorType: input.actorUserId ? "user" : "system",
      ...(input.actorUserId ? { userId: input.actorUserId } : {}),
      ...(input.organizationId ? { organizationId: input.organizationId } : {}),
      displayLabel: input.actorUserId ? "Worker Offer actor" : "Worker Offer boundary"
    }
  });

  await prisma.auditEvent.create({
    data: {
      actorReferenceId: actorReference.id,
      organizationId: input.organizationId,
      entityType: "worker_offer",
      entityId: input.workerOfferId ?? nilEntityId,
      entityPublicReference: input.jobRequestId,
      action: input.action,
      priorState: input.priorState,
      newState: input.newState,
      reason: input.reason,
      source: "api",
      correlationId: input.correlationId,
      policyVersion: "worker-offer-foundation-v1",
      createdAt: input.createdAt
    }
  });
}

async function recordPrismaAssignmentAudit(
  prisma: Pick<PrismaAssignmentClient, "auditActorReference" | "auditEvent">,
  input: Parameters<AssignmentRepository["recordAssignmentAuditEvent"]>[0]
) {
  const actorReference = await prisma.auditActorReference.create({
    data: {
      actorType: input.actorUserId ? "user" : "system",
      ...(input.actorUserId ? { userId: input.actorUserId } : {}),
      ...(input.organizationId ? { organizationId: input.organizationId } : {}),
      displayLabel: input.actorUserId ? "Assignment actor" : "Assignment boundary"
    }
  });

  await prisma.auditEvent.create({
    data: {
      actorReferenceId: actorReference.id,
      organizationId: input.organizationId,
      entityType: "assignment",
      entityId: input.assignmentId ?? nilEntityId,
      entityPublicReference: input.jobRequestId,
      action: input.action,
      priorState: input.priorState,
      newState: input.newState,
      reason: input.reason,
      source: "api",
      correlationId: input.correlationId,
      policyVersion: "assignment-foundation-v1",
      createdAt: input.createdAt
    }
  });
}

async function recordPrismaAttendanceAudit(
  prisma: Pick<PrismaAttendanceClient, "auditActorReference" | "auditEvent">,
  input: Parameters<AttendanceRepository["recordAttendanceAuditEvent"]>[0]
) {
  const actorReference = await prisma.auditActorReference.create({
    data: {
      actorType: input.actorUserId ? "user" : "system",
      ...(input.actorUserId ? { userId: input.actorUserId } : {}),
      ...(input.organizationId ? { organizationId: input.organizationId } : {}),
      displayLabel: input.actorUserId ? "Attendance actor" : "Attendance boundary"
    }
  });

  await prisma.auditEvent.create({
    data: {
      actorReferenceId: actorReference.id,
      organizationId: input.organizationId,
      entityType: "attendance_record",
      entityId: input.attendanceRecordId ?? nilEntityId,
      entityPublicReference: input.assignmentId,
      action: input.action,
      priorState: input.priorState,
      newState: input.newState,
      reason: input.reason,
      source: "api",
      correlationId: input.correlationId,
      policyVersion: "attendance-foundation-v1",
      createdAt: input.createdAt
    }
  });
}

async function recordPrismaTimesheetAudit(
  prisma: Pick<PrismaTimesheetClient, "auditActorReference" | "auditEvent">,
  input: Parameters<TimesheetRepository["recordTimesheetAuditEvent"]>[0]
) {
  const actorReference = await prisma.auditActorReference.create({
    data: {
      actorType: input.actorUserId ? "user" : "system",
      ...(input.actorUserId ? { userId: input.actorUserId } : {}),
      ...(input.organizationId ? { organizationId: input.organizationId } : {}),
      displayLabel: input.actorUserId ? "Timesheet actor" : "Timesheet boundary"
    }
  });

  await prisma.auditEvent.create({
    data: {
      actorReferenceId: actorReference.id,
      organizationId: input.organizationId,
      entityType: "timesheet",
      entityId: input.timesheetId ?? input.attendanceRecordId ?? input.assignmentId ?? nilEntityId,
      entityPublicReference: input.attendanceRecordId ?? input.assignmentId,
      action: input.action,
      priorState: input.priorState,
      newState: input.newState,
      reason: input.reason,
      source: "api",
      correlationId: input.correlationId,
      policyVersion: "timesheet-foundation-v1",
      createdAt: input.createdAt
    }
  });
}

async function scrypt(
  password: string,
  salt: Buffer,
  keyLength: number,
  options: { N: number; r: number; p: number }
) {
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
