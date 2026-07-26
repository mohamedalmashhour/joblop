# Resident Job Contract Kit Phase 0/1 Gate Report

Status: READY FOR OWNER GATE REVIEW

This report covers Phase 0 and Phase 1 only.

No money authority, money layer, money schema, money migration, payroll, finance, invoice, payment, escrow, provider integration, `money.ts` change, push, merge, deploy, or commit is authorized or performed by this report.

Current HEAD: `f503c10`

## 1. Phase 0 Intake Review

### 1.1 Kit Location

The portable kit is present at:

```text
contracts/
```

Inventory:

```text
contracts/README.md
contracts/ISOLATION.md
contracts/VERSION
contracts/conformance/fixture.template.mjs
contracts/conformance/suite.mjs
contracts/security/appendOnlyAudit.mjs
contracts/security/economicsLeak.mjs
contracts/security/elevatedRoutes.mjs
contracts/security/enumeration.mjs
contracts/security/index.mjs
contracts/security/secretNotInProd.mjs
```

### 1.2 Version and Source

Version:

```text
Platform Contract Kit — v1
```

Source:

```text
branch: claude/intelligent-kilby-5ff258
commit: 97ffcb6
status: all 8 panel findings closed; full CORE conformance contract live; pilot scope enforced; suite green
```

### 1.3 Hash Inventory

| File | SHA-256 |
| --- | --- |
| `contracts/README.md` | `461241aa31696878c961f629f50454443ace0a5ad4735aaf3872f1c02c29de7f` |
| `contracts/ISOLATION.md` | `11881d9f1c498001fb37bb7ea65397e6dd6ab251e8ac558ab2a341642d3ce9a9` |
| `contracts/VERSION` | `655e18a394b01ff6f4d808e566664106ddfd05e6c9a8000528e836a56739008d` |
| `contracts/conformance/fixture.template.mjs` | `6d7bf9f7640ce0810a15aaaba420410f3ba7f175ba68e2486305ca9a21ea68e8` |
| `contracts/conformance/suite.mjs` | `8814c810443edc17a024a9c4b7bdd33f6d23cb425b7ab75b4a6eb5c6e7aacdc3` |
| `contracts/security/appendOnlyAudit.mjs` | `9164b79d461a7c5d320010917bf73ee407d65369c703b1dc0ae8c8763a4f1703` |
| `contracts/security/economicsLeak.mjs` | `51978b121a67fd7e92f5e6002629d76c0ba83cff5779f8f8018bcd523c3b55e1` |
| `contracts/security/elevatedRoutes.mjs` | `339b75c8daff9c2835a02ee60f91f11e24448b7602c82da1f078fd39924d954e` |
| `contracts/security/enumeration.mjs` | `1211f50aabb450a0f337a5637a25023ad888910181ee0534fd47b5cc6e4c9ca9` |
| `contracts/security/index.mjs` | `92a457bed70459277fe3451305fc76710f95ff2e8b9c28fa68e842401c553730` |
| `contracts/security/secretNotInProd.mjs` | `643a9df523b2174a89b038eb7d558cc0f4dc2ad9ffc1bfa6f604ec8be09b9705` |

### 1.4 Domain Neutrality

Result: ACCEPTED WITH FINDINGS FOR REVIEW

Evidence:

- The kit includes no SYBNB production fixtures.
- `contracts/README.md` states consumers supply their own fixtures.
- `contracts/VERSION` states SYBNB-specific fixtures are not included.
- Security helpers require platform-specific parameters instead of silently defaulting to SYBNB names.

Residual context:

- The kit documentation references SYBNB, STR, Host, Guest, Booking, Reservation, lodging, and commission terms as source/history or example concepts.
- These references are documentation/example context, not baked fixtures or required HR semantics.
- HR fixture binding must continue to reject STR-only behavior unless a domain-neutral invariant applies.

### 1.5 Secrets, PII, and Production Data Review

Result: NO LIVE SECRET, PII, OR PRODUCTION DATA FOUND IN THE KIT

Evidence:

- No production fixture records are included.
- No access keys, provider tokens, private keys, real tax identifiers, bank records, or live payment references were found in the kit.
- Text matches for terms such as `SIN`, `bank account`, `card`, and `production` appear only in prohibition/checklist language.

## 2. Actual CORE Invariant Inventory

The actual kit invariants are:

| Actual invariant | Kit method | Kit assertion | HR binding status |
| --- | --- | --- | --- |
| C1 no buyer-facing economics leak | `buyerFacingPayloads` | `findLeakedEconomicsKeys(json) === []` | Bound as future worker/employer payload privacy criterion; skipped in Phase 1 because no money payloads exist. |
| C2 sensitive routes reject unauth and wrong-role | `authz` | fixture returns no offending status strings | Bound as future money-route authz criterion; skipped in Phase 1 because no money-sensitive routes exist. Current-tree S1 scanner runs separately. |
| C3 one money model | No executable `suite.mjs` method in v1 kit | Owner-required binding: integer `amountMinor`, explicit `currency`, convert-then-sum, no mixed-currency arithmetic | Bound as Phase 1 skip and future Money Engine acceptance criterion. Satisfied only after CAD `money.ts` consumer migration and helper retirement. |
| C4 commission on base excluding tax | `commissionOnBaseExcludingTax` | low-tax and high-tax commission equal expected base commission | STR-specific wording. HR analog is platform margin allocation independent from payroll withholding and tax/deduction policy. Deferred until Finance. |
| C5 no paid without settlement reference | `settlementRef` | paid without ref is false | Bound to future Payment Execution. Deferred until payment provider boundary. |
| C5b sandbox settlement ref rejected in production | `sandboxRefRejectedInProd` | sandbox rejected in prod, real accepted in prod, sandbox allowed outside prod | Bound to future Payment Execution. Deferred until provider guard exists. |
| C6 fail-closed jurisdiction | `jurisdictionFailClosed` | charged while unconfirmed is false; confirmed is false | Bound to Employment Compliance and counsel-approved jurisdiction policy. |
| C7 frozen terms | `frozenTerms` | live rate changes while frozen record and statement remain unchanged | HR analog: agreed rate, employer terms, and policy versions do not restate approved Timesheet, Worker Offer, or Assignment evidence. |
| C8 no double-book | `noDoubleBook` | exactly one winner; no double allocation | HR analog: no double-assignment of one worker to overlapping assignments, attendance windows, or payable timesheets. |
| C9 append-only audit | `auditAppendOnly` | change appends before/after audit; mutationPaths empty | Bound to future money/config/consent changes and current audit static scan. |

## 3. Phase 1 HR Fixture Binding

Created HR fixture:

```text
tests/contracts/fixtures/hr-money.fixture.mjs
```

Created harness runner:

```text
tests/contracts/hr-money-conformance.test.mjs
```

The fixture intentionally supports no money invariants yet because the money layer does not exist.

Harness run:

```text
pnpm exec vitest run tests/contracts/hr-money-conformance.test.mjs --reporter=verbose
```

Result:

```text
Test Files  1 skipped (1)
Tests       9 skipped (9)
```

Interpretation:

- Harness loads and runs.
- Every executable kit invariant is visible.
- Owner-required C3 is bound separately because v1 `suite.mjs` has no C3 runner.
- Every invariant has a documented Phase 1 skip reason.
- No invariant is falsely reported green before implementation.
- Future phases must turn the relevant skipped invariant red first, then green as that phase builds.

## 4. Bound Invariant Matrix

| Actual invariant | HR fixture or future evidence | Per-phase acceptance criterion | Skip or defer reason |
| --- | --- | --- | --- |
| C1 no buyer-facing economics leak | Future worker/employer payload fixtures plus `findLeakedEconomicsKeys` with HR forbidden keys such as `platformMargin`, `platformFee`, `workerPayout`, `supplierPayout`, `netPayout`, `employerFundingInternal`, and provider economics keys. | Adapter/Finance phase must prove worker-visible surfaces never expose platform margin or internal provider economics. | Skipped now: no money payloads exist. |
| C2 authz | Future fixture makes unauthenticated and wrong-role calls to every money-sensitive route. Current-tree S1 scanner runs separately and is green for the existing elevated platform inventory. | Each money/payroll/finance/invoice/payment route rejects unauthenticated as 401 and wrong-role as 403 or safe 404. | Skipped now: no money routes exist. Future money routes must join the S1 non-zero known-inventory sweep. |
| C3 one money model | Future Money Engine fixture plus CAD-helper retirement inventory. | Money is represented only by the contract Money Engine with integer `amountMinor` plus explicit `currency`; convert-then-sum is enforced; mixed-currency arithmetic fails; all current `money.ts` consumers migrate and the CAD-only helper is deleted. | Skipped now: Money Engine is not authorized. |
| C4 commission-on-base | HR analog fixture for margin split after Finance authorization. | Platform margin allocation must be independent from CRA/Revenu Quebec withholding, worker deductions, and tax-policy changes. | Deferred: STR commission wording does not directly apply. HR analog applies later. |
| C5 settlement reference | Future payment fixture attempts paid state without settlement reference. | Paid/settled status cannot be created without real provider settlement reference. | Deferred: Payment Execution is last. |
| C5b sandbox-in-prod | Future payment guard fixture using `productionGuardOutcome`. | Sandbox/test provider references are rejected in production; real references accepted; sandbox allowed outside production. | Deferred: no provider boundary exists. |
| C6 jurisdiction fail-closed | Compliance fixture with unsupported/unapproved jurisdiction, missing classification, and counsel-unapproved policy. | No employer obligation, invoice, payroll obligation, or payout eligibility when jurisdiction is unconfirmed. | Deferred until Employment Compliance after counsel gate. |
| C7 frozen terms | Adapter/Compliance fixture with changed live rate after source terms are locked. | Approved Timesheet, Worker Offer terms, Assignment evidence, and issued statements remain based on frozen source terms. | Deferred until adapter/compliance has terms snapshots. |
| C8 no-double-book | Future assignment/timesheet overlap fixture using transactional store or transaction-level guard. | Exactly one claim/assignment/payable-timesheet path wins for overlapping worker commitments; no double allocation. | Deferred: current Assignment owns operational state; money fixture binds later. |
| C9 append-only audit | Future money/config/consent audit fixture plus static audit scan. | Money-relevant config and consent changes append immutable before/after rows and no mutation paths exist. | Deferred until money policy records exist; current audit scan is clean. |

## 5. Security Scanner Results Against Current Tree

### 5.1 Owner S1: Elevated-Route Authz Sweep With Non-Zero Assertion

Targeted validation command:

```text
pnpm exec vitest run tests/contracts/hr-security.test.mjs apps/api/src/app.test.ts --reporter=verbose
```

Result:

```text
tests/contracts/hr-security.test.mjs > HR contract security gate > discovers Fastify elevated routes through the kit scanner with non-zero known inventory PASS
```

Status: GREEN

Interpretation:

- HR now parses Fastify `app.get(...)`, `app.post(...)`, `app.patch(...)`, and `app.delete(...)` route declarations into a normalized route manifest consumed by the kit's `discoverElevatedRoutes` helper.
- The discovered count is non-zero.
- The discovered route inventory matches HR's known elevated `/platform/*` inventory for the current build phase.
- Money-authoritative routes remain absent.

Known current HR elevated-route inventory includes platform routes such as:

- `/platform/work-groups`
- `/platform/role-definitions`
- `/platform/job-requests/intake`
- `/platform/dispatches`
- `/platform/worker-offers`
- `/platform/assignments`
- `/platform/attendance`
- `/platform/timesheets`

Acceptance criterion:

- discovered route count must be non-zero
- discovered route inventory must match the known HR elevated route inventory for the current build phase
- each discovered route must be probed with unauthenticated and wrong-role access
- money-authoritative routes must remain absent until their approved phase

### 5.2 Owner S2: Secret-Not-In-Prod Static Scan

Command:

```text
node --input-type=module -e "import { findUngatedDevSecrets } from './contracts/security/index.mjs'; const targets = ['apps/api/src','apps/admin/app','apps/employer/app','apps/mobile/src']; const result = {}; for (const target of targets) result[target] = findUngatedDevSecrets(target, { token: 'devCode', buildFlag: 'process.env.NODE_ENV !== \"production\"' }); console.log(JSON.stringify(result, null, 2)); if (Object.values(result).some((items) => items.length > 0)) process.exit(1);"
```

Result:

```json
{
  "apps/api/src": [],
  "apps/admin/app": [],
  "apps/employer/app": [],
  "apps/mobile/src": []
}
```

Status: GREEN FOR CURRENT TREE

Interpretation:

- No ungated `devCode` production exposure was found.
- Future phases must repeat this with any future HR-specific dev secret tokens.

### 5.3 Owner S3: Rate-Limit and Enumeration

Targeted validation command:

```text
pnpm exec vitest run tests/contracts/hr-security.test.mjs apps/api/src/app.test.ts --reporter=verbose
```

Result:

```text
tests/contracts/hr-security.test.mjs > HR contract security gate > keeps auth responses enumeration-safe and proves auth rate limiting returns 429 PASS
apps/api/src/app.test.ts > api authentication foundation > rate-limits repeated sign-in attempts with a fail-closed 429 PASS
```

Status: INTERIM TEST-GREEN, PRODUCTION-HARDENING REQUIRED

Interpretation:

- Response-shape normalization is represented by existing safe authentication error behavior.
- A real endpoint probe now proves repeated sign-in attempts fail closed with HTTP 429.
- The rate limiter is auth-only and does not introduce money, workflow, schema, or persistence authority.
- The current limiter is intentionally minimal and in-memory. It is not production-grade because it can be bypassed across multiple instances or serverless cold starts and resets on process restart.

Hard pre-production task:

```text
Replace the current in-memory auth limiter with a distributed/shared-store limiter such as Upstash/Redis or approved edge rate limiting before HR receives production authentication traffic.
```

### 5.4 Kit S3: Append-Only Audit Static Scan

Command:

```text
node --input-type=module -e "import { findAuditMutationPaths } from './contracts/security/index.mjs'; const offenders = findAuditMutationPaths('packages/auth/src', { model: 'auditEvent' }); console.log(JSON.stringify({ model: 'auditEvent', offenders }, null, 2)); if (offenders.length > 0) process.exit(1);"
```

Result:

```json
{
  "model": "auditEvent",
  "offenders": []
}
```

Status: GREEN FOR CURRENT TREE

Interpretation:

- No `auditEvent.update`, `auditEvent.updateMany`, `auditEvent.delete`, `auditEvent.deleteMany`, or `auditEvent.upsert` path was found in `packages/auth/src`.
- Future money policy/audit surfaces must expand this scan as needed.

## 6. Gate Findings

| Finding | Severity | Blocks Phase 2? | Notes |
| --- | --- | --- | --- |
| S1 elevated-route scanner discovers HR routes and matches known inventory | Cleared | No | HR-aware Fastify route normalization feeds the kit scanner; non-zero and known inventory assertions pass. |
| S3 rate-limit 429 proof | Interim test-green; production-hardening required | No | Auth sign-in endpoint returns 429 after repeated attempts in local runtime. The in-memory limiter is not production-grade and must be replaced by distributed/shared-store or edge rate limiting before production HR auth traffic. Enumeration response shape remains safe. |
| Contract fixture skips all money invariants | Expected | No by itself | Correct for Phase 1 because no money layer exists. |
| C3 has no executable v1 kit runner | Watch item | No for Phase 1 | C3 is bound as an owner-required criterion and must be executable before Money Engine acceptance. |

## 7. Phase 0/1 Decision

Phase 0 intake status:

```text
ACCEPTED WITH FINDINGS
```

Phase 1 fixture-binding status:

```text
ACCEPTED WITH C3 WATCH ITEM
```

Reason:

- actual kit invariant IDs are bound
- owner-required C3 is bound as a Phase 1 skip and future Money Engine acceptance criterion
- HR fixture and harness run
- skips are documented per phase
- no money behavior is falsely claimed green
- security scans that apply to the current tree were run
- S1 route discovery is green with Fastify-aware normalization
- S3 enumeration and auth rate-limit proof are interim test-green, with a hard pre-production distributed/edge rate-limit task recorded

## 8. Recommended Owner Action

Before Phase 2 Money Engine implementation:

1. Confirm whether v1 kit's missing executable C3 runner should be accepted as a documented watch item or added before Phase 2.
2. Keep non-zero route discovery and known-inventory matching mandatory for every future route-bearing phase.
3. Keep auth rate-limit proof mandatory for future auth-sensitive money flows.
4. Require distributed/shared-store or edge auth rate limiting before production HR authentication traffic.
5. Keep all money authority blocked until owner explicitly approves Phase 2.

## Final Status

PHASE 0/1 CONTRACT GATE REVIEW READY FOR OWNER REVIEW
