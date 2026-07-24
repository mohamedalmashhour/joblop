import type { ApplicationStatus } from "./application";
import type { ShiftStatus } from "./shift";

export const sharedConceptNames = [
  "EmployerOrganization",
  "Residence",
  "Department",
  "Role",
  "Shift",
  "Application",
  "Recommendation",
  "Assignment",
  "AttendanceRecord",
  "Timesheet",
  "Invoice",
  "EmployerPayment",
  "WorkerPayable",
  "Notification",
  "MessageThread",
  "SupportCase",
  "AuditEvent"
] as const;

export type SharedConceptName = (typeof sharedConceptNames)[number];

export type SharedConceptDefinition = Readonly<{
  name: SharedConceptName;
  owner: "admin" | "employer" | "worker" | "system";
  participantSurfaces: readonly ("admin" | "employer" | "worker" | "api")[];
  authoritativeSource: string;
  responsibility: string;
  doesNotOwn: readonly string[];
}>;

export const employerOrganizationStates = [
  "invited",
  "pending_review",
  "active",
  "restricted",
  "suspended",
  "closed"
] as const;

export const residenceStates = ["draft", "active", "restricted", "inactive", "closed"] as const;
export const departmentStates = ["draft", "active", "restricted", "inactive", "closed"] as const;
export const roleStates = ["draft", "active", "restricted", "retired"] as const;
export const recommendationStates = [
  "generated",
  "reviewed",
  "accepted_by_human",
  "declined_by_human",
  "expired",
  "suppressed"
] as const;
export const assignmentStates = [
  "proposed",
  "pending_worker_response",
  "accepted",
  "declined",
  "expired",
  "cancelled",
  "confirmed",
  "active",
  "completed",
  "replacement_requested"
] as const;
export const attendanceRecordStates = [
  "scheduled",
  "arrival_window",
  "ready_to_clock_in",
  "clocked_in",
  "in_progress",
  "on_break",
  "clocked_out",
  "completed",
  "exception_review",
  "missed_clock_in",
  "missed_clock_out",
  "no_show",
  "cancelled",
  "replacement_required"
] as const;
export const timesheetStates = [
  "draft",
  "worker_review",
  "correction_requested",
  "employer_review",
  "partially_approved",
  "approved",
  "disputed",
  "locked",
  "finance_ready"
] as const;
export const invoiceStates = [
  "draft",
  "generated",
  "employer_review",
  "correction_requested",
  "issued",
  "partially_paid",
  "paid",
  "void",
  "disputed",
  "exported"
] as const;
export const employerPaymentStates = [
  "authorized",
  "scheduled",
  "processing",
  "sent",
  "settlement_pending",
  "settled",
  "failed",
  "returned",
  "reversed",
  "held"
] as const;
export const workerPayableStates = [
  "pending_timesheet_approval",
  "finance_ready",
  "payable_created",
  "payment_scheduled",
  "processing",
  "paid",
  "failed",
  "on_hold",
  "disputed",
  "reconciled"
] as const;
export const notificationStates = [
  "pending",
  "ready_to_send",
  "sent",
  "delivery_unknown",
  "failed",
  "suppressed",
  "archived"
] as const;
export const messageThreadStates = [
  "open",
  "unread",
  "read",
  "reply_draft",
  "sent",
  "delivery_unknown",
  "moderation_review",
  "archived"
] as const;
export const supportCaseStates = [
  "question",
  "support",
  "active_shift_support",
  "operational_review",
  "closed",
  "reopened"
] as const;
export const auditEventStates = ["recorded", "restricted", "retained", "retention_expired"] as const;

export type SharedConceptStateMap = Readonly<{
  EmployerOrganization: (typeof employerOrganizationStates)[number];
  Residence: (typeof residenceStates)[number];
  Department: (typeof departmentStates)[number];
  Role: (typeof roleStates)[number];
  Shift: ShiftStatus;
  Application: ApplicationStatus;
  Recommendation: (typeof recommendationStates)[number];
  Assignment: (typeof assignmentStates)[number];
  AttendanceRecord: (typeof attendanceRecordStates)[number];
  Timesheet: (typeof timesheetStates)[number];
  Invoice: (typeof invoiceStates)[number];
  EmployerPayment: (typeof employerPaymentStates)[number];
  WorkerPayable: (typeof workerPayableStates)[number];
  Notification: (typeof notificationStates)[number];
  MessageThread: (typeof messageThreadStates)[number];
  SupportCase: (typeof supportCaseStates)[number];
  AuditEvent: (typeof auditEventStates)[number];
}>;

type StateFor<TConcept extends SharedConceptName> = SharedConceptStateMap[TConcept];

export type SharedTransition<TConcept extends SharedConceptName = SharedConceptName> = Readonly<{
  concept: TConcept;
  from: StateFor<TConcept>;
  to: StateFor<TConcept>;
  authority: "worker" | "employer" | "admin" | "system" | "human_review";
  note: string;
}>;

export const sharedConceptDefinitions: readonly SharedConceptDefinition[] = [
  {
    authoritativeSource: "organization owner workflow",
    doesNotOwn: ["authentication", "payments", "worker eligibility"],
    name: "EmployerOrganization",
    owner: "admin",
    participantSurfaces: ["admin", "employer", "api"],
    responsibility: "Employer organization identity, approval status and operational scope."
  },
  {
    authoritativeSource: "residence owner workflow",
    doesNotOwn: ["department", "shift", "clinical records"],
    name: "Residence",
    owner: "employer",
    participantSurfaces: ["admin", "employer", "api"],
    responsibility: "Operating location used for staffing."
  },
  {
    authoritativeSource: "department owner workflow",
    doesNotOwn: ["shift", "role approval", "payroll"],
    name: "Department",
    owner: "employer",
    participantSurfaces: ["admin", "employer", "api"],
    responsibility: "Operating work area inside a residence."
  },
  {
    authoritativeSource: "role and permission owner workflow",
    doesNotOwn: ["permission grant", "worker eligibility", "credential verification"],
    name: "Role",
    owner: "admin",
    participantSurfaces: ["admin", "api"],
    responsibility: "Platform role vocabulary used by authorization."
  },
  {
    authoritativeSource: "shift owner workflow",
    doesNotOwn: ["application", "assignment", "attendance", "payroll"],
    name: "Shift",
    owner: "employer",
    participantSurfaces: ["admin", "employer", "worker", "api"],
    responsibility: "Staffing need, timing, role, requirements and publication state."
  },
  {
    authoritativeSource: "application owner workflow",
    doesNotOwn: ["assignment", "attendance", "employment"],
    name: "Application",
    owner: "worker",
    participantSurfaces: ["employer", "worker", "api"],
    responsibility: "Worker interest in a published shift."
  },
  {
    authoritativeSource: "AI recommendation workflow",
    doesNotOwn: ["assignment", "eligibility approval", "human decision"],
    name: "Recommendation",
    owner: "system",
    participantSurfaces: ["admin", "employer", "api"],
    responsibility: "Advisory candidate or shift suggestion with evidence."
  },
  {
    authoritativeSource: "assignment owner workflow",
    doesNotOwn: ["recommendation generation", "attendance", "payroll"],
    name: "Assignment",
    owner: "employer",
    participantSurfaces: ["admin", "employer", "worker", "api"],
    responsibility: "Human staffing selection, worker response and assignment status."
  },
  {
    authoritativeSource: "attendance owner workflow",
    doesNotOwn: ["timesheet approval", "discipline", "payroll"],
    name: "AttendanceRecord",
    owner: "worker",
    participantSurfaces: ["admin", "employer", "worker", "api"],
    responsibility: "Worker attendance evidence and exception state."
  },
  {
    authoritativeSource: "timesheet owner workflow",
    doesNotOwn: ["payroll calculation", "invoice payment", "worker payout"],
    name: "Timesheet",
    owner: "employer",
    participantSurfaces: ["admin", "employer", "worker", "api"],
    responsibility: "Reviewable hours derived from attendance evidence."
  },
  {
    authoritativeSource: "invoice owner workflow",
    doesNotOwn: ["payment execution", "payroll", "tax engine"],
    name: "Invoice",
    owner: "employer",
    participantSurfaces: ["admin", "employer", "api"],
    responsibility: "Employer billing document derived from approved timesheets."
  },
  {
    authoritativeSource: "employer payment owner workflow",
    doesNotOwn: ["invoice mutation", "worker payout", "banking credentials"],
    name: "EmployerPayment",
    owner: "employer",
    participantSurfaces: ["admin", "employer", "api"],
    responsibility: "Employer payment state associated with an invoice."
  },
  {
    authoritativeSource: "worker payable owner workflow",
    doesNotOwn: ["employer invoice", "payment provider execution", "tax filing"],
    name: "WorkerPayable",
    owner: "admin",
    participantSurfaces: ["admin", "worker", "api"],
    responsibility: "Worker-facing payable status derived from approved hours."
  },
  {
    authoritativeSource: "notification event workflow",
    doesNotOwn: ["authoritative workflow state", "approval", "payment"],
    name: "Notification",
    owner: "system",
    participantSurfaces: ["admin", "employer", "worker", "api"],
    responsibility: "Informational delivery state for completed authoritative events."
  },
  {
    authoritativeSource: "messaging owner workflow",
    doesNotOwn: ["workflow approvals", "ratings", "support resolution"],
    name: "MessageThread",
    owner: "system",
    participantSurfaces: ["admin", "employer", "worker", "api"],
    responsibility: "Authorized communication between participants."
  },
  {
    authoritativeSource: "support owner workflow",
    doesNotOwn: ["workflow mutation", "discipline", "payment execution"],
    name: "SupportCase",
    owner: "admin",
    participantSurfaces: ["admin", "employer", "worker", "api"],
    responsibility: "Human support routing and review status."
  },
  {
    authoritativeSource: "audit owner workflow",
    doesNotOwn: ["source-record mutation", "action replay", "permission grant"],
    name: "AuditEvent",
    owner: "system",
    participantSurfaces: ["admin", "api"],
    responsibility: "Immutable record of governed activity."
  }
];

export const sharedStateTransitions: readonly SharedTransition[] = [
  transition("EmployerOrganization", "invited", "pending_review", "employer", "Employer starts onboarding."),
  transition("EmployerOrganization", "pending_review", "active", "admin", "Human review activates employer."),
  transition("EmployerOrganization", "active", "restricted", "admin", "Access restriction requires admin authority."),
  transition("Residence", "draft", "active", "employer", "Residence becomes available for staffing setup."),
  transition("Department", "draft", "active", "employer", "Department becomes selectable for shifts."),
  transition("Role", "draft", "active", "admin", "Role becomes available to authorization workflows."),
  transition("Shift", "draft", "published", "employer", "Employer publishes a reviewed shift."),
  transition("Shift", "published", "open", "employer", "Published shift opens for worker discovery."),
  transition("Shift", "open", "reserved", "employer", "Worker selection reserves the shift."),
  transition("Shift", "reserved", "confirmed", "worker", "Worker acceptance confirms assignment terms."),
  transition("Shift", "confirmed", "in_progress", "worker", "Attendance starts the shift."),
  transition("Shift", "in_progress", "completed", "worker", "Attendance closes the shift."),
  transition("Application", "draft", "submitted", "worker", "Worker submits interest."),
  transition("Application", "submitted", "under_review", "employer", "Employer opens application review."),
  transition("Application", "under_review", "offered", "employer", "Employer creates an offer."),
  transition("Application", "offered", "accepted", "worker", "Worker accepts offer."),
  transition("Application", "accepted", "confirmed", "worker", "Worker confirms final assignment."),
  transition("Recommendation", "generated", "reviewed", "employer", "Human reviews advisory recommendation."),
  transition("Recommendation", "reviewed", "accepted_by_human", "employer", "Human accepts recommendation."),
  transition("Recommendation", "reviewed", "declined_by_human", "employer", "Human declines recommendation."),
  transition("Assignment", "proposed", "pending_worker_response", "employer", "Employer proposes assignment."),
  transition("Assignment", "pending_worker_response", "accepted", "worker", "Worker accepts assignment."),
  transition("Assignment", "accepted", "confirmed", "employer", "Assignment enters confirmed state."),
  transition("Assignment", "confirmed", "active", "worker", "Worker attendance starts."),
  transition("Assignment", "active", "completed", "worker", "Worker attendance closes."),
  transition("AttendanceRecord", "scheduled", "arrival_window", "worker", "Worker enters arrival window."),
  transition("AttendanceRecord", "ready_to_clock_in", "clocked_in", "worker", "Worker clocks in."),
  transition("AttendanceRecord", "clocked_in", "in_progress", "worker", "Shift work begins."),
  transition("AttendanceRecord", "in_progress", "on_break", "worker", "Worker records break."),
  transition("AttendanceRecord", "in_progress", "clocked_out", "worker", "Worker clocks out."),
  transition("AttendanceRecord", "clocked_out", "completed", "worker", "Attendance record is complete."),
  transition("Timesheet", "draft", "worker_review", "system", "Attendance creates reviewable draft."),
  transition("Timesheet", "worker_review", "employer_review", "worker", "Worker submits review."),
  transition("Timesheet", "worker_review", "correction_requested", "worker", "Worker requests correction."),
  transition("Timesheet", "employer_review", "approved", "employer", "Employer approves reviewed hours."),
  transition("Timesheet", "approved", "finance_ready", "system", "Approved hours hand off to finance."),
  transition("Invoice", "draft", "generated", "system", "Approved timesheets generate invoice draft."),
  transition("Invoice", "generated", "employer_review", "employer", "Employer reviews invoice."),
  transition("Invoice", "employer_review", "issued", "employer", "Invoice is issued after review."),
  transition("EmployerPayment", "authorized", "scheduled", "employer", "Employer payment method authorized."),
  transition("EmployerPayment", "scheduled", "processing", "system", "Payment processing begins."),
  transition("EmployerPayment", "processing", "settlement_pending", "system", "Payment sent for settlement."),
  transition("EmployerPayment", "settlement_pending", "settled", "system", "Payment settles."),
  transition("WorkerPayable", "pending_timesheet_approval", "finance_ready", "system", "Approved timesheet reaches finance."),
  transition("WorkerPayable", "finance_ready", "payable_created", "system", "Payable summary is created."),
  transition("WorkerPayable", "payable_created", "payment_scheduled", "admin", "Admin schedules worker payment."),
  transition("WorkerPayable", "payment_scheduled", "processing", "system", "Worker payment processing begins."),
  transition("WorkerPayable", "processing", "paid", "system", "Worker payment is marked paid."),
  transition("Notification", "pending", "ready_to_send", "system", "Completed event is ready for notification."),
  transition("Notification", "ready_to_send", "sent", "system", "Notification send attempted successfully."),
  transition("Notification", "ready_to_send", "failed", "system", "Notification send failed without changing source state."),
  transition("MessageThread", "open", "unread", "system", "New message arrives."),
  transition("MessageThread", "reply_draft", "sent", "worker", "Participant sends a message."),
  transition("SupportCase", "question", "support", "worker", "Worker or employer opens support."),
  transition("SupportCase", "support", "active_shift_support", "human_review", "Support escalates active shift issue."),
  transition("SupportCase", "active_shift_support", "operational_review", "human_review", "Human review begins."),
  transition("SupportCase", "operational_review", "closed", "human_review", "Human review closes case."),
  transition("AuditEvent", "recorded", "retained", "system", "Audit event enters retention policy.")
];

export const staffingWorkflowConceptSequence = [
  "EmployerOrganization",
  "Residence",
  "Department",
  "Shift",
  "Recommendation",
  "Application",
  "Assignment",
  "AttendanceRecord",
  "Timesheet",
  "Invoice",
  "EmployerPayment",
  "WorkerPayable",
  "Notification",
  "MessageThread",
  "SupportCase",
  "AuditEvent"
] as const satisfies readonly SharedConceptName[];

export type ApiIntegrationStatus =
  | "available"
  | "missing_backend"
  | "fixture_backed"
  | "integration_pending"
  | "blocked_by_schema_decision";

export type ApiIntegrationMapEntry = Readonly<{
  action: string;
  currentSource: "employer_frontend_fixture" | "worker_frontend_fixture" | "admin_frontend_fixture" | "shared_domain";
  targetApi: string;
  limitation: string;
  status: ApiIntegrationStatus;
}>;

export const apiIntegrationStatusMap: readonly ApiIntegrationMapEntry[] = [
  apiStatus("Employer creates shift", "employer_frontend_fixture", "POST /shifts", "No shift persistence API exists.", "missing_backend"),
  apiStatus("Worker discovers shift", "worker_frontend_fixture", "GET /shifts", "Mobile uses local fixture repository.", "fixture_backed"),
  apiStatus("Worker applies", "worker_frontend_fixture", "POST /applications", "Application repository is local only.", "missing_backend"),
  apiStatus("Employer reviews applicants", "employer_frontend_fixture", "GET /applications", "Employer applicant list is fixture-backed.", "missing_backend"),
  apiStatus("Employer assigns worker", "employer_frontend_fixture", "POST /assignments", "Assignment engine is not implemented.", "missing_backend"),
  apiStatus("Worker responds", "worker_frontend_fixture", "POST /assignments/:id/response", "Worker response is local only.", "missing_backend"),
  apiStatus("Worker records attendance", "worker_frontend_fixture", "POST /attendance-records", "No attendance evidence API exists.", "missing_backend"),
  apiStatus("Employer reviews timesheet", "employer_frontend_fixture", "POST /timesheets/:id/review", "Timesheet review is fixture-backed.", "missing_backend"),
  apiStatus("Invoice generated", "employer_frontend_fixture", "POST /invoices", "No invoice API exists.", "missing_backend"),
  apiStatus("Employer payment state", "employer_frontend_fixture", "POST /employer-payments", "No payment integration exists.", "missing_backend"),
  apiStatus("Worker payable state", "worker_frontend_fixture", "GET /worker-payables", "No worker payable API exists.", "missing_backend"),
  apiStatus("Reports updated", "employer_frontend_fixture", "GET /reports", "Reports are static frontend summaries.", "fixture_backed"),
  apiStatus("Admin supervises workflow", "admin_frontend_fixture", "GET /admin/operations", "Admin surfaces are frontend summaries.", "fixture_backed"),
  apiStatus("Notifications sent", "shared_domain", "POST /notifications/transactional", "Notification delivery infrastructure is not implemented.", "missing_backend")
];

export type EndToEndStaffingStep = Readonly<{
  step: string;
  concept: SharedConceptName;
  expectedState: string;
  sourceBoundary: string;
}>;

export const endToEndStaffingScenario: readonly EndToEndStaffingStep[] = [
  scenarioStep("Employer creates shift", "Shift", "draft", "Employer creates draft; no worker assignment."),
  scenarioStep("Employer publishes shift", "Shift", "open", "Publication opens discovery only."),
  scenarioStep("Worker discovers shift", "Shift", "open", "Discovery does not imply eligibility or assignment."),
  scenarioStep("Worker applies", "Application", "submitted", "Application does not select the worker."),
  scenarioStep("Employer reviews", "Application", "under_review", "Review does not create assignment."),
  scenarioStep("Employer assigns", "Assignment", "pending_worker_response", "Assignment requires worker response."),
  scenarioStep("Worker accepts", "Assignment", "accepted", "Acceptance does not prove attendance."),
  scenarioStep("Attendance starts", "AttendanceRecord", "clocked_in", "Clock-in does not approve hours."),
  scenarioStep("Attendance closes", "AttendanceRecord", "completed", "Attendance does not create payroll."),
  scenarioStep("Timesheet approved", "Timesheet", "approved", "Timesheet approval is separate from payroll/payment."),
  scenarioStep("Invoice issued", "Invoice", "issued", "Invoice does not execute employer payment."),
  scenarioStep("Employer payment settles", "EmployerPayment", "settled", "Employer payment is separate from worker payable."),
  scenarioStep("Worker payable created", "WorkerPayable", "payable_created", "Payable is not final settlement."),
  scenarioStep("Reports updated", "AuditEvent", "recorded", "Reports aggregate source records without mutation.")
];

export function getSharedConcept(name: SharedConceptName): SharedConceptDefinition {
  return sharedConceptDefinitions.find((concept) => concept.name === name)!;
}

export function canTransitionSharedConcept<TConcept extends SharedConceptName>(
  concept: TConcept,
  from: StateFor<TConcept>,
  to: StateFor<TConcept>
) {
  const allowed = sharedStateTransitions.some(
    (transitionItem) =>
      transitionItem.concept === concept && transitionItem.from === from && transitionItem.to === to
  );

  return {
    allowed,
    concept,
    from,
    reason: allowed ? null : `Invalid ${concept} transition from ${from} to ${to}`,
    to
  } as const;
}

export function validateSharedConceptCoverage() {
  const definedNames = sharedConceptDefinitions.map((concept) => concept.name);
  const missing = sharedConceptNames.filter((name) => !definedNames.includes(name));
  const duplicates = definedNames.filter((name, index) => definedNames.indexOf(name) !== index);

  return {
    conceptCount: sharedConceptNames.length,
    duplicates,
    missing,
    ok: missing.length === 0 && duplicates.length === 0
  } as const;
}

function transition<TConcept extends SharedConceptName>(
  concept: TConcept,
  from: StateFor<TConcept>,
  to: StateFor<TConcept>,
  authority: SharedTransition<TConcept>["authority"],
  note: string
): SharedTransition<TConcept> {
  return { authority, concept, from, note, to };
}

function apiStatus(
  action: string,
  currentSource: ApiIntegrationMapEntry["currentSource"],
  targetApi: string,
  limitation: string,
  status: ApiIntegrationStatus
): ApiIntegrationMapEntry {
  return { action, currentSource, limitation, status, targetApi };
}

function scenarioStep(
  step: string,
  concept: SharedConceptName,
  expectedState: string,
  sourceBoundary: string
): EndToEndStaffingStep {
  return { concept, expectedState, sourceBoundary, step };
}
