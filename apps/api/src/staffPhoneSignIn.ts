import { createHash, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import type { SmsSender } from "./mailer/smsSender";

const CODE_TTL_MS = 10 * 60_000;
const RESEND_AFTER_MS = 60_000;
export const MAX_CODE_ATTEMPTS = 5;

type CodeRow = Readonly<{ id: string; codeHash: string; attempts: number; expiresAt: Date; createdAt: Date }>;
type StaffPhonePrisma = {
  user: {
    findMany(args: unknown): Promise<
      readonly {
        id: string;
        emailNormalized: string;
        memberships?: readonly unknown[];
        workerIdentity?: unknown;
      }[]
    >;
    updateMany(args: unknown): Promise<{ count: number }>;
  };
  platformAccessGrant: { findFirst(args: unknown): Promise<{ userId: string } | null> };
  staffPhoneSignInCode: {
    findFirst(args: unknown): Promise<CodeRow | null>;
    create(args: unknown): Promise<unknown>;
    updateMany(args: unknown): Promise<{ count: number }>;
  };
};

// "001-514-462-4457", "(514) 462-4457" and "+1 514 462 4457" all become +15144624457. North American
// ten-digit numbers are assumed to be +1, the active country's calling code.
export function normalizeStaffPhone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  let digits = value.replace(/[\s().-]/g, "");
  if (digits.startsWith("00")) digits = `+${digits.slice(2)}`;
  if (/^\d{10}$/.test(digits)) digits = `+1${digits}`;
  if (/^1\d{10}$/.test(digits)) digits = `+${digits}`;
  return /^\+[1-9]\d{7,14}$/.test(digits) ? digits : null;
}

function digest(userId: string, code: string): Buffer {
  return createHash("sha256").update(`${userId}:${code}`, "utf8").digest();
}

export type PhoneSignInAudience = "staff" | "employer" | "worker";

// Numbers are not unique yet. One person may hold a company account and a worker account on one
// number, so each site picks its own kind first, then new accounts of neither kind. A number that
// still matches two accounts signs in to neither rather than guessing.
async function findClientUser(prisma: StaffPhonePrisma, phone: string, audience: "employer" | "worker") {
  const users = await prisma.user.findMany({
    where: { phone, status: "active" },
    select: {
      id: true,
      emailNormalized: true,
      memberships: { where: { status: "active" }, select: { id: true }, take: 1 },
      workerIdentity: { select: { id: true } }
    }
  });
  const isMember = (user: (typeof users)[number]) => (user.memberships?.length ?? 0) > 0;
  const isWorker = (user: (typeof users)[number]) => Boolean(user.workerIdentity);
  const own = users.filter(audience === "employer" ? isMember : isWorker);
  const matches = own.length > 0 ? own : users.filter((user) => !isMember(user) && !isWorker(user));
  return matches.length === 1 ? matches[0]! : null;
}

// Only an active account holding the staff grant can sign in this way.
async function findStaffUser(prisma: StaffPhonePrisma, phone: string) {
  const users = await prisma.user.findMany({
    where: { phone, status: "active" },
    select: { id: true, emailNormalized: true }
  });
  if (users.length === 0) return null;
  const grant = await prisma.platformAccessGrant.findFirst({
    where: { userId: { in: users.map((user) => user.id) }, accessRole: { key: "PLATFORM_ADMINISTRATOR" } },
    select: { userId: true }
  });
  return users.find((user) => user.id === grant?.userId) ?? null;
}

export type StaffCodeRequestOutcome = "sent" | "throttled" | "not_staff" | "not_sent";

// The caller answers the same way for every outcome, so this never reveals whose number is staff.
export async function requestStaffPhoneCode(
  prismaClient: unknown,
  sms: Pick<SmsSender, "send">,
  input: { phone: string; now: Date; generateCode?: () => string; audience?: PhoneSignInAudience }
): Promise<StaffCodeRequestOutcome> {
  const prisma = prismaClient as StaffPhonePrisma;
  const audience = input.audience ?? "staff";
  const user = audience === "staff" ? await findStaffUser(prisma, input.phone) : await findClientUser(prisma, input.phone, audience);
  if (!user) return "not_staff";
  const recent = await prisma.staffPhoneSignInCode.findFirst({
    where: { userId: user.id, createdAt: { gt: new Date(input.now.getTime() - RESEND_AFTER_MS) } },
    select: { id: true }
  });
  if (recent) return "throttled";
  const code = (input.generateCode ?? (() => String(randomInt(0, 1_000_000)).padStart(6, "0")))();
  await prisma.staffPhoneSignInCode.updateMany({
    where: { userId: user.id, consumedAt: null },
    data: { consumedAt: input.now }
  });
  await prisma.staffPhoneSignInCode.create({
    data: {
      id: randomUUID(),
      userId: user.id,
      codeHash: digest(user.id, code).toString("hex"),
      expiresAt: new Date(input.now.getTime() + CODE_TTL_MS),
      createdAt: input.now
    }
  });
  const sent = await sms.send({
    to: input.phone,
    text: `Your Joblop ${audience === "staff" ? "staff " : ""}sign-in code is ${code}. It expires in 10 minutes. Never share it.`
  });
  return sent.status === "sent" ? "sent" : "not_sent";
}

// Returns the account to sign in, or null. Wrong guesses use up the code, and a code works once.
export async function verifyStaffPhoneCode(
  prismaClient: unknown,
  input: { phone: string; code: string; now: Date; audience?: PhoneSignInAudience }
): Promise<Readonly<{ emailNormalized: string }> | null> {
  const prisma = prismaClient as StaffPhonePrisma;
  const audience = input.audience ?? "staff";
  const user = audience === "staff" ? await findStaffUser(prisma, input.phone) : await findClientUser(prisma, input.phone, audience);
  if (!user) return null;
  const row = await prisma.staffPhoneSignInCode.findFirst({
    where: { userId: user.id, consumedAt: null, expiresAt: { gt: input.now } },
    orderBy: { createdAt: "desc" },
    select: { id: true, codeHash: true, attempts: true, expiresAt: true, createdAt: true }
  });
  if (!row || row.attempts >= MAX_CODE_ATTEMPTS) return null;
  const counted = await prisma.staffPhoneSignInCode.updateMany({
    where: { id: row.id, consumedAt: null, attempts: row.attempts },
    data: { attempts: { increment: 1 } }
  });
  if (counted.count !== 1) return null;
  const stored = Buffer.from(row.codeHash, "hex");
  const presented = digest(user.id, input.code);
  if (stored.length !== presented.length || !timingSafeEqual(stored, presented)) return null;
  const consumed = await prisma.staffPhoneSignInCode.updateMany({
    where: { id: row.id, consumedAt: null },
    data: { consumedAt: input.now }
  });
  return consumed.count === 1 ? { emailNormalized: user.emailNormalized } : null;
}

// Puts the sign-in number on an account that already has staff access.
export async function setStaffPhone(
  prismaClient: unknown,
  input: { email: string; phone: unknown }
): Promise<"saved" | "invalid_phone" | "not_staff"> {
  const prisma = prismaClient as StaffPhonePrisma;
  const phone = normalizeStaffPhone(input.phone);
  if (!phone) return "invalid_phone";
  const users = await prisma.user.findMany({
    where: { emailNormalized: input.email, status: "active" },
    select: { id: true, emailNormalized: true }
  });
  const user = users[0];
  if (!user) return "not_staff";
  const grant = await prisma.platformAccessGrant.findFirst({
    where: { userId: user.id, accessRole: { key: "PLATFORM_ADMINISTRATOR" } },
    select: { userId: true }
  });
  if (!grant) return "not_staff";
  await prisma.user.updateMany({ where: { id: user.id }, data: { phone } });
  return "saved";
}
