// Server-authoritative classification of a staffing-request edit.
//
// NON_MATERIAL changes (contact info, arrival instructions, internal notes,
// permitted job-description detail) may be applied safely. MATERIAL changes (role,
// work date, major time change, work location, worker count affecting confirmed
// workers, eligibility-affecting qualifications, or anything touching governed
// rate/accepted worker terms) must NOT silently mutate accepted worker terms — they
// require the governed redispatch/reconfirmation workflow.
//
// This is a pure classifier. The server decides; the browser never determines
// materiality.

export const MAJOR_TIME_CHANGE_MINUTES = 60;

// The governed fields whose change can be material. Free-text fields (title,
// description, duties, special/arrival instructions, notes) are non-material.
export type RequestEditState = Readonly<{
  roleDefinitionId: string;
  workGroupId: string;
  residenceId: string;
  departmentId: string;
  startAt: string; // ISO
  endAt: string; // ISO
  timezone: string;
  numberOfWorkers: number;
  qualifications: readonly string[];
}>;

export type RequestEditMaterialField =
  | "role"
  | "work_location"
  | "work_date"
  | "schedule_time"
  | "timezone"
  | "worker_count_confirmed"
  | "qualifications";

export type RequestEditClassification = Readonly<{
  classification: "MATERIAL" | "NON_MATERIAL";
  materialFields: readonly RequestEditMaterialField[];
  // True when the change requires worker reconfirmation/redispatch (material AND
  // the request already has confirmed workers whose accepted terms are affected).
  requiresReconfirmation: boolean;
}>;

function calendarDay(iso: string): string {
  return iso.slice(0, 10);
}

function minutesApart(aIso: string, bIso: string): number {
  const a = Date.parse(aIso);
  const b = Date.parse(bIso);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return Number.POSITIVE_INFINITY;
  return Math.abs(a - b) / 60000;
}

function qualificationsChanged(before: readonly string[], after: readonly string[]): boolean {
  const norm = (list: readonly string[]) =>
    [...list].map((q) => q.trim().toLowerCase()).sort();
  const a = norm(before);
  const b = norm(after);
  return a.length !== b.length || a.some((value, index) => value !== b[index]);
}

export function classifyRequestEdit(
  before: RequestEditState,
  after: RequestEditState,
  options: { confirmedWorkers?: number } = {}
): RequestEditClassification {
  const confirmedWorkers = options.confirmedWorkers ?? 0;
  const fields: RequestEditMaterialField[] = [];

  if (before.roleDefinitionId !== after.roleDefinitionId || before.workGroupId !== after.workGroupId) {
    fields.push("role");
  }
  if (before.residenceId !== after.residenceId || before.departmentId !== after.departmentId) {
    fields.push("work_location");
  }
  if (calendarDay(before.startAt) !== calendarDay(after.startAt)) {
    fields.push("work_date");
  } else if (
    minutesApart(before.startAt, after.startAt) > MAJOR_TIME_CHANGE_MINUTES ||
    minutesApart(before.endAt, after.endAt) > MAJOR_TIME_CHANGE_MINUTES
  ) {
    // Same day but a major start/end time shift.
    fields.push("schedule_time");
  }
  if (before.timezone !== after.timezone) {
    fields.push("timezone");
  }
  // A worker-count change that drops below the confirmed count affects accepted
  // workers (this is the Reduce-into-confirmed case) — material.
  if (after.numberOfWorkers < before.numberOfWorkers && after.numberOfWorkers < confirmedWorkers) {
    fields.push("worker_count_confirmed");
  }
  if (qualificationsChanged(before.qualifications, after.qualifications)) {
    fields.push("qualifications");
  }

  const material = fields.length > 0;
  return {
    classification: material ? "MATERIAL" : "NON_MATERIAL",
    materialFields: fields,
    // Reconfirmation is needed only when a material change actually affects already
    // confirmed workers. Material edits on a request with no confirmed workers can be
    // applied through the normal governed path without reconfirmation.
    requiresReconfirmation: material && confirmedWorkers > 0
  };
}
