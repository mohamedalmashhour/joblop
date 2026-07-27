import { PersistedAdminReviewPanel } from "../PersistedAdminReviewPanel";
import { AdminReviewPanel } from "../AdminReviewPanel";

export default async function AdminRequestReviewPage({
  searchParams
}: Readonly<{ searchParams: Promise<{ request?: string }> }>) {
  const { request } = await searchParams;
  return request
    ? <PersistedAdminReviewPanel requestId={request} />
    : <AdminReviewPanel />;
}
