import type { ActionTool, AssistantTool, ReadTool, ToolContext } from "./assistantTypes";
import { asArray, asRecord, enc, fail, failedResult, getOk, isUuid, num, okResult, schema, str, uuidProp } from "./toolHelpers";

// Staff (platform admin) tools. They call the staff routes as the signed-in staff member, so the same
// platform-admin checks apply. Actions go through the same governed paths as the staff pages: the
// brain's own "Do it" (its once-only claim and audit apply), the shared approve-for-dispatch flow and
// the timesheet approval. None moves money: payouts, charges and "mark paid" are not tools.

const brainOverview: ReadTool = {
  kind: "read",
  name: "brain_open_issues",
  role: "staff",
  description: "The Joblop Brain: master mode, open issues (what, how urgent, recommended action) and the last-24-hour counts.",
  inputSchema: schema({}),
  async run(_input, ctx) {
    const res = await getOk(ctx, "/platform/brain");
    if (!res.ok) return res;
    return {
      mode: res.body.mode,
      issues: asArray(res.body.issues).slice(0, 40).map(asRecord).map((i) => ({
        issueId: i.id, rule: i.ruleKey, severity: i.severity, summary: i.summary, recommendedAction: i.recommendedAction, detectedAt: i.detectedAt
      })),
      last24h: res.body.summary,
      page: "/brain"
    };
  }
};

const requestsToReview: ReadTool = {
  kind: "read",
  name: "requests_to_review",
  role: "staff",
  description: "Staffing requests waiting for staff review (intake), with status, dates and workers asked.",
  inputSchema: schema({}),
  async run(_input, ctx) {
    const res = await getOk(ctx, "/platform/job-requests/intake");
    if (!res.ok) return res;
    return {
      requests: asArray(res.body.jobRequests).slice(0, 40).map(asRecord).map((r) => ({
        jobRequestId: r.id, jobRequestNumber: r.jobRequestNumber, title: r.title, status: r.status, workersAsked: r.numberOfWorkers, startAt: r.startAt, endAt: r.endAt
      })),
      page: "/requests"
    };
  }
};

const timesheetQueue: ReadTool = {
  kind: "read",
  name: "timesheet_queue",
  role: "staff",
  description: "Timesheets waiting for staff (status, employer, worker, start, minutes, exceptions) and finished shifts with no timesheet yet.",
  inputSchema: schema({}),
  async run(_input, ctx) {
    const res = await getOk(ctx, "/platform/timesheets/queue");
    if (!res.ok) return res;
    return {
      timesheets: asArray(res.body.timesheets).slice(0, 40).map(asRecord).map((t) => ({
        timesheetId: t.id, status: t.status, employerName: t.employerName, workerName: t.workerName, startAt: t.scheduledStartAt, paidMinutes: t.payableMinutes, exceptions: t.exceptionSummary
      })),
      finishedWithoutTimesheet: asArray(res.body.ready).length,
      page: "/timesheets"
    };
  }
};

const contactDeskQueue: ReadTool = {
  kind: "read",
  name: "contact_desk_queue",
  role: "staff",
  description: "Contact-desk conversations waiting for a person (side, topic, urgent, short summary). No message text.",
  inputSchema: schema({}),
  async run(_input, ctx) {
    const res = await getOk(ctx, "/platform/contact/conversations?filter=needs_admin");
    if (!res.ok) return res;
    return {
      conversations: asArray(res.body.conversations).slice(0, 40).map(asRecord).map((c) => ({
        conversationId: c.id, side: c.side, topic: c.topic, urgent: c.urgent, status: c.status, reason: c.handoffReason, summary: c.summary, lastMessageAt: c.lastMessageAt
      })),
      page: "/contact-desk"
    };
  }
};

const todayOverview: ReadTool = {
  kind: "read",
  name: "today_overview",
  role: "staff",
  description: "The staff calendar's 'today' list: what needs attention now (unfilled jobs, cancellations, pay days, disputes).",
  inputSchema: schema({}),
  async run(_input, ctx) {
    const res = await getOk(ctx, "/platform/calendar-hub");
    if (!res.ok) return res;
    return {
      today: asArray(res.body.today).slice(0, 40).map(asRecord).map((t) => ({ type: t.type, title: t.title, detail: t.detail, severity: t.severity, startAt: t.startAt })),
      page: "/calendar"
    };
  }
};

// ── actions ──

async function findIssue(ctx: ToolContext, issueId: string) {
  const res = await getOk(ctx, "/platform/brain");
  if (!res.ok) return res;
  const issue = asArray(res.body.issues).map(asRecord).find((i) => i.id === issueId);
  return issue ? { ok: true as const, issue } : fail("not_found_or_closed");
}

const brainDoIt: ActionTool = {
  kind: "action",
  name: "brain_do_it",
  role: "staff",
  switchKey: "assistant.staff.brain_do_it",
  movesMoney: false,
  description: "Propose running the recommended Brain action for one open issue, through the Brain's own 'Do it' (once-only claim and audit log apply). Shows a card first.",
  inputSchema: schema({ issueId: uuidProp("From brain_open_issues.") }, ["issueId"]),
  undoHint: "Use Undo on the Brain page when the action offers it.",
  async prepare(input, ctx) {
    if (!isUuid(input.issueId)) return fail("invalid_issue");
    const found = await findIssue(ctx, input.issueId);
    if (!found.ok) return found;
    if (typeof found.issue.recommendedAction !== "string") return fail("no_action_for_this_issue");
    return { ok: true, args: { issueId: input.issueId }, card: { subject: String(found.issue.summary ?? ""), details: [`action:${found.issue.recommendedAction}`] } };
  },
  async execute(args, ctx) {
    const res = await ctx.call({ method: "POST", url: `/platform/brain/issues/${enc(String(args.issueId))}/do`, body: {} });
    if (res.status === 200) {
      const status = String(asRecord(res.body).status ?? "done");
      return { ok: status === "done", code: `brain_${status}`, detail: `Brain "Do it": ${status}.`, undoNote: "Use Undo on the Brain page when the action offers it." };
    }
    return failedResult(res, "Brain Do it");
  }
};

async function readIntake(ctx: ToolContext, jobRequestId: string) {
  const res = await getOk(ctx, `/platform/job-requests/intake/${enc(jobRequestId)}`);
  if (!res.ok) return res;
  return { ok: true as const, request: asRecord(res.body.jobRequest) };
}

const approveRequest: ActionTool = {
  kind: "action",
  name: "approve_request",
  role: "staff",
  switchKey: "assistant.staff.approve_request",
  movesMoney: false,
  description: "Propose approving a staffing request for dispatch with the shared approve-for-dispatch flow (pricing, minimum wage and every staff check apply; it opens for worker claim). Shows a card first.",
  inputSchema: schema({ jobRequestId: uuidProp("From requests_to_review.") }, ["jobRequestId"]),
  undoHint: "Cancel the request from the staff request page if it was approved by mistake.",
  async prepare(input, ctx) {
    if (!isUuid(input.jobRequestId)) return fail("invalid_request");
    const found = await readIntake(ctx, input.jobRequestId);
    if (!found.ok) return found;
    const r = found.request;
    if (r.status !== "submitted" && r.status !== "admin_review") return fail("not_waiting_for_review");
    return {
      ok: true,
      args: { jobRequestId: input.jobRequestId },
      card: { subject: `${String(r.title ?? "")} (${String(r.jobRequestNumber ?? "")})`, startAt: str(r.startAt, 40), endAt: str(r.endAt, 40), timezone: str(r.timezone, 60), details: [`workers:${String(r.numberOfWorkers ?? "")}`] }
    };
  },
  async execute(args, ctx) {
    const id = String(args.jobRequestId);
    const found = await readIntake(ctx, id);
    if (!found.ok) return { ok: false, code: found.error, detail: `Approve: could not read the request (${found.error}).` };
    let version = num(found.request.versionToken) ?? num(found.request.version) ?? 0;
    // Same order as the brain's auto-approval: begin the review when it is still "submitted".
    if (found.request.status === "submitted") {
      const review = await ctx.call({ method: "POST", url: `/platform/job-requests/intake/${enc(id)}/admin-review`, body: { expectedVersion: version } });
      if (review.status !== 200) return failedResult(review, "Approve (begin review)");
      const reviewed = asRecord(asRecord(review.body).jobRequest);
      version = num(reviewed.versionToken) ?? num(reviewed.version) ?? version + 1;
    }
    const res = await ctx.call({ method: "POST", url: `/platform/job-requests/intake/${enc(id)}/approve-for-dispatch`, body: { expectedVersion: version, openClaim: true } });
    return res.status === 200 ? okResult("approved", "Request approved for dispatch (shared flow).", "Cancel the request from the staff request page if needed.") : failedResult(res, "Approve");
  }
};

const approveTimesheet: ActionTool = {
  kind: "action",
  name: "approve_timesheet",
  role: "staff",
  switchKey: "assistant.staff.approve_timesheet",
  movesMoney: false,
  description: "Propose approving one timesheet (the same approval as the staff Timesheets page). It does not pay anyone. Shows a card first.",
  inputSchema: schema({ timesheetId: uuidProp("From timesheet_queue.") }, ["timesheetId"]),
  undoHint: "An approved timesheet is corrected through the staff Timesheets page (request correction), not undone here.",
  async prepare(input, ctx) {
    if (!isUuid(input.timesheetId)) return fail("invalid_timesheet");
    const res = await getOk(ctx, `/platform/timesheets/${enc(input.timesheetId)}`);
    if (!res.ok) return res;
    const t = asRecord(res.body.timesheet);
    return { ok: true, args: { timesheetId: input.timesheetId }, card: { subject: "timesheet", startAt: str(t.scheduledStartAt, 40), endAt: str(t.scheduledEndAt, 40), details: typeof t.payableMinutes === "number" ? [`minutes:${t.payableMinutes}`] : [] } };
  },
  async execute(args, ctx) {
    const id = String(args.timesheetId);
    const current = await getOk(ctx, `/platform/timesheets/${enc(id)}`);
    if (!current.ok) return { ok: false, code: current.error, detail: `Approve hours: not found (${current.error}).` };
    const t = asRecord(current.body.timesheet);
    const res = await ctx.call({ method: "POST", url: `/platform/timesheets/${enc(id)}/approve`, body: { expectedVersion: num(t.versionToken) ?? num(t.version) ?? 0 } });
    return res.status === 200 ? okResult("hours_approved", "Timesheet approved (staff approval).", "Use request correction on the staff Timesheets page if it was wrong.") : failedResult(res, "Approve hours");
  }
};

export const STAFF_TOOLS: readonly AssistantTool[] = [
  brainOverview, requestsToReview, timesheetQueue, contactDeskQueue, todayOverview,
  brainDoIt, approveRequest, approveTimesheet
];
