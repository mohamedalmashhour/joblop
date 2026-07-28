import { describe, expect, it } from "vitest";
import { parseAdminIntakeMutationResult, readAdminIntakeMutation } from "./intakeBoundary";

describe("admin intake BFF boundary", () => {
  it("requires a version and a bounded information-request reason", () => {
    expect(readAdminIntakeMutation({ expectedVersion: 2 }, false)).toEqual({
      expectedVersion: 2
    });
    expect(
      readAdminIntakeMutation(
        { expectedVersion: 2, reason: "Clarify the overnight supervision plan." },
        true
      )
    ).toEqual({
      expectedVersion: 2,
      reason: "Clarify the overnight supervision plan."
    });
    expect(readAdminIntakeMutation({ expectedVersion: 2, reason: "no" }, true)).toBeNull();
    expect(readAdminIntakeMutation({ expectedVersion: -1 }, false)).toBeNull();
  });

  it("returns only the safe action handoff fields", () => {
    expect(
      parseAdminIntakeMutationResult({
        jobRequest: {
          id: "request-1",
          jobRequestNumber: "JR-2026-000001",
          status: "information_required",
          title: "Night coverage",
          versionToken: 4,
          adminReviewReason: "Clarify supervision.",
          creatorUserId: "never-return",
          organizationId: "never-return"
        }
      })
    ).toEqual({
      id: "request-1",
      jobRequestNumber: "JR-2026-000001",
      status: "information_required",
      title: "Night coverage",
      versionToken: 4,
      informationRequestReason: "Clarify supervision."
    });
  });
});
