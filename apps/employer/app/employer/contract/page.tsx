import { EmployerShell } from "../EmployerShell";
import { styles } from "../employerStyles";
import { ContractSignPanel } from "./ContractSignPanel";

export default function EmployerContractPage() {
  return (
    <EmployerShell
      currentRoute="/employer/contract"
      eyebrow="Platform contract / Client"
      title="Review and sign your platform contract before you request workers."
      lede="The contract holds the governed rate card — the authoritative hourly rate per role. Staffing requests read these rates; they never set a price. Signing records your acceptance; it does not change any rate."
      mode="authenticated"
      actions={
        <a href="/employer/calendar/create" style={styles.primaryButton}>
          Go to request creation
        </a>
      }
    >
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <p style={styles.eyebrowDark}>Governed rate card</p>
          <h2 style={styles.sectionTitle}>One authoritative price per role, accepted by the organization owner.</h2>
        </div>
        <ContractSignPanel />
      </section>
    </EmployerShell>
  );
}
