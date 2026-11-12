import type { BrainAction } from "@rwos/brain";
import type { JoblopBrainContext } from "./joblopRules";

// Joblop's phase-1 actions. Each key is also its switch name on the Brain page. None moves money:
// charging employers, settling payments, payouts and marking workers paid stay with people.

export const JOBLOP_ACTION_KEYS = [
  "resend_failed_message",
  "remind_worker_check_in",
  "remind_employer_timesheet",
  "remind_worker_timesheet",
  "offer_employer_bonus",
  "auto_approve_request",
  "auto_approve_timesheet"
] as const;
export type JoblopActionKey = (typeof JOBLOP_ACTION_KEYS)[number];

/** Not an action, but a switch too. */
export const DAILY_SUMMARY_SWITCH = "daily_summary_email";

export const resendFailedMessageAction: BrainAction<JoblopBrainContext> = {
  key: "resend_failed_message",
  movesMoney: false,
  dailyCap: 50,
  undoHint: "A sent message cannot be taken back. Contact the person if it was wrong.",
  describe: () => "re-send the failed email or text once",
  run: (issue, { effects }) => effects.resendFailedMessage(issue.subjectId)
};

export const remindWorkerCheckInAction: BrainAction<JoblopBrainContext> = {
  key: "remind_worker_check_in",
  movesMoney: false,
  dailyCap: 100,
  undoHint: "A text cannot be taken back. Call the worker if needed.",
  describe: () => "text the worker to check in now",
  run: (issue, { effects }) => effects.remindWorkerToCheckIn(issue.subjectId)
};

export const remindEmployerTimesheetAction: BrainAction<JoblopBrainContext> = {
  key: "remind_employer_timesheet",
  movesMoney: false,
  dailyCap: 50,
  undoHint: "An email cannot be taken back. Write to the employer if needed.",
  describe: () => "email the employer to confirm the hours",
  run: (issue, { effects }) => effects.remindEmployerToConfirmHours(issue.subjectId)
};

export const remindWorkerTimesheetAction: BrainAction<JoblopBrainContext> = {
  key: "remind_worker_timesheet",
  movesMoney: false,
  dailyCap: 100,
  undoHint: "A reminder cannot be taken back. Contact the worker if needed.",
  describe: () => "remind the worker to confirm their hours (email, or a text when they have no email)",
  run: (issue, { effects }) => effects.remindWorkerToConfirmHours(issue.subjectId)
};

export const offerEmployerBonusAction: BrainAction<JoblopBrainContext> = {
  key: "offer_employer_bonus",
  movesMoney: false,
  dailyCap: 10,
  undoHint: "Undo withdraws the offer while the employer has not answered. The email already sent stays sent.",
  describe: () => "offer the employer the suggested bonus (they accept or decline; nothing is charged now)",
  run: (issue, { effects }) => effects.offerEmployerBonus(issue.subjectId, `Brain: ${issue.summary}`),
  async undo(ticket, { effects }, staff) {
    const bonusId = ticket.data.bonusId;
    if (ticket.kind !== "withdraw_bonus_offer" || typeof bonusId !== "string") return { ok: false, detail: "Nothing to undo." };
    return effects.withdrawBonusOffer(bonusId, staff.userId);
  }
};

export const autoApproveRequestAction: BrainAction<JoblopBrainContext> = {
  key: "auto_approve_request",
  movesMoney: false,
  dailyCap: 20,
  undoHint: "No one-click undo: cancel the request from Order review if the approval was wrong.",
  describe: () => "approve the request for dispatch through the normal staff approval",
  run: (issue, { effects }) => effects.approveRequest(issue.subjectId)
};

export const autoApproveTimesheetAction: BrainAction<JoblopBrainContext> = {
  key: "auto_approve_timesheet",
  movesMoney: false,
  dailyCap: 50,
  undoHint: "Undo sends the hours back for correction (only before they are locked or invoiced).",
  describe: () => "approve the hours through the normal staff approval",
  run: (issue, { effects }) => effects.approveTimesheet(issue.subjectId),
  async undo(ticket, { effects }, staff) {
    const timesheetId = ticket.data.timesheetId;
    if (ticket.kind !== "reopen_timesheet" || typeof timesheetId !== "string") return { ok: false, detail: "Nothing to undo." };
    return effects.reopenTimesheet(timesheetId, staff.userId);
  }
};

export const JOBLOP_BRAIN_ACTIONS: readonly BrainAction<JoblopBrainContext>[] = [
  resendFailedMessageAction,
  remindWorkerCheckInAction,
  remindEmployerTimesheetAction,
  remindWorkerTimesheetAction,
  offerEmployerBonusAction,
  autoApproveRequestAction,
  autoApproveTimesheetAction
];
