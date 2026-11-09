import type { PrismaClient } from "@rwos/database";
import { PLATFORM_INVOICE_CONTACT, PLATFORM_INVOICE_ISSUER } from "@rwos/shared";
import type { EmailMessage, EmailSender } from "./mailer/emailSender";
import { resolveLanguage, type NotificationLanguage } from "./notifications/clientNotifications";
import { formatCadMinor } from "./paymentFormat";
import { renderPaymentReceiptPdf } from "./receiptPdf";

// RECEIPTS for paid plan and long-term listing orders (GST/QST receipt, B6). One receipt per paid
// order, numbered RCPT-YYYY-NNNNNN from its own sequence, written inside the same transaction that
// marks the order paid (so every paid order has exactly one receipt). The issuer (Joblop's legal
// name, address, GST and QST numbers) and the company billed are copied onto the receipt, so later
// changes never alter an issued receipt. The email is sent after the payment is saved, best effort:
// a failed email never undoes the payment, it is only recorded on the receipt and logged.

export type ReceiptKind = "employer_plan" | "job_listing";

export type IssueReceiptInput = Readonly<{
  organizationId: string;
  kind: ReceiptKind;
  employerPlanOrderId?: string;
  jobListingOrderId?: string;
  itemCode: string;
  itemLabel: string;
  discountKind?: string;
  periodStart: Date;
  periodEnd: Date;
  subtotalMinor: number;
  gstMinor: number;
  qstMinor: number;
  totalMinor: number;
  currency: string;
  paymentMethod: string;
  paymentRef: string | null;
  paidAt: Date;
}>;

export type ReceiptRecord = Readonly<{
  id: string;
  receiptNumber: string;
  organizationId: string;
  kind: string;
  itemCode: string;
  itemLabel: string;
  discountKind: string;
  periodStart: Date;
  periodEnd: Date;
  subtotalMinor: number;
  gstMinor: number;
  qstMinor: number;
  totalMinor: number;
  currency: string;
  paymentMethod: string;
  paymentRef: string | null;
  paidAt: Date;
  billedToName: string;
  billedToLegalName: string | null;
  issuerLegalName: string;
  issuerAddress: string;
  issuerGstNumber: string;
  issuerQstNumber: string;
  emailedAt?: Date | null;
  emailStatus?: string | null;
}>;

/** The Québec calendar year of a moment (receipts are numbered per year). */
export function receiptYear(at: Date): number {
  return Number(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", year: "numeric" }).format(at));
}

export function formatReceiptNumber(year: number, value: number): string {
  return `RCPT-${year}-${String(value).padStart(6, "0")}`;
}

export const ISSUER_ADDRESS = `${PLATFORM_INVOICE_CONTACT.addressLine1}, ${PLATFORM_INVOICE_CONTACT.city} (${PLATFORM_INVOICE_CONTACT.province}) ${PLATFORM_INVOICE_CONTACT.postalCode}`;

type ReceiptTx = Pick<PrismaClient, "paymentReceipt" | "paymentReceiptSequence" | "employerOrganization">;

/**
 * Write the receipt for a freshly paid order. Call it inside the transaction that marked the order
 * paid. Idempotent per order: a second call returns the receipt already written.
 */
export async function issuePaymentReceipt(tx: ReceiptTx, input: IssueReceiptInput): Promise<Readonly<{ id: string; receiptNumber: string }>> {
  const orderKey = input.employerPlanOrderId
    ? { employerPlanOrderId: input.employerPlanOrderId }
    : input.jobListingOrderId
      ? { jobListingOrderId: input.jobListingOrderId }
      : null;
  if (!orderKey) throw new Error("RWOS_RECEIPT_ORDER_REQUIRED");
  const existing = await tx.paymentReceipt.findFirst({ where: orderKey, select: { id: true, receiptNumber: true } });
  if (existing) return existing;
  const organization = await tx.employerOrganization.findUnique({
    where: { id: input.organizationId },
    select: { displayName: true, legalName: true }
  });
  const year = receiptYear(input.paidAt);
  await tx.paymentReceiptSequence.upsert({ where: { scopeYear: year }, create: { scopeYear: year, lastValue: 0 }, update: {} });
  const sequence = await tx.paymentReceiptSequence.update({ where: { scopeYear: year }, data: { lastValue: { increment: 1 } } });
  const billedToName = organization?.displayName ?? organization?.legalName ?? "Client";
  const created = await tx.paymentReceipt.create({
    data: {
      receiptNumber: formatReceiptNumber(year, sequence.lastValue),
      organizationId: input.organizationId,
      kind: input.kind,
      ...orderKey,
      itemCode: input.itemCode,
      itemLabel: input.itemLabel,
      discountKind: input.discountKind ?? "none",
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      subtotalMinor: input.subtotalMinor,
      gstMinor: input.gstMinor,
      qstMinor: input.qstMinor,
      totalMinor: input.totalMinor,
      currency: input.currency,
      paymentMethod: input.paymentMethod,
      paymentRef: input.paymentRef,
      paidAt: input.paidAt,
      billedToName,
      billedToLegalName: organization?.legalName && organization.legalName !== billedToName ? organization.legalName : null,
      issuerLegalName: PLATFORM_INVOICE_ISSUER.legalName,
      issuerAddress: ISSUER_ADDRESS,
      issuerGstNumber: PLATFORM_INVOICE_ISSUER.gstRegistrationReference ?? "",
      issuerQstNumber: PLATFORM_INVOICE_ISSUER.qstRegistrationReference ?? ""
    },
    select: { id: true, receiptNumber: true }
  });
  return created;
}

export type ReceiptView = Readonly<{
  id: string;
  receiptNumber: string;
  kind: string;
  itemCode: string;
  itemLabel: string;
  periodStart: string;
  periodEnd: string;
  subtotalMinor: number;
  gstMinor: number;
  qstMinor: number;
  totalMinor: number;
  currency: string;
  paymentMethod: string;
  paidAt: string;
}>;

export function toReceiptView(row: ReceiptRecord): ReceiptView {
  return {
    id: row.id,
    receiptNumber: row.receiptNumber,
    kind: row.kind,
    itemCode: row.itemCode,
    itemLabel: row.itemLabel,
    periodStart: row.periodStart.toISOString(),
    periodEnd: row.periodEnd.toISOString(),
    subtotalMinor: row.subtotalMinor,
    gstMinor: row.gstMinor,
    qstMinor: row.qstMinor,
    totalMinor: row.totalMinor,
    currency: row.currency,
    paymentMethod: row.paymentMethod,
    paidAt: row.paidAt.toISOString()
  };
}

/** The company's receipts, newest first (plans and listings together). */
export async function listOrganizationReceipts(prisma: PrismaClient, organizationId: string, take = 24): Promise<ReceiptView[]> {
  const rows = await prisma.paymentReceipt.findMany({ where: { organizationId }, orderBy: { paidAt: "desc" }, take });
  return rows.map(toReceiptView);
}

/** One receipt of this company (null when it is not theirs). */
export async function findOrganizationReceipt(prisma: PrismaClient, organizationId: string, receiptId: string): Promise<ReceiptRecord | null> {
  return prisma.paymentReceipt.findFirst({ where: { id: receiptId, organizationId } });
}

export type OrganizationContact = Readonly<{ email: string; phone: string | null; language: NotificationLanguage }>;

/**
 * Who gets the company's money notices: the person who created the company, else its earliest active
 * member. Null when nobody with an email is found.
 */
export async function findOrganizationContact(prisma: PrismaClient, organizationId: string): Promise<OrganizationContact | null> {
  const organization = await prisma.employerOrganization.findUnique({
    where: { id: organizationId },
    select: { createdBy: { select: { emailNormalized: true, phone: true, primaryLanguage: true } } }
  });
  let user = organization?.createdBy ?? null;
  if (!user?.emailNormalized) {
    const membership = await prisma.organizationMembership.findFirst({
      where: { organizationId, status: "active" },
      orderBy: { createdAt: "asc" },
      select: { user: { select: { emailNormalized: true, phone: true, primaryLanguage: true } } }
    });
    user = membership?.user ?? null;
  }
  if (!user?.emailNormalized) return null;
  return { email: user.emailNormalized, phone: user.phone ?? null, language: resolveLanguage(user.primaryLanguage) };
}

function day(at: Date, language: NotificationLanguage): string {
  return at.toLocaleDateString(language === "en" ? "en-CA" : "fr-CA", { timeZone: "America/Toronto", year: "numeric", month: "long", day: "numeric" });
}

/** The receipt email (French by default, English when the user reads English). The PDF is attached. */
export function paymentReceiptEmail(params: {
  to: string;
  language: NotificationLanguage;
  receipt: ReceiptRecord;
  pdf: Readonly<{ name: string; contentBase64: string }> | null;
}): EmailMessage {
  const { receipt } = params;
  const attachments = params.pdf ? { attachments: [params.pdf] } : {};
  const total = formatCadMinor(receipt.totalMinor);
  const period = `${day(receipt.periodStart, params.language)} – ${day(receipt.periodEnd, params.language)}`;
  if (params.language === "en") {
    const item = receipt.kind === "job_listing" ? `Long-term job listing: ${receipt.itemLabel}` : `${receipt.itemLabel} plan`;
    return {
      to: params.to,
      subject: `Joblop — receipt ${receipt.receiptNumber}`,
      text:
        `Thank you. We received your payment of ${total}.\n\n` +
        `Receipt ${receipt.receiptNumber}\n${item}\nPeriod: ${period}\n` +
        `Subtotal ${formatCadMinor(receipt.subtotalMinor)} + GST ${formatCadMinor(receipt.gstMinor)} + QST ${formatCadMinor(receipt.qstMinor)} = ${total}\n\n` +
        `${params.pdf ? "The receipt is attached. " : ""}You can also see it on the Plans page in Joblop.\n\n— Joblop`,
      ...attachments
    };
  }
  const item = receipt.kind === "job_listing" ? `Annonce d'emploi de longue durée : ${receipt.itemLabel}` : `Forfait ${receipt.itemLabel}`;
  return {
    to: params.to,
    subject: `Joblop — reçu ${receipt.receiptNumber}`,
    text:
      `Merci. Nous avons reçu votre paiement de ${total}.\n\n` +
      `Reçu ${receipt.receiptNumber}\n${item}\nPériode : ${period}\n` +
      `Sous-total ${formatCadMinor(receipt.subtotalMinor)} + TPS ${formatCadMinor(receipt.gstMinor)} + TVQ ${formatCadMinor(receipt.qstMinor)} = ${total}\n\n` +
      `${params.pdf ? "Le reçu est joint. " : ""}Vous pouvez aussi le voir à la page Forfaits dans Joblop.\n\n— Joblop`,
    ...attachments
  };
}

export type ReceiptEmailStatus = "sent" | "skipped" | "error" | "no_recipient";

/**
 * Email a receipt to the company. Never throws: the payment is already saved. The outcome is stored
 * on the receipt (emailStatus / emailedAt) and passed to `log`.
 */
export async function sendPaymentReceiptEmail(
  prisma: PrismaClient,
  emailSender: EmailSender,
  receiptId: string,
  log?: (event: string, fields: Record<string, unknown>) => void,
  now: () => Date = () => new Date()
): Promise<ReceiptEmailStatus> {
  let status: ReceiptEmailStatus;
  try {
    const receipt = await prisma.paymentReceipt.findUnique({ where: { id: receiptId } });
    if (!receipt) return "no_recipient";
    const contact = await findOrganizationContact(prisma, receipt.organizationId);
    if (!contact) {
      status = "no_recipient";
    } else {
      let pdf: Readonly<{ name: string; contentBase64: string }> | null = null;
      try {
        const rendered = renderPaymentReceiptPdf(receipt);
        pdf = { name: rendered.filename, contentBase64: Buffer.from(rendered.bytes).toString("base64") };
      } catch {
        pdf = null;
      }
      const result = await emailSender
        .send(paymentReceiptEmail({ to: contact.email, language: contact.language, receipt, pdf }))
        .catch(() => ({ status: "error" as const }));
      status = result.status === "sent" ? "sent" : result.status === "skipped" ? "skipped" : "error";
    }
    await prisma.paymentReceipt
      .update({ where: { id: receiptId }, data: { emailStatus: status, ...(status === "sent" ? { emailedAt: now() } : {}) } })
      .catch(() => undefined);
  } catch {
    status = "error";
  }
  log?.(status === "sent" || status === "skipped" ? "api.payment_receipt.email" : "api.payment_receipt.email_failed", { receiptId, status });
  return status;
}
