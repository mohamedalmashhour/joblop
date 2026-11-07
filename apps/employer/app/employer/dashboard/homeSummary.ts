type HomeRequest = Readonly<{
  requestNumber: string;
  title: string;
  startAt: string;
  timezone: string;
  status: string;
  actionRequired: string | null;
}>;
type HomeTimesheet = Readonly<{ status: string }>;
type HomeInvoice = Readonly<{ status: string; totalMinor: number }>;

const INVOICE_STATUSES_TO_PAY = ["sent", "viewed", "partially_paid", "overdue"];

export type HomeSources = Readonly<{
  requests: readonly HomeRequest[] | null;
  timesheets: readonly HomeTimesheet[] | null;
  invoices: readonly HomeInvoice[] | null;
}>;

// The numbers on the employer's home page, from their live records. Null means that source could not
// be read, which must not look like zero.
export function summarizeHome({ requests, timesheets, invoices }: HomeSources) {
  const toPay = invoices?.filter((invoice) => INVOICE_STATUSES_TO_PAY.includes(invoice.status)) ?? null;
  return {
    requestCount: requests?.length ?? null,
    requestsNeedingAction: requests?.filter((request) => request.actionRequired !== null).length ?? null,
    timesheetsToConfirm: timesheets?.filter((timesheet) => timesheet.status === "employer_review").length ?? null,
    invoicesToPay: toPay?.length ?? null,
    invoicesToPayMinor: toPay?.reduce((sum, invoice) => sum + invoice.totalMinor, 0) ?? null,
    recentRequests: [...(requests ?? [])].sort((a, b) => b.startAt.localeCompare(a.startAt)).slice(0, 5)
  };
}
