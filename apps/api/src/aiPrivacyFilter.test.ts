import { describe, expect, it, vi } from "vitest";
import { containsHealthDetail, isPersonalDataKey, luhnValid, maskForAi, maskPersonalData, maskTextOrJson, reportMasked, type MaskKind } from "./aiPrivacyFilter";

const mask = (text: string) => maskPersonalData(text).text;

describe("maskPersonalData: what it masks", () => {
  it.each<[string, string, MaskKind]>([
    // emails
    ["write to sam.tremblay+jobs@example.ca please", "write to [email] please", "email"],
    ["Mon courriel: marie_l@courriel.qc.ca", "Mon courriel: [email]", "email"],
    // phones
    ["call me at 514-555-1234", "call me at [phone]", "phone"],
    ["appelez-moi au (438) 555-0199", "appelez-moi au [phone]", "phone"],
    ["my number is +1 514 555 1234.", "my number is [phone].", "phone"],
    ["1-800-555-0199 any time", "[phone] any time", "phone"],
    ["tél. 514.555.1234", "tél. [phone]", "phone"],
    ["text 5145551234", "text [phone]", "phone"],
    ["bureau 514 555-1234 poste 22 svp", "bureau [phone] svp", "phone"],
    ["+15145551234", "[phone]", "phone"],
    // postal codes
    ["code postal H2X 1Y4", "code postal [postal code]", "postalCode"],
    ["Laval, QC h7n-5k2", "Laval, QC [postal code]", "postalCode"],
    ["postal M5V3L9.", "postal [postal code].", "postalCode"],
    // French addresses
    ["J'habite au 1234 rue Sainte-Catherine Ouest, Montréal", "J'habite au [address], Montréal", "address"],
    ["55, boul. René-Lévesque Est", "[address]", "address"],
    ["3000 chemin de la Côte-Sainte-Catherine", "[address]", "address"],
    ["12 avenue du Parc app. 4", "[address]", "address"],
    ["450 rue principale, Granby", "[address], Granby", "address"],
    ["apt 3 - 220 rue de l'Église", "[address]", "address"],
    ["8 place Ville-Marie", "[address]", "address"],
    ["2200 route 117 Nord", "[address]", "address"],
    // English addresses
    ["I live at 123 Main Street, Toronto", "I live at [address], Toronto", "address"],
    ["45 King St W unit 1203", "[address]", "address"],
    ["10 Oak Ave.", "[address]", "address"],
    ["77 Maple Leaf Dr", "[address]", "address"],
    ["900 Bay Rd", "[address]", "address"],
    ["12 Elm Court", "[address]", "address"],
    ["98 queen street", "[address]", "address"],
    // SIN
    ["SIN 046 454 286", "SIN [SIN]", "sin"],
    ["mon NAS: 046-454-286", "mon NAS: [SIN]", "sin"],
    ["here it is 130692544 ok", "here it is [SIN] ok", "sin"],
    // cards
    ["card 4111 1111 1111 1111 exp", "card [card number] exp", "cardNumber"],
    ["5555-5555-5555-4444", "[card number]", "cardNumber"],
    ["378282246310005", "[card number]", "cardNumber"],
    // bank
    ["transit 12345 institution 003 account 1234567", "transit [bank account] institution [bank account] account [bank account]", "bankAccount"],
    ["numéro de compte: 98765432", "numéro de compte: [bank account]", "bankAccount"],
    ["Compte 5012345", "Compte [bank account]", "bankAccount"],
    ["cheque line 12345-003-1234567", "cheque line [bank account]", "bankAccount"],
    ["IBAN GB82 WEST 1234 5698 7654 32", "IBAN [bank account]", "bankAccount"],
    // labelled dates of birth
    ["DOB: 1990-05-12", "DOB: [date of birth]", "dateOfBirth"],
    ["date of birth 12/05/1990", "date of birth [date of birth]", "dateOfBirth"],
    ["Date de naissance : 12 mai 1990", "Date de naissance : [date of birth]", "dateOfBirth"],
    ["née le 3 février 1988", "née le [date of birth]", "dateOfBirth"],
    ["né le 1er janvier 2000", "né le [date of birth]", "dateOfBirth"],
    ["born March 4, 1985", "born [date of birth]", "dateOfBirth"]
  ])("%s", (input, expected, kind) => {
    const result = maskPersonalData(input);
    expect(result.text).toBe(expected);
    expect(result.masked[kind]).toBeGreaterThan(0);
  });

  it("counts every item and masks several kinds at once", () => {
    const r = maskPersonalData("Sam, sam@x.ca, 514-555-1234, 438-555-0199, H2X 1Y4, SIN 046 454 286");
    expect(r.text).toBe("Sam, [email], [phone], [phone], [postal code], SIN [SIN]");
    expect(r.masked).toMatchObject({ email: 1, phone: 2, postalCode: 1, sin: 1, address: 0, cardNumber: 0 });
  });
});

describe("maskPersonalData: what it leaves alone", () => {
  it.each([
    "Your pay was $25.50 for the shift",
    "Net pay 1 234,56 $ this period",
    "gross $1,234.56, deductions $210.10",
    "25,50 $ de pourboires",
    "Shift from 8:00 to 16:30",
    "Quart de 14 h 30 à 22 h",
    "I worked 3 shifts and 24 hours",
    "Since 2024 I worked 2026 hours total",
    "My job reference JR-2026-000123 and invoice INV-000456",
    "Order ORD-2026-001234 status confirmed",
    "Conversation 550e8400-e29b-41d4-a716-446655440000",
    "id 12345678-1234-4123-8123-123456789012",
    "scheduledStart 2026-11-08T14:00:00.000Z",
    "On 2026-11-08 the shift was cancelled",
    "Le quart du 12 mai 2026 est confirmé",
    "a 30 minute drive away",
    "I need 2 shifts next week at 9 am",
    "I have 5 years of experience",
    "account 12 shifts", // too short to be a bank number
    "123 456 789", // nine digits failing the Luhn check
    "Room 204, building B",
    "Pay statement net: 812.40 CAD",
    "Top 10 tips for cooks",
    "Shift role: Cook, 2 workers, starts 2026-11-09"
  ])("%s", (input) => {
    const r = maskPersonalData(input);
    expect(r.text).toBe(input);
    expect(Object.values(r.masked).every((n) => n === 0)).toBe(true);
  });

  it("keeps the useful wording around masked data", () => {
    expect(mask("My pay of $812.40 for the Cook shift is late, call 514-555-1234")).toBe(
      "My pay of $812.40 for the Cook shift is late, call [phone]"
    );
  });
});

describe("maskPersonalData: idempotent", () => {
  it.each([
    "sam@x.ca 514-555-1234 H2X 1Y4 1234 rue Sainte-Catherine Ouest SIN 046 454 286",
    "card 4111 1111 1111 1111, transit 12345, DOB: 1990-05-12, 123 Main Street",
    "Pay $25.50 at 8:00, JR-2026-000123"
  ])("masking twice equals masking once: %s", (input) => {
    const once = mask(input);
    const twice = maskPersonalData(once);
    expect(twice.text).toBe(once);
    expect(Object.values(twice.masked).every((n) => n === 0)).toBe(true);
  });

  it("does not let input fake the internal sentinel", () => {
    expect(mask("a\uF8FF\uE000\uF8FFb 514-555-1234")).toBe("a\uE000b [phone]");
  });
});

describe("luhnValid", () => {
  it("accepts and rejects", () => {
    expect(luhnValid("046454286")).toBe(true);
    expect(luhnValid("4111111111111111")).toBe(true);
    expect(luhnValid("123456789")).toBe(false);
    expect(luhnValid("")).toBe(false);
  });
});

describe("maskForAi: deep walk", () => {
  it("drops personal keys at any depth and masks every string", () => {
    const input = {
      firstName: "Sam",
      lastName: "Tremblay",
      fullName: "Sam Tremblay",
      legalName: "Samuel Tremblay",
      email: "sam@x.ca",
      emailNormalized: "sam@x.ca",
      phone: "514-555-1234",
      mobilePhone: "438-555-0199",
      address: "1234 rue X",
      exactAddress: "1234 rue Y",
      postalCode: "H2X 1Y4",
      sin: "046454286",
      dateOfBirth: "1990-05-12",
      bankAccount: "1234567",
      iban: "GB82WEST12345698765432",
      transitNumber: "12345",
      institutionNumber: "003",
      cardNumber: "4111111111111111",
      password: "hunter2",
      accessToken: "abc",
      shifts: [
        { title: "Cook", status: "confirmed", start: new Date("2026-11-09T13:00:00.000Z"), note: "call 514-555-1234", street: "Main" },
        { title: "Dishwasher", pay: { net: 812.4, currency: "CAD" } }
      ],
      business: "ok",
      using: "kept"
    };
    const r = maskForAi<Record<string, unknown>>(input);
    expect(r.value).toEqual({
      firstName: "Sam",
      shifts: [
        { title: "Cook", status: "confirmed", start: "2026-11-09T13:00:00.000Z", note: "call [phone]" },
        { title: "Dishwasher", pay: { net: 812.4, currency: "CAD" } }
      ],
      business: "ok",
      using: "kept"
    });
    expect(r.droppedKeys).toBe(20);
    expect(r.masked.phone).toBe(1);
  });

  it("is idempotent", () => {
    const once = maskForAi({ a: ["sam@x.ca", { b: "H2X 1Y4" }], email: "x" }).value;
    expect(maskForAi(once).value).toEqual(once);
  });

  it("handles primitives, null, bigint and cycles", () => {
    expect(maskForAi("sam@x.ca").value).toBe("[email]");
    expect(maskForAi(42).value).toBe(42);
    expect(maskForAi(null).value).toBeNull();
    expect(maskForAi(BigInt(1250)).value).toBe(1250);
    const loop: Record<string, unknown> = { a: 1 };
    loop.self = loop;
    expect(maskForAi(loop).value).toEqual({ a: 1, self: null });
  });

  it.each([
    ["email", true], ["workEmail", true], ["phone_number", true], ["addressLine1", true], ["postal_code", true],
    ["SIN", true], ["nas", true], ["dob", true], ["refreshToken", true], ["surname", true],
    ["healthNotes", true], ["medicalCondition", true], ["diagnosis", true], ["disability", true], ["pregnancy", true],
    ["medications", true], ["ramqNumber", true], ["passportNumber", true], ["driversLicenceNumber", true],
    ["status", false], ["business", false], ["title", false], ["firstName", false], ["displayName", false], ["topic", false]
  ])("isPersonalDataKey(%s) = %s", (key, expected) => {
    expect(isPersonalDataKey(key)).toBe(expected);
  });
});

describe("maskTextOrJson", () => {
  it("walks JSON and masks plain text", () => {
    expect(JSON.parse(maskTextOrJson('{"email":"a@b.ca","note":"514-555-1234"}').text)).toEqual({ note: "[phone]" });
    expect(maskTextOrJson("No worker profile. a@b.ca").text).toBe("No worker profile. [email]");
    expect(maskTextOrJson("{not json a@b.ca").text).toBe("{not json [email]");
  });
});

describe("reportMasked", () => {
  it("logs only counts, never values", () => {
    const info = vi.fn();
    const r = maskPersonalData("sam@x.ca 514-555-1234");
    reportMasked("contact_chat", r.masked, 3, { info });
    expect(info).toHaveBeenCalledWith("ai.privacy_filter", { feature: "contact_chat", maskedTotal: 2, maskedKinds: "email:1,phone:1", droppedKeys: 3 });
    expect(JSON.stringify(info.mock.calls)).not.toContain("sam@x.ca");
    expect(JSON.stringify(info.mock.calls)).not.toContain("555");
  });
});

describe("maskPersonalData: health (launch step 6)", () => {
  it.each([
    // English
    ["Hi. I have diabetes and epilepsy. Can I work Friday?", "Hi. [health detail]. Can I work Friday?"],
    ["My doctor's note says I need rest! See you Monday.", "[health detail]! See you Monday."],
    ["I am pregnant, so no heavy lifting", "[health detail]"],
    ["I take medication for anxiety\nShift is fine.", "[health detail]\nShift is fine."],
    ["I was sick yesterday; I am back today", "[health detail]; I am back today"],
    ["He has a disability and uses a wheelchair.", "[health detail]."],
    ["Off work after surgery. Back on the 12th.", "[health detail]. Back on the 12th."],
    // French
    ["Je suis enceinte de 5 mois. Est-ce que je peux travailler?", "[health detail]. Est-ce que je peux travailler?"],
    ["J'ai un billet médical pour lundi; je reviens mardi.", "[health detail]; je reviens mardi."],
    ["Je suis en arrêt maladie.", "[health detail]."],
    ["Mon médecin dit que j'ai une entorse.", "[health detail]."],
    ["Je prends des médicaments pour la dépression.", "[health detail]."],
    // Arabic
    ["أنا حامل ولا أستطيع العمل. هل يمكنني تغيير الوردية؟", "[health detail]. هل يمكنني تغيير الوردية؟"],
    ["عندي شهادة طبية لهذا الأسبوع.", "[health detail]."],
    ["أعاني من مرض السكري", "[health detail]"]
  ])("%s", (input, expected) => {
    const r = maskPersonalData(input);
    expect(r.text).toBe(expected);
    expect(r.masked.health).toBeGreaterThan(0);
    expect(containsHealthDetail(r.text)).toBe(false);
  });

  it.each([
    "Skills: Medication reminders, Personal care, RCR / First aid, Dementia care",
    "Administered medications to 20 residents.",
    "Distribution des médicaments aux résidents",
    "Health and safety training, santé et sécurité au travail",
    "Healthcare / PSW, Vital signs, Infection control",
    "I'll be there at 9 for the Cook shift",
    "Infirmier auxiliaire (OIIAQ), PAB",
    "مساعد ممرض في دار رعاية"
  ])("keeps work skills and ordinary text: %s", (input) => {
    const r = maskPersonalData(input);
    expect(r.text).toBe(input);
    expect(r.masked.health).toBe(0);
  });

  it("masks health-card, passport and licence numbers", () => {
    expect(mask("my RAMQ card is BOUJ 8001 0112 thanks")).toBe("my RAMQ card is [health card] thanks");
    expect(mask("carte soleil trem90010112")).toBe("carte soleil [health card]");
    expect(mask("passport AB123456")).toBe("passport [ID number]");
    expect(mask("Numéro de passeport : GA654321")).toBe("Numéro de passeport : [ID number]");
    expect(mask("driver's licence: T1234-567890-12")).toBe("driver's licence: [ID number]");
    expect(mask("permis T1234 567890 12")).toBe("permis [ID number]");
    expect(mask("permis de conduire classe 5")).toBe("permis de conduire classe 5");
    expect(mask("Class 5 licence, Safe driving record")).toBe("Class 5 licence, Safe driving record");
  });

  it("masks the audit G1 probe strings", () => {
    const health = maskPersonalData("I have diabetes and epilepsy, my doctor note says HIV positive, I am pregnant");
    expect(health.text).toBe("[health detail]");
    expect(health.masked.health).toBe(1);
    for (const word of ["diabetes", "epilepsy", "HIV", "pregnant", "doctor"]) expect(health.text).not.toContain(word);

    const ids = maskPersonalData("my RAMQ health card is BOUJ 8001 0112 and passport AB123456");
    expect(ids.text).toBe("my RAMQ health card is [health card] and passport [ID number]");
    expect(ids.masked.healthCard).toBe(1);
    expect(ids.masked.idNumber).toBe(1);
  });

  it("masks a passport number with no label, and a Québec licence with spaces or dashes", () => {
    expect(mask("my number is AB123456 ok")).toBe("my number is [ID number] ok");
    expect(mask("T1234 567890 12")).toBe("[ID number]");
    expect(mask("t1234-567890-12")).toBe("[ID number]");
  });

  it.each([
    "First aid certificate required (RCR / CPR)",
    "Certificat de premiers soins à jour",
    "Job JR-2026-000123 pays $22.50 per hour",
    "Shift 2026-11-09 from 7 AM to 3 PM, 8 hours",
    "Health and safety orientation on day one",
    "Class 5 driver's licence required"
  ])("does not over-match ordinary job text: %s", (input) => {
    const r = maskPersonalData(input);
    expect(r.text).toBe(input);
    expect(containsHealthDetail(input)).toBe(false);
  });

  it("masks a French street named with no street word when a direction or unit follows", () => {
    expect(mask("J'habite au 4500 de Maisonneuve Ouest apt 12, Montréal")).toBe("J'habite au [address], Montréal");
    expect(mask("1200 de Bleury, bureau 300")).toBe("[address]");
    expect(mask("J'ai 2 de Laval qui viennent")).toBe("J'ai 2 de Laval qui viennent");
  });

  it("is idempotent and drops health keys in a deep walk", () => {
    const once = mask("I am pregnant. Call 514-555-1234. RAMQ BOUJ 8001 0112");
    expect(maskPersonalData(once).text).toBe(once);
    const r = maskForAi<Record<string, unknown>>({ title: "Cook", medicalNotes: "asthma", note: "My asthma is bad today." });
    expect(r.value).toEqual({ title: "Cook", note: "[health detail]." });
    expect(r.droppedKeys).toBe(1);
  });
});
