// JobLop mixed-workload HTTP load harness — SYNTHETIC / LOCAL ONLY.
//
// Closed-loop virtual-user generator against a LIVE API over real sockets (not app.inject). Signs
// in synthetic actors (workers/employers/admins) via the REAL /auth/sign-in, then drives a weighted
// workflow mix modelling realistic JobLop activity. One STAGE per invocation:
//   PERF_CONCURRENCY (active sessions) · PERF_DURATION_MS · PERF_STAGE (label) · PERF_BASE_URL
// Records RPS, p50/p95/p99, error/timeout rate, intended-4xx, and samples pg_stat_activity/pg_locks.
// Tenant isolation is preserved: each actor only ever touches its own org's data.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import type { PerfActors } from "./seed";

const BASE = process.env.PERF_BASE_URL ?? "http://127.0.0.1:4100";
const CONCURRENCY = Number(process.env.PERF_CONCURRENCY ?? 50);
const DURATION_MS = Number(process.env.PERF_DURATION_MS ?? 30_000);
const STAGE = process.env.PERF_STAGE ?? `c${CONCURRENCY}`;
const THINK_MIN = Number(process.env.PERF_THINK_MIN_MS ?? 120);
const THINK_MAX = Number(process.env.PERF_THINK_MAX_MS ?? 400);
const REQ_TIMEOUT_MS = Number(process.env.PERF_REQ_TIMEOUT_MS ?? 15_000);
const DB_URL = process.env.DATABASE_URL ?? "";

const actors = JSON.parse(readFileSync(join(process.cwd(), "tests/performance/.actors.json"), "utf8")) as PerfActors;

type Sample = { wf: string; ms: number; status: number; err?: string };
const samples: Sample[] = [];
const tokenCache = new Map<string, string>(); // email → bearer

// Deterministic-ish PRNG per VU index (no Math.random reliance for reproducibility of selection).
function mulberry32(seed: number) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

async function timed(wf: string, fn: () => Promise<Response>): Promise<Response | null> {
  const start = performance.now();
  const ctl = new AbortController();
  const to = setTimeout(() => ctl.abort(), REQ_TIMEOUT_MS);
  try {
    const res = await fn();
    // drain body so the socket is reusable
    await res.text().catch(() => "");
    samples.push({ wf, ms: performance.now() - start, status: res.status });
    return res;
  } catch (e) {
    samples.push({ wf, ms: performance.now() - start, status: 0, err: (e as Error).name });
    return null;
  } finally {
    clearTimeout(to);
  }
}

// Sign-in that records its own latency sample and caches the returned bearer token.
async function signInWithToken(email: string): Promise<string | null> {
  const cached = tokenCache.get(email);
  if (cached) return cached;
  const start = performance.now();
  try {
    const res = await fetch(`${BASE}/auth/sign-in`, { method: "POST", headers: { "content-type": "application/json" }, signal: AbortSignal.timeout(REQ_TIMEOUT_MS), body: JSON.stringify({ email, password: actors.password }) });
    const body = (await res.json().catch(() => ({}))) as { token?: string };
    samples.push({ wf: "auth_sign_in", ms: performance.now() - start, status: res.status });
    if (res.status === 200 && body.token) { tokenCache.set(email, body.token); return body.token; }
    return null;
  } catch (e) {
    samples.push({ wf: "auth_sign_in", ms: performance.now() - start, status: 0, err: (e as Error).name });
    return null;
  }
}

const authGet = (token: string, path: string, wf: string) => timed(wf, () => fetch(`${BASE}${path}`, { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(REQ_TIMEOUT_MS) }));
const authPost = (token: string, path: string, wf: string, body: unknown) => timed(wf, () => fetch(`${BASE}${path}`, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, signal: AbortSignal.timeout(REQ_TIMEOUT_MS), body: JSON.stringify(body) }));

// ── Cohort workflows (weighted). Each returns after issuing its request(s). ──
async function workerFlow(rnd: () => number) {
  const w = actors.workers[Math.floor(rnd() * actors.workers.length)];
  const token = await signInWithToken(w.email);
  if (!token) return;
  const r = rnd();
  if (r < 0.28) await authPost(token, "/marketplace/jobs/search", "worker_feed", { postalCode: "H7V 1A1", radiusKm: 50, sort: "nearest" });
  else if (r < 0.44) await authGet(token, "/worker/offers", "worker_offers_list");
  else if (r < 0.55) await authGet(token, "/marketplace/my-interests", "worker_interests");
  else if (r < 0.66) await authGet(token, "/worker/attendance", "worker_attendance");
  else if (r < 0.80) await authGet(token, "/worker/payroll/statement", "worker_payroll");
  else if (r < 0.90) await offerDetail(token); // list → read one offer by id
  else await respondToOwnOffer(token); // mutating accept/decline
}

// Read the worker's own offer list then GET one offer's detail (both bearer-scoped to the worker).
async function offerDetail(token: string) {
  const start = performance.now();
  try {
    const res = await fetch(`${BASE}/worker/offers`, { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(REQ_TIMEOUT_MS) });
    const body = (await res.json().catch(() => ({}))) as { workerOffers?: { workerOfferId: string }[] };
    samples.push({ wf: "worker_offers_list", ms: performance.now() - start, status: res.status });
    const id = body.workerOffers?.[0]?.workerOfferId;
    if (id) await authGet(token, `/worker/offers/${id}`, "worker_offer_detail");
  } catch (e) {
    samples.push({ wf: "worker_offers_list", ms: performance.now() - start, status: 0, err: (e as Error).name });
  }
}

async function respondToOwnOffer(token: string) {
  const start = performance.now();
  try {
    const res = await fetch(`${BASE}/worker/offers?status=sent`, { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(REQ_TIMEOUT_MS) });
    const body = (await res.json().catch(() => ({}))) as { workerOffers?: { workerOfferId: string; versionToken: number; termsVersionId: string | null }[] };
    samples.push({ wf: "worker_offers_list", ms: performance.now() - start, status: res.status });
    const offer = body.workerOffers?.[0];
    if (!offer) return; // no sent offer left → nothing to respond to
    const action = Math.random() < 0.7 ? "accept" : "decline";
    await authPost(token, `/worker/offers/${offer.workerOfferId}/${action}`, `offer_${action}`, { expectedVersion: offer.versionToken, expectedTermsVersionId: offer.termsVersionId ?? "" });
  } catch (e) {
    samples.push({ wf: "worker_offers_list", ms: performance.now() - start, status: 0, err: (e as Error).name });
  }
}

async function employerFlow(rnd: () => number) {
  const e = actors.employers[Math.floor(rnd() * actors.employers.length)];
  const token = await signInWithToken(e.email);
  if (!token) return;
  if (rnd() < 0.6) await authPost(token, "/marketplace/jobs/search", "employer_search", { postalCode: "H7V 1A1", radiusKm: 100, sort: "soonest" });
  else await authGet(token, `/marketplace/employers/${e.orgId}`, "employer_profile");
}

let adminCalcId: string | null = null;
async function adminFlow(rnd: () => number) {
  const a = actors.admins[Math.floor(rnd() * actors.admins.length)];
  const token = await signInWithToken(a.email);
  if (!token) return;
  const org = actors.orgs[Math.floor(rnd() * Math.min(actors.orgs.length, 40))]; // small orgs → sustainable
  const r = rnd();
  if (r < 0.2) {
    // governed recovery/bulk op
    await authPost(token, `/platform/payroll/periods/${org.periodId}/bulk-calculate`, "payroll_bulk", { pageSize: 100 });
  } else if (r < 0.85) {
    const start = performance.now();
    try {
      const res = await fetch(`${BASE}/platform/payroll/periods/${org.periodId}/calculations`, { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(REQ_TIMEOUT_MS) });
      const body = (await res.json().catch(() => ({}))) as { calculations?: { id: string }[] };
      samples.push({ wf: "admin_payroll_read", ms: performance.now() - start, status: res.status });
      if (body.calculations?.[0]) adminCalcId = body.calculations[0].id;
    } catch (e) {
      samples.push({ wf: "admin_payroll_read", ms: performance.now() - start, status: 0, err: (e as Error).name });
    }
  } else if (adminCalcId) {
    await authGet(token, `/platform/payroll/calculations/${adminCalcId}/ai-review`, "hr6_advisory");
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function virtualUser(index: number, deadline: number) {
  const rnd = mulberry32(index * 2654435761);
  while (performance.now() < deadline) {
    const pick = rnd();
    if (pick < 0.72) await workerFlow(rnd);
    else if (pick < 0.86) await employerFlow(rnd);
    else await adminFlow(rnd);
    await sleep(THINK_MIN + rnd() * (THINK_MAX - THINK_MIN));
  }
}

function sampleDb(): { activeConns: number; idleConns: number; totalConns: number; waitingLocks: number } | null {
  if (!DB_URL) return null;
  try {
    const out = execFileSync("psql", [DB_URL, "-tAc", "select count(*) filter (where state='active'), count(*) filter (where state='idle'), count(*), (select count(*) from pg_locks where not granted) from pg_stat_activity where datname=current_database()"], { encoding: "utf8" }).trim();
    const [active, idle, total, waiting] = out.split("|").map((n) => Number(n));
    return { activeConns: active, idleConns: idle, totalConns: total, waitingLocks: waiting };
  } catch { return null; }
}

function pct(sorted: number[], p: number) { if (!sorted.length) return 0; const i = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length)); return Math.round(sorted[i] * 10) / 10; }

async function main() {
  console.log(`[load] stage=${STAGE} concurrency=${CONCURRENCY} duration=${DURATION_MS}ms base=${BASE}`);
  // Warm: sign in a spread of actors first so mid-stage latency isn't dominated by cold sign-in.
  const warm = Math.min(CONCURRENCY, 200);
  await Promise.all(Array.from({ length: warm }, (_, i) => signInWithToken(actors.workers[i % actors.workers.length].email)));

  const dbPeak = { activeConns: 0, idleConns: 0, totalConns: 0, waitingLocks: 0 };
  const dbTimer = setInterval(() => { const s = sampleDb(); if (s) { dbPeak.activeConns = Math.max(dbPeak.activeConns, s.activeConns); dbPeak.totalConns = Math.max(dbPeak.totalConns, s.totalConns); dbPeak.waitingLocks = Math.max(dbPeak.waitingLocks, s.waitingLocks); } }, 1000);

  const t0 = performance.now();
  const deadline = t0 + DURATION_MS;
  const startCount = samples.length;
  await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => virtualUser(i, deadline)));
  const wallSec = (performance.now() - t0) / 1000;
  clearInterval(dbTimer);

  // Post-load backlog check: sample active connections a moment after load stops.
  await sleep(1500);
  const cooldown = sampleDb();

  const stageSamples = samples.slice(startCount);
  const lat = stageSamples.map((s) => s.ms).sort((a, b) => a - b);
  const errors = stageSamples.filter((s) => s.status === 0 || s.status >= 500);
  const timeouts = stageSamples.filter((s) => s.err === "AbortError" || s.err === "TimeoutError");
  const intended4xx = stageSamples.filter((s) => s.status >= 400 && s.status < 500);
  const ok = stageSamples.filter((s) => s.status >= 200 && s.status < 400);
  const byWf: Record<string, { n: number; p95: number }> = {};
  for (const wf of [...new Set(stageSamples.map((s) => s.wf))]) {
    const l = stageSamples.filter((s) => s.wf === wf).map((s) => s.ms).sort((a, b) => a - b);
    byWf[wf] = { n: l.length, p95: pct(l, 95) };
  }

  const report = {
    stage: STAGE, concurrency: CONCURRENCY, wallSec: Math.round(wallSec * 10) / 10,
    requests: stageSamples.length, rps: Math.round((stageSamples.length / wallSec) * 10) / 10,
    ok: ok.length, intended4xx: intended4xx.length, errors: errors.length, timeouts: timeouts.length,
    errorRatePct: Math.round((errors.length / Math.max(1, stageSamples.length)) * 10000) / 100,
    p50: pct(lat, 50), p95: pct(lat, 95), p99: pct(lat, 99), max: Math.round((lat[lat.length - 1] ?? 0) * 10) / 10,
    rssMB: Math.round((process.memoryUsage().rss / 1048576) * 10) / 10,
    dbPeakActiveConns: dbPeak.activeConns, dbPeakTotalConns: dbPeak.totalConns, dbPeakWaitingLocks: dbPeak.waitingLocks,
    cooldownActiveConns: cooldown?.activeConns ?? null,
    perWorkflow: byWf
  };
  console.log(`[load] RESULT ${JSON.stringify(report)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
