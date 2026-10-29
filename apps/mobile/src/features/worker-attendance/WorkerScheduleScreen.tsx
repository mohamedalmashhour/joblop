import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { spacing } from "@rwos/design-system";
import type { MobileSessionTransport, WorkerAttendanceRecord } from "../../auth/secureSession";
import { Badge, BodyText, Button, Card, EmptyState, ErrorState, Heading, LoadingState, ScreenContainer, SmallText } from "../../ui/primitives";
import { formatShiftWindow } from "../marketplace/marketplaceContent";
import { attendanceAction, attendanceCopy, attendanceStatusLabel, attendanceStatusTone } from "./attendanceScheduleContent";

type ScheduleState =
  | { status: "loading" }
  | { status: "ready"; data: readonly WorkerAttendanceRecord[] }
  | { status: "empty" | "denied" | "error" };

export function WorkerScheduleScreen({ transport, onBack }: { transport: MobileSessionTransport | null; onBack: () => void }) {
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

  const act = useCallback(
    async (record: WorkerAttendanceRecord, action: "check_in" | "check_out") => {
      if (!transport) return;
      setBusyId(record.attendanceRecordId);
      setNotice(null);
      const result =
        action === "check_in"
          ? await transport.attendanceCheckIn(record.attendanceRecordId, record.version)
          : await transport.attendanceCheckOut(record.attendanceRecordId, record.version);
      setBusyId(null);
      if (result.status === "ready") {
        await load();
      } else if (result.status === "conflict") {
        setNotice(attendanceCopy.conflict);
        await load();
      } else if (result.status === "denied") {
        setNotice(attendanceCopy.denied);
      } else {
        setNotice(attendanceCopy.actionError);
      }
    },
    [transport, load]
  );

  return (
    <ScreenContainer testID="worker-schedule-screen">
      <ScrollView style={styles.scroll}>
        <View style={styles.stack}>
          <Button label="Back" onPress={onBack} variant="secondary" />
          <Card>
            <Badge label="My schedule" tone="neutral" />
            <Heading>{attendanceCopy.title}</Heading>
            <BodyText>{attendanceCopy.intro}</BodyText>
            {notice ? <SmallText>{notice}</SmallText> : null}
          </Card>

          {state.status === "loading" ? <LoadingState label="Loading your schedule" /> : null}
          {state.status === "empty" ? <EmptyState title={attendanceCopy.empty} body="Confirmed shifts appear here." /> : null}
          {state.status === "denied" ? <ErrorState title="Sign in required" body={attendanceCopy.signInRequired} /> : null}
          {state.status === "error" ? <ErrorState title="Something went wrong" body={attendanceCopy.loadError} /> : null}

          {state.status === "ready"
            ? state.data.map((r) => {
                const action = attendanceAction(r);
                return (
                  <Card key={r.attendanceRecordId} testID="schedule-shift">
                    <View style={styles.row}>
                      <Heading>{r.employerName}</Heading>
                      <Badge label={attendanceStatusLabel(r.status)} tone={attendanceStatusTone(r.status)} />
                    </View>
                    {r.areaLabel ? <BodyText>{r.areaLabel}</BodyText> : null}
                    <SmallText>{formatShiftWindow(r.scheduledStartAt, r.scheduledEndAt)}</SmallText>
                    {action === "check_in" ? (
                      <Button label={attendanceCopy.checkInCta} onPress={() => void act(r, "check_in")} disabled={busyId === r.attendanceRecordId} />
                    ) : null}
                    {action === "check_out" ? (
                      <Button label={attendanceCopy.checkOutCta} onPress={() => void act(r, "check_out")} disabled={busyId === r.attendanceRecordId} />
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
  row: { alignItems: "center", flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" }
});
