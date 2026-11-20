// Reviewed and accepted by the owner's Québec lawyer (2026-11-09). See docs/legal/LEGAL_REVIEW_NOTES.md before changing any wording.
import { employerPrivacy } from "../legal/employerLegal";
import { LegalDocumentPage } from "../legal/LegalDocumentPage";

export default function PrivacyPage() {
  return (
    <LegalDocumentPage
      current="/privacy"
      documents={employerPrivacy}
      fullTextKey="privacy"
      title={{ en: "Privacy Policy for employers", fr: "Politique de confidentialité pour les employeurs", ar: "سياسة الخصوصية لأصحاب العمل" }}
    />
  );
}
