import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import type { MobileSessionTransport, WorkerAttendanceRecord } from "../../auth/secureSession";
import { BodyText, Button, SmallText } from "../../ui/primitives";
import { useLocale } from "../../i18n/LocaleContext";
import { attendanceCopyFor, checkInView, torontoClock, torontoDay } from "./attendanceScheduleContent";

// The Check in / Check out box, the same as the website's (ShiftCheckIn.tsx): disabled with "Check-in
// opens at 7:30 a.m. on … (Toronto time)" before the window, Check in during it, then "Checked in at …"
// with Check out, then both times and "Hours sent for confirmation". Used on the job screen and the
// schedule screen; the API stays the authority (it refuses an early check-in or a cancelled shift).
export function ShiftCheckInCard({
  record,
  transport,
  onChanged
}: {
  record: WorkerAttendanceRecord;
  transport: MobileSessionTransport | null;
  onChanged?: () => void | Promise<void>;
}) {
  const { t, locale } = useLocale();
  const copy = attendanceCopyFor(locale);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // Re-render every 30 s so "Check in" turns on by itself when check-in opens.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const act = useCallback(
    async (action: "check_in" | "check_out") => {
      if (!transport) return;
      setBusy(true);
      setNotice(null);
      const result =
        action === "check_in"
          ? await transport.attendanceCheckIn(record.attendanceRecordId, record.version)
          : await transport.attendanceCheckOut(record.attendanceRecordId, record.version);
      setBusy(false);
      if (result.status === "ready") await onChanged?.();
      else if (result.status === "conflict") {
        setNotice(copy.conflict);
        await onChanged?.();
      } else if (result.status === "denied") setNotice(copy.denied);
      else setNotice(copy.actionError);
    },
    [transport, record, onChanged, copy]
  );

  const view = checkInView(record);
  if (view.kind === "none") return null;
  return (
    <View testID="shift-checkin" style={{ gap: 8 }}>
      {view.kind === "opens_later" ? (
        <Button label={t("checkin.opensAt", { time: torontoClock(view.opensAt, locale), date: torontoDay(view.opensAt, locale) })} disabled />
      ) : null}
      {view.kind === "check_in" ? <Button label={busy ? "…" : t("sched.checkIn")} onPress={() => void act("check_in")} disabled={busy} /> : null}
      {view.kind === "checked_in" ? (
        <>
          <BodyText>{t("checkin.checkedInAt", { time: torontoClock(view.inAt, locale) })}</BodyText>
          <Button label={busy ? "…" : t("sched.checkOut")} onPress={() => void act("check_out")} disabled={busy} />
        </>
      ) : null}
      {view.kind === "done" ? (
        <>
          <BodyText>{t("checkin.bothTimes", { inTime: torontoClock(view.inAt, locale), outTime: torontoClock(view.outAt, locale) })}</BodyText>
          <SmallText>{t("checkin.hoursSent")}</SmallText>
        </>
      ) : null}
      {notice ? <SmallText>{notice}</SmallText> : null}
    </View>
  );
}
