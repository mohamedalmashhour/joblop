import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { styles } from "../../employer/employerStyles";

const app = join(__dirname, "..", "..");
const read = (path: string) => readFileSync(join(app, path), "utf8");

describe("employer sign-in and sign-up layout (design audit E-SU1, E-SI1, E-SU2)", () => {
  it("uses one field per row on every screen size, never the multi-column form grid", () => {
    expect(styles.authForm?.gridTemplateColumns).toBe("minmax(0, 1fr)");
    for (const file of ["signup/employer/SignUpForm.tsx", "signin/SignInForm.tsx"]) {
      const source = read(file);
      expect(source).toContain("style={styles.authForm}");
      expect(source).not.toContain("styles.formGrid");
      expect(source).toContain("style={styles.authActions}");
    }
  });

  it("gives the consent checkbox a large tap area and brand-coloured links", () => {
    const source = read("signup/employer/SignUpForm.tsx");
    expect(source).toContain("style={styles.checkbox}");
    expect(source).toContain('<a href="/terms" style={styles.inlineLink}>');
    expect(source).toContain('<a href="/privacy" style={styles.inlineLink}>');
    expect(styles.checkbox?.width).toBeGreaterThanOrEqual(20);
    expect(styles.inlineLink?.color).toBe("#f8b808");
  });

  it("keeps the sign-up gate unchanged (registration still controlled by the environment)", () => {
    const page = read("signup/employer/page.tsx");
    expect(page).toContain('process.env.RWOS_ENV !== "production"');
    expect(page).toContain('process.env.EMPLOYER_SELF_REGISTRATION_ENABLED === "enabled"');
  });
});
