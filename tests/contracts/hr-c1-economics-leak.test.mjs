import { describe, expect, it } from "vitest";

import { findLeakedEconomicsKeys } from "../../contracts/security/economicsLeak.mjs";
import { hrC1EconomicsLeakFixture } from "./fixtures/hr-money.fixture.mjs";

describe("C1 no-economics-leak conformance", () => {
  it("keeps worker and employer participant payloads free of forbidden cross-party economics", () => {
    for (const [audience, payload] of Object.entries(
      hrC1EconomicsLeakFixture.participantFacingPayloads
    )) {
      expect(
        findLeakedEconomicsKeys(
          payload,
          hrC1EconomicsLeakFixture.forbiddenEconomicsKeys[audience]
        ),
        `${audience} participant payload leaked economics keys`
      ).toEqual([]);
    }
  });

  it("red-probes worker-visible employer and platform economics", () => {
    const leakedWorkerPayload = {
      ...hrC1EconomicsLeakFixture.participantFacingPayloads.worker,
      internalEconomics: {
        employerBillRate: { amountMinor: 4500, currency: "CAD" },
        platformMarginMinor: 1500
      }
    };

    expect(
      findLeakedEconomicsKeys(
        leakedWorkerPayload,
        hrC1EconomicsLeakFixture.forbiddenEconomicsKeys.worker
      )
    ).toEqual(expect.arrayContaining(["employerBillRate", "platformMargin"]));
  });

  it("red-probes employer-visible worker and provider economics", () => {
    const leakedEmployerPayload = {
      ...hrC1EconomicsLeakFixture.participantFacingPayloads.employer,
      internalEconomics: {
        workerHourlyRate: { amountMinor: 3000, currency: "CAD" },
        workerPayoutMinor: 24000,
        providerFeeMinor: 400
      }
    };

    expect(
      findLeakedEconomicsKeys(
        leakedEmployerPayload,
        hrC1EconomicsLeakFixture.forbiddenEconomicsKeys.employer
      )
    ).toEqual(
      expect.arrayContaining(["workerHourlyRate", "workerPayout", "providerFee"])
    );
  });
});
