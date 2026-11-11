import { workerProfileRating } from "@rwos/shared";
import type { ActionTool, AssistantTool, ReadTool } from "./assistantTypes";
import {
  asArray, asRecord, enc, fail, failedResult, getOk, isoDate, isUuid, minorToAmount, num, okResult, schema, str, uuidProp
} from "./toolHelpers";

// Worker tools. Each one calls the route the worker app (or mobile app) already uses, as the worker,
// and keeps only what the worker already sees: their own shifts, timesheets and pay, never an
// employer rate, never Joblop's share, never another worker.

const HOUR_MS = 3_600_000;

type Shift = {
  attendanceRecordId: string; assignmentId: string | null; jobRequestId: string | null; status: string;
  role: string | null; employerName: string | null; area: string | null; startAt: string; endAt: string; timezone: string | null;
  checkedInAt: string | null; checkedOutAt: string | null; addressOnShiftPage: boolean; safetyNotes: string | null;
};

function toShift(raw: unknown): Shift {
  const r = asRecord(raw);
  return {
    attendanceRecordId: String(r.attendanceRecordId ?? ""),
    assignmentId: typeof r.assignmentId === "string" ? r.assignmentId : null,
    jobRequestId: typeof r.jobRequestId === "string" ? r.jobRequestId : null,
    status: String(r.status ?? ""),
    role: str(r.roleLabel, 120),
    employerName: str(r.employerName, 160),
    area: str(r.areaLabel, 120),
    startAt: String(r.scheduledStartAt ?? ""),
    endAt: String(r.scheduledEndAt ?? ""),
    timezone: str(r.timezone, 60),
    checkedInAt: typeof r.checkInAt === "string" ? r.checkInAt : null,
    checkedOutAt: typeof r.checkOutAt === "string" ? r.checkOutAt : null,
    // The exact address is shown on the worker's shift page; the assistant never repeats it.
    addressOnShiftPage: typeof r.worksiteAddress === "string" && r.worksiteAddress.length > 0,
    safetyNotes: str(r.safetyNotes, 500)
  };
}

async function listShifts(ctx: Parameters<ReadTool["run"]>[1]) {
  const res = await getOk(ctx, "/worker/attendance?limit=50");
  if (!res.ok) return res;
  return { ok: true as const, shifts: asArray(res.body.items).map(toShift) };
}

const searchOpenJobs: ReadTool = {
  kind: "read",
  name: "search_open_jobs",
  role: "worker",
  description: "Search open jobs the worker can take, with the same filters as the Find work page. Returns role, employer, area, dates, places left and the worker's hourly pay.",
  inputSchema: schema(
    {
      place: { type: "string", description: "City name or postal code, e.g. Laval or H7N 1A1." },
      role: { type: "string", description: "Optional role words, e.g. kitchen helper." },
      dateFrom: { type: "string", description: "Optional first day, YYYY-MM-DD." },
      dateTo: { type: "string", description: "Optional last day, YYYY-MM-DD." },
      radiusKm: { type: "number", description: "Optional distance in km (max 500)." },
      sort: { type: "string", enum: ["nearest", "soonest", "highest_rate"] }
    },
    ["place"]
  ),
  async run(input, ctx) {
    const place = str(input.place, 80);
    if (!place) return fail("place_required");
    const body: Record<string, unknown> = { place, limit: 10 };
    const role = str(input.role, 80);
    if (role) body.role = role;
    const from = isoDate(input.dateFrom);
    const to = isoDate(input.dateTo);
    if (from) body.dateFrom = from;
    if (to) body.dateTo = to;
    const radius = num(input.radiusKm);
    if (radius && radius > 0) body.radiusKm = Math.min(radius, 500);
    if (input.sort === "nearest" || input.sort === "soonest" || input.sort === "highest_rate") body.sort = input.sort;
    const res = await ctx.call({ method: "POST", url: "/marketplace/jobs/search", body });
    if (res.status !== 200) return fail(res.status === 400 ? "place_not_found" : "search_failed");
    const payload = asRecord(res.body);
    return {
      total: num(payload.total) ?? 0,
      jobs: asArray(payload.jobs).map((raw) => {
        const j = asRecord(raw);
        return {
          jobRequestId: j.jobRequestId,
          role: j.role,
          employerName: j.employerName,
          area: j.areaLabel ?? j.city ?? null,
          distanceKm: num(j.distanceKm),
          startAt: j.startAt,
          endAt: j.endAt,
          placesLeft: j.openings,
          hourlyPay: minorToAmount(j.workerRateMinor),
          currency: j.currency,
          requiredCertificates: Array.isArray(j.requiredCertificates) ? j.requiredCertificates : []
        };
      }),
      hiddenJobs: num(asRecord(payload.profile).hiddenJobs) ?? 0
    };
  }
};

const myUpcomingShifts: ReadTool = {
  kind: "read",
  name: "my_upcoming_shifts",
  role: "worker",
  description: "The worker's own upcoming and current shifts (role, employer, area, start and end, status).",
  inputSchema: schema({}),
  async run(_input, ctx) {
    const res = await listShifts(ctx);
    if (!res.ok) return res;
    const now = ctx.now.getTime();
    const upcoming = res.shifts
      .filter((s) => Date.parse(s.endAt) >= now && s.status !== "cancelled")
      .sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt))
      .slice(0, 15)
      .map(({ safetyNotes: _notes, ...shift }) => shift);
    return { shifts: upcoming };
  }
};

const myShiftDetails: ReadTool = {
  kind: "read",
  name: "my_shift_details",
  role: "worker",
  description: "Details of one of the worker's own shifts: time, area, status, safety notes, and whether the exact address is on the shift page.",
  inputSchema: schema({ attendanceRecordId: uuidProp("From my_upcoming_shifts."), assignmentId: uuidProp("From my_upcoming_shifts.") }),
  async run(input, ctx) {
    const res = await listShifts(ctx);
    if (!res.ok) return res;
    const shift = res.shifts.find(
      (s) => (isUuid(input.attendanceRecordId) && s.attendanceRecordId === input.attendanceRecordId) || (isUuid(input.assignmentId) && s.assignmentId === input.assignmentId)
    );
    if (!shift) return fail("not_found");
    return { shift, page: "/schedule" };
  }
};

const myTimesheets: ReadTool = {
  kind: "read",
  name: "my_timesheets",
  role: "worker",
  description: "The worker's own timesheets and their status (hours counted, breaks, whether the worker confirmed them).",
  inputSchema: schema({}),
  async run(_input, ctx) {
    const res = await getOk(ctx, "/worker/timesheets?limit=15");
    if (!res.ok) return res;
    return {
      timesheets: asArray(res.body.items).map((raw) => {
        const t = asRecord(raw);
        return {
          timesheetId: t.timesheetId,
          status: t.status,
          workerReview: t.workerReviewStatus,
          startAt: t.scheduledStartAt,
          endAt: t.scheduledEndAt,
          paidMinutes: t.payableMinutes,
          breakMinutes: t.breakMinutes,
          employerName: t.employerName,
          area: t.areaLabel
        };
      }),
      page: "/timesheets"
    };
  }
};

const myPayStatements: ReadTool = {
  kind: "read",
  name: "my_pay_statements",
  role: "worker",
  description: "The worker's own approved pay statements (period, gross, deductions, net) and totals so far. Own pay only.",
  inputSchema: schema({}),
  async run(_input, ctx) {
    const res = await getOk(ctx, "/worker/payroll/statement?limit=6");
    if (!res.ok) return res;
    const summary = asRecord(res.body.summary);
    return {
      statements: asArray(res.body.items).map((raw) => {
        const c = asRecord(raw);
        return {
          periodStart: c.periodStart,
          periodEnd: c.periodEnd,
          status: c.status,
          currency: c.currency,
          gross: minorToAmount(c.grossPayMinor),
          deductions: minorToAmount(c.totalDeductionsMinor),
          net: minorToAmount(c.netPayMinor),
          lines: asArray(c.earningLines).map((raw2) => {
            const e = asRecord(raw2);
            return { description: e.description, minutes: e.quantityMinutes, hourlyPay: minorToAmount(e.rateMinor), amount: minorToAmount(e.amountMinor) };
          })
        };
      }),
      totals: res.body.summary
        ? { statements: summary.statementCount, gross: minorToAmount(summary.totalGrossMinor), deductions: minorToAmount(summary.totalDeductionsMinor), net: minorToAmount(summary.totalNetMinor), currency: summary.currency }
        : null,
      page: "/pay"
    };
  }
};

const myProfile: ReadTool = {
  kind: "read",
  name: "my_profile",
  role: "worker",
  description: "The worker's documents with their status, the profile score, and which documents are still missing.",
  inputSchema: schema({}),
  async run(_input, ctx) {
    const res = await getOk(ctx, "/hr/documents");
    if (!res.ok) return res;
    const documents = asArray(res.body.documents).map((raw) => {
      const d = asRecord(raw);
      return { documentType: String(d.documentType ?? ""), status: String(d.effectiveStatus ?? d.status ?? ""), expiresAt: d.expiresAt ?? null };
    });
    const rating = workerProfileRating(documents.map((d) => ({ documentType: d.documentType, effectiveStatus: d.status })));
    return {
      documents,
      profileScore: rating.score,
      tier: rating.tier,
      jobsShownPerSearch: rating.jobLimit ?? "all",
      missing: rating.items.filter((i) => !i.done).map((i) => i.key),
      page: "/documents"
    };
  }
};

// ── actions (proposed; they run only after the worker presses Confirm) ──

const claimOpenJob: ActionTool = {
  kind: "action",
  name: "claim_open_job",
  role: "worker",
  switchKey: "assistant.worker.claim_job",
  movesMoney: false,
  description: "Propose claiming an open job for the worker. Shows a card; nothing happens until the worker presses Confirm. All the usual claim checks apply.",
  inputSchema: schema({ jobRequestId: uuidProp("From search_open_jobs.") }, ["jobRequestId"]),
  undoHint: "The worker can cancel the shift from their schedule; the usual cancellation rules apply.",
  async prepare(input, ctx) {
    if (!isUuid(input.jobRequestId)) return fail("invalid_job");
    const res = await getOk(ctx, `/marketplace/jobs/${enc(input.jobRequestId)}`);
    if (!res.ok) return res;
    const job = asRecord(res.body.job);
    if (job.claimable !== true) return fail("not_open_for_claim");
    return {
      ok: true,
      args: { jobRequestId: input.jobRequestId },
      card: { subject: String(job.role ?? job.title ?? "Job"), startAt: str(job.startAt, 40), endAt: str(job.endAt, 40), place: str(job.areaLabel, 120) }
    };
  },
  async execute(args, ctx) {
    const res = await ctx.call({ method: "POST", url: `/marketplace/jobs/${enc(String(args.jobRequestId))}/claim`, body: {} });
    if (res.status === 201) return okResult("claimed", "Job claimed through the open-claim arbiter.", "Cancel the shift from My schedule if needed; the usual cancellation rules apply.");
    return failedResult(res, "Claim");
  }
};

async function readAssignment(ctx: Parameters<ActionTool["prepare"]>[1], assignmentId: string) {
  const res = await getOk(ctx, `/worker/assignments/${enc(assignmentId)}`);
  if (!res.ok) return res;
  return { ok: true as const, assignment: asRecord(res.body.assignment) };
}

const cancelMyShift: ActionTool = {
  kind: "action",
  name: "cancel_my_shift",
  role: "worker",
  switchKey: "assistant.worker.cancel_shift",
  movesMoney: false,
  description: "Propose cancelling one of the worker's own shifts (existing worker-cancel rules and cut-offs). Shows a card with a warning when it is less than 24 hours before the start.",
  inputSchema: schema(
    { assignmentId: uuidProp("From my_upcoming_shifts."), reason: { type: "string", description: "The worker's reason, in their words (short)." } },
    ["assignmentId", "reason"]
  ),
  undoHint: "A cancelled shift is not restored automatically. The worker can claim it again if it is still open.",
  async prepare(input, ctx) {
    if (!isUuid(input.assignmentId)) return fail("invalid_shift");
    const reason = str(input.reason, 300);
    if (!reason) return fail("reason_required");
    const found = await readAssignment(ctx, input.assignmentId);
    if (!found.ok) return found;
    const a = found.assignment;
    const startAt = str(a.startAt, 40);
    const late = startAt ? Date.parse(startAt) - ctx.now.getTime() < 24 * HOUR_MS : false;
    return {
      ok: true,
      args: { assignmentId: input.assignmentId, reason },
      card: { subject: String(a.title ?? "Shift"), startAt, endAt: str(a.endAt, 40), timezone: str(a.timezone, 60), warning: late ? "late_cancel" : null }
    };
  },
  async execute(args, ctx) {
    const found = await readAssignment(ctx, String(args.assignmentId));
    if (!found.ok) return { ok: false, code: found.error, detail: `Cancel: could not read the shift (${found.error}).` };
    const res = await ctx.call({
      method: "POST",
      url: `/worker/assignments/${enc(String(args.assignmentId))}/withdraw`,
      body: { expectedVersion: num(found.assignment.versionToken) ?? 0, reason: String(args.reason) }
    });
    if (res.status === 200) {
      const penalty = asRecord(asRecord(res.body).cancellationPenalty);
      const late = typeof penalty.penalty === "string" && penalty.penalty !== "none";
      return okResult(late ? "cancelled_late" : "cancelled", "Shift cancelled through the worker-cancel rules.", "Claim the job again from Find work if it is still open.");
    }
    return failedResult(res, "Cancel");
  }
};

const confirmShift: ActionTool = {
  kind: "action",
  name: "confirm_shift",
  role: "worker",
  switchKey: "assistant.worker.confirm_shift",
  movesMoney: false,
  description: "Propose confirming (acknowledging) one of the worker's own upcoming shifts. Shows a card first.",
  inputSchema: schema({ assignmentId: uuidProp("From my_upcoming_shifts.") }, ["assignmentId"]),
  undoHint: "Confirming a shift has no undo; the worker can still cancel it under the usual rules.",
  async prepare(input, ctx) {
    if (!isUuid(input.assignmentId)) return fail("invalid_shift");
    const found = await readAssignment(ctx, input.assignmentId);
    if (!found.ok) return found;
    const a = found.assignment;
    if (a.status !== "confirmed" && a.status !== "ready_for_attendance") return fail("nothing_to_confirm");
    return {
      ok: true,
      args: { assignmentId: input.assignmentId },
      card: { subject: String(a.title ?? "Shift"), startAt: str(a.startAt, 40), endAt: str(a.endAt, 40), timezone: str(a.timezone, 60) }
    };
  },
  async execute(args, ctx) {
    const found = await readAssignment(ctx, String(args.assignmentId));
    if (!found.ok) return { ok: false, code: found.error, detail: `Confirm: could not read the shift (${found.error}).` };
    const res = await ctx.call({
      method: "POST",
      url: `/worker/assignments/${enc(String(args.assignmentId))}/acknowledge`,
      body: { expectedVersion: num(found.assignment.versionToken) ?? 0 }
    });
    return res.status === 200 ? okResult("confirmed", "Shift confirmed by the worker.") : failedResult(res, "Confirm");
  }
};

export const WORKER_TOOLS: readonly AssistantTool[] = [
  searchOpenJobs, myUpcomingShifts, myShiftDetails, myTimesheets, myPayStatements, myProfile,
  claimOpenJob, cancelMyShift, confirmShift
];
