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
      "Phase 1 binds the invariant only. Worker-facing money payloads do not exist until the adapter/finance phases.",
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
