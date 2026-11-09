# Legal review notes — Terms and Privacy, version 2026-11-09

For: the Québec lawyer reviewing Joblop (9375-7649 Québec Inc., operating as Joblop).
Effective date of the new text: **2026-11-09**. Version string: `2026-11-09`
(`packages/shared/src/domain/legalDocuments.ts`, `LEGAL_DOCUMENTS_VERSION`).

The owner reports that the **worker Terms of Service and Privacy Policy dated October 26, 2026**
(`apps/worker/app/legal/content.tsx`) were already reviewed and accepted. Those English clauses are
kept **word for word**. You only need to check what is listed below as new or changed.

Where the text lives:

| Text | File |
|---|---|
| Worker English (approved, unchanged clauses) | `apps/worker/app/legal/content.tsx` |
| Worker French translation of the approved text | `apps/worker/app/legal/workerLegalFr.ts` |
| Worker new clauses (Terms §15, account-deletion addition, Arabic summaries) | `apps/worker/app/legal/workerLegalUpdates.ts` |
| Privacy §10 "What is new" (shared by worker and employer) | `packages/shared/src/domain/legalPrivacyAdditions.ts` |
| Employer Terms and Privacy (EN, FR, AR summary) | `apps/employer/app/legal/employerLegal.ts` |
| Phone app consent text (copied from the worker website) | `apps/mobile/src/i18n/strings.ts` keys `auth.smsConsent`, `auth.accept`, `auth.mustAccept` |

---

## 1. What is new or changed versus the approved October 26 text

### 1.1 Worker pages — presentation only (no clause text changed)

- Header line: "Last updated: October 26, 2026" is replaced by "Version 2026-11-09 · Effective
  November 9, 2026 · Operated by … · Contact: …".
- Footer of each page now also links "Delete your account" (`/account-deletion`).
- The page is shown in the visitor's language (French for `fr-CA`, Arabic for `ar`; `?lang=` from the
  phone app wins). Arabic shows a short Arabic summary, then the full English text.

### 1.2 Worker French translation — new (please check equivalence)

`workerLegalFr.ts` translates every approved clause of the Privacy Policy (§1–9), the Terms (§1–14) and
the account-deletion page. Nothing is added or removed. Check that it is equivalent (Charter of the
French Language). One choice to confirm: "Carriers are not liable…" → "Les fournisseurs de services sans
fil ne sont pas responsables…".

### 1.3 Worker Privacy Policy — NEW §10 "What is new in this version" (whole section is new)

Opening rule: "If anything in this section is different from sections 1 to 9, this section applies."
Sub-sections, all new: 10.1 person in charge (Privacy Officer); 10.2 more service providers (Render,
Brevo for SMS and email, Anthropic for contact chat / staff drafts / CV builder / document pre-check,
Expo push, Google Maps Platform, Stripe when card payments exist; Google Analytics only when turned on);
10.3 AI and automated decisions (plus: number of jobs shown depends on document completeness;
first eligible worker to claim gets a short shift); 10.4 documents you upload and who sees them, AI
pre-check scope; 10.5 processing outside Québec (USA named); 10.6 Law 25 rights incl. portability,
automated-processing review, CAI complaint, 30-day answer; 10.7 retention (6 years for tax records,
10-minute codes, 8-hour sessions); 10.8 cookies; 10.9 messages (SMS, email, job alerts opt-in, push);
10.10 age 18+; 10.11 confidentiality incidents; 10.12 language (FR and EN equal; Arabic summary only).

### 1.4 Worker Terms — NEW §15 "What is new in this version" (whole section is new)

Opening rule: "If anything in this section is different from sections 1 to 14, this section applies."
15.1 short-term shifts paid by Joblop under the worker agreement (employee with source deductions, or
self-employed; GST/QST added if registered); 48 hours to report a timesheet problem; pay normally
released 14 days after the pay period ends. 15.2 late cancellation by a worker (< 24 h): staff may
suspend 7 days the first time and close the account the second time. 15.3 long-term jobs: the employer
hires and pays directly; Joblop is not the employer. 15.4 Worker Pro: C$12.99/month, 14-day free trial
once, Interac e-transfer, no automatic renewal. 15.5 documents must be genuine. 15.6 account deletion
link. 15.7 language.

### 1.5 Worker account-deletion page — NEW paragraph "Added on November 9, 2026"

Pay and tax records kept as tax law requires (6 years in Québec generally); Privacy Officer address.

### 1.6 Employer Terms — NEW document, built on the worker Terms structure

Same 14 headings as the worker Terms. Changed for employers (all to review):

- Intro: accepted "on behalf of yourself and the business you represent".
- §1: must be authorized to bind the business; responsible for people added to the account.
- §2: short-term shifts — Joblop finds workers, pays them and invoices the employer; long-term — Joblop
  only publishes the paid listing, the employer hires, pays and is the employer.
- §3: adds safe workplace, safety training/equipment, supervision, prompt timesheet confirmation,
  no discriminatory content.
- §4: no guarantee a worker will be found.
- §5: "Partner job listings" (replaces JobScanner wording).
- §6: prices on the Pricing page; GST and QST added.
- §7: content = job descriptions, company name and logo.
- §9: **new liability cap** — total liability limited to amounts paid for the related services in the
  3 months before the claim; carve-out for intentional or gross fault and bodily or moral injury
  (C.C.Q. art. 1474). Please confirm the cap is acceptable.
- §10: closing by email "Delete my account"; amounts owed stay payable; suspension for unpaid invoices.
- §11: removes the consumer-protection carve-out (business customers). Confirm.
- §12: a price change never applies to a month or order already paid.
- §13: SMS wording adapted to sign-in codes and request notices; "replying STOP stops sign-in codes".
- **§15 (new): prices, plans and listings**, copied from `/pricing` (`pricingContent.ts`): contract hourly
  rate with Joblop's service fee included (size never stated); 6-hour minimum per worker; urgent +15% /
  immediate +30% of the hourly rate per billed hour, plus C$5.00 per billed hour; travel beyond 25 km of
  greater Montréal (C$0.25/km + C$25/h driving, both ways); GST 5% + QST 9.975%; invoice by email after
  the work; Joblop pays the workers — do not pay them directly for short-term shifts; Shift Pro C$49 /
  Shift Business C$149 per month + taxes, 14-day trial once per company, canceling stops the next month;
  long-term listing C$99/month + taxes, first 2 weeks free once per company, first paid month 50% off;
  free cancellation 24 h or more before a shift, later 6 hours billed per confirmed worker; Interac
  e-transfer, Stripe for cards when available; AI contact assistant and "Speak" button; language.

### 1.7 Employer Privacy Policy — NEW document, built on the worker Privacy structure

Same 9 headings plus the shared §10. Changed for employers: §1 (employer account, company, worksite,
billing data; no card data on our servers); §2 (billing, contact replies, tax); §3 (what assigned
workers see; providers listed in §10.2; keeps the approved Google Analytics and Render / Neon rows by
reference); §5 (sign-in by texted code instead of password hashes); §9 adds "Closing your employer
account" (email, 30 days). §10 is the shared section with employer rows: OpenStreetMap (Nominatim)
address lookup and the browser speech service (Google/Apple) for "Speak", plus 10.4 "Information about
your business".

### 1.8 Arabic

Worker and employer pages in Arabic show a short Arabic summary stating that the French and English
versions govern, followed by the full English text. Not a translation. Confirm this is acceptable.

### 1.9 Sign-up records the accepted version

Worker website, employer website and phone app send `acceptedLegalVersion: "2026-11-09"`; the API stores
it on the registration audit event (`reason = "legal_accepted:2026-11-09"`). Confirm this is enough
proof of consent (date, version, account), or whether a dedicated consent table is needed.

---

## 2. Assumptions a lawyer should check

1. **Personnel placement agency licence.** For short-term shifts Joblop supplies workers and pays them.
   Check whether a CNESST personnel-placement-agency licence is required and must be mentioned, and the
   joint (solidary) liability of agency and client for pecuniary obligations (Act respecting labour
   standards, s. 95). The employer Terms do not mention either.
2. **Who is the employer for short-term shifts.** The approved worker text says Joblop is not the
   employer "unless expressly stated in a separate written agreement"; the worker agreement in the app
   lets the worker be paid as an employee (source deductions). Confirm the wording on both sides.
3. **Liability cap** (employer §9, 3 months of fees) and removal of the consumer carve-out (§11).
4. **Charter of the French Language** (contracts of adhesion, s. 55): French and English are both
   published and declared equal. Check whether French must be presented first and English chosen
   expressly at sign-up.
5. **Consumer Protection Act** for Worker Pro (distance contract with an individual): cancellation,
   refunds and disclosure duties are not covered beyond "no automatic renewal".
6. **Google Analytics without a consent banner.** The Google tag loads whenever `GOOGLE_TAG_ID` is set,
   with no opt-in. Law 25 requires tracking technologies to be off by default. Recommend leaving
   `GOOGLE_TAG_ID` unset until a consent banner exists.
7. **Transfers outside Québec.** Law 25 requires a privacy impact assessment before communicating
   personal information outside Québec. The text does not claim one was done.
8. **Document images sent to Anthropic** (CV, certificate, photo, first-aid card). The images contain
   names and sometimes addresses and dates of birth and cannot be masked. Disclosed in 10.4; check that
   disclosure is enough or that express consent is needed.
9. **Profile completeness limits how many jobs a worker sees**, and **first eligible claim wins** a
   short shift. Disclosed as not being decisions based only on automated processing; confirm.
10. **Worker late-cancellation penalty** (7-day suspension, then closure) — fairness and labour-law fit.
11. **Retention** of 6 years for tax records is a general rule, not one coded anywhere. There is no
    automatic deletion job.
12. **Privacy Officer** named by title only ("Privacy Officer, 9375-7649 Québec Inc."). Law 25 lets the
    highest-ranking person act by default and requires publishing the title and contact on the website.
13. **Contact email.** The legal pages use `contact@joblop.com` (already on the worker legal pages and
    `/browse`). Elsewhere the code uses `info@joblop.com` (invoice issuer), `billing@joblop.com`
    (e-transfers) and `support@joblop.ca` (employer /contact page). Confirm one inbox is monitored for
    privacy requests.
14. **No non-solicitation / direct-hire fee** exists in code, so none is in the employer Terms.
15. **Invoice payment terms (net days) and late fees** are not in code, so none are stated.
16. **"Stripe when card payments are available"** — card payments are off; the text says so.

## 3. Known conflicts in the approved October 26 text (kept word for word, overridden by §10/§15)

The instruction was to keep the approved clauses unchanged. These sentences are not accurate today;
the "this section applies" rule in §10/§15 is meant to cover them, but the lawyer may prefer to edit them:

- Privacy §1: "Password (stored only as a salted hash…)" — workers sign in with a texted code; an unused
  random password is stored.
- Privacy §1: "Mobile number — optional" — the mobile number is now required at sign-up (sign-in is by
  text message).
- Privacy §1: "Approximate geolocation (latitude/longitude) … to verify check-in and check-out" — the code
  does not use device location (geolocation is blocked); only addresses/postal codes are stored.
- Privacy §1: "We do not collect government identification numbers…" — the Documents page accepts
  identity documents and the social insurance number (now disclosed in 10.4).
- Privacy §3 table: "Render / Neon" — the database host could not be confirmed in code.
- Account-deletion page: "approximate geolocation" in the list of deleted data (not collected).

## 4. Facts that could not be verified in code

- Render region and the database host (Neon or Render Postgres).
- How workers' pay is actually sent (direct deposit or e-transfer).
- Whether RL-1 / RL slips are produced (only T4 / T4A appear; tax slips are marked synthetic). The text
  says "the tax slips required by law".
- Whether Worker Pro has GST/QST added.
- The 24-hour employer cancellation charge is published on `/pricing` and computed in
  `packages/shared/src/domain/cancellationObligation.ts`, but no billing code applies it yet.
- Plan discounts (5% / 8%) are capped in code so they can be smaller; the Terms say "as shown on the
  Plans page" instead of a fixed number.
- The live `TERMS_VERSION` / `PRIVACY_NOTICE_VERSION` env vars on Render (shown as `2026-11-01` on the
  old employer pages) must be changed to `2026-11-09` by the owner; they only gate employer sign-up.
