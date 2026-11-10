import type { RequestPricingSnapshotCapture } from "@rwos/auth";

// STAFF-ONLY read model for the staff request calendar and request detail pages. It is attached to
// the platform calendar responses only AFTER calendarRequestService has authorized the caller as a
// platform reviewer (the same check the calendar DTO already passes), and is never put on the
// employer or worker calendar responses. Read-only: it changes no request, price or assignment.
//
// - Cards: company name, location and role for each request in the review list.
// - Summary: what the employer asked for, plus the worker pay and Joblop margin (staff only), so
//   staff can approve without opening other pages. Pricing comes from the saved snapshot once the
//   request is approved, otherwise from the same read-only resolver approval uses (default margin).

export type AdminRequestCard = Readonly<{
  companyName: string;
  locationName: string | null;
  locationCity: string | null;
  roleLabel: string;
  workGroupLabel: string;
}>;

export type AdminRequestAllowance = Readonly<{
  kind: "transport" | "meal" | "lodging";
  provision: string;
  amountMinor: number | null;
  note: string | null;
}>;

export type AdminRequestPricing = Readonly<{
  source: "approved" | "estimate";
  currency: string;
  marginPpm: number;
  employerHourlyRateMinor: number;
  workerHourlyRateMinor: number;
  platformHourlyMarginMinor: number;
  urgentSurchargePerHourMinor: number;
  allowancesEmployerPerShiftMinor: number;
  allowancesWorkerPerShiftMinor: number;
  distanceSurchargePerShiftMinor: number;
  /** Before taxes: workers × (hourly charged × hours + allowances + distance) for one shift each. */
  estimatedTotalMinor: number;
}>;

export type AdminRequestSummary = AdminRequestCard &
  Readonly<{
    urgency: string;
    numberOfWorkers: number;
    hoursPerWorker: number;
    totalHours: number;
    requiredCertificates: readonly string[];
    requiredCertificateOther: string | null;
    allowances: readonly AdminRequestAllowance[];
    pricing: AdminRequestPricing | null;
    /** Why no price could be shown: the company has no contract in force, or no rate for this role. */
    pricingProblem: "no_contract" | "no_role_rate" | "unavailable" | null;
    openClaim: boolean;
    confirmedWorkerCount: number;
    publicJobUrl: string | null;
  }>;

type JobRequestRow = {
  id: string;
  numberOfWorkers: number;
  urgency: string;
  startAt: Date;
  endAt: Date;
  openClaim: boolean;
  requiredCertificates: string[];
  requiredCertificateOther: string | null;
  organization: { displayName: string; legalName: string } | null;
  residence: { name: string; city: string | null } | null;
  roleDefinition: { displayLabel: string } | null;
  workGroup: { displayLabel: string } | null;
  calendarProfile: {
    transportProvision: string;
    transportAmountMinor: number | null;
    transportNote: string | null;
    mealProvision: string;
    mealAmountMinor: number | null;
    mealNote: string | null;
    lodgingProvision: string;
    lodgingAmountMinor: number | null;
    lodgingNote: string | null;
  } | null;
  pricingSnapshot: {
    currency: string;
    marginPpm: number;
    employerHourlyRateMinor: number;
    workerHourlyRateMinor: number;
    platformHourlyMarginMinor: number;
    transportEmployerMinor: number;
    transportWorkerMinor: number;
    mealEmployerMinor: number;
    mealWorkerMinor: number;
    lodgingEmployerMinor: number;
    lodgingWorkerMinor: number;
    emergencySurchargePerHourMinor: number;
    distanceSurchargeMinor: number;
    distanceWorkerMinor: number;
  } | null;
};

/** The few Prisma calls this read model needs (structural, so tests can pass a fake). */
export type AdminRequestSummaryPrisma = {
  jobRequest: {
    findMany(args: unknown): Promise<unknown[]>;
    findUnique(args: unknown): Promise<unknown>;
  };
  assignment: { count(args: unknown): Promise<number> };
};

const ACTIVE_ASSIGNMENT_STATUSES = [
  "confirmed",
  "worker_acknowledged",
  "ready_for_attendance",
  "in_attendance_window",
  "attendance_handoff"
] as const;

const cardSelect = {
  id: true,
  organization: { select: { displayName: true, legalName: true } },
  residence: { select: { name: true, city: true } },
  roleDefinition: { select: { displayLabel: true } },
  workGroup: { select: { displayLabel: true } }
} as const;

function toCard(row: Pick<JobRequestRow, "organization" | "residence" | "roleDefinition" | "workGroup">): AdminRequestCard {
  return {
    companyName: row.organization?.displayName || row.organization?.legalName || "",
    locationName: row.residence?.name ?? null,
    locationCity: row.residence?.city ?? null,
    roleLabel: row.roleDefinition?.displayLabel ?? "",
    workGroupLabel: row.workGroup?.displayLabel ?? ""
  };
}

export async function readAdminRequestCards(
  prisma: AdminRequestSummaryPrisma,
  jobRequestIds: readonly string[]
): Promise<Record<string, AdminRequestCard>> {
  if (jobRequestIds.length === 0) return {};
  const rows = (await prisma.jobRequest.findMany({
    where: { id: { in: [...jobRequestIds] } },
    select: cardSelect
  })) as (Pick<JobRequestRow, "organization" | "residence" | "roleDefinition" | "workGroup"> & { id: string })[];
  return Object.fromEntries(rows.map((row) => [row.id, toCard(row)]));
}

export function hoursBetween(startAt: Date, endAt: Date) {
  const hours = (endAt.getTime() - startAt.getTime()) / 3_600_000;
  return Number.isFinite(hours) && hours > 0 ? Math.round(hours * 100) / 100 : 0;
}

function pricingProblemFrom(error: unknown): AdminRequestSummary["pricingProblem"] {
  const message = error instanceof Error ? error.message : "";
  if (message === "RWOS_PRICING_NO_EFFECTIVE_CONTRACT") return "no_contract";
  if (message === "RWOS_PRICING_NO_ROLE_RATE") return "no_role_rate";
  return "unavailable";
}

export async function readAdminRequestSummary(
  prisma: AdminRequestSummaryPrisma,
  capture: Pick<RequestPricingSnapshotCapture, "resolveAtApproval"> | null,
  jobRequestId: string,
  options: Readonly<{ workerWebOrigin?: string | null }> = {}
): Promise<AdminRequestSummary | null> {
  const row = (await prisma.jobRequest.findUnique({
    where: { id: jobRequestId },
    select: {
      ...cardSelect,
      numberOfWorkers: true,
      urgency: true,
      startAt: true,
      endAt: true,
      openClaim: true,
      requiredCertificates: true,
      requiredCertificateOther: true,
      calendarProfile: {
        select: {
          transportProvision: true,
          transportAmountMinor: true,
          transportNote: true,
          mealProvision: true,
          mealAmountMinor: true,
          mealNote: true,
          lodgingProvision: true,
          lodgingAmountMinor: true,
          lodgingNote: true
        }
      },
      pricingSnapshot: {
        select: {
          currency: true,
          marginPpm: true,
          employerHourlyRateMinor: true,
          workerHourlyRateMinor: true,
          platformHourlyMarginMinor: true,
          transportEmployerMinor: true,
          transportWorkerMinor: true,
          mealEmployerMinor: true,
          mealWorkerMinor: true,
          lodgingEmployerMinor: true,
          lodgingWorkerMinor: true,
          emergencySurchargePerHourMinor: true,
          distanceSurchargeMinor: true,
          distanceWorkerMinor: true
        }
      }
    }
  })) as JobRequestRow | null;
  if (!row) return null;

  const hoursPerWorker = hoursBetween(row.startAt, row.endAt);
  const profile = row.calendarProfile;
  const allowances: AdminRequestAllowance[] = profile
    ? [
        { kind: "transport", provision: profile.transportProvision, amountMinor: profile.transportAmountMinor, note: profile.transportNote },
        { kind: "meal", provision: profile.mealProvision, amountMinor: profile.mealAmountMinor, note: profile.mealNote },
        { kind: "lodging", provision: profile.lodgingProvision, amountMinor: profile.lodgingAmountMinor, note: profile.lodgingNote }
      ]
    : [];

  let pricing: AdminRequestPricing | null = null;
  let pricingProblem: AdminRequestSummary["pricingProblem"] = null;
  const total = (hourly: number, perShift: number) =>
    Math.round(row.numberOfWorkers * (hourly * hoursPerWorker + perShift));
  if (row.pricingSnapshot) {
    const s = row.pricingSnapshot;
    const allowancesEmployer = s.transportEmployerMinor + s.mealEmployerMinor + s.lodgingEmployerMinor;
    pricing = {
      source: "approved",
      currency: s.currency,
      marginPpm: s.marginPpm,
      employerHourlyRateMinor: s.employerHourlyRateMinor,
      workerHourlyRateMinor: s.workerHourlyRateMinor,
      platformHourlyMarginMinor: s.platformHourlyMarginMinor,
      urgentSurchargePerHourMinor: s.emergencySurchargePerHourMinor,
      allowancesEmployerPerShiftMinor: allowancesEmployer,
      allowancesWorkerPerShiftMinor: s.transportWorkerMinor + s.mealWorkerMinor + s.lodgingWorkerMinor,
      distanceSurchargePerShiftMinor: s.distanceSurchargeMinor,
      estimatedTotalMinor: total(
        s.employerHourlyRateMinor + s.emergencySurchargePerHourMinor,
        allowancesEmployer + s.distanceSurchargeMinor
      )
    };
  } else if (capture) {
    try {
      // Read-only: the same resolver approval runs, with the default margin. Nothing is saved.
      const resolved = await capture.resolveAtApproval({ jobRequestId: row.id, marginPpm: null });
      const s = resolved.snapshot;
      const urgent = resolved.variable?.emergencySurchargePerHourMinor ?? 0;
      const distance = resolved.variable?.distanceSurchargeMinor ?? 0;
      const allowancesEmployer = s.transport.employerMinor + s.meal.employerMinor + s.lodging.employerMinor;
      pricing = {
        source: "estimate",
        currency: resolved.currency,
        marginPpm: s.marginPpm,
        employerHourlyRateMinor: s.employerHourlyRateMinor,
        workerHourlyRateMinor: s.workerHourlyRateMinor,
        platformHourlyMarginMinor: s.platformHourlyMarginMinor,
        urgentSurchargePerHourMinor: urgent,
        allowancesEmployerPerShiftMinor: allowancesEmployer,
        allowancesWorkerPerShiftMinor: s.transport.workerMinor + s.meal.workerMinor + s.lodging.workerMinor,
        distanceSurchargePerShiftMinor: distance,
        estimatedTotalMinor: total(s.employerHourlyRateMinor + urgent, allowancesEmployer + distance)
      };
    } catch (error) {
      pricingProblem = pricingProblemFrom(error);
    }
  } else {
    pricingProblem = "unavailable";
  }

  const confirmedWorkerCount = await prisma.assignment.count({
    where: { jobRequestId: row.id, status: { in: [...ACTIVE_ASSIGNMENT_STATUSES] } }
  });
  const origin = options.workerWebOrigin?.trim().replace(/\/+$/, "") || null;

  return {
    ...toCard(row),
    urgency: row.urgency,
    numberOfWorkers: row.numberOfWorkers,
    hoursPerWorker,
    totalHours: Math.round(hoursPerWorker * row.numberOfWorkers * 100) / 100,
    requiredCertificates: row.requiredCertificates,
    requiredCertificateOther: row.requiredCertificateOther,
    allowances,
    pricing,
    pricingProblem,
    openClaim: row.openClaim,
    confirmedWorkerCount,
    publicJobUrl: origin ? `${origin}/jobs/${encodeURIComponent(row.id)}` : null
  };
}
