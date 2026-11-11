import { EmployerShell } from "../EmployerShell";
import { styles } from "../employerStyles";
import { serverLang } from "../../i18n/serverLang";
import { contractText } from "./contractText";
import { ContractSignPanel } from "./ContractSignPanel";

export default async function EmployerContractPage() {
  const tx = contractText[await serverLang()];
  return (
    <EmployerShell
      currentRoute="/employer/contract"
      eyebrow={tx.pageEyebrow}
      title={tx.pageTitle}
      lede={tx.pageLede}
      mode="authenticated"
      actions={
        <a href="/employer/calendar/create" style={styles.primaryButton}>
          {tx.pageAction}
        </a>
      }
    >
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>{tx.sectionEyebrow}</p>
          <h2 style={styles.sectionTitle}>{tx.sectionTitle}</h2>
        </div>
        <ContractSignPanel />
      </section>
    </EmployerShell>
  );
}
