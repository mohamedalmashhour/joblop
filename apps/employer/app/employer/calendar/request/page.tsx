import { EmployerShell } from "../../EmployerShell";
import { styles } from "../../employerStyles";
import { ClientRequestDetailPanel } from "./ClientRequestDetailPanel";
import { FixtureClientRequestDetail } from "./FixtureClientRequestDetail";

export default async function ClientRequestDetailPage({
  searchParams
}: Readonly<{ searchParams: Promise<{ mode?: string; request?: string }> }>) {
  const { mode, request } = await searchParams;
  const fixturePreview = mode === "fixture" && !request;
  return (
    <EmployerShell
      currentRoute="/employer/calendar/request"
      eyebrow="Connected calendar / Request detail"
      title={fixturePreview ? "Fixture staffing request detail" : "Staffing request detail"}
      lede={fixturePreview
        ? "Explicitly non-persistent request preview. No authenticated record, submission, assignment, or backend success is claimed."
        : "Client-authorized request terms, readiness, and coverage status only. Worker compensation and platform economics are intentionally absent."}
      mode={fixturePreview ? "fixture" : "authenticated"}
      actions={
        <a href="/employer/calendar" style={styles.secondaryButton}>
          Back to request calendar
        </a>
      }
    >
      <section style={styles.section}>
        {fixturePreview
          ? <FixtureClientRequestDetail />
          : <ClientRequestDetailPanel requestId={request ?? null} />}
      </section>
    </EmployerShell>
  );
}
