import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  MAX_CODE_ATTEMPTS,
  normalizeStaffPhone,
  requestStaffPhoneCode,
  setStaffPhone,
  verifyStaffPhoneCode
} from "./staffPhoneSignIn";

const phone = "+15144624457";
const now = new Date("2026-11-07T12:00:00Z");
const hash = (code: string) => createHash("sha256").update(`u:${code}`).digest("hex");
const row = (over = {}) => ({ id: "c", codeHash: hash("123456"), attempts: 0, expiresAt: new Date(now.getTime() + 60_000), createdAt: now, ...over });

function fake(over: { users?: unknown[]; grant?: unknown; recent?: unknown; code?: unknown } = {}) {
  return {
    user: {
      findMany: vi.fn(async () => over.users ?? [{ id: "u", emailNormalized: "staff@example.test" }]),
      updateMany: vi.fn(async () => ({ count: 1 }))
    },
    platformAccessGrant: { findFirst: vi.fn(async () => ("grant" in over ? over.grant : { userId: "u" })) },
    staffPhoneSignInCode: {
      findFirst: vi.fn(async () => ("code" in over ? over.code : "recent" in over ? over.recent : null)),
      create: vi.fn(async () => ({})),
      updateMany: vi.fn(async () => ({ count: 1 }))
    }
  };
}
const sms = () => ({ send: vi.fn(async () => ({ status: "sent" as const, id: "s" })) });

describe("normalizeStaffPhone", () => {
  it("accepts the usual ways of writing a number", () => {
    for (const value of ["001-514-462-4457", "(514) 462-4457", "+1 514 462 4457", "15144624457", "514.462.4457"]) {
      expect(normalizeStaffPhone(value)).toBe(phone);
    }
  });

  it("refuses anything else", () => {
    for (const value of ["", "abc", "12345", 5144624457, null]) expect(normalizeStaffPhone(value)).toBeNull();
  });
});

describe("requestStaffPhoneCode", () => {
  it("texts a code and stores only its hash", async () => {
    const prisma = fake();
    const sender = sms();
    expect(await requestStaffPhoneCode(prisma, sender, { phone, now, generateCode: () => "123456" })).toBe("sent");
    expect(sender.send).toHaveBeenCalledWith({ to: phone, text: expect.stringContaining("123456") });
    expect(JSON.stringify(prisma.staffPhoneSignInCode.create.mock.calls)).not.toContain("123456");
  });

  it("sends nothing to a number that is not staff", async () => {
    const sender = sms();
    expect(await requestStaffPhoneCode(fake({ users: [] }), sender, { phone, now })).toBe("not_staff");
    expect(await requestStaffPhoneCode(fake({ grant: null }), sender, { phone, now })).toBe("not_staff");
    expect(sender.send).not.toHaveBeenCalled();
  });

  it("waits a minute between texts", async () => {
    const sender = sms();
    expect(await requestStaffPhoneCode(fake({ recent: { id: "c" } }), sender, { phone, now })).toBe("throttled");
    expect(sender.send).not.toHaveBeenCalled();
  });

  it("reports a text that did not go out", async () => {
    const sender = { send: vi.fn(async () => ({ status: "error" as const })) };
    expect(await requestStaffPhoneCode(fake(), sender, { phone, now })).toBe("not_sent");
  });
});

describe("verifyStaffPhoneCode", () => {
  it("accepts the right code once", async () => {
    const prisma = fake({ code: row() });
    expect(await verifyStaffPhoneCode(prisma, { phone, code: "123456", now })).toEqual({ emailNormalized: "staff@example.test" });
    expect(prisma.staffPhoneSignInCode.updateMany).toHaveBeenCalledTimes(2);
  });

  it("refuses a wrong code and still counts the try", async () => {
    const prisma = fake({ code: row() });
    expect(await verifyStaffPhoneCode(prisma, { phone, code: "000000", now })).toBeNull();
    expect(prisma.staffPhoneSignInCode.updateMany).toHaveBeenCalledTimes(1);
  });

  it("refuses once the tries are used up", async () => {
    expect(await verifyStaffPhoneCode(fake({ code: row({ attempts: MAX_CODE_ATTEMPTS }) }), { phone, code: "123456", now })).toBeNull();
  });

  it("refuses when no code is waiting or the number is not staff", async () => {
    expect(await verifyStaffPhoneCode(fake({ code: null }), { phone, code: "123456", now })).toBeNull();
    expect(await verifyStaffPhoneCode(fake({ users: [] }), { phone, code: "123456", now })).toBeNull();
  });
});

describe("setStaffPhone", () => {
  it("saves a normalized number on a staff account", async () => {
    const prisma = fake();
    expect(await setStaffPhone(prisma, { email: "staff@example.test", phone: "001-514-462-4457" })).toBe("saved");
    expect(prisma.user.updateMany).toHaveBeenCalledWith({ where: { id: "u" }, data: { phone } });
  });

  it("refuses a bad number or an account without staff access", async () => {
    expect(await setStaffPhone(fake(), { email: "a", phone: "nope" })).toBe("invalid_phone");
    expect(await setStaffPhone(fake({ grant: null }), { email: "a", phone })).toBe("not_staff");
  });
});
