import TransactionReport from "../TransactionReport";

export default async function EmployerReportPage(
  { params }: { params: Promise<{ jobRequestId: string }> }
) {
  const { jobRequestId } = await params;
  return <TransactionReport jobRequestId={jobRequestId} view="employer" />;
}
