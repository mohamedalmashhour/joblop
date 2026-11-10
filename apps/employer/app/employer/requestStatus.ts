import type { MessageKey } from "../i18n/messages";

// Where a request stands, in the employer's words. Derived from the status the employer API already
// returns plus the shift times; no new backend states. The API reports "assigned" / "in_progress" only
// once confirmed workers cover every requested seat, so "Confirmed – N coming" uses the requested count.
// "in_progress" can start before the shift (the attendance window opens early), so "Working now" is shown
// only between the shift's start and end.
export type RequestPhase = "draft" | "review" | "looking" | "confirmed" | "working" | "done" | "cancelled";

export type RequestPhaseInput = Readonly<{
  status: string;
  startAt: string;
  endAt?: string | null | undefined;
}>;

export function requestPhase(request: RequestPhaseInput, now: Date = new Date()): RequestPhase {
  switch (request.status) {
    case "draft":
      return "draft";
    case "submitted":
    case "under_review":
      return "review";
    case "published":
      return "looking";
    case "cancelled":
      return "cancelled";
    case "completed":
      return "done";
    case "assigned":
    case "in_progress": {
      const start = Date.parse(request.startAt);
      const end = request.endAt ? Date.parse(request.endAt) : Number.NaN;
      if (!Number.isNaN(end) && now.getTime() >= end) return "done";
      if (!Number.isNaN(start) && now.getTime() >= start) return "working";
      return "confirmed";
    }
    default:
      return "review";
  }
}

// Cancelled or finished: nothing left to change, only "Duplicate request".
export function isClosedPhase(phase: RequestPhase): boolean {
  return phase === "done" || phase === "cancelled";
}

export function requestPhaseLabel(
  phase: RequestPhase,
  workers: number
): Readonly<{ key: MessageKey; vars?: Readonly<Record<string, string | number>> }> {
  const many = workers > 1;
  switch (phase) {
    case "draft":
      return { key: "status.draft" };
    case "review":
      return { key: "status.review" };
    case "looking":
      return { key: many ? "status.lookingMany" : "status.lookingOne" };
    case "confirmed":
      return many ? { key: "status.confirmedMany", vars: { count: workers } } : { key: "status.confirmedOne" };
    case "working":
      return { key: "status.working" };
    case "done":
      return { key: "status.done" };
    case "cancelled":
      return { key: "status.cancelled" };
  }
}

// Small chip colours on the dark employer pages (text, border, tint).
export function requestPhaseTone(phase: RequestPhase): Readonly<{ color: string; border: string; background: string }> {
  switch (phase) {
    case "confirmed":
    case "working":
      return { color: "#7ee2b0", border: "rgba(126, 226, 176, 0.45)", background: "rgba(126, 226, 176, 0.1)" };
    case "looking":
    case "review":
      return { color: "#f8b808", border: "rgba(248, 184, 8, 0.45)", background: "rgba(248, 184, 8, 0.1)" };
    case "cancelled":
      return { color: "#f2a7a7", border: "rgba(242, 167, 167, 0.45)", background: "rgba(242, 167, 167, 0.08)" };
    case "done":
    case "draft":
      return { color: "#d8d0bf", border: "rgba(216, 208, 191, 0.35)", background: "rgba(216, 208, 191, 0.08)" };
  }
}
