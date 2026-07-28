import { EmployerShell } from "../../EmployerShell";
import { styles } from "../../employerStyles";
import { CreatePersistedRequestPanel } from "./CreatePersistedRequestPanel";

export default function CreateClientRequestPage() {
  return (
    <EmployerShell
      currentRoute="/employer/calendar/create"
      eyebrow="Connected calendar / Client request"
      title="Create and submit a governed staffing request."
      lede="The request is persisted inside your authenticated employer organization. Submission sends it for platform review; it does not publish a shift, assign a worker, or execute money."
      mode="authenticated"
      actions={
        <a href="/employer/calendar" style={styles.secondaryButton}>
          Back to request calendar
        </a>
      }
    >
      <section style={styles.section}>
        <CreatePersistedRequestPanel />
      </section>
    </EmployerShell>
  );
}
