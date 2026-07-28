import { describe, expect, it } from "vitest";
import { parseAdminAssignments, parseAdminWorkerOffers } from "./offerAssignmentBoundary";

const dispatchReviewId = "00000000-0000-4000-8000-000000000001";

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
});
