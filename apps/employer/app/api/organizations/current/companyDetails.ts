export type CompanyDetails = Readonly<{
  legalName: string;
  displayName: string;
  publicId: string;
  version: string;
}>;

export type CompanyUpdate = Readonly<{ legalName: string; displayName: string; expectedVersion: string }>;

const MAX_NAME_LENGTH = 200;

function validName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim();
  return name.length > 0 && name.length <= MAX_NAME_LENGTH ? name : null;
}

// Only these three fields can pass through: a company's status and other governed fields stay out.
export function readCompanyUpdate(input: unknown): CompanyUpdate | null {
  if (typeof input !== "object" || input === null) return null;
  const record = input as Record<string, unknown>;
  const legalName = validName(record.legalName);
  const displayName = validName(record.displayName);
  const expectedVersion = record.expectedVersion;
  if (!legalName || !displayName || typeof expectedVersion !== "string" || !expectedVersion) return null;
  return { legalName, displayName, expectedVersion };
}
