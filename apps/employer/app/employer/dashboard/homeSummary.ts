type HomeRequest = Readonly<{
  requestNumber: string;
  title: string;
  startAt: string;
  endAt?: string | null;
  timezone: string;
  status: string;
  numberOfWorkers?: number;
  actionRequired: string | null;
}>;
type HomeTimesheet = Readonly<{ status: string }>;
type HomeInvoice = Readonly<{ status: string; totalMinor: number }>;
type HomeAttendance = Readonly<{ status: string }>;

const INVOICE_STATUSES_TO_PAY = ["sent", "viewed", "partially_paid", "overdue"];
// Drafts are not shifts yet (they are counted on their own line), and closed requests are over.
const NOT_UPCOMING_STATUSES = ["draft", "completed", "cancelled"];
// Pending and review states are Joblop's to move, so only these need the employer.
const VERIFICATION_NEEDS_ACTION = ["unverified", "expired"];

export type HomeSources = Readonly<{
  requests: readonly HomeRequest[] | null;
  timesheets: readonly HomeTimesheet[] | null;
  invoices: readonly HomeInvoice[] | null;
  attendance: readonly HomeAttendance[] | null;
  contractUnsigned: boolean;
  verificationStatus: string | null;
}>;

// The numbers on the employer's home page, from their live records. Null means that source could not
// be read, which must not look like zero.
export function summarizeHome(
  { requests, timesheets, invoices, attendance, contractUnsigned, verificationStatus }: HomeSources,
  now = new Date()
) {
  const toPay = invoices?.filter((invoice) => INVOICE_STATUSES_TO_PAY.includes(invoice.status)) ?? null;
  return {
    requestCount: requests?.length ?? null,
    requestsNeedingAction: requests?.filter((request) => request.actionRequired !== null).length ?? null,
    timesheetsToConfirm: timesheets?.filter((timesheet) => timesheet.status === "employer_review").length ?? null,
    invoicesToPay: toPay?.length ?? null,
    invoicesToPayMinor: toPay?.reduce((sum, invoice) => sum + invoice.totalMinor, 0) ?? null,
    workingNow: attendance?.filter((record) => record.status === "checked_in").length ?? null,
    contractUnsigned,
    verificationNeeded: verificationStatus !== null && VERIFICATION_NEEDS_ACTION.includes(verificationStatus),
    upcomingShifts: upcomingShifts(requests ?? [], now),
    draftCount: requests?.filter((request) => request.status === "draft").length ?? null
  };
}

function upcomingShifts(requests: readonly HomeRequest[], now: Date) {
  return requests
    // A shift stays listed until it ends, so one that is under way still shows ("Working now").
    .filter((request) => !NOT_UPCOMING_STATUSES.includes(request.status) && new Date(request.endAt ?? request.startAt) >= now)
    .sort((a, b) => a.startAt.localeCompare(b.startAt))
    .slice(0, 5);
}

// The things the employer has to do, each with where to do it. Unreadable sources add nothing here.
export function attentionItems(summary: ReturnType<typeof summarizeHome>) {
  return [
    ...(summary.contractUnsigned ? [{ kind: "contract" as const, count: 1, href: "/employer/contract" }] : []),
    ...(summary.verificationNeeded ? [{ kind: "verification" as const, count: 1, href: "/employer/verification" }] : []),
    { kind: "info" as const, count: summary.requestsNeedingAction ?? 0, href: "/employer/calendar" },
    { kind: "timesheets" as const, count: summary.timesheetsToConfirm ?? 0, href: "/employer/timesheets" },
    { kind: "invoices" as const, count: summary.invoicesToPay ?? 0, href: "/employer/invoices" }
  ].filter((item) => item.count > 0);
}
