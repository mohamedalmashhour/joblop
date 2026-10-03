// Multi-role employer order (pure). An order groups several job requests — one per role line
// (role + quantity + conditions) — sharing a worksite and time window. Each child job request keeps
// its own governed pricing snapshot, admin approval, dispatch and payroll; this module only models
// the order's shape: validating the lines an employer submits, and rolling the order's status up
// from its children's statuses. No money is computed here.

export type EmployerOrderStatus =
  | "draft"
  | "submitted"
  | "admin_review"
  | "partially_approved"
  | "approved"
  | "cancelled"
  | "expired";

// The child job-request statuses this rollup reasons about (mirrors the JobRequestStatus enum).
export type ChildRequestStatus =
  | "draft"
  | "submitted"
  | "admin_review"
  | "information_required"
  | "approved_for_dispatch"
  | "cancelled"
  | "expired"
  | "archived";

/** How many role lines one order may hold, and how many workers a single line may request. */
export const EMPLOYER_ORDER_LINE_MAX = 20;
export const EMPLOYER_ORDER_LINE_QUANTITY_MAX = 50;

export type EmployerOrderLineInput = Readonly<{
  workGroup: string;
  roleDefinition: string;
  numberOfWorkers: number;
  title: string;
  description?: string;
}>;

export function isValidOrderLineQuantity(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 1 && (value as number) <= EMPLOYER_ORDER_LINE_QUANTITY_MAX;
}

export type ValidateOrderLinesResult =
  | { ok: true; lines: readonly EmployerOrderLineInput[] }
  | { ok: false; reason: "no_lines" | "too_many_lines" | "invalid_line" };

/**
 * Validate the role lines an employer submits in one order: at least one, at most the max, each with
 * a role + work group, a title, and a quantity in range. Pure — it does not check the role against a
 * contract or site (the governed create path does that per child request).
 */
export function validateEmployerOrderLines(input: unknown): ValidateOrderLinesResult {
  if (!Array.isArray(input) || input.length === 0) return { ok: false, reason: "no_lines" };
  if (input.length > EMPLOYER_ORDER_LINE_MAX) return { ok: false, reason: "too_many_lines" };
  const lines: EmployerOrderLineInput[] = [];
  for (const raw of input) {
    if (typeof raw !== "object" || raw === null) return { ok: false, reason: "invalid_line" };
    const r = raw as Record<string, unknown>;
    const workGroup = typeof r.workGroup === "string" ? r.workGroup.trim() : "";
    const roleDefinition = typeof r.roleDefinition === "string" ? r.roleDefinition.trim() : "";
    const title = typeof r.title === "string" ? r.title.trim() : "";
    if (!workGroup || !roleDefinition || title.length < 4 || title.length > 160) return { ok: false, reason: "invalid_line" };
    if (!isValidOrderLineQuantity(r.numberOfWorkers)) return { ok: false, reason: "invalid_line" };
    const base: EmployerOrderLineInput = { workGroup, roleDefinition, numberOfWorkers: r.numberOfWorkers as number, title };
    const description = typeof r.description === "string" && r.description.trim() ? r.description.trim() : null;
    lines.push(description ? { ...base, description } : base);
  }
  return { ok: true, lines };
}

/**
 * Derive an order's status from its children's statuses. Terminal children (cancelled/expired/
 * archived) are set aside unless every child is terminal. Among the active children: all approved ->
 * approved; some approved -> partially_approved; any in review or needing info -> admin_review; any
 * submitted -> submitted; otherwise draft. An order with no children is a draft.
 */
export function rollupEmployerOrderStatus(children: readonly ChildRequestStatus[]): EmployerOrderStatus {
  if (children.length === 0) return "draft";
  const terminal = (s: ChildRequestStatus) => s === "cancelled" || s === "expired" || s === "archived";
  const active = children.filter((s) => !terminal(s));
  if (active.length === 0) {
    return children.some((s) => s === "expired") ? "expired" : "cancelled";
  }
  const approved = active.filter((s) => s === "approved_for_dispatch").length;
  if (approved === active.length) return "approved";
  if (approved > 0) return "partially_approved";
  if (active.some((s) => s === "admin_review" || s === "information_required")) return "admin_review";
  if (active.some((s) => s === "submitted")) return "submitted";
  return "draft";
}
