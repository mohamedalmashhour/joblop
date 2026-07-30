# ACR-0003 — Local Worker Payable and Payout Foundation

Status: **PROPOSED — OWNER, FINANCE AND LEGAL APPROVAL REQUIRED**

Record date: 2026-07-29

## Context

The approved invoice milestone keeps employer billing separate from worker pay. The approved local
payment-orchestration milestone covers employer collection only and explicitly excludes worker
payout. The frozen Payroll page remains unapproved for implementation, and the local completion
plan continues to exclude payroll, worker payments and tax.

A provider-neutral worker-payable or payout foundation therefore changes an approved architecture
boundary and requires its own Architecture Change Record. This proposal records the narrowest
safe local boundary; it does not authorize implementation.

Repository documents describe the product as an intended marketplace for independent workers.
That product intent is not a legal worker-classification determination. This record consequently
uses **worker payable** for a possible amount owed and **payout** for a possible money-movement
instruction. It does not treat either term as evidence of employment or contractor status.

A general instruction to begin “payroll” work is sufficient to prepare and review this proposal,
but it is not sufficiently specific to approve worker-payable implementation. In repository
terminology, statutory payroll remains excluded. The only foundation proposed here is the
marketplace worker-payable boundary described below.

## Proposed decision

After the required owners approve this record, local development may model a deterministic,
provider-neutral foundation using synthetic data and fake adapters only. The permitted foundation
would be limited to:

- a worker payable derived from an approved and locked timesheet plus an immutable, versioned
  compensation-policy snapshot;
- explicit payable review, hold, approval, cancellation and correction relationships;
- a payout instruction and append-only attempt history through a deterministic fake provider;
- opaque payout-destination references, never bank credentials or complete provider payloads;
- organization- and worker-scoped authorization, idempotency, optimistic concurrency and
  append-only audit evidence;
- synthetic fixtures for Test Employer Organization A and Test Employer Organization B;
- denial tests proving that neither organization can read or mutate the other's payable, payout,
  attempt, correction or administrative records.

No payable may be created from estimated attendance, an unlocked or disputed timesheet, an
invoice, an employer payment authorization, or an unsettled employer collection merely because
that upstream record exists.

## Required separation of records

The following facts must remain independently represented:

- attendance evidence;
- timesheet approval and locking;
- worker compensation calculation;
- employer invoice issuance;
- employer payment authorization, collection and settlement;
- worker-payable approval;
- payout instruction, provider acceptance and settlement;
- tax-reporting eligibility and filing.

Employer payment success does not prove worker payout. A submitted or accepted payout instruction
does not prove settlement. A worker-payable approval does not create an invoice, move money,
determine worker classification or establish tax-reporting eligibility.

Any future dependency between employer collection and worker payout requires an approved funding
policy. Until then, the system must not infer that a worker is payable only after an employer pays,
or that platform funds are available because an employer payment reports success.

## Fail-closed local boundary

Even after approval for local implementation, the foundation must not:

- calculate payroll deductions, source deductions, statutory pay, benefits, vacation pay,
  overtime, withholding, remittance or employer contributions;
- determine whether a worker is an employee, contractor or other legal category;
- create payroll runs, payslips, tax returns, T4A slips or Québec information returns;
- decide T4A eligibility, thresholds, box mappings, included amounts, amendments or cancellations;
- initiate real transfers, store real financial credentials, call a sandbox or live provider, or
  claim that money settled;
- post to an accounting ledger or create authoritative general-ledger balances;
- combine currencies, silently net negative adjustments, or rewrite approved calculation and
  payout history;
- expose one organization's records to another organization or expose worker financial details
  beyond an explicitly authorized role;
- send real notifications or use AI to calculate, approve, hold, cancel or initiate a payout.

Production and external staging must remain disabled until provider, security, financial, legal,
privacy and operational gates are separately approved and validated.

## Proposed minimum integrity rules

- Money uses integer minor units and an explicit currency.
- A payable references exactly one immutable source calculation and policy version.
- Corrections are append-only linked records; approved source amounts are never overwritten.
- State changes require an authorized human actor and an audit event.
- Duplicate commands and provider events are idempotent within their documented scope.
- Unknown provider outcomes remain unresolved pending governed evidence; they never become
  successful by timeout or retry count alone.
- Payout destination changes are separately authorized and cannot mutate an in-flight attempt.
- Organization scope is checked on every parent and child path, including indirect lookup paths.
- Local fixtures contain fictional organizations and synthetic workers only.

## T4A and tax-reporting boundary

ACR-0001 defines T4A support as a separate reporting milestone downstream from verified worker
payments. This proposal does not supersede that boundary. A locally settled fake payout may be
useful test input in a future approved reporting milestone, but it is not itself proof that a T4A
is required or that an amount belongs in a particular box.

No tax-reporting schema, candidate generator, slip, filing adapter or identifier-collection flow is
authorized by this proposal. Those require prior approval of the legal payer/reporting entity,
worker-classification process, recipient eligibility, reportable-amount policy, thresholds, box
mapping, correction rules, Québec interaction, privacy controls and retention.

## Decisions required before local implementation

| Decision | Required owner |
| --- | --- |
| Whether the platform may create worker payables and fake payout attempts locally | Product, Finance and Legal |
| Worker-classification evidence, review and re-evaluation process | Legal, Worker Operations and Tax |
| Legal payer, marketplace contract chain and source of payout funds | Legal, Finance/Accounting and Product |
| Compensation inputs, premiums, reimbursements, adjustments and rounding | Product, Finance, Worker Operations and Legal |
| Whether employer collection affects payable eligibility or payout timing | Finance, Product and Legal |
| Holds, disputes, corrections, reversals, failed payouts and recovery | Finance, Operations, Support and Legal |
| Approval roles and separation of duties | Security, Finance and Operations |
| Supported currencies, payout schedules, minimums and partial payouts | Finance and Product |
| Destination verification, privacy, retention and audit access | Security, Privacy, Finance and Legal |
| T4A payer, recipient eligibility, thresholds, box mapping and Québec interaction | Tax/Accounting and Legal |
| External provider, rails, reconciliation evidence and operational ownership | Finance, Security and Operations |

## Approval required to leave PROPOSED

This ACR may leave `PROPOSED` only when the development record contains all of the following:

1. explicit Product-owner approval of this ACR's marketplace worker-payable scope;
2. explicit Finance/Accounting approval of the legal payer, source of funds, compensation inputs,
   currency, rounding, payout timing, adjustment and reconciliation boundaries;
3. explicit Legal approval of the marketplace contract chain and the worker-classification
   evidence and re-evaluation process;
4. explicit Security and Operations approval of payable/payout roles, separation of duties,
   destination-change controls, holds, disputes and recovery;
5. explicit Tax/Accounting and Legal direction either approving a separately bounded T4A
   milestone or confirming that all T4A schema and behavior remain excluded.

Approvals may be recorded owner decisions in the development record; this ACR does not require a
new form. Silence, a general request to “start payroll,” approval of invoice or employer-payment
work, or approval of local development generally does not satisfy these specific gates.

Once items 1–5 are recorded, the status may advance only to local synthetic/fake-provider
implementation. Statutory payroll, tax reporting, real payout execution, external staging and
production require separate later authorization.

## Relationship to existing decisions

- ACR-0001 remains authoritative for employer invoices and the separate T4A boundary.
- ACR-0002 remains authoritative for employer payment orchestration.
- This proposal does not authorize Payroll page implementation or supersede any payroll, worker
  payout, tax, external-provider, staging or production exclusion.
- If approved, only the explicit local synthetic/fake-provider scope above would supersede the
  blanket exclusion of a worker-payable foundation. Every other exclusion remains in force.
