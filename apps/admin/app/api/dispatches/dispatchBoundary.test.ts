import { describe, expect, it } from "vitest";
import {
  parseAdminDispatchReview,
  parseCandidateSourceStatus,
  readDispatchCreateInput,
  readDispatchTransitionInput
} from "./dispatchBoundary";

const jobRequestId = "11111111-1111-4111-8111-111111111111";
const dispatchId = "22222222-2222-4222-8222-222222222222";

describe("admin dispatch BFF boundary", () => {
  it("accepts only a UUID request reference and an optional known priority", () => {
    expect(readDispatchCreateInput({ jobRequestId })).toEqual({
      jobRequestIdOrNumber: jobRequestId
    });
    expect(readDispatchCreateInput({ jobRequestId, priority: "urgent" })).toEqual({
      jobRequestIdOrNumber: jobRequestId,
      priority: "urgent"
    });
    expect(readDispatchCreateInput({ jobRequestId: "JR-2026-000001" })).toBeNull();
    expect(readDispatchCreateInput({ jobRequestId, priority: "immediate" })).toBeNull();
    expect(
      readDispatchCreateInput({ jobRequestId, operationalOwnerUserId: dispatchId })
    ).toBeNull();
  });

  it("returns only the safe persisted review contract", () => {
    expect(
      parseAdminDispatchReview({
        id: dispatchId,
        jobRequestId,
        state: "draft",
        priority: "normal",
        requiredWorkerCount: 3,
        shortlistedCandidateCount: 2,
        preparedOfferCount: 1,
        remainingWorkerCount: 2,
        versionToken: 1,
        createdAt: "2026-07-27T12:00:00.000Z",
        updatedAt: "2026-07-27T12:01:00.000Z",
        operationalOwnerUserId: "never-return",
        createdByUserId: "never-return"
      })
    ).toEqual({
      id: dispatchId,
      jobRequestId,
      state: "draft",
      priority: "normal",
      requiredWorkerCount: 3,
      shortlistedCandidateCount: 2,
      preparedOfferCount: 1,
      remainingWorkerCount: 2,
      versionToken: 1,
      createdAt: "2026-07-27T12:00:00.000Z",
      updatedAt: "2026-07-27T12:01:00.000Z"
    });
  });

  it("rejects malformed identifiers, versions, timestamps, and inconsistent counts", () => {
    const valid = {
      id: dispatchId,
      jobRequestId,
      state: "draft",
      priority: "normal",
      requiredWorkerCount: 2,
      shortlistedCandidateCount: 0,
      preparedOfferCount: 0,
      remainingWorkerCount: 2,
      versionToken: 1,
      createdAt: "2026-07-27T12:00:00.000Z",
      updatedAt: "2026-07-27T12:00:00.000Z"
    };
    for (const input of [
      { ...valid, id: "dispatch-1" },
      { ...valid, versionToken: 0 },
      { ...valid, createdAt: "July 27, 2026" },
      { ...valid, remainingWorkerCount: 1 },
      { ...valid, preparedOfferCount: 3 }
    ]) {
      expect(() => parseAdminDispatchReview(input)).toThrow("RWOS_INVALID_DISPATCH_RESPONSE");
    }
  });

  it("rejects a dispatch record that does not match the requested detail route", () => {
    expect(() =>
      parseAdminDispatchReview(
        {
          id: dispatchId,
          jobRequestId,
          state: "draft",
          priority: "normal",
          requiredWorkerCount: 1,
          shortlistedCandidateCount: 0,
          preparedOfferCount: 0,
          remainingWorkerCount: 1,
          versionToken: 1,
          createdAt: "2026-07-27T12:00:00.000Z",
          updatedAt: "2026-07-27T12:00:00.000Z"
        },
        "33333333-3333-4333-8333-333333333333"
      )
    ).toThrow("RWOS_INVALID_DISPATCH_RESPONSE");
  });

  it("requires a strict positive version for dispatch transitions", () => {
    expect(readDispatchTransitionInput({ expectedVersion: 2 })).toEqual({
      expectedVersion: 2
    });
    expect(readDispatchTransitionInput({ expectedVersion: 0 })).toBeNull();
    expect(
      readDispatchTransitionInput({ expectedVersion: 2, state: "candidate_review" })
    ).toBeNull();
  });

  it("exposes candidate-source status and count without candidate records", () => {
    expect(parseCandidateSourceStatus({ status: "candidate_source_unavailable" })).toEqual({
      status: "candidate_source_unavailable"
    });
    expect(
      parseCandidateSourceStatus({ status: "available", candidates: ["not returned"] })
    ).toEqual({ status: "available" });
    expect(() => parseCandidateSourceStatus({ status: "unknown" })).toThrow(
      "RWOS_INVALID_CANDIDATE_SOURCE_STATUS"
    );
  });
});
