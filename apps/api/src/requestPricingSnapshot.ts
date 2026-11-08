import type { PrismaClient } from "@rwos/database";
import {
  computeRequestPricingSnapshot,
  urgencyPremiumMinor,
  emergencyClientSurchargeMinor,
  distanceSurchargeMinor,
  splitDistanceSurchargeMinor,
  applyEmployerPlan,
  applyPlanToUrgentSurchargeMinor,
  defaultMarginPpmForJobLength,
  isPaidEmployerPlanCode,
  jobLengthAppliesUrgentSurcharge,
  resolveJobLength,
  type EmployerPlanCode,
  type JobLength
} from "@rwos/shared";
import {
  createPrismaEmployerContractRepository,
  type RequestPricingSnapshotCapture
} from "@rwos/auth";
import { getEffectiveEmployerPlan, isEmployerPlansEnabled } from "./employerPlanRepository";

type ContractsRepository = ReturnType<typeof createPrismaEmployerContractRepository>;

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

      // Employer fixed plans + job length. Flag OFF (default): none of this runs and the maths below is
      // exactly today's. Flag ON: long_term defaults the share to 15% (unless staff set one) and drops
      // the urgent surcharge; the org's plan for the job's track discounts the employer rate out of the
      // platform share only — the worker rate is never touched.
      const plansOn = plansEnabled();
      const jobLength = plansOn ? resolveJobLength(jobRequest.jobLength) : null;
      const marginPpm =
        jobLength !== null && (input.marginPpm === null || input.marginPpm === undefined)
          ? defaultMarginPpmForJobLength(jobLength)
          : input.marginPpm;

      let snapshot = computeRequestPricingSnapshot({
        employerHourlyRateMinor: roleRate.hourlyRateMinor,
        marginPpm,
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
        if (!jobLengthAppliesUrgentSurcharge(jobLength)) emergencySurchargePerHourMinor = 0;
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
