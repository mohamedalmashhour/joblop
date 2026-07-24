import { describe, expect, it } from "vitest";
import { assignmentWorkflow } from "./assignmentWorkflowContent";
import { attendanceWorkflow } from "./attendanceWorkflowContent";
import { employerWorkflow } from "./employerJourneyContent";
import { invoiceWorkflow } from "./invoiceWorkflowContent";
import { paymentWorkflow } from "./paymentWorkflowContent";
import { employerReportMetrics } from "./reportWorkflowContent";
import { shiftWorkflow } from "./shifts/shiftManagementContent";
import { timesheetWorkflow } from "./timesheetWorkflowContent";

describe("Employer workflow smoke path", () => {
  it("connects onboarding through reports with no dead route gaps", () => {
    const rawPath = [
      ...employerWorkflow.map((step) => step.route),
      ...shiftWorkflow.map((step) => step.route),
      ...assignmentWorkflow.map((step) => step.route),
      ...attendanceWorkflow.map((step) => step.route),
      ...timesheetWorkflow.map((step) => step.route),
      ...invoiceWorkflow.map((step) => step.route),
      ...paymentWorkflow.map((step) => step.route)
    ];
    const fullPath = rawPath.filter((route, index, routes) => route !== routes[index - 1]);

    expect(fullPath).toEqual([
      "/signup/employer",
      "/employer/onboarding/company",
      "/employer/onboarding/residences",
      "/employer/onboarding/departments",
      "/employer/dashboard",
      "/employer/shifts/create",
      "/employer/shifts/recurring",
      "/employer/shifts/urgent",
      "/employer/shifts/review",
      "/employer/shifts/publish",
      "/employer/shifts/detail",
      "/employer/shifts/published",
      "/employer/shifts/ai-suggestions",
      "/employer/applicants",
      "/employer/applicants/detail",
      "/employer/applicants/compare",
      "/employer/assignments/manual",
      "/employer/assignments/review",
      "/employer/assignments/confirmation",
      "/employer/assignments/worker-response",
      "/employer/assignments/detail",
      "/employer/attendance",
      "/employer/attendance/arrival",
      "/employer/attendance/clock-in",
      "/employer/attendance/in-progress",
      "/employer/attendance/clock-out",
      "/employer/attendance/exceptions",
      "/employer/timesheets",
      "/employer/timesheets/review",
      "/employer/timesheets/clarification",
      "/employer/timesheets/corrected",
      "/employer/timesheets/approved",
      "/employer/invoices",
      "/employer/invoices/detail",
      "/employer/invoices/breakdown",
      "/employer/payments",
      "/employer/payments/method",
      "/employer/payments/authorization",
      "/employer/payments/settlement",
      "/employer/payments/receipt",
      "/employer/payments/exceptions",
      "/employer/reports"
    ]);
  });

  it("keeps reports connected to governing records", () => {
    expect(employerReportMetrics.every((metric) => metric.route.startsWith("/employer/"))).toBe(true);
    expect(employerReportMetrics.some((metric) => metric.freshness === "Partial")).toBe(true);
    expect(employerReportMetrics.some((metric) => metric.freshness === "Stale")).toBe(true);
  });
});
