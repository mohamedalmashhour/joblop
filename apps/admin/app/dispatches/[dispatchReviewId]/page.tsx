import { PersistedDispatchPanel } from "./PersistedDispatchPanel";

export default async function DispatchReviewPage({
  params
}: Readonly<{ params: Promise<{ dispatchReviewId: string }> }>) {
  const { dispatchReviewId } = await params;
  return <PersistedDispatchPanel dispatchReviewId={dispatchReviewId} />;
}
