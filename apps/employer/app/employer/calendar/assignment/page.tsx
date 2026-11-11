import { EmployerShell } from "../../EmployerShell";
import { styles } from "../../employerStyles";
import { serverLang } from "../../../i18n/serverLang";
import { staffingText } from "./staffingText";
import { StaffingProgressPanel } from "./StaffingProgressPanel";

export default async function ClientCalendarAssignmentPage({
  searchParams
}: Readonly<{ searchParams: Promise<{ request?: string }> }>) {
  const request = (await searchParams).request ?? null;
  const tx = staffingText[await serverLang()];
  return (
    <EmployerShell
      currentRoute="/employer/calendar/assignment"
      eyebrow={tx.pageEyebrow}
      title={tx.pageTitle}
      lede={tx.pageLede}
      mode="authenticated"
      actions={
        <a href="/employer/calendar" style={styles.secondaryButton}>
          {tx.back}
        </a>
      }
    >
      <section style={styles.section}>
        <StaffingProgressPanel requestId={request} />
      </section>
    </EmployerShell>
  );
}
