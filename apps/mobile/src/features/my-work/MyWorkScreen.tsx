import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { spacing } from "@rwos/design-system";
import type { MarketplaceInterest, MobileSessionTransport, WorkerAssignmentDto } from "../../auth/secureSession";
import { Badge, BodyText, Button, Card, EmptyState, ErrorState, Heading, LoadingState, ScreenContainer, Section, SmallText } from "../../ui/primitives";
import { formatShiftWindow } from "../marketplace/marketplaceContent";
import {
  assignmentStatusLabel,
  assignmentStatusTone,
  interestStatusLabel,
  interestStatusTone,
  myWorkCopy
} from "./myWorkContent";

type InterestsState =
  | { status: "loading" }
  | { status: "ready"; data: readonly MarketplaceInterest[] }
  | { status: "empty" | "denied" | "error" };

type AssignmentsState =
  | { status: "loading" }
  | { status: "ready"; data: readonly WorkerAssignmentDto[] }
  | { status: "empty" | "denied" | "error" | "unavailable" };

export function MyWorkScreen({
  transport,
  onOpenSchedule,
  onOpenTimesheets
}: {
  transport: MobileSessionTransport | null;
  onOpenSchedule?: () => void;
  onOpenTimesheets?: () => void;
}) {
  const [interests, setInterests] = useState<InterestsState>({ status: "loading" });
  const [assignments, setAssignments] = useState<AssignmentsState>({ status: "loading" });

  useEffect(() => {
    if (!transport) return;
    let active = true;
    void transport.myInterests().then((r) => {
      if (active) setInterests(r.status === "ready" ? { status: "ready", data: r.data } : { status: r.status });
    });
    void transport.workerAssignments().then((r) => {
      if (active) setAssignments(r.status === "ready" ? { status: "ready", data: r.data } : { status: r.status });
    });
    return () => {
      active = false;
    };
  }, [transport]);

  return (
    <ScreenContainer testID="my-work-screen">
      <ScrollView style={styles.scroll}>
        <View style={styles.stack}>
          <Card>
            <Badge label="My shifts" tone="neutral" />
            <Heading>{myWorkCopy.title}</Heading>
            <BodyText>{myWorkCopy.intro}</BodyText>
            {transport && onOpenSchedule ? <Button label="View my schedule & check in" onPress={onOpenSchedule} variant="secondary" /> : null}
            {transport && onOpenTimesheets ? <Button label="Review my timesheets" onPress={onOpenTimesheets} variant="secondary" /> : null}
          </Card>

          {!transport ? (
            <Card>
              <BodyText>{myWorkCopy.signInRequired}</BodyText>
            </Card>
          ) : (
            <>
              <Section title={myWorkCopy.applicationsTitle}>
                {interests.status === "loading" ? <LoadingState label="Loading applications" /> : null}
                {interests.status === "empty" ? <EmptyState title={myWorkCopy.applicationsEmpty} body="Browse open shifts in the Available tab." /> : null}
                {interests.status === "denied" ? <ErrorState title="Sign in required" body={myWorkCopy.signInRequired} /> : null}
                {interests.status === "error" ? <ErrorState title="Something went wrong" body={myWorkCopy.loadError} /> : null}
                {interests.status === "ready"
                  ? interests.data.map((it) => (
                      <Card key={`${it.jobRequestId}-${it.createdAt}`} testID="my-work-application">
                        <View style={styles.row}>
                          <Heading>{it.summary?.title ?? it.summary?.role ?? "Open shift"}</Heading>
                          <Badge label={interestStatusLabel(it.status)} tone={interestStatusTone(it.status)} />
                        </View>
                        {it.summary ? <SmallText>{it.summary.employerName}</SmallText> : null}
                        {it.summary?.areaLabel ? <BodyText>{it.summary.areaLabel}</BodyText> : null}
                        {it.summary ? <SmallText>{formatShiftWindow(it.summary.startAt, it.summary.endAt)}</SmallText> : null}
                        {it.offerStatus ? <SmallText>{myWorkCopy.offerSentNote}</SmallText> : null}
                      </Card>
                    ))
                  : null}
              </Section>

              <Section title={myWorkCopy.assignmentsTitle}>
                {assignments.status === "loading" ? <LoadingState label="Loading confirmed shifts" /> : null}
                {assignments.status === "empty" ? <EmptyState title={myWorkCopy.assignmentsEmpty} body="Accepted offers become confirmed shifts here." /> : null}
                {assignments.status === "denied" ? <ErrorState title="Sign in required" body={myWorkCopy.signInRequired} /> : null}
                {assignments.status === "error" || assignments.status === "unavailable" ? (
                  <ErrorState title="Something went wrong" body={myWorkCopy.loadError} />
                ) : null}
                {assignments.status === "ready"
                  ? assignments.data.map((a) => (
                      <Card key={a.assignmentId} testID="my-work-assignment">
                        <View style={styles.row}>
                          <Heading>{a.title}</Heading>
                          <Badge label={assignmentStatusLabel(a.status)} tone={assignmentStatusTone(a.status)} />
                        </View>
                        {a.roleSummary ? <SmallText>{a.roleSummary}</SmallText> : null}
                        {a.worksiteSummary ? <BodyText>{a.worksiteSummary}</BodyText> : null}
                        <SmallText>{formatShiftWindow(a.startAt, a.endAt)}</SmallText>
                      </Card>
                    ))
                  : null}
              </Section>
            </>
          )}
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
