import { EmployerShell } from "../EmployerShell";
import { styles } from "../employerStyles";
import { serverLang } from "../../i18n/serverLang";
import { attendanceText } from "../recordListText";
import { EmployerAttendancePanel } from "./EmployerAttendancePanel";

export default async function EmployerAttendancePage() {
  const tx = attendanceText[await serverLang()];
  return (
    <EmployerShell
      currentRoute="/employer/attendance"
      eyebrow={tx.pageEyebrow}
      title={tx.pageTitle}
      lede={tx.pageLede}
      mode="authenticated"
      actions={
        <a href="/employer/assignments" style={styles.primaryButton}>
          {tx.backAction}
        </a>
      }
    >
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>{tx.sectionEyebrow}</p>
          <h2 style={styles.sectionTitle}>{tx.sectionTitle}</h2>
        </div>
        <EmployerAttendancePanel />
      </section>
    </EmployerShell>
  );
}
