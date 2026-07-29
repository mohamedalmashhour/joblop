import { describe, expect, it } from "vitest";
import {
  apiIntegrationStatusMap,
  canTransitionSharedConcept,
  endToEndStaffingScenario,
  sharedConceptNames,
  staffingWorkflowConceptSequence,
  validateSharedConceptCoverage
} from "@rwos/shared";

describe("Resident Job platform integration readiness", () => {
  it("uses one shared concept vocabulary across employer, worker and admin", () => {
    expect(validateSharedConceptCoverage()).toMatchObject({
      ok: true,
      conceptCount: 17
    });
    expect(sharedConceptNames).toEqual([
      "EmployerOrganization",
      "Residence",
      "Department",
      "Role",
      "Shift",
      "Application",
      "Recommendation",
      "Assignment",
      "AttendanceRecord",
      "Timesheet",
      "Invoice",
      "EmployerPayment",
      "WorkerPayable",
      "Notification",
      "MessageThread",
      "SupportCase",
      "AuditEvent"
    ]);
  });

  it("aligns the employer-worker staffing workflow transitions", () => {
    expect(canTransitionSharedConcept("Shift", "draft", "published").allowed).toBe(true);
    expect(canTransitionSharedConcept("Shift", "published", "open").allowed).toBe(true);
    expect(canTransitionSharedConcept("Application", "submitted", "under_review").allowed).toBe(
      true
    );
    expect(
      canTransitionSharedConcept("Assignment", "proposed", "pending_worker_response").allowed
    ).toBe(true);
    expect(
      canTransitionSharedConcept("Assignment", "pending_worker_response", "accepted").allowed
    ).toBe(true);
    expect(canTransitionSharedConcept("AttendanceRecord", "clocked_out", "completed").allowed).toBe(
      true
    );
    expect(canTransitionSharedConcept("Invoice", "employer_review", "issued").allowed).toBe(true);
    expect(
      canTransitionSharedConcept("WorkerPayable", "finance_ready", "payable_created").allowed
    ).toBe(true);
  });

  it("documents persisted API boundaries without claiming production availability", () => {
    const actions = apiIntegrationStatusMap.map((entry) => entry.action);

    expect(actions).toEqual(
      expect.arrayContaining([
        "Employer creates shift",
        "Worker applies",
        "Employer assigns worker",
        "Worker records attendance",
        "Invoice generated",
        "Notifications sent"
      ])
    );
    expect(apiIntegrationStatusMap.every((entry) => entry.status !== "available")).toBe(true);
    expect(
      apiIntegrationStatusMap.filter((entry) => entry.currentSource === "persisted_api_boundary")
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: "Employer assigns worker",
          targetApi: "POST /platform/assignments",
          status: "integration_pending"
        }),
        expect.objectContaining({
          action: "Worker records attendance",
          status: "integration_pending"
        }),
        expect.objectContaining({
          action: "Employer reviews timesheet",
          status: "integration_pending"
        })
      ])
    );
    expect(
      apiIntegrationStatusMap
        .filter((entry) => entry.currentSource === "persisted_api_boundary")
        .every((entry) => /production mutations|staging integration/u.test(entry.limitation))
    ).toBe(true);
  });

  it("keeps the end-to-end staffing scenario in the approved workflow order", () => {
    expect(staffingWorkflowConceptSequence.slice(3, 12)).toEqual([
      "Shift",
      "Recommendation",
      "Application",
      "Assignment",
      "AttendanceRecord",
      "Timesheet",
      "Invoice",
      "EmployerPayment",
      "WorkerPayable"
    ]);
    expect(endToEndStaffingScenario.at(0)).toMatchObject({
      concept: "Shift",
      step: "Employer creates shift"
    });
    expect(endToEndStaffingScenario.at(-1)).toMatchObject({
      concept: "AuditEvent",
      step: "Reports updated"
    });
  });
});
