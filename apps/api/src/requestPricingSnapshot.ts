import type { PrismaClient } from "@rwos/database";
import { computeRequestPricingSnapshot, urgencyPremiumMinor } from "@rwos/shared";
import {
  createPrismaEmployerContractRepository,
  type RequestPricingSnapshotCapture
} from "@rwos/auth";

type ContractsRepository = ReturnType<typeof createPrismaEmployerContractRepository>;

// AUTHORITATIVE capture of the per-request hidden-markup snapshot (slice 4C-2). At admin approval it
// reads the employer rate (E) from the EmployerContract in force at the shift's start and the funded
// allowances from the request's calendar profile, derives the worker/platform split via the shared
// pricing model, and persists the immutable snapshot (one per request, upserted). It invents no rate
// and refuses to resolve when the request has no effective priced contract/role, so an unpriced
// request can never be approved.
export function createPrismaRequestPricingSnapshotCapture(
  prisma: PrismaClient,
  contracts: ContractsRepository = createPrismaEmployerContractRepository(prisma)
): RequestPricingSnapshotCapture {
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

      const snapshot = computeRequestPricingSnapshot({
        employerHourlyRateMinor: roleRate.hourlyRateMinor,
        marginPpm: input.marginPpm,
        urgencyPremiumMinor: urgencyPremiumMinor(jobRequest.urgency),
        transportAllowanceMinor: funded(profile?.transportProvision, profile?.transportAmountMinor),
        mealAllowanceMinor: funded(profile?.mealProvision, profile?.mealAmountMinor),
        lodgingAllowanceMinor: funded(profile?.lodgingProvision, profile?.lodgingAmountMinor)
      });

      return {
        jobRequestId: jobRequest.id,
        organizationId: jobRequest.organizationId,
        contractId: contract.id,
        contractVersion: contract.version,
        currency: contract.currency,
        snapshot
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
