import { describe, expect, it } from "vitest";

import { defineConformanceSuite } from "../../contracts/conformance/suite.mjs";
import { hrMoneyFixture } from "./fixtures/hr-money.fixture.mjs";

describe("HR contract conformance import", () => {
  it("runs the kit suite against the HR Phase 1 fixture without claiming money invariants green", async () => {
    const cases = collectConformanceCases([hrMoneyFixture]);

    expect(cases.normal.length).toBe(0);
    expect(cases.skipped.map((testCase) => testCase.title)).toEqual([
      expect.stringContaining("C1 no buyer-facing economics leak"),
      expect.stringContaining("C2 sensitive routes reject unauth"),
      expect.stringContaining("C4 commission on base excluding tax"),
      expect.stringContaining('C5 no "paid" without a real settlement reference'),
      expect.stringContaining("C5b sandbox settlement ref rejected in production"),
      expect.stringContaining("C6 fail-closed jurisdiction"),
      expect.stringContaining("C7 frozen-terms"),
      expect.stringContaining("C8 no-double-book"),
      expect.stringContaining("C9 append-only audit")
    ]);
  });

  it("red-probes allocation imbalance through the kit C4 invariant", async () => {
    const cases = collectConformanceCases([createAllocationImbalanceFixture()]);
    const probe = cases.normal.find((testCase) =>
      testCase.title.includes("C4 commission on base excluding tax")
    );

    expect(probe).toBeDefined();
    await expect(runCollectedCase(probe)).rejects.toThrow();
  });

  it("red-probes disabled production settlement guard through the kit C5b invariant", async () => {
    const cases = collectConformanceCases([createDisabledProductionGuardFixture()]);
    const probe = cases.normal.find((testCase) =>
      testCase.title.includes("C5b sandbox settlement ref rejected in production")
    );

    expect(probe).toBeDefined();
    await expect(runCollectedCase(probe)).rejects.toThrow();
  });

  it("red-probes currency mismatch through the HR C3 import sentinel while v1 kit has no executable C3 runner", () => {
    const cases = collectConformanceCases([createCurrencyMismatchFixture()]);
    const c3Cases = [...cases.normal, ...cases.skipped].filter((testCase) =>
      testCase.title.includes("C3")
    );

    expect(c3Cases).toEqual([]);
    expect(() =>
      assertNoCurrencyMismatchAccepted(createCurrencyMismatchFixture().currencyMismatchProbe)
    ).toThrow("C3 currency mismatch red probe failed");
    expect(hrMoneyFixture.phase1Bindings.oneMoneyModel).toEqual({
      invariant: "C3 one money model",
      status: "bound_skipped_until_money_engine",
      acceptanceCriterion:
        "Money is represented only by the contract Money Engine with integer amountMinor plus explicit currency; convert-then-sum is enforced; mixed-currency arithmetic fails; the CAD-only money.ts helper is retired after all consumers migrate."
    });
  });
});

function collectConformanceCases(fixtures) {
  const suites = [];
  const cases = { normal: [], skipped: [] };
  let activeSuite = null;
  let beforeAllCallback = async () => {};
  let afterAllCallback = async () => {};

  const harness = {
    describe(title, callback) {
      activeSuite = { title };
      suites.push(activeSuite);
      callback();
      activeSuite = null;
    },
    it(title, callback) {
      cases.normal.push({
        suite: activeSuite,
        title,
        callback,
        beforeAll: beforeAllCallback,
        afterAll: afterAllCallback
      });
    },
    expect,
    beforeAll(callback) {
      beforeAllCallback = callback;
    },
    afterAll(callback) {
      afterAllCallback = callback;
    }
  };
  harness.it.skip = (title, callback) => {
    cases.skipped.push({
      suite: activeSuite,
      title,
      callback,
      beforeAll: beforeAllCallback,
      afterAll: afterAllCallback
    });
  };

  defineConformanceSuite(fixtures, harness);
  expect(suites.length).toBe(fixtures.length);

  return cases;
}

async function runCollectedCase(testCase) {
  await testCase.beforeAll();
  try {
    await testCase.callback();
  } finally {
    await testCase.afterAll();
  }
}

function baseUnsupportedFixture(name) {
  return {
    name,
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
    skipReason: {},
    async setup() {
      return {};
    },
    async teardown() {}
  };
}

function createAllocationImbalanceFixture() {
  return {
    ...baseUnsupportedFixture("red-probe-allocation-imbalance"),
    supports: {
      ...baseUnsupportedFixture("unused").supports,
      commissionOnBaseExcludingTax: true
    },
    async commissionOnBaseExcludingTax() {
      return {
        commissionAtLowTax: 1200,
        commissionAtHighTax: 1300,
        expectedOnBase: 1200
      };
    }
  };
}

function createDisabledProductionGuardFixture() {
  return {
    ...baseUnsupportedFixture("red-probe-disabled-production-guard"),
    supports: {
      ...baseUnsupportedFixture("unused").supports,
      sandboxRefRejectedInProd: true
    },
    async sandboxRefRejectedInProd() {
      return {
        sandboxRejectedInProd: false,
        realAcceptedInProd: true,
        allowedOutsideProd: true
      };
    }
  };
}

function createCurrencyMismatchFixture() {
  return {
    ...baseUnsupportedFixture("red-probe-currency-mismatch"),
    currencyMismatchProbe: {
      acceptedMixedCurrencyArithmetic: true,
      reason:
        "This probe must stay unavailable until the contract kit exposes executable C3 or the Money Engine phase adds an owner-approved C3 runner."
    }
  };
}

function assertNoCurrencyMismatchAccepted(probe) {
  if (probe.acceptedMixedCurrencyArithmetic) {
    throw new Error("C3 currency mismatch red probe failed");
  }
}
