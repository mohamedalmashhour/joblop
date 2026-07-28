export const approvedPostgresTlsModes = ["require", "verify-ca", "verify-full"] as const;

export function isFullReleaseSha(value: string | undefined) {
  return Boolean(value && /^[a-f0-9]{40}$/.test(value));
}

export function isImmutableExternalIdentity(value: string | undefined) {
  const normalized = value?.trim();
  if (!normalized || normalized.length < 12 || normalized.length > 255) return false;
  if (/(?:^|[/_.-])(current|latest|placeholder|unknown|tbd)(?:$|[/_.-])/i.test(normalized)) {
    return false;
  }
  return /^[a-z0-9][a-z0-9._-]*(?:\/[a-z0-9][a-z0-9._-]*){2,}$/.test(normalized);
}

export function readApprovedPostgresTlsMode(databaseUrl: URL) {
  const sslMode = databaseUrl.searchParams.get("sslmode");
  return approvedPostgresTlsModes.includes(sslMode as (typeof approvedPostgresTlsModes)[number])
    ? sslMode
    : null;
}
