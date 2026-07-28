import { EmployerShell } from "../../../EmployerShell";
import { styles } from "../../../employerStyles";
import { EditPersistedRequestPanel } from "./EditPersistedRequestPanel";

export default async function EditPersistedRequestPage({
  searchParams
}: Readonly<{ searchParams: Promise<{ id?: string }> }>) {
  const { id } = await searchParams;
  return (
    <EmployerShell
      currentRoute="/employer/calendar/request"
      eyebrow="Connected calendar / Edit draft"
      title="Edit a persisted staffing-request draft."
      lede="Changes use the current server version and remain subject to employer authorization, active parent records, and platform workflow state."
      mode="authenticated"
      actions={
        <a href="/employer/calendar" style={styles.secondaryButton}>
          Back to request calendar
        </a>
      }
    >
      <section style={styles.section}>
        <EditPersistedRequestPanel requestId={id ?? null} />
      </section>
    </EmployerShell>
  );
}
