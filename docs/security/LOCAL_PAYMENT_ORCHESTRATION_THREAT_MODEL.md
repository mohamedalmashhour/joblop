# Local Payment Orchestration Threat Model

Status: **LOCAL FAKE PROVIDER ONLY**

Architecture authority: `ACR-0002-LOCAL-PAYMENT-ORCHESTRATION.md`

## Protected assets

- opaque customer, payment-method, authorization, operation and event references;
- employer organization scope;
- assignment, locked-timesheet and issued-invoice linkage;
- payment policy and marketplace-fee versions;
- payment attempts, allocations, refunds, receipts and audit events;
- webhook authenticity, recency and replay state.

Raw card numbers, expiry dates, security codes, bank credentials, Stripe keys and complete provider
payloads are prohibited assets: the application must never receive or persist them.

## Threats and controls

| Threat | Local control |
| --- | --- |
| Cross-organization object access | Every method, attempt, event and refund lookup requires matching organization scope; composite database foreign keys preserve it |
| Duplicate charge or refund | Organization-scoped idempotency key plus request digest; conflicting replay fails closed |
| Concurrent mutation | Optimistic version checks; database records expose version and organization-scoped uniqueness |
| Timeout or unknown result | State remains `processing`; retry with a stale version is rejected; recovery requires signed event or review |
| Forged or replayed webhook | HMAC-SHA256 verification, constant-time comparison, five-minute window and unique provider event reference |
| Contradictory provider event | Success-to-failure and failure-to-success contradictions are quarantined for review |
| Credential or PAN leakage | Opaque-reference validation, no raw payment fields, secret scan and safe event reason codes/digests |
| Unauthorized Québec surcharge | Domain gate and database constraint force payment-method surcharge off for `CA-QC` |
| Hidden processing-cost pass-through | Marketplace fee is effective-dated by employer contract and calculated independently of provider cost/method |
| Invoice mutation after payment | Allocations/refunds are append-only payment records; issued invoice snapshot remains unchanged |
| Authorization misrepresented as collection | Separate state and audit event; authorization creates no invoice allocation |
| Worker classification by financial code | Payment records contain no employment-status decision and do not control worker payout |

## External Stripe boundary

Mastercard through Stripe is intended as the default and Canadian ACSS debit as the alternative.
No Stripe SDK, account, test/live key, webhook endpoint or external request is active in this local
milestone. Before test-mode integration, Security and Finance must approve merchant identity,
secret injection, webhook endpoint/audience, restricted key permissions, log redaction, retention,
provider retry semantics and evidence collection. Live mode requires a separate authorization.
