import { ScrollView, StyleSheet, View } from "react-native";
import { spacing } from "../../theme";
import { Badge, BodyText, Button, Card, Divider, Heading, ScreenContainer, Section, SmallText } from "../../ui/primitives";
import {
  getTimesheetStageTitle,
  type WorkerTimesheetStage,
  workerTimesheetAuditRequirements,
  workerTimesheetBoundaries,
  workerTimesheetRows,
  workerTimesheetStates
} from "./workerTimesheetContent";

type WorkerTimesheetScreenProps = {
  onBack: () => void;
  onOpenEarnings?: () => void;
  onSelectStage: (stage: WorkerTimesheetStage) => void;
  stage: WorkerTimesheetStage;
};

export function WorkerTimesheetScreen({
  onBack,
  onOpenEarnings,
  onSelectStage,
  stage
}: WorkerTimesheetScreenProps) {
  return (
    <ScreenContainer testID="worker-timesheet-screen">
      <ScrollView style={styles.scroll}>
        <View style={styles.stack}>
          <Button label="Back" onPress={onBack} variant="secondary" />
          <Card>
            <Badge label={stage === "final" ? "Finance Ready" : "Worker Review"} tone="warning" />
            <Heading>{getTimesheetStageTitle(stage)}</Heading>
            <BodyText>
              Review attendance-derived time before it moves to employer review and finance
              readiness. This screen does not calculate payroll or send payment.
            </BodyText>
            <SmallText>Fixture-backed timesheet only; no persistence or payroll engine.</SmallText>
          </Card>

          <Section title="Time summary">
            <Card>
              {workerTimesheetRows.map((row) => (
                <View key={row.label} style={styles.summaryRow}>
                  <View style={styles.rowBody}>
                    <Heading>{row.label}</Heading>
                    <SmallText>{row.source}</SmallText>
                  </View>
                  <BodyText>{row.value}</BodyText>
                </View>
              ))}
            </Card>
          </Section>

          <Section title="Timesheet actions">
            <Card>
              <View style={styles.buttonGrid}>
                <Button label="Review" onPress={() => onSelectStage("review")} variant="secondary" />
                <Button label="Request correction" onPress={() => onSelectStage("correction")} />
                <Button label="Finance-ready view" onPress={() => onSelectStage("final")} />
              </View>
              <Divider />
              <SmallText>
                Corrections create a request for review. They do not directly change evidence or
                approved hours.
              </SmallText>
            </Card>
          </Section>

          <Section title="States and boundaries">
            <Card>
              <SmallText>{workerTimesheetStates.join(" -> ")}</SmallText>
              <Divider />
              {workerTimesheetBoundaries.map((item) => (
                <SmallText key={item}>{item}</SmallText>
              ))}
            </Card>
          </Section>

          <Section title="Correction audit trail">
            <Card>
              {workerTimesheetAuditRequirements.map((item) => (
                <SmallText key={item}>{item}</SmallText>
              ))}
              <Divider />
              <BodyText>
                Reviewer adjustments must preserve the original value, new value, actor, timestamp
                and reason. AI may summarize but cannot approve hours or resolve disputes.
              </BodyText>
            </Card>
          </Section>

          {stage === "final" ? (
            <Card>
              <Heading>Earnings handoff</Heading>
              <BodyText>
                A finance-ready timesheet may create a payable summary later. Payable status remains
                separate from payroll processing and payment settlement.
              </BodyText>
              {onOpenEarnings ? <Button label="Open earnings" onPress={onOpenEarnings} /> : null}
            </Card>
          ) : null}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1
  },
  stack: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl
  },
  summaryRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  rowBody: {
    flex: 1,
    gap: spacing.xs
  },
  buttonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  }
});

