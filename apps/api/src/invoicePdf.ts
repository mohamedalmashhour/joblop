import { createHash } from "node:crypto";
import { PLATFORM_INVOICE_CONTACT, MINIMUM_BILLABLE_SHIFT_HOURS } from "@rwos/shared";
import type { DurableCreditNote, DurableInvoice } from "./invoiceRepository";
import { JOBLOP_LOGO_JPEG } from "./joblopLogoJpeg";

export type RenderedInvoicePdf = Readonly<{
  bytes: Uint8Array;
  digest: string;
  filename: string;
  contentType: "application/pdf";
}>;

// The copy attached to the invoice email. A PDF that cannot be made never stops the email itself.
export function invoiceEmailAttachment(
  invoice: DurableInvoice,
  details: InvoicePdfDetails = {}
): Readonly<{ name: string; contentBase64: string }> | null {
  try {
    const rendered = renderBilingualSyntheticInvoicePdf(invoice, details);
    return { name: rendered.filename, contentBase64: Buffer.from(rendered.bytes).toString("base64") };
  } catch {
    return null;
  }
}

// Facts the invoice record does not hold itself. All optional: without them the invoice still renders.
export type InvoicePdfDetails = Readonly<{
  billToName?: string | null;
  billToLegalName?: string | null;
  jobTitle?: string | null;
  serviceDate?: string | null;
  payableMinutes?: number | null;
}>;

const LINE_LABEL: Record<string, string> = {
  regular_labour: "Labour / Main-d'oeuvre",
  urgent_labour: "Urgent labour / Main-d'oeuvre urgente",
  approved_travel_time: "Travel time / Temps de déplacement",
  mileage: "Mileage / Kilométrage",
  adjustment: "Adjustment / Ajustement",
  marketplace_fee: "Service fee / Frais de service",
  bonus: "Bonus / Prime",
  credit: "Credit / Crédit"
};

export function renderBilingualSyntheticInvoicePdf(invoice: DurableInvoice, details: InvoicePdfDetails = {}): RenderedInvoicePdf {
  if (!invoice.invoiceNumber || !invoice.issuedAt) {
    throw new Error("Only an issued invoice can be rendered.");
  }
  const snapshot = invoice.calculationSnapshot;
  const issuer = snapshot.issuer;
  const page = new PdfPage();

  // Header band.
  page.rect(0, 712, 612, 80, BLACK);
  page.logo(44, 727, 42);
  page.textRight("INVOICE / FACTURE", 562, 754, 15, "bold", WHITE);
  page.textRight(invoice.invoiceNumber, 562, 734, 11, "regular", GOLD);
  page.rect(0, 708, 612, 4, GOLD);

  // From and bill-to.
  let y = 676;
  page.text("FROM / DE", 50, y, 8, "bold", GOLD_DARK);
  page.text("BILL TO / FACTURER À", 330, y, 8, "bold", GOLD_DARK);
  y -= 16;
  const from = [
    issuer.legalName,
    ...(issuer.issuerModel === "platform_principal"
      ? [
          PLATFORM_INVOICE_CONTACT.addressLine1,
          `${PLATFORM_INVOICE_CONTACT.city} (${PLATFORM_INVOICE_CONTACT.province}) ${PLATFORM_INVOICE_CONTACT.postalCode}`,
          `${PLATFORM_INVOICE_CONTACT.phone} · ${PLATFORM_INVOICE_CONTACT.email}`
        ]
      : []),
    `NEQ ${issuer.enterpriseIdentifier}`,
    ...(issuer.gstRegistrationReference ? [`GST/TPS ${issuer.gstRegistrationReference}`] : []),
    ...(issuer.qstRegistrationReference ? [`QST/TVQ ${issuer.qstRegistrationReference}`] : [])
  ];
  const billTo = [
    details.billToName ?? "Client",
    ...(details.billToLegalName && details.billToLegalName !== details.billToName ? [details.billToLegalName] : [])
  ];
  from.forEach((line, index) => page.text(line, 50, y - index * 13, index === 0 ? 11 : 9, index === 0 ? "bold" : "regular", index === 0 ? INK : MUTED));
  billTo.forEach((line, index) => page.text(line, 330, y - index * 13, index === 0 ? 11 : 9, index === 0 ? "bold" : "regular", index === 0 ? INK : MUTED));
  y -= Math.max(from.length, billTo.length) * 13 + 18;

  // Key facts.
  const facts: [string, string][] = [
    ["INVOICE NO. / N° DE FACTURE", invoice.invoiceNumber],
    ["ISSUED / ÉMISE", invoice.issuedAt.slice(0, 10)],
    ["DUE / ÉCHÉANCE", invoice.dueAt ? invoice.dueAt.slice(0, 10) : "On receipt / À réception"]
  ];
  page.rect(50, y - 44, 512, 52, PANEL);
  facts.forEach(([label, value], index) => {
    const x = 64 + index * 170;
    page.text(label, x, y - 10, 7, "bold", MUTED);
    page.text(value, x, y - 28, 11, "bold", INK);
  });
  y -= 76;

  // Line items. Taxes go in the totals; empty lines are left out.
  page.rect(50, y - 6, 512, 22, BLACK);
  page.text("DESCRIPTION", 62, y + 1, 8, "bold", WHITE);
  page.textRight("HOURS / HEURES", 372, y + 1, 8, "bold", WHITE);
  page.textRight("RATE / TAUX", 462, y + 1, 8, "bold", WHITE);
  page.textRight("AMOUNT / MONTANT", 550, y + 1, 8, "bold", WHITE);
  y -= 30;
  const items = snapshot.lines.filter((line) => line.kind !== "gst" && line.kind !== "qst" && line.amount.amountMinor !== 0);
  for (const line of items) {
    const isLabour = line.kind === "regular_labour";
    // Labour is billed for at least 6 hours; say so on the invoice when the shift was shorter.
    const workedHours = isLabour && details.payableMinutes ? details.payableMinutes / 60 : null;
    const hours = workedHours === null ? null : Math.max(workedHours, MINIMUM_BILLABLE_SHIFT_HOURS);
    const minimumApplied = workedHours !== null && workedHours < MINIMUM_BILLABLE_SHIFT_HOURS;
    page.text(LINE_LABEL[line.kind] ?? line.description, 62, y, 10, "bold", INK);
    if (isLabour && (details.jobTitle || details.serviceDate || minimumApplied)) {
      const subline = [details.jobTitle, details.serviceDate].filter(Boolean).join(" · ");
      const note = minimumApplied
        ? `Minimum ${MINIMUM_BILLABLE_SHIFT_HOURS} h billed (${workedHours!.toFixed(2)} h worked) / Minimum de ${MINIMUM_BILLABLE_SHIFT_HOURS} h facturé`
        : "";
      page.text([subline, note].filter(Boolean).join(" · "), 62, y - 13, 8.5, "regular", MUTED);
    }
    if (hours) {
      page.textRight(hours.toFixed(2), 372, y, 10, "regular", INK);
      page.textRight(money(Math.round(line.amount.amountMinor / hours)), 462, y, 10, "regular", INK);
    }
    page.textRight(money(line.amount.amountMinor), 550, y, 10, "regular", INK);
    y -= isLabour && (details.jobTitle || details.serviceDate || minimumApplied) ? 30 : 22;
    page.rect(50, y + 10, 512, 0.6, RULE);
  }
  y -= 10;

  // Totals.
  const taxLines = snapshot.lines.filter((line) => line.kind === "gst" || line.kind === "qst");
  const totals: [string, number][] = [
    ["Subtotal / Sous-total", invoice.subtotalMinor],
    ...taxLines.map((line): [string, number] => [
      line.kind === "gst"
        ? `GST/TPS (${percent(snapshot.tax.gstRatePartsPerMillion)})`
        : `QST/TVQ (${percent(snapshot.tax.qstRatePartsPerMillion)})`,
      line.amount.amountMinor
    ]),
    ...(invoice.creditMinor ? ([["Credits / Crédits", -invoice.creditMinor]] as [string, number][]) : [])
  ];
  for (const [label, amount] of totals) {
    page.text(label, 352, y, 10, "regular", MUTED);
    page.textRight(money(amount), 550, y, 10, "regular", INK);
    y -= 18;
  }
  y -= 8;
  page.rect(340, y - 14, 222, 32, BLACK);
  page.text("TOTAL", 352, y - 2, 11, "bold", WHITE);
  page.textRight(`${money(invoice.totalMinor)} ${invoice.currency}`, 550, y - 2, 13, "bold", GOLD);

  // Footer.
  if (invoice.status === "paid") {
    page.rect(50, y - 14, 150, 32, GOLD);
    page.text("PAID / PAYÉE", 64, y - 2, 13, "bold", BLACK);
  }
  page.rect(50, 128, 512, 46, PANEL);
  page.rect(50, 128, 4, 46, GOLD);
  page.text("Thank you for your cooperation with us.", 66, 156, 12, "bold", INK);
  page.text("Merci pour votre collaboration avec nous.", 66, 139, 10, "regular", MUTED);
  page.text("Pay online: sign in to Joblop and open Invoices. / Payez en ligne : connectez-vous à Joblop, puis Factures.", 50, 108, 8.5, "regular", MUTED);
  page.text(`Questions? / Des questions? ${PLATFORM_INVOICE_CONTACT.email} · ${PLATFORM_INVOICE_CONTACT.phone}`, 50, 95, 8.5, "regular", MUTED);
  page.rect(50, 86, 512, 0.6, RULE);
  page.text("Test document, not valid for tax filing. / Document d'essai, non valide pour la déclaration fiscale.", 50, 70, 7.5, "regular", MUTED);

  return page.finish(invoice.invoiceNumber);
}

export function renderBilingualSyntheticCreditNotePdf(
  invoice: DurableInvoice,
  creditNote: DurableCreditNote
): RenderedInvoicePdf {
  if (
    creditNote.invoiceId !== invoice.id ||
    creditNote.organizationId !== invoice.organizationId ||
    creditNote.status !== "issued" ||
    !creditNote.creditNoteNumber ||
    !creditNote.issuedAt ||
    !invoice.invoiceNumber
  ) {
    throw new Error("Only an issued organization-scoped credit note can be rendered.");
  }
  const page = new PdfPage();
  page.rect(0, 712, 612, 80, BLACK);
  page.logo(44, 727, 42);
  page.textRight("CREDIT NOTE / NOTE DE CRÉDIT", 562, 754, 15, "bold", WHITE);
  page.textRight(creditNote.creditNoteNumber, 562, 734, 11, "regular", GOLD);
  page.rect(0, 708, 612, 4, GOLD);
  const rows: [string, string][] = [
    ["Original invoice / Facture originale", invoice.invoiceNumber],
    ["Issued / Émise", creditNote.issuedAt.slice(0, 10)],
    ["Reason / Motif", creditNote.reason],
    ["Credit / Crédit", `${money(creditNote.amountMinor)} ${creditNote.currency}`]
  ];
  rows.forEach(([label, value], index) => {
    page.text(label, 50, 660 - index * 24, 10, "regular", MUTED);
    page.text(value, 280, 660 - index * 24, 10, "bold", INK);
  });
  page.rect(50, 86, 512, 0.6, RULE);
  page.text("Test document, not valid for tax filing. / Document d'essai, non valide pour la déclaration fiscale.", 50, 70, 7.5, "regular", MUTED);
  return page.finish(creditNote.creditNoteNumber);
}

type Colour = readonly [number, number, number];
const BLACK: Colour = [0, 0, 0];
const WHITE: Colour = [1, 1, 1];
// The gold of the Joblop logo artwork, #F8B808.
const GOLD: Colour = [0.973, 0.722, 0.031];
const GOLD_DARK: Colour = [0.72, 0.52, 0.0];
const INK: Colour = [0.07, 0.07, 0.07];
const MUTED: Colour = [0.42, 0.4, 0.37];
const PANEL: Colour = [0.965, 0.949, 0.914];
const RULE: Colour = [0.86, 0.83, 0.78];

// Helvetica and Helvetica-Bold glyph widths (per 1000 units, from the standard font metrics), so
// right-aligned figures and the two-colour logo line up. Characters not listed use an average.
const LOWER = "abcdefghijklmnopqrstuvwxyz";
const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const WIDTHS = {
  regular: widthTable([556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500], [667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611], { ":": 278, "'": 191 }),
  bold: widthTable([556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500], [722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611], { ":": 333, "'": 238 })
};

function widthTable(lower: number[], upper: number[], extra: Record<string, number>): Map<string, number> {
  const table = new Map<string, number>();
  [...LOWER].forEach((ch, index) => table.set(ch, lower[index]!));
  [...UPPER].forEach((ch, index) => table.set(ch, upper[index]!));
  for (const ch of "0123456789$") table.set(ch, 556);
  for (const ch of " .,/·") table.set(ch, 278);
  table.set("(", 333).set(")", 333).set("-", 333).set("%", 889);
  for (const [ch, width] of Object.entries(extra)) table.set(ch, width);
  return table;
}

function textWidth(value: string, size: number, weight: "regular" | "bold") {
  const table = WIDTHS[weight];
  let units = 0;
  for (const ch of value.normalize("NFD").replace(/[\u0300-\u036f]/gu, "")) units += table.get(ch) ?? 556;
  return (units / 1000) * size;
}

class PdfPage {
  private readonly ops: string[] = [];
  private usesLogo = false;

  // The platform wordmark, drawn at the given height. Its black background sits on the black header.
  logo(x: number, y: number, height: number) {
    const width = (height * JOBLOP_LOGO_JPEG.width) / JOBLOP_LOGO_JPEG.height;
    this.usesLogo = true;
    this.ops.push(`q ${num(width)} 0 0 ${num(height)} ${num(x)} ${num(y)} cm /Logo Do Q`);
  }

  rect(x: number, y: number, width: number, height: number, colour: Colour) {
    this.ops.push(`${rgb(colour)} rg ${num(x)} ${num(y)} ${num(width)} ${num(height)} re f`);
  }

  text(value: string, x: number, y: number, size: number, weight: "regular" | "bold", colour: Colour) {
    this.ops.push(`BT /${weight === "bold" ? "F2" : "F1"} ${num(size)} Tf ${rgb(colour)} rg ${num(x)} ${num(y)} Td (${escapePdf(value)}) Tj ET`);
  }

  textRight(value: string, right: number, y: number, size: number, weight: "regular" | "bold", colour: Colour) {
    this.text(value, right - textWidth(value, size, weight), y, size, weight, colour);
  }

  finish(documentNumber: string): RenderedInvoicePdf {
    const content = this.ops.join("\n");
    const objects = [
      "<< /Type /Catalog /Pages 2 0 R >>",
      "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R /F2 6 0 R >>${this.usesLogo ? " /XObject << /Logo 7 0 R >>" : ""} >> /Contents 4 0 R >>`,
      `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`,
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
      ...(this.usesLogo ? [logoObject()] : [])
    ];
    const chunks = ["%PDF-1.4\n%RWOS\n"];
    const offsets = [0];
    let length = Buffer.byteLength(chunks[0]!, "latin1");
    objects.forEach((object, index) => {
      offsets.push(length);
      const chunk = `${index + 1} 0 obj\n${object}\nendobj\n`;
      chunks.push(chunk);
      length += Buffer.byteLength(chunk, "latin1");
    });
    const xref = length;
    chunks.push(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`);
    for (const offset of offsets.slice(1)) {
      chunks.push(`${offset.toString().padStart(10, "0")} 00000 n \n`);
    }
    chunks.push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
    const bytes = new Uint8Array(Buffer.from(chunks.join(""), "latin1"));
    return {
      bytes,
      digest: createHash("sha256").update(bytes).digest("hex"),
      filename: `${safeFilename(documentNumber)}.pdf`,
      contentType: "application/pdf"
    };
  }
}

function logoObject() {
  const jpeg = Buffer.from(JOBLOP_LOGO_JPEG.base64, "base64").toString("latin1");
  return `<< /Type /XObject /Subtype /Image /Width ${JOBLOP_LOGO_JPEG.width} /Height ${JOBLOP_LOGO_JPEG.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n${jpeg}\nendstream`;
}

const num = (value: number) => (Math.round(value * 100) / 100).toString();
const rgb = (colour: Colour) => colour.map((part) => num(part)).join(" ");

function percent(partsPerMillion: number) {
  return `${(partsPerMillion / 10_000).toFixed(3).replace(/\.?0+$/u, "")}%`;
}

function money(amountMinor: number) {
  if (!Number.isSafeInteger(amountMinor)) throw new Error("Invoice amount is invalid.");
  const sign = amountMinor < 0 ? "-" : "";
  const whole = Math.abs(amountMinor);
  const dollars = Math.floor(whole / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/gu, ",");
  return `${sign}$${dollars}.${(whole % 100).toString().padStart(2, "0")}`;
}

function escapePdf(value: string) {
  // The built-in fonts only cover Latin-1, so anything outside it is replaced rather than lost silently.
  const latin1 = value.replace(/[\u2018\u2019]/gu, "'").replace(/[\u201c\u201d]/gu, '"').replace(/[^\u0020-\u00ff]/gu, "?");
  return latin1.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}


function safeFilename(value: string) {
  return value.replaceAll(/[^A-Za-z0-9_-]/gu, "_").slice(0, 80);
}
