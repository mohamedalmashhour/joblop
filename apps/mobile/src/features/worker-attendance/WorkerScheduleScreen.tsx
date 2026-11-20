import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { spacing } from "../../theme";
import type { MobileSessionTransport, WorkerAttendanceRecord } from "../../auth/secureSession";
import { Badge, BodyText, Button, Card, EmptyState, ErrorState, Heading, Input, LoadingState, ScreenContainer, SmallText } from "../../ui/primitives";
import { formatShiftWindow } from "../marketplace/marketplaceContent";
import { useLocale } from "../../i18n/LocaleContext";
import {
  attendanceCopyFor,
  attendanceStatusLabel,
  attendanceStatusTone,
  canCancelShift,
  formatReportDeadline,
  isLateCancellation,
  normalizeClock,
  reportHoursView,
  reportInputError,
  reportRefusalKey,
  shiftClock
} from "./attendanceScheduleContent";
import { ShiftCheckInCard } from "./ShiftCheckInCard";

type ReportForm = { attendanceRecordId: string; arrival: string; departure: string; reason: string; error: string | null };

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

  // "Report my hours": a shift worked without a check-in (one form open at a time).
  const [report, setReport] = useState<ReportForm | null>(null);
  const openReport = (record: WorkerAttendanceRecord) =>
    setReport({
      attendanceRecordId: record.attendanceRecordId,
      arrival: shiftClock(record.scheduledStartAt, record.timezone),
      departure: shiftClock(record.scheduledEndAt, record.timezone),
      reason: "",
      error: null
    });
  const sendReport = useCallback(
    async (form: ReportForm) => {
      if (!transport) return;
      const invalid = reportInputError(form.arrival, form.departure, form.reason);
      if (invalid) {
        setReport({ ...form, error: attendanceCopy[invalid] });
        return;
      }
      setBusyId(form.attendanceRecordId);
      const result = await transport.reportHours(form.attendanceRecordId, {
        arrivalTime: normalizeClock(form.arrival) ?? form.arrival,
        departureTime: normalizeClock(form.departure) ?? form.departure,
        reason: form.reason.trim()
      });
      setBusyId(null);
      if (result.status === "sent") {
        setReport(null);
        setNotice(attendanceCopy.reportSentNotice);
        await load();
      } else if (result.status === "refused") {
        setReport({ ...form, error: attendanceCopy[reportRefusalKey(result.reason)] });
      } else if (result.status === "denied") {
        setReport({ ...form, error: attendanceCopy.denied });
      } else {
        setReport({ ...form, error: attendanceCopy.actionError });
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
                const reportView = reportHoursView(r);
                const form = report?.attendanceRecordId === r.attendanceRecordId ? report : null;
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
                    {reportView !== "form" ? <ShiftCheckInCard record={r} transport={transport} onChanged={load} /> : null}
                    {onOpenJob && r.jobRequestId && r.status !== "cancelled" ? (
                      <Button label={t("sched.openShift")} variant="secondary" onPress={() => onOpenJob(r.jobRequestId!)} testID="schedule-open-shift" />
                    ) : null}
                    {reportView === "waiting" ? <Badge label={attendanceCopy.reportWaiting} tone="warning" /> : null}
                    {reportView === "rejected" ? <SmallText>{attendanceCopy.reportRejected}</SmallText> : null}
                    {reportView === "form" && r.reportHoursUntil ? (
                      <BodyText>{attendanceCopy.reportDeadlineNotice.replace("{deadline}", formatReportDeadline(r.reportHoursUntil, locale))}</BodyText>
                    ) : null}
                    {reportView === "form" && !form ? (
                      <Button label={attendanceCopy.reportCta} onPress={() => openReport(r)} disabled={busyId === r.attendanceRecordId} />
                    ) : null}
                    {reportView === "form" && form ? (
                      <View style={styles.confirm}>
                        <Heading>{attendanceCopy.reportCta}</Heading>
                        <BodyText>{attendanceCopy.reportIntro.replace("{deadline}", r.reportHoursUntil ? formatReportDeadline(r.reportHoursUntil, locale) : "")}</BodyText>
                        <Input label={attendanceCopy.reportArrival} value={form.arrival} placeholder="08:00" onChangeText={(arrival) => setReport({ ...form, arrival, error: null })} />
                        <Input label={attendanceCopy.reportDeparture} value={form.departure} placeholder="14:00" onChangeText={(departure) => setReport({ ...form, departure, error: null })} />
                        <Input label={attendanceCopy.reportReason} value={form.reason} onChangeText={(reason) => setReport({ ...form, reason, error: null })} />
                        {form.error ? <SmallText>{form.error}</SmallText> : null}
                        <Button label={attendanceCopy.reportSubmit} onPress={() => void sendReport(form)} disabled={busyId === r.attendanceRecordId} />
                        <Button label={attendanceCopy.reportClose} variant="secondary" onPress={() => setReport(null)} disabled={busyId === r.attendanceRecordId} />
                      </View>
                    ) : null}
                    {reportView !== "form" && canCancelShift(r) && confirmingId !== r.attendanceRecordId ? (
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
