import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const path = "docs/runbooks/STAGING_OWNER_APPROVAL_PACKAGE_2026-07-30.md";

describe("staging owner approval package", () => {
  it("binds the package to the release without authorizing external action", async () => {
    const body = await readFile(path, "utf8");
    expect(body).toContain("570458d4ec35c419a96575d0c0bd01e8c98921a4");
    expect(body).toContain("UNSIGNED — RECOMMENDATIONS ONLY");
    expect(body).toContain("APPROVE ☐ REJECT ☐ MODIFY ☐");
    expect(body).toContain("production remains separate and excluded");
    expect(body).not.toContain("STAGING READY");
  });

  it("contains every required decision and owner input", async () => {
    const body = await readFile(path, "utf8");
    for (let index = 1; index <= 9; index += 1) {
      expect(body).toContain(`### D${index} —`);
    }
    for (const required of [
      "northamerica-northeast2",
      "monthly hard approval ceiling",
      "Cloud SQL",
      "Redis",
      "Cloud Run",
      "Domain, DNS and TLS",
      "WIF",
      "Secret Manager",
      "Mastercard",
      "Synthetic email",
      "Privacy, retention",
      "Backup/PITR",
      "Monitoring",
      "Dependency advisory",
      "Terraform",
      "Staging change-window",
      "Compact response template"
    ]) {
      expect(body).toContain(required);
    }
  });

  it("contains no secret values or blanket production authorization", async () => {
    const body = await readFile(path, "utf8");
    expect(body).not.toMatch(/sk_(?:test|live)_[A-Za-z0-9]{10,}/u);
    expect(body).not.toMatch(/whsec_[A-Za-z0-9]{10,}/u);
    expect(body).not.toMatch(/BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/u);
    expect(body).toContain("Explicitly prohibited until separate production approval");
    expect(body).toContain("separate production approval");
  });
});
