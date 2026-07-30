import { createHash } from "node:crypto";
import type { DurableInvoice } from "./invoiceRepository";

export type RenderedInvoicePdf = Readonly<{
  bytes: Uint8Array;
  digest: string;
  filename: string;
  contentType: "application/pdf";
}>;

export function renderBilingualSyntheticInvoicePdf(invoice: DurableInvoice): RenderedInvoicePdf {
  if (!invoice.invoiceNumber || !invoice.issuedAt) {
    throw new Error("Only an issued invoice can be rendered.");
  }
  const lines = [
    "INVOICE / FACTURE",
    `Number / Numéro: ${invoice.invoiceNumber}`,
    `Issued / Émise: ${invoice.issuedAt.slice(0, 10)}`,
    `Status / Statut: ${invoice.status}`,
    `Currency / Devise: ${invoice.currency}`,
    "",
    ...invoice.calculationSnapshot.lines.map(
      (line) =>
        `${line.description}: ${formatCad(line.amount.amountMinor)} (${line.quantityBasis})`
    ),
    "",
    `Subtotal / Sous-total: ${formatCad(invoice.subtotalMinor)}`,
    `Taxes / Taxes: ${formatCad(invoice.taxMinor)}`,
    `Credits / Crédits: ${formatCad(invoice.creditMinor)}`,
    `Total / Total: ${formatCad(invoice.totalMinor)}`,
    "",
    "SYNTHETIC LOCAL TEST DOCUMENT / DOCUMENT D’ESSAI LOCAL SYNTHÉTIQUE",
    "Not approved for production or tax filing / Non approuvé pour production ou déclaration fiscale"
  ];
  const content = pdfTextStream(lines);
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"
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
  chunks.push(
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  );
  const bytes = new Uint8Array(Buffer.from(chunks.join(""), "latin1"));
  return {
    bytes,
    digest: createHash("sha256").update(bytes).digest("hex"),
    filename: `${safeFilename(invoice.invoiceNumber)}.pdf`,
    contentType: "application/pdf"
  };
}

function pdfTextStream(lines: readonly string[]) {
  const commands = ["BT", "/F1 10 Tf", "50 750 Td", "13 TL"];
  for (const line of lines) {
    commands.push(`(${escapePdf(line)}) Tj`, "T*");
  }
  commands.push("ET");
  return commands.join("\n");
}

function escapePdf(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

function formatCad(amountMinor: number) {
  if (!Number.isSafeInteger(amountMinor)) throw new Error("Invoice amount is invalid.");
  return `${(amountMinor / 100).toFixed(2)} CAD`;
}

function safeFilename(value: string) {
  return value.replaceAll(/[^A-Za-z0-9_-]/gu, "_").slice(0, 80);
}
