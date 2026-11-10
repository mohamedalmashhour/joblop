import type { ActionTool, AssistantTool, ReadTool, ToolContext, ToolError } from "./assistantTypes";
import {
  asArray, asRecord, enc, fail, failedResult, getOk, isoDateTime, isUuid, minorToAmount, num, okResult, schema, str, uuidProp
} from "./toolHelpers";

// Employer tools. Each calls the route the employer app already uses, as the employer, scoped to the
// organization of their active membership (the routes check that membership again). The employer sees
// their own price and invoices, workers by first name only, never worker pay and never Joblop's share.

const DAY_MS = 86_400_000;

function orgOf(ctx: ToolContext): string | ToolError {
  return ctx.organizationId && isUuid(ctx.organizationId) ? ctx.organizationId : fail("no_company");
}
const orgPath = (org: string) => `/organizations/${enc(org)}`;

/** The employer's words for where a request stands (the same phases as the request chips). */
export function requestPhase(status: string, endAt: string, now: Date): string {
  switch (status) {
    case "draft":
      return "draft";
    case "submitted":
    case "admin_review":
      return "in_review";
    case "information_required":
      return "more_info_needed";
    case "approved_for_dispatch":
      return Date.parse(endAt) <= now.getTime() ? "done" : "approved";
    case "cancelled":
      return "cancelled";
    default:
      return "closed";
  }
}

function toRequest(raw: unknown, now: Date) {
  const r = asRecord(raw);
  const status = String(r.status ?? "");
  const endAt = String(r.endAt ?? "");
  return {
    jobRequestId: r.id,
    jobRequestNumber: r.jobRequestNumber,
    title: r.title,
    status,
    phase: requestPhase(status, endAt, now),
    workersAsked: r.numberOfWorkers,
    startAt: r.startAt,
    endAt,
    timezone: r.timezone
  };
}

async function readRequest(ctx: ToolContext, org: string, jobRequestId: string) {
  const res = await getOk(ctx, `${orgPath(org)}/job-requests/${enc(jobRequestId)}`);
  if (!res.ok) return res;
  return { ok: true as const, request: asRecord(res.body.jobRequest) };
}

const myRequests: ReadTool = {
  kind: "read",
  name: "my_requests",
  role: "employer",
  description: "The company's staffing requests with their status (draft, in review, approved, done, cancelled), dates and number of workers asked.",
  inputSchema: schema({}),
  async run(_input, ctx) {
    const org = orgOf(ctx);
    if (typeof org !== "string") return org;
    const res = await getOk(ctx, `${orgPath(org)}/job-requests`);
    if (!res.ok) return res;
    const requests = asArray(res.body.jobRequests)
      .map((r) => toRequest(r, ctx.now))
      .sort((a, b) => Date.parse(String(b.startAt)) - Date.parse(String(a.startAt)))
      .slice(0, 25);
    return { requests, page: "/employer/calendar" };
  }
};

const assignedWorkers: ReadTool = {
  kind: "read",
  name: "assigned_workers",
  role: "employer",
  description: "Workers assigned to one request, by first name only (as the employer calendar shows), with places taken and asked.",
  inputSchema: schema({ jobRequestId: uuidProp("From my_requests.") }, ["jobRequestId"]),
  async run(input, ctx) {
    const org = orgOf(ctx);
    if (typeof org !== "string") return org;
    if (!isUuid(input.jobRequestId)) return fail("invalid_request");
    const found = await readRequest(ctx, org, input.jobRequestId);
    if (!found.ok) return found;
    const start = Date.parse(String(found.request.startAt ?? ""));
    if (Number.isNaN(start)) return fail("not_found");
    const from = new Date(start - DAY_MS).toISOString();
    const to = new Date(start + DAY_MS).toISOString();
    const hub = await getOk(ctx, `/employer/calendar-hub?from=${enc(from)}&to=${enc(to)}`);
    if (!hub.ok) return hub;
    const item = asArray(hub.body.items).map(asRecord).find((i) => i.jobRequestId === input.jobRequestId && (i.type === "job" || i.type === "cancelled_job"));
    const names = typeof item?.subtitle === "string" && item.type === "job" ? item.subtitle.split(",").map((n) => n.trim()).filter(Boolean) : [];
    return {
      jobRequestNumber: found.request.jobRequestNumber,
      title: found.request.title,
      workers: names,
      placesTaken: item?.placesTaken ?? names.length,
      placesAsked: item?.placesAsked ?? found.request.numberOfWorkers,
      coverage: item?.status ?? null
    };
  }
};

const timesheetsToConfirm: ReadTool = {
  kind: "read",
  name: "timesheets_to_confirm",
  role: "employer",
  description: "The company's timesheets (hours worked) with their status, so the employer can see which ones wait for their confirmation.",
  inputSchema: schema({}),
  async run(_input, ctx) {
    const org = orgOf(ctx);
    if (typeof org !== "string") return org;
    const res = await getOk(ctx, `${orgPath(org)}/timesheets`);
    if (!res.ok) return res;
    const timesheets = asArray(res.body.timesheets)
      .map((raw) => {
        const t = asRecord(raw);
        return {
          timesheetId: t.id,
          status: t.status,
          employerReview: t.employerReviewStatus ?? null,
          startAt: t.scheduledStartAt,
          endAt: t.scheduledEndAt,
          checkIn: t.actualCheckInAt ?? null,
          checkOut: t.actualCheckOutAt ?? null,
          billedMinutes: t.billableMinutes ?? null,
          breakMinutes: t.breakMinutes ?? null
        };
      })
      .sort((a, b) => Date.parse(String(b.startAt)) - Date.parse(String(a.startAt)))
      .slice(0, 25);
    return { timesheets, page: "/employer/timesheets" };
  }
};

const myInvoices: ReadTool = {
  kind: "read",
  name: "my_invoices",
  role: "employer",
  description: "The company's invoices with number, status, total and due date. Read only: the assistant never takes or records a payment.",
  inputSchema: schema({}),
  async run(_input, ctx) {
    const org = orgOf(ctx);
    if (typeof org !== "string") return org;
    const res = await getOk(ctx, `${orgPath(org)}/invoices`);
    if (!res.ok) return res;
    return {
      invoices: asArray(res.body.invoices).slice(0, 25).map((raw) => {
        const i = asRecord(raw);
        return { invoiceId: i.id, invoiceNumber: i.invoiceNumber, status: i.status, currency: i.currency, total: minorToAmount(i.totalMinor), dueAt: i.dueAt ?? null };
      }),
      page: "/employer/invoices"
    };
  }
};

const mySites: ReadTool = {
  kind: "read",
  name: "my_sites",
  role: "employer",
  description: "The company's work sites (name, city, status) and their departments, with the ids needed to create a request.",
  inputSchema: schema({}),
  async run(_input, ctx) {
    const org = orgOf(ctx);
    if (typeof org !== "string") return org;
    const res = await getOk(ctx, `${orgPath(org)}/residences`);
    if (!res.ok) return res;
    const sites = asArray(res.body.residences).slice(0, 10).map(asRecord);
    const withDepartments = await Promise.all(
      sites.map(async (s) => {
        const deps = isUuid(s.id) ? await getOk(ctx, `${orgPath(org)}/residences/${enc(s.id)}/departments`) : fail("invalid");
        return {
          residenceId: s.id,
          name: s.name,
          city: s.city ?? null,
          status: s.status,
          departments: deps.ok ? asArray(deps.body.departments).map(asRecord).map((d) => ({ departmentId: d.id, name: d.name, status: d.status })) : []
        };
      })
    );
    return { sites: withDepartments };
  }
};

async function roleCatalogue(ctx: ToolContext, org: string) {
  const [groups, roles] = await Promise.all([
    getOk(ctx, `/work-groups?organizationId=${enc(org)}`),
    getOk(ctx, `/role-definitions?organizationId=${enc(org)}`)
  ]);
  const groupById = new Map((groups.ok ? asArray(groups.body.workGroups) : []).map(asRecord).map((g) => [String(g.id), g]));
  return (roles.ok ? asArray(roles.body.roleDefinitions) : []).map(asRecord).map((r) => {
    const g = groupById.get(String(r.workGroupId));
    return { roleDefinitionId: String(r.id), roleKey: String(r.key ?? ""), role: String(r.displayLabel ?? ""), workGroup: String(g?.key ?? ""), workGroupLabel: String(g?.displayLabel ?? "") };
  });
}

const myContract: ReadTool = {
  kind: "read",
  name: "my_contract",
  role: "employer",
  description: "The company's active contract: its status and the company's own hourly price per role (what the company pays Joblop).",
  inputSchema: schema({}),
  async run(_input, ctx) {
    const org = orgOf(ctx);
    if (typeof org !== "string") return org;
    const res = await getOk(ctx, `${orgPath(org)}/contract`);
    if (!res.ok) return res;
    const contract = asRecord(res.body.contract);
    if (!res.body.contract) return { contract: null, page: "/employer/contract" };
    const roles = await roleCatalogue(ctx, org);
    const label = new Map(roles.map((r) => [r.roleDefinitionId, r.role]));
    return {
      contract: {
        status: contract.status,
        currency: contract.currency,
        effectiveFrom: contract.effectiveFrom ?? null,
        prices: asArray(contract.roleRates).map(asRecord).map((rate) => ({ role: label.get(String(rate.roleDefinitionId)) ?? "Role", yourHourlyPrice: minorToAmount(rate.hourlyRateMinor) }))
      },
      page: "/employer/contract"
    };
  }
};

const listRoles: ReadTool = {
  kind: "read",
  name: "list_roles",
  role: "employer",
  description: "The roles the company can request (role key, label and work group), needed to create a request.",
  inputSchema: schema({}),
  async run(_input, ctx) {
    const org = orgOf(ctx);
    if (typeof org !== "string") return org;
    const roles = await getOk(ctx, `/role-definitions?organizationId=${enc(org)}`);
    if (!roles.ok) return roles;
    return { roles: (await roleCatalogue(ctx, org)).map(({ roleDefinitionId: _id, ...r }) => r) };
  }
};

// ── actions (proposed; they run only after the employer presses Confirm) ──

const createDraftRequest: ActionTool = {
  kind: "action",
  name: "create_draft_request",
  role: "employer",
  switchKey: "assistant.employer.create_draft",
  movesMoney: false,
  description:
    "Propose creating a DRAFT staffing request from what the employer said. It stays a draft: nothing is sent to Joblop until they submit it. Use ids from my_sites and keys from list_roles; ask for anything missing instead of guessing.",
  inputSchema: schema(
    {
      residenceId: uuidProp("Work site id from my_sites."),
      departmentId: uuidProp("Department id from my_sites."),
      workGroup: { type: "string", description: "Work group key from list_roles." },
      roleKey: { type: "string", description: "Role key from list_roles." },
      title: { type: "string", description: "Short title, e.g. Kitchen helper for Saturday brunch." },
      description: { type: "string", description: "Optional duties in the employer's words." },
      numberOfWorkers: { type: "integer", minimum: 1, maximum: 50 },
      startAt: { type: "string", description: "Start, ISO 8601 with offset, e.g. 2026-11-14T08:00:00-05:00." },
      endAt: { type: "string", description: "End, ISO 8601 with offset." }
    },
    ["residenceId", "departmentId", "workGroup", "roleKey", "title", "numberOfWorkers", "startAt", "endAt"]
  ),
  undoHint: "A draft can be edited or deleted on the request page; nothing was sent to Joblop.",
  async prepare(input, ctx) {
    const org = orgOf(ctx);
    if (typeof org !== "string") return org;
    const title = str(input.title, 120);
    const workGroup = str(input.workGroup, 80);
    const roleKey = str(input.roleKey, 120);
    const workers = num(input.numberOfWorkers);
    const startAt = isoDateTime(input.startAt);
    const endAt = isoDateTime(input.endAt);
    if (!isUuid(input.residenceId) || !isUuid(input.departmentId) || !title || !workGroup || !roleKey) return fail("missing_details");
    if (!workers || !Number.isInteger(workers) || workers < 1 || workers > 50) return fail("invalid_number_of_workers");
    if (!startAt || !endAt || Date.parse(endAt) <= Date.parse(startAt)) return fail("invalid_times");
    if (Date.parse(startAt) <= ctx.now.getTime()) return fail("start_in_the_past");
    const sites = await getOk(ctx, `${orgPath(org)}/residences`);
    if (!sites.ok) return sites;
    const site = asArray(sites.body.residences).map(asRecord).find((s) => s.id === input.residenceId);
    if (!site) return fail("unknown_site");
    const roles = await roleCatalogue(ctx, org);
    const role = roles.find((r) => r.roleKey === roleKey && r.workGroup === workGroup);
    if (!role) return fail("unknown_role");
    const description = str(input.description, 2000);
    const sameDay = startAt.slice(0, 10) === endAt.slice(0, 10) || Date.parse(endAt) - Date.parse(startAt) <= DAY_MS;
    return {
      ok: true,
      args: {
        residenceId: input.residenceId, departmentId: input.departmentId, workGroup, roleDefinition: roleKey, title,
        ...(description ? { description } : {}), numberOfWorkers: workers, startAt, endAt,
        requestType: sameDay ? "single_day" : "multi_day"
      },
      card: {
        subject: title,
        startAt,
        endAt,
        timezone: "America/Toronto",
        place: str(site.name, 120),
        details: [`${role.role || roleKey}`, `workers:${workers}`]
      }
    };
  },
  async execute(args, ctx) {
    const org = orgOf(ctx);
    if (typeof org !== "string") return { ok: false, code: org.error, detail: "Create draft: no company." };
    const res = await ctx.call({
      method: "POST",
      url: `${orgPath(org)}/job-requests`,
      // The same body the employer app's create form sends; the draft service validates every field.
      body: { ...args, urgency: "normal", timezone: "America/Toronto" }
    });
    if (res.status === 201) {
      const number = asRecord(asRecord(res.body).jobRequest).jobRequestNumber;
      return okResult("draft_created", `Draft request created${typeof number === "string" ? ` (${number})` : ""}. Not submitted.`, "Edit or delete the draft on the request page.");
    }
    return failedResult(res, "Create draft");
  }
};

const submitDraft: ActionTool = {
  kind: "action",
  name: "submit_draft",
  role: "employer",
  switchKey: "assistant.employer.submit_draft",
  movesMoney: false,
  description: "Propose submitting one of the company's DRAFT requests to Joblop. The usual checks apply (including the minimum wage). Shows a card first.",
  inputSchema: schema({ jobRequestId: uuidProp("A draft from my_requests.") }, ["jobRequestId"]),
  undoHint: "A submitted request can be cancelled from the request page (cancellation rules apply).",
  async prepare(input, ctx) {
    const org = orgOf(ctx);
    if (typeof org !== "string") return org;
    if (!isUuid(input.jobRequestId)) return fail("invalid_request");
    const found = await readRequest(ctx, org, input.jobRequestId);
    if (!found.ok) return found;
    const r = found.request;
    if (r.status !== "draft" && r.status !== "information_required") return fail("not_a_draft");
    return {
      ok: true,
      args: { jobRequestId: input.jobRequestId },
      card: { subject: `${String(r.title ?? "")} (${String(r.jobRequestNumber ?? "")})`, startAt: str(r.startAt, 40), endAt: str(r.endAt, 40), timezone: str(r.timezone, 60), details: [`workers:${String(r.numberOfWorkers ?? "")}`] }
    };
  },
  async execute(args, ctx) {
    const org = orgOf(ctx);
    if (typeof org !== "string") return { ok: false, code: org.error, detail: "Submit: no company." };
    const found = await readRequest(ctx, org, String(args.jobRequestId));
    if (!found.ok) return { ok: false, code: found.error, detail: `Submit: could not read the draft (${found.error}).` };
    const res = await ctx.call({
      method: "POST",
      url: `${orgPath(org)}/job-requests/${enc(String(args.jobRequestId))}/submit`,
      body: { expectedVersion: num(found.request.versionToken) ?? num(found.request.version) ?? 0 }
    });
    return res.status === 200 ? okResult("submitted", "Draft submitted to Joblop for review.", "Cancel it from the request page if needed.") : failedResult(res, "Submit");
  }
};

async function findTimesheet(ctx: ToolContext, org: string, timesheetId: string) {
  const res = await getOk(ctx, `${orgPath(org)}/timesheets`);
  if (!res.ok) return res;
  const t = asArray(res.body.timesheets).map(asRecord).find((x) => x.id === timesheetId);
  return t ? { ok: true as const, timesheet: t } : fail("not_found");
}

const confirmTimesheet: ActionTool = {
  kind: "action",
  name: "confirm_timesheet",
  role: "employer",
  switchKey: "assistant.employer.confirm_timesheet",
  movesMoney: false,
  description: "Propose confirming the hours on one of the company's timesheets. Shows a card first. If the hours look wrong, do not propose this: tell the employer to dispute them on the Timesheets page.",
  inputSchema: schema({ timesheetId: uuidProp("From timesheets_to_confirm.") }, ["timesheetId"]),
  undoHint: "Confirmed hours cannot be un-confirmed here; contact Joblop if they were wrong.",
  async prepare(input, ctx) {
    const org = orgOf(ctx);
    if (typeof org !== "string") return org;
    if (!isUuid(input.timesheetId)) return fail("invalid_timesheet");
    const found = await findTimesheet(ctx, org, input.timesheetId);
    if (!found.ok) return found;
    const t = found.timesheet;
    return {
      ok: true,
      args: { timesheetId: input.timesheetId },
      card: { subject: "timesheet", startAt: str(t.scheduledStartAt, 40), endAt: str(t.scheduledEndAt, 40), details: typeof t.billableMinutes === "number" ? [`minutes:${t.billableMinutes}`] : [] }
    };
  },
  async execute(args, ctx) {
    const org = orgOf(ctx);
    if (typeof org !== "string") return { ok: false, code: org.error, detail: "Confirm hours: no company." };
    const found = await findTimesheet(ctx, org, String(args.timesheetId));
    if (!found.ok) return { ok: false, code: found.error, detail: `Confirm hours: not found (${found.error}).` };
    const res = await ctx.call({
      method: "POST",
      url: `${orgPath(org)}/timesheets/${enc(String(args.timesheetId))}/confirm`,
      body: { expectedVersion: num(found.timesheet.versionToken) ?? num(found.timesheet.version) ?? 0 }
    });
    return res.status === 200 ? okResult("hours_confirmed", "Timesheet hours confirmed by the employer.") : failedResult(res, "Confirm hours");
  }
};

const duplicateRequest: ActionTool = {
  kind: "action",
  name: "duplicate_request",
  role: "employer",
  switchKey: "assistant.employer.duplicate_request",
  movesMoney: false,
  description: "Propose copying one of the company's requests into a new DRAFT (same site, role, times and duties; priced from the current contract). Shows a card first.",
  inputSchema: schema({ jobRequestId: uuidProp("From my_requests.") }, ["jobRequestId"]),
  undoHint: "The copy is a draft; edit or delete it on the request page.",
  async prepare(input, ctx) {
    const org = orgOf(ctx);
    if (typeof org !== "string") return org;
    if (!isUuid(input.jobRequestId)) return fail("invalid_request");
    const found = await readRequest(ctx, org, input.jobRequestId);
    if (!found.ok) return found;
    const r = found.request;
    return {
      ok: true,
      args: { jobRequestId: input.jobRequestId },
      card: { subject: `${String(r.title ?? "")} (${String(r.jobRequestNumber ?? "")})`, startAt: str(r.startAt, 40), endAt: str(r.endAt, 40), timezone: str(r.timezone, 60) }
    };
  },
  async execute(args, ctx) {
    const org = orgOf(ctx);
    if (typeof org !== "string") return { ok: false, code: org.error, detail: "Duplicate: no company." };
    const res = await ctx.call({ method: "POST", url: `${orgPath(org)}/job-requests/${enc(String(args.jobRequestId))}/duplicate`, body: {} });
    if (res.status === 201) {
      const number = asRecord(asRecord(res.body).jobRequest).jobRequestNumber;
      return okResult("duplicated", `Request copied into a new draft${typeof number === "string" ? ` (${number})` : ""}.`, "Edit or delete the new draft on the request page.");
    }
    return failedResult(res, "Duplicate");
  }
};

export const EMPLOYER_TOOLS: readonly AssistantTool[] = [
  myRequests, assignedWorkers, timesheetsToConfirm, myInvoices, mySites, myContract, listRoles,
  createDraftRequest, submitDraft, confirmTimesheet, duplicateRequest
];
