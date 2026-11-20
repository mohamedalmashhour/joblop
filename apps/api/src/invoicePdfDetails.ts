import type { PrismaClient } from "@rwos/database";
import type { InvoicePdfDetails } from "./invoicePdf";
import type { DurableInvoice } from "./invoiceRepository";

// Who the invoice is for and what work it covers, for the PDF. Best-effort: any gap leaves that part
// of the PDF out instead of stopping it.
export async function invoicePdfDetails(prisma: PrismaClient, invoice: DurableInvoice): Promise<InvoicePdfDetails> {
  try {
    const [organization, timesheet] = await Promise.all([
      prisma.employerOrganization.findUnique({
        where: { id: invoice.organizationId },
        select: { displayName: true, legalName: true }
      }),
      prisma.timesheet.findFirst({
        where: { id: invoice.timesheetId, organizationId: invoice.organizationId },
        select: { payableMinutes: true, scheduledStartAt: true, jobRequestId: true }
      })
    ]);
    const job = timesheet
      ? await prisma.jobRequest.findFirst({
          where: { id: timesheet.jobRequestId, organizationId: invoice.organizationId },
          select: { title: true }
        })
      : null;
    return {
      billToName: organization?.displayName ?? null,
      billToLegalName: organization?.legalName ?? null,
      jobTitle: job?.title ?? null,
      serviceDate: timesheet ? timesheet.scheduledStartAt.toISOString().slice(0, 10) : null,
      payableMinutes: timesheet?.payableMinutes ?? null
    };
  } catch {
    return {};
  }
}
