// A verified company's legal name is what was verified, so the employer cannot change it themselves.
// Joblop staff can, for example to correct it after a real legal change.
export function legalNameChangeBlocked(input: {
  currentLegalName: string;
  requestedLegalName: string | null;
  verified: boolean;
  platformAdmin: boolean;
}): boolean {
  if (input.requestedLegalName === null || input.platformAdmin || !input.verified) return false;
  return input.requestedLegalName.trim().replace(/\s+/g, " ") !== input.currentLegalName;
}
