import { describe, expect, it } from "vitest";
import {
  apiIntegrationStatusMap,
  canTransitionSharedConcept,
  endToEndStaffingScenario,
  getSharedConcept,
  sharedConceptNames,
  sharedStateTransitions,
  staffingWorkflowConceptSequence,
  validateSharedConceptCoverage
} from "./platformIntegration";

describe("shared platform integration model", () => {
  it("defines every required shared concept exactly once", () => {
    const coverage = validateSharedConceptCoverage();

    expect(coverage.ok).toBe(true);
    expect(coverage.conceptCount).toBe(17);
    expect(coverage.missing).toEqual([]);
    expect(coverage.duplicates).toEqual([]);
    expect(sharedConceptNames).toContain("EmployerOrganization");
    expect(sharedConceptNames).toContain("WorkerPayable");
  });

  it("keeps source ownership boundaries explicit", () => {
    expect(getSharedConcept("Shift")).toMatchObject({
      authoritativeSource: "shift owner workflow",
      owner: "employer"
    });
    expect(getSharedConcept("Assignment").doesNotOwn).toContain("attendance");
    expect(getSharedConcept("Notification").doesNotOwn).toContain("authoritative workflow state");
  });

  it("aligns employer and worker state transitions through the staffing path", () => {
    expect(canTransitionSharedConcept("Shift", "draft", "published").allowed).toBe(true);
    expect(canTransitionSharedConcept("Application", "submitted", "confirmed").allowed).toBe(
      false
    );
    expect(canTransitionSharedConcept("Assignment", "pending_worker_response", "accepted").allowed)
      .toBe(true);
    expect(canTransitionSharedConcept("AttendanceRecord", "clocked_out", "completed").allowed).toBe(
      true
    );
    expect(canTransitionSharedConcept("Timesheet", "approved", "finance_ready").allowed).toBe(true);
  });

  it("documents missing backend APIs without fabricating persistence", () => {
    expect(apiIntegrationStatusMap.some((entry) => entry.status === "missing_backend")).toBe(true);
    expect(apiIntegrationStatusMap.find((entry) => entry.action === "Worker applies")).toMatchObject(
      {
        currentSource: "worker_frontend_fixture",
        targetApi: "POST /applications"
      }
    );
  });

  it("keeps the end-to-end scenario ordered across owned concepts", () => {
    expect(staffingWorkflowConceptSequence).toEqual(
      expect.arrayContaining(["Shift", "Application", "Assignment", "AttendanceRecord", "Timesheet"])
    );
    expect(endToEndStaffingScenario.map((step) => step.step)).toEqual([
      "Employer creates shift",
      "Employer publishes shift",
      "Worker discovers shift",
      "Worker applies",
      "Employer reviews",
      "Employer assigns",
      "Worker accepts",
      "Attendance starts",
      "Attendance closes",
      "Timesheet approved",
      "Invoice issued",
      "Employer payment settles",
      "Worker payable created",
      "Reports updated"
    ]);
    expect(sharedStateTransitions.length).toBeGreaterThan(40);
  });
});

