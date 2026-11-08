import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@rwos/database";
import {
  billableHours,
  calculateInvoiceSnapshot,
  jobBonusInvoiceMinor,
  PLATFORM_INVOICE_ISSUER,
  PLATFORM_INVOICE_TAX,
  urgencyPremiumMinor,
  type InvoiceCalculationInput
} from "@rwos/shared";
import type { InvoiceRepository } from "./invoiceRepository";
import { loadShiftBonuses, pickShiftBonus } from "./jobBonusShift";

// Gap B — auto-generate the client invoice from a locked timesheet, billing the FULL per-job money:
// regular labour + urgent premium + the Gap-A variable extras (emergency surcharge the platform keeps,
// and the distance/gas+travel surcharge, plus an employer-accepted job bonus), with GST/QST applied by the invoice engine under the single
// platform issuer. Numbering is assigned at ISSUE time, not here. Runs AFTER the timesheet is locked;
// never throws into the lock path — a failure is reported, not propagated. Still gated downstream like
// every invoice (draft until approved/issued). No money moves.

/** A snapshot captured for a long-term listing job: Joblop bills no hours and runs no payroll for it. */
export function isLongTermListingSnapshot(snap: Readonly<{ jobLength?: string | null }> | null | undefined): boolean {
  return snap?.jobLength === "long_term";
}

export type AutoInvoiceResult =
  | { ok: true; invoiceId: string; subtotalMinor: number; taxMinor: number; totalMinor: number }
  | { ok: false; reason: string };

// Pure bucket mapping (testable without a DB). Splits the employer rate back into regular + urgent,
// bills the full distance as mileage, and the emergency per-hour fee as a marketplace fee.
export function buildInvoiceCalculationInput(p: {
  timesheetId: string;
  timesheetVersion: number;
  organizationId: string;
  assignmentId: string;
  attendanceRecordId: string;
  billableMinutes: number;
  employerHourlyRateMinor: number;
  emergencySurchargePerHourMinor: number;
  distanceSurchargeMinor: number;
  urgency: string | null | undefined;
  occurredAt: string;
  /** Employer-funded job bonus already priced for this shift (see jobBonusInvoiceMinor). 0/absent → no line. */
  bonusMinor?: number;
}): InvoiceCalculationInput {
  // The employer is billed at least 6 hours per shift (shown on the invoice); the worker is still paid the
  // hours actually worked, so the difference is platform revenue (owner rule, no hidden fees).
  const hours = billableHours(p.billableMinutes / 60);
  const urgentPerHour = urgencyPremiumMinor(p.urgency ?? null);
  const baseRatePerHour = Math.max(0, p.employerHourlyRateMinor - urgentPerHour);
  const money = (amountMinor: number) => ({ amountMinor: Math.round(amountMinor), currency: "CAD" as const });
  return {
    source: {
      type: "locked_timesheet",
      timesheetId: p.timesheetId,
      timesheetVersion: p.timesheetVersion,
      organizationId: p.organizationId,
      assignmentId: p.assignmentId,
      attendanceRecordId: p.attendanceRecordId
    },
    rules: {
      employerTermsVersion: "platform-terms-v1",
      calculationPolicyVersion: "platform-calc-v1",
      taxPolicyVersion: PLATFORM_INVOICE_TAX.version,
      travelPolicyVersion: "platform-travel-v1",
      adjustmentPolicyVersion: "platform-adj-v1",
      paymentTermsVersion: "platform-pay-v1"
    },
    issuer: PLATFORM_INVOICE_ISSUER,
    tax: PLATFORM_INVOICE_TAX,
    occurredAt: p.occurredAt,
    regularLabour: money(baseRatePerHour * hours),
    urgentLabour: money(urgentPerHour * hours),
    approvedTravelTime: money(0),
    mileage: money(p.distanceSurchargeMinor),
    adjustments: money(0),
    marketplaceFees: money(p.emergencySurchargePerHourMinor * hours),
    credits: money(0),
    ...(p.bonusMinor && p.bonusMinor > 0 ? { bonus: money(p.bonusMinor) } : {}),
    lineRuleVersions: {
      regular_labour: "v1",
      urgent_labour: "v1",
      approved_travel_time: "v1",
      mileage: "v1",
      adjustment: "v1",
      marketplace_fee: "v1",
      credit: "v1"
    }
  };
}

export async function autoGenerateInvoiceForLockedTimesheet(
  prisma: PrismaClient,
  invoiceRepository: InvoiceRepository,
  timesheetId: string,
  actorUserId: string
): Promise<AutoInvoiceResult> {
  const ts = await prisma.timesheet.findUnique({
    where: { id: timesheetId },
    select: {
      id: true,
      version: true,
      status: true,
      organizationId: true,
      assignmentId: true,
      attendanceRecordId: true,
      jobRequestId: true,
      billableMinutes: true,
      scheduledStartAt: true
    }
  });
  if (!ts || ts.status !== "locked") return { ok: false, reason: "timesheet_not_locked" };

  const snap = await prisma.requestPricingSnapshot.findUnique({
    where: { jobRequestId: ts.jobRequestId },
    select: {
      employerHourlyRateMinor: true,
      emergencySurchargePerHourMinor: true,
      distanceSurchargeMinor: true,
      currency: true,
      jobLength: true
    }
  });
  if (!snap) return { ok: false, reason: "no_pricing_snapshot" };
  // Long-term jobs are a paid LISTING (employer plans flag): the employer hires and pays the worker
  // directly, so Joblop never invoices hours for them. Only flag-on approvals write "long_term".
  if (isLongTermListingSnapshot(snap)) return { ok: false, reason: "long_term_listing_not_billed" };
  if (!ts.billableMinutes || ts.billableMinutes <= 0) return { ok: false, reason: "no_billable_minutes" };
  const job = await prisma.jobRequest.findUnique({ where: { id: ts.jobRequestId }, select: { urgency: true } });
  // Employer-funded job bonus (accepted by the employer) for this shift: hourly x billed hours (the
  // same hours as labour, with the 6-hour minimum), or the fixed transport/one-time amount.
  // Platform-funded bonuses are paid by Joblop and never billed to the employer.
  const employerBonus = pickShiftBonus(
    await loadShiftBonuses(prisma, [ts.jobRequestId]),
    ts.jobRequestId,
    ts.scheduledStartAt,
    "employer"
  );

  const input = buildInvoiceCalculationInput({
    timesheetId: ts.id,
    timesheetVersion: ts.version,
    organizationId: ts.organizationId,
    assignmentId: ts.assignmentId,
    attendanceRecordId: ts.attendanceRecordId,
    billableMinutes: ts.billableMinutes,
    employerHourlyRateMinor: snap.employerHourlyRateMinor,
    emergencySurchargePerHourMinor: snap.emergencySurchargePerHourMinor,
    distanceSurchargeMinor: snap.distanceSurchargeMinor,
    urgency: job?.urgency ?? null,
    occurredAt: new Date().toISOString(),
    bonusMinor: employerBonus ? jobBonusInvoiceMinor(employerBonus, ts.billableMinutes) : 0
  });

  try {
    const calculation = calculateInvoiceSnapshot(input);
    const invoice = await invoiceRepository.createFromLockedTimesheet({
      id: randomUUID(),
      organizationId: ts.organizationId,
      calculation,
      actorReference: actorUserId,
      actorRole: "platform_admin",
      idempotencyKey: `auto-invoice:${ts.id}:v${ts.version}`
    });
    return {
      ok: true,
      invoiceId: invoice.id,
      subtotalMinor: Number(invoice.subtotalMinor),
      taxMinor: Number(invoice.taxMinor),
      totalMinor: Number(invoice.totalMinor)
    };
  } catch (error) {
    return { ok: false, reason: (error as Error).message };
  }
}
