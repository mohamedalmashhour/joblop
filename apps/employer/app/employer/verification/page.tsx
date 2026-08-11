import { EmployerShell } from "../EmployerShell";
import { styles } from "../employerStyles";
import { OrganizationVerificationPanel } from "./OrganizationVerificationPanel";

export default function OrganizationVerificationPage() {
  return (
    <EmployerShell
      currentRoute="/employer/verification"
      eyebrow="Trust / Organization"
      title="Verify your organization to earn the Verified Employer badge."
      lede="Verification reviews your organization, not just your account. The Verified Employer badge appears in the marketplace only when your organization meets the verification policy."
      mode="authenticated"
    >
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>Organization verification</p>
          <h2 style={styles.sectionTitle}>Real trust state — never inferred from your account, contracts, or payments.</h2>
        </div>
        <OrganizationVerificationPanel />
      </section>
    </EmployerShell>
  );
}
