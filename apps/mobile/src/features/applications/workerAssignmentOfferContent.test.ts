import { describe, expect, it } from "vitest";
import {
  getWorkerResponseBoundaryCopy,
  workerApplicationBoundaries,
  workerApplicationStateModel,
  workerAssignmentFixtureDisclosure,
  workerAssignmentOfferStateModel,
  workerOfferConsentChecklist
} from "./workerAssignmentOfferContent";

describe("worker assignment offer content", () => {
  it("keeps application, offer and attendance states separate", () => {
    expect(workerApplicationStateModel).toContain("Submitted");
    expect(workerAssignmentOfferStateModel).toContain("Pending Worker Response");
    expect(workerApplicationBoundaries).toEqual(
      expect.arrayContaining([
        "Applying != being selected",
        "Worker acceptance != attendance",
        "Attendance != approved hours"
      ])
    );
  });

  it("requires deliberate worker response disclosure without backend claims", () => {
    expect(workerOfferConsentChecklist).toContain(
      "Respond deliberately; no automatic acceptance is performed"
    );
    expect(workerAssignmentFixtureDisclosure).toContain("No real notifications are sent");
    expect(getWorkerResponseBoundaryCopy().join(" ")).toContain(
      "Declining a fixture-backed offer does not create a penalty"
    );
  });
});

