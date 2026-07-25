import { describe, expect, it } from "vitest";
import {
  createAuthenticationService
} from "@rwos/auth";
import type {
  AuthenticationRepository,
  CreateLocalUserInput,
  CreateSessionInput,
  RecordAuthenticationAuditEventInput,
  StoredAuthenticationSession,
  StoredAuthenticationUser,
  UpdateSessionInput
} from "@rwos/auth";
import { buildApi } from "./app";

describe("api health endpoint", () => {
  it("returns the foundation health payload", async () => {
    const app = buildApi();
    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      service: "resident-workforce-os-api",
      foundationOnly: true
    });
  });
});

describe("api authentication foundation", () => {
  it("registers, validates, signs out, and revokes sessions without operational APIs", async () => {
    const repository = new ApiMemoryAuthenticationRepository();
    const app = buildApi({
      authService: createAuthenticationService(repository, {
        passwordHashOptions: {
          costFactor: 1_024,
          blockSize: 8,
          parallelization: 1,
          keyLength: 32,
          saltLength: 8
        },
        randomToken: () => "api-session-token-000000000000000000001"
      })
    });

    const registration = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: "Employer@Example.com",
        password: "ValidPassword123",
        displayName: "Example Employer"
      }
    });

    expect(registration.statusCode).toBe(201);
    expect(registration.json()).toMatchObject({
      user: {
        emailNormalized: "employer@example.com",
        status: "active"
      },
      token: "api-session-token-000000000000000000001"
    });

    const session = await app.inject({
      method: "GET",
      url: "/auth/session",
      headers: {
        authorization: `Bearer ${registration.json().token}`
      }
    });

    expect(session.statusCode).toBe(200);
    expect(session.json()).toMatchObject({
      authenticated: true,
      user: {
        emailNormalized: "employer@example.com"
      }
    });

    const protectedWorkflow = await app.inject({ method: "GET", url: "/organizations" });
    expect(protectedWorkflow.statusCode).toBe(404);

    const signOut = await app.inject({
      method: "POST",
      url: "/auth/sign-out",
      headers: {
        authorization: `Bearer ${registration.json().token}`
      }
    });
    expect(signOut.statusCode).toBe(204);

    const afterLogout = await app.inject({
      method: "GET",
      url: "/auth/session",
      headers: {
        authorization: `Bearer ${registration.json().token}`
      }
    });
    expect(afterLogout.statusCode).toBe(401);
    expect(repository.auditActions()).toContain("auth.logout");

    await app.close();
  });

  it("uses safe authentication errors without account enumeration", async () => {
    const app = buildApi({
      authService: createAuthenticationService(new ApiMemoryAuthenticationRepository(), {
        passwordHashOptions: {
          costFactor: 1_024,
          blockSize: 8,
          parallelization: 1,
          keyLength: 32,
          saltLength: 8
        }
      })
    });

    const missing = await app.inject({
      method: "POST",
      url: "/auth/sign-in",
      payload: {
        email: "missing@example.com",
        password: "WrongPassword123"
      }
    });
    const malformed = await app.inject({
      method: "POST",
      url: "/auth/sign-in",
      payload: {}
    });

    expect(missing.statusCode).toBe(401);
    expect(malformed.statusCode).toBe(401);
    expect(missing.json()).toEqual(malformed.json());

    await app.close();
  });
});

class ApiMemoryAuthenticationRepository implements AuthenticationRepository {
  private users = new Map<string, StoredAuthenticationUser>();
  private sessions = new Map<string, StoredAuthenticationSession>();
  private auditEvents: RecordAuthenticationAuditEventInput[] = [];
  private nextUser = 1;
  private nextSession = 1;

  auditActions() {
    return this.auditEvents.map((event) => event.action);
  }

  async findUserByEmailNormalized(emailNormalized: string) {
    return this.users.get(emailNormalized) ?? null;
  }

  async createLocalUser(input: CreateLocalUserInput) {
    const user: StoredAuthenticationUser = {
      id: `00000000-0000-4000-8000-${String(this.nextUser).padStart(12, "0")}`,
      publicId: input.publicId,
      emailNormalized: input.emailNormalized,
      displayName: input.displayName,
      status: "active",
      identities: [
        {
          id: `api-identity-${this.nextUser}`,
          provider: "local_password",
          providerSubject: input.emailNormalized,
          passwordHash: input.passwordHash
        }
      ]
    };

    this.nextUser += 1;
    this.users.set(user.emailNormalized, user);

    return user;
  }

  async createSession(input: CreateSessionInput) {
    const user = [...this.users.values()].find((candidate) => candidate.id === input.userId);

    if (!user) {
      throw new Error("TEST_USER_NOT_FOUND");
    }

    const session: StoredAuthenticationSession = {
      id: `api-session-${this.nextSession}`,
      userId: input.userId,
      sessionHash: input.sessionHash,
      status: "active",
      expiresAt: input.expiresAt,
      lastSeenAt: null,
      revokedAt: null,
      user
    };

    this.nextSession += 1;
    this.sessions.set(session.sessionHash, session);

    return session;
  }

  async findSessionByHash(sessionHash: string) {
    return this.sessions.get(sessionHash) ?? null;
  }

  async updateSession(input: UpdateSessionInput) {
    const session = [...this.sessions.values()].find((candidate) => candidate.id === input.sessionId);

    if (!session) return null;

    if (input.status) session.status = input.status;
    if (input.lastSeenAt !== undefined) session.lastSeenAt = input.lastSeenAt;
    if (input.revokedAt !== undefined) session.revokedAt = input.revokedAt;

    return session;
  }

  async recordAuthenticationAuditEvent(input: RecordAuthenticationAuditEventInput) {
    this.auditEvents.push(input);
  }
}
