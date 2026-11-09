// Reviewed and accepted by the owner's Québec lawyer (2026-11-09). See docs/legal/LEGAL_REVIEW_NOTES.md before changing any wording.
import { employerTerms } from "../legal/employerLegal";
import { LegalDocumentPage } from "../legal/LegalDocumentPage";

export default function TermsPage() {
  return (
    <LegalDocumentPage
      current="/terms"
      documents={employerTerms}
      fullTextKey="terms"
      title={{ en: "Terms of Service for employers", fr: "Conditions d’utilisation pour les employeurs", ar: "شروط الاستخدام لأصحاب العمل" }}
    />
  );
}
