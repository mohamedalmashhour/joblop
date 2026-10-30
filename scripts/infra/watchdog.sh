#!/usr/bin/env bash
# JobLop — external readiness watchdog (Launch Readiness Area 7: monitoring/alerting).
#
# Probes every JobLop surface the right way and alerts on degradation. Read-only HTTP GETs against the
# owner's own public services — no auth, no writes, no money, no runtime-code change. Safe to run on a
# cron / UptimeRobot-style schedule, or by hand.
#
# WHY A CUSTOM PROBE: two documented JobLop gotchas make naive "is it 200?" monitoring lie —
#   1. The API `/health` returns 200 EVEN WHEN fail-closed (country profile unresolved) — every real
#      route then 503s. The TRUE readiness signal is `/ready` (200 = actually serving). We check `/ready`.
#   2. The worker BFF masks API 5xx as an empty `{jobs:[]}` 200. So we check the API directly too.
#
# USAGE:
#   ./joblop-watchdog.sh                 # probe prod URLs, print table, exit non-zero if any DOWN
#   ALERT_WEBHOOK=https://hooks.slack.com/... ./joblop-watchdog.sh   # also POST a JSON alert on failure
#   ./joblop-watchdog.sh --json          # machine-readable output (for log pipelines)
set -uo pipefail

JSON="false"; [ "${1:-}" = "--json" ] && JSON="true"
ALERT_WEBHOOK="${ALERT_WEBHOOK:-}"
TIMEOUT="${TIMEOUT:-10}"

# target|url|expected_http|must_contain(optional)   — /ready is the authoritative API signal.
TARGETS=(
  "api-ready|https://joblop-api.onrender.com/ready|200|"
  "api-health|https://joblop-api.onrender.com/health|200|"
  "worker|https://joblop-worker.onrender.com/browse|200|"
  "employer|https://joblop-employer.onrender.com/signin|200|"
  "admin|https://joblop-admin.onrender.com/signin|200|"
  "public-site|https://joblop.com/browse|200|"
)

now="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
fails=0; rows=""; jrows=""
for spec in "${TARGETS[@]}"; do
  IFS='|' read -r name url want_code want_body <<<"$spec"
  # curl reports the request code + total time itself — portable (no Linux-only `date +%s%3N`).
  resp="$(curl -sS -m "$TIMEOUT" -w '\n%{http_code}\n%{time_total}' "$url" 2>/dev/null)" || resp=$'\n000\n0'
  secs="${resp##*$'\n'}"; rest="${resp%$'\n'*}"
  code="${rest##*$'\n'}"; body="${rest%$'\n'*}"
  ms="$(awk -v s="$secs" 'BEGIN{printf "%d", s*1000}')"
  status="UP"
  [ "$code" = "$want_code" ] || status="DOWN"
  if [ -n "$want_body" ] && ! printf '%s' "$body" | grep -q "$want_body"; then status="DOWN"; fi
  [ "$status" = "UP" ] || fails=$((fails+1))
  rows="${rows}$(printf '  %-14s %-5s %-4s %6sms  %s' "$name" "$status" "$code" "$ms" "$url")"$'\n'
  jrows="${jrows}{\"target\":\"${name}\",\"status\":\"${status}\",\"code\":\"${code}\",\"ms\":${ms}},"
done

if [ "$JSON" = "true" ]; then
  echo "{\"ts\":\"${now}\",\"fails\":${fails},\"targets\":[${jrows%,}]}"
else
  echo "JobLop watchdog @ ${now}   (DOWN=${fails})"
  printf '%s' "$rows"
fi

if [ "$fails" -gt 0 ] && [ -n "$ALERT_WEBHOOK" ]; then
  payload="{\"text\":\"🚨 JobLop watchdog: ${fails} surface(s) DOWN @ ${now}\",\"ts\":\"${now}\",\"fails\":${fails},\"targets\":[${jrows%,}]}"
  curl -sS -m "$TIMEOUT" -X POST -H 'content-type: application/json' -d "$payload" "$ALERT_WEBHOOK" >/dev/null 2>&1 \
    && echo "  (alert POSTed to webhook)" || echo "  (WARN: alert webhook POST failed)"
fi

exit $([ "$fails" -gt 0 ] && echo 1 || echo 0)
