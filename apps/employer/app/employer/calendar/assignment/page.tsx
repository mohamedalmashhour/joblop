import { EmployerShell } from "../../EmployerShell";
import { styles } from "../../employerStyles";
import { StaffingProgressPanel } from "./StaffingProgressPanel";

export default async function ClientCalendarAssignmentPage({
  searchParams
}: Readonly<{ searchParams: Promise<{ request?: string }> }>) {
  const request = (await searchParams).request ?? null;
  return (
    <EmployerShell
      currentRoute="/employer/calendar/assignment"
      eyebrow="Request calendar / Staffing progress"
      title="Staffing progress"
      lede="This view shows dispatch progress and aggregate staffing preparation. It does not confirm worker contact, acceptance, assignment, or coverage."
      mode="authenticated"
      actions={
        <a href="/employer/calendar" style={styles.secondaryButton}>
          Back to request calendar
        </a>
      }
    >
      <section style={styles.section}>
        <StaffingProgressPanel requestId={request} />
      </section>
    </EmployerShell>
  );
}
