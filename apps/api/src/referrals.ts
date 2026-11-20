// Invite-a-friend / referral capsule.
//
// Each user has one stable, shareable invite code. A friend who signs up with ?ref=CODE is recorded as
// a referral attributed to the inviter (one referral per invitee, best-effort — attribution must never
// break a signup). Country-neutral, no money. Pure helpers are exported for unit tests.

import { randomBytes } from "node:crypto";
import type { PrismaClient } from "@rwos/database";

// URL-safe, unambiguous (no 0/O/1/I) so a code is easy to read aloud and type.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;

/** Format a code from raw bytes. Pure — testable with fixed bytes. */
export function formatReferralCode(raw: Uint8Array): string {
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i += 1) out += CODE_ALPHABET[(raw[i] ?? 0) % CODE_ALPHABET.length];
  return out;
}

/** Normalize a user-supplied code: trim, upper-case, keep only alphabet chars, cap length. */
export function normalizeReferralCode(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, CODE_LENGTH);
  return cleaned.length === CODE_LENGTH ? cleaned : null;
}

/** Get the user's invite code, creating it on first use. Retries on the (astronomically rare) collision. */
export async function getOrCreateReferralCode(prisma: PrismaClient, userId: string): Promise<string> {
  const existing = await prisma.referralCode.findUnique({ where: { userId }, select: { code: true } });
  if (existing) return existing.code;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = formatReferralCode(randomBytes(CODE_LENGTH));
    try {
      const created = await prisma.referralCode.create({ data: { userId, code }, select: { code: true } });
      return created.code;
    } catch {
      // Unique conflict on userId (created concurrently) → return the now-existing one; else retry code.
      const race = await prisma.referralCode.findUnique({ where: { userId }, select: { code: true } });
      if (race) return race.code;
    }
  }
  throw new Error("could not allocate a referral code");
}

export type ReferralStats = Readonly<{ joined: number }>;

export async function referralStats(prisma: PrismaClient, userId: string): Promise<ReferralStats> {
  const joined = await prisma.referral.count({ where: { referrerUserId: userId } });
  return { joined };
}

/**
 * Record a referral at signup. Best-effort and side-effect-safe: unknown code, self-referral, or an
 * invitee already attributed are all silently ignored (returns false) so a signup never fails here.
 */
export async function recordReferralSignup(
  prisma: PrismaClient,
  rawCode: string | null | undefined,
  inviteeUserId: string,
  inviteeEmail: string | null
): Promise<boolean> {
  const code = normalizeReferralCode(rawCode);
  if (!code) return false;
  try {
    const owner = await prisma.referralCode.findUnique({ where: { code }, select: { userId: true } });
    if (!owner || owner.userId === inviteeUserId) return false; // unknown code or self-referral
    const already = await prisma.referral.findUnique({ where: { inviteeUserId }, select: { id: true } });
    if (already) return false;
    await prisma.referral.create({
      data: { referrerUserId: owner.userId, code, inviteeUserId, inviteeEmail, status: "joined" }
    });
    return true;
  } catch {
    return false;
  }
}
