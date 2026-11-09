# Legal review notes — Terms and Privacy, version 2026-11-11

For: the Québec lawyer reviewing Joblop (9375-7649 Québec Inc., operating as Joblop).
Effective date of the current text: **2026-11-11**. Version string: `2026-11-11`
(`packages/shared/src/domain/legalDocuments.ts`, `LEGAL_DOCUMENTS_VERSION`).

**What changed in 2026-11-11 (versus 2026-11-10):** a new Privacy Policy section 11 "Artificial
intelligence (AI) features" was ADDED to the worker and employer policies (EN and FR), plus one Arabic
summary line on each. No existing sentence was edited. The full new text is in section 5 below. The page
header now reads "Effective November 11, 2026".

**What changed in 2026-11-10 (versus 2026-11-09):** four sentences of the approved October 26 worker
Privacy Policy no longer matched how the app works. Only those sentences were edited, in English and in
the French translation. See section 0 below for the exact old and new wording. Everything else in the
approved text is unchanged, word for word. Sections 1 to 4 describe the 2026-11-09 changes and still
apply.

## 0. Version 2026-11-10 — the four corrected sentences (worker Privacy Policy §1)

Files: English `apps/worker/app/legal/content.tsx`, French `apps/worker/app/legal/workerLegalFr.ts`.
What the code does, checked before editing:

- Sign-in: workers sign in only with a one-time code texted to their mobile number (website and phone
  app). Sign-up stores a random password nobody sees or uses (`apps/worker/app/api/session/sign-up/route.ts`).
- Mobile number: required at sign-up (at least 10 digits).
- Location: neither the website nor the phone app reads the device location. Check-in and check-out
  send no location (`apps/worker/app/schedule/MySchedule.tsx`, `apps/mobile/src/auth/secureSession.ts`).
- Government ID: the Documents page accepts identity documents and the social insurance number
  (already disclosed in Privacy §10.4).

### 0.1 Account information list — password

- EN old: "Password (stored only as a salted hash — we never store your password in plain text)"
- EN new: "Sign-in codes: you sign in with a one-time code texted to your mobile number; you do not create or enter a password"
- FR old: « Mot de passe (conservé uniquement sous forme de hachage salé — nous ne conservons jamais votre mot de passe en clair) »
- FR new: « Codes de connexion : vous vous connectez avec un code à usage unique envoyé par texto à votre numéro de cellulaire; vous ne créez ni n’entrez de mot de passe »

### 0.2 Account information list — mobile number optional

- EN old: "Mobile number — optional; collected only if you choose to provide it (for shift alerts and account recovery)"
- EN new: "Mobile number — required; used to sign you in with a texted code and for shift alerts and urgent notices"
- FR old: « Numéro de cellulaire — facultatif; recueilli seulement si vous choisissez de le fournir (pour les alertes de quart et la récupération du compte) »
- FR new: « Numéro de cellulaire — obligatoire; utilisé pour vous connecter avec un code envoyé par texto, ainsi que pour les alertes de quart et les avis urgents »

### 0.3 Profile and location list — location used for check-in

- EN old: "Approximate geolocation (latitude/longitude) used to match you with nearby work and, for workers, to verify check-in and check-out at a work site when you choose to clock in"
- EN new: "Approximate geolocation (latitude/longitude) used to match you with nearby work. We do not use your location to verify check-in or check-out."
- FR old: « Géolocalisation approximative (latitude/longitude) utilisée pour vous jumeler à du travail à proximité et, pour les travailleurs, pour vérifier l’arrivée et le départ sur un lieu de travail lorsque vous choisissez de pointer »
- FR new: « Géolocalisation approximative (latitude/longitude) utilisée pour vous jumeler à du travail à proximité. Nous n’utilisons pas votre localisation pour vérifier l’arrivée ou le départ. »

### 0.4 Closing paragraph of §1 — mobile number optional and "no government ID numbers"

- EN old: "Your mobile number is optional — we collect it only if you choose to provide it, and use it for shift alerts and account recovery. We do not collect government identification numbers or payment card details through the app."
- EN new: "Your mobile number is required — we use it to sign you in with a texted code and for shift alerts and urgent notices. If you upload them on the Documents page, we collect identity documents and your social insurance number (a government identification number) to check that you can work and to set up your pay. We do not collect payment card details through the app."
- FR old: « Votre numéro de cellulaire est facultatif — nous le recueillons seulement si vous choisissez de le fournir, et nous l’utilisons pour les alertes de quart et la récupération du compte. Nous ne recueillons pas de numéros d’identification gouvernementaux ni de renseignements de carte de paiement au moyen de l’application. »
- FR new: « Votre numéro de cellulaire est obligatoire — nous l’utilisons pour vous connecter avec un code envoyé par texto, ainsi que pour les alertes de quart et les avis urgents. Si vous les téléversez sur la page Documents, nous recueillons des pièces d’identité et votre numéro d’assurance sociale (un numéro d’identification gouvernemental) pour vérifier que vous pouvez travailler et pour établir votre paie. Nous ne recueillons pas de renseignements de carte de paiement au moyen de l’application. »

(The surrounding sentence "We do not knowingly collect information from anyone under 18; Joblop is
intended for adults." is unchanged.)

### 0.5 Arabic summary — no change needed

The Arabic privacy summary (`workerPrivacyArabic` in `apps/worker/app/legal/workerLegalUpdates.ts`)
already says sign-in is by texted code, lists the mobile number among collected data, mentions uploaded
documents, and says nothing about check-in location or government ID. None of the four out-of-date
statements appears in it, so it was not edited.

### 0.6 Left as is (please confirm)

- Privacy §5 "Passwords are stored only as salted hashes." — still true: the unused random password is
  stored as a salted hash.
- Account-deletion page: "approximate geolocation" in the list of deleted data, and "sign-in
  credentials" — not one of the four statements; kept verbatim.

---


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

- Fixed in version 2026-11-10 (see section 0): the Privacy §1 sentences on the password, the optional
  mobile number, check-in location and "no government identification numbers".
- Privacy §3 table: "Render / Neon" — the database host could not be confirmed in code.
- Account-deletion page: "approximate geolocation" in the list of deleted data (not collected).

## 4. Facts that could not be verified in code

- Render region and the database host (Neon or Render Postgres).
- How workers' pay is actually sent (direct deposit or e-transfer).
- Whether RL-1 / RL slips are produced (only T4 / T4A appear; tax slips are marked synthetic). The text
  says "the tax slips required by law".
- Whether Worker Pro has GST/QST added.
- The 24-hour employer cancellation charge published on `/pricing` is billed since 2026-11-10: 6 hours
  per confirmed worker on the employer's invoice, plus GST/QST. Owner decision 2026-11-09: workers are
  not paid automatically for a late employer cancellation; Joblop keeps the charge and reviews each case
  with the worker. The worker "How it works" page no longer promises 3 hours of pay.
- Plan discounts (5% / 8%) are capped in code so they can be smaller; the Terms say "as shown on the
  Plans page" instead of a fixed number.
- The live `TERMS_VERSION` / `PRIVACY_NOTICE_VERSION` env vars on Render (shown as `2026-11-01` on the
  old employer pages) must be changed to `2026-11-09` by the owner; they only gate employer sign-up.

---

## 5. Privacy Policy section 11 "Artificial intelligence (AI) features" — added 2026-11-11, for lawyer review

**Status: added 2026-11-11, for lawyer review.** New text only; sections 1 to 10 are unchanged.
Source: `packages/shared/src/domain/legalAiFeatures.ts` (appended by `privacyAdditions`, so it shows on
the worker `/privacy` page in EN and FR, under the Arabic summary in EN, and on the employer `/privacy`
page in EN and FR). Arabic summary lines: `workerPrivacyArabic` (`apps/worker/app/legal/workerLegalUpdates.ts`)
and `privacyAr` (`apps/employer/app/legal/employerLegal.ts`).

### 5.1 What the code does (checked 2026-11-11, after launch step 6)

- Only three features can call Anthropic, all through one module (`apps/api/src/outsideAi.ts`):
  `contact_chat` (worker and employer "Contact Joblop", website and phone app), `staff_assistant`
  (staff "Ask" on the contact desk) and `cv_builder` (Worker Pro CV builder and the staff CV wizard).
- That module refuses any image, document or base64 content, refuses text that still names health
  details, times out after 20 seconds, and has a kill switch (`AI_OUTSIDE_CALLS=disabled`). Its logs hold
  feature, model, outcome, latency, size and HTTP status, never text.
- Document pre-check no longer uses AI (`apps/api/src/documentAiReview.ts`): it reads only our own record
  (type, expiry) and never opens the file; a person decides.
- Contact chat: health, safety, dispute, account and "talk to a person" messages go to staff without the
  AI (`instantContact.ts`). The AI receives a first name (worker) or company name (employer) and the
  person's own recent records, all through the privacy filter.
- CV builder: name, email and phone are never sent; on any failure, limit or kill switch the worker gets
  the basic offline CV. CV AI use is counted in `ai_usage_events` (feature, account, time; no text).
- "Speak": browser Web Speech API only (`DictationButton.tsx`); no request to Joblop's servers.
- No AI feature has tools: AI cannot change pay, shifts, invoices, accounts or assignments. Suspensions
  and closures are staff actions (`/platform/workers/:id/apply-cancellation-penalty`).

### 5.2 Points to confirm

1. **Overlap with §10.2 and §10.4 (draft text, not edited).** §10.2 (worker row) still says an image of a
   document may go to Anthropic for a pre-check, and §10.4 says "an image of the document may be sent to
   Anthropic". Since step 6 this is no longer true. §11 says so and overrides §10 ("If anything in this
   section is different from sections 1 to 10, this section applies"). Recommend deleting those two
   sentences at the next edit. Item 8 of section 2 above is therefore resolved in code.
2. **Names.** The filter does not mask names typed in free text (for example a co-worker's or a manager's
   name). The account's full name, email and phone are not sent. §11 says this plainly and asks people not
   to type other people's names. Confirm this is enough, or ask for name masking in code.
3. **No training / retention.** "Under our agreement with the provider" relies on Anthropic's commercial
   API terms. The owner must confirm Joblop's Anthropic account is under those terms; retention is left
   to the provider's terms with no number stated.
4. **Kept text.** The Contact Joblop conversation (including AI answers) and the worker's latest CV are
   stored in Joblop's database like other account content. §11 says so; they follow §10.7 retention.
5. **Law 25 s. 12.1.** §11 states no decision is based only on automated processing by AI. Rule-based
   features (job count by profile completeness, first eligible claim) are covered in §10.3, not here.
6. **Privacy impact assessment** before communicating information outside Québec (s. 17) is still not
   claimed (see item 7 of section 2).

### 5.3 Full new text

#### Worker — English

##### 11. Artificial intelligence (AI) features

This section explains when Joblop uses artificial intelligence (AI) and what happens to your information. It adds to sections 1 to 10. If anything in this section is different from sections 1 to 10, this section applies.

**11.1 Features that may use an outside AI provider**

These features may send text to Anthropic, an AI company in the United States (its AI is called Claude):

- The “Contact Joblop” chat assistant, on the website and in the phone app. It answers your message first. If it cannot help, a person on the Joblop team takes over.
- The staff assistant. When a Joblop staff member answers your message, they can ask the AI to suggest a reply. The staff member reads the suggestion and decides what to send.
- The CV and cover-letter builder for Worker Pro members, and the same builder when Joblop staff prepare a CV for you. Free members get a basic CV made by Joblop’s own software, with no outside AI.

No other Joblop feature sends your information to an outside AI. Document checks, job matching, search results, pay and invoices do not use an outside AI.

**11.2 What is sent**

Only the text needed for the request is sent:

- For the chat assistant: your message, the earlier messages in the same conversation, the topic you chose, and a short summary of your own Joblop records needed to answer (for example your first name, your recent shifts and their city, your timesheets, your pay statement totals and the status of your documents).
- For the staff assistant: the staff member’s question and the recent messages of your conversation.
- For the CV builder: the CV details you enter (such as your headline, area, experience, skills, languages, certifications and education) and, if you choose one, the job you are applying for.

Before anything is sent, Joblop’s software automatically masks or removes email addresses, phone numbers, street addresses and postal codes, social insurance numbers, bank account and card numbers, dates of birth, health-card, passport and driver’s licence numbers, and health details. Your full name, email address and phone number from your account are not sent: the chat assistant sees only your first name, and the CV builder adds your name and contact details back on Joblop’s side after the AI is done. Masking is automatic and may miss something, so please do not type private details, or other people’s names, that your request does not need.

No document, photo, scan or other image is ever sent to an outside AI; our software blocks it. The document pre-check described in section 10.4 no longer uses AI: a Joblop staff member checks your documents.

If a message mentions health (for example an illness, an injury, a pregnancy or a sick note), it is not sent to the AI. It goes straight to a person on the Joblop team. Messages about safety, a dispute or your account also go to a person. If CV details still mention health after masking, the AI is not used and you get the basic CV.

**11.3 What AI does not do**

AI does not make decisions about hiring, pay or the status of your account. No decision about you is based only on automated processing by AI (Québec’s Act respecting the protection of personal information in the private sector, section 12.1). The AI cannot change your pay, your shifts or your account: it only answers, drafts and suggests. Joblop staff review documents, settle disputes and decide anything that matters to you.

**11.4 Where the information goes and how long it is kept**

Anthropic processes the text in the United States, outside Québec. Under our agreement with the provider, Anthropic does not use this information to train its AI models. How long Anthropic keeps the text is set by its terms with us.

Joblop does not keep a separate copy of what is sent to the AI. Our records of AI use show only which feature was used, by which account, when, and the result (for example, whether it worked). They do not contain the text sent or received. What stays in your account is kept like any other content: your Contact Joblop conversation, including the assistant’s answers, and your latest CV.

**11.5 You can always talk to a person**

You never have to use the AI. In the chat, write that you want to talk to a person (for example “I want to talk to a person”) and your message goes to the Joblop team. You can also write your CV yourself. For any question about AI and your personal information, or to ask a person to review something the AI did, contact: Privacy Officer, 9375-7649 Québec Inc., 207-805 boul. Chomedey, Laval, QC H7V 0B1, Canada. Email: contact@joblop.com.

**11.6 Turning AI off**

Joblop can turn off all outside AI features at any time. The service then keeps working without them: chat messages go straight to a person on the Joblop team, and the CV builder gives you a basic CV made by Joblop’s own software. The same happens if the AI is slow or unavailable.

#### Worker — French

##### 11. Fonctions d’intelligence artificielle (IA)

La présente section explique quand Joblop utilise l’intelligence artificielle (IA) et ce qu’il advient de vos renseignements. Elle s’ajoute aux sections 1 à 10. Si un élément de la présente section diffère des sections 1 à 10, la présente section s’applique.

**11.1 Fonctions qui peuvent utiliser un fournisseur d’IA externe**

Les fonctions suivantes peuvent envoyer du texte à Anthropic, une entreprise d’IA située aux États-Unis (son IA s’appelle Claude) :

- L’assistant de clavardage « Contacter Joblop », sur le site Web et dans l’application mobile. Il répond en premier à votre message. S’il ne peut pas vous aider, une personne de l’équipe Joblop prend le relais.
- L’assistant du personnel. Lorsqu’un membre du personnel de Joblop répond à votre message, il peut demander à l’IA de suggérer une réponse. Le membre du personnel lit la suggestion et décide de ce qui est envoyé.
- Le générateur de CV et de lettre de présentation pour les membres Worker Pro, ainsi que le même générateur lorsque le personnel de Joblop prépare un CV pour vous. Les membres gratuits reçoivent un CV de base produit par le logiciel de Joblop, sans IA externe.

Aucune autre fonction de Joblop n’envoie vos renseignements à une IA externe. La vérification des documents, le jumelage des emplois, les résultats de recherche, la paie et la facturation n’utilisent pas d’IA externe.

**11.2 Ce qui est envoyé**

Seul le texte nécessaire à la demande est envoyé :

- Pour l’assistant de clavardage : votre message, les messages précédents de la même conversation, le sujet choisi et un court résumé de vos propres dossiers Joblop nécessaires pour répondre (par exemple votre prénom, vos quarts récents et leur ville, vos feuilles de temps, les totaux de vos relevés de paie et l’état de vos documents).
- Pour l’assistant du personnel : la question du membre du personnel et les messages récents de votre conversation.
- Pour le générateur de CV : les renseignements du CV que vous saisissez (comme votre titre, votre région, votre expérience, vos compétences, vos langues, vos certifications et votre formation) et, si vous en choisissez un, l’emploi visé.

Avant tout envoi, le logiciel de Joblop masque ou retire automatiquement les adresses courriel, les numéros de téléphone, les adresses et codes postaux, les numéros d’assurance sociale, les numéros de compte bancaire et de carte, les dates de naissance, les numéros de carte d’assurance maladie, de passeport et de permis de conduire, ainsi que les renseignements de santé. Votre nom complet, votre adresse courriel et votre numéro de téléphone inscrits à votre compte ne sont pas envoyés : l’assistant de clavardage voit seulement votre prénom, et le générateur de CV ajoute votre nom et vos coordonnées du côté de Joblop une fois le travail de l’IA terminé. Le masquage est automatique et peut laisser passer un élément; veuillez donc ne pas taper de renseignements privés, ni le nom d’autres personnes, dont votre demande n’a pas besoin.

Aucun document, aucune photo, aucune numérisation ni aucune autre image n’est jamais envoyé à une IA externe; notre logiciel le bloque. La vérification préalable des documents décrite à la section 10.4 n’utilise plus l’IA : un membre du personnel de Joblop vérifie vos documents.

Si un message mentionne la santé (par exemple une maladie, une blessure, une grossesse ou un billet médical), il n’est pas envoyé à l’IA. Il est transmis directement à une personne de l’équipe Joblop. Les messages portant sur la sécurité, un différend ou votre compte sont aussi transmis à une personne. Si les renseignements du CV mentionnent encore la santé après le masquage, l’IA n’est pas utilisée et vous recevez le CV de base.

**11.3 Ce que l’IA ne fait pas**

L’IA ne prend aucune décision concernant l’embauche, la rémunération ou l’état de votre compte. Aucune décision vous concernant n’est fondée uniquement sur un traitement automatisé par l’IA (Loi sur la protection des renseignements personnels dans le secteur privé du Québec, article 12.1). L’IA ne peut pas modifier votre rémunération, vos quarts ou votre compte : elle répond, rédige et suggère seulement. Le personnel de Joblop examine les documents, règle les différends et décide de tout ce qui est important pour vous.

**11.4 Où vont les renseignements et combien de temps ils sont conservés**

Anthropic traite le texte aux États-Unis, à l’extérieur du Québec. Selon notre entente avec le fournisseur, Anthropic n’utilise pas ces renseignements pour entraîner ses modèles d’IA. La durée pendant laquelle Anthropic conserve le texte est fixée par ses conditions avec nous.

Joblop ne conserve pas de copie distincte de ce qui est envoyé à l’IA. Nos registres d’utilisation de l’IA indiquent seulement la fonction utilisée, le compte, le moment et le résultat (par exemple, si la demande a fonctionné). Ils ne contiennent pas le texte envoyé ou reçu. Ce qui reste dans votre compte est conservé comme tout autre contenu : votre conversation « Contacter Joblop », y compris les réponses de l’assistant, et votre dernier CV.

**11.5 Vous pouvez toujours parler à une personne**

Vous n’êtes jamais obligé d’utiliser l’IA. Dans le clavardage, écrivez que vous voulez parler à une personne (par exemple « Je veux parler à une personne ») et votre message est transmis à l’équipe Joblop. Vous pouvez aussi rédiger votre CV vous-même. Pour toute question sur l’IA et vos renseignements personnels, ou pour demander qu’une personne révise ce que l’IA a fait, communiquez avec : Responsable de la protection des renseignements personnels, 9375-7649 Québec Inc., 207-805 boul. Chomedey, Laval, QC H7V 0B1, Canada. Courriel : contact@joblop.com.

**11.6 Désactivation de l’IA**

Joblop peut désactiver toutes les fonctions d’IA externe en tout temps. Le service continue alors de fonctionner sans elles : les messages du clavardage sont transmis directement à une personne de l’équipe Joblop, et le générateur de CV vous remet un CV de base produit par le logiciel de Joblop. Il en va de même si l’IA est lente ou non disponible.

#### Employer — English

##### 11. Artificial intelligence (AI) features

This section explains when Joblop uses artificial intelligence (AI) and what happens to your information. It adds to sections 1 to 10. If anything in this section is different from sections 1 to 10, this section applies.

**11.1 Features that may use an outside AI provider**

These features may send text to Anthropic, an AI company in the United States (its AI is called Claude):

- The “Contact Joblop” chat assistant. It answers your message first. If it cannot help, a person on the Joblop team takes over.
- The staff assistant. When a Joblop staff member answers your message, they can ask the AI to suggest a reply. The staff member reads the suggestion and decides what to send.

No other Joblop feature sends your information to an outside AI. Document checks, job matching, search results, pay and invoices do not use an outside AI.

**11.2 The “Speak” button**

The optional “Speak” button on the request form does not use Joblop’s servers or Anthropic. It uses the speech recognition built into your browser or device (for example Google in Chrome, Apple in Safari). Your voice goes directly from your browser to that company, under its own privacy terms. Joblop receives only the text that appears in the box, when you save the form. You can always type instead.

**11.3 What is sent**

Only the text needed for the request is sent:

- For the chat assistant: your message, the earlier messages in the same conversation, the topic you chose, and a short summary of your own Joblop records needed to answer (for example your company name, your recent requests and orders, your timesheets and your invoice totals).
- For the staff assistant: the staff member’s question and the recent messages of your conversation.

Before anything is sent, Joblop’s software automatically masks or removes email addresses, phone numbers, street addresses and postal codes, social insurance numbers, bank account and card numbers, dates of birth, health-card, passport and driver’s licence numbers, and health details. Your full name, email address and phone number from your account are not sent: the chat assistant sees your company name, not your own name. Masking is automatic and may miss something, so please do not type private details, or other people’s names, that your request does not need.

No document, photo, scan or other image is ever sent to an outside AI; our software blocks it.

If a message mentions health (for example an illness, an injury, a pregnancy or a sick note), it is not sent to the AI. It goes straight to a person on the Joblop team. Messages about safety, a dispute or your account also go to a person.

**11.4 What AI does not do**

AI does not make decisions about hiring, pay or the status of your account. No decision about you is based only on automated processing by AI (Québec’s Act respecting the protection of personal information in the private sector, section 12.1). The AI cannot change your requests, your invoices or your account: it only answers, drafts and suggests. Joblop staff settle disputes and decide anything that matters to you.

**11.5 Where the information goes and how long it is kept**

Anthropic processes the text in the United States, outside Québec. Under our agreement with the provider, Anthropic does not use this information to train its AI models. How long Anthropic keeps the text is set by its terms with us.

Joblop does not keep a separate copy of what is sent to the AI. Our records of AI use show only which feature was used, by which account, when, and the result (for example, whether it worked). They do not contain the text sent or received. What stays in your account is kept like any other content: your Contact Joblop conversation, including the assistant’s answers.

**11.6 You can always talk to a person**

You never have to use the AI. In the chat, write that you want to talk to a person (for example “I want to talk to a person”) and your message goes to the Joblop team. For any question about AI and your personal information, or to ask a person to review something the AI did, contact: Privacy Officer, 9375-7649 Québec Inc., 207-805 boul. Chomedey, Laval, QC H7V 0B1, Canada. Email: contact@joblop.com.

**11.7 Turning AI off**

Joblop can turn off all outside AI features at any time. The service then keeps working without them: chat messages go straight to a person on the Joblop team. The same happens if the AI is slow or unavailable.

#### Employer — French

##### 11. Fonctions d’intelligence artificielle (IA)

La présente section explique quand Joblop utilise l’intelligence artificielle (IA) et ce qu’il advient de vos renseignements. Elle s’ajoute aux sections 1 à 10. Si un élément de la présente section diffère des sections 1 à 10, la présente section s’applique.

**11.1 Fonctions qui peuvent utiliser un fournisseur d’IA externe**

Les fonctions suivantes peuvent envoyer du texte à Anthropic, une entreprise d’IA située aux États-Unis (son IA s’appelle Claude) :

- L’assistant de clavardage « Contacter Joblop ». Il répond en premier à votre message. S’il ne peut pas vous aider, une personne de l’équipe Joblop prend le relais.
- L’assistant du personnel. Lorsqu’un membre du personnel de Joblop répond à votre message, il peut demander à l’IA de suggérer une réponse. Le membre du personnel lit la suggestion et décide de ce qui est envoyé.

Aucune autre fonction de Joblop n’envoie vos renseignements à une IA externe. La vérification des documents, le jumelage des emplois, les résultats de recherche, la paie et la facturation n’utilisent pas d’IA externe.

**11.2 Le bouton « Parler »**

Le bouton facultatif « Parler » du formulaire de demande n’utilise ni les serveurs de Joblop ni Anthropic. Il utilise la reconnaissance vocale intégrée à votre navigateur ou à votre appareil (par exemple Google dans Chrome, Apple dans Safari). Votre voix est transmise directement de votre navigateur à cette entreprise, selon ses propres conditions de confidentialité. Joblop reçoit seulement le texte qui apparaît dans la case, lorsque vous enregistrez le formulaire. Vous pouvez toujours taper le texte à la place.

**11.3 Ce qui est envoyé**

Seul le texte nécessaire à la demande est envoyé :

- Pour l’assistant de clavardage : votre message, les messages précédents de la même conversation, le sujet choisi et un court résumé de vos propres dossiers Joblop nécessaires pour répondre (par exemple le nom de votre entreprise, vos demandes et commandes récentes, vos feuilles de temps et les totaux de vos factures).
- Pour l’assistant du personnel : la question du membre du personnel et les messages récents de votre conversation.

Avant tout envoi, le logiciel de Joblop masque ou retire automatiquement les adresses courriel, les numéros de téléphone, les adresses et codes postaux, les numéros d’assurance sociale, les numéros de compte bancaire et de carte, les dates de naissance, les numéros de carte d’assurance maladie, de passeport et de permis de conduire, ainsi que les renseignements de santé. Votre nom complet, votre adresse courriel et votre numéro de téléphone inscrits à votre compte ne sont pas envoyés : l’assistant de clavardage voit le nom de votre entreprise, et non votre propre nom. Le masquage est automatique et peut laisser passer un élément; veuillez donc ne pas taper de renseignements privés, ni le nom d’autres personnes, dont votre demande n’a pas besoin.

Aucun document, aucune photo, aucune numérisation ni aucune autre image n’est jamais envoyé à une IA externe; notre logiciel le bloque.

Si un message mentionne la santé (par exemple une maladie, une blessure, une grossesse ou un billet médical), il n’est pas envoyé à l’IA. Il est transmis directement à une personne de l’équipe Joblop. Les messages portant sur la sécurité, un différend ou votre compte sont aussi transmis à une personne.

**11.4 Ce que l’IA ne fait pas**

L’IA ne prend aucune décision concernant l’embauche, la rémunération ou l’état de votre compte. Aucune décision vous concernant n’est fondée uniquement sur un traitement automatisé par l’IA (Loi sur la protection des renseignements personnels dans le secteur privé du Québec, article 12.1). L’IA ne peut pas modifier vos demandes, vos factures ou votre compte : elle répond, rédige et suggère seulement. Le personnel de Joblop règle les différends et décide de tout ce qui est important pour vous.

**11.5 Où vont les renseignements et combien de temps ils sont conservés**

Anthropic traite le texte aux États-Unis, à l’extérieur du Québec. Selon notre entente avec le fournisseur, Anthropic n’utilise pas ces renseignements pour entraîner ses modèles d’IA. La durée pendant laquelle Anthropic conserve le texte est fixée par ses conditions avec nous.

Joblop ne conserve pas de copie distincte de ce qui est envoyé à l’IA. Nos registres d’utilisation de l’IA indiquent seulement la fonction utilisée, le compte, le moment et le résultat (par exemple, si la demande a fonctionné). Ils ne contiennent pas le texte envoyé ou reçu. Ce qui reste dans votre compte est conservé comme tout autre contenu : votre conversation « Contacter Joblop », y compris les réponses de l’assistant.

**11.6 Vous pouvez toujours parler à une personne**

Vous n’êtes jamais obligé d’utiliser l’IA. Dans le clavardage, écrivez que vous voulez parler à une personne (par exemple « Je veux parler à une personne ») et votre message est transmis à l’équipe Joblop. Pour toute question sur l’IA et vos renseignements personnels, ou pour demander qu’une personne révise ce que l’IA a fait, communiquez avec : Responsable de la protection des renseignements personnels, 9375-7649 Québec Inc., 207-805 boul. Chomedey, Laval, QC H7V 0B1, Canada. Courriel : contact@joblop.com.

**11.7 Désactivation de l’IA**

Joblop peut désactiver toutes les fonctions d’IA externe en tout temps. Le service continue alors de fonctionner sans elles : les messages du clavardage sont transmis directement à une personne de l’équipe Joblop. Il en va de même si l’IA est lente ou non disponible.

#### Arabic summary lines

- Worker: الذكاء الاصطناعي (القسم 11): قد يُرسَل نص مساعد «تواصل مع Joblop» ومساعد الموظفين ومنشئ السيرة الذاتية إلى Anthropic في الولايات المتحدة بعد إخفاء بيانات الاتصال والمعلومات الصحية. لا تُرسَل أي وثيقة أو صورة. لا يتخذ الذكاء الاصطناعي قرارات بشأن التوظيف أو الأجر أو حسابك، ويمكنك دائماً طلب التحدث إلى شخص.
- Employer: الذكاء الاصطناعي (القسم 11): قد يُرسَل نص مساعد «تواصل مع Joblop» ومساعد الموظفين إلى Anthropic في الولايات المتحدة بعد إخفاء بيانات الاتصال والمعلومات الصحية. لا تُرسَل أي وثيقة أو صورة. زر «تحدّث» يستخدم خدمة الكلام في متصفحك وليس خوادم جوب‑لوب. لا يتخذ الذكاء الاصطناعي قرارات بشأن التوظيف أو الأجر أو حسابك، ويمكنك دائماً طلب التحدث إلى شخص.

## 6. Owner decision 2026-11-09: outdated section 10 image sentences removed

The owner approved removing the two section 10 statements that said a document image may be sent to Anthropic, which stopped being true at launch step 6. Worker 10.2 data row: "for the document pre-check, an image of the document" removed, EN and FR. Worker 10.4: the pre-check paragraph is replaced by "A Joblop staff member checks your documents. No document, photo or other image is sent to an outside AI." with the French equivalent.
