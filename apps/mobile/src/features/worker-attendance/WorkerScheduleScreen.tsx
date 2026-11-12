import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { spacing } from "../../theme";
import type { MobileSessionTransport, WorkerAttendanceRecord } from "../../auth/secureSession";
import { Badge, BodyText, Button, Card, EmptyState, ErrorState, Heading, LoadingState, ScreenContainer, SmallText } from "../../ui/primitives";
import { formatShiftWindow } from "../marketplace/marketplaceContent";
import { useLocale } from "../../i18n/LocaleContext";
import { attendanceCopyFor, attendanceStatusLabel, attendanceStatusTone, canCancelShift, isLateCancellation } from "./attendanceScheduleContent";
import { ShiftCheckInCard } from "./ShiftCheckInCard";

type ScheduleState =
  | { status: "loading" }
  | { status: "ready"; data: readonly WorkerAttendanceRecord[] }
  | { status: "empty" | "denied" | "error" };

export function WorkerScheduleScreen({
  transport,
  onBack,
  onOpenJob
}: {
  transport: MobileSessionTransport | null;
  onBack: () => void;
  /** Opens a booked shift's page (the job screen: details, address, Check in / Check out). */
  onOpenJob?: (jobRequestId: string) => void;
}) {
  const { locale, t } = useLocale();
  const attendanceCopy = attendanceCopyFor(locale);
  const [state, setState] = useState<ScheduleState>({ status: "loading" });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!transport) {
      setState({ status: "denied" });
      return;
    }
    const result = await transport.workerAttendance();
    setState(result.status === "ready" ? { status: "ready", data: result.data } : { status: result.status });
  }, [transport]);

  useEffect(() => {
    let active = true;
    void (async () => {
      if (active) await load();
    })();
    return () => {
      active = false;
    };
  }, [load]);

  // "Cancel this shift": a confirm step that says plainly what happens (7-day suspension under 24 h),
  // then the API cancels the booking and the schedule entry together.
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const cancelShift = useCallback(
    async (record: WorkerAttendanceRecord) => {
      if (!transport) return;
      setBusyId(record.attendanceRecordId);
      setNotice(null);
      const result = await transport.cancelShift(record.attendanceRecordId);
      setBusyId(null);
      setConfirmingId(null);
      if (result.status === "cancelled") {
        setNotice(result.suspended ? attendanceCopy.cancelledSuspendedNotice : attendanceCopy.cancelledNotice);
        await load();
      } else if (result.status === "already_started") {
        setNotice(attendanceCopy.cancelStarted);
      } else if (result.status === "conflict") {
        setNotice(attendanceCopy.conflict);
        await load();
      } else if (result.status === "denied") {
        setNotice(attendanceCopy.denied);
      } else {
        setNotice(attendanceCopy.actionError);
      }
    },
    [transport, load, attendanceCopy]
  );

  return (
    <ScreenContainer testID="worker-schedule-screen">
      <ScrollView style={styles.scroll}>
        <View style={styles.stack}>
          <Button label={attendanceCopy.back} onPress={onBack} variant="secondary" />
          <Card>
            <Badge label={attendanceCopy.title} tone="neutral" />
            <Heading>{attendanceCopy.title}</Heading>
            <BodyText>{attendanceCopy.intro}</BodyText>
            {notice ? <SmallText>{notice}</SmallText> : null}
          </Card>

          {state.status === "loading" ? <LoadingState label={attendanceCopy.loadingSchedule} /> : null}
          {state.status === "empty" ? <EmptyState title={attendanceCopy.empty} body={attendanceCopy.emptyBody} /> : null}
          {state.status === "denied" ? <ErrorState title={attendanceCopy.signInRequiredTitle} body={attendanceCopy.signInRequired} /> : null}
          {state.status === "error" ? <ErrorState title={attendanceCopy.errorTitle} body={attendanceCopy.loadError} /> : null}

          {state.status === "ready"
            ? state.data.map((r) => {
                return (
                  <Card key={r.attendanceRecordId} testID="schedule-shift">
                    <View style={styles.row}>
                      <Heading>{r.employerName}</Heading>
                      <Badge label={attendanceStatusLabel(r.status, locale)} tone={attendanceStatusTone(r.status)} />
                    </View>
                    {r.cancelledBy ? <SmallText>{attendanceCopy.cancelledBy[r.cancelledBy]}</SmallText> : null}
                    {r.areaLabel ? <BodyText>{r.areaLabel}</BodyText> : null}
                    {r.worksiteAddress ? <BodyText>{r.worksiteAddress}</BodyText> : null}
                    <SmallText>{formatShiftWindow(r.scheduledStartAt, r.scheduledEndAt)}</SmallText>
                    {r.clockInAllowed === false ? <SmallText>{attendanceCopy.longTermNoClockIn}</SmallText> : null}
                    {/* Same Check in / Check out box as the job screen and the website. */}
                    <ShiftCheckInCard record={r} transport={transport} onChanged={load} />
                    {onOpenJob && r.jobRequestId && r.status !== "cancelled" ? (
                      <Button label={t("sched.openShift")} variant="secondary" onPress={() => onOpenJob(r.jobRequestId!)} testID="schedule-open-shift" />
                    ) : null}
                    {canCancelShift(r) && confirmingId !== r.attendanceRecordId ? (
                      <Button label={attendanceCopy.cancelCta} variant="secondary" onPress={() => setConfirmingId(r.attendanceRecordId)} disabled={busyId === r.attendanceRecordId} />
                    ) : null}
                    {canCancelShift(r) && confirmingId === r.attendanceRecordId ? (
                      <View style={styles.confirm} accessibilityRole="alert">
                        <Heading>{attendanceCopy.cancelTitle}</Heading>
                        <BodyText>{isLateCancellation(r.scheduledStartAt) ? attendanceCopy.cancelLateBody : attendanceCopy.cancelFreeBody}</BodyText>
                        <Button label={attendanceCopy.cancelConfirm} onPress={() => void cancelShift(r)} disabled={busyId === r.attendanceRecordId} />
                        <Button label={attendanceCopy.cancelKeep} variant="secondary" onPress={() => setConfirmingId(null)} disabled={busyId === r.attendanceRecordId} />
                      </View>
                    ) : null}
                  </Card>
                );
              })
            : null}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  stack: { gap: spacing.lg, paddingBottom: spacing.xxl },
  row: { alignItems: "center", flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" },
  confirm: { gap: spacing.sm }
});
