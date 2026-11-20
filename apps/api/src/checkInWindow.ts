import type { PrismaClient } from "@rwos/database";

// A worker can check in from 30 minutes before the shift starts, not earlier. The worker site shows
// the button greyed out until then; this guard makes the API refuse an early check-in too.
// Without a database (in-memory test builds) the guard does nothing, like the long-term guard.

export const CHECK_IN_OPENS_MINUTES_BEFORE_START = 30;
export const CHECK_IN_TOO_EARLY_ERROR = "RWOS_CHECK_IN_TOO_EARLY";

type GuardPrisma = Readonly<{
  attendanceRecord: Pick<PrismaClient["attendanceRecord"], "findUnique">;
}>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The moment check-in opens for a shift that starts at `scheduledStartAt`. */
export function checkInOpensAt(scheduledStartAt: Date): Date {
  return new Date(scheduledStartAt.getTime() - CHECK_IN_OPENS_MINUTES_BEFORE_START * 60_000);
}

/**
 * When it is too early for this worker to check in to their own shift, returns the time check-in
 * opens. Otherwise null: an unknown record, a non-UUID id or someone else's shift go to the normal
 * path, which refuses them as usual (so this never tells anyone when another worker's shift starts).
 */
export async function checkInTooEarly(
  prisma: GuardPrisma | null | undefined,
  attendanceRecordId: string,
  userId: string,
  now: Date = new Date()
): Promise<Date | null> {
  if (!prisma || !UUID.test(attendanceRecordId)) return null;
  const row = await prisma.attendanceRecord.findUnique({
    where: { id: attendanceRecordId },
    select: { scheduledStartAt: true, workerIdentity: { select: { userId: true } } }
  });
  if (!row?.scheduledStartAt || row.workerIdentity?.userId !== userId) return null;
  const opensAt = checkInOpensAt(row.scheduledStartAt);
  return now.getTime() < opensAt.getTime() ? opensAt : null;
}

export function checkInTooEarlyBody(opensAt: Date) {
  return {
    error: CHECK_IN_TOO_EARLY_ERROR,
    message: `Check-in opens ${CHECK_IN_OPENS_MINUTES_BEFORE_START} minutes before your shift starts.`,
    opensAt: opensAt.toISOString()
  } as const;
}
