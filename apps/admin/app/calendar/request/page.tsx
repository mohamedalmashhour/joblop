import { serverPageText } from "../../i18n/serverPageText";
import { PersistedAdminReviewPanel } from "../PersistedAdminReviewPanel";
import type { PageText } from "../../i18n/pageTextCore";

// Copy stays beside the page: tests/integration/authenticated-calendar-ui.test.ts reads this file
// and checks for the English wording.
const requestPageTextEn = {
  title: "Choose a request",
  message: "Open a request from the review calendar to see its details.",
  back: "Back to review calendar"
};

const requestPageText = {
  en: requestPageTextEn,
  fr: {
    title: "Choisissez une demande",
    message: "Ouvrez une demande à partir du calendrier de révision pour voir ses détails.",
    back: "Retour au calendrier de révision"
  },
  ar: {
    title: "اختر طلبًا",
    message: "افتح طلبًا من تقويم المراجعة لرؤية تفاصيله.",
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
