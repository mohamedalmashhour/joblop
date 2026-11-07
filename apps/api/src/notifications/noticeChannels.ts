// The house rule for how Joblop reaches people, kept in one place so every notice follows it:
//   - Sign-in is by mobile number and a texted code. No passwords.
//   - Email carries documents and information: invoices, receipts, statements, replies, greetings.
//   - Text carries only what is urgent or important: codes, a confirmed shift, a shift about to
//     start, and staff alerts marked urgent. Texts cost money and interrupt, so nothing else.
// A notice not listed here is email only.

export type NoticeKind =
  | "sign_in_code"
  | "email_confirmation_code"
  | "shift_confirmed"
  | "shift_reminder"
  | "invoice_sent"
  | "job_received"
  | "worker_accepted"
  | "payout_registered"
  | "payout_paid"
  | "account_notice"
  | "staff_needed"
  | "staff_replied"
  | "greeting";

export type NoticeChannels = Readonly<{ email: boolean; text: "always" | "urgent_only" | "never" }>;

export const NOTICE_CHANNELS: Readonly<Record<NoticeKind, NoticeChannels>> = {
  sign_in_code: { email: false, text: "always" },
  email_confirmation_code: { email: true, text: "always" },
  shift_confirmed: { email: true, text: "always" },
  shift_reminder: { email: true, text: "always" },
  invoice_sent: { email: true, text: "never" },
  job_received: { email: true, text: "never" },
  worker_accepted: { email: true, text: "never" },
  payout_registered: { email: true, text: "never" },
  payout_paid: { email: true, text: "never" },
  account_notice: { email: true, text: "never" },
  staff_needed: { email: true, text: "urgent_only" },
  staff_replied: { email: true, text: "never" },
  greeting: { email: true, text: "never" }
};

export function sendsEmail(kind: NoticeKind): boolean {
  return NOTICE_CHANNELS[kind].email;
}

export function sendsText(kind: NoticeKind, options: Readonly<{ urgent?: boolean }> = {}): boolean {
  const rule = NOTICE_CHANNELS[kind].text;
  return rule === "always" || (rule === "urgent_only" && options.urgent === true);
}
