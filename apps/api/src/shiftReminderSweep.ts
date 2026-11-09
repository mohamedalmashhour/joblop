import type { PrismaClient } from "@rwos/database";
import type { EmailSender } from "./mailer/emailSender";
import type { SmsSender } from "./mailer/smsSender";
import { sendsText } from "./notifications/noticeChannels";
import { shiftReminderEmail, shiftReminderSmsText } from "./notifications/workerNotifications";
import { resolveWorkerLanguage } from "./notifications/workerLanguage";
import { pushToWorkers, type PushSender } from "./notifications/pushSender";

// Bounded, idempotent pre-shift reminder sweep. One invocation finds assignments whose shift starts
// within the window and that have NOT been reminded yet, sends the worker a reminder (email + SMS when
// enabled), and marks shiftReminderSentAt so it never double-sends. SMS stays money-gated in the sender.
// Fail-soft per row: one bad row never aborts the batch.

export const DEFAULT_REMINDER_WINDOW_HOURS = 24;
export const DEFAULT_REMINDER_BATCH = 100;
const MAX_REMINDER_BATCH = 500;

// Only shifts that are still going to happen deserve a reminder — never withdrawn/cancelled/closed/expired.
const REMINDABLE_STATUSES = ["confirmed", "worker_acknowledged", "ready_for_attendance"] as const;

export type ShiftReminderSweepMetrics = Readonly<{
  scanned: number;
  reminded: number;
  skipped: number;
  failed: number;
}>;

export async function runShiftReminderSweep(deps: {
  prisma: PrismaClient;
  emailSender: EmailSender;
  smsSender?: SmsSender;
  pushSender?: PushSender;
  now?: () => Date;
  windowHours?: number;
  batchSize?: number;
}): Promise<ShiftReminderSweepMetrics> {
  const now = (deps.now ?? (() => new Date()))();
  const windowHours = Math.min(Math.max(deps.windowHours ?? DEFAULT_REMINDER_WINDOW_HOURS, 1), 168);
  const batchSize = Math.min(Math.max(deps.batchSize ?? DEFAULT_REMINDER_BATCH, 1), MAX_REMINDER_BATCH);
  const until = new Date(now.getTime() + windowHours * 3_600_000);

  const due = await deps.prisma.assignment.findMany({
    where: {
      shiftReminderSentAt: null,
      status: { in: [...REMINDABLE_STATUSES] },
      confirmedStartAt: { gte: now, lte: until }
    },
    select: {
      id: true,
      jobRequestId: true,
      confirmedTitle: true,
      confirmedStartAt: true,
      workerIdentity: {
        select: { userId: true, user: { select: { emailNormalized: true, phone: true, primaryLanguage: true } } }
      }
    },
    orderBy: { confirmedStartAt: "asc" },
    take: batchSize
  });

  let reminded = 0;
  let skipped = 0;
  let failed = 0;
  for (const assignment of due) {
    try {
      const user = assignment.workerIdentity?.user;
      const email = user?.emailNormalized;
      if (!email) {
        skipped += 1;
        continue;
      }
      const language = resolveWorkerLanguage(user?.primaryLanguage);
      await deps.emailSender.send(
        shiftReminderEmail({ to: email, language, title: assignment.confirmedTitle, startAt: assignment.confirmedStartAt })
      );
      if (deps.smsSender && user?.phone && sendsText("shift_reminder")) {
        await deps.smsSender
          .send({
            to: user.phone,
            text: shiftReminderSmsText({ language, title: assignment.confirmedTitle, startAt: assignment.confirmedStartAt })
          })
          .catch(() => undefined);
      }
      const userId = assignment.workerIdentity?.userId;
      if (userId) {
        await pushToWorkers(deps.pushSender, [userId], "shift_reminder", {
          role: assignment.confirmedTitle,
          jobRequestId: assignment.jobRequestId
        });
      }
      // Mark reminded (guarded on still-null so concurrent sweeps don't double-count).
      await deps.prisma.assignment.updateMany({
        where: { id: assignment.id, shiftReminderSentAt: null },
        data: { shiftReminderSentAt: now }
      });
      reminded += 1;
    } catch {
      failed += 1;
    }
  }

  return { scanned: due.length, reminded, skipped, failed };
}
