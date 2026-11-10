import type { ActionOutcome } from "@rwos/brain";
import type {
  CheckInRow,
  DeliveryFailureRow,
  InvoiceRow,
  JoblopBrainContext,
  JoblopBrainData,
  JoblopBrainEffects,
  ReviewRequestRow,
  TimesheetRow,
  UnfilledJobRow
} from "./joblopRules";

// TEST ONLY: fixtures and fakes for the Joblop brain tests.

export const NOW = new Date("2026-11-10T15:00:00Z");
export const HOUR = 3_600_000;
export const MIN = 60_000;
export const at = (offsetMs: number) => new Date(NOW.getTime() + offsetMs);

export type FakeRows = {
  unfilled: UnfilledJobRow[];
  shifts: CheckInRow[];
  failures: DeliveryFailureRow[];
  requests: ReviewRequestRow[];
  timesheets: TimesheetRow[];
  invoices: InvoiceRow[];
};

export const emptyRows = (): FakeRows => ({ unfilled: [], shifts: [], failures: [], requests: [], timesheets: [], invoices: [] });

export function fakeData(rows: FakeRows): JoblopBrainData {
  return {
    unfilledJobs: async () => rows.unfilled,
    startedShifts: async () => rows.shifts,
    deliveryFailures: async () => rows.failures,
    requestsInReview: async () => rows.requests,
    openTimesheets: async () => rows.timesheets,
    overdueInvoices: async () => rows.invoices
  };
}

export type EffectCall = { name: keyof JoblopBrainEffects; id: string };

export function fakeEffects(outcome: ActionOutcome = { status: "done", detail: "ok" }) {
  const calls: EffectCall[] = [];
  const record = (name: keyof JoblopBrainEffects) => async (id: string) => {
    calls.push({ name, id });
    return outcome;
  };
  const effects: JoblopBrainEffects = {
    resendFailedMessage: record("resendFailedMessage"),
    remindWorkerToCheckIn: record("remindWorkerToCheckIn"),
    remindEmployerToConfirmHours: record("remindEmployerToConfirmHours"),
    offerEmployerBonus: async (id) => {
      calls.push({ name: "offerEmployerBonus", id });
      return { ...outcome, undo: { kind: "withdraw_bonus_offer", data: { bonusId: "b-1" } }, resolvesIssue: false };
    },
    approveRequest: record("approveRequest"),
    approveTimesheet: async (id) => {
      calls.push({ name: "approveTimesheet", id });
      return { ...outcome, undo: { kind: "reopen_timesheet", data: { timesheetId: id } } };
    },
    withdrawBonusOffer: async (id) => {
      calls.push({ name: "withdrawBonusOffer", id });
      return { ok: true, detail: "withdrawn" };
    },
    reopenTimesheet: async (id) => {
      calls.push({ name: "reopenTimesheet", id });
      return { ok: true, detail: "reopened" };
    }
  };
  return { effects, calls };
}

export const context = (rows: FakeRows, effects?: JoblopBrainEffects): JoblopBrainContext => ({
  data: fakeData(rows),
  effects: effects ?? fakeEffects().effects
});

export const unfilledJob = (over: Partial<UnfilledJobRow> = {}): UnfilledJobRow => ({
  jobRequestId: "11111111-1111-4111-8111-111111111111",
  jobRequestNumber: "JR-1",
  title: "Cook",
  startAt: at(10 * HOUR),
  openings: 2,
  filled: 1,
  priced: true,
  hasBonus: false,
  ...over
});

export const shift = (over: Partial<CheckInRow> = {}): CheckInRow => ({
  assignmentId: "22222222-2222-4222-8222-222222222222",
  jobRequestId: "11111111-1111-4111-8111-111111111111",
  title: "Cook",
  startAt: at(-15 * MIN),
  endAt: at(6 * HOUR),
  checkedIn: false,
  ...over
});

export const failure = (over: Partial<DeliveryFailureRow> = {}): DeliveryFailureRow => ({
  id: "33333333-3333-4333-8333-333333333333",
  channel: "email",
  recipient: "boss@example.com",
  failedAt: at(-30 * MIN),
  retryable: true,
  resentAt: null,
  ...over
});

export const request = (over: Partial<ReviewRequestRow> = {}): ReviewRequestRow => ({
  jobRequestId: "44444444-4444-4444-8444-444444444444",
  jobRequestNumber: "JR-4",
  title: "Dishwasher",
  status: "submitted",
  submittedAt: at(-30 * MIN),
  startAt: at(48 * HOUR),
  endAt: at(56 * HOUR),
  numberOfWorkers: 1,
  description: "Wash dishes in the main kitchen.",
  jobLength: "short_term",
  hasWorksiteAddress: true,
  requiredCertificateOther: null,
  openEscalation: false,
  ...over
});

export const timesheet = (over: Partial<TimesheetRow> = {}): TimesheetRow => ({
  timesheetId: "55555555-5555-4555-8555-555555555555",
  jobRequestNumber: "JR-5",
  title: "Cook",
  status: "employer_review",
  scheduledStartAt: at(-34 * HOUR),
  scheduledEndAt: at(-26 * HOUR),
  workerReviewStatus: "confirmed",
  employerReviewStatus: "pending",
  actualCheckInAt: at(-34 * HOUR),
  actualCheckOutAt: at(-26 * HOUR),
  exceptionSummary: null,
  attendanceException: null,
  ...over
});

export const invoice = (over: Partial<InvoiceRow> = {}): InvoiceRow => ({
  invoiceId: "66666666-6666-4666-8666-666666666666",
  invoiceNumber: "INV-1",
  status: "sent",
  dueAt: at(-3 * 24 * HOUR),
  ...over
});
