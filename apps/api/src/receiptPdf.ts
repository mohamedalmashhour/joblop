import { PLATFORM_INVOICE_CONTACT } from "@rwos/shared";
import { PDF_COLOURS, PdfPage, pdfMoney, type RenderedInvoicePdf } from "./invoicePdf";
import type { ReceiptRecord } from "./paymentReceipts";

// The receipt PDF (English / French, like the invoice PDF and with the same look). Everything printed
// comes from the stored receipt, so a reprint always matches the original.

const { BLACK, WHITE, GOLD, GOLD_DARK, INK, MUTED, PANEL, RULE } = PDF_COLOURS;

function isoDay(at: Date): string {
  // YYYY-MM-DD in Québec time.
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
}

const METHOD_LABEL: Record<string, string> = {
  e_transfer: "Interac e-transfer / Virement Interac",
  stripe: "Card (test) / Carte (test)"
};

export function renderPaymentReceiptPdf(receipt: ReceiptRecord): RenderedInvoicePdf {
  const page = new PdfPage();

  page.rect(0, 712, 612, 80, BLACK);
  page.logo(44, 727, 42);
  page.textRight("RECEIPT / REÇU", 562, 754, 15, "bold", WHITE);
  page.textRight(receipt.receiptNumber, 562, 734, 11, "regular", GOLD);
  page.rect(0, 708, 612, 4, GOLD);

  let y = 676;
  page.text("FROM / DE", 50, y, 8, "bold", GOLD_DARK);
  page.text("BILLED TO / FACTURÉ À", 330, y, 8, "bold", GOLD_DARK);
  y -= 16;
  const from = [
    receipt.issuerLegalName,
    receipt.issuerAddress,
    `${PLATFORM_INVOICE_CONTACT.phone} · ${PLATFORM_INVOICE_CONTACT.email}`,
    `GST/TPS ${receipt.issuerGstNumber}`,
    `QST/TVQ ${receipt.issuerQstNumber}`
  ];
  const billTo = [receipt.billedToName, ...(receipt.billedToLegalName ? [receipt.billedToLegalName] : [])];
  from.forEach((line, index) => page.text(line, 50, y - index * 13, index === 0 ? 11 : 9, index === 0 ? "bold" : "regular", index === 0 ? INK : MUTED));
  billTo.forEach((line, index) => page.text(line, 330, y - index * 13, index === 0 ? 11 : 9, index === 0 ? "bold" : "regular", index === 0 ? INK : MUTED));
  y -= Math.max(from.length, billTo.length) * 13 + 18;

  const facts: [string, string][] = [
    ["RECEIPT NO. / N° DE REÇU", receipt.receiptNumber],
    ["PAID ON / PAYÉ LE", isoDay(receipt.paidAt)],
    ["PAYMENT / PAIEMENT", receipt.paymentMethod === "e_transfer" ? "Interac" : "Card / Carte"]
  ];
  page.rect(50, y - 44, 512, 52, PANEL);
  facts.forEach(([label, value], index) => {
    const x = 64 + index * 170;
    page.text(label, x, y - 10, 7, "bold", MUTED);
    page.text(value, x, y - 28, 11, "bold", INK);
  });
  y -= 76;

  page.rect(50, y - 6, 512, 22, BLACK);
  page.text("DESCRIPTION", 62, y + 1, 8, "bold", WHITE);
  page.textRight("AMOUNT / MONTANT", 550, y + 1, 8, "bold", WHITE);
  y -= 30;
  const title =
    receipt.kind === "job_listing"
      ? "Long-term job listing, 1 month / Annonce d'emploi de longue durée, 1 mois"
      : `${receipt.itemLabel} plan, 1 month / Forfait ${receipt.itemLabel}, 1 mois`;
  const period = `${isoDay(receipt.periodStart)} to/au ${isoDay(receipt.periodEnd)}`;
  const subline = [
    receipt.kind === "job_listing" ? receipt.itemLabel : null,
    period,
    receipt.discountKind === "first_month_half" ? "First paid month 50% off / Premier mois payé à 50 %" : null
  ]
    .filter(Boolean)
    .join(" · ");
  page.text(title, 62, y, 10, "bold", INK);
  page.text(subline, 62, y - 13, 8.5, "regular", MUTED);
  page.textRight(pdfMoney(receipt.subtotalMinor), 550, y, 10, "regular", INK);
  y -= 30;
  page.rect(50, y + 10, 512, 0.6, RULE);
  y -= 10;

  const totals: [string, number][] = [
    ["Subtotal / Sous-total", receipt.subtotalMinor],
    ["GST/TPS (5%)", receipt.gstMinor],
    ["QST/TVQ (9.975%)", receipt.qstMinor]
  ];
  for (const [label, amount] of totals) {
    page.text(label, 352, y, 10, "regular", MUTED);
    page.textRight(pdfMoney(amount), 550, y, 10, "regular", INK);
    y -= 18;
  }
  y -= 8;
  page.rect(340, y - 14, 222, 32, BLACK);
  page.text("TOTAL PAID / PAYÉ", 352, y - 2, 11, "bold", WHITE);
  page.textRight(`${pdfMoney(receipt.totalMinor)} ${receipt.currency}`, 550, y - 2, 13, "bold", GOLD);
  page.rect(50, y - 14, 150, 32, GOLD);
  page.text("PAID / PAYÉ", 64, y - 2, 13, "bold", BLACK);
  y -= 50;

  page.text(`Payment method / Mode de paiement: ${METHOD_LABEL[receipt.paymentMethod] ?? receipt.paymentMethod}`, 50, y, 9, "regular", MUTED);
  if (receipt.paymentRef) page.text(`Payment reference / Référence du paiement: ${receipt.paymentRef}`, 50, y - 14, 9, "regular", MUTED);

  page.rect(50, 128, 512, 46, PANEL);
  page.rect(50, 128, 4, 46, GOLD);
  page.text("Thank you for your payment.", 66, 156, 12, "bold", INK);
  page.text("Merci pour votre paiement.", 66, 139, 10, "regular", MUTED);
  page.text("Canceling stops the next month. Months already paid are not refunded.", 50, 108, 8.5, "regular", MUTED);
  page.text("L'annulation arrête le mois suivant. Les mois déjà payés ne sont pas remboursés.", 50, 96, 8.5, "regular", MUTED);
  page.text(`Questions? / Des questions? ${PLATFORM_INVOICE_CONTACT.email} · ${PLATFORM_INVOICE_CONTACT.phone}`, 50, 84, 8.5, "regular", MUTED);
  if (receipt.paymentMethod === "stripe") {
    page.rect(50, 78, 512, 0.6, RULE);
    page.text("Test card payment, not valid for tax filing. / Paiement par carte d'essai, non valide pour la déclaration fiscale.", 50, 66, 7.5, "regular", MUTED);
  }

  return page.finish(receipt.receiptNumber);
}
