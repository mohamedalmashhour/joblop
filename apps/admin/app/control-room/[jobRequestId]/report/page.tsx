import TransactionReport from "./TransactionReport";

export default async function ReportPage(
  { params }: { params: Promise<{ jobRequestId: string }> }
) {
  const { jobRequestId } = await params;
  return <TransactionReport jobRequestId={jobRequestId} />;
}
