import { cookies } from "next/headers";
import { EmployerShell } from "../../EmployerShell";
import { styles } from "../../employerStyles";
import { LOCALE_COOKIE, resolveEmployerLocale } from "../../../i18n/config";
import { dictionaries, type Messages } from "../../../i18n/messages";
import { ClientRequestDetailPanel } from "./ClientRequestDetailPanel";
import { FixtureClientRequestDetail } from "./FixtureClientRequestDetail";

export default async function ClientRequestDetailPage({
  searchParams
}: Readonly<{ searchParams: Promise<{ mode?: string; request?: string }> }>) {
  const { mode, request } = await searchParams;
  const fixturePreview = process.env.RWOS_ENV !== "production" && mode === "fixture" && !request;
  const store = await cookies();
  const locale = resolveEmployerLocale(store.get(LOCALE_COOKIE)?.value);
  const m: Messages = { ...dictionaries["en-CA"], ...dictionaries[locale] } as Messages;
  return (
    <EmployerShell
      currentRoute="/employer/calendar/request"
      eyebrow={m["page.requestDetailEyebrow"]}
      title={fixturePreview ? "Fixture staffing request detail" : m["page.requestDetailTitle"]}
      lede={
        fixturePreview
          ? "Explicitly non-persistent request preview. No authenticated record, submission, assignment, or backend success is claimed."
          : m["page.requestDetailLede"]
      }
      mode={fixturePreview ? "fixture" : "authenticated"}
      actions={
        <a href="/employer/calendar" style={styles.secondaryButton}>
          {m["detail.backToCalendar"]}
        </a>
      }
    >
      <section style={styles.section}>
        {fixturePreview ? (
          <FixtureClientRequestDetail />
        ) : (
          <ClientRequestDetailPanel requestId={request ?? null} />
        )}
      </section>
    </EmployerShell>
  );
}
