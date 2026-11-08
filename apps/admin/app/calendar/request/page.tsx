import { serverPageText } from "../../i18n/serverPageText";
import { PersistedAdminReviewPanel } from "../PersistedAdminReviewPanel";
import type { PageText } from "../../i18n/pageTextCore";

// Copy stays beside the page: tests/integration/authenticated-calendar-ui.test.ts reads this file
// and checks for the English wording.
const requestPageTextEn = {
  title: "Select a persisted request",
  message: "Open a request from the authenticated review calendar to begin governed review.",
  back: "Back to review calendar"
};

const requestPageText = {
  en: requestPageTextEn,
  fr: {
    title: "Choisissez une demande enregistrée",
    message:
      "Ouvrez une demande à partir du calendrier de révision authentifié pour commencer la révision.",
    back: "Retour au calendrier de révision"
  },
  ar: {
    title: "اختر طلبًا محفوظًا",
    message: "افتح طلبًا من تقويم المراجعة الموثّق لبدء المراجعة.",
    back: "العودة إلى تقويم المراجعة"
  }
} satisfies PageText<typeof requestPageTextEn>;

export default async function AdminRequestReviewPage({
  searchParams
}: Readonly<{ searchParams: Promise<{ request?: string }> }>) {
  const { request } = await searchParams;
  const t = await serverPageText(requestPageText);
  return request ? (
    <PersistedAdminReviewPanel requestId={request} />
  ) : (
    <main
      style={{
        background: "#000000",
        color: "#f4efe4",
        minHeight: "100vh",
        padding: "48px clamp(18px, 5vw, 64px)"
      }}
    >
      <h1>{t.title}</h1>
      <p>{t.message}</p>
      <a href="/calendar">{t.back}</a>
    </main>
  );
}
