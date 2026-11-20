import type { PrismaClient } from "@rwos/database";
import {
  computeRequestPricingSnapshot,
  urgencyPremiumMinor,
  emergencyClientSurchargeMinor,
  distanceSurchargeMinor,
  splitDistanceSurchargeMinor,
  applyEmployerPlan,
  applyPlanToUrgentSurchargeMinor,
  isPaidEmployerPlanCode,
  resolveJobLength,
  LONG_TERM_LISTING_MARKER,
  type EmployerPlanCode,
  type JobLength
} from "@rwos/shared";
import {
  createPrismaEmployerContractRepository,
  type RequestPricingSnapshotCapture,
  type ResolvedRequestPricing
} from "@rwos/auth";
import { getEffectiveEmployerPlan, isEmployerPlansEnabled } from "./employerPlanRepository";

type ContractsRepository = ReturnType<typeof createPrismaEmployerContractRepository>;

/** Marker stored in employer_plan_code on a long-term listing snapshot. */
export const LONG_TERM_LISTING_PLAN_MARKER = LONG_TERM_LISTING_MARKER;
const NO_CONTRACT_ID = "00000000-0000-0000-0000-000000000000";

/** Zero-money pricing for a long-term listing job: Joblop bills no hours and pays no worker for it. */
export function longTermListingPricing(
  jobRequestId: string,
  organizationId: string,
  contract: Readonly<{ id: string; version: string; currency: string }> | null
): ResolvedRequestPricing {
  const none = { employerMinor: 0, workerMinor: 0, platformMarginMinor: 0 };
  return {
    jobRequestId,
    organizationId,
    contractId: contract?.id ?? NO_CONTRACT_ID,
    contractVersion: contract?.version ?? "listing",
    currency: contract?.currency ?? "CAD",
    snapshot: {
      marginPpm: 0,
      employerHourlyRateMinor: 0,
      workerHourlyRateMinor: 0,
      platformHourlyMarginMinor: 0,
      transport: none,
      meal: none,
      lodging: none
    },
    variable: { emergencySurchargePerHourMinor: 0, distanceSurchargeMinor: 0, distanceWorkerMinor: 0, distancePlatformMinor: 0 },
    employerPlan: { jobLength: "long_term", planCode: LONG_TERM_LISTING_PLAN_MARKER, discountPpm: 0 }
  };
}

/** Looks up the plan in force for an organization's track. Injected so tests need no database. */
export type EmployerPlanLookup = (organizationId: string, track: JobLength, now: Date) => Promise<EmployerPlanCode>;

export type RequestPricingSnapshotOptions = Readonly<{
  /** Defaults to EMPLOYER_PLANS_ENABLED === "enabled". When false the maths is exactly today's. */
  plansEnabled?: () => boolean;
  planLookup?: EmployerPlanLookup;
  now?: () => Date;
}>;

// AUTHORITATIVE capture of the per-request hidden-markup snapshot (slice 4C-2). At admin approval it
// reads the employer rate (E) from the EmployerContract in force at the shift's start and the funded
// allowances from the request's calendar profile, derives the worker/platform split via the shared
// pricing model, and persists the immutable snapshot (one per request, upserted). It invents no rate
// and refuses to resolve when the request has no effective priced contract/role, so an unpriced
// request can never be approved.
export function createPrismaRequestPricingSnapshotCapture(
  prisma: PrismaClient,
  contracts: ContractsRepository = createPrismaEmployerContractRepository(prisma),
  options: RequestPricingSnapshotOptions = {}
): RequestPricingSnapshotCapture {
  const plansEnabled = options.plansEnabled ?? isEmployerPlansEnabled;
  const planLookup: EmployerPlanLookup =
    options.planLookup ??
    (async (organizationId, track, now) => (await getEffectiveEmployerPlan(prisma, organizationId, track, now)).plan);
  const now = options.now ?? (() => new Date());
  return {
    async resolveAtApproval(input) {
      const jobRequest = await prisma.jobRequest.findUnique({
        where: { id: input.jobRequestId },
        select: {
          id: true,
          organizationId: true,
          workGroupId: true,
          roleDefinitionId: true,
          urgency: true,
          jobLength: true,
          worksiteDistanceKm: true,
          startAt: true,
          calendarProfile: {
            select: {
              transportProvision: true,
              transportAmountMinor: true,
              mealProvision: true,
              mealAmountMinor: true,
              lodgingProvision: true,
              lodgingAmountMinor: true
            }
          }
        }
      });
      if (!jobRequest) {
        throw new Error("RWOS_PRICING_JOB_REQUEST_NOT_FOUND");
      }

      // Long-term job = paid LISTING (flag on only). The employer hires and pays the worker directly,
      // so Joblop prices nothing: a zero-money snapshot marked job_length "long_term" / plan
      // "listing". Invoice generation and payroll skip any job with this marker. No contract needed.
      const plansOn = plansEnabled();
      if (plansOn && resolveJobLength(jobRequest.jobLength) === "long_term") {
        const contract = await contracts.findContractEffectiveAt(jobRequest.organizationId, jobRequest.startAt);
        return longTermListingPricing(jobRequest.id, jobRequest.organizationId, contract);
      }

      const contract = await contracts.findContractEffectiveAt(
        jobRequest.organizationId,
        jobRequest.startAt
      );
      if (!contract || contract.effectiveFrom === null) {
        throw new Error("RWOS_PRICING_NO_EFFECTIVE_CONTRACT");
      }
      const roleRate = contract.roleRates.find(
        (rate) =>
          rate.workGroupId === jobRequest.workGroupId &&
          rate.roleDefinitionId === jobRequest.roleDefinitionId
      );
      if (!roleRate) {
        throw new Error("RWOS_PRICING_NO_ROLE_RATE");
      }

      const profile = jobRequest.calendarProfile;
      const funded = (provision: string | undefined, amountMinor: number | null | undefined) =>
        provision === "allowance" ? (amountMinor ?? 0) : 0;

      // Employer fixed plans (short-term jobs). Flag OFF (default): none of this runs and the maths below
      // is exactly today's. Flag ON: the org's short-term plan discounts the employer rate out of the
      // platform share only — the worker rate is never touched.
      const jobLength = plansOn ? resolveJobLength(jobRequest.jobLength) : null;

      let snapshot = computeRequestPricingSnapshot({
        employerHourlyRateMinor: roleRate.hourlyRateMinor,
        marginPpm: input.marginPpm,
        urgencyPremiumMinor: urgencyPremiumMinor(jobRequest.urgency),
        transportAllowanceMinor: funded(profile?.transportProvision, profile?.transportAmountMinor),
        mealAllowanceMinor: funded(profile?.mealProvision, profile?.mealAmountMinor),
        lodgingAllowanceMinor: funded(profile?.lodgingProvision, profile?.lodgingAmountMinor)
      });

      // Gap A — variable client pricing captured on the real job. Emergency is a per-hour surcharge the
      // PLATFORM keeps (a % of the base employer labour rate, scales with billable hours). Distance
      // (gas + travel time beyond the home-base free radius) is a flat per-shift surcharge split 50/50
      // worker/platform. Demand uplift is intentionally NOT captured here (it's a matching-time signal).
      let emergencySurchargePerHourMinor = emergencyClientSurchargeMinor({
        labourClientMinor: roleRate.hourlyRateMinor,
        urgency: jobRequest.urgency
      });

      let employerPlan: { jobLength: string; planCode: string | null; discountPpm: number } | undefined;
      if (jobLength !== null) {
        const plan = await planLookup(jobRequest.organizationId, jobLength, now());
        employerPlan = { jobLength, planCode: null, discountPpm: 0 };
        if (isPaidEmployerPlanCode(plan)) {
          const applied = applyEmployerPlan({
            employerHourlyRateMinor: roleRate.hourlyRateMinor,
            marginPpm: snapshot.marginPpm,
            plan
          });
          const premium = urgencyPremiumMinor(jobRequest.urgency);
          // Hard guard on the owner's rule: a plan must never move the worker's pay.
          if (applied.workerHourlyRateMinor + premium !== snapshot.workerHourlyRateMinor) {
            throw new Error("RWOS_PRICING_PLAN_WORKER_RATE_MISMATCH");
          }
          snapshot = {
            ...snapshot,
            employerHourlyRateMinor: applied.employerHourlyRateMinor + premium,
            platformHourlyMarginMinor: applied.platformHourlyMarginMinor
          };
          emergencySurchargePerHourMinor = applyPlanToUrgentSurchargeMinor(emergencySurchargePerHourMinor, plan);
          employerPlan = { jobLength, planCode: plan, discountPpm: applied.discountPpm };
        }
      }
      const distance = distanceSurchargeMinor({ distanceKm: jobRequest.worksiteDistanceKm ?? 0 });
      const distanceSplit = splitDistanceSurchargeMinor(distance.totalMinor);

      return {
        jobRequestId: jobRequest.id,
        organizationId: jobRequest.organizationId,
        contractId: contract.id,
        contractVersion: contract.version,
        currency: contract.currency,
        snapshot,
        variable: {
          emergencySurchargePerHourMinor,
          distanceSurchargeMinor: distance.totalMinor,
          distanceWorkerMinor: distanceSplit.workerMinor,
          distancePlatformMinor: distanceSplit.platformMinor
        },
        ...(employerPlan ? { employerPlan } : {})
      };
    },

    async persist(input) {
      const { resolved, capturedByUserId, occurredAt } = input;
      const s = resolved.snapshot;
      const data = {
        organizationId: resolved.organizationId,
        contractId: resolved.contractId,
        contractVersion: resolved.contractVersion,
        currency: resolved.currency,
        marginPpm: s.marginPpm,
        employerHourlyRateMinor: s.employerHourlyRateMinor,
        workerHourlyRateMinor: s.workerHourlyRateMinor,
        platformHourlyMarginMinor: s.platformHourlyMarginMinor,
        transportEmployerMinor: s.transport.employerMinor,
        transportWorkerMinor: s.transport.workerMinor,
        mealEmployerMinor: s.meal.employerMinor,
        mealWorkerMinor: s.meal.workerMinor,
        lodgingEmployerMinor: s.lodging.employerMinor,
        lodgingWorkerMinor: s.lodging.workerMinor,
        emergencySurchargePerHourMinor: resolved.variable?.emergencySurchargePerHourMinor ?? 0,
        distanceSurchargeMinor: resolved.variable?.distanceSurchargeMinor ?? 0,
        distanceWorkerMinor: resolved.variable?.distanceWorkerMinor ?? 0,
        distancePlatformMinor: resolved.variable?.distancePlatformMinor ?? 0,
        ...(resolved.employerPlan
          ? {
              jobLength: resolved.employerPlan.jobLength,
              employerPlanCode: resolved.employerPlan.planCode,
              employerPlanDiscountPpm: resolved.employerPlan.discountPpm
            }
          : {}),
        capturedByUserId,
        capturedAt: occurredAt
      };
      // One immutable snapshot per request; upsert keeps approval idempotent on retry.
      await prisma.requestPricingSnapshot.upsert({
        where: { jobRequestId: resolved.jobRequestId },
        create: { jobRequestId: resolved.jobRequestId, ...data },
        update: data
      });
    }
  };
}
