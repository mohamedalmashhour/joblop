# HR and Money Policy Decision Package

Release under review: `a4ef2680b6d1291454e126efc32704112cc83388`

Status: **OWNER AND PROFESSIONAL DECISIONS REQUIRED — ALL RUNTIME GATES FAIL CLOSED**

This package consolidates the nine deliberately skipped Contract Kit cases. It records questions
and implementation consequences; it does not provide legal, tax or accounting conclusions.
PostgreSQL concurrency tests are not part of these nine decisions and pass separately against a
disposable loopback database.

## Decision matrix

| ID  | Decision                                                             | Mohamed may approve                                          | Québec lawyer/accountant required                                                                                                       | Required recorded output                                                                           | Gate unlocked                 |
| --- | -------------------------------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------- |
| D1  | Prohibited financial fields on worker, employer and public responses | Product-visible field inventory and stricter redaction       | Privacy/legal confirms legally sensitive classifications and permitted disclosures                                                      | Versioned forbidden-field policy, DTO inventory, owner and effective date                          | C1 buyer-economics leak       |
| D2  | Financial routes, actors and separation of duties                    | Product workflow and proposed role names                     | Lawyer/accountant confirms which acts create authoritative financial records; Security approves least privilege                         | Route-by-route create/read/approve/issue/void/refund/settle matrix                                 | C2 wrong-role denial          |
| D3  | Marketplace-fee base and tax treatment                               | Contractual fee presentation independent of payment method   | Québec accountant/lawyer approves taxable base, discounts, credits, GST/QST interaction and disclosure                                  | Effective-dated fee formula, tax flags, examples and contract authority                            | C4 commission excludes tax    |
| D4  | Merchant, payer and settlement identity                              | Intended marketplace experience and provider preference      | Lawyer/accountant confirms legal merchant, invoice issuer, payer/payee chain, custody of funds and settlement evidence                  | Entity diagram, account owner, reconciliation source and authoritative settlement reference        | C5 no paid without settlement |
| D5  | Test/production payment-reference separation                         | Test mode remains default-off and production remains blocked | Security/provider owner confirms account boundaries, key ownership and reference formats                                                | Approved account inventory, prefix/object classifier, secret references and negative vectors       | C5b reject test references    |
| D6  | Québec GST/QST and place of supply                                   | Product may require configurable, effective-dated tax rules  | Québec accountant/lawyer must approve registration status, supply classification, place of supply, exemptions and filing responsibility | Signed tax-policy version, registrations by issuer model and calculation vectors                   | C6 fail-closed jurisdiction   |
| D7  | Authoritative contractual terms and versioning                       | Product may approve UX and acceptance checkpoints            | Lawyer confirms governing contract, amendment/notice/consent requirements and evidentiary retention                                     | Immutable terms identifier, checksum, effective date, acceptance actor/time and supersession rules | C7 issued terms frozen        |
| D8  | Double-booking override policy                                       | Product may choose whether an override feature is desired    | Legal/operations confirms permissible exceptions; Security approves approver separation and audit evidence                              | Default denial, exact override roles, reason codes, expiry and incident review                     | C8 no double booking          |
| D9  | Financial audit retention, deletion and legal hold                   | Product may approve operational access and search UX         | Privacy lawyer/accountant confirms retention periods, deletion restrictions, legal hold, tax records and backup expiry                  | Record-class schedule, hold authority, access roles, deletion proof and jurisdiction               | C9 append-only audit          |

## Proposed safe defaults pending approval

These defaults are implementation guards, not business decisions:

1. No production financial field is exposed unless explicitly allowlisted.
2. No route creates or changes an authoritative financial record without a named capability.
3. Marketplace fee and taxes remain disabled when an effective approved configuration is absent.
4. `paid` and `settled` require an authoritative provider/reconciliation reference.
5. Test references are rejected whenever runtime mode is production.
6. Unknown jurisdiction, issuer, registration or place-of-supply state blocks issuance.
7. Issued terms and financial snapshots are immutable; corrections append linked records.
8. Double booking is denied; no override exists until D8 is approved.
9. Audit deletion is denied while retention or legal-hold policy is unknown.

## Approval boundaries

Mohamed can approve product intent, proposed UX, whether a feature should exist, default-off
behavior, contract-independent role labels and the choice to keep a feature disabled. Mohamed
cannot alone establish Québec tax treatment, legal worker classification, merchant/agency status,
invoice issuer, statutory record retention, legal-hold requirements or reportable T4A treatment.

For each decision, record the owner, professional adviser where required, policy/version identifier,
effective date, jurisdictions, approved examples, rejected examples and the exact release to which
the decision applies. Silence, a general launch request or approval of this document is not approval
of the nine underlying decisions.

## Implementation order after decisions

`D1 → D2 → D7 → D8 → D3 → D4 → D5 → D6 → D9`

Security DTO/route boundaries precede financial activation. Merchant and tax decisions precede any
production invoice or collection activation. Retention is required before staging evidence is
promoted to a launch record.
