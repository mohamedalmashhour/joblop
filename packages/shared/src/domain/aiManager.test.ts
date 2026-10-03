import { describe, expect, it } from "vitest";
import { DEFAULT_PLATFORM_MARGIN_PPM } from "./platformPricing";
import { AI_WORKER_ESCALATION_THRESHOLD, recommendOrderRole } from "./aiManager";

describe("AI manager triage (pure)", () => {
  it("recommends approval at the default margin for a standard role", () => {
    const d = recommendOrderRole({ urgency: "normal", numberOfWorkers: 2 });
    expect(d.recommendation).toBe("approve");
    expect(d.suggestedMarginPpm).toBe(DEFAULT_PLATFORM_MARGIN_PPM);
    expect(d.reasonCodes).toEqual(["standard"]);
  });

  it("flags an urgent role but still recommends approval", () => {
    const d = recommendOrderRole({ urgency: "urgent", numberOfWorkers: 2 });
    expect(d.recommendation).toBe("approve");
    expect(d.reasonCodes).toContain("urgent_premium");
  });

  it("escalates an immediate (emergency) role to owners", () => {
    const d = recommendOrderRole({ urgency: "immediate", numberOfWorkers: 2 });
    expect(d.recommendation).toBe("escalate");
    expect(d.reasonCodes).toContain("immediate_urgency");
  });

  it("escalates an unusually large role", () => {
    const d = recommendOrderRole({ urgency: "normal", numberOfWorkers: AI_WORKER_ESCALATION_THRESHOLD + 1 });
    expect(d.recommendation).toBe("escalate");
    expect(d.reasonCodes).toContain("high_headcount");
  });

  it("honours an admin margin override in the suggestion", () => {
    const d = recommendOrderRole({ urgency: "normal", numberOfWorkers: 1, defaultMarginPpm: 300_000 });
    expect(d.suggestedMarginPpm).toBe(300_000);
  });
});
