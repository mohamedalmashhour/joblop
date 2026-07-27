import { EXAMPLE_ECONOMICS_KEYS } from "../../../contracts/security/economicsLeak.mjs";
import {
  createHrMoneyContractInput,
  createHrMoneyParticipantPayloads
} from "../../../packages/shared/src/domain/hrMoneyAdapter.ts";

const c1InputCandidate = createHrMoneyContractInput({
  timesheet: {
    id: "timesheet_c1_001",
    status: "locked",
    version: 1,
    assignmentId: "assignment_c1_001",
    attendanceRecordId: "attendance_c1_001",
    workerIdentityId: "worker_c1_001",
    organizationId: "org_c1_001",
    residenceId: "residence_c1_001",
    departmentId: "department_c1_001",
    workGroupId: "work_group_c1_001",
    roleDefinitionId: "role_c1_001",
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
    workerTermsVersion: "worker-terms-c1-v1",
    classification: "employee",
    hourlyRate: { amountMinor: 3000, currency: "CAD" }
  },
  employerTerms: {
    employerTermsVersion: "employer-terms-c1-v1",
    billRate: { amountMinor: 4500, currency: "CAD" }
  },
  jurisdiction: {
    country: "CA",
    provinceOrTerritory: "ON",
    countryPackVersion: "CA-ON-2026-approved",
    counselApprovalStatus: "approved"
  },
  policyVersions: {
    adapterPolicyVersion: "hr-money-adapter-c1-v1",
    labourPolicyVersion: "ca-on-labour-c1-v1",
    classificationPolicyVersion: "classification-c1-v1"
  }
});

const commonInternalEconomicsKeys = [
  ...EXAMPLE_ECONOMICS_KEYS,
  "platformMargin",
  "platformRevenue",
  "providerFee",
  "providerEconomics",
  "internalFinanceFormula",
  "internalPayrollFormula"
];

export const hrC1EconomicsLeakFixture = {
  participantFacingPayloads: createHrMoneyParticipantPayloads(c1InputCandidate),
  forbiddenEconomicsKeys: {
    worker: [
      ...commonInternalEconomicsKeys,
      "employerBillRate",
      "employerFunding",
      "employerFeeBreakdown"
    ],
    employer: [
      ...commonInternalEconomicsKeys,
      "workerHourlyRate",
      "workerGrossPay",
      "workerNetPay",
      "workerPayable",
      "workerPayout"
    ]
  }
};

export const hrMoneyFixture = {
  name: "resident-workforce-os-hr-money-phase-1",
  phase1Bindings: {
    oneMoneyModel: {
      invariant: "C3 one money model",
      status: "bound_skipped_until_money_engine",
      acceptanceCriterion:
        "Money is represented only by the contract Money Engine with integer amountMinor plus explicit currency; convert-then-sum is enforced; mixed-currency arithmetic fails; the CAD-only money.ts helper is retired after all consumers migrate."
    }
  },

  supports: {
    leak: false,
    authz: false,
    commissionOnBaseExcludingTax: false,
    settlementRef: false,
    sandboxRefRejectedInProd: false,
    jurisdictionFailClosed: false,
    frozenTerms: false,
    noDoubleBook: false,
    auditAppendOnly: false
  },

  skipReason: {
    leak:
      "Kit v1 suite does not pass its required consumer forbidden-key policy to findLeakedEconomicsKeys. C1 runs directly against that kit helper in hr-c1-economics-leak.test.mjs without changing the imported kit.",
    authz:
      "Phase 1 binds the invariant only. Money-sensitive routes do not exist; current-tree S1 scan runs separately.",
    commissionOnBaseExcludingTax:
      "STR commission-on-tax-excluded-base is not an HR money behavior. HR analog is platform margin allocation after Money Engine and Finance authorization.",
    settlementRef:
      "Payment Execution is last. No settlement reference behavior exists before payment-provider authorization.",
    sandboxRefRejectedInProd:
      "Payment Execution is last. No sandbox or production payment reference behavior exists before provider authorization.",
    jurisdictionFailClosed:
      "Employment Compliance phase will prove fail-closed jurisdiction after counsel-gated policy approval.",
    frozenTerms:
      "Adapter/Compliance phases will prove agreed terms remain frozen and do not restate approved Timesheets.",
    noDoubleBook:
      "Assignment/Timesheet overlap analog requires future money-fixture binding; current Assignment foundation owns operational checks.",
    auditAppendOnly:
      "Money/config/consent audit analog is deferred until money-relevant policy records exist; static audit scan runs separately."
  },

  async setup() {
    return {
      phase: "phase-1-gate",
      source: "synthetic",
      moneyAuthority: false
    };
  },

  async teardown() {}
};
