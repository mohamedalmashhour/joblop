// Per tool: permission (the route's own answer is respected), role isolation, and no leak of the other
// side's rates or Joblop's share. Plus: money tools cannot be registered or reach a money route.
import { describe, expect, it } from "vitest";
import { guardMoneyRoutes, isForbiddenKey, isMoneyRoute, registerAssistantTools, stripForbidden, AssistantSetupError } from "./assistantGuards";
import { filterToolResult } from "./assistantLoop";
import { ASSISTANT_TOOLS, assistantSwitchKeys } from "./assistantService";
import type { ActionTool, AssistantRole, AssistantTool, ReadTool } from "./assistantTypes";
import { EMPLOYER_TOOLS } from "./employerTools";
import { STAFF_TOOLS } from "./staffTools";
import { WORKER_TOOLS } from "./workerTools";
import { ASSIGNMENT_ID, EMPLOYER_ID, JOB_ID, ORG_ID, STAFF_ID, TIMESHEET_ID, context, fakeApi, ok, silentLogger } from "./assistantTestKit";

const ALL: Record<AssistantRole, readonly AssistantTool[]> = { worker: WORKER_TOOLS, employer: EMPLOYER_TOOLS, staff: STAFF_TOOLS };
const ctxFor = (role: AssistantRole, call: ReturnType<typeof fakeApi>["call"]) =>
  context({ role, call, userId: role === "worker" ? "w" : role === "employer" ? EMPLOYER_ID : STAFF_ID, organizationId: role === "employer" ? ORG_ID : null });

// Inputs good enough for every tool's validation.
const INPUT = {
  place: "Laval", jobRequestId: JOB_ID, assignmentId: ASSIGNMENT_ID, attendanceRecordId: ASSIGNMENT_ID, timesheetId: TIMESHEET_ID,
  issueId: JOB_ID, reason: "I am sick of waiting"
};

const POISON = {
  employerHourlyRateMinor: 4500, employer_rate: 45, billRateMinor: 4500, marginPpm: 250000, platformFeeMinor: 900,
  joblopShareMinor: 900, markupPercent: 25, workerHourlyRateMinor: 2000, workerRateMinor: 2000, payRate: 20, wageMinor: 2000
};
// Every list or object key the tools read, each poisoned with the other side's money.
function poisoned(): Record<string, unknown> {
  const item = {
    ...POISON, id: JOB_ID, jobRequestId: JOB_ID, attendanceRecordId: ASSIGNMENT_ID, assignmentId: ASSIGNMENT_ID, timesheetId: TIMESHEET_ID,
    status: "draft", startAt: "2026-11-12T13:00:00.000Z", endAt: "2026-11-12T19:00:00.000Z", scheduledStartAt: "2026-11-12T13:00:00.000Z",
    scheduledEndAt: "2026-11-12T19:00:00.000Z", claimable: true, documentType: "photo_id", effectiveStatus: "approved", recommendedAction: "x",
    type: "job", subtitle: "Sam, Ali", nested: { ...POISON }
  };
  const list = [item, { ...item }];
  return {
    ...POISON, items: list, jobs: list, jobRequests: list, timesheets: list, invoices: list, residences: list, departments: list,
    documents: list, issues: list, conversations: list, today: list, roleDefinitions: list, workGroups: list, ready: list,
    job: item, jobRequest: item, timesheet: item, assignment: item, contract: { ...item, roleRates: list }, summary: { ...POISON }, profile: POISON
  };
}

describe("registration: no tool may move money", () => {
  it("registers every real tool, each action declaring movesMoney: false and its own switch", () => {
    for (const role of ["worker", "employer", "staff"] as const) {
      const map = ASSISTANT_TOOLS[role];
      expect(map.size).toBe(ALL[role].length);
      for (const tool of map.values()) {
        expect(tool.role).toBe(role);
        if (tool.kind === "action") {
          expect(tool.movesMoney).toBe(false);
          expect(tool.switchKey.startsWith(`assistant.${role}.`)).toBe(true);
        }
      }
    }
    const keys = assistantSwitchKeys();
    expect(keys.slice(0, 4)).toEqual(["assistant", "assistant.worker", "assistant.employer", "assistant.staff"]);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toHaveLength(14);
  });

  const action = (over: Partial<ActionTool>): ActionTool => ({
    kind: "action", name: "do_thing", role: "worker", switchKey: "assistant.worker.do_thing", movesMoney: false, description: "", inputSchema: { type: "object", properties: {}, additionalProperties: false },
    undoHint: "", prepare: async () => ({ ok: false, error: "x" }), execute: async () => ({ ok: true, code: "x", detail: "" }), ...over
  });

  it.each(["charge_employer", "worker_payout", "settle_invoice", "mark_paid", "refund_worker", "pay_invoice", "start_checkout", "transfer_funds"])(
    "refuses a tool named %s",
    (name) => expect(() => registerAssistantTools("worker", [action({ name })])).toThrow(AssistantSetupError)
  );

  it("refuses an action that does not declare movesMoney: false, a duplicate, or another role's tool", () => {
    expect(() => registerAssistantTools("worker", [action({ movesMoney: true as unknown as false })])).toThrow(/movesMoney/);
    expect(() => registerAssistantTools("worker", [action({}), action({})])).toThrow(/twice/);
    expect(() => registerAssistantTools("worker", [action({ role: "staff" })])).toThrow(/belongs/);
  });

  it("blocks every write to a money route before it reaches the API; reads stay allowed", async () => {
    for (const url of [
      "/organizations/o/invoices/i/checkout", "/organizations/o/payments", "/platform/worker-payouts/p/mark-paid",
      "/platform/worker-payouts/p/execute-test-payout", "/organizations/o/invoices", "/platform/payroll/periods", "/employer/plan/subscribe",
      "/employer/job-listings/j/pay", "/platform/job-requests/j/bonuses", "/organizations/o/invoices/i/credit-notes"
    ]) {
      expect(isMoneyRoute("POST", url), url).toBe(true);
    }
    expect(isMoneyRoute("GET", "/organizations/o/invoices")).toBe(false);
    expect(isMoneyRoute("POST", "/marketplace/jobs/j/claim")).toBe(false);
    const api = fakeApi({});
    const guarded = guardMoneyRoutes(api.call);
    expect((await guarded({ method: "POST", url: "/platform/worker-payouts/p/mark-paid" })).status).toBe(403);
    expect(api.calls).toHaveLength(0);
  });
});

describe("role isolation", () => {
  it("gives each role only its own tools", () => {
    const names = (role: AssistantRole) => new Set(ALL[role].map((t) => t.name));
    for (const a of ["worker", "employer", "staff"] as const) {
      for (const b of ["worker", "employer", "staff"] as const) {
        if (a === b) continue;
        for (const name of names(a)) expect(names(b).has(name), `${a}:${name} in ${b}`).toBe(false);
      }
    }
  });

  it("employer tools act only in the company of the person's membership, and do nothing without one", async () => {
    for (const tool of EMPLOYER_TOOLS) {
      const api = fakeApi({});
      const noCompany = { ...ctxFor("employer", api.call), organizationId: null };
      const result = tool.kind === "read" ? await tool.run(INPUT, noCompany) : await tool.prepare(INPUT, noCompany);
      expect(result, tool.name).toEqual({ ok: false, error: "no_company" });
      expect(api.calls, tool.name).toHaveLength(0);
    }
    const seen: string[] = [];
    const everything = fakeApi(new Proxy({}, { get: () => (req: { url: string }) => (seen.push(req.url), ok(poisoned())) }) as never);
    for (const tool of EMPLOYER_TOOLS.filter((t): t is ReadTool => t.kind === "read")) await tool.run(INPUT, ctxFor("employer", everything.call));
    const orgUrls = seen.filter((u) => u.startsWith("/organizations/"));
    expect(orgUrls.length).toBeGreaterThan(0);
    for (const url of orgUrls) expect(url.startsWith(`/organizations/${ORG_ID}/`)).toBe(true);
  });
});

describe("permission: the route's own refusal is respected", () => {
  for (const role of ["worker", "employer", "staff"] as const) {
    for (const tool of ALL[role]) {
      it(`${role}:${tool.name} returns a plain refusal when the API says no`, async () => {
        const denied = fakeApi(new Proxy({}, { get: () => () => ok({ error: "RWOS_DENIED", message: "secret internal text" }, 403) }) as never);
        const ctx = ctxFor(role, denied.call);
        const result = tool.kind === "read" ? await tool.run(INPUT, ctx) : await tool.prepare(INPUT, ctx);
        expect(result).toMatchObject({ ok: false });
        expect(JSON.stringify(result)).not.toContain("secret internal text");
        if (tool.kind === "action") {
          const executed = await tool.execute({ ...INPUT, residenceId: JOB_ID }, ctx);
          expect(executed.ok).toBe(false);
          expect(denied.calls.every((c) => !isMoneyRoute(c.method, c.url))).toBe(true);
        }
      });
    }
  }
});

describe("no leakage of the other side's rates or Joblop's share", () => {
  const forbidden: Record<"worker" | "employer", readonly string[]> = {
    worker: ["employerHourlyRateMinor", "employer_rate", "billRateMinor", "marginPpm", "platformFeeMinor", "joblopShareMinor", "markupPercent"],
    employer: ["workerHourlyRateMinor", "workerRateMinor", "payRate", "wageMinor", "marginPpm", "platformFeeMinor", "joblopShareMinor", "markupPercent"]
  };
  for (const role of ["worker", "employer"] as const) {
    for (const tool of ALL[role].filter((t): t is ReadTool => t.kind === "read")) {
      it(`${role}:${tool.name} never sends them to the model`, async () => {
        const api = fakeApi(new Proxy({}, { get: () => () => ok(poisoned()) }) as never);
        const sent = filterToolResult(role, await tool.run(INPUT, ctxFor(role, api.call)), silentLogger);
        for (const key of forbidden[role]) expect(sent, key).not.toContain(key);
        for (const value of ["4500", "250000", "\"45\""]) if (role === "worker") expect(sent).not.toContain(value);
      });
    }
    for (const tool of ALL[role].filter((t): t is ActionTool => t.kind === "action")) {
      it(`${role}:${tool.name} card carries none of them`, async () => {
        const api = fakeApi(new Proxy({}, { get: () => () => ok(poisoned()) }) as never);
        const prepared = await tool.prepare(
          { ...INPUT, residenceId: JOB_ID, departmentId: JOB_ID, workGroup: "kitchen", roleKey: "kitchen", title: "Helper", numberOfWorkers: 1, startAt: "2026-11-12T13:00:00Z", endAt: "2026-11-12T19:00:00Z" },
          ctxFor(role, api.call)
        );
        const sent = JSON.stringify(prepared);
        for (const key of forbidden[role]) expect(sent, key).not.toContain(key);
      });
    }
  }

  it("keeps the worker's own pay and the employer's own price", async () => {
    const pay = fakeApi({
      "GET /worker/payroll/statement": () => ok({ items: [{ grossPayMinor: 12000, netPayMinor: 9000, totalDeductionsMinor: 3000, currency: "CAD", earningLines: [{ rateMinor: 2000, amountMinor: 12000, quantityMinutes: 360 }] }], summary: null })
    });
    const payTool = WORKER_TOOLS.find((t) => t.name === "my_pay_statements") as ReadTool;
    const payText = filterToolResult("worker", await payTool.run({}, ctxFor("worker", pay.call)), silentLogger);
    expect(payText).toContain("\"gross\":120");
    expect(payText).toContain("\"hourlyPay\":20");

    const contract = fakeApi({
      [`GET /organizations/${ORG_ID}/contract`]: () => ok({ contract: { status: "active", currency: "CAD", roleRates: [{ roleDefinitionId: "r1", hourlyRateMinor: 3500, workerHourlyRateMinor: 2000, marginPpm: 200000 }] } }),
      "GET /role-definitions": () => ok({ roleDefinitions: [{ id: "r1", code: "COOK", slug: "cook", workGroupSlug: "food", displayLabel: "Cook", workGroupId: "g" }] }),
      "GET /work-groups": () => ok({ workGroups: [] })
    });
    const contractTool = EMPLOYER_TOOLS.find((t) => t.name === "my_contract") as ReadTool;
    const contractText = filterToolResult("employer", await contractTool.run({}, ctxFor("employer", contract.call)), silentLogger);
    expect(contractText).toContain("\"yourHourlyPrice\":35");
    expect(contractText).not.toContain("2000");
    expect(contractText).not.toContain("200000");
  });

  it("strips by role at any depth; staff see everything", () => {
    const value = { a: [{ b: { employerHourlyRateMinor: 1, workerHourlyRateMinor: 2, marginPpm: 3, ok: 4 } }] };
    expect(JSON.stringify(stripForbidden("worker", value))).toBe('{"a":[{"b":{"workerHourlyRateMinor":2,"ok":4}}]}');
    expect(JSON.stringify(stripForbidden("employer", value))).toBe('{"a":[{"b":{"employerHourlyRateMinor":1,"ok":4}}]}');
    expect(stripForbidden("staff", value)).toEqual(value);
    expect(isForbiddenKey("worker", "joblop_share")).toBe(true);
    expect(isForbiddenKey("employer", "gross_pay_minor")).toBe(true);
  });
});

describe("tools call the same routes the apps use", () => {
  it("claim goes through the open-claim route, cancel through the worker-withdraw route with the current version", async () => {
    const api = fakeApi({
      [`POST /marketplace/jobs/${JOB_ID}/claim`]: () => ok({ status: "assigned" }, 201),
      [`GET /worker/assignments/${ASSIGNMENT_ID}`]: () => ok({ assignment: { versionToken: 7, startAt: "2026-11-10T20:00:00Z", title: "Cook" } }),
      [`POST /worker/assignments/${ASSIGNMENT_ID}/withdraw`]: () => ok({ cancellationPenalty: { penalty: "suspend" } })
    });
    const tools = ASSISTANT_TOOLS.worker;
    const ctx = ctxFor("worker", api.call);
    expect(await (tools.get("claim_open_job") as ActionTool).execute({ jobRequestId: JOB_ID }, ctx)).toMatchObject({ ok: true, code: "claimed" });
    const prepared = await (tools.get("cancel_my_shift") as ActionTool).prepare({ assignmentId: ASSIGNMENT_ID, reason: "Bus strike" }, ctx);
    expect(prepared).toMatchObject({ ok: true, card: { warning: "late_cancel" } });
    expect(await (tools.get("cancel_my_shift") as ActionTool).execute({ assignmentId: ASSIGNMENT_ID, reason: "Bus strike" }, ctx)).toMatchObject({ ok: true, code: "cancelled_late" });
    expect(api.calls.find((c) => c.url.endsWith("/withdraw"))?.body).toEqual({ expectedVersion: 7, reason: "Bus strike" });
  });

  it("maps a full job and the minimum-wage refusal to plain codes", async () => {
    const api = fakeApi({
      [`POST /marketplace/jobs/${JOB_ID}/claim`]: () => ok({ status: "full", error: "RWOS_CLAIM_FULL" }, 409),
      [`GET /organizations/${ORG_ID}/job-requests/${JOB_ID}`]: () => ok({ jobRequest: { status: "draft", versionToken: 3 } }),
      [`POST /organizations/${ORG_ID}/job-requests/${JOB_ID}/submit`]: () => ok({ error: "RWOS_BELOW_MINIMUM_WAGE" }, 422)
    });
    expect(await (ASSISTANT_TOOLS.worker.get("claim_open_job") as ActionTool).execute({ jobRequestId: JOB_ID }, ctxFor("worker", api.call))).toMatchObject({ ok: false, code: "full" });
    expect(await (ASSISTANT_TOOLS.employer.get("submit_draft") as ActionTool).execute({ jobRequestId: JOB_ID }, ctxFor("employer", api.call))).toMatchObject({ ok: false, code: "below_minimum_wage" });
  });

  it("staff approval runs begin-review then the shared approve-for-dispatch, like the brain", async () => {
    const api = fakeApi({
      [`GET /platform/job-requests/intake/${JOB_ID}`]: () => ok({ jobRequest: { status: "submitted", versionToken: 1 } }),
      [`POST /platform/job-requests/intake/${JOB_ID}/admin-review`]: () => ok({ jobRequest: { status: "admin_review", versionToken: 2 } }),
      [`POST /platform/job-requests/intake/${JOB_ID}/approve-for-dispatch`]: () => ok({ jobRequest: {} })
    });
    expect(await (ASSISTANT_TOOLS.staff.get("approve_request") as ActionTool).execute({ jobRequestId: JOB_ID }, ctxFor("staff", api.call))).toMatchObject({ ok: true, code: "approved" });
    expect(api.calls.map((c) => `${c.method} ${c.url}`)).toEqual([
      `GET /platform/job-requests/intake/${JOB_ID}`,
      `POST /platform/job-requests/intake/${JOB_ID}/admin-review`,
      `POST /platform/job-requests/intake/${JOB_ID}/approve-for-dispatch`
    ]);
    expect(api.calls[2]?.body).toEqual({ expectedVersion: 2, openClaim: true });
  });

  it("a draft request stays a draft: create posts the draft route only, never submit", async () => {
    const api = fakeApi({
      [`GET /organizations/${ORG_ID}/residences`]: () => ok({ residences: [{ id: JOB_ID, name: "Main kitchen" }] }),
      "GET /role-definitions": () => ok({ roleDefinitions: [{ id: "r", code: "KITCHEN_HELPER", slug: "kitchen-helper", workGroupSlug: "food", displayLabel: "Kitchen helper", workGroupId: "g" }] }),
      "GET /work-groups": () => ok({ workGroups: [{ id: "g", slug: "food", displayLabel: "Food" }] }),
      [`POST /organizations/${ORG_ID}/job-requests`]: () => ok({ jobRequest: { jobRequestNumber: "JR-2026-000001" } }, 201)
    });
    const tool = ASSISTANT_TOOLS.employer.get("create_draft_request") as ActionTool;
    const ctx = ctxFor("employer", api.call);
    const prepared = await tool.prepare(
      { residenceId: JOB_ID, departmentId: JOB_ID, workGroup: "food", roleKey: "kitchen_helper", title: "Brunch help", numberOfWorkers: 2, startAt: "2026-11-14T13:00:00Z", endAt: "2026-11-14T19:00:00Z" },
      ctx
    );
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) return;
    expect(prepared.card).toMatchObject({ subject: "Brunch help", place: "Main kitchen" });
    expect(await tool.execute(prepared.args, ctx)).toMatchObject({ ok: true, code: "draft_created" });
    expect(api.calls.filter((c) => c.method === "POST").map((c) => c.url)).toEqual([`/organizations/${ORG_ID}/job-requests`]);
  });
});
