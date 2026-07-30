import { EmployerShell } from "../employer/EmployerShell";
import { styles } from "../employer/employerStyles";

export default function TermsPage() {
  const version = process.env.TERMS_VERSION;
  return (
    <EmployerShell
      currentRoute="/terms"
      eyebrow="Legal notice"
      title="Terms"
      lede="The applicable Terms must be approved and versioned before employer self-registration opens."
    >
      <section style={styles.section}>
        <p style={styles.warning}>
          {version
            ? `Configured Terms version: ${version}. The approved publication content is supplied through the governed release process.`
            : "No approved Terms version is configured. Employer self-registration remains disabled."}
        </p>
      </section>
    </EmployerShell>
  );
}
