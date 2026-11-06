// The exact worksite address, shown only to a worker assigned to the shift. Everyone else, including
// a worker browsing jobs, sees area-level location only. Country-neutral: it joins whatever address
// parts the worksite holds and applies no country format.

export type WorksiteAddressFields = Readonly<{
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  province: string | null;
  region: string | null;
  postalCode: string | null;
  addressSummary: string | null;
}>;

export const WORKSITE_ADDRESS_SELECT = {
  addressLine1: true,
  addressLine2: true,
  city: true,
  province: true,
  region: true,
  postalCode: true,
  addressSummary: true
} as const;

// A worker needs the address to reach the shift. Once it is over or cancelled, it stops being shown.
const ADDRESS_VISIBLE_ATTENDANCE_STATUSES: ReadonlySet<string> = new Set(["pending_start", "checked_in"]);

export function isWorksiteAddressVisible(attendanceStatus: string): boolean {
  return ADDRESS_VISIBLE_ATTENDANCE_STATUSES.has(attendanceStatus);
}

// The site address the employer entered for this job comes first, because a job can run somewhere
// other than the residence's main address. The residence is the fallback.
export function workerJobAddress(jobSiteAddress: string | null | undefined, residence: WorksiteAddressFields): string | null {
  return jobSiteAddress?.trim() || formatWorksiteAddress(residence);
}

export function formatWorksiteAddress(fields: WorksiteAddressFields): string | null {
  const street = fields.addressLine1?.trim();
  // A city on its own is not an exact address, so fall back to the summary, or to nothing.
  if (!street) return fields.addressSummary?.trim() || null;
  const parts = [street, fields.addressLine2, fields.city, fields.province ?? fields.region, fields.postalCode];
  return parts.map((part) => part?.trim()).filter(Boolean).join(", ");
}
