import type { ContractMoney } from "./moneyEngine";

export type HrMoneyAdapterTimesheetStatus = "locked" | string;
export type HrMoneyAdapterBoundary = "handoff_ready" | "not_started";

export type HrMoneyAdapterWorkerClassification = "employee" | "contractor" | "temporary_worker";
export type HrMoneyAdapterCounselApprovalStatus = "approved" | "pending" | "rejected";

export type HrMoneyAdapterTimesheet = Readonly<{
  id: string;
  status: HrMoneyAdapterTimesheetStatus;
  version: number;
  assignmentId: string;
  attendanceRecordId: string;
  workerIdentityId: string;
  organizationId: string;
  residenceId: string;
  departmentId: string;
  workGroupId: string;
  roleDefinitionId: string;
  scheduledStartAt: string;
  scheduledEndAt: string;
  actualCheckInAt: string;
  actualCheckOutAt: string;
  timezone: string;
  payableMinutes: number;
  billableMinutes: number;
  breakMinutes: number;
  overtimeCandidateMinutes: number;
  premiumCandidateMinutes: number;
  payrollBoundary: HrMoneyAdapterBoundary;
  financeBoundary: HrMoneyAdapterBoundary;
  calculationBoundary: "time_only_no_money";
}>;

export type HrMoneyAdapterWorkerTerms = Readonly<{
  workerTermsVersion: string;
  classification: HrMoneyAdapterWorkerClassification;
  hourlyRate: ContractMoney;
}>;

export type HrMoneyAdapterEmployerTerms = Readonly<{
  employerTermsVersion: string;
  billRate: ContractMoney;
}>;

export type HrMoneyAdapterJurisdiction = Readonly<{
  country: string;
  provinceOrTerritory: string;
  countryPackVersion: string;
  counselApprovalStatus: HrMoneyAdapterCounselApprovalStatus;
}>;

export type HrMoneyAdapterPolicyVersions = Readonly<{
  adapterPolicyVersion: string;
  labourPolicyVersion: string;
  classificationPolicyVersion: string;
}>;

export type HrMoneyAdapterInput = Readonly<{
  timesheet: HrMoneyAdapterTimesheet;
  workerTerms: HrMoneyAdapterWorkerTerms;
  employerTerms: HrMoneyAdapterEmployerTerms;
  jurisdiction: HrMoneyAdapterJurisdiction;
  policyVersions: HrMoneyAdapterPolicyVersions;
}>;

export type HrMoneyContractInputCandidate = Readonly<{
  source: {
    type: "locked_timesheet";
    timesheetId: string;
    timesheetVersion: number;
    assignmentId: string;
    attendanceRecordId: string;
    workerIdentityId: string;
    organizationId: string;
    residenceId: string;
    departmentId: string;
    workGroupId: string;
    roleDefinitionId: string;
  };
  time: {
    scheduledStartAt: string;
    scheduledEndAt: string;
    actualCheckInAt: string;
    actualCheckOutAt: string;
    timezone: string;
    payableMinutes: number;
    billableMinutes: number;
    breakMinutes: number;
    overtimeCandidateMinutes: number;
    premiumCandidateMinutes: number;
  };
  terms: {
    workerTermsVersion: string;
    employerTermsVersion: string;
    workerClassification: HrMoneyAdapterWorkerClassification;
    workerHourlyRate: ContractMoney;
    employerBillRate: ContractMoney;
  };
  jurisdiction: HrMoneyAdapterJurisdiction;
  policyVersions: HrMoneyAdapterPolicyVersions;
  boundaries: {
    payrollExecution: "not_started";
    financeExecution: "not_started";
    paymentExecution: "not_started";
    outputAuthority: "contract_input_candidate_only";
  };
}>;

export function createHrMoneyContractInput(
  input: HrMoneyAdapterInput
): HrMoneyContractInputCandidate {
  assertLockedTimesheet(input.timesheet);
  assertHandoffReady(input.timesheet);
  assertCounselApproved(input.jurisdiction);
  assertPolicyVersions(input.policyVersions);
  assertTerms(input.workerTerms, input.employerTerms);

  return {
    source: {
      type: "locked_timesheet",
      timesheetId: input.timesheet.id,
      timesheetVersion: input.timesheet.version,
      assignmentId: input.timesheet.assignmentId,
      attendanceRecordId: input.timesheet.attendanceRecordId,
      workerIdentityId: input.timesheet.workerIdentityId,
      organizationId: input.timesheet.organizationId,
      residenceId: input.timesheet.residenceId,
      departmentId: input.timesheet.departmentId,
      workGroupId: input.timesheet.workGroupId,
      roleDefinitionId: input.timesheet.roleDefinitionId
    },
    time: {
      scheduledStartAt: input.timesheet.scheduledStartAt,
      scheduledEndAt: input.timesheet.scheduledEndAt,
      actualCheckInAt: input.timesheet.actualCheckInAt,
      actualCheckOutAt: input.timesheet.actualCheckOutAt,
      timezone: input.timesheet.timezone,
      payableMinutes: input.timesheet.payableMinutes,
      billableMinutes: input.timesheet.billableMinutes,
      breakMinutes: input.timesheet.breakMinutes,
      overtimeCandidateMinutes: input.timesheet.overtimeCandidateMinutes,
      premiumCandidateMinutes: input.timesheet.premiumCandidateMinutes
    },
    terms: {
      workerTermsVersion: input.workerTerms.workerTermsVersion,
      employerTermsVersion: input.employerTerms.employerTermsVersion,
      workerClassification: input.workerTerms.classification,
      workerHourlyRate: input.workerTerms.hourlyRate,
      employerBillRate: input.employerTerms.billRate
    },
    jurisdiction: input.jurisdiction,
    policyVersions: input.policyVersions,
    boundaries: {
      payrollExecution: "not_started",
      financeExecution: "not_started",
      paymentExecution: "not_started",
      outputAuthority: "contract_input_candidate_only"
    }
  };
}

function assertLockedTimesheet(timesheet: HrMoneyAdapterTimesheet) {
  if (timesheet.status !== "locked") {
    throw new Error("HR Money Adapter requires a locked Timesheet.");
  }

  if (timesheet.calculationBoundary !== "time_only_no_money") {
    throw new Error("HR Money Adapter requires a time-only Timesheet calculation boundary.");
  }
}

function assertHandoffReady(timesheet: HrMoneyAdapterTimesheet) {
  if (timesheet.payrollBoundary !== "handoff_ready" || timesheet.financeBoundary !== "handoff_ready") {
    throw new Error("HR Money Adapter requires payroll and finance handoff-ready boundaries.");
  }
}

function assertCounselApproved(jurisdiction: HrMoneyAdapterJurisdiction) {
  if (
    !jurisdiction.country ||
    !jurisdiction.provinceOrTerritory ||
    !jurisdiction.countryPackVersion ||
    jurisdiction.counselApprovalStatus !== "approved"
  ) {
    throw new Error("HR Money Adapter requires counsel-approved jurisdiction.");
  }
}

function assertPolicyVersions(policyVersions: HrMoneyAdapterPolicyVersions) {
  if (
    !policyVersions.adapterPolicyVersion ||
    !policyVersions.labourPolicyVersion ||
    !policyVersions.classificationPolicyVersion
  ) {
    throw new Error("HR Money Adapter requires explicit policy versions.");
  }
}

function assertTerms(
  workerTerms: HrMoneyAdapterWorkerTerms,
  employerTerms: HrMoneyAdapterEmployerTerms
) {
  if (!workerTerms.workerTermsVersion || !employerTerms.employerTermsVersion) {
    throw new Error("HR Money Adapter requires explicit worker and employer terms versions.");
  }

  if (workerTerms.hourlyRate.currency !== employerTerms.billRate.currency) {
    throw new Error("HR Money Adapter requires worker and employer terms in the same currency.");
  }
}
