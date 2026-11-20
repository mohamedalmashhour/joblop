import { describe, expect, it } from "vitest";
import { isAiReviewableDocType, isSensitiveDocType, offlineAdvisoryVerdict, parseModelVerdict, presentableVerdict } from "./documentAiReview";

// Audit G2: no document image is ever sent to an outside AI, so no type is AI-reviewable.
const IMAGE_TYPES_WITH_PERSONAL_DATA = ["cv", "photo", "certificate", "first_aid"];
const SENSITIVE = ["identity", "sin", "licence", "work_authorization", "qc_healthcare_doc", "void_cheque"];

describe("document AI review (offline only)", () => {
  it("no document type is AI-reviewable, including CVs, photos, certificates and first-aid cards", () => {
    for (const type of [...IMAGE_TYPES_WITH_PERSONAL_DATA, ...SENSITIVE, "cert_pab", "food_safety", "anything"]) {
      expect(isAiReviewableDocType(type), type).toBe(false);
    }
  });

  it("CV, photo, certificate and first aid get an offline verdict that a person decides", () => {
    for (const type of IMAGE_TYPES_WITH_PERSONAL_DATA) {
      const verdict = offlineAdvisoryVerdict(type);
      expect(verdict).toEqual({ status: "human_required", advisory: true, reason: "person_checks", source: "offline" });
      expect(presentableVerdict(verdict).status).toBe("human_required");
    }
  });

  it("sensitive identity and financial types stay human-only", () => {
    for (const type of SENSITIVE) {
      expect(isSensitiveDocType(type)).toBe(true);
      expect(offlineAdvisoryVerdict(type)).toMatchObject({ status: "human_required", reason: "sensitive_type", source: "offline" });
    }
  });

  it("an expired document asks for a re-upload, whatever its type", () => {
    expect(offlineAdvisoryVerdict("cv", { expired: true })).toMatchObject({ status: "needs_reupload", reason: "expired", source: "offline" });
  });

  it("an offline pass is never shown as an approval", () => {
    expect(presentableVerdict({ status: "ai_approved", advisory: true, reason: "offline_precheck", source: "offline" }).status).toBe("human_required");
  });

  it("an unrecognised model answer falls back to a person", () => {
    expect(parseModelVerdict("maybe", "photo").status).toBe("human_required");
  });
});
