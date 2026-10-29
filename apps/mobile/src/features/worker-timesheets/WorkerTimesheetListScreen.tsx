import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { spacing } from "@rwos/design-system";
import type { MobileSessionTransport, WorkerTimesheet } from "../../auth/secureSession";
import { Badge, BodyText, Button, Card, EmptyState, ErrorState, Heading, Input, LoadingState, ScreenContainer, SmallText } from "../../ui/primitives";
import { formatShiftWindow } from "../marketplace/marketplaceContent";
import { canWorkerReview, formatMinutes, timesheetCopy, timesheetStatusLabel, timesheetStatusTone } from "./timesheetListContent";

type ListState =
  | { status: "loading" }
  | { status: "ready"; data: readonly WorkerTimesheet[] }
  | { status: "empty" | "denied" | "error" };

export function WorkerTimesheetListScreen({ transport, onBack }: { transport: MobileSessionTransport | null; onBack: () => void }) {
  const [state, setState] = useState<ListState>({ status: "loading" });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!transport) {
      setState({ status: "denied" });
      return;
    }
    const result = await transport.workerTimesheets();
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

  const confirm = useCallback(
    async (t: WorkerTimesheet) => {
      if (!transport) return;
      setBusyId(t.timesheetId);
      setNotice(null);
      const result = await transport.timesheetConfirm(t.timesheetId, t.version);
      setBusyId(null);
      if (result.status === "ready") await load();
      else setNotice(result.status === "conflict" ? timesheetCopy.conflict : timesheetCopy.actionError);
      if (result.status === "conflict") await load();
    },
    [transport, load]
  );

  const dispute = useCallback(
    async (t: WorkerTimesheet) => {
      if (!transport) return;
      const reason = reasons[t.timesheetId] ?? "";
      if (reason.trim().length === 0) {
        setNotice(timesheetCopy.invalid);
        return;
      }
      setBusyId(t.timesheetId);
      setNotice(null);
      const result = await transport.timesheetDispute(t.timesheetId, t.version, reason);
      setBusyId(null);
      if (result.status === "ready") await load();
      else if (result.status === "invalid") setNotice(timesheetCopy.invalid);
      else setNotice(result.status === "conflict" ? timesheetCopy.conflict : timesheetCopy.actionError);
      if (result.status === "conflict") await load();
    },
    [transport, load, reasons]
  );

  return (
    <ScreenContainer testID="worker-timesheet-list-screen">
      <ScrollView style={styles.scroll}>
        <View style={styles.stack}>
          <Button label="Back" onPress={onBack} variant="secondary" />
          <Card>
            <Badge label="My timesheets" tone="neutral" />
            <Heading>{timesheetCopy.title}</Heading>
            <BodyText>{timesheetCopy.intro}</BodyText>
            {notice ? <SmallText>{notice}</SmallText> : null}
          </Card>

          {state.status === "loading" ? <LoadingState label="Loading your timesheets" /> : null}
          {state.status === "empty" ? <EmptyState title={timesheetCopy.empty} body="Timesheets appear after you work a shift." /> : null}
          {state.status === "denied" ? <ErrorState title="Sign in required" body={timesheetCopy.signInRequired} /> : null}
          {state.status === "error" ? <ErrorState title="Something went wrong" body={timesheetCopy.loadError} /> : null}

          {state.status === "ready"
            ? state.data.map((t) => {
                const reviewable = canWorkerReview(t.status);
                return (
                  <Card key={t.timesheetId} testID="timesheet-row">
                    <View style={styles.row}>
                      <Heading>{t.employerName}</Heading>
                      <Badge label={timesheetStatusLabel(t.status)} tone={timesheetStatusTone(t.status)} />
                    </View>
                    {t.areaLabel ? <BodyText>{t.areaLabel}</BodyText> : null}
                    <SmallText>{formatShiftWindow(t.scheduledStartAt, t.scheduledEndAt)}</SmallText>
                    <SmallText>{`${timesheetCopy.payableLabel}: ${formatMinutes(t.payableMinutes)}`}</SmallText>
                    {reviewable ? (
                      <View style={styles.actions}>
                        <Button label={timesheetCopy.confirmCta} onPress={() => void confirm(t)} disabled={busyId === t.timesheetId} />
                        <Input
                          label={timesheetCopy.disputeReasonLabel}
                          value={reasons[t.timesheetId] ?? ""}
                          onChangeText={(v) => setReasons((prev) => ({ ...prev, [t.timesheetId]: v }))}
                          placeholder={timesheetCopy.disputeReasonPlaceholder}
                        />
                        <Button
                          label={timesheetCopy.disputeCta}
                          onPress={() => void dispute(t)}
                          variant="danger"
                          disabled={busyId === t.timesheetId || (reasons[t.timesheetId] ?? "").trim().length === 0}
                        />
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
  actions: { gap: spacing.sm, marginTop: spacing.sm }
});
