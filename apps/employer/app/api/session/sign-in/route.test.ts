import { beforeEach, describe, expect, it, vi } from "vitest";

const boundary = vi.hoisted(() => ({ token: null as string | null, validate: vi.fn(), signIn: vi.fn(), set: vi.fn() }));
vi.mock("../../sessionBoundary", () => ({
  isSameOriginMutation: () => true,
  organizationContextCookieName: "org",
  sessionCookieName: "session",
  sessionCookieOptions: { path: "/" },
  sessionFailure: (status: string) => Response.json({ status }, { status: status === "denied" ? 401 : 503 }),
  sessionBoundary: async () => ({
    cookieStore: { set: boundary.set },
    token: boundary.token,
    gateway: { signIn: boundary.signIn, validate: boundary.validate }
  })
}));

import { POST } from "./route";

const signIn = () =>
  POST(new Request("http://employer.test/api/session/sign-in", { method: "POST", body: JSON.stringify({ email: "a@b.test", password: "correct-horse" }) }));

describe("employer sign-in with an existing session cookie", () => {
  beforeEach(() => {
    boundary.token = "old";
    boundary.validate.mockReset();
    boundary.set.mockReset();
    boundary.signIn.mockReset().mockResolvedValue({ status: "ok", payload: { ok: true } });
  });

  it("asks for sign-out first when that session is still live", async () => {
    boundary.validate.mockResolvedValue({ status: "ok", payload: {} });
    expect((await signIn()).status).toBe(409);
    expect(boundary.signIn).not.toHaveBeenCalled();
  });

  it("clears an expired session and signs in, instead of trapping the person", async () => {
    boundary.validate.mockResolvedValue({ status: "denied" });
    expect((await signIn()).status).toBe(200);
    expect(boundary.set).toHaveBeenCalledWith("session", "", { path: "/", maxAge: 0 });
    expect(boundary.signIn).toHaveBeenCalledOnce();
  });

  it("does not discard a session just because the API is briefly unavailable", async () => {
    boundary.validate.mockResolvedValue({ status: "unavailable" });
    expect((await signIn()).status).toBe(409);
    expect(boundary.set).not.toHaveBeenCalled();
  });
});
