import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const closure = "docs/evidence/FINAL_LOCAL_CLOSURE_REVIEW_2026-07-30.md";
const decisions = "docs/decisions/D1_D9_OWNER_DECISION_FORM_2026-07-30.md";
const legal = "docs/legal/DRAFT_TERMS_PRIVACY_REQUIREMENTS_2026-07-30.md";
const staging = "docs/runbooks/EXACT_STAGING_INPUT_CHECKLIST_2026-07-30.md";

describe("final local closure package", () => {
  it("keeps external gates closed and accounts for every owner decision", async () => {
    const [closureBody, decisionBody] = await Promise.all([
      readFile(closure, "utf8"),
      readFile(decisions, "utf8")
    ]);
    expect(closureBody).toContain("LOCAL READY");
    expect(closureBody).not.toContain("STAGING READY");
    expect(closureBody).toContain("Total (39)");
    expect(decisionBody).toContain("UNSIGNED — NO OPTION SELECTED");
    for (let index = 1; index <= 9; index += 1) {
      expect(decisionBody).toContain(`| D${index} |`);
    }
  });

  it("marks legal content as draft and cannot activate registration", async () => {
    const body = await readFile(legal, "utf8");
    expect(body).toContain("DRAFT — NOT LEGALLY APPROVED");
    expect(body).toContain("Employer self-registration remains fail-closed");
    expect(body).toContain("insufficient");
  });

  it("requires exact staging identity, budget, owners and recovery inputs", async () => {
    const body = await readFile(staging, "utf8");
    for (const required of [
      "Exact GCP project ID",
      "Immutable GCP project number",
      "northamerica-northeast2",
      "Maximum monthly budget",
      "Infrastructure owner",
      "Billing owner",
      "Security owner",
      "WIF",
      "Secret Manager",
      "Stripe **test**",
      "Synthetic email provider",
      "QA-reset authorization",
      "Monitoring",
      "PITR",
      "Production remains excluded"
    ]) {
      expect(body).toContain(required);
    }
  });
});
