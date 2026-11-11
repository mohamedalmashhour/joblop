import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { buildBrainSummary } from "@rwos/brain";
import { canadaAddressAdapter } from "@rwos/country-canada";
import { createPrismaClient } from "@rwos/database";
import { buildApi } from "../../apps/api/src/app";
import { JOBLOP_BRAIN_ACTIONS } from "../../apps/api/src/brain/joblopActions";
import { createPrismaBrainStore } from "../../apps/api/src/brain/prismaBrainStore";
import type { EmailSender } from "../../apps/api/src/mailer/emailSender";
import type { SmsSender } from "../../apps/api/src/mailer/smsSender";
import { ANTHROPIC_MESSAGES_URL, resetOutsideAiCircuits } from "../../apps/api/src/outsideAi";

// The AI Brain on the four real-life job kinds, "taking care of all sides", on a SAFE COPY.
//
// Same farm as postgres-real-life-scenarios.test.ts (Laval greenhouse, Farm worker at the legal rate:
// employer $20.75/h, worker $16.60/h, Joblop's share $4.15/h), driven through the real routes. The
// Brain runs exactly as on live: mode "live", all 7 phase-1 switches ON (6 actions + the daily
// summary) and every assistant switch ON, acting as a real staff account (BRAIN_ACTOR_USER_ID). The
// clock is controlled (only `Date` is faked) and the two crons are called at realistic times through
// their real routes: /internal/brain/sweep and /internal/shift-reminders/sweep, every 5 minutes around
// 24 h and 4 h before the start, the start, +10 min, the end, +24 h after the end, and the 07:00 daily
// summary. Every email and text is captured; nothing is really sent and no money moves.
//
// Phase 2 (the role assistant) uses a SCRIPTED model: the global fetch answers the Anthropic address
// with a fixed script (no key, no network), so the real chat route, the real tools (calling the real
// routes as the signed-in person), the signed single-use proposal and the real Confirm route all run.
//
// Shifts are in January 2027 (EST, UTC-5), apart from every other suite's dates. Each scenario has its
// own 4-day block and the clock only moves forward. Before the first scenario the suite runs one sweep
// with the Brain OFF and closes whatever was already open (other suites' leftovers), so the Brain never
// acts on data that is not this suite's. The Brain settings are restored afterwards.
//
// Where today's behaviour looks wrong for real life, the test states the CORRECT behaviour and is
// marked `it.fails(...)` with a "BUG:" comment, so CI stays green until the fix lands (then the
// `.fails` must be removed). The matching "ACTUAL:" test pins what the code does today.
// NOTE: the cancellation checks (section 3) overlap with branch fix/cancel-booked-shift; when that
// lands, their `.fails` will start passing and must be removed.
const databaseUrl = process.env.RWOS_TEST_DATABASE_URL;
const suite = databaseUrl ? describe : describe.skip;

const HOUR = 3_600_000;
const STREET = "3200 Rang Saint-Elzéar";
const EMPLOYER_RATE = 2075;
const WORKER_RATE = 1660;
const PLATFORM_SHARE = 415;
const BRAIN_TOKEN = "brain-sweep-token-real-life-0001";
const REMINDER_TOKEN = "shift-reminder-token-real-life-01";
const STAFF_ALERT_EMAIL = "staff-alerts@brain-real-life.test";
const CONTACT_DESK_EMAIL = "contact-desk@brain-real-life.test";
const PASSWORD = "Sup3r-Secret-Pass!";

/** A Toronto (EST, UTC-5 in January) wall-clock time on a day, as an instant. */
const et = (day: string, hhmm: string) => new Date(`${day}T${hhmm}:00.000-05:00`);
const setNow = (instant: Date) => vi.setSystemTime(instant);
/** "01-05 08:10" in Toronto time, for the printed report. */
const wall = (d: Date) => new Date(d.getTime() - 5 * HOUR).toISOString().slice(5, 16).replace("T", " ");

function numbersIn(value: unknown, out: number[] = []): number[] {
  if (typeof value === "number") out.push(value);
  else if (Array.isArray(value)) for (const item of value) numbersIn(item, out);
  else if (value && typeof value === "object") for (const item of Object.values(value)) numbersIn(item, out);
  return out;
}
function keysIn(value: unknown, out: string[] = []): string[] {
  if (Array.isArray(value)) for (const item of value) keysIn(item, out);
  else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      out.push(key);
      keysIn(item, out);
    }
  }
  return out;
}
const EMPLOYER_SIDE_KEYS = /employerHourly|employerRate|platformHourly|platformMargin|marginPpm|platformShare|fundedBy|subtotal|invoiceTotal/i;
const WORKER_PAY_KEYS = /workerHourly|workerRate|workerPay|hourlyPay|netPay|grossPay|wage|earning/i;
/** The employer's rate and Joblop's share, in minor units and in dollars (the tools convert to dollars). */
const EMPLOYER_SIDE_NUMBERS = [EMPLOYER_RATE, PLATFORM_SHARE, EMPLOYER_RATE / 100, PLATFORM_SHARE / 100];
const WORKER_PAY_NUMBERS = [WORKER_RATE, WORKER_RATE / 100];

// ── captured messages ──
type Sent = { at: Date; channel: "email" | "sms"; to: string; subject: string; text: string; status: "sent" | "error" };
const sent: Sent[] = [];
/** The next text to one of these numbers fails once (a provider hiccup), then sends normally. */
const failNextTextTo = new Set<string>();
const emailSender: EmailSender = {
  configured: true,
  send: async (message) => {
    sent.push({ at: new Date(), channel: "email", to: message.to.toLowerCase(), subject: message.subject, text: message.text, status: "sent" });
    return { status: "sent", id: `email-${sent.length}` };
  }
};
const smsSender: SmsSender = {
  configured: true,
  enabled: true,
  send: async (message) => {
    const fail = failNextTextTo.delete(message.to);
    sent.push({ at: new Date(), channel: "sms", to: message.to, subject: "", text: message.text, status: fail ? "error" : "sent" });
    return fail ? { status: "error" } : { status: "sent", id: `sms-${sent.length}` };
  }
};
const sentTo = (...recipients: (string | null | undefined)[]) => {
  const wanted = new Set(recipients.filter((r): r is string => !!r).map((r) => r.toLowerCase()));
  return sent.filter((s) => wanted.has(s.to.toLowerCase()));
};
const within = (list: Sent[], from: Date, until: Date) => list.filter((s) => s.at.getTime() >= from.getTime() && s.at.getTime() < until.getTime());
const isDailySummary = (s: Sent) => s.to === STAFF_ALERT_EMAIL && /daily summary/i.test(s.subject);
const isHoursReminder = (s: Sent, jobNumber: string) => s.channel === "email" && s.subject.includes(jobNumber) && /confirm the hours|confirmer les heures/i.test(s.subject);

// ── the scripted model (phase 2) ──
type Block = Record<string, unknown>;
type ModelStep = { stop: "tool_use" | "end_turn"; content: Block[] };
const modelScript: ModelStep[] = [];
const modelRequests: Record<string, unknown>[] = [];
const realFetch = globalThis.fetch;
const scriptedFetch = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (url !== ANTHROPIC_MESSAGES_URL) return realFetch(input, init);
  modelRequests.push(JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>);
  const step = modelScript.shift() ?? { stop: "end_turn", content: [{ type: "text", text: "OK." }] };
  return new Response(JSON.stringify({ stop_reason: step.stop, content: step.content }), { status: 200, headers: { "content-type": "application/json" } });
};
const useTool = (name: string, input: Record<string, unknown>): Block => ({ type: "tool_use", id: `toolu_${randomUUID().replaceAll("-", "").slice(0, 20)}`, name, input });
const callTools = (...blocks: Block[]): ModelStep => ({ stop: "tool_use", content: blocks });
const answer = (text: string): ModelStep => ({ stop: "end_turn", content: [{ type: "text", text }] });
/** Every tool result the model was sent since request number `from` (from the last request's history). */
function toolResultsSince(from: number): string[] {
  if (modelRequests.length <= from) return [];
  const messages = (modelRequests.at(-1)?.messages ?? []) as { content?: unknown }[];
  return messages
    .flatMap((m) => (Array.isArray(m.content) ? (m.content as Block[]) : []))
    .filter((b) => b.type === "tool_result")
    .map((b) => String(b.content));
}
type Card = { type: string; proposalId: string; token: string; tool: string; card: Record<string, unknown>; expiresAt: string };
type ConfirmOutcome = { status: string; reason?: string; code?: string; tool?: string; text: string };

suite("the AI Brain on the four real-life job kinds, all sides (Laval farm, live settings, controlled clock)", () => {
  const prisma = createPrismaClient(databaseUrl!);
  const brainStore = createPrismaBrainStore(prisma);
  let app: FastifyInstance;
  const staffIds = new Set<string>();
  const employerIds = new Set<string>();
  const createdMembershipIds: string[] = [];
  const labels = new Map<string, string>();
  const label = (address: string | null | undefined, name: string) => {
    if (address) labels.set(address.toLowerCase(), name);
  };
  type Actor = { id: string; email: string; token: string; issuedAt: number };
  type Worker = Actor & { workerIdentityId: string; phone: string | null };
  let staff: Actor;
  let employer: Actor;
  let scope: { organizationId: string; residenceId: string; departmentId: string };
  let savedSettings: { key: string; value: string; updatedByUserId: string | null }[] = [];
  const savedEnv: Record<string, string | undefined> = {};
  const report: string[] = [];

  const resolveAuthorizationRoles = async (userId: string) =>
    staffIds.has(userId)
      ? (["PLATFORM_ADMINISTRATOR", "PAYROLL_ADMINISTRATOR"] as const)
      : employerIds.has(userId)
        ? (["ORGANIZATION_OWNER"] as const)
        : (["WORKER_ACCESS"] as const);
  const apiOptions = (extraEnv: Record<string, string>) => ({
    countryCurrency: "CAD",
    countryTimezone: "America/Toronto",
    countryAddress: canadaAddressAdapter,
    emailSender,
    smsSender,
    env: { ...process.env, DATABASE_URL: databaseUrl, RWOS_ENV: "local", NODE_ENV: "test", ...extraEnv },
    resolveAuthorizationRoles
  });

  async function h(actor: Actor) {
    if (Date.now() - actor.issuedAt > 7 * HOUR) {
      const res = await app.inject({ method: "POST", url: "/auth/sign-in", payload: { email: actor.email, password: PASSWORD } });
      expect(res.statusCode, res.body).toBe(200);
      actor.token = (res.json() as { token: string }).token;
      actor.issuedAt = Date.now();
    }
    return { authorization: `Bearer ${actor.token}` };
  }

  async function register(target: FastifyInstance, prefix: string): Promise<Actor> {
    const email = `${prefix}-${randomUUID()}@brain-real-life.test`;
    const res = await target.inject({ method: "POST", url: "/auth/register", payload: { email, password: PASSWORD, displayName: "Brain Real Life" } });
    expect(res.statusCode, res.body).toBe(201);
    const body = res.json() as { token: string; user: { id: string } };
    return { token: body.token, id: body.user.id, email, issuedAt: Date.now() };
  }

  async function makeWorker(name: string, withPhone = true): Promise<Worker> {
    const user = await register(app, `w-${name}`);
    const identity = await prisma.workerIdentity.create({ data: { userId: user.id, displayName: `Worker ${name}`, status: "active" } });
    await prisma.workerClassificationElection.create({
      data: { workerIdentityId: identity.id, classification: "employee", status: "active", effectiveFrom: new Date(Date.now() - 24 * HOUR), electedByUserId: user.id }
    });
    let phone: string | null = null;
    if (withPhone) {
      phone = `+1450${String(Math.floor(Math.random() * 10_000_000)).padStart(7, "0")}`;
      await prisma.user.update({ where: { id: user.id }, data: { phone } });
    }
    label(user.email, `worker "${name}"`);
    label(phone, `worker "${name}" (phone)`);
    return { ...user, workerIdentityId: identity.id, phone };
  }

  type Job = { id: string; jobRequestNumber: string };

  /** The employer asks for workers: draft, then submit (the Brain or staff approve it later). */
  async function draftRequest(input: { startAt: Date; endAt: Date; title: string; workers?: number }) {
    const created = await app.inject({
      method: "POST", url: `/organizations/${scope.organizationId}/job-requests`, headers: await h(employer),
      payload: {
        residenceId: scope.residenceId, departmentId: scope.departmentId, workGroup: "farming-agriculture", roleDefinition: "farm_worker",
        title: input.title, description: "Harvest and pack vegetables in the greenhouse.",
        numberOfWorkers: input.workers ?? 1, urgency: "normal", requestType: "single_day", timezone: "America/Toronto",
        startAt: input.startAt.toISOString(), endAt: input.endAt.toISOString()
      }
    });
    expect(created.statusCode, created.body).toBe(201);
    return created.json().jobRequest as { id: string; versionToken: number; jobRequestNumber: string };
  }
  async function requestJob(input: { startAt: Date; endAt: Date; title: string; workers?: number }): Promise<Job> {
    const draft = await draftRequest(input);
    const submitted = await app.inject({
      method: "POST", url: `/organizations/${scope.organizationId}/job-requests/${draft.id}/submit`, headers: await h(employer),
      payload: { expectedVersion: draft.versionToken }
    });
    expect(submitted.statusCode, submitted.body).toBe(200);
    return { id: draft.id, jobRequestNumber: draft.jobRequestNumber };
  }
  /** Staff approve by hand (before the Brain's next sweep), with or without the job board. */
  async function staffApprove(job: Job, openClaim: boolean) {
    const current = await prisma.jobRequest.findUniqueOrThrow({ where: { id: job.id }, select: { version: true } });
    const reviewed = await app.inject({
      method: "POST", url: `/platform/job-requests/intake/${job.id}/admin-review`, headers: await h(staff), payload: { expectedVersion: current.version }
    });
    expect(reviewed.statusCode, reviewed.body).toBe(200);
    const approved = await app.inject({
      method: "POST", url: `/platform/job-requests/intake/${job.id}/approve-for-dispatch`, headers: await h(staff),
      payload: { expectedVersion: reviewed.json().jobRequest.versionToken, openClaim }
    });
    expect(approved.statusCode, approved.body).toBe(200);
    expect(approved.json().openClaim.openClaim).toBe(openClaim);
  }
  const jobStatus = async (job: Job) => (await prisma.jobRequest.findUniqueOrThrow({ where: { id: job.id }, select: { status: true } })).status;

  async function claim(worker: Actor, jobId: string) {
    const res = await app.inject({ method: "POST", url: `/marketplace/jobs/${jobId}/claim`, headers: await h(worker) });
    expect(res.statusCode, res.body).toBe(201);
    return res.json().assignmentId as string;
  }
  async function attendanceItem(worker: Actor, assignmentId: string) {
    const res = await app.inject({ method: "GET", url: "/worker/attendance", headers: await h(worker) });
    expect(res.statusCode, res.body).toBe(200);
    const item = (res.json().items as { attendanceRecordId: string; assignmentId: string; version: number; status: string }[]).find((i) => i.assignmentId === assignmentId);
    expect(item, res.body).toBeDefined();
    return item!;
  }
  type Attendance = { attendanceRecordId: string; version: number };
  async function checkIn(worker: Actor, assignmentId: string): Promise<Attendance> {
    const item = await attendanceItem(worker, assignmentId);
    const res = await app.inject({
      method: "POST", url: `/worker/attendance/${item.attendanceRecordId}/check-in`, headers: await h(worker), payload: { expectedVersion: item.version }
    });
    expect(res.statusCode, res.body).toBe(200);
    return { attendanceRecordId: item.attendanceRecordId, version: (res.json().attendanceRecord as { version: number }).version };
  }
  async function checkOut(worker: Actor, record: Attendance) {
    const res = await app.inject({
      method: "POST", url: `/worker/attendance/${record.attendanceRecordId}/check-out`, headers: await h(worker), payload: { expectedVersion: record.version }
    });
    expect(res.statusCode, res.body).toBe(200);
  }

  type Timesheet = { id: string; version: number; status: string; exceptionSummary: string | null; payableMinutes: number; billableMinutes: number };
  async function prepare(attendanceRecordId: string) {
    const res = await app.inject({ method: "POST", url: "/platform/timesheets/prepare", headers: await h(staff), payload: { attendanceRecordId } });
    expect(res.statusCode, res.body).toBe(200);
    return res.json().timesheet as Timesheet;
  }
  async function workerConfirm(worker: Actor, ts: Timesheet) {
    const res = await app.inject({ method: "POST", url: `/worker/timesheets/${ts.id}/confirm`, headers: await h(worker), payload: { expectedVersion: ts.version } });
    expect(res.statusCode, res.body).toBe(200);
    return res.json().timesheet as Timesheet;
  }
  async function employerConfirmAttempt(timesheetId: string) {
    const current = await prisma.timesheet.findUniqueOrThrow({ where: { id: timesheetId }, select: { version: true } });
    return app.inject({
      method: "POST", url: `/organizations/${scope.organizationId}/timesheets/${timesheetId}/confirm`, headers: await h(employer), payload: { expectedVersion: current.version }
    });
  }
  const timesheetRow = (id: string) => prisma.timesheet.findUniqueOrThrow({ where: { id }, select: { status: true, employerReviewStatus: true, workerReviewStatus: true } });

  // ── the two crons, at a given time ──
  let liveMode = "off";
  type SweepResult = { status: string; mode: string; issuesFound: number; actionsDone: number; actionsSkipped: number; actionsFailed: number; dailySummary: string };
  async function tick(at: Date): Promise<SweepResult> {
    setNow(at);
    const reminders = await app.inject({ method: "POST", url: "/internal/shift-reminders/sweep", headers: { "x-sweep-token": REMINDER_TOKEN } });
    expect(reminders.statusCode, reminders.body).toBe(200);
    const res = await app.inject({ method: "POST", url: "/internal/brain/sweep", headers: { "x-sweep-token": BRAIN_TOKEN } });
    expect(res.statusCode, res.body).toBe(200);
    const result = res.json() as SweepResult;
    expect(result.mode).toBe(liveMode);
    return result;
  }
  async function ticks(...times: Date[]) {
    for (const at of times) await tick(at);
  }

  async function setMode(mode: "off" | "live") {
    const res = await app.inject({ method: "POST", url: "/platform/brain/mode", headers: await h(staff), payload: { mode } });
    expect(res.statusCode, res.body).toBe(200);
    liveMode = mode;
  }
  async function setSwitch(key: string, enabled: boolean) {
    const res = await app.inject({ method: "POST", url: "/platform/brain/switches", headers: await h(staff), payload: { key, enabled } });
    expect(res.statusCode, res.body).toBe(200);
  }
  async function brainPage() {
    const res = await app.inject({ method: "GET", url: "/platform/brain", headers: await h(staff) });
    expect(res.statusCode, res.body).toBe(200);
    return res.json() as {
      mode: string;
      switches: { key: string; enabled: boolean }[];
      issues: { id: string; ruleKey: string; subjectId: string; summary: string; recommendedAction: string | null }[];
      actions: { id: string; actionKey: string; status: string; reason: string; actor: string }[];
    };
  }
  const actionsOn = (subjectId: string) =>
    prisma.brainAction.findMany({ where: { issue: { subjectId } }, include: { issue: { select: { ruleKey: true, status: true } } }, orderBy: { createdAt: "asc" } });
  const issuesOn = (subjectId: string) => prisma.brainIssue.findMany({ where: { subjectId }, orderBy: { detectedAt: "asc" } });
  const summaryEmailAt = (at: Date) => sent.find((s) => isDailySummary(s) && s.at.getTime() === at.getTime());

  /** The printed story of one scenario: every message to its people and every Brain action, in time order. */
  async function tell(title: string, since: Date, subjectIds: readonly string[], recipients: readonly (string | null | undefined)[]) {
    const rows: { at: Date; line: string }[] = [];
    for (const s of within(sentTo(...recipients), since, new Date(8.64e15))) {
      const what = s.channel === "email" ? s.subject : s.text.slice(0, 80);
      rows.push({ at: s.at, line: `${s.channel.toUpperCase()} to ${labels.get(s.to.toLowerCase()) ?? s.to}${s.status === "error" ? " (FAILED)" : ""}: ${what}` });
    }
    const actions = await prisma.brainAction.findMany({
      where: { issue: { subjectId: { in: [...subjectIds] } }, createdAt: { gte: since } },
      include: { issue: { select: { ruleKey: true } } },
      orderBy: { createdAt: "asc" }
    });
    for (const a of actions) rows.push({ at: a.createdAt, line: `BRAIN (${a.actorType}) ${a.actionKey} on ${a.issue.ruleKey} -> ${a.status}: ${a.detail ?? ""}` });
    rows.sort((a, b) => a.at.getTime() - b.at.getTime());
    report.push(`\n=== ${title} ===`, ...rows.map((r) => `${wall(r.at)} ET  ${r.line}`));
  }

  beforeAll(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    setNow(et("2027-01-03", "00:00"));
    for (const key of ["RWOS_LOCAL_E2E", "PAYOUT_TEST_MODE_ENABLED", "ANTHROPIC_API_KEY", "AI_OUTSIDE_CALLS", "CONTACT_ADMIN_EMAIL", "CONTACT_ADMIN_PHONE"]) savedEnv[key] = process.env[key];
    process.env.RWOS_LOCAL_E2E = "enabled";
    delete process.env.PAYOUT_TEST_MODE_ENABLED;
    // A placeholder key turns the assistant on; the global fetch below answers the model address with
    // the script, so nothing ever leaves the process.
    process.env.ANTHROPIC_API_KEY = "sk-test-scripted-model-never-sent";
    delete process.env.AI_OUTSIDE_CALLS;
    process.env.CONTACT_ADMIN_EMAIL = CONTACT_DESK_EMAIL;
    delete process.env.CONTACT_ADMIN_PHONE;
    vi.stubGlobal("fetch", scriptedFetch);
    resetOutsideAiCircuits();

    // The Brain acts as a real staff account, which must exist before the app reads BRAIN_ACTOR_USER_ID.
    const boot = buildApi(apiOptions({}));
    await boot.ready();
    staff = await register(boot, "brl-staff");
    staffIds.add(staff.id);
    await boot.close();

    app = buildApi(
      apiOptions({
        BRAIN_SWEEP_TOKEN: BRAIN_TOKEN,
        SHIFT_REMINDER_SWEEP_TOKEN: REMINDER_TOKEN,
        BRAIN_ACTOR_USER_ID: staff.id,
        STAFF_ALERT_EMAIL,
        BRAIN_SUMMARY_HOUR_UTC: "12", // 07:00 in Toronto (EST)
        ASSISTANT_PROPOSAL_SECRET: `brain-real-life-proposal-secret-${randomUUID()}`
      })
    );
    await app.ready();
    label(staff.email, "staff");
    label(STAFF_ALERT_EMAIL, "staff alerts");
    label(CONTACT_DESK_EMAIL, "contact desk");

    const org = await prisma.employerOrganization.create({
      data: { publicId: `ORG-BRL-${randomUUID().slice(0, 8)}`, legalName: "Ferme Laval Brain Inc.", displayName: "Ferme Laval", status: "active", createdByUserId: staff.id }
    });
    const residence = await prisma.residence.create({
      data: {
        publicId: `RES-BRL-${randomUUID().slice(0, 8)}`, organizationId: org.id, name: "Serres", status: "active", createdByUserId: staff.id,
        province: "QC", city: "Laval", postalCode: "H7E 4P2", addressLine1: STREET, latitude: 45.6066, longitude: -73.7124
      }
    });
    const department = await prisma.department.create({
      data: { publicId: `DEP-BRL-${randomUUID().slice(0, 8)}`, organizationId: org.id, residenceId: residence.id, name: "Greenhouse", status: "active", createdByUserId: staff.id }
    });
    const workGroup = await prisma.workGroup.findUniqueOrThrow({ where: { key: "farming_agriculture" } });
    const role = await prisma.roleDefinition.findUniqueOrThrow({ where: { key: "farm_worker" } });
    scope = { organizationId: org.id, residenceId: residence.id, departmentId: department.id };

    employer = await register(app, "brl-employer");
    employerIds.add(employer.id);
    label(employer.email, "employer");
    const membership = await prisma.organizationMembership.create({ data: { organizationId: org.id, userId: employer.id, status: "active", acceptedAt: new Date() } });
    const owner = await prisma.accessRoleDefinition.findUniqueOrThrow({ where: { key: "ORGANIZATION_OWNER" } });
    await prisma.membershipAccessRole.create({ data: { membershipId: membership.id, accessRoleDefinitionId: owner.id } });
    createdMembershipIds.push(membership.id);
    const contract = await app.inject({
      method: "POST", url: `/organizations/${org.id}/contract`, headers: await h(staff),
      payload: { version: `farm-${randomUUID().slice(0, 8)}`, currency: "CAD", roleRates: [{ workGroupId: workGroup.id, roleDefinitionId: role.id, hourlyRateMinor: EMPLOYER_RATE }] }
    });
    expect(contract.statusCode, contract.body).toBe(201);

    // Warm-up: one sweep with the Brain OFF, then close whatever was already open (other suites'
    // leftovers). A resolved issue is never reopened or acted on, so the Brain only acts on this suite.
    savedSettings = (await prisma.brainSetting.findMany()).map(({ key, value, updatedByUserId }) => ({ key, value, updatedByUserId }));
    await setMode("off");
    await tick(et("2027-01-03", "00:00"));
    await prisma.brainIssue.updateMany({
      where: { status: "open" },
      data: { status: "resolved", resolution: "Found before the real-life Brain suite started; out of its scope.", resolvedAt: new Date() }
    });

    // Live settings: mode live, every switch ON (6 actions + daily summary + every assistant switch).
    await setMode("live");
    for (const s of (await brainPage()).switches) await setSwitch(s.key, true);
  }, 120_000);

  afterAll(async () => {
    console.log(`\nREAL-LIFE BRAIN REPORT (times in Toronto)\n${report.join("\n")}\n`);
    try {
      await prisma.brainSetting.deleteMany({});
      if (savedSettings.length > 0) await prisma.brainSetting.createMany({ data: savedSettings });
      if (createdMembershipIds.length > 0) {
        await prisma.membershipAccessRole.deleteMany({ where: { membershipId: { in: createdMembershipIds } } });
        await prisma.organizationMembership.deleteMany({ where: { id: { in: createdMembershipIds } } });
      }
    } finally {
      for (const [key, value] of Object.entries(savedEnv)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
      vi.unstubAllGlobals();
      vi.useRealTimers();
      await app?.close();
      await prisma.$disconnect();
    }
  });

  it("runs with the live settings: mode live, every Brain and assistant switch ON, acting as a staff account", async () => {
    const page = await brainPage();
    expect(page.mode).toBe("live");
    expect(page.switches.filter((s) => !s.enabled)).toEqual([]);
    const keys = page.switches.map((s) => s.key);
    for (const key of ["resend_failed_message", "remind_worker_check_in", "remind_employer_timesheet", "offer_employer_bonus", "auto_approve_request", "auto_approve_timesheet", "daily_summary_email"]) {
      expect(keys).toContain(key);
    }
    expect(keys.filter((k) => k.startsWith("assistant")).length).toBeGreaterThanOrEqual(14);
    expect((await app.inject({ method: "GET", url: "/platform/brain", headers: await h(staff) })).json().actorConfigured).toBe(true);
  });

  // ── 1. A normal day ──────────────────────────────────────────────────────────────────────────────
  describe("1. normal day (shift Tue 01-05 08:00–14:00; in 07:55, out 14:05)", () => {
    const PREV = "2027-01-04";
    const DAY = "2027-01-05";
    const NEXT = "2027-01-06";
    const NEXT2 = "2027-01-07";
    const s = {} as { job: Job; worker: Worker; assignmentId: string; attendance: Attendance; timesheetId: string; statusAfterBrain: string; invoicesBefore: number };

    beforeAll(async () => {
      // 06:00 the day before: the employer asks for one Farm worker; the Brain's 06:05 sweep approves it.
      setNow(et(PREV, "06:00"));
      s.job = await requestJob({ startAt: et(DAY, "08:00"), endAt: et(DAY, "14:00"), title: "Farm worker, Laval (normal day)" });
      await tick(et(PREV, "06:05"));
      s.statusAfterBrain = await jobStatus(s.job);
      // 06:30: a worker claims it from the job board.
      setNow(et(PREV, "06:30"));
      s.worker = await makeWorker("normal");
      s.assignmentId = await claim(s.worker, s.job.id);
      // 24 h and 4 h before, the 07:00 summary, the start.
      await ticks(et(PREV, "07:00"), et(PREV, "07:55"), et(PREV, "08:00"), et(PREV, "08:05"), et(DAY, "03:55"), et(DAY, "04:00"), et(DAY, "04:05"), et(DAY, "07:00"), et(DAY, "07:50"));
      setNow(et(DAY, "07:55"));
      s.attendance = await checkIn(s.worker, s.assignmentId);
      await ticks(et(DAY, "08:00"), et(DAY, "08:05"), et(DAY, "08:10"), et(DAY, "08:15"), et(DAY, "13:55"), et(DAY, "14:00"));
      setNow(et(DAY, "14:05"));
      await checkOut(s.worker, s.attendance);
      await ticks(et(DAY, "14:05"), et(DAY, "14:10"));
      // Staff prepare the hours at 14:30; the worker confirms at 15:00; the employer forgets.
      setNow(et(DAY, "14:30"));
      const prepared = await prepare(s.attendance.attendanceRecordId);
      s.timesheetId = prepared.id;
      setNow(et(DAY, "15:00"));
      await workerConfirm(s.worker, prepared);
      // +24 h after the end: the hours reminder; the employer confirms at 15:00; the Brain's 15:05 sweep.
      await ticks(et(NEXT, "07:00"), et(NEXT, "13:55"), et(NEXT, "14:00"), et(NEXT, "14:05"));
      setNow(et(NEXT, "15:00"));
      s.invoicesBefore = await prisma.invoice.count({ where: { timesheetId: s.timesheetId } });
      const res = await employerConfirmAttempt(s.timesheetId);
      expect(res.statusCode, res.body).toBe(200);
      await ticks(et(NEXT, "15:05"), et(NEXT2, "07:00"));
      await tell("1. normal day", et(PREV, "06:00"), [s.job.id, s.assignmentId, s.attendance.attendanceRecordId, s.timesheetId], [s.worker.email, s.worker.phone, employer.email, STAFF_ALERT_EMAIL]);
    }, 180_000);

    it("Employer: the Brain approves the request at its 06:05 sweep (all checks pass) and the employer gets the job code", async () => {
      expect(s.statusAfterBrain).toBe("approved_for_dispatch");
      const [approval] = (await actionsOn(s.job.id)).filter((a) => a.actionKey === "auto_approve_request");
      expect(approval).toMatchObject({ status: "done", actorType: "brain", kind: "live" });
      expect(within(sentTo(employer.email), et(PREV, "06:05"), et(PREV, "06:06")).length).toBeGreaterThan(0);
    });

    it("ACTUAL: the worker gets no reminder before the shift (the reminder cron skips claimed shifts)", async () => {
      expect(within(sentTo(s.worker.email, s.worker.phone), et(PREV, "07:00"), et(DAY, "07:55"))).toEqual([]);
      const assignment = await prisma.assignment.findUniqueOrThrow({ where: { id: s.assignmentId }, select: { status: true, shiftReminderSentAt: true } });
      expect(assignment).toMatchObject({ status: "attendance_handoff", shiftReminderSentAt: null });
    });

    // BUG: runShiftReminderSweep only reminds "confirmed | worker_acknowledged | ready_for_attendance",
    // but every claimed (or staff-assigned) shift is "attendance_handoff", so NO worker is ever reminded
    // before a shift. The Brain has no reminder of its own either. Correct: a reminder (email and/or
    // text) between 24 h and the start.
    it.fails("Worker: reminded before the shift (between 24 h and the start)", async () => {
      expect(within(sentTo(s.worker.email, s.worker.phone), et(PREV, "07:00"), et(DAY, "07:55")).length).toBeGreaterThan(0);
    });

    it("Worker: checked in at 07:55, so never texted to check in", async () => {
      expect((await actionsOn(s.assignmentId)).filter((a) => a.actionKey === "remind_worker_check_in")).toEqual([]);
      expect(within(sentTo(s.worker.phone), et(DAY, "07:55"), et(DAY, "14:10"))).toEqual([]);
    });

    // GAP: when the shift ends, nobody prepares the timesheet and the Brain has no rule for "shift over,
    // no timesheet". Here staff prepared it at 14:30; if they forget, no hours, no reminders, no invoice.
    // Correct: the Brain flags the finished shift without a timesheet (or prepares it).
    it.fails("Staff: the Brain flags the finished shift that has no timesheet yet", async () => {
      const issues = [...(await issuesOn(s.assignmentId)), ...(await issuesOn(s.attendance.attendanceRecordId))].filter((i) => i.ruleKey !== "worker_not_checked_in");
      expect(issues.filter((i) => i.detectedAt.getTime() >= et(DAY, "14:00").getTime() && i.detectedAt.getTime() < et(DAY, "14:30").getTime()).length).toBeGreaterThan(0);
    });

    it("Employer: exactly one hours reminder, 24 h after the end (not at 13:55, not again at 14:05)", async () => {
      const reminders = sentTo(employer.email).filter((m) => isHoursReminder(m, s.job.jobRequestNumber));
      expect(reminders.map((m) => m.at.toISOString())).toEqual([et(NEXT, "14:00").toISOString()]);
      expect((await actionsOn(s.timesheetId)).filter((a) => a.actionKey === "remind_employer_timesheet").map((a) => a.status)).toEqual(["done"]);
    });

    it("Money: the Brain approves the clean hours at 15:05 and moves no money (no invoice, payroll or payout)", async () => {
      expect((await timesheetRow(s.timesheetId)).status).toBe("approved");
      const [approval] = (await actionsOn(s.timesheetId)).filter((a) => a.actionKey === "auto_approve_timesheet");
      expect(approval).toMatchObject({ status: "done", actorType: "brain" });
      expect(approval!.createdAt.toISOString()).toBe(et(NEXT, "15:05").toISOString());
      expect(await prisma.invoice.count({ where: { timesheetId: s.timesheetId } })).toBe(s.invoicesBefore);
      expect(await prisma.payrollCalculation.count({ where: { workerIdentityId: s.worker.workerIdentityId } })).toBe(0);
      expect(await prisma.workerPayout.count({ where: { workerIdentityId: s.worker.workerIdentityId } })).toBe(0);
      expect(JOBLOP_BRAIN_ACTIONS.every((a) => a.movesMoney === false)).toBe(true);
    });

    it("Employer: no bonus offer for a job that was filled", async () => {
      expect(await prisma.jobBonus.count({ where: { jobRequestId: s.job.id } })).toBe(0);
    });

    it("Staff: one daily summary a day at 07:00, saying what the Brain found and did", async () => {
      for (const day of [PREV, DAY, NEXT, NEXT2]) {
        expect(sent.filter((m) => isDailySummary(m) && m.at.toISOString().slice(0, 10) === et(day, "07:00").toISOString().slice(0, 10)), day).toHaveLength(1);
      }
      const first = summaryEmailAt(et(PREV, "07:00"));
      expect(first?.text).toContain("The brain is LIVE");
      expect(first?.text).toContain("- Approve a request that passes every check: 1");
      const last = summaryEmailAt(et(NEXT2, "07:00"));
      expect(last?.text).toContain("- Email an employer to confirm hours: 1");
      expect(last?.text).toContain("- Approve hours with check-in and check-out and no problems: 1");
    });

    it("Staff: the Brain page lists each action with its reason", async () => {
      const page = await brainPage();
      const approval = page.actions.find((a) => a.actionKey === "auto_approve_timesheet" && a.reason.includes(s.job.jobRequestNumber));
      expect(approval).toMatchObject({ status: "done", actor: "brain" });
    });
  });

  // ── 2. Problems on the day ───────────────────────────────────────────────────────────────────────
  describe("2. problems on the day (shift Sat 01-09 08:00–14:00): late, no-show, no phone, text failure, early leave, dispute, worker never confirms", () => {
    const PREV = "2027-01-08";
    const DAY = "2027-01-09";
    const NEXT = "2027-01-10";
    const NEXT2 = "2027-01-11";
    const KINDS = ["late", "noshow", "nophone", "flaky", "early", "dispute", "unconfirmed"] as const;
    type Kind = (typeof KINDS)[number];
    type Case = { job: Job; worker: Worker; assignmentId: string; attendance?: Attendance; timesheetId?: string };
    const c = {} as Record<Kind, Case>;
    let pageAt0830: Awaited<ReturnType<typeof brainPage>>;
    let needsPeopleAt0830: string[] = [];
    let unconfirmedEmployerAttempt = 0;

    beforeAll(async () => {
      setNow(et(PREV, "06:00"));
      const jobs = {} as Record<Kind, Job>;
      for (const kind of KINDS) jobs[kind] = await requestJob({ startAt: et(DAY, "08:00"), endAt: et(DAY, "14:00"), title: `Farm worker, Laval (${kind})` });
      await tick(et(PREV, "06:05"));
      setNow(et(PREV, "06:30"));
      for (const kind of KINDS) {
        const worker = await makeWorker(kind, kind !== "nophone");
        c[kind] = { job: jobs[kind], worker, assignmentId: await claim(worker, jobs[kind].id) };
      }
      await ticks(et(PREV, "07:00"), et(PREV, "08:00"), et(DAY, "04:00"), et(DAY, "07:00"), et(DAY, "07:55"));
      setNow(et(DAY, "07:58"));
      for (const kind of ["early", "dispute", "unconfirmed"] as const) c[kind].attendance = await checkIn(c[kind].worker, c[kind].assignmentId);
      await ticks(et(DAY, "08:00"), et(DAY, "08:05"));
      // The texting provider fails once for the "flaky" worker's number.
      failNextTextTo.add(c.flaky.worker.phone!);
      await ticks(et(DAY, "08:10"), et(DAY, "08:15"), et(DAY, "08:20"));
      setNow(et(DAY, "08:25"));
      c.late.attendance = await checkIn(c.late.worker, c.late.assignmentId);
      await ticks(et(DAY, "08:25"), et(DAY, "08:30"));
      pageAt0830 = await brainPage();
      needsPeopleAt0830 = (await buildBrainSummary(brainStore, new Date())).needsPeople.map((i) => i.subjectId);
      setNow(et(DAY, "12:30"));
      await checkOut(c.early.worker, c.early.attendance!);
      await ticks(et(DAY, "13:55"));
      setNow(et(DAY, "14:00"));
      for (const kind of ["late", "dispute", "unconfirmed"] as const) await checkOut(c[kind].worker, c[kind].attendance!);
      await ticks(et(DAY, "14:00"), et(DAY, "14:05"));
      setNow(et(DAY, "14:30"));
      for (const kind of ["late", "early", "dispute", "unconfirmed"] as const) c[kind].timesheetId = (await prepare(c[kind].attendance!.attendanceRecordId)).id;
      // The "dispute" worker confirms; the employer disputes at 15:00. The "unconfirmed" worker never confirms.
      setNow(et(DAY, "14:40"));
      const disputeTs = await prisma.timesheet.findUniqueOrThrow({ where: { id: c.dispute.timesheetId! }, select: { id: true, version: true } });
      const confirmed = await workerConfirm(c.dispute.worker, { ...disputeTs, status: "", exceptionSummary: null, payableMinutes: 0, billableMinutes: 0 });
      setNow(et(DAY, "15:00"));
      const disputed = await app.inject({
        method: "POST", url: `/organizations/${scope.organizationId}/timesheets/${confirmed.id}/dispute`, headers: await h(employer),
        payload: { expectedVersion: confirmed.version, reason: "The worker left the field at 13:00." }
      });
      expect(disputed.statusCode, disputed.body).toBe(200);
      await ticks(et(NEXT, "07:00"), et(NEXT, "13:55"), et(NEXT, "14:00"), et(NEXT, "14:05"));
      // The employer follows the Brain's email and tries to confirm the hours the worker has not confirmed.
      setNow(et(NEXT, "14:30"));
      unconfirmedEmployerAttempt = (await employerConfirmAttempt(c.unconfirmed.timesheetId!)).statusCode;
      await ticks(et(NEXT, "15:05"), et(NEXT2, "07:00"));
      const subjects = KINDS.flatMap((k) => [c[k].job.id, c[k].assignmentId, ...(c[k].timesheetId ? [c[k].timesheetId!] : [])]);
      const failures = await prisma.messageDeliveryFailure.findMany({ where: { recipient: c.flaky.worker.phone! }, select: { id: true } });
      await tell("2. problems on the day", et(PREV, "06:00"), [...subjects, ...failures.map((f) => f.id)], [...KINDS.flatMap((k) => [c[k].worker.email, c[k].worker.phone]), employer.email, STAFF_ALERT_EMAIL]);
    }, 240_000);

    const textsInMorning = (kind: Kind) => within(sentTo(c[kind].worker.phone), et(DAY, "07:00"), et(DAY, "09:00"));

    it("Worker: a late or absent worker is texted once at 08:10 (+10 min), never before", async () => {
      for (const kind of ["late", "noshow"] as const) {
        expect(textsInMorning(kind).map((t) => [t.at.toISOString(), t.status]), kind).toEqual([[et(DAY, "08:10").toISOString(), "sent"]]);
        expect((await actionsOn(c[kind].assignmentId)).map((a) => [a.actionKey, a.status]), kind).toEqual([["remind_worker_check_in", "done"]]);
      }
      for (const kind of ["early", "dispute", "unconfirmed"] as const) expect(textsInMorning(kind), kind).toEqual([]);
    });

    it("Worker: when the text fails, the Brain re-sends it once at the next sweep (08:15)", async () => {
      expect(textsInMorning("flaky").map((t) => [t.at.toISOString(), t.status])).toEqual([
        [et(DAY, "08:10").toISOString(), "error"],
        [et(DAY, "08:15").toISOString(), "sent"]
      ]);
      expect((await actionsOn(c.flaky.assignmentId)).map((a) => [a.actionKey, a.status])).toEqual([["remind_worker_check_in", "failed"]]);
      const [failure] = await prisma.messageDeliveryFailure.findMany({ where: { recipient: c.flaky.worker.phone! } });
      expect(failure).toMatchObject({ channel: "sms", retryable: true, resendCount: 1 });
      expect((await actionsOn(failure!.id)).map((a) => [a.actionKey, a.status])).toEqual([["resend_failed_message", "done"]]);
    });

    it("ACTUAL: a worker with no phone is not texted (skipped) and stays an open issue on the Brain page", async () => {
      expect((await actionsOn(c.nophone.assignmentId)).map((a) => [a.actionKey, a.status, a.detail])).toEqual([
        ["remind_worker_check_in", "skipped", "No phone number or texts not set up."]
      ]);
      expect(pageAt0830.issues.filter((i) => i.subjectId === c.nophone.assignmentId).map((i) => i.ruleKey)).toEqual(["worker_not_checked_in"]);
      expect(needsPeopleAt0830).not.toContain(c.nophone.assignmentId);
    });

    // BUG: the daily summary's "Needs a person" list skips an issue whose action is switched on, even
    // when the action could not run (no phone). Nobody is pointed at a no-show who cannot be texted,
    // and staff "Do it" refuses it too (already handled). Correct: it is listed as needing a person.
    it.fails("Staff: a no-show the Brain could not text is listed as needing a person", async () => {
      expect(needsPeopleAt0830).toContain(c.nophone.assignmentId);
    });

    // BUG: the reminder text closes the no-show issue ("Done"), so at 08:30 the staff Brain page shows
    // nothing for a worker who is still not there. Correct: it stays open until the worker checks in.
    it.fails("Staff: a no-show stays on the Brain page after the reminder text while the worker is still missing", async () => {
      expect(pageAt0830.issues.map((i) => i.subjectId)).toContain(c.noshow.assignmentId);
    });

    // GAP: nobody tells the employer their worker has not arrived (nor staff, see above). Correct: by
    // +30 min the employer hears about it (email or text) so they can plan, and staff can replace.
    it.fails("Employer: told when their worker has still not checked in 30 minutes after the start", async () => {
      expect(within(sentTo(employer.email), et(DAY, "08:09"), et(DAY, "08:31")).length).toBeGreaterThan(0);
    });

    it("Money: late, early-leave and disputed hours go to people; the Brain neither approves nor chases them", async () => {
      for (const kind of ["late", "early"] as const) {
        expect((await timesheetRow(c[kind].timesheetId!)).status, kind).toBe("review_required");
        expect(await actionsOn(c[kind].timesheetId!), kind).toEqual([]);
      }
      expect(await timesheetRow(c.dispute.timesheetId!)).toMatchObject({ status: "correction_required", employerReviewStatus: "disputed" });
      expect(await actionsOn(c.dispute.timesheetId!)).toEqual([]);
      expect(sentTo(employer.email).filter((m) => isHoursReminder(m, c.dispute.job.jobRequestNumber))).toEqual([]);
    });

    it("ACTUAL: hours the WORKER has not confirmed: the Brain emails the employer, who then cannot confirm them", async () => {
      expect(sentTo(employer.email).filter((m) => isHoursReminder(m, c.unconfirmed.job.jobRequestNumber)).map((m) => m.at.toISOString())).toEqual([
        et(NEXT, "14:00").toISOString()
      ]);
      expect(unconfirmedEmployerAttempt).not.toBe(200);
      expect((await timesheetRow(c.unconfirmed.timesheetId!)).status).toBe("worker_review");
    });

    // BUG: timesheetUnconfirmedRule fires on worker_review too and always emails the employer, who can
    // only confirm in employer_review (409 above). The worker, who is holding it up, hears nothing.
    // Correct: the worker is reminded, and the employer is not asked yet.
    it.fails("Worker: reminded to confirm their own hours; the employer is not asked yet", async () => {
      expect(sentTo(employer.email).filter((m) => isHoursReminder(m, c.unconfirmed.job.jobRequestNumber))).toEqual([]);
      expect(within(sentTo(c.unconfirmed.worker.email, c.unconfirmed.worker.phone), et(NEXT, "13:55"), et(NEXT, "14:10")).length).toBeGreaterThan(0);
    });

    it("Staff: the next morning's summary counts the texts, the failure and the re-send", async () => {
      const summary = summaryEmailAt(et(NEXT, "07:00"));
      expect(summary?.text).toContain("- Text a worker to check in: 2");
      expect(summary?.text).toContain("- Re-send a failed email or text: 1");
      expect(summary?.text).toMatch(/Failed\n(- .*\n)*- Text a worker to check in: 1/);
    });
  });

  // ── 3. Cancellations under 24 h ──────────────────────────────────────────────────────────────────
  describe("3. cancellations (shift Wed 01-13 08:00–14:00): staff cancel, employer cancel, unfilled job cancelled", () => {
    const PREV = "2027-01-12";
    const DAY = "2027-01-13";
    const s = {} as { staffCancel: Job; employerCancel: Job; unfilled: Job; staffWorker: Worker; employerWorker: Worker; staffAssignment: string; employerAssignment: string };

    beforeAll(async () => {
      setNow(et(PREV, "06:00"));
      s.staffCancel = await requestJob({ startAt: et(DAY, "08:00"), endAt: et(DAY, "14:00"), title: "Farm worker, Laval (staff cancels)" });
      s.employerCancel = await requestJob({ startAt: et(DAY, "08:00"), endAt: et(DAY, "14:00"), title: "Farm worker, Laval (employer cancels)" });
      s.unfilled = await requestJob({ startAt: et(DAY, "08:00"), endAt: et(DAY, "14:00"), title: "Farm worker, Laval (cancelled, nobody booked)" });
      await tick(et(PREV, "06:05"));
      setNow(et(PREV, "06:30"));
      s.staffWorker = await makeWorker("staff-cancelled");
      s.employerWorker = await makeWorker("employer-cancelled");
      s.staffAssignment = await claim(s.staffWorker, s.staffCancel.id);
      s.employerAssignment = await claim(s.employerWorker, s.employerCancel.id);
      // 06:45: the employer cancels the job nobody took (25 h before the start).
      setNow(et(PREV, "06:45"));
      const early = await app.inject({
        method: "POST", url: `/organizations/${scope.organizationId}/job-requests/${s.unfilled.id}/cancel/confirm`, headers: await h(employer),
        payload: { idempotencyKey: `brl-${randomUUID()}` }
      });
      expect(early.statusCode, early.body).toBe(200);
      await ticks(et(PREV, "07:00"), et(PREV, "07:55"), et(PREV, "08:00"), et(PREV, "08:05"));
      // 14:00 the day before (18 h before): staff cancel one booked shift, the employer cancels the other job.
      setNow(et(PREV, "14:00"));
      const item = await attendanceItem(s.staffWorker, s.staffAssignment);
      const staffCancel = await app.inject({
        method: "POST", url: `/platform/attendance/${item.attendanceRecordId}/cancel`, headers: await h(staff),
        payload: { expectedVersion: item.version, reason: "staff_cancelled" }
      });
      expect(staffCancel.statusCode, staffCancel.body).toBe(200);
      const employerCancel = await app.inject({
        method: "POST", url: `/organizations/${scope.organizationId}/job-requests/${s.employerCancel.id}/cancel/confirm`, headers: await h(employer),
        payload: { idempotencyKey: `brl-${randomUUID()}` }
      });
      expect(employerCancel.statusCode, employerCancel.body).toBe(200);
      await ticks(et(DAY, "04:00"), et(DAY, "07:00"), et(DAY, "07:55"), et(DAY, "08:00"), et(DAY, "08:05"), et(DAY, "08:10"), et(DAY, "08:15"));
      await tell(
        "3. cancellations",
        et(PREV, "06:00"),
        [s.staffCancel.id, s.employerCancel.id, s.unfilled.id, s.staffAssignment, s.employerAssignment],
        [s.staffWorker.email, s.staffWorker.phone, s.employerWorker.email, s.employerWorker.phone, employer.email, STAFF_ALERT_EMAIL]
      );
    }, 180_000);

    it("Employer: a job cancelled before anyone took it is never flagged as unfilled and gets no bonus offer", async () => {
      expect(await jobStatus(s.unfilled)).toBe("cancelled");
      expect((await issuesOn(s.unfilled.id)).filter((i) => i.ruleKey === "job_unfilled_soon")).toEqual([]);
      expect(await prisma.jobBonus.count({ where: { jobRequestId: s.unfilled.id } })).toBe(0);
    });

    it("Employer: a job cancelled with a worker booked gets no bonus offer", async () => {
      expect(await jobStatus(s.employerCancel)).toBe("cancelled");
      expect(await prisma.jobBonus.count({ where: { jobRequestId: s.employerCancel.id } })).toBe(0);
    });

    it("Worker: told by email when staff cancel their shift", async () => {
      expect(within(sentTo(s.staffWorker.email), et(PREV, "14:00"), et(PREV, "14:01")).filter((m) => /cancel|annul/i.test(m.subject)).length).toBe(1);
    });

    // BUG: a staff cancel only cancels the attendance record; the assignment stays "attendance_handoff",
    // which the Brain's no-check-in rule reads, so at 08:10 it texts the worker to check in to a shift
    // that was cancelled. Correct: no text, no Brain action. (Overlaps fix/cancel-booked-shift.)
    it.fails("Worker: not chased to check in after staff cancelled the shift", async () => {
      expect(within(sentTo(s.staffWorker.phone), et(DAY, "07:00"), et(DAY, "09:00"))).toEqual([]);
      expect((await actionsOn(s.staffAssignment)).filter((a) => a.actionKey === "remind_worker_check_in")).toEqual([]);
    });

    // BUG: an employer cancel leaves the booked assignment "attendance_handoff" too, so the Brain texts
    // the worker to check in to a job that no longer exists. Correct: no text. (Overlaps the same fix.)
    it.fails("Worker: not chased to check in after the employer cancelled the job", async () => {
      expect(within(sentTo(s.employerWorker.phone), et(DAY, "07:00"), et(DAY, "09:00"))).toEqual([]);
      expect((await actionsOn(s.employerAssignment)).filter((a) => a.actionKey === "remind_worker_check_in")).toEqual([]);
    });
  });

  // ── 4. Unfilled jobs and the bonus ───────────────────────────────────────────────────────────────
  describe("4. unfilled jobs (shift Sun 01-17 08:00–14:00): bonus offer, 3-place job, job not on the board, employer declines", () => {
    const PREV = "2027-01-16";
    const DAY = "2027-01-17";
    const s = {} as { open1: Job; three: Job; offBoard: Job; declined: Job; claimer: Worker; listingBonus: unknown };
    const bonusesFor = (job: Job) => prisma.jobBonus.findMany({ where: { jobRequestId: job.id }, orderBy: { createdAt: "asc" } });
    const bonusEmails = (from: Date, until: Date) => within(sentTo(employer.email), from, until).filter((m) => /prime|bonus/i.test(m.subject));

    beforeAll(async () => {
      setNow(et(PREV, "06:00"));
      s.open1 = await requestJob({ startAt: et(DAY, "08:00"), endAt: et(DAY, "14:00"), title: "Farm worker, Laval (unfilled)" });
      s.three = await requestJob({ startAt: et(DAY, "08:00"), endAt: et(DAY, "14:00"), title: "Farm workers, Laval (3 places)", workers: 3 });
      s.declined = await requestJob({ startAt: et(DAY, "08:00"), endAt: et(DAY, "14:00"), title: "Farm worker, Laval (employer declines bonus)" });
      // Staff approve this one by hand at 06:01, NOT on the job board (they will offer it to chosen workers).
      s.offBoard = await requestJob({ startAt: et(DAY, "08:00"), endAt: et(DAY, "14:00"), title: "Farm worker, Laval (not on the job board)" });
      setNow(et(PREV, "06:01"));
      await staffApprove(s.offBoard, false);
      await tick(et(PREV, "06:05"));
      setNow(et(PREV, "06:30"));
      await claim(await makeWorker("three-a"), s.three.id);
      await claim(await makeWorker("three-b"), s.three.id);
      await ticks(et(PREV, "07:00"), et(PREV, "07:55"), et(PREV, "08:00"), et(PREV, "08:05"));
      // 09:00: the employer accepts the bonus on one job and declines it on another.
      setNow(et(PREV, "09:00"));
      for (const [job, decision] of [[s.open1, "accept"], [s.declined, "decline"]] as const) {
        const offer = await app.inject({ method: "GET", url: `/employer/job-requests/${job.id}/bonus-offer`, headers: await h(employer) });
        expect(offer.statusCode, offer.body).toBe(200);
        const bonusId = (offer.json().offer as { bonusId: string }).bonusId;
        const res = await app.inject({ method: "POST", url: `/employer/bonuses/${bonusId}/${decision}`, headers: await h(employer) });
        expect(res.statusCode, res.body).toBe(200);
      }
      // 10:00: a worker sees the bonus on the board and claims.
      setNow(et(PREV, "10:00"));
      s.claimer = await makeWorker("bonus");
      const board = await app.inject({ method: "GET", url: "/marketplace/open-jobs", headers: await h(s.claimer) });
      expect(board.statusCode, board.body).toBe(200);
      s.listingBonus = (board.json().jobs as { jobRequestId: string; bonus: unknown }[]).find((j) => j.jobRequestId === s.open1.id)?.bonus;
      await claim(s.claimer, s.open1.id);
      await ticks(et(DAY, "03:55"), et(DAY, "04:00"), et(DAY, "04:05"), et(DAY, "07:00"));
      await tell("4. unfilled jobs", et(PREV, "06:00"), [s.open1.id, s.three.id, s.offBoard.id, s.declined.id], [employer.email, s.claimer.email, s.claimer.phone, STAFF_ALERT_EMAIL]);
    }, 180_000);

    it("Employer: 24 h before, the Brain offers the employer a bonus (not at 07:55); nothing is charged", async () => {
      const [bonus] = await bonusesFor(s.open1);
      expect(bonus).toMatchObject({ kind: "hourly", fundedBy: "employer" });
      expect(["employer_accepted", "approved"]).toContain(bonus!.status);
      const [offer] = (await actionsOn(s.open1.id)).filter((a) => a.actionKey === "offer_employer_bonus");
      expect(offer).toMatchObject({ status: "done", actorType: "brain", undoKind: "withdraw_bonus_offer" });
      expect(offer!.createdAt.toISOString()).toBe(et(PREV, "08:00").toISOString());
      expect(bonusEmails(et(PREV, "07:55"), et(PREV, "07:56"))).toEqual([]);
      expect(bonusEmails(et(PREV, "08:00"), et(PREV, "08:01")).length).toBeGreaterThan(0);
      expect(await prisma.lateCancellationCharge.count({ where: { jobRequestId: s.open1.id } })).toBe(0);
    });

    it("Staff: the unfilled-shift alert reaches staff at 24 h too", async () => {
      const alerts = within(sentTo(STAFF_ALERT_EMAIL), et(PREV, "08:00"), et(PREV, "08:01")).filter((m) => /unfilled/i.test(m.subject));
      expect(alerts).toHaveLength(1);
      expect(alerts[0]!.text).toContain(s.open1.jobRequestNumber);
    });

    it("Worker: sees the accepted bonus (kind and amount only); once filled, the Brain stops flagging the job", async () => {
      expect(s.listingBonus).toMatchObject({ kind: "hourly" });
      expect(keysIn(s.listingBonus).filter((k) => EMPLOYER_SIDE_KEYS.test(k))).toEqual([]);
      const late = (await issuesOn(s.open1.id)).filter((i) => i.ruleKey === "job_unfilled_soon" && i.detectedAt.getTime() >= et(DAY, "00:00").getTime());
      expect(late).toEqual([]);
    });

    it("Employer: the 3-place job with 2 claims is flagged as 1 of 3 open and offered a bonus", async () => {
      const [issue] = (await issuesOn(s.three.id)).filter((i) => i.ruleKey === "job_unfilled_soon");
      expect(issue?.summary).toContain("1 of 3 places open");
      expect((await bonusesFor(s.three)).map((b) => b.status)).toEqual(["offered_to_employer"]);
    });

    it("ACTUAL: a job approved without the job board is still offered a bonus", async () => {
      expect((await prisma.jobRequest.findUniqueOrThrow({ where: { id: s.offBoard.id }, select: { openClaim: true } })).openClaim).toBe(false);
      expect((await bonusesFor(s.offBoard)).length).toBe(1);
    });

    // BUG: listUnfilledShifts (and so the Brain's unfilled rule and the bonus offer) does not look at
    // openClaim. A job staff approved for chosen workers only, not on the job board, gets the same
    // employer bonus email; workers cannot even see it. Correct (owner rule): offer a bonus only for an
    // unfilled job that is on the job board.
    it.fails("Employer: no bonus offer for a job that is not on the job board", async () => {
      expect(await bonusesFor(s.offBoard)).toEqual([]);
    });

    it("ACTUAL: after the employer declines, the Brain offers the same employer a bonus again at 4 h", async () => {
      expect((await bonusesFor(s.declined)).map((b) => b.status)).toEqual(["employer_declined", "offered_to_employer"]);
    });

    // BUG: the "already has a bonus" checks only count offered/accepted/approved, so a declined offer
    // does not count. At the 4 h threshold a new issue appears and the Brain emails the employer the
    // same kind of offer again. Correct (owner rule: employer first, else platform-funded with a cap):
    // the employer is asked once; after a "no" it goes to staff / the platform-funded path.
    it.fails("Employer: asked once; after a 'no' the Brain does not ask the same employer again", async () => {
      expect(await bonusesFor(s.declined)).toHaveLength(1);
    });

    it("Staff: the morning summary shows the bonus offers", async () => {
      expect(summaryEmailAt(et(DAY, "07:00"))?.text).toContain("- Offer the employer a bonus for an unfilled job:");
    });
  });

  // ── Phase 2: the role assistant, per role, with the scripted model ──────────────────────────────
  describe("assistant: worker, employer and staff by chat (scripted model), shift Fri 01-22 08:00–14:00", () => {
    const TODAY = "2027-01-21";
    const SHIFT_DAY = "2027-01-22";
    const s = {} as {
      job: Job; spare: Job; worker: Worker; other: Worker; workerConversation: string; claimToken: string;
      assignmentId: string; timesheetId: string; spareCard: Card; spareConversation: string;
    };

    async function chat(side: "worker" | "employer", actor: Actor, body: string, topic = "shift") {
      const before = modelRequests.length;
      const res = await app.inject({ method: "POST", url: `/contact/${side}/conversations`, headers: await h(actor), payload: { topic, body, locale: "en" } });
      expect(res.statusCode, res.body).toBe(200);
      const id = (res.json() as { id: string }).id;
      const view = await app.inject({ method: "GET", url: `/contact/${side}/conversations/${id}`, headers: await h(actor) });
      expect(view.statusCode, view.body).toBe(200);
      const v = view.json() as { conversation: { status: string }; messages: { authorKind: string; body: string }[] };
      return {
        conversationId: id,
        status: v.conversation.status,
        messages: v.messages,
        cards: v.messages.filter((m) => m.authorKind === "assistant_action").map((m) => JSON.parse(m.body) as Card),
        toolResults: toolResultsSince(before),
        modelCalls: modelRequests.length - before
      };
    }
    async function confirm(side: "worker" | "employer", actor: Actor, conversationId: string, token: string) {
      const res = await app.inject({ method: "POST", url: `/contact/${side}/assistant/confirm`, headers: await h(actor), payload: { conversationId, token, locale: "en" } });
      expect(res.statusCode, res.body).toBe(200);
      return res.json() as ConfirmOutcome;
    }
    async function staffAsk(question: string) {
      const before = modelRequests.length;
      const res = await app.inject({ method: "POST", url: "/platform/contact/ask", headers: await h(staff), payload: { question, locale: "en" } });
      expect(res.statusCode, res.body).toBe(200);
      return { ...(res.json() as { answer: string | null; cards?: Card[] }), toolResults: toolResultsSince(before) };
    }
    async function staffConfirm(token: string) {
      const res = await app.inject({ method: "POST", url: "/platform/assistant/confirm", headers: await h(staff), payload: { token, locale: "en" } });
      expect(res.statusCode, res.body).toBe(200);
      return res.json() as ConfirmOutcome;
    }
    const handoffReason = async (conversationId: string) => {
      const res = await app.inject({ method: "GET", url: `/platform/contact/conversations/${conversationId}`, headers: await h(staff) });
      expect(res.statusCode, res.body).toBe(200);
      return (res.json() as { conversation: { handoffReason: string | null; status: string } }).conversation;
    };
    const assignmentOf = (worker: Worker, job: Job) => prisma.assignment.findFirst({ where: { jobRequestId: job.id, workerIdentityId: worker.workerIdentityId }, select: { id: true } });

    beforeAll(async () => {
      setNow(et(TODAY, "09:00"));
      s.job = await requestJob({ startAt: et(SHIFT_DAY, "08:00"), endAt: et(SHIFT_DAY, "14:00"), title: "Farm worker, Laval (chat)" });
      await staffApprove(s.job, true);
      s.spare = await requestJob({ startAt: et(SHIFT_DAY, "08:00"), endAt: et(SHIFT_DAY, "14:00"), title: "Farm worker, Laval (spare)" });
      await staffApprove(s.spare, true);
      s.worker = await makeWorker("chat");
      s.other = await makeWorker("chat-other");
      modelScript.length = 0;
    }, 60_000);

    afterAll(async () => {
      if (s.job && s.worker) await tell("assistant", et(TODAY, "09:00"), [s.job.id, s.spare.id, ...(s.timesheetId ? [s.timesheetId] : [])], [s.worker.email, s.worker.phone, s.other.email, employer.email, CONTACT_DESK_EMAIL]);
    });

    it("Worker: 'find me work tomorrow' → search → claim card → Confirm → the job is theirs; never the employer rate or Joblop's share", async () => {
      setNow(et(TODAY, "10:00"));
      modelScript.push(
        callTools(useTool("search_open_jobs", { place: "Laval", dateFrom: SHIFT_DAY, sort: "soonest" })),
        callTools(useTool("claim_open_job", { jobRequestId: s.job.id })),
        answer("There is a farm job tomorrow in Laval at $16.60 an hour. Check the card and press Confirm.")
      );
      const turn = await chat("worker", s.worker, "Find me farm work tomorrow in Laval");
      expect(turn.modelCalls).toBe(3);
      expect(turn.status).toBe("ai");
      // What the model saw from the search: the worker's own pay, never the other side's numbers.
      const search = JSON.parse(turn.toolResults[0]!) as { jobs: { jobRequestId: string; hourlyPay: number }[] };
      expect(search.jobs.find((j) => j.jobRequestId === s.job.id)?.hourlyPay).toBe(WORKER_RATE / 100);
      for (const result of turn.toolResults) {
        const parsed = JSON.parse(result) as unknown;
        for (const hidden of EMPLOYER_SIDE_NUMBERS) expect(numbersIn(parsed)).not.toContain(hidden);
        expect(keysIn(parsed).filter((k) => EMPLOYER_SIDE_KEYS.test(k))).toEqual([]);
      }
      // Proposing changed nothing: one card, no assignment yet.
      expect(turn.cards.map((card) => card.tool)).toEqual(["claim_open_job"]);
      for (const hidden of EMPLOYER_SIDE_NUMBERS) expect(numbersIn(turn.cards[0]!.card)).not.toContain(hidden);
      expect(await assignmentOf(s.worker, s.job)).toBeNull();

      const outcome = await confirm("worker", s.worker, turn.conversationId, turn.cards[0]!.token);
      expect(outcome).toMatchObject({ status: "done", code: "claimed", tool: "claim_open_job" });
      const assignment = await assignmentOf(s.worker, s.job);
      expect(assignment).not.toBeNull();
      s.assignmentId = assignment!.id;
      s.workerConversation = turn.conversationId;
      s.claimToken = turn.cards[0]!.token;
      const [audit] = await prisma.brainAction.findMany({ where: { actionKey: "assistant.claim_open_job", actorUserId: s.worker.id } });
      expect(audit).toMatchObject({ status: "done", actorType: "user", kind: "live" });
    });

    it("Guard: the same card replayed is refused and nothing runs twice", async () => {
      const replay = await confirm("worker", s.worker, s.workerConversation, s.claimToken);
      expect(replay).toMatchObject({ status: "rejected", reason: "already_used" });
      expect(await prisma.assignment.count({ where: { jobRequestId: s.job.id, workerIdentityId: s.worker.workerIdentityId } })).toBe(1);
    });

    it("ACTUAL: 'tomorrow' sent as both first and last day (dateFrom = dateTo) finds nothing", async () => {
      setNow(et(TODAY, "10:05"));
      modelScript.push(callTools(useTool("search_open_jobs", { place: "Laval", dateFrom: SHIFT_DAY, dateTo: SHIFT_DAY })), answer("I found no job tomorrow."));
      const turn = await chat("worker", s.other, "Any farm work tomorrow in Laval?");
      const search = JSON.parse(turn.toolResults[0]!) as { jobs: { jobRequestId: string }[] };
      expect(search.jobs.map((j) => j.jobRequestId)).not.toContain(s.spare.id);
    });

    // BUG: the search route reads dateTo "2027-01-22" as 2027-01-22T00:00Z, so every job ON that day is
    // dropped. search_open_jobs tells the model dateTo is the "last day", so "tomorrow" (from = to =
    // tomorrow) finds nothing. Correct: dateTo includes the whole day (in the job's time zone).
    it.fails("Worker: 'tomorrow' as both first and last day finds tomorrow's open job", async () => {
      setNow(et(TODAY, "10:06"));
      modelScript.push(callTools(useTool("search_open_jobs", { place: "Laval", dateFrom: SHIFT_DAY, dateTo: SHIFT_DAY })), answer("Here is what I found."));
      const turn = await chat("worker", s.other, "Is there farm work tomorrow in Laval?");
      const search = JSON.parse(turn.toolResults[0]!) as { jobs: { jobRequestId: string }[] };
      expect(search.jobs.map((j) => j.jobRequestId)).toContain(s.spare.id);
    });

    it("Guard: a card confirmed after 10 minutes has expired; nothing is claimed", async () => {
      setNow(et(TODAY, "10:30"));
      modelScript.push(callTools(useTool("claim_open_job", { jobRequestId: s.spare.id })), answer("Check the card and press Confirm."));
      const turn = await chat("worker", s.other, "Take the spare farm job tomorrow for me");
      expect(turn.cards).toHaveLength(1);
      setNow(et(TODAY, "10:41"));
      expect(await confirm("worker", s.other, turn.conversationId, turn.cards[0]!.token)).toMatchObject({ status: "rejected", reason: "expired" });
      expect(await assignmentOf(s.other, s.spare)).toBeNull();
    });

    it("Guard: a switched-off action is refused, both when proposing and at Confirm", async () => {
      setNow(et(TODAY, "10:50"));
      modelScript.push(callTools(useTool("claim_open_job", { jobRequestId: s.spare.id })), answer("Check the card and press Confirm."));
      const turn = await chat("worker", s.other, "Please take the spare farm job tomorrow");
      expect(turn.cards).toHaveLength(1);
      s.spareCard = turn.cards[0]!;
      s.spareConversation = turn.conversationId;
      await setSwitch("assistant.worker.claim_job", false);
      try {
        expect(await confirm("worker", s.other, turn.conversationId, s.spareCard.token)).toMatchObject({ status: "rejected", reason: "switched_off" });
        modelScript.push(callTools(useTool("claim_open_job", { jobRequestId: s.spare.id })), answer("That is not available in chat; use Find work."));
        const off = await chat("worker", s.other, "Take the spare job then");
        expect(off.cards).toEqual([]);
        expect(off.toolResults[0]).toContain("switched_off");
      } finally {
        await setSwitch("assistant.worker.claim_job", true);
      }
      expect(await assignmentOf(s.other, s.spare)).toBeNull();
    });

    it("Guard: someone else's card is refused", async () => {
      const stolen = await confirm("worker", s.worker, s.workerConversation, s.spareCard.token);
      expect(stolen).toMatchObject({ status: "rejected", reason: "not_yours" });
      expect(await assignmentOf(s.worker, s.spare)).toBeNull();
    });

    it("Guard: safety and health messages go straight to staff; the model is never called", async () => {
      setNow(et(TODAY, "11:00"));
      const deskBefore = sentTo(CONTACT_DESK_EMAIL).length;
      const hurt = await chat("worker", s.other, "I hurt my hand at work this morning");
      expect(hurt.modelCalls).toBe(0);
      expect(hurt.cards).toEqual([]);
      expect(await handoffReason(hurt.conversationId)).toMatchObject({ status: "needs_admin", handoffReason: "safety" });
      const health = await chat("worker", s.other, "I am pregnant and need lighter work next week");
      expect(health.modelCalls).toBe(0);
      expect(await handoffReason(health.conversationId)).toMatchObject({ status: "needs_admin", handoffReason: "health" });
      expect(sentTo(CONTACT_DESK_EMAIL).length).toBeGreaterThan(deskBefore);
    });

    it("the shift: the worker who claimed by chat works 07:55–14:05; staff prepare the hours; the worker confirms", async () => {
      setNow(et(SHIFT_DAY, "07:55"));
      const record = await checkIn(s.worker, s.assignmentId);
      setNow(et(SHIFT_DAY, "14:05"));
      await checkOut(s.worker, record);
      setNow(et(SHIFT_DAY, "14:30"));
      const ts = await prepare(record.attendanceRecordId);
      expect(ts).toMatchObject({ status: "worker_review", payableMinutes: 360, billableMinutes: 360 });
      setNow(et(SHIFT_DAY, "14:40"));
      expect((await workerConfirm(s.worker, ts)).status).toBe("employer_review");
      s.timesheetId = ts.id;
    });

    it("Employer: 'which hours do I need to confirm?' → reads the timesheets (never worker pay) → confirm card → Confirm", async () => {
      setNow(et(SHIFT_DAY, "15:00"));
      modelScript.push(
        callTools(useTool("timesheets_to_confirm", {})),
        callTools(useTool("confirm_timesheet", { timesheetId: s.timesheetId })),
        answer("Today's farm shift shows 6 hours. Check the card and press Confirm.")
      );
      const turn = await chat("employer", employer, "Which hours do I need to confirm? Please confirm today's farm worker hours.", "timesheet");
      const list = JSON.parse(turn.toolResults[0]!) as { timesheets: { timesheetId: string; billedMinutes: number }[] };
      expect(list.timesheets.find((t) => t.timesheetId === s.timesheetId)?.billedMinutes).toBe(360);
      for (const result of turn.toolResults) {
        const parsed = JSON.parse(result) as unknown;
        for (const hidden of [...WORKER_PAY_NUMBERS, PLATFORM_SHARE, PLATFORM_SHARE / 100]) expect(numbersIn(parsed)).not.toContain(hidden);
        expect(keysIn(parsed).filter((k) => WORKER_PAY_KEYS.test(k) || /margin|platformShare/i.test(k))).toEqual([]);
      }
      expect(turn.cards.map((card) => card.tool)).toEqual(["confirm_timesheet"]);
      expect((await timesheetRow(s.timesheetId)).employerReviewStatus).not.toBe("confirmed");
      const outcome = await confirm("employer", employer, turn.conversationId, turn.cards[0]!.token);
      expect(outcome).toMatchObject({ status: "done", code: "hours_confirmed" });
      expect(await timesheetRow(s.timesheetId)).toMatchObject({ status: "platform_review", employerReviewStatus: "confirmed" });
    });

    it("Staff: asks what the Brain needs, then runs the Brain's action for one issue through Confirm", async () => {
      // Staff have chosen to approve hours by hand for now (switch off), so the ready hours wait for them.
      await setSwitch("auto_approve_timesheet", false);
      try {
        await tick(et(SHIFT_DAY, "15:05"));
        const issue = await prisma.brainIssue.findUniqueOrThrow({ where: { fingerprint: `timesheet_ready:${s.timesheetId}` } });
        expect(issue).toMatchObject({ status: "open", recommendedAction: "auto_approve_timesheet" });
        expect(await actionsOn(s.timesheetId)).toEqual([]);

        setNow(et(SHIFT_DAY, "15:10"));
        modelScript.push(callTools(useTool("brain_open_issues", {})), answer("One set of hours is ready for approval."));
        const listed = await staffAsk("What does the Brain need from me right now?");
        expect(listed.toolResults[0]).toContain(issue.id);
        expect(listed.toolResults[0]).toContain("auto_approve_timesheet");

        modelScript.push(callTools(useTool("brain_do_it", { issueId: issue.id })), answer("Check the card and press Confirm."));
        const asked = await staffAsk("Approve those hours.");
        expect((asked.cards ?? []).map((card) => card.tool)).toEqual(["brain_do_it"]);
        expect((await timesheetRow(s.timesheetId)).status).toBe("platform_review");
        const outcome = await staffConfirm(asked.cards![0]!.token);
        expect(outcome).toMatchObject({ status: "done", code: "brain_done" });
        expect((await timesheetRow(s.timesheetId)).status).toBe("approved");
        expect((await actionsOn(s.timesheetId)).map((a) => [a.actionKey, a.actorType, a.status])).toEqual([["auto_approve_timesheet", "staff", "done"]]);
        expect(await prisma.invoice.count({ where: { timesheetId: s.timesheetId } })).toBe(0);
      } finally {
        await setSwitch("auto_approve_timesheet", true);
      }
    });

    it("Worker: 'my hours?' → reads their own timesheet; never the employer rate or Joblop's share", async () => {
      setNow(et(SHIFT_DAY, "15:20"));
      modelScript.push(callTools(useTool("my_timesheets", {})), answer("Your shift today counts 6 hours."));
      const turn = await chat("worker", s.worker, "How many hours do I have for today's shift?");
      const mine = JSON.parse(turn.toolResults[0]!) as { timesheets: { timesheetId: string; paidMinutes: number; status: string }[] };
      expect(mine.timesheets.find((t) => t.timesheetId === s.timesheetId)).toMatchObject({ paidMinutes: 360, status: "approved" });
      const parsed = JSON.parse(turn.toolResults[0]!) as unknown;
      for (const hidden of EMPLOYER_SIDE_NUMBERS) expect(numbersIn(parsed)).not.toContain(hidden);
      expect(keysIn(parsed).filter((k) => EMPLOYER_SIDE_KEYS.test(k))).toEqual([]);
    });

    const draftByChat = () => ({
      residenceId: scope.residenceId, departmentId: scope.departmentId, workGroup: "farming_agriculture", roleKey: "farm_worker",
      title: "Farm worker, Laval (by chat)", description: "Harvest and pack vegetables.", numberOfWorkers: 1,
      startAt: et("2027-01-26", "08:00").toISOString(), endAt: et("2027-01-26", "14:00").toISOString()
    });

    it("ACTUAL: the employer cannot create a draft request by chat (the tool answers unknown_role, no card)", async () => {
      setNow(et(SHIFT_DAY, "15:30"));
      modelScript.push(callTools(useTool("create_draft_request", draftByChat())), answer("I could not prepare that request."));
      const turn = await chat("employer", employer, "Create a request for one farm worker next Tuesday 8 to 2 at the greenhouse.");
      expect(turn.cards).toEqual([]);
      expect(turn.toolResults[0]).toContain("unknown_role");
    });

    // BUG: create_draft_request looks roles up by a `key` field the real catalogue routes do not send
    // (they send code / slug), so it never finds a role. See assistantRealLife.test.ts. Correct: a
    // card, and after Confirm a draft (not submitted) for the farm worker role.
    it.fails("Employer: creates a draft request by chat (card → Confirm → a draft, not yet sent)", async () => {
      setNow(et(SHIFT_DAY, "15:35"));
      modelScript.push(callTools(useTool("create_draft_request", draftByChat())), answer("Check the card and press Confirm."));
      const turn = await chat("employer", employer, "Create a request for one farm worker next Tuesday 8 to 2 at the greenhouse.");
      expect(turn.cards.map((card) => card.tool)).toEqual(["create_draft_request"]);
      expect(await confirm("employer", employer, turn.conversationId, turn.cards[0]!.token)).toMatchObject({ status: "done", code: "draft_created" });
      expect(await prisma.jobRequest.count({ where: { organizationId: scope.organizationId, title: "Farm worker, Laval (by chat)", status: "draft" } })).toBe(1);
    });

    it("Employer: submits a draft by chat (card → Confirm); the Brain approves it at its next sweep", async () => {
      setNow(et(SHIFT_DAY, "15:40"));
      const draft = await draftRequest({ startAt: et("2027-01-26", "08:00"), endAt: et("2027-01-26", "14:00"), title: "Farm worker, Laval (submitted by chat)" });
      modelScript.push(callTools(useTool("submit_draft", { jobRequestId: draft.id })), answer("Check the card and press Confirm."));
      const turn = await chat("employer", employer, "Please send my Tuesday farm worker draft to Joblop.");
      expect(turn.cards.map((card) => card.tool)).toEqual(["submit_draft"]);
      expect(await jobStatus({ id: draft.id, jobRequestNumber: draft.jobRequestNumber })).toBe("draft");
      expect(await confirm("employer", employer, turn.conversationId, turn.cards[0]!.token)).toMatchObject({ status: "done", code: "submitted" });
      expect(await jobStatus({ id: draft.id, jobRequestNumber: draft.jobRequestNumber })).toBe("submitted");
      await tick(et(SHIFT_DAY, "15:45"));
      expect(await jobStatus({ id: draft.id, jobRequestNumber: draft.jobRequestNumber })).toBe("approved_for_dispatch");
      expect((await actionsOn(draft.id)).map((a) => [a.actionKey, a.actorType, a.status])).toEqual([["auto_approve_request", "brain", "done"]]);
    });
  });
});
