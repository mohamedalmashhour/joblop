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
              slug: "chef",
              displayLabel: "Chef",
              workGroupId: "wg-1",
              qualificationSummary: "hidden"
            }
          ]
        }
      })
    ).toEqual({
      residences: [{ id: "res-1", name: "Sunrise" }],
      departments: [{ id: "dep-1", residenceId: "res-1", name: "Kitchen" }],
      workGroups: [{ id: "wg-1", slug: "kitchen", displayLabel: "Kitchen" }],
      roleDefinitions: [{ slug: "chef", displayLabel: "Chef", workGroupId: "wg-1" }]
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
