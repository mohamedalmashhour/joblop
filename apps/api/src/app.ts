import Fastify, { type FastifyReply } from "fastify";
import {
  AuthenticationError,
  AuthenticationRequiredError,
  EmployerOrganizationError,
  OrganizationMembershipError,
  PasswordPolicyError,
  RegistrationUnavailableError,
  authenticationErrorCode,
  authenticationErrorMessage,
  authenticationRequiredCode,
  authorizationDeniedCode,
  authorizationDeniedMessage,
  createAuthenticationService,
  createAuthorizationService,
  createEmployerOrganizationService,
  createOrganizationMembershipService,
  createPrismaAuthenticationRepository,
  createPrismaEmployerOrganizationRepository,
  createPrismaOrganizationMembershipRepository,
  passwordPolicyErrorCode,
  registrationUnavailableCode,
  toSafeAuthorizationResponse,
  type AuthorizationRoleKey,
  type AuthorizationService,
  type AuthenticationService,
  type EmployerOrganizationService,
  type OrganizationMembershipService
} from "@rwos/auth";
import { getRuntimeConfig } from "@rwos/config";
import { createPrismaClient } from "@rwos/database";
import { createLogger } from "@rwos/observability";

export interface BuildApiOptions {
  authService?: AuthenticationService;
  authorizationService?: AuthorizationService;
  membershipService?: OrganizationMembershipService;
  organizationService?: EmployerOrganizationService;
  resolveAuthorizationRoles?: (userId: string) => Promise<readonly AuthorizationRoleKey[]> | readonly AuthorizationRoleKey[];
}

export function buildApi(options: BuildApiOptions = {}) {
  const app = Fastify({ logger: false });
  const logger = createLogger("api");
  const prisma = options.authService ? null : createPrismaClient();
  const authService =
    options.authService ??
    createAuthenticationService(createPrismaAuthenticationRepository(prisma!), {
      sessionTtlSeconds: 60 * 60 * 8
    });
  const authorizationService = options.authorizationService ?? createAuthorizationService();
  const membershipService =
    options.membershipService ?? createOrganizationMembershipService(createPrismaOrganizationMembershipRepository(prisma!));
  const organizationService =
    options.organizationService ??
    createEmployerOrganizationService(
      createPrismaEmployerOrganizationRepository(prisma!),
      membershipService,
      authorizationService
    );
  const resolveAuthorizationRoles = options.resolveAuthorizationRoles ?? (() => []);

  if (prisma) {
    app.addHook("onClose", async () => {
      await prisma.$disconnect();
    });
  }

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof OrganizationMembershipError) {
      return sendMembershipDenied(reply);
    }

    if (error instanceof EmployerOrganizationError) {
      return sendOrganizationDenied(reply);
    }

    throw error;
  });

  app.get("/health", async () => {
    const config = getRuntimeConfig();
    logger.info("health-check");

    return {
      ok: true,
      service: "resident-workforce-os-api",
      environment: config.rwosEnv,
      foundationOnly: true
    };
  });

  app.post("/auth/register", async (request, reply) => {
    const body = asRecord(request.body);
    const email = readRequiredString(body, "email");
    const password = readRequiredString(body, "password");
    const displayName = readOptionalString(body, "displayName");

    if (!email || !password) {
      return reply.code(400).send({
        error: "RWOS_INVALID_AUTH_REQUEST",
        message: "Invalid authentication request."
      });
    }

    try {
      const result = await authService.register({
        email,
        password,
        displayName,
        source: "api",
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"] ?? null
      });

      return reply.code(201).send(serializeAuthenticationResult(result));
    } catch (error) {
      return sendAuthenticationError(reply, error);
    }
  });

  app.post("/auth/sign-in", async (request, reply) => {
    const body = asRecord(request.body);
    const email = readRequiredString(body, "email");
    const password = readRequiredString(body, "password");

    if (!email || !password) {
      return reply.code(401).send({
        error: authenticationErrorCode,
        message: authenticationErrorMessage
      });
    }

    try {
      const result = await authService.signIn({
        email,
        password,
        source: "api",
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"] ?? null
      });

      return reply.code(200).send(serializeAuthenticationResult(result));
    } catch (error) {
      return sendAuthenticationError(reply, error);
    }
  });

  app.get("/auth/session", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));

    if (!session.authenticated) {
      return reply.code(401).send({
        error: authenticationRequiredCode,
        message: "Authentication required."
      });
    }

    return reply.code(200).send({
      authenticated: true,
      user: session.user,
      session: session.session
        ? {
            ...session.session,
            expiresAt: session.session.expiresAt.toISOString()
          }
        : null
    });
  });

  app.post("/auth/sign-out", async (request, reply) => {
    await authService.revokeSession({
      token: readBearerToken(request.headers.authorization),
      reason: "logout",
      source: "api"
    });

    return reply.code(204).send();
  });

  app.post("/auth/sessions/revoke", async (request, reply) => {
    await authService.revokeSession({
      token: readBearerToken(request.headers.authorization),
      reason: "session_revoked",
      source: "api"
    });

    return reply.code(204).send();
  });

  app.post("/authz/check", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));

    if (!session.authenticated || !session.user) {
      return reply.code(403).send({
        error: authorizationDeniedCode,
        message: authorizationDeniedMessage
      });
    }

    const body = asRecord(request.body);
    const permission = readRequiredString(body, "permission");

    if (!permission) {
      return reply.code(400).send({
        error: "RWOS_INVALID_AUTHORIZATION_REQUEST",
        message: "Invalid authorization request."
      });
    }

    const organizationId = readOptionalString(body, "organizationId");
    const platform = body.platform === true;
    const decision = await authorizationService.decide({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      permission,
      resourceContext: { organizationId },
      platformContext: { platform }
    });

    return reply.code(decision.allow ? 200 : 403).send(toSafeAuthorizationResponse(decision));
  });

  app.post("/authz/platform-admin/probe", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));

    if (!session.authenticated || !session.user) {
      return reply.code(403).send({
        error: authorizationDeniedCode,
        message: authorizationDeniedMessage
      });
    }

    const decision = await authorizationService.decide({
      session,
      roles: await resolveAuthorizationRoles(session.user.id),
      permission: "platform.supervise",
      platformContext: { platform: true }
    });

    return reply.code(decision.allow ? 200 : 403).send(toSafeAuthorizationResponse(decision));
  });

  app.get("/memberships", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));

    if (!session.authenticated || !session.user) {
      return sendMembershipDenied(reply);
    }

    return reply.code(200).send({
      memberships: serializeMemberships(await membershipService.listMemberships(session.user.id))
    });
  });

  app.get("/memberships/:membershipId", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));

    if (!session.authenticated || !session.user) {
      return sendMembershipDenied(reply);
    }

    const membershipId = readRouteParam(request.params, "membershipId");
    const membership = membershipId ? await membershipService.getMembership(session.user.id, membershipId) : null;

    if (!membership) {
      return sendMembershipDenied(reply);
    }

    return reply.code(200).send({
      membership: serializeMembership(membership)
    });
  });

  app.post("/memberships/:membershipId/activate", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));

    if (!session.authenticated || !session.user) {
      return sendMembershipDenied(reply);
    }

    const membership = await membershipService.activateMembership({
      userId: session.user.id,
      membershipId: readRouteParam(request.params, "membershipId"),
      actorUserId: session.user.id
    });

    return reply.code(200).send({ membership: serializeMembership(membership) });
  });

  app.post("/memberships/:membershipId/suspend", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));

    if (!session.authenticated || !session.user) {
      return sendMembershipDenied(reply);
    }

    const membership = await membershipService.suspendMembership({
      userId: session.user.id,
      membershipId: readRouteParam(request.params, "membershipId"),
      actorUserId: session.user.id
    });

    return reply.code(200).send({ membership: serializeMembership(membership) });
  });

  app.post("/memberships/:membershipId/revoke", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));

    if (!session.authenticated || !session.user) {
      return sendMembershipDenied(reply);
    }

    const membership = await membershipService.revokeMembership({
      userId: session.user.id,
      membershipId: readRouteParam(request.params, "membershipId"),
      actorUserId: session.user.id
    });

    return reply.code(200).send({ membership: serializeMembership(membership) });
  });

  app.post("/memberships/context/select", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));

    if (!session.authenticated || !session.user) {
      return sendMembershipDenied(reply);
    }

    const body = asRecord(request.body);
    const decision = await membershipService.selectOrganizationContext({
      userId: session.user.id,
      organizationId: readOptionalString(body, "organizationId")
    });

    if (!decision.allow) {
      return sendMembershipDenied(reply);
    }

    return reply.code(200).send({
      organizationContext: {
        organizationId: decision.organizationId,
        membership: decision.membership ? serializeMembership(decision.membership) : null,
        roles: decision.roles
      }
    });
  });

  app.post("/organizations", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));

    if (!session.authenticated || !session.user) {
      return sendOrganizationDenied(reply);
    }

    const body = asRecord(request.body);
    const legalName = readRequiredString(body, "legalName");
    const displayName = readRequiredString(body, "displayName");

    if (!legalName || !displayName) {
      return reply.code(400).send({
        error: "RWOS_INVALID_ORGANIZATION_REQUEST",
        message: "Invalid organization request."
      });
    }

    const created = await organizationService.createOrganization({
      actorUserId: session.user.id,
      legalName,
      displayName
    });

    return reply.code(201).send({
      organization: serializeOrganization(created.organization),
      membership: serializeMembership(created.membership),
      organizationContext: created.organizationContext
    });
  });

  app.get("/organizations/current", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));

    if (!session.authenticated || !session.user) {
      return sendOrganizationDenied(reply);
    }

    const organizationId = readOptionalString(asRecord(request.query), "organizationId");

    if (!organizationId) {
      return sendOrganizationDenied(reply);
    }

    const organization = await organizationService.getOrganization({
      actorUserId: session.user.id,
      organizationId
    });

    return reply.code(200).send({ organization: serializeOrganization(organization) });
  });

  app.get("/organizations/:organizationId", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));

    if (!session.authenticated || !session.user) {
      return sendOrganizationDenied(reply);
    }

    const organization = await organizationService.getOrganization({
      actorUserId: session.user.id,
      organizationId: readRouteParam(request.params, "organizationId")
    });

    return reply.code(200).send({ organization: serializeOrganization(organization) });
  });

  app.get("/organizations/:organizationId/status", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));

    if (!session.authenticated || !session.user) {
      return sendOrganizationDenied(reply);
    }

    const organization = await organizationService.getOrganizationStatus({
      actorUserId: session.user.id,
      organizationId: readRouteParam(request.params, "organizationId")
    });

    return reply.code(200).send({
      organizationId: organization.id,
      status: organization.status,
      version: organization.version
    });
  });

  app.patch("/organizations/:organizationId", async (request, reply) => {
    const session = await authService.validateSession(readBearerToken(request.headers.authorization));

    if (!session.authenticated || !session.user) {
      return sendOrganizationDenied(reply);
    }

    const body = asRecord(request.body);
    const organization = await organizationService.updateOrganization({
      actorUserId: session.user.id,
      organizationId: readRouteParam(request.params, "organizationId"),
      expectedVersion: readRequiredString(body, "expectedVersion") ?? "",
      legalName: readOptionalString(body, "legalName"),
      displayName: readOptionalString(body, "displayName")
    });

    return reply.code(200).send({ organization: serializeOrganization(organization) });
  });

  return app;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function readRequiredString(body: Record<string, unknown>, key: string) {
  const value = body[key];
  return typeof value === "string" ? value : null;
}

function readOptionalString(body: Record<string, unknown>, key: string) {
  const value = body[key];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function readBearerToken(authorization: string | undefined) {
  if (!authorization?.startsWith("Bearer ")) return null;

  return authorization.slice("Bearer ".length).trim() || null;
}

function readRouteParam(params: unknown, key: string) {
  const record = asRecord(params);
  const value = record[key];

  return typeof value === "string" ? value : "";
}

function serializeAuthenticationResult(result: {
  user: Awaited<ReturnType<AuthenticationService["signIn"]>>["user"];
  session: Awaited<ReturnType<AuthenticationService["signIn"]>>["session"];
  token: string;
}) {
  return {
    user: result.user,
    session: {
      ...result.session,
      expiresAt: result.session.expiresAt.toISOString()
    },
    token: result.token
  };
}

function sendAuthenticationError(reply: FastifyReply, error: unknown) {
  if (error instanceof PasswordPolicyError) {
    return reply.code(400).send({
      error: passwordPolicyErrorCode,
      message: "Password requirements not met."
    });
  }

  if (error instanceof RegistrationUnavailableError) {
    return reply.code(409).send({
      error: registrationUnavailableCode,
      message: "Registration unavailable."
    });
  }

  if (error instanceof AuthenticationError) {
    return reply.code(401).send({
      error: authenticationErrorCode,
      message: authenticationErrorMessage
    });
  }

  if (error instanceof AuthenticationRequiredError) {
    return reply.code(401).send({
      error: authenticationRequiredCode,
      message: "Authentication required."
    });
  }

  throw error;
}

function sendMembershipDenied(reply: FastifyReply) {
  return reply.code(403).send({
    error: authorizationDeniedCode,
    message: authorizationDeniedMessage
  });
}

function sendOrganizationDenied(reply: FastifyReply) {
  return reply.code(403).send({
    error: authorizationDeniedCode,
    message: authorizationDeniedMessage
  });
}

function serializeMemberships(memberships: Awaited<ReturnType<OrganizationMembershipService["listMemberships"]>>) {
  return memberships.map(serializeMembership);
}

function serializeMembership(membership: Awaited<ReturnType<OrganizationMembershipService["listMemberships"]>>[number]) {
  return {
    ...membership,
    invitedAt: membership.invitedAt.toISOString(),
    activatedAt: membership.activatedAt?.toISOString() ?? null,
    suspendedAt: membership.suspendedAt?.toISOString() ?? null,
    revokedAt: membership.revokedAt?.toISOString() ?? null,
    expiresAt: membership.expiresAt?.toISOString() ?? null,
    updatedAt: membership.updatedAt.toISOString()
  };
}

function serializeOrganization(organization: Awaited<ReturnType<EmployerOrganizationService["getOrganization"]>>) {
  return {
    ...organization,
    createdAt: organization.createdAt.toISOString(),
    updatedAt: organization.updatedAt.toISOString(),
    restrictedAt: organization.restrictedAt?.toISOString() ?? null,
    suspendedAt: organization.suspendedAt?.toISOString() ?? null,
    closedAt: organization.closedAt?.toISOString() ?? null
  };
}
