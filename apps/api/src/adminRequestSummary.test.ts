import { describe, expect, it } from "vitest";
import {
  hoursBetween,
  readAdminRequestCards,
  readAdminRequestSummary,
  type AdminRequestSummaryPrisma
} from "./adminRequestSummary";

const baseRow = {
  id: "jr-1",
  numberOfWorkers: 3,
  urgency: "normal",
  startAt: new Date("2026-11-12T13:00:00.000Z"),
  endAt: new Date("2026-11-12T19:00:00.000Z"),
  openClaim: true,
  requiredCertificates: ["whmis"],
  requiredCertificateOther: null,
  organization: { displayName: "Ferme Laval", legalName: "Ferme Laval inc." },
  residence: { name: "Main barn", city: "Laval" },
  roleDefinition: { displayLabel: "Farm worker" },
  workGroup: { displayLabel: "Farming / Agriculture" },
  calendarProfile: {
    transportProvision: "allowance",
    transportAmountMinor: 2000,
    transportNote: "Bus",
    mealProvision: "provided",
    mealAmountMinor: null,
    mealNote: null,
    lodgingProvision: "none",
    lodgingAmountMinor: null,
    lodgingNote: null
  },
  pricingSnapshot: null as null | Record<string, unknown>
};

function fakePrisma(row: unknown, confirmed = 0): AdminRequestSummaryPrisma {
  return {
    jobRequest: {
      findMany: async () => [row],
      findUnique: async () => row
    },
    assignment: { count: async () => confirmed }
  };
}

const resolved = {
  jobRequestId: "jr-1",
  organizationId: "org-1",
  contractId: "c-1",
  contractVersion: "v1",
  currency: "CAD",
  snapshot: {
    marginPpm: 200_000,
    employerHourlyRateMinor: 2500,
    workerHourlyRateMinor: 2000,
    platformHourlyMarginMinor: 500,
    transport: { employerMinor: 2000, workerMinor: 2000, platformMarginMinor: 0 },
    meal: { employerMinor: 0, workerMinor: 0, platformMarginMinor: 0 },
    lodging: { employerMinor: 0, workerMinor: 0, platformMarginMinor: 0 }
  },
  variable: { emergencySurchargePerHourMinor: 0, distanceSurchargeMinor: 0, distanceWorkerMinor: 0, distancePlatformMinor: 0 }
};

describe("staff request summary read model", () => {
  it("shows company, location and role on the calendar cards", async () => {
    expect(await readAdminRequestCards(fakePrisma(baseRow), ["jr-1"])).toEqual({
      "jr-1": {
        companyName: "Ferme Laval",
        locationName: "Main barn",
        locationCity: "Laval",
        roleLabel: "Farm worker",
        workGroupLabel: "Farming / Agriculture"
      }
    });
    expect(await readAdminRequestCards(fakePrisma(baseRow), [])).toEqual({});
  });

  it("estimates pay, margin and total before approval without saving anything", async () => {
    const calls: unknown[] = [];
    const summary = await readAdminRequestSummary(
      fakePrisma(baseRow, 1),
      {
        resolveAtApproval: async (input) => {
          calls.push(input);
          return resolved as never;
        }
      },
      "jr-1",
      { workerWebOrigin: "https://joblop.com/" }
    );
    expect(calls).toEqual([{ jobRequestId: "jr-1", marginPpm: null }]);
    expect(summary).toMatchObject({
      companyName: "Ferme Laval",
      roleLabel: "Farm worker",
      numberOfWorkers: 3,
      hoursPerWorker: 6,
      totalHours: 18,
      confirmedWorkerCount: 1,
      openClaim: true,
      publicJobUrl: "https://joblop.com/jobs/jr-1",
      pricingProblem: null,
      pricing: {
        source: "estimate",
        employerHourlyRateMinor: 2500,
        workerHourlyRateMinor: 2000,
        platformHourlyMarginMinor: 500,
        allowancesEmployerPerShiftMinor: 2000,
        // 3 workers × (25.00 × 6 h + 20.00 transport) = 510.00
        estimatedTotalMinor: 51_000
      }
    });
    expect(summary?.allowances.map((a) => a.kind)).toEqual(["transport", "meal", "lodging"]);
  });

  it("uses the saved price once the request is approved", async () => {
    const approved = {
      ...baseRow,
      pricingSnapshot: {
        currency: "CAD",
        marginPpm: 200_000,
        employerHourlyRateMinor: 3000,
        workerHourlyRateMinor: 2400,
        platformHourlyMarginMinor: 600,
        transportEmployerMinor: 0,
        transportWorkerMinor: 0,
        mealEmployerMinor: 0,
        mealWorkerMinor: 0,
        lodgingEmployerMinor: 0,
        lodgingWorkerMinor: 0,
        emergencySurchargePerHourMinor: 0,
        distanceSurchargeMinor: 0,
        distanceWorkerMinor: 0
      }
    };
    const summary = await readAdminRequestSummary(
      fakePrisma(approved),
      {
        resolveAtApproval: async () => {
          throw new Error("must not be called");
        }
      },
      "jr-1"
    );
    expect(summary?.pricing).toMatchObject({ source: "approved", workerHourlyRateMinor: 2400, estimatedTotalMinor: 54_000 });
    expect(summary?.publicJobUrl).toBeNull();
  });

  it("says plainly when the contract has no rate for the role", async () => {
    const summary = await readAdminRequestSummary(
      fakePrisma(baseRow),
      {
        resolveAtApproval: async () => {
          throw new Error("RWOS_PRICING_NO_ROLE_RATE");
        }
      },
      "jr-1"
    );
    expect(summary?.pricing).toBeNull();
    expect(summary?.pricingProblem).toBe("no_role_rate");
  });

  it("returns null for an unknown request and counts hours safely", async () => {
    expect(await readAdminRequestSummary(fakePrisma(null), null, "missing")).toBeNull();
    expect(hoursBetween(new Date("2026-01-01T10:00:00Z"), new Date("2026-01-01T09:00:00Z"))).toBe(0);
    expect(hoursBetween(new Date("2026-01-01T08:00:00Z"), new Date("2026-01-01T14:30:00Z"))).toBe(6.5);
  });
});
