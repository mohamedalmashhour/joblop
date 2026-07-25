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
    "Read organization summary records within a future organization context.",
    "organization",
    "reserved",
    "May expose organization information if context is not enforced.",
    "Deny without organization context; do not activate an organization API yet."
  ),
  permission(
    "organization.update",
    "Update organization summary records within a future organization context.",
    "organization",
    "reserved",
    "Could alter organization data if granted outside ownership controls.",
    "Organization Owner only in matrix; no active endpoint."
  ),
  permission(
    "residence.read",
    "Read residence records within a future organization context.",
    "organization",
    "reserved",
    "May expose location or facility details.",
    "Deny without organization context; no active residence API."
  ),
  permission(
    "residence.create",
    "Create residence records within a future organization context.",
    "organization",
    "reserved",
    "Could create operational locations before organization membership exists.",
    "Mapped only to approved organization roles; no active endpoint."
  ),
  permission(
    "residence.update",
    "Update residence records within a future organization context.",
    "organization",
    "reserved",
    "Could alter residence operating details.",
    "Mapped only to approved organization roles; no active endpoint."
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
