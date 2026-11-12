import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { confirmEmailMessage } from "./addEmail";
import { checkInReminderSmsText, noShowEmployerEmail, summaryCopy, timesheetReminderEmail, workerTimesheetReminderEmail, workerTimesheetReminderSmsText } from "./brain/brainText";
import { hoursReportRejectedEmail, hoursReportRejectedSmsText } from "./hoursReport";
import { contactRepliedEmail } from "./instantContactRoutes";
import { jobAlertConfirmationEmail, jobAlertDigestEmail } from "./jobAlerts";
import { applicationDecisionEmail } from "./longTermApplications";
import { verificationEmailMessage } from "./mailer/emailSender";
import { bonusOfferEmail, invoiceSentEmail, jobCodeEmail, workerAcceptedEmail, workerCancelledEmail } from "./notifications/clientNotifications";
import { passwordResetSms, signInCodeSms, verificationCodeSms } from "./notifications/smsBrand";
import {
  accountPenaltyEmail,
  assignedJobEmail,
  assignedJobSmsText,
  payoutPaidEmail,
  payoutRegisteredEmail,
  shiftCancelledEmail,
  shiftCancelledSmsText,
  shiftChangedEmail,
  shiftChangedSmsText,
  shiftReminderEmail,
  shiftReminderSmsText
} from "./notifications/workerNotifications";
import { passwordResetEmail } from "./passwordReset";
import { paymentReceiptEmail } from "./paymentReceipts";
import { planEndingEmail, planEndingSmsText } from "./planReminderSweep";
import { certificateEmail, greetingEmail } from "./platformGreetings";

// Owner rule (2026-11-12): every email and every SMS exists in English, French and Arabic, and is
// sent in the recipient's one chosen language. This test renders each template in all three and
// fails if one language is missing (e.g. Arabic silently falling back to French). The scan at the
// end fails when someone adds a new email/SMS builder without listing it here.

type Lang = "en" | "fr" | "ar";
const ARABIC = /[؀-ۿ]/;
const startAt = new Date("2027-02-12T13:00:00.000Z");
const shift = { role: "Farm worker", startAt, endAt: new Date("2027-02-12T19:00:00.000Z"), timeZone: "America/Toronto", area: "Laval, QC" };
const receipt = {
  receiptNumber: "R-2027-0001", kind: "plan", itemLabel: "Shift Pro", totalMinor: 11498, subtotalMinor: 10000, gstMinor: 500, qstMinor: 998,
  periodStart: new Date("2027-02-01T05:00:00Z"), periodEnd: new Date("2027-03-01T05:00:00Z")
} as unknown as Parameters<typeof paymentReceiptEmail>[0]["receipt"];
const recipient = (language: Lang) => ({ userId: "u", kind: "worker" as const, name: "Sam", email: "s@x.test", language });

/** name → render(language) → the words the person reads (subject + body, or the SMS text). */
const TEMPLATES: Record<string, (language: Lang) => string> = {
  // Worker emails and texts.
  assignedJobEmail: (language) => flat(assignedJobEmail({ to: "w@x.test", language, title: "Farm worker", startAt })),
  assignedJobSmsText: (language) => assignedJobSmsText({ language, title: "Farm worker", startAt }),
  shiftReminderEmail: (language) => flat(shiftReminderEmail({ to: "w@x.test", language, title: "Farm worker", startAt })),
  shiftReminderSmsText: (language) => shiftReminderSmsText({ language, title: "Farm worker", startAt }),
  shiftCancelledEmail: (language) => flat(shiftCancelledEmail({ to: "w@x.test", language, shift, cancelledBy: "employer" })),
  shiftCancelledSmsText: (language) => shiftCancelledSmsText({ language, shift }),
  shiftChangedEmail: (language) => flat(shiftChangedEmail({ to: "w@x.test", language, shift, summary: { newPlace: "77 Field Road" } })),
  shiftChangedSmsText: (language) => shiftChangedSmsText({ language, shift, summary: { newPlace: "77 Field Road" } }),
  payoutPaidEmail: (language) => flat(payoutPaidEmail({ to: "w@x.test", language, amountMinor: 12345, currency: "CAD" })),
  payoutRegisteredEmail: (language) => flat(payoutRegisteredEmail({ to: "w@x.test", language, amountMinor: 12345, currency: "CAD" })),
  accountPenaltyEmail: (language) => flat(accountPenaltyEmail({ to: "w@x.test", language, penalty: "suspend", suspensionDays: 7 })),
  applicationDecisionEmail: (language) => flat(applicationDecisionEmail({ to: "w@x.test", language, decision: "hired", jobTitle: "Farm worker", employerName: "Ferme Laval" })),
  checkInReminderSmsText: (language) => checkInReminderSmsText({ language, title: "Farm worker", startAt, timezone: "America/Toronto" }),
  workerTimesheetReminderEmail: (language) => flat(workerTimesheetReminderEmail({ to: "w@x.test", language, title: "Farm worker", shiftStart: startAt, timezone: "America/Toronto" })),
  workerTimesheetReminderSmsText: (language) => workerTimesheetReminderSmsText({ language, title: "Farm worker", shiftStart: startAt, timezone: "America/Toronto" }),
  hoursReportRejectedEmail: (language) =>
    flat(hoursReportRejectedEmail({ to: "w@x.test", language, title: "Farm worker", startAt, timezone: "America/Toronto", reason: "The farm has no record of this shift." })),
  hoursReportRejectedSmsText: (language) => hoursReportRejectedSmsText({ language, title: "Farm worker", startAt, timezone: "America/Toronto" }),
  jobAlertConfirmationEmail: (language) =>
    flat(jobAlertConfirmationEmail({ to: "w@x.test", language, criteria: { roleKeywords: "farm", province: "QC" }, workerWebOrigin: "https://joblop.com", unsubscribeToken: "t" })),
  jobAlertDigestEmail: (language) =>
    flat(jobAlertDigestEmail({ to: "w@x.test", language, criteria: { roleKeywords: "farm", province: "QC" }, items: [], workerWebOrigin: "https://joblop.com", unsubscribeToken: "t" })),
  // Employer / client emails and texts.
  jobCodeEmail: (language) => flat(jobCodeEmail({ to: "e@x.test", language, jobCode: "JR-1", title: "Farm worker" })),
  workerAcceptedEmail: (language) => flat(workerAcceptedEmail({ to: "e@x.test", language, jobCode: "JR-1", title: "Farm worker" })),
  workerCancelledEmail: (language) => flat(workerCancelledEmail({ to: "e@x.test", language, jobCode: "JR-1", title: "Farm worker" })),
  bonusOfferEmail: (language) => flat(bonusOfferEmail({ to: "e@x.test", language, jobCode: "JR-1", title: "Farm worker", bonusKind: "hourly", amountMinor: 250 })),
  invoiceSentEmail: (language) => flat(invoiceSentEmail({ to: "e@x.test", language, invoiceNumber: "INV-1" })),
  timesheetReminderEmail: (language) => flat(timesheetReminderEmail({ to: "e@x.test", language, jobCode: "JR-1", title: "Farm worker", shiftStart: startAt, timezone: "America/Toronto" })),
  noShowEmployerEmail: (language) => flat(noShowEmployerEmail({ to: "e@x.test", language, jobCode: "JR-1", title: "Farm worker", startAt, timezone: "America/Toronto" })),
  planEndingEmail: (language) => flat(planEndingEmail({ to: "e@x.test", language, subject: { kind: "plan", plan: "shift_pro" }, endsAt: startAt, stage: 1 } as Parameters<typeof planEndingEmail>[0])),
  planEndingSmsText: (language) => planEndingSmsText({ language, subject: { kind: "listing", jobTitle: "Farm worker" }, endsAt: startAt }),
  paymentReceiptEmail: (language) => flat(paymentReceiptEmail({ to: "e@x.test", language, receipt, pdf: null })),
  // Everyone: account emails, codes, greetings and certificates, contact desk.
  verificationEmailMessage: (language) => flat(verificationEmailMessage("p@x.test", "123456", 10, language)),
  passwordResetEmail: (language) => flat(passwordResetEmail({ to: "p@x.test", language, resetUrl: "https://joblop.com/r", minutes: 30 })),
  passwordResetSms: (language) => passwordResetSms(language, "https://joblop.com/r", 30),
  signInCodeSms: (language) => signInCodeSms(language, "123456"),
  verificationCodeSms: (language) => verificationCodeSms(language, "123456", 10),
  confirmEmailMessage: (language) => flat(confirmEmailMessage("p@x.test", "https://joblop.com/confirm", language)),
  contactRepliedEmail: (language) => flat(contactRepliedEmail("p@x.test", language)),
  greetingEmail: (language) => flat(greetingEmail(recipient(language), "Joblop", "Happy holidays")),
  certificateEmail: (language) => flat(certificateEmail(recipient(language), "Super Worker", "SW-1", null)),
  // Staff: the daily Brain summary copy (rendered for the staff inbox in all three languages).
  summaryCopy: (language) => Object.values(summaryCopy(language)).filter((v) => typeof v === "string").join(" ")
};

function flat(message: { subject: string; text: string }): string {
  return `${message.subject}\n${message.text}`;
}

describe("every email and SMS exists in English, French and Arabic", () => {
  for (const [name, render] of Object.entries(TEMPLATES)) {
    it(name, () => {
      const en = render("en");
      const fr = render("fr");
      const ar = render("ar");
      expect(ar, `${name}: Arabic version`).toMatch(ARABIC);
      expect(en, `${name}: English must not be Arabic`).not.toMatch(ARABIC);
      expect(fr, `${name}: French must not be Arabic`).not.toMatch(ARABIC);
      expect(fr, `${name}: French must not be the English text`).not.toBe(en);
    });
  }
});

// Builders are exported functions named …Email, …EmailMessage, …SmsText or …Sms (helpers excluded).
const NOT_TEMPLATES = new Set(["noticeSms", "codeSms", "isPlausibleEmail", "sendsEmail", "sendPaymentReceiptEmail", "unfilledShiftsEmail", "hoursReportStaffAlertEmail"]);
// unfilledShiftsEmail, hoursReportStaffAlertEmail: staff-inbox alerts, which already carry EN, FR and
// AR in one message (hoursReport.test.ts checks all three are there).

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.ts$/.test(entry) && !/\.test\.ts$/.test(entry) ? [path] : [];
  });
}

describe("no email or SMS builder escapes the language check", () => {
  it("every exported builder is listed above", () => {
    const root = fileURLToPath(new URL(".", import.meta.url));
    const builders = sourceFiles(root).flatMap((file) =>
      [...readFileSync(file, "utf8").matchAll(/export (?:async )?function (\w+(?:Email|EmailMessage|SmsText|Sms))\b/g)].map((m) => m[1]!)
    );
    const missing = builders.filter((name) => !NOT_TEMPLATES.has(name) && !(name in TEMPLATES));
    expect(missing).toEqual([]);
    expect(builders.length).toBeGreaterThan(20);
  });
});
