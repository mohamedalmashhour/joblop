export type StaffPayout = Readonly<{
  id: string;
  workerDisplayName: string | null;
  organizationName: string | null;
  amountMinor: number;
  currency: string;
  status: string;
  holdUntil: string;
  paidAt: string | null;
  paymentRef: string | null;
}>;

const STATUS_LABEL: Record<string, string> = {
  pending: "Waiting for release",
  released: "Ready to pay",
  held: "Paused by a dispute",
  paid: "Paid",
  cancelled: "Cancelled"
};

export function payoutStatusLabel(status: string): string {
  return STATUS_LABEL[status] ?? status.replaceAll("_", " ");
}

export function canSendTestPayout(payout: StaffPayout, testPayoutEnabled: boolean): boolean {
  return testPayoutEnabled && payout.status === "released";
}
