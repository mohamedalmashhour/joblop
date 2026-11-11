// Real-life checks on the role assistant that need no database: the tools against the shapes the
// REAL routes send (the other tests use hand-made fakes), and the money guards. The Postgres suite
// (tests/integration/postgres-brain-real-life.test.ts) drives the same tools through the real routes.
//
// Where today's behaviour looks wrong for real life, the test states the CORRECT behaviour and is
// marked `it.fails(...)` with a "BUG:" comment; the matching "ACTUAL:" test pins what the code does.
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
  // The keys the create route accepts (the route turns "farming-agriculture" into this key too).
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
  it("ACTUAL: the draft card is never made (unknown_role), and list_roles gives empty keys", async () => {
    const api = realCatalogue();
    const prepared = await employerTool<ActionTool>("create_draft_request").prepare(draftInput, employerContext(api.call));
    expect(prepared).toEqual({ ok: false, error: "unknown_role" });
    const roles = (await employerTool<ReadTool>("list_roles").run({}, employerContext(api.call))) as { roles: { roleKey: string; workGroup: string }[] };
    expect(roles.roles).toEqual([{ roleKey: "", role: "Farm worker", workGroup: "", workGroupLabel: "Farming and agriculture" }]);
  });

  // BUG: roleCatalogue (employerTools.ts) reads `key` from the work groups and roles, but the real
  // routes send `slug` / `code` and no `key`. So every role key is "", create_draft_request always
  // answers unknown_role, and an employer can never create a request by chat. The unit tests passed
  // because their fakes invented a `key` field. Correct: the farm_worker role is found and a card made.
  it.fails("makes a draft card for the farm worker role", async () => {
    const api = realCatalogue();
    const prepared = await employerTool<ActionTool>("create_draft_request").prepare(draftInput, employerContext(api.call));
    expect(prepared).toMatchObject({ ok: true, args: { roleDefinition: "farm_worker", workGroup: "farming_agriculture" } });
  });

  // BUG: same cause. list_roles is what the model reads to learn the keys, and it gives "".
  it.fails("list_roles gives the model the keys the create route accepts", async () => {
    const api = realCatalogue();
    const roles = (await employerTool<ReadTool>("list_roles").run({}, employerContext(api.call))) as { roles: { roleKey: string; workGroup: string }[] };
    expect(roles.roles[0]).toMatchObject({ roleKey: "farm_worker", workGroup: "farming_agriculture" });
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
    expect(() => registerAssistantTools("worker", [{ ...base, name: "charge_employer" }])).toThrow(AssistantSetupError);
    expect(() => registerAssistantTools("worker", [{ ...base, name: "mark_paid" }])).toThrow(AssistantSetupError);
  });

  // GAP (low: movesMoney and the route guard still hold): the name check misses plain "pay_…" names.
  it.fails("registration also refuses a tool named pay_worker", () => {
    const base = ASSISTANT_TOOLS.worker.get("claim_open_job") as ActionTool;
    expect(() => registerAssistantTools("worker", [{ ...base, name: "pay_worker" }])).toThrow(AssistantSetupError);
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
      "/platform/workers/w1/apply-cancellation-penalty"
    ]) {
      expect(await call({ method: "POST", url }), url).toEqual({ status: 403, body: { error: "RWOS_ASSISTANT_MONEY_BLOCKED", message: "The assistant cannot move money." } });
    }
    expect(inner).not.toHaveBeenCalled();
    // Reads stay allowed (an employer may read their own invoices).
    expect(isMoneyRoute("GET", "/organizations/o1/invoices")).toBe(false);
  });

  // GAP (defence in depth; no tool calls these today): two writes that create money records are not on
  // the money-route list. Locking a timesheet issues the employer's invoice, and an employer cancel
  // confirm under 24 h creates a late-cancellation charge.
  it.fails("the money-route guard also covers timesheet lock (issues an invoice) and cancel confirm (late charge)", () => {
    expect(isMoneyRoute("POST", "/platform/timesheets/t1/lock")).toBe(true);
    expect(isMoneyRoute("POST", "/organizations/o1/job-requests/j1/cancel/confirm")).toBe(true);
  });
});
