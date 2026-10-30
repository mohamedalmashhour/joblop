# Monitoring & Alerting (Launch Readiness Area 7)

External readiness watchdog + Render-native alert wiring for the test-mode soft-launch. No runtime code
changes; nothing touches live money. Script: `scripts/infra/watchdog.sh`.

## Watchdog (built + verified)
Read-only HTTP probes of every JobLop surface, done correctly:
- Probes the API **`/ready`** (authoritative), not just `/health` — `/health` stays **200 even when the
  API is fail-closed** (country profile unresolved → real routes 503). Also probes `/health`, worker
  `/browse`, employer/admin `/signin`, and `joblop.com/browse`.
- Prints a status table; `--json` for log pipelines; exits non-zero if any surface is DOWN; POSTs a JSON
  alert to `$ALERT_WEBHOOK` on failure.

```bash
scripts/infra/watchdog.sh
ALERT_WEBHOOK=https://hooks.slack.com/… scripts/infra/watchdog.sh   # alert on failure
*/5 * * * * ALERT_WEBHOOK=<url> /path/scripts/infra/watchdog.sh >/dev/null   # cron
```
Verified: all 6 production surfaces UP, `/ready` 200.

## Render-native alerts (owner sets up, no code)
1. Render → each service → **Settings → Notifications**: enable **Deploy failed** + **Health check
   failed** → email/Slack.
2. Each web service's **Health Check Path** = its real readiness route (**API → `/ready`**).
3. **Metrics** tab for CPU/memory/restarts.

## Log-stream filters — match the JSON logs, not Apache text
JobLop logs **structured JSON** via Fastify/pino, so filters must key off JSON fields, **not**
`HTTP/1.1 500`-style strings (those never appear). When you attach a Render log drain
(Datadog/Better Stack/etc.), filter on:
- **5xx responses:** `"statusCode":5` (pino request-completion logs carry `statusCode`).
- **Unhandled errors / crashes:** `"level":50` or `"level":60` (pino error/fatal), or `"err":`.
- **DB pool exhaustion:** `too many clients` / `connection pool` / Prisma `P2024`.
- **Background-job health:** the payout/sweeper jobs emit `"evt":"worker_payout_progression"` /
  `"evt":"payment_sweep"` with numeric counts + duration — alert on missing heartbeats or error counts.

## Still owner-defined (human half of Area 7)
Alert destination (webhook/email), a **named on-call roster**, and a one-page incident-response runbook
(escalation + rollback = redeploy prior SHA). Required before **live money**; optional for test-mode.
