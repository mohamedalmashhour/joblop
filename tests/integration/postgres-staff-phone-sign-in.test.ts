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

suite("PostgreSQL employer and worker phone sign-in", () => {
  const prisma = createPrismaClient(databaseUrl!);
  const account = async (phone: string | null) => {
    const suffix = randomUUID().replaceAll("-", "");
    const email = `phone-${suffix}@example.test`;
    const user = await prisma.user.create({
      data: { publicId: `usr_phone_${suffix}`, emailNormalized: email, status: "active", phone }
    });
    return { user, email };
  };
  const number = () => `+1438${String(Math.floor(Math.random() * 10_000_000)).padStart(7, "0")}`;
  const sms = () => ({ send: vi.fn(async () => ({ status: "sent" as const, id: "s" })) });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("signs an employer in without any staff access", async () => {
    const phone = number();
    const { email } = await account(phone);
    const sender = sms();
    const now = new Date();
    expect(await requestStaffPhoneCode(prisma, sender, { phone, now, audience: "staff" })).toBe("not_staff");
    expect(await requestStaffPhoneCode(prisma, sender, { phone, now, audience: "employer", generateCode: () => "222333" })).toBe("sent");
    // In the account's language (none stored here, so French, the Québec default).
    expect(sender.send.mock.calls[0]?.[0].text).toBe("Joblop: votre code de connexion est 222333. Il expire dans 10 minutes. Ne le partagez jamais.");
    expect(await verifyStaffPhoneCode(prisma, { phone, code: "222333", now, audience: "staff" })).toBeNull();
    expect(await verifyStaffPhoneCode(prisma, { phone, code: "222333", now, audience: "employer" })).toEqual({ emailNormalized: email });
  });

  it("signs in to neither account when a number matches two", async () => {
    const phone = number();
    await account(phone);
    await account(phone);
    const sender = sms();
    expect(await requestStaffPhoneCode(prisma, sender, { phone, now: new Date(), audience: "employer" })).toBe("not_staff");
    expect(sender.send).not.toHaveBeenCalled();
  });

  it("prefers the worker profile when a number also has a plain account", async () => {
    const phone = number();
    await account(phone);
    const { user, email } = await account(phone);
    await prisma.workerIdentity.create({ data: { userId: user.id } });
    const sender = sms();
    const now = new Date();
    expect(await requestStaffPhoneCode(prisma, sender, { phone, now, audience: "worker", generateCode: () => "444555" })).toBe("sent");
    expect(await verifyStaffPhoneCode(prisma, { phone, code: "444555", now, audience: "worker" })).toEqual({ emailNormalized: email });
  });
});

suite("PostgreSQL phone sign-in for one person with two accounts", () => {
  const prisma = createPrismaClient(databaseUrl!);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("keeps a worker account out of a new employer account's way on the same number", async () => {
    const suffix = randomUUID().replaceAll("-", "");
    const phone = `+1579${String(Math.floor(Math.random() * 10_000_000)).padStart(7, "0")}`;
    const worker = await prisma.user.create({
      data: { publicId: `usr_worker_${suffix}`, emailNormalized: `worker-${suffix}@example.test`, status: "active", phone }
    });
    await prisma.workerIdentity.create({ data: { userId: worker.id } });
    const employerEmail = `employer-${suffix}@example.test`;
    await prisma.user.create({
      data: { publicId: `usr_employer_${suffix}`, emailNormalized: employerEmail, status: "active", phone }
    });
    const sms = { send: vi.fn(async () => ({ status: "sent" as const, id: "s" })) };
    const now = new Date();
    expect(await requestStaffPhoneCode(prisma, sms, { phone, now, audience: "employer", generateCode: () => "666777" })).toBe("sent");
    expect(await verifyStaffPhoneCode(prisma, { phone, code: "666777", now, audience: "employer" })).toEqual({ emailNormalized: employerEmail });
  });
});
