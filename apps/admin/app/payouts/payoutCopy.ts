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

export const PAYOUT_STATUS_LABEL: Readonly<Record<string, string>> = {
  pending: "Waiting for release",
  released: "Ready to pay",
  held: "Paused by a dispute",
  paid: "Paid",
  cancelled: "Cancelled"
};

// `labels` lets the page pass the labels for the visitor's language (see text.ts); English by default.
export function payoutStatusLabel(status: string, labels: Readonly<Record<string, string>> = PAYOUT_STATUS_LABEL): string {
  return labels[status] ?? status.replaceAll("_", " ");
}

export function canSendTestPayout(payout: StaffPayout, testPayoutEnabled: boolean): boolean {
  return testPayoutEnabled && payout.status === "released";
}
