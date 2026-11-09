import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { spacing } from "../../theme";
import type { MarketplaceInterest, MobileSessionTransport, WorkerAssignmentDto } from "../../auth/secureSession";
import { Badge, BodyText, Button, Card, EmptyState, ErrorState, Heading, LoadingState, ScreenContainer, Section, SmallText } from "../../ui/primitives";
import { formatJobWhen } from "../marketplace/marketplaceContent";
import { useLocale } from "../../i18n/LocaleContext";
import {
  assignmentStatusLabel,
  assignmentStatusTone,
  interestStatusLabel,
  interestStatusTone,
  myWorkCopyFor
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
  onOpenTimesheets,
  onOpenJob
}: {
  transport: MobileSessionTransport | null;
  onOpenSchedule?: () => void;
  onOpenTimesheets?: () => void;
  /** Opens the job page, where the application's status (and the employer's choice) is shown. */
  onOpenJob?: (jobRequestId: string) => void;
}) {
  const { locale } = useLocale();
  const myWorkCopy = myWorkCopyFor(locale);
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
            <Badge label={myWorkCopy.title} tone="neutral" />
            <Heading>{myWorkCopy.title}</Heading>
            <BodyText>{myWorkCopy.intro}</BodyText>
            {transport && onOpenSchedule ? <Button label={myWorkCopy.scheduleCta} onPress={onOpenSchedule} variant="secondary" /> : null}
            {transport && onOpenTimesheets ? <Button label={myWorkCopy.timesheetsCta} onPress={onOpenTimesheets} variant="secondary" /> : null}
          </Card>

          {!transport ? (
            <Card>
              <BodyText>{myWorkCopy.signInRequired}</BodyText>
            </Card>
          ) : (
            <>
              <Section title={myWorkCopy.applicationsTitle}>
                {interests.status === "loading" ? <LoadingState label={myWorkCopy.loadingApplications} /> : null}
                {interests.status === "empty" ? <EmptyState title={myWorkCopy.applicationsEmpty} body={myWorkCopy.applicationsEmptyBody} /> : null}
                {interests.status === "denied" ? <ErrorState title={myWorkCopy.signInRequiredTitle} body={myWorkCopy.signInRequired} /> : null}
                {interests.status === "error" ? <ErrorState title={myWorkCopy.errorTitle} body={myWorkCopy.loadError} /> : null}
                {interests.status === "ready"
                  ? interests.data.map((it) => (
                      <Pressable
                        accessibilityRole="button"
                        disabled={!onOpenJob}
                        key={`${it.jobRequestId}-${it.createdAt}`}
                        onPress={() => onOpenJob?.(it.jobRequestId)}
                      >
                      <Card testID="my-work-application">
                        <View style={styles.row}>
                          <Heading>{it.summary?.title ?? it.summary?.role ?? myWorkCopy.openShiftFallback}</Heading>
                          <Badge label={interestStatusLabel(it.status, locale)} tone={interestStatusTone(it.status)} />
                        </View>
                        {it.summary ? <SmallText>{it.summary.employerName}</SmallText> : null}
                        {it.summary?.areaLabel ? <BodyText>{it.summary.areaLabel}</BodyText> : null}
                        {it.summary ? <SmallText>{formatJobWhen(it.summary.startAt, it.summary.endAt, locale)}</SmallText> : null}
                        {it.offerStatus ? <SmallText>{myWorkCopy.offerSentNote}</SmallText> : null}
                      </Card>
                      </Pressable>
                    ))
                  : null}
              </Section>

              <Section title={myWorkCopy.assignmentsTitle}>
                {assignments.status === "loading" ? <LoadingState label={myWorkCopy.loadingAssignments} /> : null}
                {assignments.status === "empty" ? <EmptyState title={myWorkCopy.assignmentsEmpty} body={myWorkCopy.assignmentsEmptyBody} /> : null}
                {assignments.status === "denied" ? <ErrorState title={myWorkCopy.signInRequiredTitle} body={myWorkCopy.signInRequired} /> : null}
                {assignments.status === "error" || assignments.status === "unavailable" ? (
                  <ErrorState title={myWorkCopy.errorTitle} body={myWorkCopy.loadError} />
                ) : null}
                {assignments.status === "ready"
                  ? assignments.data.map((a) => (
                      <Card key={a.assignmentId} testID="my-work-assignment">
                        <View style={styles.row}>
                          <Heading>{a.title}</Heading>
                          <Badge label={assignmentStatusLabel(a.status, locale)} tone={assignmentStatusTone(a.status)} />
                        </View>
                        {a.roleSummary ? <SmallText>{a.roleSummary}</SmallText> : null}
                        {a.worksiteSummary ? <BodyText>{a.worksiteSummary}</BodyText> : null}
                        <SmallText>{formatJobWhen(a.startAt, a.endAt, locale)}</SmallText>
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
