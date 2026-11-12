import type { ActionOutcome } from "@rwos/brain";
import type { PrismaClient } from "@rwos/database";
import { offerSuggestedBonusToEmployer, withdrawBonusOffer } from "../jobBonusRoutes";
import type { EmailSender } from "../mailer/emailSender";
import type { SmsSender } from "../mailer/smsSender";
import { resolveLanguage } from "../notifications/clientNotifications";
import { sendsEmail, sendsText } from "../notifications/noticeChannels";
import { resolveWorkerLanguage } from "../notifications/workerLanguage";
import { checkInReminderSmsText, noShowEmployerEmail, timesheetReminderEmail, workerTimesheetReminderEmail, workerTimesheetReminderSmsText } from "./brainText";
import type { JoblopBrainEffects } from "./joblopRules";
import { requestReadiness, timesheetReadyForApproval } from "./joblopRules";

// The Joblop actions' real effects, built only from existing pieces: the gated email/SMS senders and
// the notice-channel rules for messages, and the SAME domain flows staff use for approvals (passed in
// from app.ts as `domain`, running the governed services with the brain's staff account). Every effect
// re-reads the row first, so a problem fixed since the sweep is left alone.

const LIVE_ASSIGNMENT = new Set(["confirmed", "worker_acknowledged", "ready_for_attendance", "in_attendance_window", "attendance_handoff"]);

/** Governed flows, each refusing (throwing) exactly as it does for staff. */
export type JoblopBrainDomain = Readonly<{
  /** The staff approve-for-dispatch flow (admin review first when the request is still "submitted"). */
  approveJobRequest(input: { jobRequestId: string; actorUserId: string }): Promise<void>;
  /** The staff timesheet approval. */
  approveTimesheet(input: { timesheetId: string; expectedVersion: number; actorUserId: string }): Promise<void>;
  /** The staff "request correction" step (used to undo a brain approval). */
  requestTimesheetCorrection(input: { timesheetId: string; expectedVersion: number; reason: string; actorUserId: string }): Promise<void>;
}>;

export type JoblopEffectsDeps = Readonly<{
  prisma: PrismaClient;
  /** Senders that record failures (for new reminders). */
  emailSender: EmailSender;
  smsSender?: SmsSender | undefined;
  /** Plain senders for re-sends, so a failed re-send does not create a new failure row. */
  rawEmailSender: EmailSender;
  rawSmsSender?: SmsSender | undefined;
  /** The staff account the brain acts as (BRAIN_ACTOR_USER_ID). Without it the brain changes no records. */
  actorUserId: string | null;
  domain: JoblopBrainDomain | null;
  now: () => Date;
}>;

const NO_ACTOR = "The brain staff account is not set (BRAIN_ACTOR_USER_ID), so it changes no records.";

const errorDetail = (error: unknown) => {
  const code = error && typeof error === "object" ? (error as { code?: unknown }).code : undefined;
  const message = error instanceof Error ? error.message : "Refused.";
  return `Refused by the normal checks: ${typeof code === "string" ? `${code} ` : ""}${message}`.slice(0, 500);
};

export function createJoblopBrainEffects(deps: JoblopEffectsDeps): JoblopBrainEffects {
  const { prisma } = deps;

  /** Email the job's employer once per shift that their worker has not checked in yet. True when sent. */
  async function tellEmployerNotCheckedIn(
    assignmentId: string,
    a: Readonly<{ confirmedStartAt: Date; timezone: string; jobRequest: Readonly<{ jobRequestNumber: string; title: string; createdByUserId: string | null }> | null }>
  ): Promise<boolean> {
    const job = a.jobRequest;
    if (!job?.createdByUserId || !sendsEmail("no_show_employer")) return false;
    const user = await prisma.user.findUnique({ where: { id: job.createdByUserId }, select: { emailNormalized: true, primaryLanguage: true } });
    if (!user?.emailNormalized) return false;
    // Once per shift, even across a staff retry: the first claim of the marker wins.
    try {
      await prisma.brainMarker.create({ data: { marker: `no_show_employer:${assignmentId}:${a.confirmedStartAt.toISOString()}`, createdAt: deps.now() } });
    } catch {
      return false;
    }
    const result = await deps.emailSender
      .send(
        noShowEmployerEmail({
          to: user.emailNormalized,
          language: resolveLanguage(user.primaryLanguage),
          jobCode: job.jobRequestNumber,
          title: job.title,
          startAt: a.confirmedStartAt,
          timezone: a.timezone
        })
      )
      .catch(() => ({ status: "error" as const }));
    return result.status === "sent";
  }

  return {
    async resendFailedMessage(failureId): Promise<ActionOutcome> {
      const row = await prisma.messageDeliveryFailure.findUnique({ where: { id: failureId } });
      if (!row) return { status: "skipped", detail: "The failed message is gone." };
      if (row.resentAt) return { status: "skipped", detail: "Already re-sent." };
      if (!row.retryable || !row.body) return { status: "skipped", detail: "Not safe to re-send automatically (code, link or attachment)." };
      let result: { status: string };
      if (row.channel === "sms") {
        if (!deps.rawSmsSender) return { status: "skipped", detail: "Texts are not set up." };
        result = await deps.rawSmsSender.send({ to: row.recipient, text: row.body });
      } else {
        result = await deps.rawEmailSender.send({ to: row.recipient, subject: row.subject ?? "Joblop", text: row.body });
      }
      if (result.status === "sent") {
        await prisma.messageDeliveryFailure.update({
          where: { id: row.id },
          data: { resentAt: deps.now(), resendCount: { increment: 1 }, body: null }
        });
        return { status: "done", detail: `Re-sent the ${row.channel === "sms" ? "text" : "email"}.` };
      }
      await prisma.messageDeliveryFailure.update({ where: { id: row.id }, data: { resendCount: { increment: 1 } } });
      return result.status === "error"
        ? { status: "failed", detail: "The re-send failed too. A person should check the address or number." }
        : { status: "skipped", detail: "Sending is switched off or not set up." };
    },

    async remindWorkerToCheckIn(assignmentId): Promise<ActionOutcome> {
      const a = await prisma.assignment.findUnique({
        where: { id: assignmentId },
        select: {
          status: true,
          confirmedTitle: true,
          confirmedStartAt: true,
          confirmedEndAt: true,
          timezone: true,
          attendanceRecord: { select: { checkInAt: true, status: true } },
          jobRequest: { select: { status: true, jobRequestNumber: true, title: true, createdByUserId: true } },
          workerIdentity: { select: { user: { select: { phone: true, primaryLanguage: true } } } }
        }
      });
      if (!a || !LIVE_ASSIGNMENT.has(a.status)) return { status: "skipped", detail: "The shift is no longer active." };
      if (a.attendanceRecord?.status === "cancelled" || a.jobRequest?.status === "cancelled") {
        return { status: "skipped", detail: "The shift was cancelled." };
      }
      if (a.attendanceRecord?.checkInAt) return { status: "skipped", detail: "The worker has checked in since." };
      if (deps.now().getTime() >= a.confirmedEndAt.getTime()) return { status: "skipped", detail: "The shift is over." };
      // The employer hears about it once per shift ("not checked in yet, Joblop is on it"), whether or
      // not the worker can be texted. A staff retry of this action never emails the employer twice.
      const employerTold = await tellEmployerNotCheckedIn(assignmentId, a);
      const told = employerTold ? " Told the employer." : "";
      // Not done until the worker is reached; a skipped or failed run stays open and is listed as
      // needing a person (staff can call, then use "Do it" again once a phone number is added).
      if (!sendsText("check_in_reminder")) return { status: "skipped", detail: `Check-in texts are off in the notice rules.${told} A person must call the worker.` };
      const phone = a.workerIdentity?.user?.phone;
      if (!deps.smsSender || !phone) return { status: "skipped", detail: `No phone number or texts not set up.${told} A person must call the worker.` };
      const result = await deps.smsSender.send({
        to: phone,
        text: checkInReminderSmsText({
          language: resolveWorkerLanguage(a.workerIdentity?.user?.primaryLanguage),
          title: a.confirmedTitle,
          startAt: a.confirmedStartAt,
          timezone: a.timezone
        })
      });
      // A sent text is not a worker on site: the issue stays open until they check in (or staff close it).
      if (result.status === "sent") return { status: "done", detail: `Texted the worker to check in.${told}`, resolvesIssue: false };
      return result.status === "error"
        ? { status: "failed", detail: `The text failed to send.${told}` }
        : { status: "skipped", detail: `Texts are switched off.${told} A person must call the worker.` };
    },

    async remindWorkerToConfirmHours(timesheetId): Promise<ActionOutcome> {
      const t = await prisma.timesheet.findUnique({
        where: { id: timesheetId },
        select: {
          status: true,
          workerReviewStatus: true,
          scheduledStartAt: true,
          timezone: true,
          jobRequest: { select: { title: true } },
          workerIdentity: { select: { user: { select: { emailNormalized: true, phone: true, primaryLanguage: true } } } }
        }
      });
      if (!t || t.status !== "worker_review") return { status: "skipped", detail: "The hours are no longer waiting for the worker." };
      if (t.workerReviewStatus === "confirmed" || t.workerReviewStatus === "disputed") return { status: "skipped", detail: "The worker has answered since." };
      const user = t.workerIdentity?.user;
      const language = resolveWorkerLanguage(user?.primaryLanguage);
      const copy = { language, title: t.jobRequest.title, shiftStart: t.scheduledStartAt, timezone: t.timezone };
      if (user?.emailNormalized && sendsEmail("worker_timesheet_reminder")) {
        const result = await deps.emailSender.send(workerTimesheetReminderEmail({ to: user.emailNormalized, ...copy }));
        if (result.status === "sent") return { status: "done", detail: "Emailed the worker to confirm their hours." };
        return result.status === "error" ? { status: "failed", detail: "The email failed to send." } : { status: "skipped", detail: "Email is not set up." };
      }
      // No email (phone sign-in): a text is the only way to reach them, so it is sent as important.
      if (user?.phone && deps.smsSender && sendsText("worker_timesheet_reminder", { urgent: true })) {
        const result = await deps.smsSender.send({ to: user.phone, text: workerTimesheetReminderSmsText(copy) });
        if (result.status === "sent") return { status: "done", detail: "Texted the worker to confirm their hours." };
        return result.status === "error" ? { status: "failed", detail: "The text failed to send." } : { status: "skipped", detail: "Texts are switched off." };
      }
      return { status: "skipped", detail: "The worker has no email or phone number. A person must contact them." };
    },

    async remindEmployerToConfirmHours(timesheetId): Promise<ActionOutcome> {
      const t = await prisma.timesheet.findUnique({
        where: { id: timesheetId },
        select: {
          status: true,
          employerReviewStatus: true,
          scheduledStartAt: true,
          timezone: true,
          jobRequest: { select: { jobRequestNumber: true, title: true, createdByUserId: true } }
        }
      });
      if (!t || (t.status !== "worker_review" && t.status !== "employer_review")) return { status: "skipped", detail: "The hours are no longer waiting for the employer." };
      if (t.employerReviewStatus === "confirmed" || t.employerReviewStatus === "disputed") return { status: "skipped", detail: "The employer has answered since." };
      if (!sendsEmail("timesheet_reminder")) return { status: "skipped", detail: "Hour reminders are off in the notice rules." };
      const user = await prisma.user.findUnique({ where: { id: t.jobRequest.createdByUserId }, select: { emailNormalized: true, primaryLanguage: true } });
      if (!user?.emailNormalized) return { status: "skipped", detail: "The employer has no email." };
      const result = await deps.emailSender.send(
        timesheetReminderEmail({
          to: user.emailNormalized,
          language: resolveLanguage(user.primaryLanguage),
          jobCode: t.jobRequest.jobRequestNumber,
          title: t.jobRequest.title,
          shiftStart: t.scheduledStartAt,
          timezone: t.timezone
        })
      );
      if (result.status === "sent") return { status: "done", detail: "Emailed the employer to confirm the hours." };
      return result.status === "error" ? { status: "failed", detail: "The email failed to send." } : { status: "skipped", detail: "Email is not set up." };
    },

    async offerEmployerBonus(jobRequestId, reason): Promise<ActionOutcome> {
      if (!deps.actorUserId) return { status: "skipped", detail: NO_ACTOR };
      const result = await offerSuggestedBonusToEmployer(prisma, deps.emailSender, { jobRequestId, actorUserId: deps.actorUserId, reason, now: deps.now() });
      if (result.status === "offered") {
        return {
          status: "done",
          detail: "Offered the employer the suggested hourly bonus. Nothing is charged unless they accept.",
          undo: { kind: "withdraw_bonus_offer", data: { bonusId: result.bonusId } },
          // The job is still unfilled; the offer does not close the issue.
          resolvesIssue: false
        };
      }
      const why = {
        not_open: "The job is no longer approved and priced.",
        not_on_job_board: "The job is not on the job board, so a bonus would not reach workers.",
        already_has_bonus: "The job already has a bonus.",
        employer_declined: "The employer already declined a bonus for this job; a person decides what is next.",
        no_suggestion: "No bonus can be suggested for this job."
      }[result.status];
      return { status: "skipped", detail: why };
    },

    async approveRequest(jobRequestId): Promise<ActionOutcome> {
      if (!deps.actorUserId || !deps.domain) return { status: "skipped", detail: NO_ACTOR };
      const row = await prisma.jobRequest.findUnique({
        where: { id: jobRequestId },
        select: {
          id: true,
          jobRequestNumber: true,
          title: true,
          status: true,
          submittedAt: true,
          startAt: true,
          endAt: true,
          numberOfWorkers: true,
          description: true,
          jobLength: true,
          requiredCertificateOther: true,
          residence: { select: { addressLine1: true, addressSummary: true, city: true } }
        }
      });
      if (!row || (row.status !== "submitted" && row.status !== "admin_review")) return { status: "skipped", detail: "The request is no longer waiting for review." };
      const escalation = await prisma.requestEscalation.findFirst({ where: { jobRequestId, status: "open" }, select: { id: true } });
      const readiness = requestReadiness(
        {
          jobRequestId: row.id,
          jobRequestNumber: row.jobRequestNumber,
          title: row.title,
          status: row.status,
          submittedAt: row.submittedAt,
          startAt: row.startAt,
          endAt: row.endAt,
          numberOfWorkers: row.numberOfWorkers,
          description: row.description,
          jobLength: row.jobLength,
          hasWorksiteAddress: Boolean((row.residence?.addressLine1 ?? row.residence?.addressSummary)?.trim() && row.residence?.city?.trim()),
          requiredCertificateOther: row.requiredCertificateOther,
          openEscalation: escalation !== null
        },
        deps.now()
      );
      if (readiness.missing.length > 0 || readiness.needsPerson.length > 0) {
        return { status: "skipped", detail: `No longer passes every check: ${[...readiness.missing, ...readiness.needsPerson].join(", ")}.` };
      }
      try {
        // Pricing (a priced contract, the worker rate floor) is checked inside the approval itself.
        await deps.domain.approveJobRequest({ jobRequestId, actorUserId: deps.actorUserId });
      } catch (error) {
        return { status: "failed", detail: errorDetail(error) };
      }
      return { status: "done", detail: "Approved the request for dispatch through the normal staff approval." };
    },

    async approveTimesheet(timesheetId): Promise<ActionOutcome> {
      if (!deps.actorUserId || !deps.domain) return { status: "skipped", detail: NO_ACTOR };
      const t = await prisma.timesheet.findUnique({
        where: { id: timesheetId },
        select: {
          id: true,
          version: true,
          status: true,
          scheduledStartAt: true,
          scheduledEndAt: true,
          workerReviewStatus: true,
          employerReviewStatus: true,
          actualCheckInAt: true,
          actualCheckOutAt: true,
          exceptionSummary: true,
          jobRequest: { select: { jobRequestNumber: true, title: true } },
          attendanceRecord: { select: { exceptionCategory: true } }
        }
      });
      if (!t) return { status: "skipped", detail: "The hours are gone." };
      const ready = timesheetReadyForApproval({
        timesheetId: t.id,
        jobRequestNumber: t.jobRequest.jobRequestNumber,
        title: t.jobRequest.title,
        status: t.status,
        scheduledStartAt: t.scheduledStartAt,
        scheduledEndAt: t.scheduledEndAt,
        workerReviewStatus: t.workerReviewStatus,
        employerReviewStatus: t.employerReviewStatus,
        actualCheckInAt: t.actualCheckInAt,
        actualCheckOutAt: t.actualCheckOutAt,
        exceptionSummary: t.exceptionSummary,
        attendanceException: t.attendanceRecord.exceptionCategory
      });
      if (!ready) return { status: "skipped", detail: "The hours no longer pass every check." };
      try {
        await deps.domain.approveTimesheet({ timesheetId, expectedVersion: t.version, actorUserId: deps.actorUserId });
      } catch (error) {
        return { status: "failed", detail: errorDetail(error) };
      }
      return { status: "done", detail: "Approved the hours through the normal staff approval.", undo: { kind: "reopen_timesheet", data: { timesheetId } } };
    },

    async withdrawBonusOffer(bonusId, staffUserId) {
      const ok = await withdrawBonusOffer(prisma, { bonusId, actorUserId: staffUserId, now: deps.now() });
      return ok ? { ok: true, detail: "Withdrew the bonus offer." } : { ok: false, detail: "Too late: the employer has answered or the offer is gone." };
    },

    async reopenTimesheet(timesheetId, staffUserId) {
      if (!deps.domain) return { ok: false, detail: "Not available." };
      const t = await prisma.timesheet.findUnique({ where: { id: timesheetId }, select: { version: true, status: true } });
      if (!t || t.status !== "approved") return { ok: false, detail: "Too late: the hours are no longer just approved (locked or changed)." };
      try {
        await deps.domain.requestTimesheetCorrection({ timesheetId, expectedVersion: t.version, reason: "Brain approval undone by staff.", actorUserId: staffUserId });
      } catch (error) {
        return { ok: false, detail: errorDetail(error) };
      }
      return { ok: true, detail: "Sent the hours back for correction." };
    }
  };
}
