import type { ActionResult, ApiResponse, ToolContext, ToolError, ToolSchema } from "./assistantTypes";

// Small helpers shared by the role tool files: input reading, response reading, plain error codes.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isUuid = (value: unknown): value is string => typeof value === "string" && UUID.test(value);

export const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

export const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

export const str = (value: unknown, max = 200): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed && trimmed.length <= max ? trimmed : null;
};

export const num = (value: unknown): number | null => (typeof value === "number" && Number.isFinite(value) ? value : null);

/** A full ISO date-time (with a zone) that parses. */
export const isoDateTime = (value: unknown): string | null => {
  const s = str(value, 40);
  if (!s || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s) || !/(Z|[+-]\d{2}:?\d{2})$/.test(s)) return null;
  return Number.isNaN(Date.parse(s)) ? null : new Date(s).toISOString();
};

export const isoDate = (value: unknown): string | null => {
  const s = str(value, 10);
  return s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) ? s : null;
};

export const minorToAmount = (value: unknown): number | null => {
  const n = typeof value === "string" && /^-?\d+$/.test(value) ? Number(value) : num(value);
  return n === null ? null : Math.round(n) / 100;
};

export const schema = (properties: Record<string, unknown>, required: readonly string[] = []): ToolSchema => ({
  type: "object",
  properties,
  ...(required.length ? { required } : {}),
  additionalProperties: false
});

export const uuidProp = (description: string) => ({ type: "string", description, pattern: "^[0-9a-fA-F-]{36}$" });

export const fail = (error: string): ToolError => ({ ok: false, error });

/** Plain code for a refused API call. Never echoes the API's own message text. */
export function refusal(res: ApiResponse): string {
  const body = asRecord(res.body);
  const code = typeof body.error === "string" ? body.error : typeof body.status === "string" ? body.status : "";
  if (res.status === 401 || res.status === 403) return "not_allowed";
  if (res.status === 404) return "not_found";
  if (code === "RWOS_MINIMUM_WAGE" || /MINIMUM_WAGE/.test(code)) return "below_minimum_wage";
  if (res.status === 409 && /FULL|CAPACITY/.test(code)) return "full";
  if (res.status === 409 && /ELECTION/.test(code)) return "pay_channel_needed";
  if (res.status === 409 && /OVERLAP|CONFLICT/.test(code)) return "shift_overlap";
  if (res.status === 409) return "changed_or_not_allowed_now";
  if (res.status === 422) return /INELIGIBLE/.test(code) ? "not_eligible" : "rejected";
  if (res.status === 400) return "invalid";
  if (res.status === 503) return "unavailable";
  return "failed";
}

export const okResult = (code: string, detail: string, undoNote?: string): ActionResult => ({ ok: true, code, detail, ...(undoNote ? { undoNote } : {}) });
export const failedResult = (res: ApiResponse, what: string): ActionResult => {
  const code = refusal(res);
  return { ok: false, code, detail: `${what}: refused (${res.status} ${code}).` };
};

/** GET helper: the body when the status is 2xx, else a tool error with a plain code. */
export async function getOk(ctx: ToolContext, url: string): Promise<{ ok: true; body: Record<string, unknown> } | ToolError> {
  const res = await ctx.call({ method: "GET", url });
  if (res.status >= 200 && res.status < 300) return { ok: true, body: asRecord(res.body) };
  return fail(refusal(res));
}

export const enc = encodeURIComponent;
