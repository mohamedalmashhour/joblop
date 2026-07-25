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
