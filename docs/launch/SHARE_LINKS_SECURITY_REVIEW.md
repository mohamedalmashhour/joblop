# JobLop — Share Links Security Review Checklist

*Scope: the signed, party-scoped transaction statement links (`/s/{token}`) and the admin mint endpoint (`POST /api/control-room/{id}/share-link`). Complete this before sending any link to a person outside your team.*

---

## 1. The signing secret

- [ ] `CONTROL_ROOM_SHARE_SECRET` is set in the admin app's runtime env in every environment that should allow sharing (and **unset** everywhere sharing should stay off — the code fails closed).
- [ ] The secret is **≥ 32 characters** of high entropy (`openssl rand -hex 32`). Shorter values are rejected by `isShareConfigured()`.
- [ ] The secret lives in your secret manager / platform env vars, **not** in git, `.env` committed files, CI logs, or screenshots.
- [ ] A **rotation procedure** is written down. Rotating the secret instantly invalidates every outstanding link — this is the kill switch. Decide who can rotate and how recipients get re-issued links.
- [ ] Consider a separate secret per environment so a staging leak can't forge production links.

## 2. What a token exposes

- [ ] Confirm the token payload contains **only** the masked snapshot (pre-formatted display strings), never raw worker rate, platform margin, or the other party's figures. (Design intent: `buildSnapshot` emits explicit rows; nothing else is embedded.)
- [ ] Remember the payload is **signed, not encrypted** — it is base64, i.e. readable by the holder. That's acceptable because it contains only what the recipient is entitled to see. Re-confirm no future change adds a sensitive field to the snapshot.
- [ ] Worker view never includes the employer invoice, platform margin, or any other worker. Employer view never includes worker pay or worker rate. (Verify after any edit to `controlRoomLedger.ts`.)

## 3. Tampering & forgery

- [ ] Signature verification uses a **timing-safe compare** and rejects length mismatches. (Implemented in `verifyShare`.)
- [ ] Flipping `view`, changing an amount, or editing the job number in the payload breaks the signature → renders the "invalid link" notice. Spot-test this by hand-editing a token.
- [ ] Expiry is enforced server-side; an expired token renders nothing. Default TTL is 72h, clamped to 1h–30d.
- [ ] The public page performs **no data fetch** and has **no gateway access** — a valid signature only reveals the embedded snapshot, so there is no IDOR/enumeration path from `/s/{token}`.

## 4. Who can mint

- [ ] Mint endpoint is reachable only via the admin session (`sessionBoundary`) and rejects cross-site callers (`isSameOriginMutation`). Confirm an unauthenticated or cross-origin POST is denied (401).
- [ ] Decide whether **all** admins should be able to mint links, or only a finance/role-gated subset. If the latter, add a permission check in the mint route (the role shells FINANCE_REVIEWER / PAYROLL_ADMINISTRATOR already exist).
- [x] Minting emits a structured audit line (`evt: "share_link_minted"` with jti, jobRequestId, view, ttlHours, expiresAt, a non-reversible `actor` hash of the session, and timestamp). **To do:** forward that line from the log pipeline into the durable platform audit store.

## 5. Transport & headers

- [ ] Production serves `/s/*` over HTTPS only (HSTS is already set for production responses in middleware).
- [ ] Responses for `/s/*` and the mint endpoint carry `cache-control: no-store` so statements aren't cached by shared proxies. (Mint sets it; confirm the page response isn't cached — it's `force-dynamic`.)
- [ ] Links are delivered over a channel you trust (the worker's/employer's known email or in-app message), not posted anywhere public — anyone with the link can view it until it expires.

## 6. Lifetime & revocation policy

- [ ] Choose a default TTL that matches how statements are used (72h is fine for "here is your statement"; shorten for anything sensitive).
- [x] **Per-link revocation** exists: every token carries a unique `jti`, and `verifyShare` rejects any `jti` listed in `CONTROL_ROOM_REVOKED_JTIS` (comma/space-separated env list). An admin sees the link id when minting. **To do (optional):** swap the env denylist for a KV/DB lookup in `isRevoked()` and add a "Revoke" button — the call site does not change.
- [x] Global kill switch retained: rotating `CONTROL_ROOM_SHARE_SECRET` invalidates every outstanding link at once.
- [ ] Decide retention: snapshots are point-in-time by design (a statement as of issue). Confirm that's the intended semantic and document it for support staff.

## 7. Abuse & rate limiting

- [ ] Rate-limit the mint endpoint per admin session to prevent bulk link generation.
- [ ] Consider a per-transaction cap or a "links issued" count surfaced in the admin UI so stray links are visible.

## 8. Privacy / compliance

- [ ] A statement is personal/financial data. Confirm sharing it by link is consistent with your privacy terms and the activated country's requirements before enabling in production.
- [ ] Decide whether recipients should authenticate (e.g. one-time email code) for higher-sensitivity statements, rather than link-only access. Link-only is convenient but is "possession of the link = access."

---

## Current status (as built)

Implemented: fail-closed secret, HMAC-SHA256 with timing-safe compare, server-side expiry, server-side masking embedded in the token, admin-only + same-origin mint, public page with no data fetch, route allowlisted, **structured mint audit line**, **per-link revocation via jti denylist**, global kill switch via secret rotation.

**Not yet implemented (decide before external launch):** forwarding the audit line to the durable audit store, moving the revocation denylist from env to a KV/DB + a revoke button, mint rate limiting, role-gating of who can mint, optional recipient authentication.

Nothing here should be sent to a real worker or client until Sections 1–5 are satisfied at minimum.
