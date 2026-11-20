import { EmployerShell } from "../EmployerShell";
import { styles } from "../employerStyles";
import { serverLang } from "../../i18n/serverLang";
import { assignmentsText } from "../recordListText";
import { EmployerAssignmentsPanel } from "./EmployerAssignmentsPanel";

export default async function EmployerAssignmentsPage() {
  const tx = assignmentsText[await serverLang()];
  return (
    <EmployerShell
      currentRoute="/employer/assignments"
      eyebrow={tx.pageEyebrow}
      title={tx.pageTitle}
      lede={tx.pageLede}
      mode="authenticated"
      actions={
        <a href="/employer/calendar" style={styles.primaryButton}>
          {tx.backAction}
        </a>
      }
    >
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>{tx.sectionEyebrow}</p>
          <h2 style={styles.sectionTitle}>{tx.sectionTitle}</h2>
        </div>
        <EmployerAssignmentsPanel />
      </section>
    </EmployerShell>
  );
}
