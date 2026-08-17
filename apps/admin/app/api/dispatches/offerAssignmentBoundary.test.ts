import { describe, expect, it } from "vitest";
import {
  eligibleOffersForAssignment,
  parseAdminAssignment,
  parseAdminAssignments,
  parseAdminWorkerOffers,
  readAssignmentCreateInput,
  readOfferActionInput,
  readOfferCreateInput,
  type AdminAssignmentSummary,
  type AdminWorkerOfferSummary
} from "./offerAssignmentBoundary";

const dispatchReviewId = "00000000-0000-4000-8000-000000000001";
const workerIdentityId = "00000000-0000-4000-8000-0000000000aa";
const future = new Date(Date.now() + 86_400_000).toISOString();

describe("admin offer create/action input boundary (Round 2b)", () => {
  it("accepts a valid future-dated offer-create payload and passes optional visible fields", () => {
    expect(readOfferCreateInput({ workerIdentityId, expiresAt: future, workerVisibleTitle: "Kitchen helper" })).toEqual({
      workerIdentityId, expiresAt: future, workerVisibleTitle: "Kitchen helper",
      workerVisibleSummary: undefined, compensationSummary: undefined, policySummary: undefined
    });
  });
  it("rejects a past/non-future expiry, a non-uuid worker id, a body-supplied dispatchReviewId injection, and junk", () => {
    expect(readOfferCreateInput({ workerIdentityId, expiresAt: new Date(Date.now() - 1000).toISOString() })).toBeNull();
    expect(readOfferCreateInput({ workerIdentityId: "not-a-uuid", expiresAt: future })).toBeNull();
    expect(readOfferCreateInput({ workerIdentityId, expiresAt: future, workerVisibleTitle: "x".repeat(600) })).toBeNull();
    expect(readOfferCreateInput(null)).toBeNull();
    expect(readOfferCreateInput("nope")).toBeNull();
  });
  it("accepts an approve/send action payload of exactly {expectedVersion} and rejects extras/invalid", () => {
    expect(readOfferActionInput({ expectedVersion: 3 })).toEqual({ expectedVersion: 3 });
    expect(readOfferActionInput({ expectedVersion: 0 })).toBeNull();
    expect(readOfferActionInput({ expectedVersion: 1, extra: "x" })).toBeNull();
    expect(readOfferActionInput({})).toBeNull();
  });
});

describe("admin offer and Assignment read boundary", () => {
  it("allowlists persisted offer fields and rejects cross-dispatch records", () => {
    const offer = {
      id: "00000000-0000-4000-8000-000000000002",
      dispatchReviewId,
      jobRequestId: "00000000-0000-4000-8000-000000000003",
      workerIdentityId: "00000000-0000-4000-8000-000000000004",
      status: "sent",
      expiresAt: "2026-08-01T12:00:00.000Z",
      sentAt: "2026-07-27T12:00:00.000Z",
      deliveredAt: null,
      respondedAt: null,
      versionToken: 2,
      createdByUserId: "private-actor",
      organizationId: "private-tenant",
      currentTermsVersion: {
        workerVisibleTitle: "Dinner Chef Coverage",
        startAt: "2026-08-01T16:00:00.000Z",
        endAt: "2026-08-01T20:00:00.000Z",
        timezone: "America/Toronto"
      }
    };

    const parsed = parseAdminWorkerOffers([offer], dispatchReviewId);

    expect(parsed[0]).not.toHaveProperty("createdByUserId");
    expect(parsed[0]).not.toHaveProperty("organizationId");
    expect(() =>
      parseAdminWorkerOffers(
        [{ ...offer, dispatchReviewId: "00000000-0000-4000-8000-000000000099" }],
        dispatchReviewId
      )
    ).toThrow();
  });

  it("allowlists Assignment fields and excludes validation evidence", () => {
    const parsed = parseAdminAssignments(
      [
        {
          id: "00000000-0000-4000-8000-000000000010",
          dispatchReviewId,
          workerOfferId: "00000000-0000-4000-8000-000000000011",
          workerIdentityId: "00000000-0000-4000-8000-000000000012",
          status: "confirmed",
          confirmedTitle: "Dinner Chef Coverage",
          confirmedStartAt: "2026-08-01T16:00:00.000Z",
          confirmedEndAt: "2026-08-01T20:00:00.000Z",
          timezone: "America/Toronto",
          attendanceBoundary: "not_started",
          versionToken: 1,
          updatedAt: "2026-07-27T12:00:00.000Z",
          validationSnapshot: { conflictCount: 0 },
          createdByUserId: "private-actor"
        }
      ],
      dispatchReviewId
    );

    expect(parsed[0]).not.toHaveProperty("validationSnapshot");
    expect(parsed[0]).not.toHaveProperty("createdByUserId");
  });

  it("accepts only an exact canonical Assignment creation command", () => {
    const valid = {
      workerOfferId: "00000000-0000-4000-8000-000000000011",
      expectedOfferVersion: 2
    };
    expect(readAssignmentCreateInput(valid)).toEqual(valid);
    expect(readAssignmentCreateInput({ ...valid, workerIdentityId: "private" })).toBeNull();
    expect(readAssignmentCreateInput({ ...valid, workerOfferId: " OFFER " })).toBeNull();
    expect(readAssignmentCreateInput({ ...valid, expectedOfferVersion: 0 })).toBeNull();
  });

  it("allows only accepted offers without an authoritative matching Assignment", () => {
    const accepted = {
      id: "00000000-0000-4000-8000-000000000011",
      status: "accepted"
    } as AdminWorkerOfferSummary;
    const sent = {
      id: "00000000-0000-4000-8000-000000000012",
      status: "sent"
    } as AdminWorkerOfferSummary;
    expect(eligibleOffersForAssignment([accepted, sent], [])).toEqual([accepted]);
    expect(
      eligibleOffersForAssignment(
        [accepted, sent],
        [{ workerOfferId: accepted.id } as AdminAssignmentSummary]
      )
    ).toEqual([]);
  });

  it("rejects unknown Assignment states, stale version tokens, and invalid windows", () => {
    const assignment = {
      id: "00000000-0000-4000-8000-000000000010",
      dispatchReviewId,
      workerOfferId: "00000000-0000-4000-8000-000000000011",
      workerIdentityId: "00000000-0000-4000-8000-000000000012",
      status: "confirmed",
      confirmedTitle: "Dinner Chef Coverage",
      confirmedStartAt: "2026-08-01T16:00:00.000Z",
      confirmedEndAt: "2026-08-01T20:00:00.000Z",
      timezone: "America/Toronto",
      attendanceBoundary: "not_started",
      versionToken: 1,
      updatedAt: "2026-07-27T12:00:00.000Z"
    };
    expect(() =>
      parseAdminAssignment({ ...assignment, status: "mystery" }, dispatchReviewId)
    ).toThrow();
    expect(() =>
      parseAdminAssignment({ ...assignment, versionToken: 0 }, dispatchReviewId)
    ).toThrow();
    expect(() =>
      parseAdminAssignment(
        { ...assignment, confirmedEndAt: assignment.confirmedStartAt },
        dispatchReviewId
      )
    ).toThrow();
    expect(() =>
      parseAdminAssignment({ ...assignment, timezone: "Not/A_Timezone" }, dispatchReviewId)
    ).toThrow();
  });
});
