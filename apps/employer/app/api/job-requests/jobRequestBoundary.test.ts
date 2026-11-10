import { describe, expect, it } from "vitest";
import {
  parseEmployerJobRequest,
  parseEmployerDispatchStatus,
  parseEmployerRequestContext,
  readEmployerCalendarProfileInput,
  readEmployerJobRequestInput,
  readEmployerJobRequestUpdate
} from "./jobRequestBoundary";

describe("employer job request BFF boundary", () => {
  it("allowlists only governed selector fields", () => {
    expect(
      parseEmployerRequestContext({
        residences: {
          residences: [{ id: "res-1", name: "Sunrise", privateAddress: "hidden", status: "active" }]
        },
        departments: {
          departments: [
            { id: "dep-1", residenceId: "res-1", name: "Kitchen", internalCode: "hidden" }
          ]
        },
        workGroups: {
          workGroups: [
            { id: "wg-1", slug: "kitchen", displayLabel: "Kitchen", safetyNotes: "hidden" }
          ]
        },
        roleDefinitions: {
          roleDefinitions: [
            {
              id: "role-chef",
              slug: "chef",
              displayLabel: "Chef",
              workGroupId: "wg-1",
              qualificationSummary: "hidden"
            },
            {
              id: "role-aide",
              slug: "aide",
              displayLabel: "Aide",
              workGroupId: "wg-2",
              qualificationSummary: "hidden"
            }
          ]
        },
        contract: {
          contract: {
            version: "v1",
            currency: "CAD",
            roleRates: [
              { roleDefinitionId: "role-chef", hourlyRateMinor: 2800, currency: "CAD" },
              { roleDefinitionId: "role-secret", hourlyRateMinor: 9999, currency: "CAD" }
            ]
          }
        }
      })
    ).toEqual({
      residences: [{ id: "res-1", name: "Sunrise" }],
      departments: [{ id: "dep-1", residenceId: "res-1", name: "Kitchen" }],
      workGroups: [{ id: "wg-1", slug: "kitchen", displayLabel: "Kitchen" }],
      roleDefinitions: [
        {
          slug: "chef",
          displayLabel: "Chef",
          workGroupId: "wg-1",
          roleDefinitionId: "role-chef",
          hourlyRateMinor: 2800,
          currency: "CAD"
        },
        {
          slug: "aide",
          displayLabel: "Aide",
          workGroupId: "wg-2",
          roleDefinitionId: "role-aide",
          hourlyRateMinor: null,
          currency: null
        }
      ]
    });
  });

  it("accepts the exact create contract and drops unknown economics", () => {
    expect(
      readEmployerJobRequestInput({
        residenceId: "res-1",
        departmentId: "dep-1",
        workGroup: "kitchen",
        roleDefinition: "chef",
        title: "Dinner Chef Coverage",
        description: "Dinner service.",
        numberOfWorkers: 2,
        urgency: "urgent",
        requestType: "single_day",
        timezone: "America/Toronto",
        startAt: "2026-08-10T20:00:00.000Z",
        endAt: "2026-08-11T02:00:00.000Z",
        workerPay: "never-forward",
        platformMargin: "never-forward"
      })
    ).toEqual({
      residenceId: "res-1",
      departmentId: "dep-1",
      workGroup: "kitchen",
      roleDefinition: "chef",
      title: "Dinner Chef Coverage",
      description: "Dinner service.",
      numberOfWorkers: 2,
      urgency: "urgent",
      requestType: "single_day",
      timezone: "America/Toronto",
      startAt: "2026-08-10T20:00:00.000Z",
      endAt: "2026-08-11T02:00:00.000Z"
    });
  });

  it("forwards a valid long-term pay offer only (clean fields, no other economics)", () => {
    const base = {
      residenceId: "res-1",
      departmentId: "dep-1",
      workGroup: "kitchen",
      roleDefinition: "chef",
      title: "Permanent Chef",
      numberOfWorkers: 1,
      urgency: "normal",
      requestType: "single_day",
      timezone: "America/Toronto",
      startAt: "2026-08-10T14:00:00.000Z",
      endAt: "2026-08-10T22:00:00.000Z"
    };
    expect(
      readEmployerJobRequestInput({
        ...base,
        jobLength: "long_term",
        payOffered: { minMinor: 2_200, maxMinor: 2_500, unit: "hour", platformMargin: 900 }
      })
    ).toMatchObject({ jobLength: "long_term", payOffered: { minMinor: 2_200, maxMinor: 2_500, unit: "hour" } });
    expect(
      readEmployerJobRequestInput({ ...base, jobLength: "long_term", payOffered: { minMinor: 2_200, unit: "hour", platformMargin: 900 } })?.payOffered
    ).toEqual({ minMinor: 2_200, maxMinor: null, unit: "hour" });
    // invalid offer, or a short-term job: no pay offer is forwarded
    expect(readEmployerJobRequestInput({ ...base, jobLength: "long_term", payOffered: { minMinor: 0, unit: "hour" } })).not.toHaveProperty("payOffered");
    expect(readEmployerJobRequestInput({ ...base, jobLength: "short_term", payOffered: { minMinor: 2_200, unit: "hour" } })).not.toHaveProperty("payOffered");
    expect(readEmployerJobRequestInput(base)).not.toHaveProperty("payOffered");
  });

  it("rejects invalid counts, enums, and time windows", () => {
    const valid = {
      residenceId: "res-1",
      departmentId: "dep-1",
      workGroup: "kitchen",
      roleDefinition: "chef",
      title: "Dinner Chef Coverage",
      numberOfWorkers: 1,
      urgency: "normal",
      requestType: "single_day",
      timezone: "America/Toronto",
      startAt: "2026-08-10T20:00:00.000Z",
      endAt: "2026-08-11T02:00:00.000Z"
    };
    expect(readEmployerJobRequestInput({ ...valid, numberOfWorkers: 0 })).toBeNull();
    expect(readEmployerJobRequestInput({ ...valid, urgency: "emergency" })).toBeNull();
    expect(readEmployerJobRequestInput({ ...valid, endAt: valid.startAt })).toBeNull();
  });

  it("allowlists durable employer calendar-profile details without economics", () => {
    expect(
      readEmployerCalendarProfileInput({
        dutiesSummary: "  Prepare dinner service.  ",
        qualifications: [" Food safety ", "Chef certification"],
        addressSummary: "Synthetic Laval site",
        specialInstructions: "Report to reception.",
        expectedVersion: null,
        hourlyRate: "never-forward",
        transportationAllowance: "never-forward"
      })
    ).toEqual({
      dutiesSummary: "Prepare dinner service.",
      qualifications: ["Food safety", "Chef certification"],
      addressSummary: "Synthetic Laval site",
      specialInstructions: "Report to reception.",
      expectedVersion: null
    });
    expect(
      readEmployerCalendarProfileInput({
        dutiesSummary: null,
        qualifications: Array.from({ length: 21 }, (_, index) => `Item ${index}`),
        addressSummary: null,
        specialInstructions: null,
        expectedVersion: null
      })
    ).toBeNull();
  });

  it("returns only the client fields needed for create and submit handoffs", () => {
    expect(
      parseEmployerJobRequest({
        jobRequest: {
          id: "request-1",
          jobRequestNumber: "JR-000001",
          status: "draft",
          title: "Dinner Chef Coverage",
          description: "Dinner service.",
          numberOfWorkers: 2,
          urgency: "urgent",
          requestType: "single_day",
          timezone: "America/Toronto",
          startAt: "2026-08-10T20:00:00.000Z",
          endAt: "2026-08-11T02:00:00.000Z",
          versionToken: 1,
          internalAuditReason: "hidden"
        }
      })
    ).toEqual({
      id: "request-1",
      jobRequestNumber: "JR-000001",
      status: "draft",
      title: "Dinner Chef Coverage",
      versionToken: 1,
      description: "Dinner service.",
      numberOfWorkers: 2,
      urgency: "urgent",
      requestType: "single_day",
      timezone: "America/Toronto",
      startAt: "2026-08-10T20:00:00.000Z",
      endAt: "2026-08-11T02:00:00.000Z",
      informationRequestReason: null
    });
  });

  it("allowlists versioned draft edits and rejects invalid versions", () => {
    expect(
      readEmployerJobRequestUpdate({
        expectedVersion: 3,
        title: "Updated dinner coverage",
        description: "",
        numberOfWorkers: 3,
        urgency: "immediate",
        organizationId: "never-forward",
        workerPay: "never-forward"
      })
    ).toEqual({
      expectedVersion: 3,
      title: "Updated dinner coverage",
      description: null,
      numberOfWorkers: 3,
      urgency: "immediate"
    });
    expect(
      readEmployerJobRequestUpdate({
        expectedVersion: -1,
        title: "Updated dinner coverage",
        description: null,
        numberOfWorkers: 3,
        urgency: "urgent"
      })
    ).toBeNull();
  });

  it("returns the fields the full edit form needs, and nothing else", () => {
    const parsed = parseEmployerJobRequest({
      jobRequest: {
        id: "request-1",
        jobRequestNumber: "JR-000001",
        status: "draft",
        title: "Farm help",
        description: null,
        numberOfWorkers: 1,
        urgency: "normal",
        requestType: "single_day",
        timezone: "America/Toronto",
        startAt: "2026-08-10T12:00:00.000Z",
        endAt: "2026-08-10T18:00:00.000Z",
        versionToken: 2,
        residenceId: "res-1",
        departmentId: "dep-1",
        workGroupId: "wg-1",
        roleDefinitionId: "role-1",
        requiredCertificates: ["whmis"],
        requiredCertificateOther: null,
        allowances: {
          transport: { provision: "allowance", amountMinor: 2000, note: "Bus" },
          meal: { provision: "provided", amountMinor: 999, note: null },
          lodging: { provision: "bogus" }
        },
        workerPayMinor: 1600
      }
    });
    expect(parsed.edit).toEqual({
      residenceId: "res-1",
      departmentId: "dep-1",
      workGroupId: "wg-1",
      roleDefinitionId: "role-1",
      requiredCertificates: ["whmis"],
      requiredCertificateOther: null,
      allowances: {
        transport: { provision: "allowance", amountMinor: 2000, note: "Bus" },
        meal: { provision: "provided", amountMinor: null, note: null },
        lodging: { provision: "none", amountMinor: null, note: null }
      }
    });
    expect(JSON.stringify(parsed)).not.toContain("workerPay");
  });

  it("forwards full-form draft changes only when well formed", () => {
    const base = { expectedVersion: 1, title: "Farm help", description: null, numberOfWorkers: 1, urgency: "normal" };
    expect(
      readEmployerJobRequestUpdate({
        ...base,
        residenceId: "res-2",
        departmentId: "dep-2",
        workGroup: "farming",
        roleDefinition: "farm-worker",
        requestType: "single_day",
        timezone: "America/Toronto",
        startAt: "2026-08-10T12:00:00.000Z",
        endAt: "2026-08-10T18:00:00.000Z",
        requiredCertificates: ["whmis"]
      })
    ).toMatchObject({
      residenceId: "res-2",
      workGroup: "farming",
      roleDefinition: "farm-worker",
      startAt: "2026-08-10T12:00:00.000Z",
      endAt: "2026-08-10T18:00:00.000Z",
      requiredCertificates: ["whmis"]
    });
    expect(readEmployerJobRequestUpdate({ ...base, startAt: "2026-08-10T18:00:00.000Z", endAt: "2026-08-10T12:00:00.000Z" })).toBeNull();
    expect(readEmployerJobRequestUpdate({ ...base, requestType: "recurring_intent" })).toBeNull();
    expect(readEmployerJobRequestUpdate({ ...base, residenceId: "" })).toBeNull();
  });

  it("projects only employer-safe dispatch state and coverage", () => {
    const jobRequestId = "11111111-1111-4111-8111-111111111111";
    expect(
      parseEmployerDispatchStatus(
        {
          dispatchStatus: {
            jobRequestId,
            jobRequestNumber: "JR-2026-000001",
            dispatchState: "candidate_review",
            requiredWorkerCount: 2,
            shortlistedCandidateCount: 1,
            preparedOfferCount: 0,
            remainingWorkerCount: 2,
            updatedAt: "2026-07-27T12:00:00.000Z",
            candidateSourceReference: "never-return",
            operationalOwnerUserId: "never-return"
          }
        },
        jobRequestId
      )
    ).toEqual({
      jobRequestId,
      requestNumber: "JR-2026-000001",
      state: "candidate_review",
      requiredWorkerCount: 2,
      remainingWorkerCount: 2,
      updatedAt: "2026-07-27T12:00:00.000Z"
    });
  });

  it("rejects mismatched requests and inconsistent dispatch counts", () => {
    const jobRequestId = "11111111-1111-4111-8111-111111111111";
    const valid = {
      dispatchStatus: {
        jobRequestId,
        jobRequestNumber: "JR-2026-000001",
        dispatchState: "draft",
        requiredWorkerCount: 2,
        shortlistedCandidateCount: 0,
        preparedOfferCount: 0,
        remainingWorkerCount: 2,
        updatedAt: "2026-07-27T12:00:00.000Z"
      }
    };
    expect(() =>
      parseEmployerDispatchStatus(valid, "22222222-2222-4222-8222-222222222222")
    ).toThrow("RWOS_INVALID_EMPLOYER_DISPATCH_STATUS");
    expect(() =>
      parseEmployerDispatchStatus(
        {
          dispatchStatus: {
            ...valid.dispatchStatus,
            preparedOfferCount: 1,
            remainingWorkerCount: 2
          }
        },
        jobRequestId
      )
    ).toThrow("RWOS_INVALID_EMPLOYER_DISPATCH_STATUS");
  });
});
