// Platform Greetings & Certificates capsule.
//
// An admin sends holiday/occasion greeting cards and issues certificates (e.g. "Super Worker") to
// workers and employers. Delivery is IN-APP (the delivery/certificate rows are the recipient's inbox)
// plus BEST-EFFORT email through the existing mailer (fail-closed when unconfigured — email never blocks
// the in-app card). Country-neutral: the holiday OCCASIONS come from the active CountryProfile, not from
// here. Advisory, no money, no governance. Pure helpers are exported for unit tests.

import { randomUUID, randomBytes } from "node:crypto";
import type { PrismaClient } from "@rwos/database";
import type { EmailSender } from "./mailer/emailSender";

export type RecipientKind = "worker" | "employer";
export type AudienceScope = "all" | "workers" | "employers" | "selected";

export type Recipient = Readonly<{
  userId: string;
  kind: RecipientKind;
  name: string;
  email: string | null;
  language: "en" | "fr" | "ar";
}>;

// Certificate catalogue. Each award has bilingual default titles and a serial prefix. "custom" lets an
// admin title it themselves. Country-neutral — these are platform awards, not tied to any jurisdiction.
export const CERTIFICATE_KINDS = {
  super_worker: { en: "Super Worker", fr: "Super Travailleur", ar: "العامل المتميز", prefix: "SW" },
  most_reliable: { en: "Most Reliable", fr: "Le plus fiable", ar: "الأكثر موثوقية", prefix: "MR" },
  employee_of_month: { en: "Employee of the Month", fr: "Employé du mois", ar: "موظف الشهر", prefix: "EM" },
  top_employer: { en: "Top Employer", fr: "Employeur de choix", ar: "صاحب العمل المتميز", prefix: "TE" },
  custom: { en: "Certificate of Appreciation", fr: "Certificat de reconnaissance", ar: "شهادة تقدير", prefix: "CT" }
} as const;

export type CertificateKind = keyof typeof CERTIFICATE_KINDS;

export function isCertificateKind(value: string): value is CertificateKind {
  return Object.prototype.hasOwnProperty.call(CERTIFICATE_KINDS, value);
}

/** Default bilingual title for a certificate kind. */
export function certificateTitle(kind: CertificateKind, language: "en" | "fr" | "ar"): string {
  return CERTIFICATE_KINDS[kind][language];
}

// ── serial ───────────────────────────────────────────────────────────────────────────────────────
const SERIAL_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous 0/O/1/I

/** Format a serial from a prefix and raw bytes: "SW-XXXX-XXXX". Pure — testable with fixed bytes. */
export function formatSerial(prefix: string, raw: Uint8Array): string {
  const chars = Array.from(raw, (b) => SERIAL_ALPHABET[b % SERIAL_ALPHABET.length]).join("");
  const body = (chars + "XXXXXXXX").slice(0, 8);
  return `${prefix}-${body.slice(0, 4)}-${body.slice(4, 8)}`;
}

function generateSerial(kind: CertificateKind): string {
  return formatSerial(CERTIFICATE_KINDS[kind].prefix, randomBytes(8));
}

// ── recipient resolution ───────────────────────────────────────────────────────────────────────────
const lang = (pref: string | null | undefined): "en" | "fr" | "ar" => (pref === "fr" ? "fr" : pref === "ar" ? "ar" : "en");

async function resolveWorkers(prisma: PrismaClient): Promise<Recipient[]> {
  const rows = await prisma.workerIdentity.findMany({
    where: { status: "active" },
    select: { userId: true, displayName: true, preferredLanguage: true, user: { select: { displayName: true, emailNormalized: true, primaryLanguage: true } } }
  });
  return rows.map((r) => ({
    userId: r.userId,
    kind: "worker" as const,
    name: r.displayName ?? r.user.displayName ?? r.user.emailNormalized,
    email: r.user.emailNormalized,
    language: lang(r.preferredLanguage ?? r.user.primaryLanguage)
  }));
}

async function resolveEmployers(prisma: PrismaClient): Promise<Recipient[]> {
  // Active employer members = accepted, not revoked/expired. One greeting per user even if they belong
  // to several organizations.
  const rows = await prisma.organizationMembership.findMany({
    where: { acceptedAt: { not: null }, revokedAt: null, expiredAt: null },
    distinct: ["userId"],
    select: { userId: true, user: { select: { displayName: true, emailNormalized: true, primaryLanguage: true } } }
  });
  return rows.map((r) => ({
    userId: r.userId,
    kind: "employer" as const,
    name: r.user.displayName ?? r.user.emailNormalized,
    email: r.user.emailNormalized,
    language: lang(r.user.primaryLanguage)
  }));
}

async function resolveSelected(prisma: PrismaClient, userIds: readonly string[]): Promise<Recipient[]> {
  if (userIds.length === 0) return [];
  const rows = await prisma.user.findMany({
    where: { id: { in: [...userIds] } },
    select: { id: true, displayName: true, emailNormalized: true, primaryLanguage: true, workerIdentity: { select: { displayName: true, preferredLanguage: true } } }
  });
  return rows.map((u) => ({
    userId: u.id,
    kind: (u.workerIdentity ? "worker" : "employer") as RecipientKind,
    name: u.workerIdentity?.displayName ?? u.displayName ?? u.emailNormalized,
    email: u.emailNormalized,
    language: lang(u.workerIdentity?.preferredLanguage ?? u.primaryLanguage)
  }));
}

export async function resolveAudience(
  prisma: PrismaClient,
  scope: AudienceScope,
  selectedUserIds: readonly string[]
): Promise<Recipient[]> {
  if (scope === "workers") return resolveWorkers(prisma);
  if (scope === "employers") return resolveEmployers(prisma);
  if (scope === "selected") return resolveSelected(prisma, selectedUserIds);
  // "all" — workers + employers, de-duplicated by userId (a worker who also belongs to an org counts once).
  const [w, e] = await Promise.all([resolveWorkers(prisma), resolveEmployers(prisma)]);
  const byId = new Map<string, Recipient>();
  for (const r of [...w, ...e]) if (!byId.has(r.userId)) byId.set(r.userId, r);
  return [...byId.values()];
}

/** Admin recipient search by name/email, for the "selected recipients" picker. */
export async function searchRecipients(
  prisma: PrismaClient,
  query: string,
  kind: RecipientKind | "all",
  limit = 20
): Promise<Array<Pick<Recipient, "userId" | "name" | "kind" | "email">>> {
  const q = query.trim();
  if (q.length < 2) return [];
  const out: Array<Pick<Recipient, "userId" | "name" | "kind" | "email">> = [];
  if (kind === "worker" || kind === "all") {
    const workers = await prisma.workerIdentity.findMany({
      where: {
        status: "active",
        OR: [
          { displayName: { contains: q, mode: "insensitive" } },
          { user: { displayName: { contains: q, mode: "insensitive" } } },
          { user: { emailNormalized: { contains: q, mode: "insensitive" } } }
        ]
      },
      select: { userId: true, displayName: true, user: { select: { displayName: true, emailNormalized: true } } },
      take: limit
    });
    for (const w of workers) out.push({ userId: w.userId, kind: "worker", name: w.displayName ?? w.user.displayName ?? w.user.emailNormalized, email: w.user.emailNormalized });
  }
  if (kind === "employer" || kind === "all") {
    const emps = await prisma.organizationMembership.findMany({
      where: {
        acceptedAt: { not: null },
        revokedAt: null,
        expiredAt: null,
        OR: [
          { user: { displayName: { contains: q, mode: "insensitive" } } },
          { user: { emailNormalized: { contains: q, mode: "insensitive" } } }
        ]
      },
      distinct: ["userId"],
      select: { userId: true, user: { select: { displayName: true, emailNormalized: true } } },
      take: limit
    });
    for (const e of emps) out.push({ userId: e.userId, kind: "employer", name: e.user.displayName ?? e.user.emailNormalized, email: e.user.emailNormalized });
  }
  return out.slice(0, limit);
}

// ── email copy ───────────────────────────────────────────────────────────────────────────────────
export function greetingEmail(recipient: Recipient, title: string, message: string): { subject: string; text: string } {
  const { language } = recipient;
  const hi = language === "fr" ? `Bonjour ${recipient.name},` : language === "ar" ? `مرحبًا ${recipient.name}،` : `Hi ${recipient.name},`;
  const sign = language === "fr" ? "— L'équipe Joblop" : language === "ar" ? "— فريق Joblop" : "— The Joblop team";
  return { subject: title, text: `${hi}\n\n${message}\n\n${sign}` };
}

export function certificateEmail(recipient: Recipient, title: string, serial: string, note: string | null): { subject: string; text: string } {
  const extra = note ? `\n\n${note}` : "";
  if (recipient.language === "fr") {
    return {
      subject: `Votre certificat : ${title}`,
      text: `Félicitations ${recipient.name} !\n\nVous avez reçu le certificat « ${title} » de la part de Joblop.${extra}\n\nNº de série : ${serial}\n\nConnectez-vous à votre compte pour le voir et l'imprimer.\n\n— L'équipe Joblop`
    };
  }
  if (recipient.language === "ar") {
    return {
      subject: `شهادتك: ${title}`,
      text: `تهانينا ${recipient.name}!\n\nمنحتك Joblop شهادة «${title}».${extra}\n\nالرقم التسلسلي: ${serial}\n\nسجّل الدخول إلى حسابك لرؤيتها وطباعتها.\n\n— فريق Joblop`
    };
  }
  return {
    subject: `Your certificate: ${title}`,
    text: `Congratulations ${recipient.name}!\n\nYou've been awarded the "${title}" certificate by Joblop.${extra}\n\nSerial: ${serial}\n\nSign in to your account to view and print it.\n\n— The Joblop team`
  };
}

// ── send / issue ─────────────────────────────────────────────────────────────────────────────────
const MAX_EMAILS = 200; // cap synchronous email fan-out; in-app delivery is unbounded.
const EMAIL_BATCH = 20;

export type SendGreetingInput = Readonly<{
  createdByUserId: string;
  occasionKey: string | null;
  templateKey: string;
  title: string;
  message: string;
  audienceScope: AudienceScope;
  selectedUserIds: readonly string[];
}>;

export type SendGreetingResult = Readonly<{
  greetingId: string;
  delivered: number;
  emailConfigured: boolean;
  emailSent: number;
  emailSkipped: number;
  emailError: number;
}>;

export async function sendGreeting(prisma: PrismaClient, emailSender: EmailSender, input: SendGreetingInput): Promise<SendGreetingResult> {
  const recipients = await resolveAudience(prisma, input.audienceScope, input.selectedUserIds);
  const greeting = await prisma.platformGreeting.create({
    data: {
      occasionKey: input.occasionKey,
      templateKey: input.templateKey,
      title: input.title,
      message: input.message,
      audienceScope: input.audienceScope,
      createdByUserId: input.createdByUserId
    }
  });

  // Best-effort email, only when the mailer is configured, capped and batched. emailStatus per delivery.
  const status = new Map<string, "none" | "sent" | "skipped" | "error">();
  for (const r of recipients) status.set(r.userId, "none");
  let emailSent = 0;
  let emailSkipped = 0;
  let emailError = 0;
  if (emailSender.configured) {
    const targets = recipients.filter((r) => r.email).slice(0, MAX_EMAILS);
    for (let i = 0; i < targets.length; i += EMAIL_BATCH) {
      const batch = targets.slice(i, i + EMAIL_BATCH);
      await Promise.all(
        batch.map(async (r) => {
          const { subject, text } = greetingEmail(r, input.title, input.message);
          const res = await emailSender.send({ to: r.email as string, subject, text });
          status.set(r.userId, res.status === "sent" ? "sent" : res.status === "skipped" ? "skipped" : "error");
          if (res.status === "sent") emailSent += 1;
          else if (res.status === "skipped") emailSkipped += 1;
          else emailError += 1;
        })
      );
    }
  }

  if (recipients.length > 0) {
    await prisma.platformGreetingDelivery.createMany({
      data: recipients.map((r) => ({
        id: randomUUID(),
        greetingId: greeting.id,
        recipientUserId: r.userId,
        recipientKind: r.kind,
        emailStatus: status.get(r.userId) ?? "none"
      }))
    });
  }

  return { greetingId: greeting.id, delivered: recipients.length, emailConfigured: emailSender.configured, emailSent, emailSkipped, emailError };
}

export type IssueCertificateInput = Readonly<{
  issuedByUserId: string;
  recipientUserId: string;
  kind: CertificateKind;
  title?: string | null;
  note?: string | null;
}>;

export async function issueCertificate(prisma: PrismaClient, emailSender: EmailSender, input: IssueCertificateInput) {
  const [recipient] = await resolveSelected(prisma, [input.recipientUserId]);
  if (!recipient) return { ok: false as const, reason: "recipient_not_found" as const };
  const title = (input.title?.trim() || certificateTitle(input.kind, recipient.language)).slice(0, 120);
  const serial = generateSerial(input.kind);
  let emailStatus: "none" | "sent" | "skipped" | "error" = "none";
  if (emailSender.configured && recipient.email) {
    const { subject, text } = certificateEmail(recipient, title, serial, input.note?.trim() || null);
    const res = await emailSender.send({ to: recipient.email, subject, text });
    emailStatus = res.status === "sent" ? "sent" : res.status === "skipped" ? "skipped" : "error";
  }
  const cert = await prisma.platformCertificate.create({
    data: {
      recipientUserId: recipient.userId,
      recipientKind: recipient.kind,
      recipientName: recipient.name,
      kind: input.kind,
      title,
      note: input.note?.trim() || null,
      serial,
      emailStatus,
      issuedByUserId: input.issuedByUserId
    }
  });
  return { ok: true as const, certificate: cert };
}

// ── reads ──────────────────────────────────────────────────────────────────────────────────────────
export async function listGreetingsForRecipient(prisma: PrismaClient, userId: string, limit = 50) {
  const rows = await prisma.platformGreetingDelivery.findMany({
    where: { recipientUserId: userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, readAt: true, createdAt: true, greeting: { select: { occasionKey: true, templateKey: true, title: true, message: true } } }
  });
  return rows.map((r) => ({
    id: r.id,
    read: r.readAt !== null,
    receivedAt: r.createdAt.toISOString(),
    occasionKey: r.greeting.occasionKey,
    templateKey: r.greeting.templateKey,
    title: r.greeting.title,
    message: r.greeting.message
  }));
}

export async function listCertificatesForRecipient(prisma: PrismaClient, userId: string, limit = 50) {
  const rows = await prisma.platformCertificate.findMany({
    where: { recipientUserId: userId },
    orderBy: { issuedAt: "desc" },
    take: limit
  });
  return rows.map((c) => ({ id: c.id, kind: c.kind, title: c.title, recipientName: c.recipientName, note: c.note, serial: c.serial, read: c.readAt !== null, issuedAt: c.issuedAt.toISOString() }));
}

export async function markGreetingRead(prisma: PrismaClient, userId: string, deliveryId: string): Promise<boolean> {
  const res = await prisma.platformGreetingDelivery.updateMany({ where: { id: deliveryId, recipientUserId: userId, readAt: null }, data: { readAt: new Date() } });
  return res.count > 0;
}

export async function markCertificateRead(prisma: PrismaClient, userId: string, certificateId: string): Promise<boolean> {
  const res = await prisma.platformCertificate.updateMany({ where: { id: certificateId, recipientUserId: userId, readAt: null }, data: { readAt: new Date() } });
  return res.count > 0;
}

export async function listSentGreetings(prisma: PrismaClient, limit = 50) {
  const rows = await prisma.platformGreeting.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, occasionKey: true, templateKey: true, title: true, audienceScope: true, createdAt: true, _count: { select: { deliveries: true } } }
  });
  return rows.map((g) => ({ id: g.id, occasionKey: g.occasionKey, templateKey: g.templateKey, title: g.title, audienceScope: g.audienceScope, sentAt: g.createdAt.toISOString(), recipientCount: g._count.deliveries }));
}

export async function listIssuedCertificates(prisma: PrismaClient, limit = 50) {
  const rows = await prisma.platformCertificate.findMany({ orderBy: { issuedAt: "desc" }, take: limit });
  return rows.map((c) => ({ id: c.id, recipientName: c.recipientName, recipientKind: c.recipientKind, kind: c.kind, title: c.title, serial: c.serial, issuedAt: c.issuedAt.toISOString() }));
}
