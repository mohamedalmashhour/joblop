import TransactionReport from "../TransactionReport";

export default async function WorkerReportPage(
  { params }: { params: Promise<{ jobRequestId: string }> }
) {
  const { jobRequestId } = await params;
  return <TransactionReport jobRequestId={jobRequestId} view="worker" />;
}
