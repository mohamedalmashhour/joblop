import { PersistedAdminReviewPanel } from "../PersistedAdminReviewPanel";

export default async function AdminRequestReviewPage({
  searchParams
}: Readonly<{ searchParams: Promise<{ request?: string }> }>) {
  const { request } = await searchParams;
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
      <h1>Select a persisted request</h1>
      <p>Open a request from the authenticated review calendar to begin governed review.</p>
      <a href="/calendar">Back to review calendar</a>
    </main>
  );
}
