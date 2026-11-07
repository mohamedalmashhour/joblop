import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";
import { createPrismaClient } from "@rwos/database";
import { requestStaffPhoneCode, setStaffPhone, verifyStaffPhoneCode } from "../../apps/api/src/staffPhoneSignIn";

const databaseUrl = process.env.RWOS_TEST_DATABASE_URL;
const suite = databaseUrl ? describe : describe.skip;

suite("PostgreSQL staff phone sign-in", () => {
  const prisma = createPrismaClient(databaseUrl!);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("texts a code to a staff number, accepts it once, and refuses a wrong one", async () => {
    const suffix = randomUUID().replaceAll("-", "");
    const email = `staff-${suffix}@example.test`;
    const phone = `+1514${String(Date.now()).slice(-7)}`;
    const role = await prisma.accessRoleDefinition.findUniqueOrThrow({ where: { key: "PLATFORM_ADMINISTRATOR" } });
    const user = await prisma.user.create({
      data: { publicId: `usr_phone_${suffix}`, emailNormalized: email, status: "active" }
    });
    await prisma.platformAccessGrant.create({
      data: { userId: user.id, accessRoleDefinitionId: role.id, releaseSha: "a".repeat(40) }
    });
    expect(await setStaffPhone(prisma, { email, phone })).toBe("saved");

    const sms = { send: vi.fn(async () => ({ status: "sent" as const, id: "s" })) };
    const now = new Date();
    expect(await requestStaffPhoneCode(prisma, sms, { phone, now, generateCode: () => "123456" })).toBe("sent");
    expect(await requestStaffPhoneCode(prisma, sms, { phone, now })).toBe("throttled");
    expect(sms.send).toHaveBeenCalledTimes(1);

    expect(await verifyStaffPhoneCode(prisma, { phone, code: "000000", now })).toBeNull();
    expect(await verifyStaffPhoneCode(prisma, { phone, code: "123456", now })).toEqual({ emailNormalized: email });
    expect(await verifyStaffPhoneCode(prisma, { phone, code: "123456", now })).toBeNull();
  });
});
