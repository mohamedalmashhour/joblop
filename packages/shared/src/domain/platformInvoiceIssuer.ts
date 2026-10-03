// JobLop platform invoice issuer — the single legal issuer for client invoices (agency model).
// Built from the owner's real company invoice (#41). These values are snapshotted onto each
// invoice at issue time, so changing them here only affects NEW invoices.
//
// Legal identity + tax registration map to the existing invoice engine types; the contact block
// (address / phone / email / logo) is presentational for the PDF. GST/QST are Quebec rates:
// GST (TPS) 5% = 50_000 ppm, QST (TVQ) 9.975% = 99_750 ppm, applied on the subtotal.
import type { InvoiceIssuerConfiguration, InvoiceTaxConfiguration } from "./invoice";

export type PlatformInvoiceContact = Readonly<{
  addressLine1: string;
  city: string;
  province: string;
  postalCode: string;
  phone: string;
  email: string;
}>;

const PLATFORM_ISSUER_EFFECTIVE_FROM = "2026-01-01T00:00:00.000Z";

export const PLATFORM_INVOICE_ISSUER: InvoiceIssuerConfiguration = {
  version: "joblop-issuer-v1",
  issuerModel: "platform_principal",
  productionApprovalReference: null, // set only when live (non-test) billing is approved
  legalName: "9375-7649 Québec Inc.",
  enterpriseIdentifier: "NEQ-TO-CONFIRM", // Québec NEQ — awaiting the exact number from the owner
  gstRegistrationReference: "762614485RT0001", // GST / TPS
  qstRegistrationReference: "1225519125TQ0002", // QST / TVQ
  effectiveFrom: PLATFORM_ISSUER_EFFECTIVE_FROM,
  effectiveUntil: null
};

export const PLATFORM_INVOICE_TAX: InvoiceTaxConfiguration = {
  version: "joblop-tax-v1",
  treatment: "taxable",
  issuerRegisteredForGst: true,
  issuerRegisteredForQst: true,
  supplyClassification: "staffing_services",
  placeOfSupplyPolicyVersion: "qc-place-of-supply-v1",
  gstRatePartsPerMillion: 50_000, // GST / TPS 5%
  qstRatePartsPerMillion: 99_750, // QST / TVQ 9.975%
  effectiveFrom: PLATFORM_ISSUER_EFFECTIVE_FROM,
  effectiveUntil: null
};

export const PLATFORM_INVOICE_CONTACT: PlatformInvoiceContact = {
  addressLine1: "207-805 boul. Chomedey",
  city: "Laval",
  province: "QC",
  postalCode: "H7V 0B1",
  phone: "514-462-4457",
  email: "info@joblop.com"
};
