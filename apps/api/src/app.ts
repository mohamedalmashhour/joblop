import Fastify, { type FastifyReply } from "fastify";
import {
  AuthenticationError,
  AuthenticationRequiredError,
  PasswordPolicyError,
  RegistrationUnavailableError,
  authenticationErrorCode,
  authenticationErrorMessage,
  authenticationRequiredCode,
  createAuthenticationService,
  createPrismaAuthenticationRepository,
  passwordPolicyErrorCode,
  registrationUnavailableCode,
  type AuthenticationService
} from "@rwos/auth";
import { getRuntimeConfig } from "@rwos/config";
import { createPrismaClient } from "@rwos/database";
import { createLogger } from "@rwos/observability";

export interface BuildApiOptions {
  authService?: AuthenticationService;
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

  if (prisma) {
    app.addHook("onClose", async () => {
      await prisma.$disconnect();
    });
  }

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
