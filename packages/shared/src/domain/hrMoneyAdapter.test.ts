import { describe, expect, it } from "vitest";

import {
  createContractMoney,
  createHrMoneyContractInput,
  type HrMoneyAdapterInput
} from "./index";

const lockedInput: HrMoneyAdapterInput = {
  timesheet: {
    id: "timesheet_001",
    status: "locked",
    version: 7,
    assignmentId: "assignment_001",
    attendanceRecordId: "attendance_001",
    workerIdentityId: "worker_001",
    organizationId: "org_001",
    residenceId: "residence_001",
    departmentId: "department_001",
    workGroupId: "work_group_kitchen",
    roleDefinitionId: "role_chef",
    scheduledStartAt: "2026-07-25T12:00:00.000Z",
    scheduledEndAt: "2026-07-25T20:00:00.000Z",
    actualCheckInAt: "2026-07-25T12:00:00.000Z",
    actualCheckOutAt: "2026-07-25T20:00:00.000Z",
    timezone: "America/Toronto",
    payableMinutes: 480,
    billableMinutes: 480,
    breakMinutes: 0,
    overtimeCandidateMinutes: 0,
    premiumCandidateMinutes: 0,
    payrollBoundary: "handoff_ready",
    financeBoundary: "handoff_ready",
    calculationBoundary: "time_only_no_money"
  },
  workerTerms: {
    workerTermsVersion: "worker-terms-v1",
    classification: "employee",
    hourlyRate: createContractMoney({ amountMinor: 3000, currency: "CAD" })
  },
  employerTerms: {
    employerTermsVersion: "employer-terms-v1",
    billRate: createContractMoney({ amountMinor: 4500, currency: "CAD" })
  },
  jurisdiction: {
    country: "CA",
    provinceOrTerritory: "QC",
    countryPackVersion: "CA-QC-2026-draft",
    counselApprovalStatus: "approved"
  },
  policyVersions: {
    adapterPolicyVersion: "hr-money-adapter-v1",
    labourPolicyVersion: "ca-qc-labour-v1",
    classificationPolicyVersion: "classification-v1"
  }
};

describe("Resident Workforce Money Adapter", () => {
  it("maps locked Timesheet evidence and terms into a contract input candidate", () => {
    expect(createHrMoneyContractInput(lockedInput)).toEqual({
      source: {
        type: "locked_timesheet",
        timesheetId: "timesheet_001",
        timesheetVersion: 7,
        assignmentId: "assignment_001",
        attendanceRecordId: "attendance_001",
        workerIdentityId: "worker_001",
        organizationId: "org_001",
        residenceId: "residence_001",
        departmentId: "department_001",
        workGroupId: "work_group_kitchen",
        roleDefinitionId: "role_chef"
      },
      time: {
        scheduledStartAt: "2026-07-25T12:00:00.000Z",
        scheduledEndAt: "2026-07-25T20:00:00.000Z",
        actualCheckInAt: "2026-07-25T12:00:00.000Z",
        actualCheckOutAt: "2026-07-25T20:00:00.000Z",
        timezone: "America/Toronto",
        payableMinutes: 480,
        billableMinutes: 480,
        breakMinutes: 0,
        overtimeCandidateMinutes: 0,
        premiumCandidateMinutes: 0
      },
      terms: {
        workerTermsVersion: "worker-terms-v1",
        employerTermsVersion: "employer-terms-v1",
        workerClassification: "employee",
        workerHourlyRate: { amountMinor: 3000, currency: "CAD" },
        employerBillRate: { amountMinor: 4500, currency: "CAD" }
      },
      jurisdiction: {
        country: "CA",
        provinceOrTerritory: "QC",
        countryPackVersion: "CA-QC-2026-draft",
        counselApprovalStatus: "approved"
      },
      policyVersions: {
        adapterPolicyVersion: "hr-money-adapter-v1",
        labourPolicyVersion: "ca-qc-labour-v1",
        classificationPolicyVersion: "classification-v1"
      },
      boundaries: {
        payrollExecution: "not_started",
        financeExecution: "not_started",
        paymentExecution: "not_started",
        outputAuthority: "contract_input_candidate_only"
      }
    });
  });

  it("fails closed unless Timesheet is locked and ready for payroll and finance handoff", () => {
    expect(() =>
      createHrMoneyContractInput({
        ...lockedInput,
        timesheet: { ...lockedInput.timesheet, status: "approved" }
      })
    ).toThrow("HR Money Adapter requires a locked Timesheet.");

    expect(() =>
      createHrMoneyContractInput({
        ...lockedInput,
        timesheet: { ...lockedInput.timesheet, financeBoundary: "not_started" }
      })
    ).toThrow("HR Money Adapter requires payroll and finance handoff-ready boundaries.");
  });

  it("fails closed for missing jurisdiction, counsel, policy, or currency alignment", () => {
    expect(() =>
      createHrMoneyContractInput({
        ...lockedInput,
        jurisdiction: { ...lockedInput.jurisdiction, counselApprovalStatus: "pending" }
      })
    ).toThrow("HR Money Adapter requires counsel-approved jurisdiction.");

    expect(() =>
      createHrMoneyContractInput({
        ...lockedInput,
        policyVersions: { ...lockedInput.policyVersions, labourPolicyVersion: "" }
      })
    ).toThrow("HR Money Adapter requires explicit policy versions.");

    expect(() =>
      createHrMoneyContractInput({
        ...lockedInput,
        employerTerms: {
          ...lockedInput.employerTerms,
          billRate: createContractMoney({ amountMinor: 4500, currency: "USD" })
        }
      })
    ).toThrow("HR Money Adapter requires worker and employer terms in the same currency.");
  });
});
