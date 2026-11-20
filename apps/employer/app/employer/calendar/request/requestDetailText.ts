// Words that mean "no certificate needed" in old saved requests; shown as "None", never as "no".
const NONE_WORDS = new Set(["no", "none", "n/a", "na", "non", "aucun", "aucune", "-"]);

// The certificates to show on the request detail: the ones chosen on the request form when known,
// otherwise the older free-text list. Empty means "Required certificates: None".
export function requestCertificates(
  chosen: readonly string[] | null,
  legacy: readonly string[],
  label: (key: string) => string
): string[] {
  const source = chosen && chosen.length > 0 ? chosen.map(label) : legacy;
  return source.map((item) => item.trim()).filter((item) => item !== "" && !NONE_WORDS.has(item.toLowerCase()));
}
