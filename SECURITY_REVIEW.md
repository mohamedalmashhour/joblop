# Resident Workforce OS Security Review

Status: engineering review in progress; final security approval is open.

Implemented controls include database-backed roles, revoked/expired/inactive checks, tenant-scoped
repository lookups, worker ownership checks, runtime output allowlists, enumeration-safe errors,
security headers, bounded local limiting, fail-closed remote limiting, production mutation kill
switches, fixture exclusion, secret scanning, migration checksums, and privacy-filtered logging.

Review checklist:

- [ ] Authentication, registration, recovery, verification, and MFA policy approved.
- [ ] Session expiry, revocation, cookies, CSRF, CORS, and proxy trust tested in target topology.
- [ ] Every route tested for anonymous, wrong-role, revoked, expired, inactive, cross-tenant, direct
      URL, and identifier-enumeration access.
- [ ] Candidate and delivery providers penetration-tested with malformed, stale, replayed, duplicate,
      and cross-tenant responses.
- [ ] Distributed limiter tested across replicas and during timeout/outage.
- [ ] Dependency audit clean or every exception time-bounded and signed.
- [ ] Logs, monitoring, support tooling, backups, and incident exports reviewed for sensitive data.
- [ ] Production mutation kill switches independently verified.

No item requiring a human security decision is marked approved by this document.
