// DRAFT — must be reviewed by a Québec lawyer before relying on it. (Code comment only.)
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
