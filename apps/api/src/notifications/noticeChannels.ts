// The house rule for how Joblop reaches people, kept in one place so every notice follows it:
//   - Sign-in is by mobile number and a texted code. No passwords.
//   - Email carries documents and information: invoices, receipts, statements, replies, greetings.
//   - Text carries only what is urgent or important: codes, a confirmed shift, a shift about to
//     start, a shift started with no check-in yet, a held shift that is cancelled or changed, a paid plan or listing ending tomorrow, and
//     staff alerts marked urgent. Texts cost
//     money and interrupt, so nothing else.
//   - Push (the phone app) carries what a worker should see at once: a confirmed, upcoming,
//     cancelled or changed shift, a staff reply, and pay sent. Push is free but still interrupts.
// A notice not listed here is email only.

export type NoticeKind =
  | "sign_in_code"
  | "email_confirmation_code"
  | "shift_confirmed"
  | "shift_reminder"
  | "shift_cancelled"
  | "shift_changed"
  | "invoice_sent"
  | "receipt_sent"
  | "plan_ending"
  | "job_received"
  | "worker_accepted"
  | "payout_registered"
  | "payout_paid"
  | "account_notice"
  | "staff_needed"
  | "staff_replied"
  | "greeting"
  | "check_in_reminder"
  | "timesheet_reminder"
  | "staff_summary";

export type NoticeChannels = Readonly<{ email: boolean; text: "always" | "urgent_only" | "never"; push?: boolean }>;

export const NOTICE_CHANNELS: Readonly<Record<NoticeKind, NoticeChannels>> = {
  sign_in_code: { email: false, text: "always" },
  email_confirmation_code: { email: true, text: "always" },
  shift_confirmed: { email: true, text: "always", push: true },
  shift_reminder: { email: true, text: "always", push: true },
  // A worker must not travel to a shift that no longer exists, or arrive at the wrong time or place.
  shift_cancelled: { email: true, text: "always", push: true },
  shift_changed: { email: true, text: "always", push: true },
  invoice_sent: { email: true, text: "never" },
  receipt_sent: { email: true, text: "never" },
  // Paid plan or listing ending: email 7 days and 1 day before; text only the day before (urgent).
  plan_ending: { email: true, text: "urgent_only" },
  job_received: { email: true, text: "never" },
  worker_accepted: { email: true, text: "never" },
  payout_registered: { email: true, text: "never" },
  payout_paid: { email: true, text: "never", push: true },
  account_notice: { email: true, text: "never" },
  staff_needed: { email: true, text: "urgent_only" },
  staff_replied: { email: true, text: "never", push: true },
  greeting: { email: true, text: "never" },
  // Brain (phase 1): a confirmed worker who has not checked in 10 minutes after the start is urgent.
  check_in_reminder: { email: false, text: "always" },
  timesheet_reminder: { email: true, text: "never" },
  staff_summary: { email: true, text: "never" }
};

export function sendsEmail(kind: NoticeKind): boolean {
  return NOTICE_CHANNELS[kind].email;
}

export function sendsText(kind: NoticeKind, options: Readonly<{ urgent?: boolean }> = {}): boolean {
  const rule = NOTICE_CHANNELS[kind].text;
  return rule === "always" || (rule === "urgent_only" && options.urgent === true);
}

export function sendsPush(kind: NoticeKind): boolean {
  return NOTICE_CHANNELS[kind].push === true;
}
