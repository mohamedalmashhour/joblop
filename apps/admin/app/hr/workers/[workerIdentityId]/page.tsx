import { HrWorkerPanel } from "./HrWorkerPanel";

export default async function Page({ params }: { params: Promise<{ workerIdentityId: string }> }) {
  const { workerIdentityId } = await params;
  return <HrWorkerPanel workerIdentityId={workerIdentityId} />;
}
