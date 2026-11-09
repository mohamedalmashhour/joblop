// DRAFT — must be reviewed by a Québec lawyer before relying on it. (Code comment only.)
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
