import { describe, expect, it } from "vitest";
import { paymentReceiptEmail, type ReceiptRecord } from "./paymentReceipts";
import { renderPaymentReceiptPdf } from "./receiptPdf";

const receipt: ReceiptRecord = {
  id: "r-1",
  receiptNumber: "RCPT-2026-000007",
  organizationId: "org-1",
  kind: "job_listing",
  itemCode: "job_listing",
  itemLabel: "Night caretaker",
  discountKind: "first_month_half",
  periodStart: new Date("2026-11-22T12:00:00.000Z"),
  periodEnd: new Date("2026-12-22T12:00:00.000Z"),
  subtotalMinor: 4_950,
  gstMinor: 248,
  qstMinor: 494,
  totalMinor: 5_692,
  currency: "CAD",
  paymentMethod: "e_transfer",
  paymentRef: "JL-7F3K2",
  paidAt: new Date("2026-11-08T15:00:00.000Z"),
  billedToName: "Acme",
  billedToLegalName: "Acme Care Inc.",
  issuerLegalName: "9375-7649 Québec Inc.",
  issuerAddress: "207-805 boul. Chomedey, Laval (QC) H7V 0B1",
  issuerGstNumber: "762614485RT0001",
  issuerQstNumber: "1225519125TQ0002"
};

describe("receipt PDF and email", () => {
  it("prints the issuer, the company, the job, the period, the half-price note, the taxes and the reference", () => {
    const pdf = renderPaymentReceiptPdf(receipt);
    expect(pdf.filename).toBe("RCPT-2026-000007.pdf");
    const body = Buffer.from(pdf.bytes).toString("latin1");
    for (const text of ["RECEIPT / RE", "Acme Care Inc.", "Night caretaker", "2026-11-22 to/au 2026-12-22", "50%", "$49.50", "$2.48", "$4.94", "$56.92 CAD", "JL-7F3K2", "Months already paid are not refunded", "2026-11-08"]) {
      expect(body, text).toContain(text);
    }
    expect(body).not.toContain("Test card payment");
    const card = Buffer.from(renderPaymentReceiptPdf({ ...receipt, paymentMethod: "stripe" }).bytes).toString("latin1");
    expect(card).toContain("Test card payment");
  });

  it("emails in French by default, with the PDF attached", () => {
    const message = paymentReceiptEmail({ to: "a@b.test", language: "fr", receipt, pdf: { name: "RCPT-2026-000007.pdf", contentBase64: "JVBERg==" } });
    expect(message.subject).toBe("Joblop — reçu RCPT-2026-000007");
    expect(message.text).toContain("$56.92");
    expect(message.text).toContain("TPS $2.48");
    expect(message.attachments).toHaveLength(1);
  });
});
