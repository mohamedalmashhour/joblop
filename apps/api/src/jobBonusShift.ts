import type { PrismaClient } from "@rwos/database";
import type { JobBonusFunding, JobBonusKind } from "@rwos/shared";

// Which job bonus applies to a shift. A bonus counts for a shift when it became active (employer
// accepted it, or staff approved a platform-funded one) and was not cancelled before the shift
// started. At most one bonus is active per job, so this normally picks the job's single active bonus;
// a bonus cancelled after the shift started still pays that shift (the worker came for it).
// Used by payroll (worker pay) and by the invoice built from a locked timesheet (employer-funded only).

export type ShiftBonusRow = Readonly<{
  id: string;
  jobRequestId: string;
  kind: JobBonusKind;
  fundedBy: JobBonusFunding;
  status: string;
  amountMinor: number;
  respondedAt: Date | null;
  approvedAt: Date | null;
  cancelledAt: Date | null;
}>;

function activatedAt(b: ShiftBonusRow): Date | null {
  if (b.fundedBy === "platform") return b.approvedAt;
  // Employer-funded: active once accepted. A declined offer has respondedAt but never becomes active.
  if (b.status === "employer_declined") return null;
  return b.respondedAt;
}

export function pickShiftBonus(
  bonuses: readonly ShiftBonusRow[],
  jobRequestId: string,
  shiftStartAt: Date,
  fundedBy?: JobBonusFunding
): ShiftBonusRow | null {
  let best: { bonus: ShiftBonusRow; at: number } | null = null;
  for (const b of bonuses) {
    if (b.jobRequestId !== jobRequestId) continue;
    if (fundedBy && b.fundedBy !== fundedBy) continue;
    if (b.status !== "employer_accepted" && b.status !== "approved" && b.status !== "cancelled") continue;
    const at = activatedAt(b);
    if (!at) continue;
    if (b.status === "cancelled" && (!b.cancelledAt || b.cancelledAt.getTime() <= shiftStartAt.getTime())) continue;
    if (!best || at.getTime() > best.at) best = { bonus: b, at: at.getTime() };
  }
  return best?.bonus ?? null;
}

export async function loadShiftBonuses(
  prisma: PrismaClient,
  jobRequestIds: readonly string[]
): Promise<readonly ShiftBonusRow[]> {
  const ids = [...new Set(jobRequestIds)];
  if (ids.length === 0) return [];
  return prisma.jobBonus.findMany({
    where: { jobRequestId: { in: ids }, status: { in: ["employer_accepted", "approved", "cancelled"] } },
    select: {
      id: true,
      jobRequestId: true,
      kind: true,
      fundedBy: true,
      status: true,
      amountMinor: true,
      respondedAt: true,
      approvedAt: true,
      cancelledAt: true
    }
  });
}
