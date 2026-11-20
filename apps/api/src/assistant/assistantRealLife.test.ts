// Real-life checks on the role assistant that need no database: the tools against the shapes the
// REAL routes send, and the money guards. The Postgres suite (tests/integration/
// postgres-brain-real-life.test.ts) drives the same tools through the real routes.
import { describe, expect, it, vi } from "vitest";
import { AssistantSetupError, guardMoneyRoutes, isMoneyRoute, registerAssistantTools } from "./assistantGuards";
import { ASSISTANT_TOOLS } from "./assistantService";
import type { ActionTool, ApiCaller, AssistantTool, ReadTool } from "./assistantTypes";
import { EMPLOYER_ID, ORG_ID, context, fakeApi, ok } from "./assistantTestKit";

const RESIDENCE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const DEPARTMENT_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

// The catalogue exactly as GET /work-groups and GET /role-definitions send it: the public shapes from
// toPublicWorkGroup / toPublicRoleDefinition (packages/auth/src/index.ts). There is no `key` field:
// a work group has `slug`, a role has `code`, `slug` and `workGroupSlug`.
const realCatalogue = () =>
  fakeApi({
    [`GET /organizations/${ORG_ID}/residences`]: () => ok({ residences: [{ id: RESIDENCE_ID, name: "Serres", city: "Laval", status: "active" }] }),
    "GET /work-groups": () =>
      ok({ workGroups: [{ id: "wg-farm", slug: "farming-agriculture", displayLabel: "Farming and agriculture", status: "active", displayOrder: 1 }] }),
    "GET /role-definitions": () =>
      ok({
        roleDefinitions: [
          { id: "rd-farm", workGroupId: "wg-farm", workGroupSlug: "farming-agriculture", code: "FARM_WORKER", slug: "farm-worker", displayLabel: "Farm worker", status: "active" }
        ]
      }),
    [`POST /organizations/${ORG_ID}/job-requests`]: () => ok({ jobRequest: { id: "jr-1", jobRequestNumber: "JR-2026-000001" } }, 201)
  });

const employerContext = (call: ApiCaller) =>
  context({ call, role: "employer", userId: EMPLOYER_ID, organizationId: ORG_ID, now: new Date("2026-11-10T12:00:00Z") });

const draftInput = {
  residenceId: RESIDENCE_ID,
  departmentId: DEPARTMENT_ID,
  workGroup: "farming_agriculture",
  roleKey: "farm_worker",
  title: "Farm worker, Laval",
  description: "Harvest and pack vegetables.",
  numberOfWorkers: 1,
  startAt: "2026-11-16T08:00:00-05:00",
  endAt: "2026-11-16T14:00:00-05:00"
};

const employerTool = <T extends AssistantTool>(name: string) => ASSISTANT_TOOLS.employer.get(name) as T;

describe("employer: create a draft request by chat, against the real role catalogue", () => {
  it("makes a draft card for the farm worker role, and Confirm posts the draft route with the route's keys", async () => {
    const api = realCatalogue();
    const tool = employerTool<ActionTool>("create_draft_request");
    const prepared = await tool.prepare(draftInput, employerContext(api.call));
    expect(prepared).toMatchObject({ ok: true, args: { roleDefinition: "farm_worker", workGroup: "farming_agriculture" } });
    if (!prepared.ok) return;
    expect(await tool.execute(prepared.args, employerContext(api.call))).toMatchObject({ ok: true, code: "draft_created" });
    expect(api.calls.find((c) => c.method === "POST")?.body).toMatchObject({ roleDefinition: "farm_worker", workGroup: "farming_agriculture" });
  });

  it.each([
    ["the slug", "farm-worker", "farming-agriculture"],
    ["the code", "FARM_WORKER", "FARMING_AGRICULTURE"],
    ["the role id", "rd-farm", "farming_agriculture"]
  ])("finds the role from %s too", async (_label, roleKey, workGroup) => {
    const api = realCatalogue();
    const prepared = await employerTool<ActionTool>("create_draft_request").prepare({ ...draftInput, roleKey, workGroup }, employerContext(api.call));
    expect(prepared).toMatchObject({ ok: true, args: { roleDefinition: "farm_worker", workGroup: "farming_agriculture" } });
  });

  it("an unknown role is still refused", async () => {
    const api = realCatalogue();
    expect(await employerTool<ActionTool>("create_draft_request").prepare({ ...draftInput, roleKey: "astronaut" }, employerContext(api.call))).toEqual({
      ok: false,
      error: "unknown_role"
    });
  });

  it("list_roles gives the model the keys the create route accepts", async () => {
    const api = realCatalogue();
    const roles = (await employerTool<ReadTool>("list_roles").run({}, employerContext(api.call))) as { roles: { roleKey: string; workGroup: string }[] };
    expect(roles.roles).toEqual([{ roleKey: "farm_worker", role: "Farm worker", workGroup: "farming_agriculture", workGroupLabel: "Farming and agriculture" }]);
  });
});

describe("no assistant tool can move money", () => {
  it("every registered action declares movesMoney: false and none has a money name", () => {
    for (const role of ["worker", "employer", "staff"] as const) {
      for (const tool of ASSISTANT_TOOLS[role].values()) {
        if (tool.kind !== "action") continue;
        expect(tool.movesMoney, tool.name).toBe(false);
        expect(tool.name).not.toMatch(/charge|pay|settle|refund|transfer|checkout|invoice|bonus/i);
      }
    }
  });

  it("registration refuses a tool that says it moves money, or is named like one", () => {
    const base = ASSISTANT_TOOLS.worker.get("claim_open_job") as ActionTool;
    expect(() => registerAssistantTools("worker", [{ ...base, movesMoney: true } as unknown as AssistantTool])).toThrow(AssistantSetupError);
    for (const name of [
      "charge_employer", "mark_paid", "pay_worker", "send_pay", "pay", "worker_payout", "payouts_run", "refund_employer",
      "issue_invoice", "send_invoice", "invoice_issue", "lock_timesheet", "make_payment", "bill_employer"
    ]) {
      expect(() => registerAssistantTools("worker", [{ ...base, name }]), name).toThrow(AssistantSetupError);
    }
    // Read tools that only show a person their own pay keep their names.
    expect(() => registerAssistantTools("worker", [ASSISTANT_TOOLS.worker.get("my_pay_statements")!])).not.toThrow();
  });

  it("the tools' API caller refuses money routes before they reach the API", async () => {
    const inner = vi.fn(async () => ok({ ok: true }));
    const call = guardMoneyRoutes(inner);
    for (const url of [
      "/platform/payroll/calculations",
      "/platform/worker-payouts/p1/mark-paid",
      "/employer/bonuses/b1/accept",
      "/platform/job-requests/j1/bonuses",
      "/organizations/o1/invoices/i1/checkout",
      "/platform/workers/w1/apply-cancellation-penalty",
      // Locking hours issues the employer's invoice; an employer cancel confirm can create a charge.
      "/platform/timesheets/t1/lock",
      "/organizations/o1/job-requests/j1/cancel/confirm"
    ]) {
      expect(await call({ method: "POST", url }), url).toEqual({ status: 403, body: { error: "RWOS_ASSISTANT_MONEY_BLOCKED", message: "The assistant cannot move money." } });
    }
    expect(inner).not.toHaveBeenCalled();
    // Reads stay allowed, and nearby non-money writes are not caught.
    expect(isMoneyRoute("GET", "/organizations/o1/invoices")).toBe(false);
    expect(isMoneyRoute("POST", "/organizations/o1/timesheets/t1/confirm")).toBe(false);
    expect(isMoneyRoute("POST", "/organizations/o1/job-requests/j1/submit")).toBe(false);
  });
});
