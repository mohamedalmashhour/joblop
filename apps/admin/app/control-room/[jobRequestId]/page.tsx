import { ControlRoom } from "./ControlRoom";

// Transaction Control Room — per-transaction read-only audit view (lifecycle + settlement).
export default async function TransactionControlRoomPage({
  params
}: Readonly<{ params: Promise<{ jobRequestId: string }> }>) {
  const { jobRequestId } = await params;
  return <ControlRoom jobRequestId={jobRequestId} />;
}
