"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useT, fmtLocale } from "../i18n/LocaleProvider";
import type { RwosLocale } from "../i18n/config";
import { checkInOpensAt, isCheckInOpen } from "../shiftLocation";

// The worker's Check in / Check out box, shown wherever a booked shift appears outside My schedule:
// the job (shift) page, right after claiming, and accepted offers. Same rules and the same routes as
// My schedule (/api/attendance/:id/check-in | check-out); the API stays the authority (it refuses an
// early check-in and a cancelled shift).

export type CheckInShift = Readonly<{
  attendanceRecordId: string;
  jobRequestId?: string;
  status: string;
  scheduledStartAt: string;
  scheduledEndAt: string;
  timezone: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  version: number;
  clockInAllowed?: boolean;
}>;

export type CheckInView =
  | Readonly<{ kind: "opens_later"; opensAt: Date }>
  | Readonly<{ kind: "check_in" }>
  | Readonly<{ kind: "checked_in"; inAt: string }>
  | Readonly<{ kind: "done"; inAt: string; outAt: string }>
  | Readonly<{ kind: "none" }>;

const TERMINAL = new Set(["cancelled", "missed"]);

/** What the box shows for this shift now. */
export function checkInView(shift: CheckInShift, now: number = Date.now()): CheckInView {
  if (shift.clockInAllowed === false || TERMINAL.has(shift.status)) return { kind: "none" };
  if (shift.checkInAt && shift.checkOutAt) return { kind: "done", inAt: shift.checkInAt, outAt: shift.checkOutAt };
  if (shift.checkInAt) return { kind: "checked_in", inAt: shift.checkInAt };
  if (shift.status !== "pending_start") return { kind: "none" };
  return isCheckInOpen(shift.scheduledStartAt, now) ? { kind: "check_in" } : { kind: "opens_later", opensAt: checkInOpensAt(shift.scheduledStartAt) };
}

/** The signed-in worker's booked shifts (their own schedule), keyed by job. */
export function useMyShifts(enabled = true): Readonly<{ byJob: ReadonlyMap<string, CheckInShift>; reload: () => Promise<void> }> {
  const [byJob, setByJob] = useState<ReadonlyMap<string, CheckInShift>>(new Map());
  const reload = useCallback(async () => {
    try {
      const r = await fetch("/api/attendance?limit=100", { cache: "no-store" });
      if (!r.ok) return;
      const payload = (await r.json()) as { items?: CheckInShift[] };
      const next = new Map<string, CheckInShift>();
      for (const item of payload.items ?? []) {
        // Newest first: keep the first (live) record per job; a cancelled one never hides a live one.
        const current = item.jobRequestId ? next.get(item.jobRequestId) : undefined;
        if (item.jobRequestId && (!current || (TERMINAL.has(current.status) && !TERMINAL.has(item.status)))) next.set(item.jobRequestId, item);
      }
      setByJob(next);
    } catch {
      /* keep what is shown */
    }
  }, []);
  useEffect(() => {
    if (enabled) void reload();
  }, [enabled, reload]);
  return { byJob, reload };
}

export function ShiftCheckIn({ shift, onChanged }: { shift: CheckInShift; onChanged?: () => void | Promise<void> }) {
  const t = useT();
  const locale = fmtLocale(useLocale());
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // Re-render every 30 s so "Check in" turns on by itself when check-in opens.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const act = useCallback(async (action: "check-in" | "check-out") => {
    setBusy(true);
    setNotice(null);
    try {
      const r = await fetch(`/api/attendance/${encodeURIComponent(shift.attendanceRecordId)}/${action}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ expectedVersion: shift.version })
      });
      if (!r.ok) {
        const body = (await r.json().catch(() => null)) as { error?: string; opensAt?: string } | null;
        if (body?.error === "RWOS_CHECK_IN_TOO_EARLY") {
          const opens = body.opensAt ?? checkInOpensAt(shift.scheduledStartAt).toISOString();
          setNotice(t("sched.checkInTooEarly", { time: clock(opens, shift.timezone, locale) }));
          return;
        }
        setNotice(r.status === 409 ? t("sched.changed") : t("sched.actionFailed"));
        return;
      }
      setNotice(action === "check-in" ? t("sched.checkedInNotice") : t("sched.checkedOutNotice"));
      await onChanged?.();
    } catch {
      setNotice(t("sched.actionFailed"));
    } finally {
      setBusy(false);
    }
  }, [shift, t, locale, onChanged]);

  const view = checkInView(shift);
  if (view.kind === "none") return null;
  return (
    <div className="checkin-box" data-testid="shift-checkin" style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
      {view.kind === "opens_later" ? (
        <button className="btn" type="button" disabled aria-disabled="true" style={{ alignSelf: "flex-start" }}>
          {t("checkin.opensAt", { time: clock(view.opensAt.toISOString(), shift.timezone, locale), date: day(view.opensAt.toISOString(), shift.timezone, locale) })}
        </button>
      ) : null}
      {view.kind === "check_in" ? (
        <button className="btn" type="button" disabled={busy} onClick={() => void act("check-in")} style={{ alignSelf: "flex-start" }}>
          {busy ? "…" : t("sched.checkIn")}
        </button>
      ) : null}
      {view.kind === "checked_in" ? (
        <>
          <p style={{ margin: 0 }}>{t("checkin.checkedInAt", { time: clock(view.inAt, shift.timezone, locale) })}</p>
          <button className="btn" type="button" disabled={busy} onClick={() => void act("check-out")} style={{ alignSelf: "flex-start" }}>
            {busy ? "…" : t("sched.checkOut")}
          </button>
        </>
      ) : null}
      {view.kind === "done" ? (
        <>
          <p style={{ margin: 0 }}>{t("checkin.bothTimes", { inTime: clock(view.inAt, shift.timezone, locale), outTime: clock(view.outAt, shift.timezone, locale) })}</p>
          <p className="notice" style={{ margin: 0 }}>{t("checkin.hoursSent")}</p>
        </>
      ) : null}
      {notice ? <p className="notice" role="status" style={{ margin: 0 }}>{notice}</p> : null}
    </div>
  );
}

function clock(at: string, tz: string, locale: RwosLocale): string {
  try {
    return new Date(at).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit", timeZone: tz || "America/Toronto" });
  } catch {
    return new Date(at).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit", timeZone: "America/Toronto" });
  }
}

function day(at: string, tz: string, locale: RwosLocale): string {
  try {
    return new Date(at).toLocaleDateString(locale, { weekday: "long", month: "long", day: "numeric", timeZone: tz || "America/Toronto" });
  } catch {
    return new Date(at).toLocaleDateString(locale, { weekday: "long", month: "long", day: "numeric", timeZone: "America/Toronto" });
  }
}
