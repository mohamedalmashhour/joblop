import { describe, expect, it } from "vitest";
import { formatSerial, certificateTitle, isCertificateKind, greetingEmail, certificateEmail, type Recipient } from "./platformGreetings";

const worker = (language: "en" | "fr"): Recipient => ({ userId: "u1", kind: "worker", name: "Marie", email: "marie@example.com", language });

describe("formatSerial", () => {
  it("formats PREFIX-XXXX-XXXX from bytes, using the unambiguous alphabet", () => {
    const serial = formatSerial("SW", new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]));
    expect(serial).toMatch(/^SW-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(serial).toBe("SW-ABCD-EFGH");
  });
  it("pads when given too few bytes", () => {
    expect(formatSerial("MR", new Uint8Array([0]))).toBe("MR-AXXX-XXXX");
  });
});

describe("certificate kinds", () => {
  it("recognises known kinds and rejects others", () => {
    expect(isCertificateKind("super_worker")).toBe(true);
    expect(isCertificateKind("top_employer")).toBe(true);
    expect(isCertificateKind("nonsense")).toBe(false);
  });
  it("gives bilingual titles", () => {
    expect(certificateTitle("super_worker", "en")).toBe("Super Worker");
    expect(certificateTitle("super_worker", "fr")).toBe("Super Travailleur");
  });
});

describe("email copy", () => {
  it("greets by name and language", () => {
    expect(greetingEmail(worker("en"), "Happy Canada Day", "Thanks!").text).toContain("Hi Marie,");
    expect(greetingEmail(worker("fr"), "Bonne fête", "Merci!").text).toContain("Bonjour Marie,");
    expect(greetingEmail(worker("en"), "Subj", "x").subject).toBe("Subj");
  });
  it("certificate email includes title, serial and optional note", () => {
    const en = certificateEmail(worker("en"), "Super Worker", "SW-ABCD-EFGH", "Great job");
    expect(en.subject).toBe("Your certificate: Super Worker");
    expect(en.text).toContain("SW-ABCD-EFGH");
    expect(en.text).toContain("Great job");
    const fr = certificateEmail(worker("fr"), "Super Travailleur", "SW-1111-2222", null);
    expect(fr.subject).toContain("Votre certificat");
    expect(fr.text).not.toContain("null");
  });
});
