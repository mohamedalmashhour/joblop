import { EmployerShell, WorkflowRoutes } from "../../EmployerShell";
import { styles } from "../../employerStyles";
import { serverLang } from "../../../i18n/serverLang";
import { sitesText } from "../onboardingText";
import { EmployerResidencesPanel } from "./EmployerResidencesPanel";

export default async function ResidencesPage() {
  const tx = sitesText[await serverLang()];
  return (
    <EmployerShell
      currentRoute="/employer/onboarding/residences"
      eyebrow={tx.pageEyebrow}
      title={tx.pageTitle}
      lede={tx.pageLede}
      actions={
        <a href="/employer/onboarding/company" style={styles.primaryButton}>
          {tx.addSite}
        </a>
      }
    >
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>{tx.sectionEyebrow}</p>
          <h2 style={styles.sectionTitle}>{tx.sectionTitle}</h2>
        </div>
        <EmployerResidencesPanel />
      </section>

      <WorkflowRoutes currentRoute="/employer/onboarding/residences" />
    </EmployerShell>
  );
}
