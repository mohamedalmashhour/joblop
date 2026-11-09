// Reviewed and accepted by the owner's Québec lawyer (2026-11-09). See docs/legal/LEGAL_REVIEW_NOTES.md before changing any wording.
// (Code comment only. The English clauses below are the approved October 26, 2026 text and are kept
// word for word; new clauses live in ./workerLegalUpdates.ts and @rwos/shared legalPrivacyAdditions,
// the French translation in ./workerLegalFr.ts. See docs/legal/LEGAL_REVIEW_NOTES.md.)
import type { ReactNode } from "react";
import Link from "next/link";
import {
  LEGAL_CONTACT_EMAIL,
  LEGAL_DOCUMENTS_VERSION,
  privacyAdditions,
  type LegalBlock,
  type LegalLanguage
} from "@rwos/shared";
import { activeCountry } from "../country";
import { accountDeletionFr, privacyPolicyFr, termsOfServiceFr } from "./workerLegalFr";
import {
  accountDeletionAdditions,
  accountDeletionArabic,
  workerPrivacyArabic,
  workerTermsAdditions,
  workerTermsArabic
} from "./workerLegalUpdates";

// Shared legal content for Joblop's public Privacy Policy and Terms of Service.
// Rendered at /privacy and /terms. Kept as plain, reviewable prose so the pages
// satisfy Google Play's requirement for a real, publicly accessible policy that
// comprehensively discloses how the app collects, uses and shares user data.

const ENTITY = activeCountry().legalEntityName;
const CONTACT = LEGAL_CONTACT_EMAIL;

const page: React.CSSProperties = {
  maxWidth: 820,
  margin: "0 auto",
  padding: "40px 20px 72px",
  fontFamily: "-apple-system,Segoe UI,Roboto,sans-serif",
  // Dark-first: readable cream text on the black canvas (was #000 → invisible on black).
  color: "#ece3d1",
  lineHeight: 1.6
};
const h1: React.CSSProperties = { fontSize: 28, margin: "16px 0 4px", color: "#f4ead6" };
const meta: React.CSSProperties = { color: "#b3a894", fontSize: 13, margin: "0 0 24px" };
const h2: React.CSSProperties = { fontSize: 18, margin: "28px 0 8px" };
const p: React.CSSProperties = { margin: "0 0 12px", fontSize: 15 };
const li: React.CSSProperties = { marginBottom: 6, fontSize: 15 };
const table: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 14,
  margin: "4px 0 16px"
};
const cell: React.CSSProperties = {
  border: "1px solid rgba(248, 184, 8, 0.22)",
  padding: "8px 10px",
  textAlign: "left",
  verticalAlign: "top"
};

const shellWords: Readonly<Record<LegalLanguage, { version: string; effective: string; operated: string; contact: string; privacy: string; terms: string; deletion: string; back: string }>> = {
  en: { version: "Version", effective: "Effective November 11, 2026", operated: "Operated by", contact: "Contact", privacy: "Privacy Policy", terms: "Terms of Service", deletion: "Delete your account", back: "← Joblop" },
  fr: { version: "Version", effective: "En vigueur le 11 novembre 2026", operated: "Exploité par", contact: "Nous joindre", privacy: "Politique de confidentialité", terms: "Conditions d’utilisation", deletion: "Supprimer votre compte", back: "← Joblop" },
  ar: { version: "الإصدار", effective: "ساري المفعول من 11 نوفمبر 2026", operated: "تديره", contact: "للتواصل", privacy: "سياسة الخصوصية", terms: "شروط الاستخدام", deletion: "حذف الحساب", back: "جوب‑لوب →" }
};

function LegalShell({ title, lang, children }: { title: string; lang: LegalLanguage; children: ReactNode }) {
  const w = shellWords[lang];
  return (
    <main style={page} dir={lang === "ar" ? "rtl" : "ltr"} lang={lang}>
      <Link href="/" style={{ color: "#e0a500", textDecoration: "none", fontSize: 13 }}>
        {w.back}
      </Link>
      <h1 style={h1}>{title}</h1>
      <p style={meta}>
        {w.version} {LEGAL_DOCUMENTS_VERSION} · {w.effective} · {w.operated} {ENTITY} · {w.contact}:{" "}
        <a href={`mailto:${CONTACT}`} style={{ color: "#e0a500" }}>
          {CONTACT}
        </a>
      </p>
      {children}
      <p style={{ ...meta, marginTop: 40 }}>
        <Link href="/privacy" style={{ color: "#e0a500" }}>
          {w.privacy}
        </Link>{" "}
        ·{" "}
        <Link href="/terms" style={{ color: "#e0a500" }}>
          {w.terms}
        </Link>{" "}
        ·{" "}
        <Link href="/account-deletion" style={{ color: "#e0a500" }}>
          {w.deletion}
        </Link>
      </p>
    </main>
  );
}

const linkStyle: React.CSSProperties = { color: "#e0a500" };

/** Text with any email address turned into a mailto link. */
function WithEmails({ text }: { text: string }) {
  const parts = text.split(/([\w.+-]+@[\w-]+\.[\w.]+[\w])/g);
  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <a key={index} href={`mailto:${part}`} style={linkStyle}>
            {part}
          </a>
        ) : (
          part
        )
      )}
    </>
  );
}

/** Renders legal text kept as data (the French translation and the new clauses). */
export function LegalBlocks({ blocks }: { blocks: readonly LegalBlock[] }) {
  return (
    <>
      {blocks.map((block, index) => {
        switch (block.kind) {
          case "h2":
            return (
              <h2 key={index} id={block.id} style={h2}>
                {block.text}
              </h2>
            );
          case "h3":
            return (
              <h3 key={index} style={{ ...h2, fontSize: 16, margin: "20px 0 6px" }}>
                {block.text}
              </h3>
            );
          case "p":
            return (
              <p key={index} style={p}>
                <WithEmails text={block.text} />
              </p>
            );
          case "ul":
          case "ol": {
            const List = block.kind;
            return (
              <List key={index}>
                {block.items.map((item) => (
                  <li key={item} style={li}>
                    <WithEmails text={item} />
                  </li>
                ))}
              </List>
            );
          }
          case "table":
            return (
              <div key={index} style={{ overflowX: "auto" }}>
                <table style={table}>
                  <thead>
                    <tr>
                      {block.head.map((cellText) => (
                        <th key={cellText} style={cell}>
                          {cellText}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row) => (
                      <tr key={row.join("|")}>
                        {row.map((cellText, cellIndex) => (
                          <td key={cellIndex} style={cell}>
                            {cellText}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "links":
            return (
              <p key={index} style={p}>
                {block.links.map((link) => (
                  <Link key={link.href} href={link.href as "/account-deletion"} style={linkStyle}>
                    {link.label}
                  </Link>
                ))}
              </p>
            );
        }
      })}
    </>
  );
}

const arabicFullTextNote = "النص الكامل باللغة الإنجليزية (معتمد)";

export function PrivacyPolicy({ lang = "en" }: { lang?: LegalLanguage }) {
  if (lang === "fr") {
    return (
      <LegalShell title="Politique de confidentialité" lang="fr">
        <LegalBlocks blocks={privacyPolicyFr} />
        <LegalBlocks blocks={privacyAdditions("worker", "fr")} />
      </LegalShell>
    );
  }
  if (lang === "ar") {
    return (
      <LegalShell title="سياسة الخصوصية" lang="ar">
        <LegalBlocks blocks={workerPrivacyArabic} />
        <h2 style={h2}>{arabicFullTextNote}</h2>
        <div dir="ltr" lang="en">
          <PrivacyPolicyEnglish />
        </div>
      </LegalShell>
    );
  }
  return (
    <LegalShell title="Privacy Policy" lang="en">
      <PrivacyPolicyEnglish />
    </LegalShell>
  );
}

function PrivacyPolicyEnglish() {
  return (
    <>
      <p style={p}>
        Joblop is a staffing and job-matching platform operating in Québec and across Canada. This
        Privacy Policy explains what personal information we collect, how we use it, who we share it
        with, and the choices and rights you have. We handle personal information in accordance with
        Québec&rsquo;s <em>Act respecting the protection of personal information in the private
        sector</em> (Law 25) and Canada&rsquo;s PIPEDA.
      </p>

      <h2 style={h2}>1. Information we collect</h2>
      <p style={p}>
        <strong>Account information</strong>
      </p>
      <ul>
        <li style={li}>Email address (to create and secure your account and sign you in)</li>
        <li style={li}>
          Sign-in codes: you sign in with a one-time code texted to your mobile number; you do not create or enter a password
        </li>
        <li style={li}>Display name</li>
        <li style={li}>Mobile number — required; used to sign you in with a texted code and for shift alerts and urgent notices</li>
      </ul>
      <p style={p}>
        <strong>Profile and location information</strong>
      </p>
      <ul>
        <li style={li}>Postal address (street, city, province, postal code)</li>
        <li style={li}>
          Approximate geolocation (latitude/longitude) used to match you with nearby work. We do not
          use your location to verify check-in or check-out.
        </li>
        <li style={li}>Work preferences, availability, roles and skills you enter</li>
      </ul>
      <p style={p}>
        <strong>Work activity</strong>
      </p>
      <ul>
        <li style={li}>
          Job requests, assignments, timesheets and work history created through the platform
        </li>
        <li style={li}>Content you create with the CV builder (your résumé/CV information)</li>
      </ul>
      <p style={p}>
        <strong>Usage and device information</strong>
      </p>
      <ul>
        <li style={li}>App and site activity (pages viewed, searches run, features used)</li>
        <li style={li}>
          Standard technical data (IP address, device/browser type) needed to deliver and secure the
          service
        </li>
      </ul>
      <p style={p}>
        Your mobile number is <strong>required</strong> — we use it to sign you in with a texted code
        and for shift alerts and urgent notices. If you upload them on the Documents page, we collect
        identity documents and your social insurance number (a government identification number) to
        check that you can work and to set up your pay. We do <strong>not</strong> collect payment card
        details through the app. We do not knowingly
        collect information from anyone under 18; Joblop is intended for adults.
      </p>

      <h2 style={h2}>2. How we use your information</h2>
      <ul>
        <li style={li}>Create and secure your account and sign you in</li>
        <li style={li}>Match workers with jobs and employers with available workers near them</li>
        <li style={li}>Operate scheduling, timesheets and work records</li>
        <li style={li}>Provide JobScanner search results and the AI-assisted CV builder</li>
        <li style={li}>Send service communications (e.g., confirmations, alerts you opt into)</li>
        <li style={li}>Maintain, secure, debug and improve the platform</li>
        <li style={li}>Comply with legal obligations</li>
      </ul>
      <p style={p}>
        We do <strong>not</strong> sell your personal information.
      </p>

      <h2 style={h2}>3. Who we share information with (service providers)</h2>
      <p style={p}>
        We share limited personal information with service providers who process it only on our
        instructions to run the platform:
      </p>
      <table style={table}>
        <thead>
          <tr>
            <th style={cell}>Provider</th>
            <th style={cell}>Purpose</th>
            <th style={cell}>Data involved</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={cell}>Google Analytics</td>
            <td style={cell}>Usage analytics</td>
            <td style={cell}>App/site activity, device data</td>
          </tr>
          <tr>
            <td style={cell}>Brevo</td>
            <td style={cell}>Sending service emails you&rsquo;ve opted into</td>
            <td style={cell}>Email address, message content</td>
          </tr>
          <tr>
            <td style={cell}>Anthropic (Claude)</td>
            <td style={cell}>AI-assisted CV builder</td>
            <td style={cell}>The CV content you choose to generate</td>
          </tr>
          <tr>
            <td style={cell}>Adzuna</td>
            <td style={cell}>JobScanner partner job listings</td>
            <td style={cell}>Your search terms (e.g., role, city)</td>
          </tr>
          <tr>
            <td style={cell}>Render / Neon</td>
            <td style={cell}>Secure hosting and database</td>
            <td style={cell}>All stored data, encrypted</td>
          </tr>
        </tbody>
      </table>
      <p style={p}>
        JobScanner results are external job postings from partner sources; when you apply you may be
        taken to the source site, which has its own privacy practices. We may also disclose
        information when required by law, to protect our rights or users&rsquo; safety, or in
        connection with a corporate transaction, with notice where required.
      </p>
      <p style={p}>
        {"All the above categories exclude text messaging originator opt-in data and consent; this information won't be shared with any third parties."}
      </p>

      <h2 style={h2}>4. How long we keep it</h2>
      <p style={p}>
        We keep personal information for as long as your account is active and as needed to provide
        the service, then for any period required to meet legal, tax or record-keeping obligations,
        after which it is deleted or anonymized.
      </p>

      <h2 style={h2}>5. Security</h2>
      <p style={p}>
        Data is encrypted in transit (HTTPS/TLS) and protected by access controls. Passwords are
        stored only as salted hashes. No system is perfectly secure, but we take reasonable technical
        and organizational measures to protect your information.
      </p>

      <h2 style={h2}>6. Your rights</h2>
      <p style={p}>
        Subject to applicable law (including Québec Law 25 and PIPEDA), you may access the personal
        information we hold about you, correct inaccurate information, request deletion of your
        account and associated personal information, and withdraw consent to optional communications.
        To exercise any of these rights, contact{" "}
        <a href={`mailto:${CONTACT}`} style={{ color: "#e0a500" }}>
          {CONTACT}
        </a>
        . We will respond within the timelines required by law.
      </p>

      <h2 style={h2}>7. International processing</h2>
      <p style={p}>
        Some service providers may process data outside Québec/Canada (e.g., in the United States).
        Where that happens, we take steps required by applicable law to protect your information.
      </p>

      <h2 style={h2}>8. Changes to this policy</h2>
      <p style={p}>
        We may update this policy from time to time. Material changes will be posted on this page
        with a new &ldquo;Last updated&rdquo; date.
      </p>

      <h2 style={h2}>9. Contact</h2>
      <p style={p}>
        Questions or requests:{" "}
        <a href={`mailto:${CONTACT}`} style={{ color: "#e0a500" }}>
          {CONTACT}
        </a>{" "}
        — {ENTITY}.
      </p>
      <LegalBlocks blocks={privacyAdditions("worker", "en")} />
    </>
  );
}

export function TermsOfService({ lang = "en" }: { lang?: LegalLanguage }) {
  if (lang === "fr") {
    return (
      <LegalShell title="Conditions d’utilisation" lang="fr">
        <LegalBlocks blocks={termsOfServiceFr} />
        <LegalBlocks blocks={workerTermsAdditions("fr")} />
      </LegalShell>
    );
  }
  if (lang === "ar") {
    return (
      <LegalShell title="شروط الاستخدام" lang="ar">
        <LegalBlocks blocks={workerTermsArabic} />
        <h2 style={h2}>{arabicFullTextNote}</h2>
        <div dir="ltr" lang="en">
          <TermsOfServiceEnglish />
        </div>
      </LegalShell>
    );
  }
  return (
    <LegalShell title="Terms of Service" lang="en">
      <TermsOfServiceEnglish />
    </LegalShell>
  );
}

function TermsOfServiceEnglish() {
  return (
    <>
      <p style={p}>
        Welcome to Joblop. By creating an account or using the Joblop app or website, you agree to
        these Terms of Service. If you do not agree, do not use the service.
      </p>

      <h2 style={h2}>1. Who can use Joblop</h2>
      <p style={p}>
        You must be at least 18 years old and able to form a binding contract. You agree to provide
        accurate information and to keep your account credentials secure. You are responsible for
        activity under your account.
      </p>

      <h2 style={h2}>2. What Joblop is</h2>
      <p style={p}>
        Joblop is a platform that connects workers with employers for staffing and shift work in
        Québec and across Canada, and provides supporting tools such as job search (JobScanner) and
        an AI-assisted CV builder. Joblop facilitates connections and scheduling; the working
        relationship and any obligations arising from it are between the worker and the employer.
      </p>

      <h2 style={h2}>3. Your responsibilities</h2>
      <ul>
        <li style={li}>Provide truthful profile, availability and work information</li>
        <li style={li}>
          Comply with applicable laws, including employment and workplace-safety laws
        </li>
        <li style={li}>Honour commitments you accept through the platform (shifts, assignments)</li>
        <li style={li}>
          Not misuse the platform: no fraud, harassment, scraping, interference, or posting unlawful,
          misleading or infringing content
        </li>
      </ul>

      <h2 style={h2}>4. Employers and workers</h2>
      <p style={p}>
        Employers are responsible for the accuracy of their job requests and for meeting their legal
        obligations toward workers. Workers are responsible for performing accepted work as agreed.
        Joblop is not the employer of workers unless expressly stated in a separate written
        agreement, and does not guarantee any particular job, worker, outcome, pay or availability.
      </p>

      <h2 style={h2}>5. JobScanner and third-party listings</h2>
      <p style={p}>
        JobScanner surfaces job listings from third-party partner sources. Those listings and the
        sites you apply on are controlled by third parties; Joblop does not control and is not
        responsible for their content, accuracy or hiring decisions.
      </p>

      <h2 style={h2}>6. Fees and payments</h2>
      <p style={p}>
        Joblop does not take a cut of a worker&rsquo;s pay for applying through the platform. Any fees
        that may apply to specific services will be disclosed before you incur them. Payment-processing
        features, where offered, are provided through a third-party processor subject to its own terms.
      </p>

      <h2 style={h2}>7. Content you provide</h2>
      <p style={p}>
        You keep ownership of the content you submit (such as your CV). You grant Joblop a limited
        licence to host, display and process that content solely to provide the service to you (for
        example, to show your profile to a potential employer or to generate a CV).
      </p>

      <h2 style={h2}>8. Availability and changes</h2>
      <p style={p}>
        We may modify, suspend or discontinue features at any time. We aim to keep the service
        available but do not guarantee uninterrupted operation.
      </p>

      <h2 style={h2}>9. Disclaimers and limitation of liability</h2>
      <p style={p}>
        The service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties
        of any kind, to the extent permitted by law. To the maximum extent permitted by applicable
        law, Joblop is not liable for indirect, incidental or consequential damages, or for the
        conduct of any worker, employer or third party.
      </p>

      <h2 style={h2}>10. Termination</h2>
      <p style={p}>
        You may stop using Joblop and request deletion of your account at any time (contact{" "}
        <a href={`mailto:${CONTACT}`} style={{ color: "#e0a500" }}>
          {CONTACT}
        </a>
        ). We may suspend or terminate access for breach of these Terms or misuse of the platform.
      </p>

      <h2 style={h2}>11. Governing law</h2>
      <p style={p}>
        These Terms are governed by the laws of the Province of Québec and the federal laws of Canada
        applicable there. The courts of Québec have jurisdiction, subject to any mandatory
        consumer-protection rights you may have.
      </p>

      <h2 style={h2}>12. Changes to these Terms</h2>
      <p style={p}>
        We may update these Terms from time to time. Material changes will be posted here with a new
        &ldquo;Last updated&rdquo; date; continued use after changes means you accept them.
      </p>

      <h2 style={h2}>13. Text messages (SMS)</h2>
      <p style={p}>
        By providing your mobile phone number, you agree to receive text messages from JobLop
        (9375-7649 Québec inc.) at the number provided — account and job messages such as verification
        codes, sign-in codes, job-offer and assignment confirmations, and shift reminders —
        sent using an automated system. Consent is not a condition of using the service. Message
        frequency varies. Message and data rates may apply. Reply STOP to unsubscribe at any time, or
        HELP for help. For assistance, contact{" "}
        <a href={`mailto:${CONTACT}`} style={{ color: "#e0a500" }}>
          {CONTACT}
        </a>
        . Carriers are not liable for delayed or undelivered messages. See our{" "}
        <a href="/privacy" style={{ color: "#e0a500" }}>
          Privacy Policy
        </a>{" "}
        for how we handle your personal information.
      </p>

      <h2 style={h2}>14. Contact</h2>
      <p style={p}>
        Questions:{" "}
        <a href={`mailto:${CONTACT}`} style={{ color: "#e0a500" }}>
          {CONTACT}
        </a>{" "}
        — {ENTITY}.
      </p>
      <LegalBlocks blocks={workerTermsAdditions("en")} />
    </>
  );
}

export function AccountDeletion({ lang = "en" }: { lang?: LegalLanguage }) {
  if (lang === "fr") {
    return (
      <LegalShell title="Supprimer votre compte Joblop" lang="fr">
        <LegalBlocks blocks={accountDeletionFr} />
        <LegalBlocks blocks={accountDeletionAdditions("fr")} />
      </LegalShell>
    );
  }
  if (lang === "ar") {
    return (
      <LegalShell title="حذف حساب جوب‑لوب" lang="ar">
        <LegalBlocks blocks={accountDeletionArabic} />
        <h2 style={h2}>{arabicFullTextNote}</h2>
        <div dir="ltr" lang="en">
          <AccountDeletionEnglish />
        </div>
      </LegalShell>
    );
  }
  return (
    <LegalShell title="Delete your Joblop account" lang="en">
      <AccountDeletionEnglish />
    </LegalShell>
  );
}

function AccountDeletionEnglish() {
  return (
    <>
      <p style={p}>
        You can ask us to delete your Joblop account and the personal information associated with it
        at any time. Joblop is operated by {ENTITY}.
      </p>

      <h2 style={h2}>How to request deletion</h2>
      <ol>
        <li style={li}>
          Email{" "}
          <a href={`mailto:${CONTACT}?subject=Delete my account`} style={{ color: "#e0a500" }}>
            {CONTACT}
          </a>{" "}
          from the email address on your Joblop account, with the subject{" "}
          <strong>&ldquo;Delete my account&rdquo;</strong>.
        </li>
        <li style={li}>
          Tell us the name on the account so we can confirm it&rsquo;s you.
        </li>
        <li style={li}>
          We verify the request and delete your account. We aim to complete deletion within{" "}
          <strong>30 days</strong> and will confirm by email.
        </li>
      </ol>

      <h2 style={h2}>What is deleted</h2>
      <p style={p}>
        Your account and its personal information are deleted, including: your email and sign-in
        credentials, display name, postal address and approximate geolocation, work preferences,
        availability and roles, your CV content, and the usage data tied to your account.
      </p>

      <h2 style={h2}>What may be kept</h2>
      <p style={p}>
        We may retain a limited set of records that we are legally required to keep — for example,
        completed-work and timesheet records and tax-related records — for the period required by
        applicable law, after which they are deleted or anonymized. We do not sell your personal
        information.
      </p>

      <h2 style={h2}>Questions</h2>
      <p style={p}>
        Contact{" "}
        <a href={`mailto:${CONTACT}`} style={{ color: "#e0a500" }}>
          {CONTACT}
        </a>
        . See our{" "}
        <a href="/privacy" style={{ color: "#e0a500" }}>
          Privacy Policy
        </a>{" "}
        for how we handle your data.
      </p>
      <LegalBlocks blocks={accountDeletionAdditions("en")} />
    </>
  );
}
