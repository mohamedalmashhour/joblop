import { EmployerShell } from "../EmployerShell";
import { styles } from "../employerStyles";
import { serverLang } from "../../i18n/serverLang";
import { timesheetsText } from "../recordListText";
import { EmployerTimesheetsPanel } from "./EmployerTimesheetsPanel";

export default async function EmployerTimesheetsPage() {
  const tx = timesheetsText[await serverLang()];
  return (
    <EmployerShell
      currentRoute="/employer/timesheets"
      eyebrow={tx.pageEyebrow}
      title={tx.pageTitle}
      lede={tx.pageLede}
      mode="authenticated"
      actions={
        <a href="/employer/attendance" style={styles.primaryButton}>
          {tx.backAction}
        </a>
      }
    >
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>{tx.sectionEyebrow}</p>
          <h2 style={styles.sectionTitle}>{tx.sectionTitle}</h2>
        </div>
        <EmployerTimesheetsPanel />
      </section>
    </EmployerShell>
  );
}
