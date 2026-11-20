import { describe, expect, it } from "vitest";
import {
  CERTIFICATE_LABELS,
  REQUIRED_CERTIFICATE_KEYS,
  certificateDocumentTypes,
  certificateKeyForDocumentType,
  certificateKeysFromReasons,
  heldCertificateKeys,
  missingCertificateReason,
  missingCertificates,
  missingCertificatesNotice,
  parseRequiredCertificates,
  storedRequiredCertificates
} from "./requiredCertificates";

const START = new Date("2026-12-01T13:00:00.000Z");

describe("required certificates chosen by the employer", () => {
  it("reads a clean list, in catalogue order, and none when nothing is sent", () => {
    expect(parseRequiredCertificates(undefined)).toEqual({ keys: [], other: null });
    expect(parseRequiredCertificates([])).toEqual({ keys: [], other: null });
    expect(parseRequiredCertificates(["forklift", "pab"])).toEqual({ keys: ["pab", "forklift"], other: null });
    expect(parseRequiredCertificates(["other", "whmis"], "  Carte  de serveur ")).toEqual({ keys: ["whmis", "other"], other: "Carte de serveur" });
  });

  it("refuses unknown keys, duplicates, an empty or too-long Other, and Other text without Other", () => {
    expect(parseRequiredCertificates(["pab", "nope"])).toBeNull();
    expect(parseRequiredCertificates(["pab", "pab"])).toBeNull();
    expect(parseRequiredCertificates(["other"])).toBeNull();
    expect(parseRequiredCertificates(["other"], "x".repeat(121))).toBeNull();
    expect(parseRequiredCertificates(["pab"], "something")).toBeNull();
    expect(parseRequiredCertificates("pab")).toBeNull();
  });

  it("keeps a stored Other required even when its text is missing (fail closed)", () => {
    expect(storedRequiredCertificates({ requiredCertificates: ["other", "bogus", "pab"], requiredCertificateOther: null })).toEqual({ keys: ["pab", "other"], other: null });
    expect(storedRequiredCertificates({})).toEqual({ keys: [], other: null });
  });

  it("has a label in English, French and Arabic for every certificate", () => {
    for (const key of REQUIRED_CERTIFICATE_KEYS) {
      expect(CERTIFICATE_LABELS[key].en).toBeTruthy();
      expect(CERTIFICATE_LABELS[key].fr).toBeTruthy();
      expect(CERTIFICATE_LABELS[key].ar).toBeTruthy();
    }
  });

  it("maps document types to certificates (first aid also counts for CPR)", () => {
    expect(certificateKeyForDocumentType("cert_pab")).toBe("pab");
    expect(certificateKeyForDocumentType("first_aid")).toBe("rcr_first_aid");
    expect(certificateKeyForDocumentType("certificate")).toBeNull();
    expect(certificateDocumentTypes()).toContain("cert_driver_class5");
  });
});

describe("does the worker hold the certificate", () => {
  it("counts only staff-accepted documents that are still valid when the job starts", () => {
    const held = heldCertificateKeys(
      [
        { documentType: "cert_pab", status: "accepted", expiresAt: null },
        { documentType: "cert_forklift", status: "submitted", expiresAt: null },
        { documentType: "first_aid", status: "accepted", expiresAt: "2026-11-30T00:00:00.000Z" },
        { documentType: "cert_whmis", status: "accepted", expiresAt: "2027-01-01T00:00:00.000Z" },
        { documentType: "certificate", verifiedCertificateKey: "mapaq_food_handler", status: "accepted", expiresAt: null },
        { documentType: "certificate", verifiedCertificateKey: "other", status: "accepted", expiresAt: null },
        { documentType: "cert_racj_alcohol", status: "rejected", expiresAt: null }
      ],
      START
    );
    expect([...held].sort()).toEqual(["mapaq_food_handler", "pab", "whmis"]);
  });

  it("lists what is missing; Other is always missing (a person checks it)", () => {
    const docs = [{ documentType: "cert_pab", status: "accepted", expiresAt: null }];
    expect(missingCertificates({ keys: [], other: null }, [], START)).toEqual([]);
    expect(missingCertificates({ keys: ["pab"], other: null }, docs, START)).toEqual([]);
    expect(missingCertificates({ keys: ["pab", "rcr_first_aid", "other"], other: "X" }, docs, START)).toEqual(["rcr_first_aid", "other"]);
  });

  it("round-trips reason codes", () => {
    expect(certificateKeysFromReasons([missingCertificateReason("pab"), "already_assigned", "missing_certificate:zzz"])).toEqual(["pab"]);
  });
});

describe("the worker notice", () => {
  it("names the certificate and points to the Documents page in each language", () => {
    expect(missingCertificatesNotice(["pab"], "en")).toBe("This job needs: PAB certificate (orderly / préposé aux bénéficiaires). Add it on your Documents page.");
    expect(missingCertificatesNotice(["pab"], "fr-CA")).toContain("Cet emploi exige : Certificat PAB");
    expect(missingCertificatesNotice(["pab"], "ar")).toContain("صفحة المستندات");
    expect(missingCertificatesNotice(["other"], "en", "Bartender card")).toContain("Bartender card");
    expect(missingCertificatesNotice([], "en")).toBeNull();
  });
});
