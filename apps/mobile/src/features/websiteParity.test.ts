import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CERTIFICATE_DOCUMENT_TYPES, LEGAL_DOCUMENTS_VERSION } from "@rwos/shared";
import { certificateChipText, certificateNotice, ineligibleKey, interestPanel, requiredCertificateRows } from "./marketplace/jobDetailContent";
import { formatJobPay, formatOpenings } from "./marketplace/marketplaceContent";
import { CERTIFICATE_TYPES, DOCUMENT_TYPES, activeDocuments, allowedFileType, documentStatusKey, documentTypeLabel } from "./documents/documentsContent";
import { buildCvProfile, fallbackText, markdownToPlain, proStatus } from "./cv-builder/cvContent";
import { intakeBody, standingKey } from "./profile/profileContent";
import { isRespondable, offerStatusKey } from "./offers/offersContent";
import { setupCopyFor } from "./worker-onboarding/setupContent";
import { ACCEPTED_LEGAL_VERSION } from "./legal/legalLinkRules";
import { translate } from "../i18n/strings";

const read = (path: string) => readFileSync(join(__dirname, path), "utf8");

describe("job page: same rules as the website", () => {
  const open = { eligible: true, reasons: [] as string[] };

  it("long-term jobs use Apply and show the application's status", () => {
    expect(interestPanel(null, true)).toMatchObject({ kind: "apply", eligible: true });
    expect(interestPanel({ interest: { status: "submitted", employerDecision: null }, lastEmployerDecision: null, eligibility: open }, true)).toEqual({ kind: "applied", shortlisted: false });
    expect(interestPanel({ interest: { status: "shortlisted", employerDecision: "shortlisted" }, lastEmployerDecision: "shortlisted", eligibility: open }, true)).toEqual({ kind: "applied", shortlisted: true });
    expect(interestPanel({ interest: null, lastEmployerDecision: "hired", eligibility: open }, true)).toEqual({ kind: "hired" });
    expect(interestPanel({ interest: null, lastEmployerDecision: "not_selected", eligibility: open }, true)).toMatchObject({ kind: "apply", notSelectedBefore: true });
    // Short-term jobs keep "Express interest".
    expect(interestPanel({ interest: { status: "submitted", employerDecision: null }, lastEmployerDecision: null, eligibility: open }, false)).toEqual({ kind: "interest_submitted" });
    expect(interestPanel({ interest: { status: "offer_created", employerDecision: null }, lastEmployerDecision: null, eligibility: open }, false)).toEqual({ kind: "offer" });
  });

  it("names the missing certificate and sends the worker to Documents (EN / FR / AR)", () => {
    expect(certificateNotice({ missing: ["pab"] }, "en")).toBe("This job needs: PAB certificate (orderly / préposé aux bénéficiaires). Add it on your Documents page.");
    expect(certificateNotice({ reasons: ["missing_certificate:forklift"] }, "fr")).toBe("Cet emploi exige : Carte de cariste (chariot élévateur). Ajoutez-le dans votre page Documents.");
    expect(certificateNotice({ missing: ["whmis"] }, "ar")).toContain("أضِفها في صفحة المستندات");
    expect(certificateNotice({ missing: [] }, "en")).toBeNull();
    const blocked = interestPanel({ interest: null, lastEmployerDecision: null, eligibility: { eligible: false, reasons: ["missing_certificate:pab"] } }, false);
    expect(blocked).toMatchObject({ kind: "apply", eligible: false, certificateBlocked: true });
    expect(ineligibleKey("already_assigned")).toBe("job.inelAlreadyAssigned");
    expect(ineligibleKey("something_new")).toBe("job.inelDefault");
  });

  it("lists each required certificate with whether the worker has it", () => {
    const rows = requiredCertificateRows({ keys: ["pab", "whmis", "other"], other: "Vaccination record" }, ["pab"], "en");
    expect(rows.map((r) => [r.key, r.state])).toEqual([["pab", "missing"], ["whmis", "have"], ["other", "staff"]]);
    expect(rows[2]!.label).toBe("Vaccination record");
    expect(certificateChipText({ keys: ["forklift"], other: null }, "fr")).toBe("Carte de cariste (chariot élévateur)");
    expect(certificateChipText(undefined, "en")).toBeNull();
  });

  it("shows the worker's own hourly pay, or the website's pending line — never $0", () => {
    expect(formatJobPay({ workerRateMinor: 2400, currency: "CAD" }, "en")).toBe("$24.00/h");
    expect(formatJobPay({ workerRateMinor: null, currency: "CAD" }, "en")).toBe("Hourly pay: confirmed before you're offered the shift");
    expect(formatJobPay({ workerRateMinor: 0, currency: "CAD" }, "ar")).toBe("الأجر بالساعة: يُؤكَّد قبل أن تُعرض عليك المناوبة");
    expect(formatOpenings(3, "fr")).toBe("3 postes");
  });

  it("the job screens read their words from EN / FR / AR, not English literals (audit S9)", () => {
    for (const file of ["marketplace/MarketplaceJobScreen.tsx", "marketplace/MarketplaceSearchScreen.tsx", "offers/OffersScreen.tsx", "documents/DocumentsScreen.tsx", "profile/ProfileScreen.tsx", "cv-builder/CvBuilderScreen.tsx"]) {
      const source = read(file);
      expect(source, file).toContain("useLocale()");
      expect(source, file).not.toMatch(/label="[A-Z][a-z]/);
      expect(source, file).not.toMatch(/title="[A-Z][a-z]/);
    }
  });

  it("the long-term job on the calendar opens the job page to Apply instead of claiming", () => {
    const calendar = read("jobs-calendar/JobsCalendarScreen.tsx");
    expect(calendar).toContain('label={t("job.applyButton")}');
    expect(calendar).toContain("formatWorkerRate(null");
  });
});

describe("offers: the website's offers page", () => {
  it("only sent / delivered / viewed offers can be answered, with the website's status words", () => {
    expect(isRespondable("sent")).toBe(true);
    expect(isRespondable("accepted")).toBe(false);
    expect(offerStatusKey("viewed")).toBe("offers.statusAwaiting");
    expect(translate("fr", offerStatusKey("accepted"))).toBe(translate("fr", "offers.statusAccepted"));
  });

  it("shows the API's overlap message on accept instead of 'the offer changed'", () => {
    const screen = read("offers/OffersScreen.tsx");
    expect(screen).toContain('result.status === "shift_overlap"');
    expect(screen).toContain("result.messages[locale]");
  });
});

describe("documents: the website's Documents page", () => {
  it("offers every certificate type an employer can require (cert_*)", () => {
    const listed = CERTIFICATE_TYPES.map((c) => c.value);
    for (const types of Object.values(CERTIFICATE_DOCUMENT_TYPES)) {
      expect(listed.includes(types[0]!) || DOCUMENT_TYPES.some((d) => d.value === types[0])).toBe(true);
    }
    expect(listed).toContain("cert_pab");
    expect(documentTypeLabel("cert_pab", "fr", (k) => translate("fr", k))).toBe("Certificat PAB (préposé aux bénéficiaires)");
    expect(documentTypeLabel("identity", "en", (k) => translate("en", k))).toBe("Government photo ID");
  });

  it("accepts the same files as the API and hides replaced or deleted documents", () => {
    expect(allowedFileType("scan.HEIC", "")).toBe("image/heic");
    expect(allowedFileType("notes.exe", "application/x-msdownload")).toBeNull();
    const docs = activeDocuments([
      { id: "1", documentType: "identity", fileName: null, expiresAt: null, effectiveStatus: "accepted" },
      { id: "2", documentType: "identity", fileName: null, expiresAt: null, effectiveStatus: "superseded" },
      { id: "3", documentType: "cv", fileName: null, expiresAt: null, effectiveStatus: "revoked" }
    ]);
    expect(docs.map((d) => d.id)).toEqual(["1"]);
    expect(documentStatusKey("expiring")).toBe("doc.statusExpiring");
  });

  it("shows the expiry date staff set", () => {
    expect(read("documents/DocumentsScreen.tsx")).toContain('t("common.expires", { date: formatExpiry(d.expiresAt, loc) })');
  });
});

describe("profile and CV", () => {
  it("saves the same profile body as the website and maps standing words", () => {
    const body = intakeBody({
      legalFirstName: "Marie",
      legalLastName: "T",
      phone: "",
      addressLine: "",
      city: "Laval",
      province: "QC",
      postalCode: "",
      hasDrivingLicence: false,
      licenceClass: "123",
      licenceExpiry: "2028-01-01",
      hasVehicle: true,
      transportNotes: "",
      marketingEmailOptIn: false
    });
    expect(body).toMatchObject({ licenceClass: null, licenceExpiry: null, vehicleType: null, canTravelKm: null, hasVehicle: true });
    expect(standingKey("review_required")).toBe("hr.standingReview");
  });

  it("saves the chosen language on the account from the profile page", () => {
    const profile = read("profile/ProfileScreen.tsx");
    expect(profile).toContain("transport.saveLanguage(next)");
    expect(profile).toContain("<LegalLinks />");
  });

  it("builds the CV request like the website and shows the API's fallback note in the worker's language", () => {
    const profile = buildCvProfile({
      categoryKey: "care",
      fullName: " Marie ",
      city: "Laval",
      experience: "1–3 years",
      languages: ["Français"],
      skills: ["Personal care"],
      education: "No diploma",
      availability: [],
      lastJob: "",
      cvLanguage: "fr"
    });
    expect(profile).toMatchObject({ fullName: "Marie", headline: "Healthcare / PSW", language: "fr", education: [], experience: [] });
    expect(profile.summary).toBe("1–3 years of experience as Healthcare / PSW in the Laval area. Available: flexible.");
    const note = { reason: "daily_limit", message: { en: "Limit.", fr: "Limite.", ar: "حد." } };
    expect(fallbackText(note, "ar")).toBe("حد.");
    expect(fallbackText(null, "en")).toBeNull();
    expect(markdownToPlain("# Marie\n- **Care**\n\n\n\nok")).toBe("Marie\n• Care\n\nok");
  });

  it("shows Worker Pro as a status only — no price, no purchase, no trial button (store rules)", () => {
    expect(proStatus(null).key).toBe("pro.statusNone");
    expect(proStatus({ pro: true, source: "trial", expiresAt: "2026-11-20T00:00:00Z" })).toEqual({ key: "pro.statusTrialUntil", until: "2026-11-20T00:00:00Z" });
    expect(proStatus({ pro: true, source: "purchase", expiresAt: null }).key).toBe("pro.statusActive");
    const screen = read("cv-builder/CvBuilderScreen.tsx");
    expect(screen).not.toMatch(/subscribe|checkout|e-transfer|\$12|trial\(|Linking/i);
    const session = read("../auth/secureSession.ts");
    expect(session).not.toContain("/worker/cv/subscribe");
    expect(session).not.toContain("/worker/cv/trial");
  });
});

describe("setup and legal", () => {
  it("the pay-choice setup speaks EN / FR / AR with the website's words and hides the agreement code", () => {
    expect(setupCopyFor("fr").contractorTitle).toBe("Travailleur autonome");
    expect(setupCopyFor("ar").submitCta).toBe("أكمل الإعداد");
    expect(read("worker-onboarding/WorkerSetupScreen.tsx")).not.toContain("agreementVersionFor(choice, state.versions)})");
  });

  it("sign-up accepts legal version 2026-11-11 with links to Privacy and Terms", () => {
    expect(LEGAL_DOCUMENTS_VERSION).toBe("2026-11-11");
    expect(ACCEPTED_LEGAL_VERSION).toBe("2026-11-11");
    expect(read("worker-auth/WorkerAuthScreen.tsx")).toContain('<LegalLinks pages={["terms", "privacy"]} />');
  });
});
