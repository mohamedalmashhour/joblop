import { describe, expect, it } from "vitest";
import {
  getWorkerServiceFixtureDisclosure,
  workerMessageStates,
  workerOwnerReviewSteps,
  workerRatingStates,
  workerServiceBoundaries,
  workerSupportStates
} from "./workerServiceContent";

describe("worker service content", () => {
  it("covers the full worker owner-review journey", () => {
    expect(workerOwnerReviewSteps[0]).toBe("Public Entry");
    expect(workerOwnerReviewSteps).toEqual(
      expect.arrayContaining(["Clock-in", "Timesheet Review", "Earnings/Payable", "Support"])
    );
  });

  it("keeps ratings, messages and support out of workflow authority", () => {
    expect(workerRatingStates).toContain("Under Moderation");
    expect(workerMessageStates).toContain("Delivery Unknown");
    expect(workerSupportStates).toContain("Operational Review");
    expect(workerServiceBoundaries).toEqual(
      expect.arrayContaining([
        "Messages do not approve shifts, attendance, timesheets or payments",
        "Support cases do not modify authoritative workflow state"
      ])
    );
  });

  it("does not claim live service infrastructure", () => {
    expect(getWorkerServiceFixtureDisclosure()).toContain("No real messages are sent");
    expect(getWorkerServiceFixtureDisclosure()).toContain("No support case is opened or closed");
  });
});

