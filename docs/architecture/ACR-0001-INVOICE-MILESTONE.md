# ACR-0001 — Invoice Generation Milestone

Status: **APPROVED FOR LOCAL FOUNDATION IMPLEMENTATION**

Decision date: 2026-07-30

Approval source: product-owner instruction in the Resident Workforce OS development record.

Base checkpoint: `2c623553d7351cc96c05e41bbc3944cab0ee3be3`

## Context

Earlier frozen contracts excluded invoice implementation together with payroll, payment execution
and tax policy. Product scope now requires employer invoice generation. This record changes that
boundary explicitly; historical documents remain unchanged as evidence of the earlier decision.

## Decision

Invoice generation is a required platform milestone. Local implementation may add:

- an invoice domain and lifecycle;
- a locked-timesheet source boundary;
- immutable calculation and commercial-rule snapshots;
- organization-scoped authorization, idempotency and concurrency controls;
- append-only audit and correction/credit-note relationships;
- downloadable PDF and email-delivery ports backed only by deterministic local/fake adapters;
- synthetic fixtures and cross-organization denial tests.

Invoice issuance remains separate from payment execution. No invoice event charges a card, moves
money, proves settlement or sends a real email.

## Required lifecycle

The milestone must represent, where applicable:

`draft`, `approved`, `issued`, `sent`, `viewed`, `partially_paid`, `paid`, `overdue`,
`disputed`, `voided`, and `refunded`.

An issued invoice is immutable. Corrections use a new credit note or replacement record linked to
the original; they never rewrite the issued calculation snapshot or audit history.

## Calculation boundary

The future versioned calculation must be capable of representing:

- regular billable hours;
- urgent rates;
- approved travel time;
- mileage;
- taxes;
- adjustments;
- subtotal and total.

The local milestone uses versioned, effective-dated synthetic policies. CAD is the only initially
supported currency and every monetary value stores integer minor units. GST and QST are rounded
independently to the nearest minor unit using integer half-up arithmetic. A configured rate alone
does not activate tax: registration status, supply classification, place-of-supply policy,
treatment and effective date must all permit it. Production calculation and issuance fail closed
until the applicable legal policies are supplied and approved.

All monetary values use integer minor units with explicit currency through the existing Money
Engine. Mixed-currency arithmetic and floating-point money calculations remain prohibited.

## Superseded exclusions

The blanket exclusion of all invoice implementation is superseded only to the extent stated in
this ACR. References saying that Timesheet or Attendance does not itself create an invoice remain
valid. References saying invoice work requires an Architecture Change Record are satisfied by
this record for the local foundation scope.

The following remain excluded:

- automatic card charging or bank debit;
- live payment processors or settlement claims;
- payroll, worker payout and statutory deduction execution;
- real email delivery;
- tax filing, remittance or invented GST/HST/QST treatment;
- accounting-ledger posting;
- production or external staging activity.

## Independent-worker and T4A boundary

Resident Workforce OS is intended to operate as a marketplace, not a worker agency or employer of
record. Workers are intended to provide services as independent workers, and the platform is
intended to support applicable T4A reporting. This intent does not by itself establish legal
classification. The implemented relationship must satisfy the applicable CRA and Revenu Québec
tests, and an uncertain case must fail closed pending a formal status determination.

Marketplace behavior must preserve the worker's ability to accept or decline opportunities and
must not invent platform authority over the professional manner in which services are performed.
Product, contract and operational controls must be reviewed together because actual control and
subordination can outweigh marketplace or independent-contractor labels.

T4A support is a separate reporting milestone downstream from verified payments. It must not:

- classify a worker merely from a profile flag or contract label;
- treat an issued invoice as a payment to a worker;
- create a T4A from estimated, invoiced, authorized or unsettled amounts;
- include GST/HST/QST in a fees-for-services amount without approved reporting policy;
- file, amend or transmit a real slip during local development.

Local work may model synthetic reporting candidates and validation boundaries only after the
legal payer/reporting entity, recipient eligibility, box mapping, annual threshold,
amendment/cancellation rules, identifier handling, Québec information-return interaction and
retention policy are approved.

## Preconditions for production issuance

Before a production issuer model or invoice-number generator can be activated, owners must approve:

1. Québec and other jurisdictional GST/HST/QST applicability and rounding;
2. supported currency and precision policy;
3. invoice-number format, uniqueness scope, sequence ownership and gap handling;
4. payment terms, due-date and overdue policy;
5. employer rate, urgent-rate and adjustment policies;
6. travel-time and mileage eligibility, evidence, units, rates and rounding;
7. dispute, void, refund, credit-note and replacement behavior;
8. roles allowed to review, issue, mark paid, dispute, void and refund;
9. PDF content, legal identity, registration numbers and record-retention requirements;
10. email consent, recipient policy, templates, retries and delivery evidence.

## Consequences

- Invoice domain, schema, migration, local numbering, PDF and fake-delivery work can proceed with
  synthetic Test Employer Organization A/B data.
- Supported issuer models are `platform_principal`, `worker_supplier`, and `self_billing_agent`;
  all remain disabled in production pending legal approval.
- Payment execution remains a separate future Architecture Change Record.
- External launch gates remain unchanged.
