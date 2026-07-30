import { EmployerShell } from "../employer/EmployerShell";
import { styles } from "../employer/employerStyles";

export default function PrivacyPage() {
  const version = process.env.PRIVACY_NOTICE_VERSION;
  return (
    <EmployerShell
      currentRoute="/privacy"
      eyebrow="Legal notice"
      title="Privacy Notice"
      lede="The applicable Privacy Notice must be approved and versioned before employer self-registration opens."
    >
      <section style={styles.section}>
        <p style={styles.warning}>
          {version
            ? `Configured Privacy Notice version: ${version}. The approved publication content is supplied through the governed release process.`
            : "No approved Privacy Notice version is configured. Employer self-registration remains disabled."}
        </p>
      </section>
    </EmployerShell>
  );
}
