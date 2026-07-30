# Invoice Milestone Implementation Plan

Status: **FOUNDATION AUTHORIZED — FINANCIAL POLICY BLOCKED**

Authority: `ACR-0001-INVOICE-MILESTONE.md`

## Sequenced implementation

| Phase | Locally executable scope                                                                                            | Blocker                                                                             |
| ----- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| I1    | Domain states, immutable source/snapshot contracts, transition guards and correction links                          | None                                                                                |
| I2    | Local repository interfaces, deterministic fake PDF/email ports, idempotency and organization-isolation tests       | I1                                                                                  |
| I3    | Prisma models and unapplied migration for invoices, snapshots, lines, credit notes, deliveries and audit references | Database-owner review of exact schema                                               |
| I4    | Calculation engine for hours, urgent rates, travel, mileage, taxes and adjustments                                  | Approved commercial, tax, currency and rounding policies                            |
| I5    | Invoice numbering and issue transaction                                                                             | Approved numbering policy and issuer roles                                          |
| I6    | Employer/admin APIs and review UI backed by persistence                                                             | I3–I5 and authorization review                                                      |
| I7    | PDF rendering and local/fake email delivery                                                                         | Approved document fields and recipient policy                                       |
| I8    | External email, settlement evidence and payment execution                                                           | Separate external authorization and later ACR                                       |
| I9    | Synthetic T4A reporting candidates derived from verified worker payments                                            | Confirmed independent-worker status and approved CRA/Revenu Québec reporting policy |

## Initially affected files

Foundation:

- `packages/shared/src/domain/invoice.ts`
- `packages/shared/src/domain/invoice.test.ts`
- `packages/shared/src/domain/index.ts`

Later repository/schema work:

- `packages/database/prisma/schema.prisma`
- a new unapplied migration under `packages/database/prisma/migrations/`
- `packages/auth/src/index.ts` and focused authorization/repository tests
- `apps/api/src/app.ts` and focused route tests

Later employer and document work:

- `apps/employer/app/employer/invoices/**`
- a local invoice PDF adapter and tests
- a local/fake invoice-delivery adapter and tests

Evidence:

- `docs/architecture/LOCAL_BLOCKER_LEDGER_2026-07-29.md`
- `docs/runbooks/EXTERNAL_EVIDENCE_MATRIX.md`

## Required test matrix

- locked versus unlocked/disputed/corrected Timesheet source;
- organization ownership on every invoice, line, snapshot, credit note, PDF and delivery path;
- wrong-role, unauthenticated and cross-organization denial;
- duplicate generation and issue idempotency;
- stale-version and concurrent-issue conflict;
- immutable issued snapshot and append-only correction/audit behavior;
- mixed-currency, overflow and missing-policy failure;
- fake PDF determinism and fake delivery idempotency;
- proof that issue/send/view events never mark an invoice paid;
- proof that no live provider or real personal/customer data is used.

## Owner decisions still required

| Decision                                                                   | Required owner                           |
| -------------------------------------------------------------------------- | ---------------------------------------- |
| Québec GST/QST and other tax treatment                                     | Finance/Tax and Legal                    |
| Invoice numbering and legal issuer identity                                | Finance/Accounting and Legal             |
| Payment terms, overdue timing and currency                                 | Finance and Product                      |
| Regular/urgent employer billing rules                                      | Commercial/Product and Finance           |
| Travel-time and mileage method                                             | Commercial/Product, Finance and Legal    |
| Adjustments, disputes, voids, refunds and credit notes                     | Finance/Accounting, Legal and Operations |
| Review, issue, paid, void and refund permissions                           | Security, Finance and Operations         |
| PDF legal fields and retention                                             | Finance/Accounting, Legal and Privacy    |
| Email recipients, consent and retention                                    | Privacy, Security and Operations         |
| Independent-worker classification evidence and re-evaluation               | Legal, Worker Operations and Tax         |
| Marketplace contract chain and legal payer/reporting entity                | Legal, Tax/Accounting and Product        |
| T4A recipient eligibility, box mapping, thresholds, corrections and filing | Tax/Accounting and Legal                 |
