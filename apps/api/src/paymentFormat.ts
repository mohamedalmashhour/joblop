import { randomInt } from "node:crypto";

// Small helpers shared by the plan and listing payment flows (e-transfer instructions, receipts).

// No 0/O, 1/I/L: the code is read off a screen and typed into a banking app on a phone.
const SHORT_REF_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const SHORT_REF_PATTERN = /^JL-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{5}$/u;

/** A short human code for the Interac message, e.g. JL-7F3K2. Uniqueness is enforced by the database. */
export function generatePaymentShortRef(pick: (max: number) => number = randomInt): string {
  let code = "";
  for (let i = 0; i < 5; i += 1) code += SHORT_REF_ALPHABET[pick(SHORT_REF_ALPHABET.length)];
  return `JL-${code}`;
}

/** Money the way the rest of the site writes it: $56.92, $1,234.50. */
export function formatCadMinor(amountMinor: number): string {
  const sign = amountMinor < 0 ? "-" : "";
  const whole = Math.abs(Math.round(amountMinor));
  const dollars = Math.floor(whole / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/gu, ",");
  return `${sign}$${dollars}.${(whole % 100).toString().padStart(2, "0")}`;
}

/** True when a Prisma error is a unique-constraint clash (used to retry a short-code collision). */
export function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === "P2002";
}

/**
 * Create a row that carries a fresh short reference, retrying a few times if the random code is
 * already taken. Any other error is rethrown.
 */
export async function createWithShortRef<T>(create: (shortRef: string) => Promise<T>, attempts = 5): Promise<T> {
  let lastError: unknown = null;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await create(generatePaymentShortRef());
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      lastError = error;
    }
  }
  throw lastError ?? new Error("RWOS_SHORT_REF_EXHAUSTED");
}

/**
 * Inside a transaction a unique clash would abort it, so pick a code that is not taken yet instead
 * (the unique index still guards the rare race).
 */
export async function pickFreeShortRef(isTaken: (shortRef: string) => Promise<boolean>, attempts = 6): Promise<string> {
  for (let i = 0; i < attempts; i += 1) {
    const candidate = generatePaymentShortRef();
    if (!(await isTaken(candidate))) return candidate;
  }
  throw new Error("RWOS_SHORT_REF_EXHAUSTED");
}

/** Staff typed an amount like "56.92", "$56.92" or "56,92": minor units, or null when unreadable. */
export function parseAmountToMinor(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) && value >= 0 ? Math.round(value * 100) : null;
  if (typeof value !== "string") return null;
  const cleaned = value.trim().replace(/[$\s]/gu, "").replace(",", ".");
  if (!/^\d{1,7}(\.\d{1,2})?$/u.test(cleaned)) return null;
  return Math.round(Number(cleaned) * 100);
}

/** A staff-typed Interac reference: printable, trimmed, at most 64 characters; null when empty. */
export function cleanPaymentReference(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[^\x20-\x7e]/gu, "").trim().slice(0, 64);
  return cleaned.length > 0 ? cleaned : null;
}
