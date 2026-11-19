import { createHash, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import type { SmsSender } from "./mailer/smsSender";
import type { EmailSender } from "./mailer/emailSender";
import type { TwilioVerify } from "./mailer/twilioVerify";
import { signInCodeSms } from "./notifications/smsBrand";
import { resolveWorkerLanguage } from "./notifications/workerLanguage";
// Sign-in codes go by text only; see notifications/noticeChannels.ts.

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
        primaryLanguage?: string | null;
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
      primaryLanguage: true,
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
    select: { id: true, emailNormalized: true, primaryLanguage: true }
  });
  if (users.length === 0) return null;
  const grant = await prisma.platformAccessGrant.findFirst({
    where: { userId: { in: users.map((user) => user.id) }, accessRole: { key: "PLATFORM_ADMINISTRATOR" } },
    select: { userId: true }
  });
  return users.find((user) => user.id === grant?.userId) ?? null;
}

// App-store review: one demo worker number gets a fixed code that is never texted, because a store
// reviewer cannot receive our text. Worker sign-in only; staff and employer numbers never qualify.
// Everything else is unchanged: the number must be an active worker account, the code is stored as
// a hash, expires, works once and allows the same number of wrong guesses.
export type StoreReviewSignIn = Readonly<{ phone: string; code: string }>;

function isStoreReviewRequest(review: StoreReviewSignIn | null | undefined, phone: string, audience: PhoneSignInAudience): review is StoreReviewSignIn {
  return audience === "worker" && Boolean(review) && /^\d{6}$/.test(review!.code) && review!.phone === phone;
}

export type StaffCodeRequestOutcome = "sent" | "throttled" | "not_staff" | "not_sent";

// The caller answers the same way for every outcome, so this never reveals whose number is staff.
export async function requestStaffPhoneCode(
  prismaClient: unknown,
  sms: Pick<SmsSender, "send">,
  input: {
    phone: string;
    now: Date;
    generateCode?: () => string;
    audience?: PhoneSignInAudience;
    storeReview?: StoreReviewSignIn | null;
    // Backup delivery: the same code is also emailed to the account's address, so sign-in keeps
    // working while SMS is unavailable (e.g. carrier sender approval pending).
    email?: Pick<EmailSender, "send">;
    // Twilio Verify: also texts a Twilio-generated code (accepted at verify time).
    twilio?: Pick<TwilioVerify, "start" | "configured">;
  }
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
  const review = isStoreReviewRequest(input.storeReview, input.phone, audience) ? input.storeReview : null;
  const code = review ? review.code : (input.generateCode ?? (() => String(randomInt(0, 1_000_000)).padStart(6, "0")))();
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
  if (review) return "sent";
  const language = resolveWorkerLanguage((user as { primaryLanguage?: string | null }).primaryLanguage ?? null);
  const text = signInCodeSms(language, code, audience === "staff");
  // When Twilio Verify is configured it is the only SMS route for sign-in codes (no Brevo SMS).
  const useTwilio = Boolean(input.twilio?.configured);
  const sent = useTwilio ? { status: "skipped" as const } : await sms.send({ to: input.phone, text: signInCodeSms(language, code, audience === "staff") }).catch(() => ({ status: "error" as const }));
  let emailed = false;
  if (input.email && user.emailNormalized) {
    const mail = await input.email
      .send({ to: user.emailNormalized, subject: `Joblop — ${code}`, text })
      .catch(() => ({ status: "error" as const }));
    emailed = mail.status === "sent";
  }
  const twilioSent = useTwilio && input.twilio ? await input.twilio.start(input.phone).catch(() => false) : false;
  return sent.status === "sent" || emailed || twilioSent ? "sent" : "not_sent";
}

// Returns the account to sign in, or null. Wrong guesses use up the code, and a code works once.
export async function verifyStaffPhoneCode(
  prismaClient: unknown,
  input: { phone: string; code: string; now: Date; audience?: PhoneSignInAudience; twilio?: Pick<TwilioVerify, "check" | "configured"> }
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
  const ownMatch = stored.length === presented.length && timingSafeEqual(stored, presented);
  // The attempt is already counted above, so a Twilio check cannot be used to bypass the attempt limit.
  const twilioMatch = !ownMatch && input.twilio?.configured ? await input.twilio.check(input.phone, input.code).catch(() => false) : false;
  if (!ownMatch && !twilioMatch) return null;
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
