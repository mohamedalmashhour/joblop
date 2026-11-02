import type { ReactNode } from "react";
import Link from "next/link";
import { activeCountry } from "../country";

// Shared legal content for Joblop's public Privacy Policy and Terms of Service.
// Rendered at /privacy and /terms. Kept as plain, reviewable prose so the pages
// satisfy Google Play's requirement for a real, publicly accessible policy that
// comprehensively discloses how the app collects, uses and shares user data.

const LAST_UPDATED = "October 26, 2026";
const ENTITY = activeCountry().legalEntityName;
const CONTACT = "info@sybnb.app";

const page: React.CSSProperties = {
  maxWidth: 820,
  margin: "0 auto",
  padding: "40px 20px 72px",
  fontFamily: "-apple-system,Segoe UI,Roboto,sans-serif",
  color: "#000000",
  lineHeight: 1.6
};
const h1: React.CSSProperties = { fontSize: 28, margin: "16px 0 4px" };
const meta: React.CSSProperties = { color: "#6b6356", fontSize: 13, margin: "0 0 24px" };
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
  border: "1px solid #faf6ec",
  padding: "8px 10px",
  textAlign: "left",
  verticalAlign: "top"
};

function LegalShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main style={page}>
      <Link href="/" style={{ color: "#b8862f", textDecoration: "none", fontSize: 13 }}>
        ← Joblop
      </Link>
      <h1 style={h1}>{title}</h1>
      <p style={meta}>
        Last updated: {LAST_UPDATED} · Operated by {ENTITY} · Contact:{" "}
        <a href={`mailto:${CONTACT}`} style={{ color: "#b8862f" }}>
          {CONTACT}
        </a>
      </p>
      {children}
      <p style={{ ...meta, marginTop: 40 }}>
        <Link href="/privacy" style={{ color: "#b8862f" }}>
          Privacy Policy
        </Link>{" "}
        ·{" "}
        <Link href="/terms" style={{ color: "#b8862f" }}>
          Terms of Service
        </Link>
      </p>
    </main>
  );
}

export function PrivacyPolicy() {
  return (
    <LegalShell title="Privacy Policy">
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
          Password (stored only as a salted hash — we never store your password in plain text)
        </li>
        <li style={li}>Display name</li>
        <li style={li}>Mobile number — optional; collected only if you choose to provide it (for shift alerts and account recovery)</li>
      </ul>
      <p style={p}>
        <strong>Profile and location information</strong>
      </p>
      <ul>
        <li style={li}>Postal address (street, city, province, postal code)</li>
        <li style={li}>
          Approximate geolocation (latitude/longitude) used to match you with nearby work and, for
          workers, to verify check-in and check-out at a work site when you choose to clock in
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
        Your mobile number is <strong>optional</strong> — we collect it only if you choose to provide
        it, and use it for shift alerts and account recovery. We do <strong>not</strong> collect
        government identification numbers or payment card details through the app. We do not knowingly
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
        <a href={`mailto:${CONTACT}`} style={{ color: "#b8862f" }}>
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
        <a href={`mailto:${CONTACT}`} style={{ color: "#b8862f" }}>
          {CONTACT}
        </a>{" "}
        — {ENTITY}.
      </p>
    </LegalShell>
  );
}

export function TermsOfService() {
  return (
    <LegalShell title="Terms of Service">
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
        <a href={`mailto:${CONTACT}`} style={{ color: "#b8862f" }}>
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

      <h2 style={h2}>13. Contact</h2>
      <p style={p}>
        Questions:{" "}
        <a href={`mailto:${CONTACT}`} style={{ color: "#b8862f" }}>
          {CONTACT}
        </a>{" "}
        — {ENTITY}.
      </p>
    </LegalShell>
  );
}

export function AccountDeletion() {
  return (
    <LegalShell title="Delete your Joblop account">
      <p style={p}>
        You can ask us to delete your Joblop account and the personal information associated with it
        at any time. Joblop is operated by {ENTITY}.
      </p>

      <h2 style={h2}>How to request deletion</h2>
      <ol>
        <li style={li}>
          Email{" "}
          <a href={`mailto:${CONTACT}?subject=Delete my account`} style={{ color: "#b8862f" }}>
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
        <a href={`mailto:${CONTACT}`} style={{ color: "#b8862f" }}>
          {CONTACT}
        </a>
        . See our{" "}
        <a href="/privacy" style={{ color: "#b8862f" }}>
          Privacy Policy
        </a>{" "}
        for how we handle your data.
      </p>
    </LegalShell>
  );
}
