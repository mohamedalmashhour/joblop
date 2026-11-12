import { createMemoryBrainStore, type BrainMode } from "@rwos/brain";
import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import type { EmailMessage, EmailSender } from "../mailer/emailSender";
import { NOW, emptyRows, fakeData, fakeEffects, shift, timesheet } from "./brainTestFixtures";
import { maybeSendDailySummary, registerBrainRoutes } from "./brainRoutes";
import { createJoblopBrain } from "./joblopBrain";

const TOKEN = "brain-sweep-token-0123456789";

function emailFake() {
  const sent: EmailMessage[] = [];
  const sender: EmailSender = { configured: true, send: async (m) => (sent.push(m), { status: "sent", id: "1" }) };
  return { sender, sent };
}

function build(options: { token?: string; db?: boolean; mode?: BrainMode; switches?: Record<string, boolean> } = {}) {
  const store = createMemoryBrainStore({ mode: options.mode ?? "off", switches: options.switches ?? {} });
  const rows = { ...emptyRows(), shifts: [shift()], timesheets: [timesheet({ status: "platform_review", employerReviewStatus: "confirmed" })] };
  const { effects, calls } = fakeEffects();
  const brain = createJoblopBrain({ store, data: fakeData(rows), effects, now: () => NOW });
  const email = emailFake();
  const app = Fastify();
  registerBrainRoutes(app, {
    brain: options.db === false ? null : brain,
    store: options.db === false ? null : store,
    sweepToken: options.token ?? TOKEN,
    requireStaff: async (request, reply) => {
      if (!request.headers.authorization) {
        reply.code(401).send({ error: "denied" });
        return null;
      }
      if (request.headers.authorization !== "Bearer staff") {
        reply.code(403).send({ error: "denied" });
        return null;
      }
      return "77777777-7777-4777-8777-777777777777";
    },
    emailSender: email.sender,
    staffEmail: "ops@example.com",
    summaryHourUtc: 12,
    actorConfigured: true,
    now: () => NOW
  });
  return { app, store, calls, email };
}

const staff = { authorization: "Bearer staff" };

describe("brain routes", () => {
  describe("POST /internal/brain/sweep", () => {
    it("404 when no token is configured (or it is too short)", async () => {
      for (const token of ["", "short"]) {
        const res = await build({ token }).app.inject({ method: "POST", url: "/internal/brain/sweep", headers: { "x-sweep-token": token } });
        expect(res.statusCode).toBe(404);
      }
    });

    it("401 without or with a wrong token", async () => {
      const { app } = build();
      expect((await app.inject({ method: "POST", url: "/internal/brain/sweep" })).statusCode).toBe(401);
      expect((await app.inject({ method: "POST", url: "/internal/brain/sweep", headers: { "x-sweep-token": "nope-nope-nope-nope" } })).statusCode).toBe(401);
    });

    it("503 without a database", async () => {
      const res = await build({ db: false }).app.inject({ method: "POST", url: "/internal/brain/sweep", headers: { "x-sweep-token": TOKEN } });
      expect(res.statusCode).toBe(503);
    });

    it("runs one sweep: default OFF finds issues and does nothing", async () => {
      const { app, store, calls } = build();
      const res = await app.inject({ method: "POST", url: "/internal/brain/sweep", headers: { "x-sweep-token": TOKEN } });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({ status: "completed", mode: "off", issuesFound: 2, actionsDone: 0, dailySummary: "off" });
      expect(calls).toEqual([]);
      expect(store.actions).toEqual([]);
    });
  });

  describe("staff routes", () => {
    const routes = [
      { method: "GET" as const, url: "/platform/brain" },
      { method: "POST" as const, url: "/platform/brain/mode", payload: { mode: "live" } },
      { method: "POST" as const, url: "/platform/brain/switches", payload: { key: "remind_worker_check_in", enabled: true } },
      { method: "POST" as const, url: "/platform/brain/issues/11111111-1111-4111-8111-111111111111/do" },
      { method: "POST" as const, url: "/platform/brain/issues/11111111-1111-4111-8111-111111111111/dismiss" },
      { method: "POST" as const, url: "/platform/brain/actions/11111111-1111-4111-8111-111111111111/undo" }
    ];

    it("401 signed out, 403 for non-staff, on every route; nothing changes", async () => {
      const { app, store } = build();
      for (const route of routes) {
        const anon = await app.inject({ method: route.method, url: route.url, ...(route.payload ? { payload: route.payload } : {}) });
        expect(anon.statusCode, route.url).toBe(401);
        const other = await app.inject({ method: route.method, url: route.url, headers: { authorization: "Bearer worker" }, ...(route.payload ? { payload: route.payload } : {}) });
        expect(other.statusCode, route.url).toBe(403);
      }
      expect((await store.loadSettings()).mode).toBe("off");
    });

    it("GET lists the mode, every switch (all off by default), issues and the log", async () => {
      const { app } = build();
      await app.inject({ method: "POST", url: "/internal/brain/sweep", headers: { "x-sweep-token": TOKEN } });
      const res = await app.inject({ method: "GET", url: "/platform/brain", headers: staff });
      expect(res.statusCode).toBe(200);
      const body = res.json() as { mode: string; switches: { key: string; enabled: boolean }[]; issues: unknown[]; actions: unknown[] };
      expect(body.mode).toBe("off");
      expect(body.switches.map((s) => s.key)).toEqual([
        "resend_failed_message",
        "remind_worker_check_in",
        "remind_employer_timesheet",
        "remind_worker_timesheet",
        "offer_employer_bonus",
        "auto_approve_request",
        "auto_approve_timesheet",
        "notify_worker_report_hours",
        "close_unreported_shift",
        "daily_summary_email"
      ]);
      expect(body.switches.every((s) => s.enabled === false)).toBe(true);
      expect(body.issues).toHaveLength(2);
    });

    it("mode and switches validate their input", async () => {
      const { app, store } = build();
      expect((await app.inject({ method: "POST", url: "/platform/brain/mode", headers: staff, payload: { mode: "turbo" } })).statusCode).toBe(400);
      expect((await app.inject({ method: "POST", url: "/platform/brain/switches", headers: staff, payload: { key: "pay_workers", enabled: true } })).statusCode).toBe(400);
      expect((await app.inject({ method: "POST", url: "/platform/brain/mode", headers: staff, payload: { mode: "watch" } })).statusCode).toBe(200);
      expect((await app.inject({ method: "POST", url: "/platform/brain/switches", headers: staff, payload: { key: "remind_worker_check_in", enabled: true } })).statusCode).toBe(200);
      expect(await store.loadSettings()).toEqual({ mode: "watch", switches: { remind_worker_check_in: true } });
    });

    it("Do it runs the action once as staff; undo reverses an undoable one", async () => {
      const { app, store, calls } = build();
      await app.inject({ method: "POST", url: "/internal/brain/sweep", headers: { "x-sweep-token": TOKEN } });
      const ready = store.issues.find((i) => i.recommendedAction === "auto_approve_timesheet")!;
      const done = await app.inject({ method: "POST", url: `/platform/brain/issues/${ready.id}/do`, headers: staff });
      expect(done.statusCode).toBe(200);
      expect(calls.map((c) => c.name)).toEqual(["approveTimesheet"]);
      const again = await app.inject({ method: "POST", url: `/platform/brain/issues/${ready.id}/do`, headers: staff });
      expect(again.statusCode).toBe(409);
      const action = store.actions[0]!;
      expect(action.actor).toEqual({ type: "staff", userId: "77777777-7777-4777-8777-777777777777" });
      expect((await app.inject({ method: "POST", url: `/platform/brain/actions/${action.id}/undo`, headers: staff })).statusCode).toBe(200);
      expect((await app.inject({ method: "POST", url: `/platform/brain/actions/${action.id}/undo`, headers: staff })).statusCode).toBe(409);
    });

    it("404 for unknown or malformed ids", async () => {
      const { app } = build();
      expect((await app.inject({ method: "POST", url: "/platform/brain/issues/not-a-uuid/do", headers: staff })).statusCode).toBe(404);
      expect((await app.inject({ method: "POST", url: "/platform/brain/issues/11111111-1111-4111-8111-111111111111/do", headers: staff })).statusCode).toBe(404);
    });
  });

  describe("daily summary email", () => {
    it("off by default; once per day when switched on; never while the brain is OFF", async () => {
      const off = createMemoryBrainStore({ mode: "live" });
      const email = emailFake();
      const base = { emailSender: email.sender, staffEmail: "ops@example.com", summaryHourUtc: 12, now: NOW };
      expect(await maybeSendDailySummary({ ...base, store: off })).toBe("off");
      const killed = createMemoryBrainStore({ mode: "off", switches: { daily_summary_email: true } });
      expect(await maybeSendDailySummary({ ...base, store: killed })).toBe("off");
      const on = createMemoryBrainStore({ mode: "watch", switches: { daily_summary_email: true } });
      expect(await maybeSendDailySummary({ ...base, store: on, now: new Date("2026-11-10T11:00:00Z") })).toBe("not_due");
      expect(await maybeSendDailySummary({ ...base, store: on })).toBe("sent");
      expect(await maybeSendDailySummary({ ...base, store: on })).toBe("already_sent");
      expect(email.sent).toHaveLength(1);
      expect(email.sent[0]?.to).toBe("ops@example.com");
      expect(email.sent[0]?.text).toContain("WATCH");
      expect(email.sent[0]?.text).toContain("OBSERVATION");
      expect(await maybeSendDailySummary({ ...base, store: createMemoryBrainStore({ mode: "live", switches: { daily_summary_email: true } }), staffEmail: null })).toBe("no_recipient");
    });
  });
});
