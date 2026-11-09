// Privacy filter for every call to an outside AI (owner decision: "yes filter").
//
// Before any text leaves for the outside AI, personal data is replaced by a short placeholder, and
// object keys that name personal data are dropped outright. The filter is unconditional: there is no
// switch to turn it off. Only counts are ever logged, never the values.
//
// Tuned for Canada / Québec: North-American phone numbers, Canadian postal codes, French and English
// street addresses, SIN (Luhn-checked), card numbers (Luhn-checked), bank transit / institution /
// account numbers, and labelled dates of birth. It deliberately leaves alone money amounts, times,
// years, short counts, job reference codes (JR-2026-000123), UUIDs and ISO dates.
//
// Health (launch step 6, owner rule "no health information is ever sent to an outside AI"): any
// sentence that names a diagnosis, condition, medication, disability, pregnancy, injury or sick note
// (English, French or Arabic words) is replaced as a whole by "[health detail]". RAMQ health-card
// numbers, passport numbers and driver's licence numbers are masked too. Work skills such as
// "first aid" or "medication reminders" (care jobs) are not personal health and are kept.
//
// Pure: no I/O. `reportMasked` is the only side effect and takes its logger as an argument.

import { createLogger } from "@rwos/observability";

export type MaskKind =
  | "email"
  | "phone"
  | "postalCode"
  | "address"
  | "sin"
  | "bankAccount"
  | "cardNumber"
  | "dateOfBirth"
  | "health"
  | "healthCard"
  | "idNumber";

export const MASK_PLACEHOLDER: Readonly<Record<MaskKind, string>> = {
  email: "[email]",
  phone: "[phone]",
  postalCode: "[postal code]",
  address: "[address]",
  sin: "[SIN]",
  bankAccount: "[bank account]",
  cardNumber: "[card number]",
  dateOfBirth: "[date of birth]",
  health: "[health detail]",
  healthCard: "[health card]",
  idNumber: "[ID number]"
};

export type MaskCounts = Record<MaskKind, number>;
export type MaskResult = Readonly<{ text: string; masked: MaskCounts }>;

const emptyCounts = (): MaskCounts => ({
  email: 0, phone: 0, postalCode: 0, address: 0, sin: 0, bankAccount: 0, cardNumber: 0, dateOfBirth: 0,
  health: 0, healthCard: 0, idNumber: 0
});

/** Case-insensitive alternative for one word, without the `i` flag (which would break \p{Lu}). */
function ci(word: string): string {
  return [...word]
    .map((ch) => {
      const lo = ch.toLowerCase();
      const up = ch.toUpperCase();
      const esc = (c: string) => c.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
      return lo === up ? esc(ch) : `[${esc(up)}${esc(lo)}]`;
    })
    .join("");
}
const anyOf = (words: readonly string[]) => `(?:${words.map(ci).join("|")})`;

export function luhnValid(digits: string): boolean {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (d < 0 || d > 9) return false;
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return digits.length > 0 && sum % 10 === 0;
}

const onlyDigits = (s: string) => s.replace(/\D/g, "");

// ── patterns ─────────────────────────────────────────────────────────────────
const NB = "(?<![\\p{L}\\p{N}_])"; // not preceded by a letter/digit
const NA = "(?![\\p{L}\\p{N}_])"; // not followed by a letter/digit

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;

const MONTHS = anyOf([
  "janvier", "février", "fevrier", "mars", "avril", "mai", "juin", "juillet", "août", "aout", "septembre", "octobre", "novembre", "décembre", "decembre",
  "january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december",
  "jan", "feb", "fév", "fev", "apr", "avr", "jun", "jul", "juil", "aug", "sep", "sept", "oct", "nov", "dec", "déc"
]);
const DATE_VALUE = `(?:\\d{4}[-/.]\\d{1,2}[-/.]\\d{1,2}|\\d{1,2}[-/.]\\d{1,2}[-/.]\\d{2,4}|\\d{1,2}(?:er)?\\s+${MONTHS}\\.?\\s+\\d{4}|${MONTHS}\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s+\\d{4})`;
const DOB_LABEL = `(?:${ci("D.O.B")}\\.?|${ci("DOB")}|${anyOf(["date of birth", "birth date", "birthdate", "date de naissance", "born on", "born"])}|${ci("n")}[ée](?:e|\\(e\\))?\\s+${ci("le")})`;
const DOB = new RegExp(`${NB}(${DOB_LABEL})(\\s*[:\\-]?\\s*)(${DATE_VALUE})`, "gu");

// Spans that must never be touched: UUIDs, job/invoice reference codes, ISO dates/times, money.
const PROTECT = new RegExp(
  [
    "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}",
    `${NB}[A-Z]{1,6}(?:-\\d{2,12})+(?!\\d)`,
    "\\d{4}-\\d{2}-\\d{2}(?:[T ]\\d{2}:\\d{2}(?::\\d{2}(?:\\.\\d{1,9})?)?(?:Z|[+-]\\d{2}:?\\d{2})?)?",
    "\\$\\s?\\d{1,3}(?:[ ,.\\u00a0]\\d{3})*(?:[.,]\\d{1,2})?(?!\\d)",
    `${NB}\\d{1,3}(?:[ \\u00a0.]\\d{3})*(?:,\\d{1,2})?\\s?\\$`
  ].join("|"),
  "gu"
);
// Protected spans are swapped for \uF8FF + one private-use character + \uF8FF: no digits, no letters.
const SENTINEL = /\uF8FF([\uE000-\uF8FE])\uF8FF/g;

const BANK_LABEL = anyOf([
  "bank account", "account number", "account no", "account", "acct", "compte bancaire", "numéro de compte", "numero de compte",
  "no de compte", "compte", "folio", "transit number", "transit", "institution number", "institution", "routing number", "routing", "iban"
]);
const BANK_LABELLED = new RegExp(
  `${NB}(${BANK_LABEL})(\\s*(?:${anyOf(["number", "numéro", "numero", "no", "n°", "nº"])}\\.?)?\\s*[:#]?\\s*)(\\d(?:[\\d -]{1,30}\\d))${NA}`,
  "gu"
);
const CHEQUE_LINE = new RegExp(`${NB}\\d{5}[-\\s]\\d{3}[-\\s]\\d{5,12}${NA}`, "gu");
const IBAN = new RegExp(`${NB}[A-Z]{2}\\d{2}(?:\\s?[A-Z0-9]{4}){3,7}(?:\\s?[A-Z0-9]{1,3})?${NA}`, "gu");

const CARD = /(?<![\d-])\d(?:[ -]?\d){12,18}(?![\d])/g;

const SIN_LABELLED = new RegExp(
  `${NB}(${anyOf(["SIN", "NAS", "social insurance number", "social insurance", "numéro d'assurance sociale", "assurance sociale"])})(\\s*(?:${anyOf(["number", "no", "numéro"])}\\.?)?\\s*[:#]?\\s*)(\\d{3}[ -]?\\d{3}[ -]?\\d{3})(?!\\d)`,
  "gu"
);
const SIN = /(?<![\d.,-])\d{3}([ -]?)\d{3}\1\d{3}(?![\d]|[.,]\d)/g;

const PHONE = new RegExp(
  `(?<![\\p{L}\\p{N}_+])(?:\\+?1[\\s.-]?)?\\(?[2-9]\\d{2}\\)?[\\s.-]?[2-9]\\d{2}[\\s.-]?\\d{4}(?:\\s*(?:${anyOf(["ext", "poste", "x"])})\\.?\\s*\\d{1,5})?(?!\\d)`,
  "gu"
);

const POSTAL = new RegExp(`${NB}[ABCEGHJ-NPRSTVXYabceghj-nprstvxy]\\d[A-Za-z][ -]?\\d[A-Za-z]\\d${NA}`, "gu");

// Street addresses.
const UNIT = `(?:${anyOf(["apt", "appt", "app", "appartement", "apartment", "unité", "unite", "unit", "suite", "bureau", "local"])}\\.?|#)\\s*\\d+[A-Za-z]?`;
const CIVIC = `\\d{1,6}[A-Za-z]?(?:-\\d{1,6}[A-Za-z]?)?`;
const FR_TYPES = anyOf([
  "boulevard", "boul", "blvd", "bd", "avenue", "av", "rue", "chemin", "ch", "route", "rte", "place", "pl", "rang", "montée", "montee",
  "côte", "cote", "impasse", "allée", "allee", "croissant", "promenade", "terrasse", "carré", "carre", "autoroute"
]);
const NAME_WORD = "[\\p{Lu}\\p{N}][\\p{L}\\p{N}'’.-]*";
const CONNECTOR = `(?:${anyOf(["de", "du", "des", "la", "le", "les", "l'", "d'", "l’", "d’", "st", "ste", "saint", "sainte"])})`;
// After a French street word the first name word may be lower case ("123 rue principale").
const FR_NAME = `(?:${CONNECTOR}\\s*)*[\\p{L}\\p{N}][\\p{L}\\p{N}'’.-]*(?:\\s+(?:${CONNECTOR}\\s*)*${NAME_WORD}){0,3}`;
const DIRECTION = `(?:\\s+${anyOf(["est", "ouest", "nord", "sud", "east", "west", "north", "south"])}${NA}|\\s+[NSEWO]\\.?${NA})?`;
const EN_TYPES = anyOf([
  "street", "st", "avenue", "ave", "road", "rd", "boulevard", "blvd", "drive", "dr", "way", "court", "ct", "lane", "ln",
  "crescent", "cres", "place", "pl", "terrace", "highway", "hwy", "circle", "parkway", "pkwy"
]);
const TRAILING_UNIT = `(?:,?\\s*${UNIT})?`;
const LEADING_UNIT = `(?:${UNIT}\\s*[-,]\\s*)?`;
const ADDRESS_FR = new RegExp(`${NB}${LEADING_UNIT}${CIVIC},?\\s+${FR_TYPES}\\.?\\s+${FR_NAME}${DIRECTION}${TRAILING_UNIT}`, "gu");
// English puts the name first. Capitalized names may end in any street word; a lower-case name only
// counts before an unambiguous one, so "a 30 minute drive" or "2 PM" style text is left alone.
const LOWER_WORD = "[\\p{Ll}][\\p{L}'’.-]*";
const EN_PLAIN_TYPES = anyOf(["street", "avenue", "ave", "boulevard", "blvd"]);
const ADDRESS_EN = new RegExp(
  `${NB}${LEADING_UNIT}${CIVIC}\\s+(?:[NSEW]\\.?\\s+)?(?:${NAME_WORD}(?:\\s+${NAME_WORD}){0,3}\\s+${EN_TYPES}|${LOWER_WORD}(?:\\s+${LOWER_WORD})?\\s+${EN_PLAIN_TYPES})\\.?${NA}${DIRECTION}${TRAILING_UNIT}`,
  "gu"
);

// A French street named with no street word ("4500 de Maisonneuve Ouest apt 12"): only counted when a
// direction or a unit follows, so "2 de Laval" style text is left alone.
const ADDRESS_FR_NO_TYPE = new RegExp(
  `${NB}${LEADING_UNIT}${CIVIC},?\\s+${anyOf(["de", "du", "des"])}\\s+\\p{Lu}[\\p{L}'’.-]+(?:\\s+\\p{Lu}[\\p{L}'’.-]+){0,2}(?:\\s+${anyOf(["est", "ouest", "nord", "sud"])}${NA}(?:,?\\s*${UNIT})?|,?\\s*${UNIT})`,
  "gu"
);

// ── health ───────────────────────────────────────────────────────────────────
// Words that make a sentence personal health information. A trailing "*" allows any word ending
// ("pregnan*" -> pregnant, pregnancy). Latin words must start and end on a word edge.
const HEALTH_WORDS_LATIN = [
  // English
  "pregnan*", "miscarriage*", "maternity leave", "disabilit*", "disabled", "handicap*", "diabet*", "epilep*", "seizure*",
  "cancer*", "chemo*", "HIV", "hepatitis", "depression", "depressed", "anxiety", "panic attack*", "bipolar", "schizophren*",
  "ADHD", "autis*", "PTSD", "mental health", "mental illness", "illness*", "ill", "sick*", "diagnos*", "medical condition*",
  "health condition*", "health issue*", "health problem*", "medical note*", "medical certificate*", "medical leave",
  "medical appointment*", "medical reason*", "medical history", "medical record*", "medication*", "my medicine*",
  "prescri*", "doctor's note*", "doctor’s note*", "doctors note*", "doctor note*", "my doctor", "injur*", "sprain*",
  "fracture*", "concussion*", "surgery", "surgeries", "hospitali*", "asthma*", "allergy", "allergies", "allergic",
  "hernia*", "back pain", "migraine*", "covid*", "therap*", "psychiatr*", "wheelchair*", "deaf", "hard of hearing",
  "physio*", "burnout", "burn-out", "WSIB", "workers' comp*", "workers’ comp*",
  // French
  "enceinte", "grossesse*", "fausse couche", "fausses couches", "congé de maternité", "congé maternité", "invalidit*",
  "diabète*", "épilep*", "chimio*", "VIH", "sida", "hépatite*", "déprim*", "anxiété", "trouble anxieux", "bipolaire",
  "schizophr*", "TDAH", "santé mentale", "maladie*", "malade*", "médicament*", "medicament*", "ordonnance*",
  "billet médical", "billet medical", "billet du médecin", "billet de médecin", "certificat médical", "certificat medical",
  "arrêt maladie", "arrêt de maladie", "arrêt de travail", "congé maladie", "congé de maladie", "blessure*", "blessé*",
  "entorse*", "commotion*", "chirurgi*", "opéré", "opérée", "asthm*", "allergie*", "allergique*", "hernie*", "mal de dos",
  "thérapi*", "fauteuil roulant", "sourd", "sourde", "mon médecin", "ma médecin", "rendez-vous médical",
  "épuisement professionnel"
] as const;
// Arabic words take prefixes (ال، و، ب) and suffixes, so they match anywhere in a word.
const HEALTH_WORDS_ARABIC = [
  "(?<!م)مرض", "مريض", "أنا حامل", "انا حامل", "حامل في", "الحمل", "إجهاض", "اجهاض", "إعاقة", "اعاقة", "معاق", "دواء", "أدوية",
  "ادوية", "علاج", "تشخيص", "سكري", "صرع", "سرطان", "اكتئاب", "قلق نفسي", "إصابة", "اصابة", "مصاب", "كسر في", "شهادة طبية",
  "تقرير طبي", "إجازة مرضية", "اجازة مرضية", "حساسية", "ربو", "ضغط الدم", "جراحة", "عملية جراحية", "طبيبي", "الطبيب",
  "نقص المناعة", "الإيدز", "كورونا", "كوفيد"
] as const;
const latinWord = (w: string) => (w.endsWith("*") ? `${ci(w.slice(0, -1))}[\\p{L}'’-]*` : ci(w));
const HEALTH = new RegExp(
  `${NB}(?:${HEALTH_WORDS_LATIN.map(latinWord).join("|")})${NA}|${HEALTH_WORDS_ARABIC.join("|")}`,
  "gu"
);
// Work skills and safety words that name health without being anyone's health. Blanked before the
// check so a care worker's "medication reminders" or a "first aid" card survives.
const HEALTH_EXEMPT = new RegExp(
  [
    anyOf(["first aid", "premiers soins", "premiers secours", "health and safety", "santé et sécurité", "sante et securite"]),
    `${anyOf(["medication", "medications"])}\\s+${anyOf(["reminder", "reminders", "administration", "distribution", "management", "pass", "rounds"])}`,
    `${anyOf(["administer", "administers", "administered", "administering", "dispense", "dispensed", "dispensing", "distribute", "distributed", "distributing", "give", "gave", "giving"])}\\s+(?:${anyOf(["the", "of"])}\\s+)?${anyOf(["medication", "medications"])}`,
    `${anyOf(["administration", "distribution", "rappel", "rappels", "gestion"])}\\s+${anyOf(["des", "de", "du"])}\\s+${anyOf(["médicaments", "médicament", "medicaments", "medicament"])}`
  ].map((p) => `${NB}${p}${NA}`).join("|"),
  "gu"
);
const SENTENCE_END = /[.!?؟;\n]/;

/** True when the text names personal health information (same rule the filter masks by). */
export function containsHealthDetail(text: string): boolean {
  if (!text) return false;
  const blanked = text.replace(HEALTH_EXEMPT, (m) => " ".repeat(m.length));
  HEALTH.lastIndex = 0;
  const found = HEALTH.test(blanked);
  HEALTH.lastIndex = 0;
  return found;
}

/** Replaces every sentence that names personal health information by one placeholder. */
function maskHealthSentences(text: string, hit: () => string): string {
  const blanked = text.replace(HEALTH_EXEMPT, (m) => " ".repeat(m.length));
  const ranges: [number, number][] = [];
  for (const m of blanked.matchAll(HEALTH)) {
    const at = m.index ?? 0;
    let start = at;
    while (start > 0 && !SENTENCE_END.test(text[start - 1]!)) start--;
    let end = at + m[0].length;
    while (end < text.length && !SENTENCE_END.test(text[end]!)) end++;
    while (start < at && /\s/.test(text[start]!)) start++;
    const last = ranges[ranges.length - 1];
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else ranges.push([start, end]);
  }
  if (!ranges.length) return text;
  let out = "";
  let from = 0;
  for (const [start, end] of ranges) {
    out += text.slice(from, start) + hit();
    from = end;
  }
  return out + text.slice(from);
}

// RAMQ health card: four letters and eight digits ("TREM 9001 0112", "trem90010112"). With a space
// after the letters they must be capitals, so "card 4111 1111 ..." is left to the card check; a run
// that goes on with more digits (a card, an IBAN) is never a health card.
const HEALTH_CARD = new RegExp(
  `(?<![\\p{L}\\p{N}_]|\\d[ -])(?:[A-Za-z]{4}|[A-Z]{4}[ -])\\d{4}[ -]?\\d{4}(?![\\p{L}\\p{N}_]|[ -]\\d)`,
  "gu"
);
// Passport and driver's licence numbers: labelled, one token of 6 to 20 characters with 4+ digits.
const ID_LABEL = anyOf([
  "passport number", "passport no", "passport", "passeport", "numéro de passeport", "driver's licence", "driver’s licence",
  "driver's license", "driver’s license", "drivers licence", "drivers license", "licence number", "license number",
  "licence no", "license no", "permis de conduire", "numéro de permis", "numero de permis", "no de permis"
]);
const ID_LABELLED = new RegExp(
  `${NB}(${ID_LABEL}|جواز السفر|رقم الجواز|رخصة القيادة|رقم الرخصة)(\\s*(?:${anyOf(["number", "numéro", "numero", "no", "n°", "nº"])}\\.?)?\\s*[:#]?\\s*)([A-Za-z0-9-]{6,20})${NA}`,
  "gu"
);
// Québec driver's licence: one letter and twelve digits ("T1234-567890-12").
const QC_LICENCE = new RegExp(`${NB}[A-Za-z]\\d{4}[ -]?\\d{6}[ -]?\\d{2}${NA}`, "gu");

// ── masking ──────────────────────────────────────────────────────────────────
/** Replace personal data in free text by placeholders. Idempotent: masking twice changes nothing more. */
export function maskPersonalData(text: string): MaskResult {
  const masked = emptyCounts();
  if (!text) return { text, masked };
  const hit = (kind: MaskKind) => {
    masked[kind] += 1;
    return MASK_PLACEHOLDER[kind];
  };

  // U+F8FF is our sentinel delimiter, so it never survives from the input.
  let out = maskHealthSentences(text.replace(/\uF8FF/g, ""), () => hit("health")).replace(EMAIL, () => hit("email"));
  out = out.replace(ID_LABELLED, (m, label: string, sep: string, num: string) =>
    onlyDigits(num).length >= 4 ? `${label}${sep}${hit("idNumber")}` : m
  );
  out = out.replace(QC_LICENCE, () => hit("idNumber"));
  out = out.replace(HEALTH_CARD, () => hit("healthCard"));
  out = out.replace(DOB, (_m, label: string, sep: string) => `${label}${sep}${hit("dateOfBirth")}`);

  const kept: string[] = [];
  out = out.replace(PROTECT, (m) => {
    if (kept.length >= 0x18ff) return m;
    kept.push(m);
    return `\uF8FF${String.fromCharCode(0xe000 + kept.length - 1)}\uF8FF`;
  });

  out = out.replace(SIN_LABELLED, (_m, label: string, sep: string) => `${label}${sep}${hit("sin")}`);
  out = out.replace(BANK_LABELLED, (m, label: string, sep: string, num: string) =>
    onlyDigits(num).length >= 3 ? `${label}${sep}${hit("bankAccount")}` : m
  );
  out = out.replace(CHEQUE_LINE, () => hit("bankAccount"));
  out = out.replace(IBAN, () => hit("bankAccount"));
  out = out.replace(CARD, (m) => {
    const digits = onlyDigits(m);
    return digits.length >= 13 && digits.length <= 19 && luhnValid(digits) ? hit("cardNumber") : m;
  });
  out = out.replace(SIN, (m) => (luhnValid(onlyDigits(m)) && !/^0/.test(m) ? hit("sin") : m));
  out = out.replace(PHONE, () => hit("phone"));
  out = out.replace(POSTAL, () => hit("postalCode"));
  out = out.replace(ADDRESS_FR, () => hit("address"));
  out = out.replace(ADDRESS_FR_NO_TYPE, () => hit("address"));
  out = out.replace(ADDRESS_EN, () => hit("address"));

  out = out.replace(SENTINEL, (_m, ch: string) => kept[ch.charCodeAt(0) - 0xe000] ?? "");
  return { text: out, masked };
}

// Keys whose values are personal data: dropped, not masked. Matched on the lower-cased key with
// separators removed. `includes` entries also catch e.g. workEmail, homePhone, addressLine1.
const DROP_KEY_INCLUDES = [
  "email", "phone", "mobile", "address", "street", "postalcode", "postcode", "zipcode", "dateofbirth", "birthdate",
  "bankaccount", "accountnumber", "iban", "transit", "institution", "cardnumber", "password", "token", "secret",
  "legalname", "lastname", "familyname", "surname", "fullname", "socialinsurance",
  // Health and identity documents (launch step 6): dropped outright, never masked.
  "health", "medical", "diagnos", "disabilit", "pregnan", "medication", "sicknote", "illness", "injur", "ramq",
  "passport", "licencenumber", "licensenumber", "driverslicen"
] as const;
const DROP_KEY_EXACT: ReadonlySet<string> = new Set(["sin", "nas", "ssn", "dob", "zip", "pan", "cvv", "cvc"]);

export function isPersonalDataKey(key: string): boolean {
  const k = key.toLowerCase().replace(/[^a-z0-9]/g, "");
  return DROP_KEY_EXACT.has(k) || DROP_KEY_INCLUDES.some((part) => k.includes(part));
}

export type MaskForAiResult<T = unknown> = Readonly<{ value: T; masked: MaskCounts; droppedKeys: number }>;

/** Deep-walk a value: mask every string and drop keys that name personal data. Dates become ISO strings. */
export function maskForAi<T = unknown>(value: unknown): MaskForAiResult<T> {
  const masked = emptyCounts();
  let droppedKeys = 0;
  const seen = new WeakSet<object>();
  const walk = (v: unknown): unknown => {
    if (typeof v === "string") {
      const r = maskPersonalData(v);
      for (const kind of Object.keys(r.masked) as MaskKind[]) masked[kind] += r.masked[kind];
      return r.text;
    }
    if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.toISOString();
    if (typeof v === "bigint") return Number(v);
    if (v === null || typeof v !== "object") return v;
    if (seen.has(v)) return null;
    seen.add(v);
    if (Array.isArray(v)) return v.map(walk);
    const out: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(v)) {
      if (isPersonalDataKey(key)) {
        droppedKeys += 1;
        continue;
      }
      if (inner === undefined) continue;
      out[key] = walk(inner);
    }
    return out;
  };
  return { value: walk(value) as T, masked, droppedKeys };
}

/** Masks a string that may hold JSON: parsed and deep-walked when it is JSON, masked as text otherwise. */
export function maskTextOrJson(text: string): Readonly<{ text: string; masked: MaskCounts; droppedKeys: number }> {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const r = maskForAi(JSON.parse(trimmed));
      return { text: JSON.stringify(r.value), masked: r.masked, droppedKeys: r.droppedKeys };
    } catch {
      // Not JSON after all: fall through and treat it as text.
    }
  }
  const r = maskPersonalData(text);
  return { text: r.text, masked: r.masked, droppedKeys: 0 };
}

export function addCounts(...all: readonly MaskCounts[]): MaskCounts {
  const total = emptyCounts();
  for (const counts of all) for (const kind of Object.keys(total) as MaskKind[]) total[kind] += counts[kind];
  return total;
}

export type PrivacyLogger = Readonly<{ info: (event: string, fields?: Readonly<Record<string, string | number | boolean | null>>) => void }>;

const defaultLogger: PrivacyLogger = createLogger("api");

/** Logs only how many items were masked, per kind. Never a value. */
export function reportMasked(feature: string, masked: MaskCounts, droppedKeys = 0, logger: PrivacyLogger = defaultLogger): void {
  const total = Object.values(masked).reduce((a, b) => a + b, 0);
  const kinds = (Object.keys(masked) as MaskKind[])
    .filter((k) => masked[k] > 0)
    .map((k) => `${k}:${masked[k]}`)
    .join(",");
  // Flat fields only, and no key containing "email": the shared logger drops such keys.
  logger.info("ai.privacy_filter", { feature, maskedTotal: total, maskedKinds: kinds, droppedKeys });
}
